/**
 * Suivi de performances marketing — CRUD WeekReport et nested.
 * SERVER-ONLY.
 */

import "server-only";

import { prisma } from "./db";

// =============================================================================
// Types métier (sérialisables → ISO strings)
// =============================================================================

export interface WeekPostInput {
  publishedAt: string;     // ISO date
  subject: string;
  content: string;
  url?: string | null;
  impressions?: number | null;
  reactions?: number | null;
  comments?: number | null;
  shares?: number | null;
}

export interface WeekNewsletterInput {
  publishedAt: string;
  subject: string;
  content: string;
  url?: string | null;
  emailSends?: number | null;
  emailOpens?: number | null;
  emailClicks?: number | null;
}

export type SeoGeoActionType =
  | "seo-page"
  | "seo-backlink"
  | "seo-audit"
  | "geo-citation"
  | "geo-prompt"
  | "autre";

export interface SeoGeoActionInput {
  type: SeoGeoActionType;
  description: string;
  result?: string | null;
}

export interface WeekReportInput {
  weekStart: string; // ISO Monday 00:00 UTC
  notes?: string | null;
  linkedinFollowers?: number | null;
  newsletterSubscribers?: number | null;
  seoClicks?: number | null;
  seoImpressions?: number | null;
  geoShareOfVoice?: number | null;
  posts: WeekPostInput[];
  newsletter: WeekNewsletterInput | null;
  seoGeoActions: SeoGeoActionInput[];
}

export interface WeekReportFull {
  id: number;
  weekStart: string;
  notes: string | null;
  linkedinFollowers: number | null;
  newsletterSubscribers: number | null;
  seoClicks: number | null;
  seoImpressions: number | null;
  geoShareOfVoice: number | null;
  posts: (WeekPostInput & { id: number })[];
  newsletter: (WeekNewsletterInput & { id: number }) | null;
  seoGeoActions: (SeoGeoActionInput & { id: number })[];
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Helpers de date
// =============================================================================

export function weekStartOf(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const offset = (day + 6) % 7; // ISO : Lundi = 0
  d.setUTCDate(d.getUTCDate() - offset);
  return d;
}

export function weekStartFromIso(iso: string): Date {
  const d = new Date(iso);
  if (isNaN(d.getTime())) throw new Error(`Date invalide : "${iso}"`);
  return weekStartOf(d);
}

export function fmtWeekKey(date: Date): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

// =============================================================================
// Mapping DB → métier
// =============================================================================

interface DbWeekReport {
  id: number;
  weekStart: Date;
  notes: string | null;
  linkedinFollowers: number | null;
  newsletterSubscribers: number | null;
  seoClicks: number | null;
  seoImpressions: number | null;
  geoShareOfVoice: number | null;
  createdAt: Date;
  updatedAt: Date;
  posts: {
    id: number;
    publishedAt: Date;
    subject: string;
    content: string;
    url: string | null;
    impressions: number | null;
    reactions: number | null;
    comments: number | null;
    shares: number | null;
  }[];
  newsletter: {
    id: number;
    publishedAt: Date;
    subject: string;
    content: string;
    url: string | null;
    emailSends: number | null;
    emailOpens: number | null;
    emailClicks: number | null;
  } | null;
  seoGeoActions: {
    id: number;
    type: string;
    description: string;
    result: string | null;
  }[];
}

function toWeekReportFull(row: DbWeekReport): WeekReportFull {
  return {
    id: row.id,
    weekStart: row.weekStart.toISOString(),
    notes: row.notes,
    linkedinFollowers: row.linkedinFollowers,
    newsletterSubscribers: row.newsletterSubscribers,
    seoClicks: row.seoClicks,
    seoImpressions: row.seoImpressions,
    geoShareOfVoice: row.geoShareOfVoice,
    posts: row.posts.map((p) => ({
      id: p.id,
      publishedAt: p.publishedAt.toISOString(),
      subject: p.subject,
      content: p.content,
      url: p.url,
      impressions: p.impressions,
      reactions: p.reactions,
      comments: p.comments,
      shares: p.shares,
    })),
    newsletter: row.newsletter
      ? {
          id: row.newsletter.id,
          publishedAt: row.newsletter.publishedAt.toISOString(),
          subject: row.newsletter.subject,
          content: row.newsletter.content,
          url: row.newsletter.url,
          emailSends: row.newsletter.emailSends,
          emailOpens: row.newsletter.emailOpens,
          emailClicks: row.newsletter.emailClicks,
        }
      : null,
    seoGeoActions: row.seoGeoActions.map((a) => ({
      id: a.id,
      type: a.type as SeoGeoActionType,
      description: a.description,
      result: a.result,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// =============================================================================
// CRUD
// =============================================================================

export async function getReportByWeek(weekStart: Date): Promise<WeekReportFull | null> {
  const row = await prisma.weekReport.findUnique({
    where: { weekStart },
    include: {
      posts: { orderBy: { publishedAt: "asc" } },
      newsletter: true,
      seoGeoActions: { orderBy: { createdAt: "asc" } },
    },
  });
  return row ? toWeekReportFull(row as DbWeekReport) : null;
}

export async function listRecentReports(limit = 4): Promise<WeekReportFull[]> {
  const rows = await prisma.weekReport.findMany({
    orderBy: { weekStart: "desc" },
    take: limit,
    include: {
      posts: { orderBy: { publishedAt: "asc" } },
      newsletter: true,
      seoGeoActions: { orderBy: { createdAt: "asc" } },
    },
  });
  return rows.map((r: unknown) => toWeekReportFull(r as DbWeekReport));
}

/**
 * Upsert complet : crée la WeekReport si absente, remplace TOUS les
 * children (posts, newsletter, actions) par ceux de l'input.
 */
export async function upsertReport(input: WeekReportInput): Promise<WeekReportFull> {
  const weekStart = weekStartFromIso(input.weekStart);

  return await prisma.$transaction(async (tx) => {
    // Upsert du report
    const report = await tx.weekReport.upsert({
      where: { weekStart },
      update: {
        notes: input.notes ?? null,
        linkedinFollowers: input.linkedinFollowers ?? null,
        newsletterSubscribers: input.newsletterSubscribers ?? null,
        seoClicks: input.seoClicks ?? null,
        seoImpressions: input.seoImpressions ?? null,
        geoShareOfVoice: input.geoShareOfVoice ?? null,
      },
      create: {
        weekStart,
        notes: input.notes ?? null,
        linkedinFollowers: input.linkedinFollowers ?? null,
        newsletterSubscribers: input.newsletterSubscribers ?? null,
        seoClicks: input.seoClicks ?? null,
        seoImpressions: input.seoImpressions ?? null,
        geoShareOfVoice: input.geoShareOfVoice ?? null,
      },
    });

    // Reset & re-create posts
    await tx.weekPost.deleteMany({ where: { weekReportId: report.id } });
    if (input.posts.length > 0) {
      await tx.weekPost.createMany({
        data: input.posts.map((p) => ({
          weekReportId: report.id,
          publishedAt: new Date(p.publishedAt),
          subject: p.subject,
          content: p.content,
          url: p.url ?? null,
          impressions: p.impressions ?? null,
          reactions: p.reactions ?? null,
          comments: p.comments ?? null,
          shares: p.shares ?? null,
        })),
      });
    }

    // Reset & re-create newsletter
    await tx.weekNewsletter.deleteMany({ where: { weekReportId: report.id } });
    if (input.newsletter) {
      await tx.weekNewsletter.create({
        data: {
          weekReportId: report.id,
          publishedAt: new Date(input.newsletter.publishedAt),
          subject: input.newsletter.subject,
          content: input.newsletter.content,
          url: input.newsletter.url ?? null,
          emailSends: input.newsletter.emailSends ?? null,
          emailOpens: input.newsletter.emailOpens ?? null,
          emailClicks: input.newsletter.emailClicks ?? null,
        },
      });
    }

    // Reset & re-create seoGeoActions
    await tx.seoGeoAction.deleteMany({ where: { weekReportId: report.id } });
    if (input.seoGeoActions.length > 0) {
      await tx.seoGeoAction.createMany({
        data: input.seoGeoActions.map((a) => ({
          weekReportId: report.id,
          type: a.type,
          description: a.description,
          result: a.result ?? null,
        })),
      });
    }

    // Re-fetch
    const refreshed = await tx.weekReport.findUnique({
      where: { id: report.id },
      include: {
        posts: { orderBy: { publishedAt: "asc" } },
        newsletter: true,
        seoGeoActions: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!refreshed) throw new Error("WeekReport disparue après upsert.");
    return toWeekReportFull(refreshed as DbWeekReport);
  });
}

export async function deleteReport(weekStart: Date): Promise<void> {
  await prisma.weekReport.delete({ where: { weekStart } });
}
