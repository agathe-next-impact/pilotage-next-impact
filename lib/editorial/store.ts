/**
 * Couche de stockage Prisma pour le module Éditorial.
 * SERVER-ONLY.
 */

import "server-only";

import { prisma } from "@/lib/kpi/store";
import type {
  ContentItem,
  ContentRevision,
  ContentStatus,
  ContentType,
  GeneratedDraft,
  PlanRevision,
  PlanRevisionPayload,
  PlanRevisionStatus,
  PlanScope,
  MediaAsset,
  MediaKind,
} from "./types";

interface DbContentItem {
  id: number;
  slug: string;
  type: string;
  trackKey: string;
  plannedFor: Date;
  status: string;
  subject: string;
  finalSubject: string | null;
  brief: string;
  draft: string | null;
  finalBody: string | null;
  publishedUrl: string | null;
  generatedModel: string | null;
  generatedAt: Date | null;
  validatedAt: Date | null;
  publishedAt: Date | null;
  meta: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface DbContentRevision {
  id: number;
  contentId: number;
  payload: string;
  createdAt: Date;
}

interface DbPlanRevision {
  id: number;
  scope: string;
  status: string;
  basedOnPeriod: string;
  payload: string;
  model: string;
  createdAt: Date;
  appliedAt: Date | null;
  rejectedAt: Date | null;
  contextId: number | null;
}

interface DbMediaAsset {
  id: number;
  contentId: number;
  kind: string;
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  alt: string | null;
  caption: string | null;
  position: number;
  createdAt: Date;
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

function toContentItem(row: DbContentItem, media?: DbMediaAsset[]): ContentItem {
  return {
    id: row.id,
    slug: row.slug,
    type: row.type as ContentType,
    trackKey: row.trackKey,
    plannedFor: row.plannedFor.toISOString(),
    status: row.status as ContentStatus,
    subject: row.subject,
    finalSubject: row.finalSubject,
    brief: row.brief,
    draft: row.draft,
    finalBody: row.finalBody,
    publishedUrl: row.publishedUrl,
    generatedModel: row.generatedModel,
    generatedAt: row.generatedAt ? row.generatedAt.toISOString() : null,
    validatedAt: row.validatedAt ? row.validatedAt.toISOString() : null,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    meta: safeJsonParse<Record<string, unknown>>(row.meta),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    media: media ? media.map(toMediaAsset) : undefined,
  };
}

function toMediaAsset(row: DbMediaAsset): MediaAsset {
  return {
    id: row.id,
    contentId: row.contentId,
    kind: row.kind as MediaKind,
    url: row.url,
    filename: row.filename,
    size: row.size,
    mimeType: row.mimeType,
    alt: row.alt,
    caption: row.caption,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
  };
}

function toContentRevision(row: DbContentRevision): ContentRevision {
  return {
    id: row.id,
    contentId: row.contentId,
    payload: (safeJsonParse<GeneratedDraft>(row.payload) ?? {
      subject: "", body: "", selfReview: "", model: "", prompt: "",
    }) as GeneratedDraft,
    createdAt: row.createdAt.toISOString(),
  };
}

function toPlanRevision(row: DbPlanRevision): PlanRevision {
  return {
    id: row.id,
    scope: row.scope as PlanScope,
    status: row.status as PlanRevisionStatus,
    basedOnPeriod: row.basedOnPeriod,
    payload: (safeJsonParse<PlanRevisionPayload>(row.payload) ?? {
      rationale: "", perfSummary: "", changes: [],
    }) as PlanRevisionPayload,
    model: row.model,
    createdAt: row.createdAt.toISOString(),
    appliedAt: row.appliedAt ? row.appliedAt.toISOString() : null,
    rejectedAt: row.rejectedAt ? row.rejectedAt.toISOString() : null,
    contextId: row.contextId ?? null,
  };
}

// ContentItem queries -------------------------------------------------------

export async function listContentItems(filter?: {
  type?: ContentType;
  status?: ContentStatus;
  /** Si true : inclut les items archivés (par défaut on les exclut). */
  includeArchived?: boolean;
}): Promise<ContentItem[]> {
  const rows = await prisma.contentItem.findMany({
    where: {
      ...(filter?.type ? { type: filter.type } : {}),
      ...(filter?.status ? { status: filter.status } : {}),
      ...(filter?.includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: { plannedFor: "asc" },
  });
  return rows.map((r: DbContentItem) => toContentItem(r));
}

export async function getContentItem(id: number, includeMedia = false): Promise<ContentItem | null> {
  const row = await prisma.contentItem.findUnique({ where: { id } });
  if (!row) return null;
  if (!includeMedia) return toContentItem(row);
  const media = await prisma.mediaAsset.findMany({
    where: { contentId: id },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  return toContentItem(row, media);
}

export async function getContentItemBySlug(slug: string): Promise<ContentItem | null> {
  const row = await prisma.contentItem.findUnique({ where: { slug } });
  return row ? toContentItem(row) : null;
}

export async function attachDraft(id: number, draft: GeneratedDraft): Promise<ContentItem> {
  const row = await prisma.contentItem.update({
    where: { id },
    data: {
      draft: draft.body,
      subject: draft.subject || undefined,
      generatedModel: draft.model,
      generatedAt: new Date(),
      status: "drafted",
    },
  });
  await prisma.contentRevision.create({
    data: { contentId: id, payload: JSON.stringify(draft) },
  });
  return toContentItem(row);
}

/**
 * Sauvegarde la version finale (sujet + corps).
 * Si publish=true, marque aussi comme validé.
 */
export async function saveFinalContent(input: {
  id: number;
  finalSubject: string;
  finalBody: string;
  validate?: boolean;
}): Promise<ContentItem> {
  const row = await prisma.contentItem.update({
    where: { id: input.id },
    data: {
      finalSubject: input.finalSubject,
      finalBody: input.finalBody,
      ...(input.validate
        ? { status: "validated", validatedAt: new Date() }
        : {}),
    },
  });
  return toContentItem(row);
}

export async function setPublishedUrl(id: number, url: string | null): Promise<ContentItem> {
  const row = await prisma.contentItem.update({
    where: { id },
    data: {
      publishedUrl: url,
      ...(url ? { status: "published", publishedAt: new Date() } : {}),
    },
  });
  return toContentItem(row);
}

export async function markPublished(id: number): Promise<ContentItem> {
  const row = await prisma.contentItem.update({
    where: { id },
    data: { status: "published", publishedAt: new Date() },
  });
  return toContentItem(row);
}

export async function markSkipped(id: number): Promise<ContentItem> {
  const row = await prisma.contentItem.update({
    where: { id },
    data: { status: "skipped" },
  });
  return toContentItem(row);
}

export async function listRevisions(contentId: number): Promise<ContentRevision[]> {
  const rows = await prisma.contentRevision.findMany({
    where: { contentId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toContentRevision);
}

// PlanRevision queries ------------------------------------------------------

export async function createPlanRevision(input: {
  scope: PlanScope;
  basedOnPeriod: string;
  payload: PlanRevisionPayload;
  model: string;
}): Promise<PlanRevision> {
  const row = await prisma.planRevision.create({
    data: {
      scope: input.scope,
      basedOnPeriod: input.basedOnPeriod,
      payload: JSON.stringify(input.payload),
      model: input.model,
      status: "pending",
    },
  });
  return toPlanRevision(row);
}

export async function listPendingPlanRevisions(): Promise<PlanRevision[]> {
  const rows = await prisma.planRevision.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toPlanRevision);
}

export async function applyPlanRevision(id: number): Promise<PlanRevision> {
  const row = await prisma.planRevision.findUnique({ where: { id } });
  if (!row) throw new Error("PlanRevision introuvable.");
  const revision = toPlanRevision(row);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.$transaction(async (tx: any) => {
    for (const change of revision.payload.changes) {
      if (change.kind === "skip") {
        await tx.contentItem.update({
          where: { id: change.contentId },
          data: { status: "skipped" },
        });
        continue;
      }
      await tx.contentItem.update({
        where: { id: change.contentId },
        data: {
          subject: change.after.subject ?? undefined,
          plannedFor: change.after.plannedFor ? new Date(change.after.plannedFor) : undefined,
          brief: change.after.brief ?? undefined,
        },
      });
    }
    await tx.planRevision.update({
      where: { id },
      data: { status: "applied", appliedAt: new Date() },
    });
  });

  const updated = await prisma.planRevision.findUnique({ where: { id } });
  if (!updated) throw new Error("PlanRevision disparue après application.");
  return toPlanRevision(updated);
}

export async function rejectPlanRevision(id: number): Promise<PlanRevision> {
  const row = await prisma.planRevision.update({
    where: { id },
    data: { status: "rejected", rejectedAt: new Date() },
  });
  return toPlanRevision(row);
}
