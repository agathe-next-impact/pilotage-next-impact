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

export type MediaKind = "image" | "video" | "document";

export interface MediaAsset {
  id: number;
  contentId: number;
  kind: MediaKind;
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  alt: string | null;
  caption: string | null;
  position: number;
  createdAt: string;
}

export interface ContentItem {
  id: number;
  slug: string;
  type: ContentType;
  trackKey: string;
  plannedFor: string;
  status: ContentStatus;
  subject: string;
  /** Sujet final éditable (après revue humaine). */
  finalSubject: string | null;
  brief: string;
  draft: string | null;
  finalBody: string | null;
  /** URL publique du post une fois publié. */
  publishedUrl: string | null;
  generatedModel: string | null;
  generatedAt: string | null;
  validatedAt: string | null;
  publishedAt: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  /** Médias attachés (chargés à la demande). */
  media?: MediaAsset[];
}

export interface ContentRevision {
  id: number;
  contentId: number;
  payload: GeneratedDraft;
  createdAt: string;
}

export interface GeneratedDraft {
  subject: string;
  body: string;
  selfReview: string;
  model: string;
  prompt: string;
  feedback?: string;
}

export interface PlanChange {
  contentId: number;
  slug: string;
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
