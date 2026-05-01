/**
 * Synthèse mensuelle Claude Opus.
 * Lit les items publiés du mois + leurs métriques + croisements,
 * appelle Claude pour produire une synthèse markdown structurée.
 * SERVER-ONLY.
 */

import "server-only";

import { prisma } from "@/lib/kpi/store";
import { callClaudeJson, MODELS } from "./anthropic";
import { getExtendedBrandBlock } from "./prompts";
import {
  crossByTrackKey,
  crossByHookPattern,
  topPostsByEngagement,
} from "./metrics";

export interface MonthlyAnalysis {
  id: number;
  period: string;
  body: string;
  itemsRefs: number[];
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  createdAt: string;
}

interface DbMonthlyAnalysis {
  id: number;
  period: string;
  body: string;
  itemsRefs: string | null;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  createdAt: Date;
}

function toAnalysis(row: DbMonthlyAnalysis): MonthlyAnalysis {
  let refs: number[] = [];
  if (row.itemsRefs) {
    try {
      const parsed = JSON.parse(row.itemsRefs);
      if (Array.isArray(parsed)) refs = parsed.filter((n) => typeof n === "number");
    } catch {
      /* ignore */
    }
  }
  return {
    id: row.id,
    period: row.period,
    body: row.body,
    itemsRefs: refs,
    model: row.model,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getAnalysis(period: string): Promise<MonthlyAnalysis | null> {
  const row = await prisma.monthlyAnalysis.findUnique({ where: { period } });
  return row ? toAnalysis(row) : null;
}

export async function listAnalyses(): Promise<MonthlyAnalysis[]> {
  const rows = await prisma.monthlyAnalysis.findMany({
    orderBy: { period: "desc" },
  });
  return rows.map(toAnalysis);
}

const SCHEMA = `interface Analysis {
  /** Markdown structuré avec sections : Synthèse, Ce qui a marché, Ce qui n'a pas marché, Recommandations. */
  body: string;
  /** Liste des contentId mentionnés dans l'analyse. */
  itemsRefs: number[];
}`;

/**
 * Génère et persiste l'analyse pour une période donnée (YYYY-MM).
 * Si l'analyse existe déjà, elle est ÉCRASÉE.
 */
export async function generateMonthlyAnalysis(period: string): Promise<MonthlyAnalysis> {
  // Parse "2026-04" → start/end
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) throw new Error(`Format period invalide : "${period}". Attendu YYYY-MM.`);
  const year = parseInt(match[1] ?? "0", 10);
  const month = parseInt(match[2] ?? "0", 10);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  // 1. Récupère tous les items publiés ce mois
  const items = await prisma.contentItem.findMany({
    where: {
      status: "published",
      publishedAt: { gte: start, lt: end },
    },
    include: {
      hooks: { where: { selected: true }, take: 1 },
      metrics: { orderBy: { recordedAt: "desc" }, take: 1 },
    },
    orderBy: { publishedAt: "asc" },
  });

  if (items.length === 0) {
    throw new Error(`Aucun item publié sur la période ${period}.`);
  }

  // 2. Tableaux de croisement sur la période
  const [byTrack, byPattern, top] = await Promise.all([
    crossByTrackKey(undefined, start),
    crossByHookPattern(undefined, start),
    topPostsByEngagement(10, { since: start }),
  ]);

  // 3. Construit la trame textuelle envoyée à Claude
  const itemsBlock = items
    .map((it) => {
      const m = it.metrics?.[0];
      const h = it.hooks?.[0];
      const date = it.publishedAt?.toISOString().slice(0, 10) ?? "?";
      return `- [#${it.id}] ${date} · ${it.type} · track ${it.trackKey} · source ${it.source}
  Sujet : ${it.subject}
  Hook : ${h ? `[${h.pattern}] "${h.hook}"` : "(aucun)"}
  Impressions : ${m?.impressions ?? "n/a"} · Engagement : ${m?.engagementCount ?? "n/a"} · Conversions : ${m?.conversions ?? "n/a"} · Taux : ${m?.engagementRate?.toFixed(2) ?? "n/a"}%
  Notes : ${m?.notes ?? "(aucune)"}`;
    })
    .join("\n\n");

  const trackBlock = byTrack
    .map(
      (b) =>
        `- ${b.label} : ${b.postCount} post(s) · ${b.totalImpressions} impr · ${b.totalEngagement} eng · ${b.totalConversions} conv · taux moyen ${b.avgEngagementRate?.toFixed(2) ?? "n/a"}%`
    )
    .join("\n");

  const patternBlock = byPattern
    .map(
      (b) =>
        `- ${b.label} : ${b.postCount} post(s) · taux moyen ${b.avgEngagementRate?.toFixed(2) ?? "n/a"}% · ${b.totalEngagement} eng total`
    )
    .join("\n");

  const topBlock = top
    .slice(0, 5)
    .map(
      (p, i) =>
        `${i + 1}. [#${p.id}] [${p.type}/${p.trackKey}] "${p.subject.slice(0, 70)}" — ${p.engagementCount ?? 0} eng / ${p.engagementRate?.toFixed(2) ?? "n/a"}%`
    )
    .join("\n");

  const system = `Tu es analyste éditorial pour Next Impact Digital. Tu produis une synthèse mensuelle FACTUELLE, en t'appuyant uniquement sur les chiffres fournis ci-dessous.

Ton rôle :
1. Identifier objectivement ce qui a marché (top patterns, top tracks, sujets surperformants).
2. Identifier ce qui n'a pas marché (sous-performance, écarts au plan, désengagement).
3. Recommander 3 actions concrètes pour le mois suivant — chaque reco doit citer un chiffre précis.

Règles :
- Pas de jargon marketing creux ("synergies", "leviers", "growth").
- Chaque affirmation doit pointer un item ou un chiffre du dataset.
- Si les chiffres sont absents (n/a), dis-le explicitement et recommande de saisir les métriques.
- Voix institutionnelle Next Impact (pas de "je"), didactique, sérieuse.`;

  const user = `# Période analysée : ${period}

## Items publiés (${items.length})
${itemsBlock}

## Croisement par track (campagne LinkedIn / pilier NL / cluster SEO)
${trackBlock || "(aucune donnée)"}

## Croisement par hook pattern
${patternBlock || "(aucune donnée)"}

## Top 5 par engagement absolu
${topBlock || "(aucune donnée)"}

Produis une synthèse markdown structurée avec ces sections :
# Synthèse ${period}
## Ce qui a marché
## Ce qui n'a pas marché
## 3 recommandations pour ${nextPeriod(period)}

Liste aussi en sortie les contentId que tu cites (champ itemsRefs).`;

  const result = await callClaudeJson<{ body?: string; itemsRefs?: number[] }>({
    model: MODELS.opus,
    cachedSystem: await getExtendedBrandBlock(),
    system,
    user,
    jsonShape: SCHEMA,
    maxTokens: 4_000,
    temperature: 0.3,
    maxRetries: 2,
    thinking: { budgetTokens: 3_000 },
  });

  const json = result.json;
  if (!json || typeof json.body !== "string") {
    throw new Error(
      `Claude n'a pas renvoyé de body valide. Texte brut :\n${result.text.slice(0, 400)}`
    );
  }

  const itemsRefs = Array.isArray(json.itemsRefs)
    ? json.itemsRefs.filter((n) => typeof n === "number")
    : [];

  // Upsert : écrase si existe déjà
  const existing = await prisma.monthlyAnalysis.findUnique({ where: { period } });
  const data = {
    period,
    body: json.body,
    itemsRefs: JSON.stringify(itemsRefs),
    model: result.model,
  };
  const row = existing
    ? await prisma.monthlyAnalysis.update({ where: { period }, data })
    : await prisma.monthlyAnalysis.create({ data });

  return toAnalysis(row);
}

function nextPeriod(period: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return period;
  const year = parseInt(match[1] ?? "0", 10);
  const month = parseInt(match[2] ?? "0", 10);
  const next = new Date(Date.UTC(year, month, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
}
