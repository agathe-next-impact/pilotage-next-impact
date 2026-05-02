/**
 * Thématiques de campagne hebdomadaires.
 * SERVER-ONLY.
 */

import "server-only";

import { prisma } from "@/lib/kpi/store";
import { callClaudeJson, MODELS } from "./anthropic";
import { EXTENDED_BRAND_BLOCK, getExtendedBrandBlock } from "./prompts";
import { listContentItems } from "./store";
import { listSnapshots } from "@/lib/kpi/store";
import { summarize } from "@/lib/kpi/aggregate";
import { fmtPeriodLong, currentPeriod } from "@/lib/format";
import {
  LINKEDIN_CAMPAIGNS,
  NEWSLETTER_PILLARS,
  SEO_CLUSTERS,
  BRAND_PROMISE,
  CASE_STUDIES,
} from "./plans";
import type {
  WeeklyTheme,
  WeeklyThemeSource,
  WeeklyThemeStatus,
} from "./types";

interface DbWeeklyTheme {
  id: number;
  weekStart: Date;
  theme: string;
  summary: string;
  primaryCampaign: string | null;
  primaryCluster: string | null;
  primaryPillar: string | null;
  actionDirectives: string | null;
  source: string;
  status: string;
  model: string | null;
  rationale: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function safeParseArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v) => typeof v === "string");
  } catch {
    return [];
  }
}

function toTheme(row: DbWeeklyTheme): WeeklyTheme {
  return {
    id: row.id,
    weekStart: row.weekStart.toISOString(),
    theme: row.theme,
    summary: row.summary,
    primaryCampaign: row.primaryCampaign,
    primaryCluster: row.primaryCluster,
    primaryPillar: row.primaryPillar,
    actionDirectives: safeParseArray(row.actionDirectives),
    source: row.source as WeeklyThemeSource,
    status: row.status as WeeklyThemeStatus,
    model: row.model,
    rationale: row.rationale,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function weekStartOf(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const offset = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - offset);
  return d;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

export function listWeekStarts(from: Date, to: Date): Date[] {
  const start = weekStartOf(from);
  const end = weekStartOf(to);
  const weeks: Date[] = [];
  let cur = start;
  while (cur <= end) {
    weeks.push(new Date(cur));
    cur = addDays(cur, 7);
  }
  return weeks;
}

export async function listThemes(filter?: {
  fromWeek?: Date;
  toWeek?: Date;
  status?: WeeklyThemeStatus;
  /** Si true : inclut les thèmes archivés (par défaut on les exclut). */
  includeArchived?: boolean;
}): Promise<WeeklyTheme[]> {
  const rows = await prisma.weeklyTheme.findMany({
    where: {
      ...(filter?.fromWeek ? { weekStart: { gte: filter.fromWeek } } : {}),
      ...(filter?.toWeek ? { weekStart: { lte: filter.toWeek } } : {}),
      ...(filter?.status ? { status: filter.status } : {}),
      ...(filter?.includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: [{ weekStart: "asc" }, { createdAt: "desc" }],
  });
  return rows.map(toTheme);
}

export async function getActiveTheme(weekStart: Date): Promise<WeeklyTheme | null> {
  const row = await prisma.weeklyTheme.findFirst({
    where: { weekStart, status: "active" },
    orderBy: { createdAt: "desc" },
  });
  return row ? toTheme(row) : null;
}

export async function listSuggestions(weekStart: Date): Promise<WeeklyTheme[]> {
  const rows = await prisma.weeklyTheme.findMany({
    where: { weekStart, status: "draft" },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toTheme);
}

/** Supprime les propositions draft existantes d'une semaine (avant régénération). */
export async function clearDraftSuggestions(weekStart: Date): Promise<void> {
  await prisma.weeklyTheme.deleteMany({
    where: { weekStart, status: "draft" },
  });
}

export async function createTheme(input: {
  weekStart: Date;
  theme: string;
  summary: string;
  primaryCampaign?: string | null;
  primaryCluster?: string | null;
  primaryPillar?: string | null;
  actionDirectives?: string[];
  source: WeeklyThemeSource;
  status?: WeeklyThemeStatus;
  model?: string;
  rationale?: string;
}): Promise<WeeklyTheme> {
  const row = await prisma.weeklyTheme.create({
    data: {
      weekStart: input.weekStart,
      theme: input.theme,
      summary: input.summary,
      primaryCampaign: input.primaryCampaign ?? null,
      primaryCluster: input.primaryCluster ?? null,
      primaryPillar: input.primaryPillar ?? null,
      actionDirectives: input.actionDirectives
        ? JSON.stringify(input.actionDirectives)
        : null,
      source: input.source,
      status: input.status ?? "draft",
      model: input.model ?? null,
      rationale: input.rationale ?? null,
    },
  });
  return toTheme(row);
}

export async function activateTheme(themeId: number): Promise<WeeklyTheme> {
  const target = await prisma.weeklyTheme.findUnique({ where: { id: themeId } });
  if (!target) throw new Error("Thème introuvable");
  await prisma.weeklyTheme.updateMany({
    where: {
      weekStart: target.weekStart,
      status: "active",
      id: { not: themeId },
    },
    data: { status: "archived" },
  });
  const row = await prisma.weeklyTheme.update({
    where: { id: themeId },
    data: { status: "active" },
  });
  return toTheme(row);
}

export async function rejectTheme(themeId: number): Promise<WeeklyTheme> {
  const row = await prisma.weeklyTheme.update({
    where: { id: themeId },
    data: { status: "rejected" },
  });
  return toTheme(row);
}

export async function updateThemeContent(input: {
  id: number;
  theme?: string;
  summary?: string;
  primaryCampaign?: string | null;
  primaryCluster?: string | null;
  primaryPillar?: string | null;
  actionDirectives?: string[];
}): Promise<WeeklyTheme> {
  const row = await prisma.weeklyTheme.update({
    where: { id: input.id },
    data: {
      theme: input.theme,
      summary: input.summary,
      primaryCampaign: input.primaryCampaign,
      primaryCluster: input.primaryCluster,
      primaryPillar: input.primaryPillar,
      actionDirectives: input.actionDirectives !== undefined
        ? JSON.stringify(input.actionDirectives)
        : undefined,
      source: "user_edited",
    },
  });
  return toTheme(row);
}

// =============================================================================
// Génération Claude — 3 thèmes par semaine + intégration actualités
// =============================================================================

interface SuggestThemesInput {
  weekStarts: Date[];
  /** Nombre de propositions par semaine (3 par défaut). */
  proposalsPerWeek?: number;
  /** Prompt utilisateur libre : actualité, demande spécifique. */
  userPrompt?: string;
  /** Si true, on supprime les drafts existants avant de regénérer. */
  replace?: boolean;
}

const RESPONSE_SCHEMA = `interface Response {
  weeks: Array<{
    weekStart: string;
    proposals: Array<{
      theme: string;          // 8-10 mots
      summary: string;        // 2-3 phrases
      primaryCampaign: "A" | "B" | "C" | "D" | "E" | "F" | null;
      primaryCluster: "A-WP" | "B-TIH" | "C-ROI" | null;
      primaryPillar: "W" | "A" | "H" | "R" | "C" | null;
      actionDirectives: string[];
      /** Justification : KPIs ET actualités intégrées. */
      rationale: string;
    }>;
  }>;
}`;

/**
 * Récupère les facteurs externes pertinents (actualités saisies par l'utilisatrice
 * via PlanningContext, hooks gagnants, etc.).
 */
async function buildExternalContext(): Promise<string> {
  const [pendingContexts, recentWinners] = await Promise.all([
    prisma.planningContext.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.hookSuggestion.findMany({
      where: {
        selected: true,
        content: { status: { in: ["published", "validated"] } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const contextLines = pendingContexts.length === 0
    ? "(aucun facteur signalé en attente)"
    : pendingContexts.map((c: { source: string; createdAt: Date; digest: string; rawInput: string | null }) =>
        `- ${c.createdAt.toISOString().slice(0, 10)} [${c.source}] ${c.digest}${c.rawInput ? ` — input : "${c.rawInput.slice(0, 200)}"` : ""}`
      ).join("\n");

  const winnersLines = recentWinners.length === 0
    ? "(aucun pattern gagnant historisé)"
    : recentWinners.map((h: { pattern: string; hook: string }) => `- [${h.pattern}] "${h.hook}"`).join("\n");

  return `ACTUALITÉS / FACTEURS NEXT IMPACT en attente d'intégration :
${contextLines}

PATTERNS GAGNANTS récents (hooks retenus puis publiés) :
${winnersLines}`;
}

export async function suggestThemesWithClaude(
  input: SuggestThemesInput
): Promise<Map<string, WeeklyTheme[]>> {
  const proposalsPerWeek = input.proposalsPerWeek ?? 3;
  const userPrompt = input.userPrompt?.trim() ?? "";

  const snapshots = await listSnapshots();
  const items = await listContentItems();
  const last = snapshots[snapshots.length - 1];

  const channelLines = last
    ? summarize(last, new Date()).map(
        (c) => `- ${c.label} : ${c.primaryKpi} = ${c.primaryValue} (${c.progress.status})`
      ).join("\n")
    : "(pas de KPI disponible)";

  const upcomingByWeek = input.weekStarts
    .map((ws) => {
      const wsEnd = addDays(ws, 7);
      const inWeek = items.filter((i) => {
        const d = new Date(i.plannedFor);
        return d >= ws && d < wsEnd && i.status !== "skipped";
      });
      return `Semaine ${ws.toISOString().slice(0, 10)} :\n${
        inWeek.length === 0
          ? "  (vide)"
          : inWeek.map((i) => `  - [${i.type}] ${i.trackKey} : ${i.subject}`).join("\n")
      }`;
    })
    .join("\n\n");

  const externalContext = await buildExternalContext();

  const caseStudiesBlock = CASE_STUDIES.map(
    (c) => `- ${c.name} : ${c.results}`
  ).join("\n");

  const system = `Tu es directrice de la stratégie de contenu chez Next Impact Digital.
${BRAND_PROMISE}

Études de cas mobilisables :
${caseStudiesBlock}

Pour chaque semaine listée, propose ${proposalsPerWeek} thématiques **alternatives ET distinctes** qui :
- s'alignent avec une campagne LinkedIn (A-F : ${LINKEDIN_CAMPAIGNS.map((c) => `${c.code}=${c.name}`).join(", ")})
- s'alignent avec un cluster SEO si pertinent (${SEO_CLUSTERS.map((c) => `${c.code}=${c.label}`).join(", ")})
- s'alignent avec un pilier newsletter (${Object.entries(NEWSLETTER_PILLARS).map(([k, v]) => `${k}=${v.name}`).join(", ")})
- intègrent **3 sources d'actualités** :
  1. **Actualité business** : OETH/AGEFIPH, fiscalité PME, marchés concernés (DSI, DAF, recrutement web)
  2. **Actualité tech** : sorties WordPress, Next.js, Astro, Webflow, Vercel, IA, headless trends
  3. **Actualité Next Impact** : nouveaux clients, certifications, événements, témoignages clients (cf. études de cas ci-dessus + facteurs en attente listés)
- réagissent aux signaux KPI (renforcer ce qui marche, corriger ce qui dérive)
- proposent 3-5 directives d'action courtes et concrètes

Règles strictes :
- Tes 3 propositions doivent **vraiment être différentes** : différentes campagnes, différents angles, différentes priorités. Pas 3 variations du même thème.
- Le titre du thème : 8-10 mots maximum, fort, mémorable.
- Les directives : verbes à l'impératif, mesurables.
- 1 thème = 1 campagne dominante.
- La rationale CITE explicitement quelle actualité OU quel KPI motive le choix.`;

  const user = `KPIs récents (snapshot ${last?.period ?? "?"}) :
${channelLines}

${externalContext}

Plan en cours :
${upcomingByWeek}

${userPrompt ? `\nDIRECTIVE SPÉCIFIQUE DE L'UTILISATRICE :\n"${userPrompt}"\n` : ""}

Génère ${proposalsPerWeek} propositions de thèmes pour chacune des ${input.weekStarts.length} semaine(s). Les 3 propositions doivent couvrir des angles franchement différents (ex : 1 axé technique-DSI, 1 axé fiscal-DAF, 1 axé positionnement-marque).`;

  const result = await callClaudeJson({
    model: MODELS.sonnet,
    cachedSystem: await getExtendedBrandBlock(),
    system,
    user,
    jsonShape: RESPONSE_SCHEMA,
    maxTokens: 6_000,
    temperature: 0.5,
    maxRetries: 2,
  });

  type ProposalRaw = {
    theme?: string;
    summary?: string;
    primaryCampaign?: string | null;
    primaryCluster?: string | null;
    primaryPillar?: string | null;
    actionDirectives?: string[];
    rationale?: string;
  };
  type WeekRaw = { weekStart?: string; proposals?: ProposalRaw[] };

  const json = result.json as { weeks?: WeekRaw[] } | null;
  if (!json || !Array.isArray(json.weeks)) {
    throw new Error(`Claude n'a pas renvoyé de propositions valides.\n${result.text.slice(0, 400)}`);
  }

  // Si replace=true, on supprime les drafts existants des semaines visées
  if (input.replace !== false) {
    for (const ws of input.weekStarts) {
      await clearDraftSuggestions(ws);
    }
  }

  const out = new Map<string, WeeklyTheme[]>();
  for (const w of json.weeks) {
    if (!w.weekStart || !Array.isArray(w.proposals)) continue;
    const ws = new Date(w.weekStart);
    if (Number.isNaN(ws.getTime())) continue;
    const created: WeeklyTheme[] = [];
    for (const p of w.proposals) {
      if (!p.theme || !p.summary) continue;
      const t = await createTheme({
        weekStart: ws,
        theme: p.theme,
        summary: p.summary,
        primaryCampaign: p.primaryCampaign ?? null,
        primaryCluster: p.primaryCluster ?? null,
        primaryPillar: p.primaryPillar ?? null,
        actionDirectives: Array.isArray(p.actionDirectives) ? p.actionDirectives : [],
        source: "claude_suggestion",
        status: "draft",
        model: result.model,
        rationale: p.rationale ?? "",
      });
      created.push(t);
    }
    if (created.length > 0) out.set(ws.toISOString(), created);
  }

  return out;
}

export function describePeriod(): string {
  return `Période courante : ${fmtPeriodLong(currentPeriod())}`;
}
 out.set(ws.toISOString(), created);
  }

  return out;
}

export function describePeriod(): string {
  return `Période courante : ${fmtPeriodLong(currentPeriod())}`;
}
