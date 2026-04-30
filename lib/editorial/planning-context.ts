/**
 * Planning hebdomadaire conversationnel — fusion input chat + signaux KPI + plan en cours.
 * Orchestre Claude pour proposer une PlanRevision contextuelle.
 * SERVER-ONLY.
 */

import "server-only";

import { prisma } from "@/lib/kpi/store";
import { callClaudeJson, MODELS } from "./anthropic";
import { EXTENDED_BRAND_BLOCK, getExtendedBrandBlock } from "./prompts";
import { PLAN_REVISION_SCHEMA } from "./prompts";
import { listContentItems } from "./store";
import { listSnapshots } from "@/lib/kpi/store";
import { computeProgress, summarize } from "@/lib/kpi/aggregate";
import {
  GEO_TARGETS,
  LINKEDIN_TARGETS,
  NEWSLETTER_TARGETS,
  SEO_TARGETS,
} from "@/lib/kpi/targets";
import type { Snapshot } from "@/lib/kpi/types";
import { fmtPeriodLong, currentPeriod } from "@/lib/format";
import type {
  PlanningContext,
  PlanningContextSource,
  PlanningContextStatus,
  PlanRevisionPayload,
} from "./types";

interface DbPlanningContext {
  id: number;
  weekStart: Date | null;
  source: string;
  rawInput: string | null;
  digest: string;
  affectedSlugs: string | null;
  status: string;
  resolvedAt: Date | null;
  createdAt: Date;
}

function toPlanningContext(row: DbPlanningContext): PlanningContext {
  let slugs: string[] = [];
  if (row.affectedSlugs) {
    try {
      const parsed = JSON.parse(row.affectedSlugs);
      if (Array.isArray(parsed)) slugs = parsed.filter((s) => typeof s === "string");
    } catch {
      // ignore
    }
  }
  return {
    id: row.id,
    weekStart: row.weekStart ? row.weekStart.toISOString() : null,
    source: row.source as PlanningContextSource,
    rawInput: row.rawInput,
    digest: row.digest,
    affectedSlugs: slugs,
    status: row.status as PlanningContextStatus,
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Lundi de la semaine UTC contenant la date donnée. */
export function weekStartOf(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayOfWeek = d.getUTCDay(); // 0 = dim, 1 = lun
  const diff = (dayOfWeek + 6) % 7; // jours depuis le lundi
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

export async function listPlanningContexts(filter?: {
  status?: PlanningContextStatus;
  weekStart?: Date;
  limit?: number;
}): Promise<PlanningContext[]> {
  const rows = await prisma.planningContext.findMany({
    where: {
      ...(filter?.status ? { status: filter.status } : {}),
      ...(filter?.weekStart ? { weekStart: filter.weekStart } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: filter?.limit ?? 50,
  });
  return rows.map(toPlanningContext);
}

export async function getPlanningContext(id: number): Promise<PlanningContext | null> {
  const row = await prisma.planningContext.findUnique({ where: { id } });
  return row ? toPlanningContext(row) : null;
}

export async function createPlanningContext(input: {
  weekStart: Date | null;
  source: PlanningContextSource;
  rawInput?: string;
  digest: string;
  affectedSlugs?: string[];
}): Promise<PlanningContext> {
  const row = await prisma.planningContext.create({
    data: {
      weekStart: input.weekStart,
      source: input.source,
      rawInput: input.rawInput ?? null,
      digest: input.digest,
      affectedSlugs: input.affectedSlugs ? JSON.stringify(input.affectedSlugs) : null,
      status: "pending",
    },
  });
  return toPlanningContext(row);
}

export async function markContextResolved(
  id: number,
  outcome: "applied" | "ignored" | "stale"
): Promise<PlanningContext> {
  const row = await prisma.planningContext.update({
    where: { id },
    data: { status: outcome, resolvedAt: new Date() },
  });
  return toPlanningContext(row);
}

// =============================================================================
// Synthèse pour le prompt Claude
// =============================================================================

interface ContextSummary {
  kpiBlock: string;
  planBlock: string;
  pendingContextBlock: string;
}

async function buildClaudeContext(scopeWeeks: number = 4): Promise<ContextSummary> {
  const [snapshots, items, pendingContexts] = await Promise.all([
    listSnapshots(),
    listContentItems(),
    listPlanningContexts({ status: "pending", limit: 10 }),
  ]);

  // KPI block — synthèse des 3 derniers snapshots + statut vs trajectoire
  const last = snapshots[snapshots.length - 1];
  let kpiBlock = "Aucune donnée KPI disponible.";
  if (last) {
    const channels = summarize(last, new Date());
    const li = computeProgress(last.linkedin.followers, LINKEDIN_TARGETS.followers, new Date());
    const nl = computeProgress(last.newsletter.subscribers, NEWSLETTER_TARGETS.subscribers, new Date());
    const seo = computeProgress(last.seo.clicks, SEO_TARGETS.clicks, new Date());
    const geo = computeProgress(last.geo.shareOfVoice, GEO_TARGETS.shareOfVoice, new Date());

    const recent = snapshots.slice(-3);
    const trendLines = recent.map(
      (s: Snapshot) =>
        `- ${fmtPeriodLong(s.period)} : LI ${s.linkedin.followers} / NL ${s.newsletter.subscribers} / SEO ${s.seo.clicks} clics / GEO ${(s.geo.shareOfVoice * 100).toFixed(1)}%`
    );

    kpiBlock = `Dernier snapshot (${last.period}) :
- LinkedIn ${last.linkedin.followers} abonnés (status ${li.status}, ${(li.pctOfTrajectory * 100).toFixed(0)}% trajectoire)
- Newsletter ${last.newsletter.subscribers} abonnés (status ${nl.status})
- SEO ${last.seo.clicks} clics/mois (status ${seo.status})
- GEO ${(last.geo.shareOfVoice * 100).toFixed(1)}% SoV (status ${geo.status})
- Engagement LI : ${(last.linkedin.engagementRate * 100).toFixed(2)}%
- Open rate NL : ${(last.newsletter.openRate * 100).toFixed(1)}%

Tendance ${recent.length} derniers mois :
${trendLines.join("\n")}

Synthèse par canal : ${channels.map((c) => `${c.label}=${c.progress.status}`).join(", ")}`;
  }

  // Plan block — items à venir dans les N prochaines semaines
  const horizonEnd = new Date();
  horizonEnd.setUTCDate(horizonEnd.getUTCDate() + scopeWeeks * 7);
  const upcoming = items.filter((i) => {
    if (i.status === "published" || i.status === "skipped") return false;
    const d = new Date(i.plannedFor);
    return d >= new Date() && d <= horizonEnd;
  });

  const planBlock = upcoming.length === 0
    ? "(aucun contenu planifié dans les prochaines semaines)"
    : upcoming
        .map(
          (i) =>
            `- [id=${i.id}] [${i.slug}] type=${i.type} track=${i.trackKey} planifié=${i.plannedFor.slice(0, 10)} statut=${i.status}\n    Sujet : ${i.subject}\n    Brief : ${i.brief.slice(0, 180)}`
        )
        .join("\n");

  // Pending contexts block — autres facteurs déjà signalés mais pas résolus
  const pendingContextBlock = pendingContexts.length === 0
    ? "(aucun)"
    : pendingContexts
        .map(
          (c) =>
            `- ${c.createdAt.slice(0, 16)} [${c.source}]${c.weekStart ? ` semaine ${c.weekStart.slice(0, 10)}` : ""} : ${c.digest}`
        )
        .join("\n");

  return { kpiBlock, planBlock, pendingContextBlock };
}

// =============================================================================
// Pipeline principal : input texte → digest + PlanRevision proposée
// =============================================================================

interface SubmitChatInputResult {
  context: PlanningContext;
  revisionId: number | null;
  digest: string;
}

export async function submitChatInput(input: {
  rawInput: string;
  weekStart?: Date;
}): Promise<SubmitChatInputResult> {
  const { rawInput } = input;
  const weekStart = input.weekStart ?? null;

  const ctx = await buildClaudeContext(4);

  const system = `Tu es directrice de la stratégie de contenu chez Next Impact Digital. L'utilisatrice (Agathe) te soumet un facteur contextuel impromptu qui doit ajuster son planning éditorial des 4 prochaines semaines.

Ton rôle :
1. Reformule l'input en 1-2 phrases claires (le "digest").
2. Identifie quels ContentItem sont impactés (par slug).
3. Propose des changements concrets : replanifier, réécrire le sujet, réécrire le brief, skipper, ou créer un nouvel item dans le plan.

Règles :
- Tu cites les IDs des ContentItem impactés.
- Tu ne touches PAS aux items déjà publiés ou validés.
- Si l'input ne nécessite aucun changement (information neutre), tu retournes une PlanRevisionPayload avec changes = [] et expliques pourquoi.
- Tu prends en compte les KPIs récents pour prioriser intelligemment.
- Tu intègres aussi les autres contextes en attente s'ils sont liés.`;

  const user = `INPUT UTILISATEUR :
"""
${rawInput}
"""

${weekStart ? `Semaine cible : ${weekStart.toISOString().slice(0, 10)} (lundi)` : "Pas de semaine cible précise — applique sur les 4 prochaines semaines."}

KPIs récents :
${ctx.kpiBlock}

Plan éditorial à venir (4 semaines) :
${ctx.planBlock}

Autres contextes en attente :
${ctx.pendingContextBlock}

Renvoie TON ANALYSE et la PlanRevisionPayload.`;

  // On augmente le schéma pour inclure le digest en plus de la PlanRevisionPayload.
  const responseSchema = `interface Response {
  /** Reformulation claire du facteur en 1-2 phrases */
  digest: string;
  /** Slugs ContentItem impactés */
  affectedSlugs: string[];
  /** Proposition d'ajustement (vide si aucun changement nécessaire) */
  revision: ${PLAN_REVISION_SCHEMA.replace("interface PlanRevisionPayload", "")};
}`;

  const result = await callClaudeJson({
    model: MODELS.sonnet,
    cachedSystem: await getExtendedBrandBlock(),
    system,
    user,
    jsonShape: responseSchema,
    maxTokens: 4_000,
    temperature: 0.3,
    maxRetries: 2,
  });

  const json = result.json as {
    digest?: string;
    affectedSlugs?: string[];
    revision?: PlanRevisionPayload;
  } | null;

  if (!json || typeof json.digest !== "string") {
    throw new Error(
      `Claude n'a pas renvoyé une réponse valide. Texte brut :\n${result.text.slice(0, 400)}`
    );
  }

  // Stocker le contexte
  const context = await createPlanningContext({
    weekStart,
    source: "user_chat",
    rawInput,
    digest: json.digest,
    affectedSlugs: Array.isArray(json.affectedSlugs) ? json.affectedSlugs : [],
  });

  // Si Claude propose des changements concrets, créer une PlanRevision liée
  let revisionId: number | null = null;
  if (json.revision && Array.isArray(json.revision.changes) && json.revision.changes.length > 0) {
    // Filtrer les changes pointant sur des items inexistants
    const items = await listContentItems();
    const itemById = new Map(items.map((i) => [i.id, i]));
    const validChanges = json.revision.changes.filter((c) => {
      if (c.kind === "create-new") return true;
      const target = itemById.get(c.contentId);
      return target && target.status !== "published";
    });

    if (validChanges.length > 0) {
      const revRow = await prisma.planRevision.create({
        data: {
          scope: "global",
          basedOnPeriod: currentPeriod(),
          payload: JSON.stringify({
            rationale: json.revision.rationale ?? json.digest,
            perfSummary: json.revision.perfSummary ?? "",
            changes: validChanges,
          }),
          model: result.model,
          status: "pending",
          contextId: context.id,
        },
      });
      revisionId = revRow.id;
    }
  }

  return { context, revisionId, digest: json.digest };
}
