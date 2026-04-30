/**
 * Voice fingerprint — gestion des patterns de voix Next Impact.
 *
 * Sources :
 *  - "manual" : saisis par l'utilisatrice (lexique aimé/banni, phrases types)
 *  - "winners" : hooks marqués comme retenus puis publiés
 *  - "extracted" : extraits automatiquement des contenus publiés (TF-IDF léger)
 *
 * Les patterns actifs sont injectés dans EXTENDED_BRAND_BLOCK à chaque appel Claude.
 * SERVER-ONLY.
 */

import "server-only";

import { prisma } from "@/lib/kpi/store";

export type VoicePatternKind =
  | "lexicon-loved"
  | "lexicon-banned"
  | "phrase-loved"
  | "phrase-banned"
  | "structure"
  | "winning-hook";

export interface VoicePattern {
  id: number;
  kind: VoicePatternKind;
  text: string;
  source: "manual" | "extracted" | "winners";
  confidence: number;
  appearances: number;
  weight: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DbVoicePattern {
  id: number;
  kind: string;
  text: string;
  source: string;
  confidence: number;
  appearances: number;
  weight: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function toPattern(row: DbVoicePattern): VoicePattern {
  return {
    id: row.id,
    kind: row.kind as VoicePatternKind,
    text: row.text,
    source: row.source as "manual" | "extracted" | "winners",
    confidence: row.confidence,
    appearances: row.appearances,
    weight: row.weight,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// =============================================================================
// CRUD
// =============================================================================

export async function listPatterns(filter?: {
  kind?: VoicePatternKind;
  active?: boolean;
}): Promise<VoicePattern[]> {
  const rows = await prisma.voicePattern.findMany({
    where: {
      ...(filter?.kind ? { kind: filter.kind } : {}),
      ...(filter?.active !== undefined ? { active: filter.active } : {}),
    },
    orderBy: [{ weight: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(toPattern);
}

export async function upsertPattern(input: {
  kind: VoicePatternKind;
  text: string;
  source?: VoicePattern["source"];
  weight?: number;
}): Promise<VoicePattern> {
  const existing = await prisma.voicePattern.findFirst({
    where: { kind: input.kind, text: input.text },
  });
  if (existing) {
    const updated = await prisma.voicePattern.update({
      where: { id: existing.id },
      data: {
        appearances: existing.appearances + 1,
        weight: input.weight ?? existing.weight,
        source: input.source ?? existing.source,
      },
    });
    return toPattern(updated);
  }
  const created = await prisma.voicePattern.create({
    data: {
      kind: input.kind,
      text: input.text,
      source: input.source ?? "manual",
      weight: input.weight ?? 1.0,
      active: true,
    },
  });
  return toPattern(created);
}

export async function setPatternActive(id: number, active: boolean): Promise<VoicePattern> {
  const row = await prisma.voicePattern.update({ where: { id }, data: { active } });
  return toPattern(row);
}

export async function deletePattern(id: number): Promise<void> {
  await prisma.voicePattern.delete({ where: { id } });
}

// =============================================================================
// Bloc à injecter dans EXTENDED_BRAND_BLOCK
// =============================================================================

/**
 * Charge les patterns actifs et les formate en bloc texte injectable.
 * Retourne "" si aucun pattern actif (graceful fallback).
 */
export async function buildVoiceFingerprintBlock(): Promise<string> {
  const patterns = await listPatterns({ active: true });
  if (patterns.length === 0) return "";

  const grouped: Record<VoicePatternKind, string[]> = {
    "lexicon-loved": [],
    "lexicon-banned": [],
    "phrase-loved": [],
    "phrase-banned": [],
    structure: [],
    "winning-hook": [],
  };

  for (const p of patterns) {
    grouped[p.kind].push(p.text);
  }

  const sections: string[] = [];

  if (grouped["lexicon-loved"].length > 0) {
    sections.push(`# Lexique apprécié (à privilégier)
${grouped["lexicon-loved"].map((t) => `- ${t}`).join("\n")}`);
  }

  if (grouped["lexicon-banned"].length > 0) {
    sections.push(`# Lexique banni (à exclure absolument)
${grouped["lexicon-banned"].map((t) => `- ${t}`).join("\n")}`);
  }

  if (grouped["phrase-loved"].length > 0) {
    sections.push(`# Tournures appréciées
${grouped["phrase-loved"].map((t) => `- ${t}`).join("\n")}`);
  }

  if (grouped["phrase-banned"].length > 0) {
    sections.push(`# Tournures bannies
${grouped["phrase-banned"].map((t) => `- ${t}`).join("\n")}`);
  }

  if (grouped["winning-hook"].length > 0) {
    sections.push(`# Hooks gagnants (style à reproduire)
${grouped["winning-hook"].slice(0, 8).map((t) => `- ${t}`).join("\n")}`);
  }

  if (grouped["structure"].length > 0) {
    sections.push(`# Structures de phrases types
${grouped["structure"].slice(0, 5).map((t) => `- ${t}`).join("\n")}`);
  }

  return sections.length > 0 ? `\n\n# === Voice Fingerprint Next Impact ===\n\n${sections.join("\n\n")}` : "";
}

// =============================================================================
// Extraction automatique depuis le contenu publié
// =============================================================================

const STOP_WORDS = new Set([
  "le", "la", "les", "un", "une", "des", "de", "du", "et", "ou", "à", "au", "aux",
  "ce", "ces", "cette", "qui", "que", "quoi", "dont", "où", "quel", "quelle",
  "est", "sont", "être", "avoir", "fait", "faire", "peut", "pouvoir", "doit",
  "plus", "moins", "très", "bien", "mal", "tout", "tous", "toute", "toutes",
  "pour", "par", "sans", "avec", "dans", "sur", "sous", "vers", "chez",
  "mais", "donc", "or", "car", "ni", "alors", "ainsi", "puis", "ensuite",
  "il", "elle", "ils", "elles", "nous", "vous", "on", "leur", "leurs",
  "se", "ses", "son", "sa", "votre", "vos", "notre", "nos",
  "un", "une", "deux", "trois", "non", "oui", "pas", "ne", "n",
  "de", "du", "des", "en", "y", "lui",
]);

/**
 * Extrait les mots les plus fréquents dans le corpus publié,
 * filtre les stop-words, propose les top N comme lexique candidat.
 */
export async function extractFromPublishedContent(limit: number = 10): Promise<{
  candidates: { text: string; appearances: number }[];
  totalDocs: number;
}> {
  const items = await prisma.contentItem.findMany({
    where: { status: "published", finalBody: { not: null } },
    select: { finalBody: true },
  });

  const wordCounts = new Map<string, number>();
  for (const item of items) {
    if (!item.finalBody) continue;
    const tokens = item.finalBody
      .toLowerCase()
      .replace(/[^\w\s\u00C0-\u017F-]/g, " ")
      .split(/\s+/)
      .filter((w: string) => w.length >= 4 && !STOP_WORDS.has(w));
    for (const t of tokens) {
      wordCounts.set(t, (wordCounts.get(t) ?? 0) + 1);
    }
  }

  const candidates = [...wordCounts.entries()]
    .filter(([, count]) => count >= 3) // au moins 3 occurrences pour être pertinent
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([text, appearances]) => ({ text, appearances }));

  return { candidates, totalDocs: items.length };
}
