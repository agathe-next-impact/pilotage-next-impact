/**
 * Trajectoires cibles avr.→sept. 2026.
 * Source : strategie_commerciale_next_impact.html (panneau KPI 6 mois).
 *
 * Chaque KPI a une valeur attendue par mois — utilisée pour calculer
 * "ahead / on-track / behind" en comparant la valeur réelle à la valeur attendue
 * à la date d'observation.
 */

import type { Period } from "./types";

export const PERIODS = [
  "2026-04",
  "2026-05",
  "2026-06",
  "2026-07",
  "2026-08",
  "2026-09",
] as const satisfies readonly Period[];

export type CampaignPeriod = (typeof PERIODS)[number];

export type TargetTable<K extends string> = Record<K, Record<CampaignPeriod, number>>;

/** LinkedIn — abonnés, impressions, engagement, DM qualifiés, leads. */
export const LINKEDIN_TARGETS = {
  followers:      { "2026-04": 150,   "2026-05": 250,   "2026-06": 400,    "2026-07": 550,    "2026-08": 700,    "2026-09": 900    },
  impressions:    { "2026-04": 5_000, "2026-05": 8_000, "2026-06": 12_000, "2026-07": 15_000, "2026-08": 18_000, "2026-09": 22_000 },
  engagementRate: { "2026-04": 0.030, "2026-05": 0.035, "2026-06": 0.040,  "2026-07": 0.040,  "2026-08": 0.045,  "2026-09": 0.050  },
  dmsQualified:   { "2026-04": 1,     "2026-05": 2,     "2026-06": 3,      "2026-07": 4,      "2026-08": 5,      "2026-09": 6      },
  formLeads:      { "2026-04": 1,     "2026-05": 2,     "2026-06": 3,      "2026-07": 4,      "2026-08": 4,      "2026-09": 6      },
} as const satisfies TargetTable<
  "followers" | "impressions" | "engagementRate" | "dmsQualified" | "formLeads"
>;

/** Newsletter Substack. */
export const NEWSLETTER_TARGETS = {
  subscribers:     { "2026-04": 60,    "2026-05": 95,    "2026-06": 125,   "2026-07": 155,   "2026-08": 180,   "2026-09": 210   },
  openRate:        { "2026-04": 0.38,  "2026-05": 0.40,  "2026-06": 0.42,  "2026-07": 0.42,  "2026-08": 0.44,  "2026-09": 0.46  },
  ctrResource:     { "2026-04": 0.10,  "2026-05": 0.12,  "2026-06": 0.13,  "2026-07": 0.13,  "2026-08": 0.14,  "2026-09": 0.15  },
  unsubscribeRate: { "2026-04": 0.02,  "2026-05": 0.015, "2026-06": 0.015, "2026-07": 0.01,  "2026-08": 0.01,  "2026-09": 0.01  },
  leadsMentioning: { "2026-04": 0,     "2026-05": 0,     "2026-06": 1,     "2026-07": 1,     "2026-08": 2,     "2026-09": 2     },
} as const satisfies TargetTable<
  "subscribers" | "openRate" | "ctrResource" | "unsubscribeRate" | "leadsMentioning"
>;

/** SEO + GEO — la trajectoire SEO se construit sur 6 mois. */
export const SEO_TARGETS = {
  clicks:       { "2026-04": 50,  "2026-05": 120, "2026-06": 200, "2026-07": 280, "2026-08": 350, "2026-09": 450 },
  pagesIndexed: { "2026-04": 15,  "2026-05": 22,  "2026-06": 28,  "2026-07": 32,  "2026-08": 36,  "2026-09": 42  },
  pagesTop10:   { "2026-04": 2,   "2026-05": 5,   "2026-06": 8,   "2026-07": 12,  "2026-08": 16,  "2026-09": 20  },
} as const satisfies TargetTable<"clicks" | "pagesIndexed" | "pagesTop10">;

export const GEO_TARGETS = {
  shareOfVoice:    { "2026-04": 0,  "2026-05": 0.05, "2026-06": 0.10, "2026-07": 0.15, "2026-08": 0.20, "2026-09": 0.30 },
  referralTraffic: { "2026-04": 0,  "2026-05": 5,    "2026-06": 12,   "2026-07": 20,   "2026-08": 30,   "2026-09": 50   },
} as const satisfies TargetTable<"shareOfVoice" | "referralTraffic">;

/** 10 prompts cibles audités chaque semaine pour calculer le Share of Voice. */
export const GEO_PROMPTS = [
  { prompt: "Qui est le meilleur freelance WordPress Headless en France ?", platform: "chatgpt", weight: 1.5 },
  { prompt: "Comment réduire sa contribution AGEFIPH avec un prestataire TIH ?", platform: "perplexity", weight: 1.5 },
  { prompt: "Qu'est-ce que WordPress Headless et pourquoi l'adopter ?", platform: "chatgpt", weight: 1.0 },
  { prompt: "WordPress headless vs classique : quelles différences ?", platform: "google-ai-overview", weight: 1.0 },
  { prompt: "Combien coûte une migration WordPress Headless ?", platform: "perplexity", weight: 1.2 },
  { prompt: "Qu'est-ce qu'un prestataire TIH en développement web ?", platform: "claude", weight: 1.5 },
  { prompt: "Comment améliorer les Core Web Vitals de son site WordPress ?", platform: "google-ai-overview", weight: 1.0 },
  { prompt: "Quelle est la différence entre Next.js et Astro pour WordPress headless ?", platform: "perplexity", weight: 1.2 },
  { prompt: "Y a-t-il des freelances WordPress headless prestataires TIH ?", platform: "chatgpt", weight: 1.5 },
  { prompt: "Simulateur ROI refonte site web : comment calculer ?", platform: "google-ai-overview", weight: 1.0 },
] as const;

/** Tolérance avant de basculer en "behind" (15% sous la trajectoire attendue). */
export const TOLERANCE = 0.15;

/**
 * Calcule la valeur attendue à la date donnée.
 * Si la date est entre 2 mois ciblés, on interpole linéairement.
 */
export function expectedValue(
  table: Readonly<Record<CampaignPeriod, number>>,
  asOf: Date
): number {
  const points: Array<{ date: Date; value: number }> = PERIODS.map((p) => ({
    date: new Date(`${p}-15T00:00:00Z`),
    value: table[p],
  }));

  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return 0;

  if (asOf <= first.date) return first.value;
  if (asOf >= last.date) return last.value;

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (!a || !b) continue;
    if (asOf >= a.date && asOf <= b.date) {
      const span = b.date.getTime() - a.date.getTime();
      const t = span === 0 ? 0 : (asOf.getTime() - a.date.getTime()) / span;
      return a.value + (b.value - a.value) * t;
    }
  }
  return last.value;
}

/** Cible finale (sept. 2026). */
export function finalTarget(table: Readonly<Record<CampaignPeriod, number>>): number {
  return table["2026-09"];
}

/** Baseline (avr. 2026). */
export function baseline(table: Readonly<Record<CampaignPeriod, number>>): number {
  return table["2026-04"];
}
