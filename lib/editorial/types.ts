/**
 * Modèle TypeScript du module Éditorial.
 */

export type ContentType = "linkedin_post" | "newsletter_edition" | "seo_article";

export type ContentStatus =
  | "planned"
  | "drafted"
  | "validated"
  | "published"
  | "skipped";

export type PlanScope = "linkedin" | "newsletter" | "seo" | "global";

export type PlanRevisionStatus = "pending" | "applied" | "rejected";

export interface ContentItem {
  id: number;
  slug: string;
  type: ContentType;
  trackKey: string;
  plannedFor: string; // ISO date
  status: ContentStatus;
  subject: string;
  brief: string;
  draft: string | null;
  finalBody: string | null;
  generatedModel: string | null;
  generatedAt: string | null;
  validatedAt: string | null;
  publishedAt: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContentRevision {
  id: number;
  contentId: number;
  payload: GeneratedDraft;
  createdAt: string;
}

/** Forme du JSON renvoyé par Claude lors d'une génération. */
export interface GeneratedDraft {
  subject: string;
  body: string;
  /** Bloc d'auto-critique de Claude — visible côté admin. */
  selfReview: string;
  /** Modèle utilisé. */
  model: string;
  /** Brief + feedback éventuel utilisés pour générer. */
  prompt: string;
  feedback?: string;
}

export interface PlanChange {
  contentId: number;
  slug: string;
  /** Type de changement proposé. */
  kind: "reschedule" | "rewrite-subject" | "rewrite-brief" | "skip" | "split";
  before: {
    subject: string;
    plannedFor: string;
    brief: string;
  };
  after: {
    subject?: string;
    plannedFor?: string;
    brief?: string;
  };
  rationale: string;
}

export interface PlanRevisionPayload {
  rationale: string;
  /** Synthèse chiffrée de la performance qui motive l'ajustement. */
  perfSummary: string;
  changes: PlanChange[];
}

export interface PlanRevision {
  id: number;
  scope: PlanScope;
  status: PlanRevisionStatus;
  basedOnPeriod: string;
  payload: PlanRevisionPayload;
  model: string;
  createdAt: string;
  appliedAt: string | null;
  rejectedAt: string | null;
}
