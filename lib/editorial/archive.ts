/**
 * Archive — bascule manuelle des semaines et items en lecture seule.
 * SERVER-ONLY.
 */

import "server-only";

import { prisma } from "@/lib/kpi/store";
import type { Prisma } from "@prisma/client";

// =============================================================================
// Archive de semaine (WeeklyTheme)
// =============================================================================

export async function archiveWeek(weekStart: Date): Promise<number> {
  // Marque tous les WeeklyTheme de cette semaine + tous les ContentItem dont plannedFor
  // tombe dans la semaine [weekStart, weekStart+7j).
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  const now = new Date();

  await prisma.weeklyTheme.updateMany({
    where: { weekStart: { gte: weekStart, lt: weekEnd }, archivedAt: null },
    data: { archivedAt: now, status: "archived" },
  });

  const items = await prisma.contentItem.updateMany({
    where: {
      plannedFor: { gte: weekStart, lt: weekEnd },
      archivedAt: null,
    },
    data: { archivedAt: now },
  });

  return items.count;
}

export async function unarchiveWeek(weekStart: Date): Promise<number> {
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  await prisma.weeklyTheme.updateMany({
    where: { weekStart: { gte: weekStart, lt: weekEnd } },
    data: { archivedAt: null, status: "active" },
  });
  const items = await prisma.contentItem.updateMany({
    where: { plannedFor: { gte: weekStart, lt: weekEnd } },
    data: { archivedAt: null },
  });
  return items.count;
}

// =============================================================================
// Archive d'item individuel
// =============================================================================

export async function archiveItem(id: number): Promise<void> {
  await prisma.contentItem.update({
    where: { id },
    data: { archivedAt: new Date() },
  });
}

export async function unarchiveItem(id: number): Promise<void> {
  await prisma.contentItem.update({
    where: { id },
    data: { archivedAt: null },
  });
}

// =============================================================================
// Listing
// =============================================================================

export async function listArchivedWeeks(): Promise<
  { weekStart: Date; theme: string | null; itemCount: number }[]
> {
  const themes = await prisma.weeklyTheme.findMany({
    where: { archivedAt: { not: null } },
    orderBy: { weekStart: "desc" },
  });

  // Compte d'items par semaine
  const result: { weekStart: Date; theme: string | null; itemCount: number }[] = [];
  for (const t of themes) {
    const weekEnd = new Date(t.weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
    const count = await prisma.contentItem.count({
      where: {
        plannedFor: { gte: t.weekStart, lt: weekEnd },
        archivedAt: { not: null },
      },
    });
    result.push({ weekStart: t.weekStart, theme: t.theme, itemCount: count });
  }
  return result;
}

const ARCHIVED_ITEM_INCLUDE = {
  hooks: { where: { selected: true }, take: 1 },
  metrics: { orderBy: { recordedAt: "desc" as const }, take: 1 },
} as const;

export type ArchivedItem = Prisma.ContentItemGetPayload<{
  include: typeof ARCHIVED_ITEM_INCLUDE;
}>;

export async function listArchivedItems(filter?: {
  source?: "platform" | "external";
  type?: string;
}): Promise<ArchivedItem[]> {
  return prisma.contentItem.findMany({
    where: {
      archivedAt: { not: null },
      ...(filter?.source ? { source: filter.source } : {}),
      ...(filter?.type ? { type: filter.type } : {}),
    },
    orderBy: { plannedFor: "desc" },
    include: ARCHIVED_ITEM_INCLUDE,
  });
}

/**
 * Crée un ContentItem externe (post LinkedIn perso, article invité...) déjà archivé.
 */
export async function createExternalItem(input: {
  type: "linkedin_post" | "newsletter_edition" | "seo_article";
  trackKey: string;
  publishedAt: Date;
  subject: string;
  publishedUrl?: string;
  finalBody?: string;
}): Promise<{ id: number; slug: string }> {
  const slugBase = input.subject
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const ts = input.publishedAt.toISOString().slice(0, 10);
  const slug = `ext-${ts}-${slugBase}`.slice(0, 80);

  const created = await prisma.contentItem.create({
    data: {
      slug,
      type: input.type,
      trackKey: input.trackKey,
      plannedFor: input.publishedAt,
      publishedAt: input.publishedAt,
      status: "published",
      subject: input.subject,
      finalSubject: input.subject,
      brief: "(post externe importé)",
      finalBody: input.finalBody ?? null,
      publishedUrl: input.publishedUrl ?? null,
      source: "external",
      archivedAt: new Date(),
    },
  });
  return { id: created.id, slug: created.slug };
}
