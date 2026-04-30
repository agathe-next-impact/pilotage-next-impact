/**
 * Modèle TypeScript des KPIs Next Impact Digital.
 * Aligné 1:1 avec le plugin WordPress (next-impact-kpi.php).
 */

/** Période YYYY-MM (ex: "2026-04") */
export type Period = `${number}-${"01"|"02"|"03"|"04"|"05"|"06"|"07"|"08"|"09"|"10"|"11"|"12"}`;

export type DataSource = "manual" | "gsc" | "ga4" | "geo-audit" | "ga4+gsc";

export type Channel = "linkedin" | "newsletter" | "seo" | "geo" | "global";

export interface LinkedInMetrics {
  followers: number;
  impressions: number;
  engagementRate: number; // 0–1
  dmsQualified: number;
  formLeads: number;
  postsPublished: number;
}

export interface NewsletterMetrics {
  subscribers: number;
  openRate: number; // 0–1
  ctrResource: number; // 0–1
  unsubscribeRate: number; // 0–1
  leadsMentioning: number;
  editionNumber: number; // 1–6
}

export interface SeoMetrics {
  clicks: number;
  impressions: number;
  pagesIndexed: number;
  pagesTop10: number;
  avgPosition: number;
}

export interface GeoMetrics {
  shareOfVoice: number; // 0–1
  citationsCount: number;
  referralTraffic: number;
  /** Audit JSON détaillé par prompt — sérialisé en string côté WP. */
  auditPayload?: GeoAuditPayload;
}

export interface GeoAuditPayload {
  ranAt: string; // ISO 8601
  prompts: GeoPromptResult[];
}

export interface GeoPromptResult {
  prompt: string;
  platform: "chatgpt" | "perplexity" | "gemini" | "claude" | "google-ai-overview";
  cited: boolean;
  position?: number; // ordre d'apparition de la marque dans la réponse
  excerpt?: string; // 60 mots max
}

export interface Ga4Metrics {
  sessions: number;
  users: number;
  conversions: number;
}

export interface Snapshot {
  id: number;
  period: Period;
  modified: string;
  collectedAt: string;
  source: DataSource;
  linkedin: LinkedInMetrics;
  newsletter: NewsletterMetrics;
  seo: SeoMetrics;
  geo: GeoMetrics;
  ga4: Ga4Metrics;
}

/** Forme brute renvoyée par l'API REST WP (avant normalisation). */
export interface RawSnapshot {
  id: number;
  title: string;
  period: string;
  modified: string;
  meta: Record<string, string | number | undefined>;
}

/** Statut vs trajectoire cible. */
export type ProgressStatus = "ahead" | "on-track" | "behind" | "no-data";

export interface KpiProgress {
  current: number;
  target: number;
  baseline: number;
  pctOfTarget: number; // 0–1+
  pctOfTrajectory: number; // 0–1+ (vs valeur attendue à cette date)
  status: ProgressStatus;
  delta: number; // current - expected
}

export interface ChannelSummary {
  channel: Channel;
  label: string;
  primaryKpi: string;
  primaryValue: number;
  primaryTarget: number;
  primaryFormat: "number" | "percent";
  progress: KpiProgress;
  secondaryStats: Array<{ label: string; value: string }>;
}
