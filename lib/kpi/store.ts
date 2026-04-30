/**
 * Couche de stockage Prisma — toutes les requêtes DB transitent ici.
 *
 * IMPORTANT : ce module est SERVER-ONLY (Server Components + API routes uniquement).
 * Le `import "server-only"` empêche l'import côté client et protège les secrets DB.
 */

import "server-only";

import { PrismaClient } from "@prisma/client";
import type { Snapshot, Period, GeoAuditPayload } from "./types";

/**
 * Forme brute d'une ligne Snapshot — calquée sur le schema Prisma.
 * On la maintient ici plutôt que de dépendre du type auto-généré
 * (qui n'existe qu'après `prisma generate`) — utile pour la CI/typecheck.
 */
interface DbSnapshot {
  id: number;
  period: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
  linkedinFollowers: number | null;
  linkedinImpressions: number | null;
  linkedinEngagementRate: number | null;
  linkedinDmsQualified: number | null;
  linkedinFormLeads: number | null;
  linkedinPostsPublished: number | null;
  nlSubscribers: number | null;
  nlOpenRate: number | null;
  nlCtrResource: number | null;
  nlUnsubscribeRate: number | null;
  nlLeadsMentioning: number | null;
  nlEditionNumber: number | null;
  seoClicks: number | null;
  seoImpressions: number | null;
  seoPagesIndexed: number | null;
  seoPagesTop10: number | null;
  seoAvgPosition: number | null;
  geoShareOfVoice: number | null;
  geoCitationsCount: number | null;
  geoReferralTraffic: number | null;
  ga4Sessions: number | null;
  ga4Users: number | null;
  ga4Conversions: number | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __pilotage_prisma: PrismaClient | undefined;
}

/** Singleton Prisma (Next.js HMR safe). */
export const prisma: PrismaClient =
  globalThis.__pilotage_prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__pilotage_prisma = prisma;
}

// =============================================================================
// Conversion DB → modèle métier
// =============================================================================
function toDomain(row: DbSnapshot): Snapshot {
  return {
    id: row.id,
    period: row.period as Period,
    modified: row.updatedAt.toISOString(),
    collectedAt: row.updatedAt.toISOString(),
    source: row.source as Snapshot["source"],
    linkedin: {
      followers: row.linkedinFollowers ?? 0,
      impressions: row.linkedinImpressions ?? 0,
      engagementRate: row.linkedinEngagementRate ?? 0,
      dmsQualified: row.linkedinDmsQualified ?? 0,
      formLeads: row.linkedinFormLeads ?? 0,
      postsPublished: row.linkedinPostsPublished ?? 0,
    },
    newsletter: {
      subscribers: row.nlSubscribers ?? 0,
      openRate: row.nlOpenRate ?? 0,
      ctrResource: row.nlCtrResource ?? 0,
      unsubscribeRate: row.nlUnsubscribeRate ?? 0,
      leadsMentioning: row.nlLeadsMentioning ?? 0,
      editionNumber: row.nlEditionNumber ?? 0,
    },
    seo: {
      clicks: row.seoClicks ?? 0,
      impressions: row.seoImpressions ?? 0,
      pagesIndexed: row.seoPagesIndexed ?? 0,
      pagesTop10: row.seoPagesTop10 ?? 0,
      avgPosition: row.seoAvgPosition ?? 0,
    },
    geo: {
      shareOfVoice: row.geoShareOfVoice ?? 0,
      citationsCount: row.geoCitationsCount ?? 0,
      referralTraffic: row.geoReferralTraffic ?? 0,
    },
    ga4: {
      sessions: row.ga4Sessions ?? 0,
      users: row.ga4Users ?? 0,
      conversions: row.ga4Conversions ?? 0,
    },
  };
}

// =============================================================================
// API publique du module
// =============================================================================

export async function listSnapshots(): Promise<Snapshot[]> {
  const rows = await prisma.snapshot.findMany({ orderBy: { period: "asc" } });
  return rows.map(toDomain);
}

export async function getSnapshot(period: Period): Promise<Snapshot | null> {
  const row = await prisma.snapshot.findUnique({ where: { period } });
  return row ? toDomain(row) : null;
}

/** Champs partiels acceptés à l'upsert. */
export type SnapshotUpsertInput = {
  period: Period;
  source?: Snapshot["source"];
  linkedin?: Partial<Snapshot["linkedin"]>;
  newsletter?: Partial<Snapshot["newsletter"]>;
  seo?: Partial<Snapshot["seo"]>;
  geo?: Partial<Snapshot["geo"]>;
  ga4?: Partial<Snapshot["ga4"]>;
};

export async function upsertSnapshot(input: SnapshotUpsertInput): Promise<Snapshot> {
  const data = {
    period: input.period,
    source: input.source ?? "manual",

    linkedinFollowers: input.linkedin?.followers,
    linkedinImpressions: input.linkedin?.impressions,
    linkedinEngagementRate: input.linkedin?.engagementRate,
    linkedinDmsQualified: input.linkedin?.dmsQualified,
    linkedinFormLeads: input.linkedin?.formLeads,
    linkedinPostsPublished: input.linkedin?.postsPublished,

    nlSubscribers: input.newsletter?.subscribers,
    nlOpenRate: input.newsletter?.openRate,
    nlCtrResource: input.newsletter?.ctrResource,
    nlUnsubscribeRate: input.newsletter?.unsubscribeRate,
    nlLeadsMentioning: input.newsletter?.leadsMentioning,
    nlEditionNumber: input.newsletter?.editionNumber,

    seoClicks: input.seo?.clicks,
    seoImpressions: input.seo?.impressions,
    seoPagesIndexed: input.seo?.pagesIndexed,
    seoPagesTop10: input.seo?.pagesTop10,
    seoAvgPosition: input.seo?.avgPosition,

    geoShareOfVoice: input.geo?.shareOfVoice,
    geoCitationsCount: input.geo?.citationsCount,
    geoReferralTraffic: input.geo?.referralTraffic,

    ga4Sessions: input.ga4?.sessions,
    ga4Users: input.ga4?.users,
    ga4Conversions: input.ga4?.conversions,
  };

  const row = await prisma.snapshot.upsert({
    where: { period: input.period },
    update: stripUndefined(data),
    create: { period: input.period, source: data.source, ...stripUndefined(data) },
  });

  return toDomain(row);
}

export async function saveGeoAuditRun(
  period: Period,
  payload: GeoAuditPayload
): Promise<void> {
  await prisma.geoAuditRun.create({
    data: {
      period,
      payload: JSON.stringify(payload),
    },
  });
}
export async function getLatestGeoAuditRun(period: Period): Promise<GeoAuditPayload | null> {
  const row = await prisma.geoAuditRun.findFirst({
    where: { period },
    orderBy: { ranAt: "desc" },
  });
  if (!row) return null;
  try {
    return JSON.parse(row.payload) as GeoAuditPayload;
  } catch {
    return null;
  }
}

// Anti-bruteforce ------------------------------------------------------------
export async function recordLoginAttempt(
  ip: string,
  email: string,
  success: boolean
): Promise<void> {
  await prisma.loginAttempt.create({ data: { ip, email, success } });
}

export async function recentFailedAttempts(ip: string, withinSec = 600): Promise<number> {
  const since = new Date(Date.now() - withinSec * 1000);
  return prisma.loginAttempt.count({
    where: { ip, success: false, createdAt: { gte: since } },
  });
}

// Helpers --------------------------------------------------------------------
function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k in obj) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}
