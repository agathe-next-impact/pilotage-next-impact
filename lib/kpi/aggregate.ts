/**
 * Couche d'agrégation : KPIs courants vs trajectoire cible, projections,
 * deltas et statuts ahead/on-track/behind.
 */

import type {
  Snapshot,
  ChannelSummary,
  KpiProgress,
  ProgressStatus,
  Channel,
} from "./types";
import {
  LINKEDIN_TARGETS,
  NEWSLETTER_TARGETS,
  SEO_TARGETS,
  GEO_TARGETS,
  TOLERANCE,
  expectedValue,
  finalTarget,
  baseline,
  type CampaignPeriod,
  PERIODS,
} from "./targets";

// =============================================================================
// Calcul de progression d'un KPI à une date donnée
// =============================================================================
export function computeProgress(
  current: number,
  table: Readonly<Record<CampaignPeriod, number>>,
  asOf: Date
): KpiProgress {
  const expected = expectedValue(table, asOf);
  const target = finalTarget(table);
  const base = baseline(table);
  const denomTarget = target === 0 ? 1 : target;
  const denomExpected = expected === 0 ? 0.0001 : expected;

  const pctOfTarget = current / denomTarget;
  const pctOfTrajectory = current / denomExpected;
  const delta = current - expected;

  const status: ProgressStatus = current === 0 && expected === 0
    ? "no-data"
    : pctOfTrajectory >= 1 + TOLERANCE
      ? "ahead"
      : pctOfTrajectory >= 1 - TOLERANCE
        ? "on-track"
        : "behind";

  return {
    current,
    target,
    baseline: base,
    pctOfTarget,
    pctOfTrajectory,
    status,
    delta,
  };
}

// =============================================================================
// Synthèse par canal — affichée dans la grille du dashboard
// =============================================================================
export function summarize(snapshot: Snapshot, asOf: Date = new Date()): ChannelSummary[] {
  const li = snapshot.linkedin;
  const nl = snapshot.newsletter;
  const seo = snapshot.seo;
  const geo = snapshot.geo;

  const liProgress = computeProgress(li.followers, LINKEDIN_TARGETS.followers, asOf);
  const nlProgress = computeProgress(nl.subscribers, NEWSLETTER_TARGETS.subscribers, asOf);
  const seoProgress = computeProgress(seo.clicks, SEO_TARGETS.clicks, asOf);
  const geoProgress = computeProgress(geo.shareOfVoice, GEO_TARGETS.shareOfVoice, asOf);

  const summaries: ChannelSummary[] = [
    {
      channel: "linkedin",
      label: "LinkedIn",
      primaryKpi: "Abonnés",
      primaryValue: li.followers,
      primaryTarget: LINKEDIN_TARGETS.followers["2026-09"],
      primaryFormat: "number",
      progress: liProgress,
      secondaryStats: [
        { label: "Impressions/mois", value: fmtNumber(li.impressions) },
        { label: "Engagement", value: fmtPercent(li.engagementRate) },
        { label: "DM qualifiés", value: String(li.dmsQualified) },
        { label: "Leads", value: String(li.formLeads) },
      ],
    },
    {
      channel: "newsletter",
      label: "Newsletter",
      primaryKpi: "Abonnés",
      primaryValue: nl.subscribers,
      primaryTarget: NEWSLETTER_TARGETS.subscribers["2026-09"],
      primaryFormat: "number",
      progress: nlProgress,
      secondaryStats: [
        { label: "Open rate", value: fmtPercent(nl.openRate) },
        { label: "CTR ressource", value: fmtPercent(nl.ctrResource) },
        { label: "Désabo", value: fmtPercent(nl.unsubscribeRate) },
        { label: "Édition", value: `#${nl.editionNumber}` },
      ],
    },
    {
      channel: "seo",
      label: "SEO",
      primaryKpi: "Clics organiques/mois",
      primaryValue: seo.clicks,
      primaryTarget: SEO_TARGETS.clicks["2026-09"],
      primaryFormat: "number",
      progress: seoProgress,
      secondaryStats: [
        { label: "Pages indexées", value: String(seo.pagesIndexed) },
        { label: "Pos. 1–10", value: String(seo.pagesTop10) },
        { label: "Position moy.", value: seo.avgPosition.toFixed(1) },
        { label: "Impressions", value: fmtNumber(seo.impressions) },
      ],
    },
    {
      channel: "geo",
      label: "GEO (IA)",
      primaryKpi: "Share of Voice",
      primaryValue: geo.shareOfVoice,
      primaryTarget: GEO_TARGETS.shareOfVoice["2026-09"],
      primaryFormat: "percent",
      progress: geoProgress,
      secondaryStats: [
        { label: "Citations", value: String(geo.citationsCount) },
        { label: "Trafic référé", value: String(geo.referralTraffic) },
      ],
    },
  ];

  return summaries;
}

// =============================================================================
// Projection sept. 2026 à partir du trend des derniers snapshots
// =============================================================================
export function projectToTarget(
  snapshots: Snapshot[],
  pick: (s: Snapshot) => number,
  table: Readonly<Record<CampaignPeriod, number>>
): { projected: number; target: number; gap: number; gapPct: number } {
  const target = finalTarget(table);
  if (snapshots.length < 2) {
    const last = snapshots[snapshots.length - 1];
    const projected = last ? pick(last) : 0;
    return { projected, target, gap: target - projected, gapPct: target ? (target - projected) / target : 0 };
  }
  // Régression linéaire simple sur les n derniers points (n ≤ 3)
  const last = snapshots.slice(-3);
  const xs = last.map((_, i) => i);
  const ys = last.map(pick);
  const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
  const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
  const num = xs.reduce((sum, x, i) => sum + (x - meanX) * ((ys[i] ?? 0) - meanY), 0);
  const den = xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0);
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;

  // Combien de mois entre dernier point et sept. 2026 ?
  const lastPeriod = last[last.length - 1]?.period ?? "2026-04";
  const idxLast = PERIODS.indexOf(lastPeriod as CampaignPeriod);
  const idxTarget = PERIODS.length - 1; // sept. 2026
  const stepsAhead = Math.max(0, idxTarget - idxLast);
  const projected = Math.max(0, intercept + slope * (last.length - 1 + stepsAhead));

  return {
    projected,
    target,
    gap: target - projected,
    gapPct: target ? (target - projected) / target : 0,
  };
}

// =============================================================================
// Helpers de formatage internes
// =============================================================================
function fmtNumber(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}
function fmtPercent(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}

// =============================================================================
// Convertit un snapshot en série temporelle plate pour Recharts
// =============================================================================
export interface TimeSeriesPoint {
  period: string;
  value: number;
  expected: number;
  target: number;
}

export function buildSeries(
  snapshots: Snapshot[],
  pick: (s: Snapshot) => number,
  table: Readonly<Record<CampaignPeriod, number>>
): TimeSeriesPoint[] {
  const target = finalTarget(table);
  const byPeriod = new Map(snapshots.map((s) => [s.period, s]));
  return PERIODS.map((p) => {
    const s = byPeriod.get(p);
    return {
      period: p,
      value: s ? pick(s) : 0,
      expected: table[p],
      target,
    };
  });
}

export const channelOrder: Channel[] = ["linkedin", "newsletter", "seo", "geo"];
