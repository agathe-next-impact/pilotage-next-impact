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
} from "./types";

// =============================================================================
// Mapping DB → Domain
// =============================================================================

interface DbContentItem {
  id: number;
  slug: string;
  type: string;
  trackKey: string;
  plannedFor: Date;
  status: string;
  subject: string;
  brief: string;
  draft: string | null;
  finalBody: string | null;
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
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function toContentItem(row: DbContentItem): ContentItem {
  return {
    id: row.id,
    slug: row.slug,
    type: row.type as ContentType,
    trackKey: row.trackKey,
    plannedFor: row.plannedFor.toISOString(),
    status: row.status as ContentStatus,
    subject: row.subject,
    brief: row.brief,
    draft: row.draft,
    finalBody: row.finalBody,
    generatedModel: row.generatedModel,
    generatedAt: row.generatedAt ? row.generatedAt.toISOString() : null,
    validatedAt: row.validatedAt ? row.validatedAt.toISOString() : null,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    meta: safeJsonParse<Record<string, unknown>>(row.meta),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toContentRevision(row: DbContentRevision): ContentRevision {
  return {
    id: row.id,
    contentId: row.contentId,
    payload: (safeJsonParse<GeneratedDraft>(row.payload) ?? {
      subject: "",
      body: "",
      selfReview: "",
      model: "",
      prompt: "",
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
      rationale: "",
      perfSummary: "",
      changes: [],
    }) as PlanRevisionPayload,
    model: row.model,
    createdAt: row.createdAt.toISOString(),
    appliedAt: row.appliedAt ? row.appliedAt.toISOString() : null,
    rejectedAt: row.rejectedAt ? row.rejectedAt.toISOString() : null,
  };
}

// =============================================================================
// ContentItem queries
// =============================================================================

export async function listContentItems(filter?: {
  type?: ContentType;
  status?: ContentStatus;
}): Promise<ContentItem[]> {
  const rows = await prisma.contentItem.findMany({
    where: {
      ...(filter?.type ? { type: filter.type } : {}),
      ...(filter?.status ? { status: filter.status } : {}),
    },
    orderBy: { plannedFor: "asc" },
  });
  return rows.map(toContentItem);
}

export async function getContentItem(id: number): Promise<ContentItem | null> {
  const row = await prisma.contentItem.findUnique({ where: { id } });
  return row ? toContentItem(row) : null;
}

export async function getContentItemBySlug(slug: string): Promise<ContentItem | null> {
  const row = await prisma.contentItem.findUnique({ where: { slug } });
  return row ? toContentItem(row) : null;
}

export async function attachDraft(
  id: number,
  draft: GeneratedDraft
): Promise<ContentItem> {
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

export async function validateContent(
  id: number,
  finalBody: string
): Promise<ContentItem> {
  const row = await prisma.contentItem.update({
    where: { id },
    data: {
      finalBody,
      status: "validated",
      validatedAt: new Date(),
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

export async function listRevisions(contentId: number): Promise<ContentRevision[]> {
  const rows = await prisma.contentRevision.findMany({
    where: { contentId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toContentRevision);
}

// =============================================================================
// PlanRevision queries
// =============================================================================

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

  // Applique chaque change atomiquement.
  // (tx typé `any` car le client Prisma est généré au postinstall — voir lib/kpi/store.ts)
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
