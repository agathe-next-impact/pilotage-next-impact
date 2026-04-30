/**
 * Plan-adjuster : Claude analyse les KPIs récents + le plan en cours et
 * propose une PlanRevision si une dérive significative est détectée.
 * SERVER-ONLY.
 */

import "server-only";

import { callClaudeJson, MODELS } from "./anthropic";
import { EXTENDED_BRAND_BLOCK, getExtendedBrandBlock } from "./prompts";
import { buildPlanAdjusterPrompt, PLAN_REVISION_SCHEMA } from "./prompts";
import { createPlanRevision, listContentItems } from "./store";
import type { PlanRevision, PlanRevisionPayload, PlanScope } from "./types";
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

interface AdjustOptions {
  scope?: PlanScope;
  /** Force l'ajustement même si rien ne dérive significativement. */
  force?: boolean;
}

/**
 * Construit la synthèse KPI textuelle à passer à Claude.
 */
function summarizeKpis(snapshots: Snapshot[]): string {
  const last = snapshots[snapshots.length - 1];
  if (!last) return "Aucune donnée KPI disponible.";

  const asOf = new Date();
  const channels = summarize(last, asOf);

  // Tendance sur les 3 derniers points
  const recent = snapshots.slice(-3);
  const trend = (pick: (s: Snapshot) => number): string => {
    if (recent.length < 2) return "—";
    const first = recent[0];
    const lastR = recent[recent.length - 1];
    if (!first || !lastR) return "—";
    const diff = pick(lastR) - pick(first);
    return diff >= 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2);
  };

  const linesRecent = recent
    .map(
      (s) =>
        `- ${fmtPeriodLong(s.period)} : LI ${s.linkedin.followers} abs · NL ${s.newsletter.subscribers} abs (open ${(s.newsletter.openRate * 100).toFixed(1)}%) · SEO ${s.seo.clicks} clics · GEO SoV ${(s.geo.shareOfVoice * 100).toFixed(1)}%`
    )
    .join("\n");

  const liProgress = computeProgress(last.linkedin.followers, LINKEDIN_TARGETS.followers, asOf);
  const nlProgress = computeProgress(last.newsletter.subscribers, NEWSLETTER_TARGETS.subscribers, asOf);
  const seoProgress = computeProgress(last.seo.clicks, SEO_TARGETS.clicks, asOf);
  const geoProgress = computeProgress(last.geo.shareOfVoice, GEO_TARGETS.shareOfVoice, asOf);

  return `Statuts vs trajectoire cible :
- LinkedIn (abonnés) : ${last.linkedin.followers} / cible attendue ${liProgress.target} → ${liProgress.status} (${(liProgress.pctOfTrajectory * 100).toFixed(0)}% de la trajectoire)
- Newsletter (abonnés) : ${last.newsletter.subscribers} → ${nlProgress.status} (${(nlProgress.pctOfTrajectory * 100).toFixed(0)}%)
- SEO (clics/mois) : ${last.seo.clicks} → ${seoProgress.status} (${(seoProgress.pctOfTrajectory * 100).toFixed(0)}%)
- GEO (Share of Voice) : ${(last.geo.shareOfVoice * 100).toFixed(1)}% → ${geoProgress.status} (${(geoProgress.pctOfTrajectory * 100).toFixed(0)}%)

Engagement secondaire LinkedIn : ${(last.linkedin.engagementRate * 100).toFixed(2)}% · DM qualifiés : ${last.linkedin.dmsQualified} · Leads form. : ${last.linkedin.formLeads}
Newsletter : open rate ${(last.newsletter.openRate * 100).toFixed(1)}% · CTR ${(last.newsletter.ctrResource * 100).toFixed(1)}% · désabo ${(last.newsletter.unsubscribeRate * 100).toFixed(2)}%

Tendance 3 derniers mois (${recent.length} points) :
${linesRecent}

Deltas : LI ${trend((s) => s.linkedin.followers)} · NL ${trend((s) => s.newsletter.subscribers)} · SEO clics ${trend((s) => s.seo.clicks)} · GEO ${trend((s) => s.geo.shareOfVoice)}

Synthèse par canal (vue dashboard) :
${channels.map((c) => `- ${c.label} : ${c.primaryKpi} = ${c.primaryValue} (${c.progress.status})`).join("\n")}`;
}

/**
 * Construit la liste textuelle des items à venir.
 */
function summarizePlan(items: Awaited<ReturnType<typeof listContentItems>>, scope: PlanScope): string {
  const now = new Date();
  const filtered = items.filter((i) => {
    if (i.status === "published" || i.status === "skipped") return false;
    if (new Date(i.plannedFor) < now) return false;
    if (scope === "global") return true;
    if (scope === "linkedin") return i.type === "linkedin_post";
    if (scope === "newsletter") return i.type === "newsletter_edition";
    if (scope === "seo") return i.type === "seo_article";
    return false;
  });

  if (filtered.length === 0) return "(aucun item à venir dans ce scope)";

  return filtered
    .map(
      (i) =>
        `- [id=${i.id}] [${i.slug}] type=${i.type} track=${i.trackKey} planifié=${i.plannedFor.slice(0, 10)} statut=${i.status}\n    Sujet : ${i.subject}\n    Brief : ${i.brief}`
    )
    .join("\n");
}

/**
 * Pipeline complet : analyse + appel Claude + persistance.
 */
export async function adjustPlanWithClaude(
  options: AdjustOptions = {}
): Promise<PlanRevision | null> {
  const scope: PlanScope = options.scope ?? "global";
  const snapshots = await listSnapshots();
  const items = await listContentItems();

  const kpiSummary = summarizeKpis(snapshots);
  const planSummary = summarizePlan(items, scope);

  // Heuristique de déclenchement (sauf force=true) : ≥1 canal en "behind"
  if (!options.force) {
    const last = snapshots[snapshots.length - 1];
    if (!last) return null;
    const summaries = summarize(last, new Date());
    const hasBehind = summaries.some((s) => s.progress.status === "behind");
    if (!hasBehind) return null;
  }

  const { system, user } = buildPlanAdjusterPrompt({
    scope,
    basedOnPeriod: currentPeriod(),
    kpiSummary,
    planSummary,
  });

  // Plan-adjuster = décision stratégique → Opus + extended thinking
  const result = await callClaudeJson({
    model: MODELS.opus,
    cachedSystem: await getExtendedBrandBlock(),
    system,
    user,
    jsonShape: PLAN_REVISION_SCHEMA,
    maxTokens: 4_000,
    temperature: 0.3,
    maxRetries: 2,
    thinking: { budgetTokens: 5_000 },
  });

  const payload = result.json as PlanRevisionPayload | null;
  if (!payload || !Array.isArray(payload.changes)) {
    throw new Error(
      `Claude n'a pas renvoyé un PlanRevisionPayload valide. Texte brut :\n${result.text.slice(0, 400)}`
    );
  }

  // Sécurité : on filtre les changes qui visent un item inexistant ou déjà publié
  const itemById = new Map(items.map((i) => [i.id, i]));
  const validChanges = payload.changes.filter((c) => {
    const target = itemById.get(c.contentId);
    if (!target) return false;
    if (target.status === "published") return false;
    return true;
  });

  if (validChanges.length === 0) return null;

  return createPlanRevision({
    scope,
    basedOnPeriod: currentPeriod(),
    payload: { ...payload, changes: validChanges },
    model: result.model,
  });
}
