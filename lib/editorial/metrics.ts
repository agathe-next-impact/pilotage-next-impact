/**
 * Métriques par ContentItem — saisie + agrégations + croisements.
 * SERVER-ONLY.
 */

import "server-only";

import { prisma } from "@/lib/kpi/store";

export interface ContentMetric {
  id: number;
  contentId: number;
  recordedAt: string;
  impressions: number | null;
  engagementCount: number | null;
  conversions: number | null;
  engagementRate: number | null;
  notes: string | null;
  source: string;
  createdAt: string;
}

interface DbContentMetric {
  id: number;
  contentId: number;
  recordedAt: Date;
  impressions: number | null;
  engagementCount: number | null;
  conversions: number | null;
  engagementRate: number | null;
  notes: string | null;
  source: string;
  createdAt: Date;
}

function toMetric(row: DbContentMetric): ContentMetric {
  return {
    id: row.id,
    contentId: row.contentId,
    recordedAt: row.recordedAt.toISOString(),
    impressions: row.impressions,
    engagementCount: row.engagementCount,
    conversions: row.conversions,
    engagementRate: row.engagementRate,
    notes: row.notes,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function recordMetric(input: {
  contentId: number;
  impressions?: number;
  engagementCount?: number;
  conversions?: number;
  notes?: string;
  source?: string;
}): Promise<ContentMetric> {
  const rate =
    input.impressions && input.impressions > 0 && input.engagementCount !== undefined
      ? (input.engagementCount / input.impressions) * 100
      : null;

  const row = await prisma.contentMetric.create({
    data: {
      contentId: input.contentId,
      impressions: input.impressions ?? null,
      engagementCount: input.engagementCount ?? null,
      conversions: input.conversions ?? null,
      engagementRate: rate,
      notes: input.notes ?? null,
      source: input.source ?? "manual",
    },
  });
  return toMetric(row);
}

export async function getLatestMetric(contentId: number): Promise<ContentMetric | null> {
  const row = await prisma.contentMetric.findFirst({
    where: { contentId },
    orderBy: { recordedAt: "desc" },
  });
  return row ? toMetric(row) : null;
}

export async function getMetricsHistory(contentId: number): Promise<ContentMetric[]> {
  const rows = await prisma.contentMetric.findMany({
    where: { contentId },
    orderBy: { recordedAt: "asc" },
  });
  return rows.map(toMetric);
}

export async function deleteMetric(id: number): Promise<void> {
  await prisma.contentMetric.delete({ where: { id } });
}

// =============================================================================
// Agrégations & croisements
// =============================================================================

export interface PostSummary {
  id: number;
  slug: string;
  type: string;
  trackKey: string;
  subject: string;
  publishedAt: string | null;
  publishedUrl: string | null;
  source: string;
  selectedHook: string | null;
  hookPattern: string | null;
  impressions: number | null;
  engagementCount: number | null;
  conversions: number | null;
  engagementRate: number | null;
}

async function buildSummaries(items: Array<{
  id: number;
  slug: string;
  type: string;
  trackKey: string;
  subject: string;
  publishedAt: Date | null;
  publishedUrl: string | null;
  source: string;
  hooks?: { hook: string; pattern: string }[];
  metrics?: DbContentMetric[];
}>): Promise<PostSummary[]> {
  return items.map((it) => {
    const m = it.metrics?.[0];
    const h = it.hooks?.[0];
    return {
      id: it.id,
      slug: it.slug,
      type: it.type,
      trackKey: it.trackKey,
      subject: it.subject,
      publishedAt: it.publishedAt?.toISOString() ?? null,
      publishedUrl: it.publishedUrl,
      source: it.source,
      selectedHook: h?.hook ?? null,
      hookPattern: h?.pattern ?? null,
      impressions: m?.impressions ?? null,
      engagementCount: m?.engagementCount ?? null,
      conversions: m?.conversions ?? null,
      engagementRate: m?.engagementRate ?? null,
    };
  });
}

export async function topPostsByEngagement(
  limit: number = 10,
  filter?: { type?: string; since?: Date }
): Promise<PostSummary[]> {
  const items = await prisma.contentItem.findMany({
    where: {
      status: "published",
      ...(filter?.type ? { type: filter.type } : {}),
      ...(filter?.since ? { publishedAt: { gte: filter.since } } : {}),
    },
    include: {
      hooks: { where: { selected: true }, take: 1 },
      metrics: { orderBy: { recordedAt: "desc" }, take: 1 },
    },
  });

  const summaries = await buildSummaries(items);
  // Tri par engagementCount décroissant (null en bas)
  summaries.sort((a, b) => {
    const av = a.engagementCount ?? -1;
    const bv = b.engagementCount ?? -1;
    return bv - av;
  });
  return summaries.slice(0, limit);
}

export interface CrossTab {
  key: string;
  label: string;
  postCount: number;
  totalImpressions: number;
  totalEngagement: number;
  totalConversions: number;
  avgEngagementRate: number | null;
}

export async function crossByTrackKey(
  type?: string,
  since?: Date
): Promise<CrossTab[]> {
  const items = await prisma.contentItem.findMany({
    where: {
      status: "published",
      ...(type ? { type } : {}),
      ...(since ? { publishedAt: { gte: since } } : {}),
    },
    include: {
      metrics: { orderBy: { recordedAt: "desc" }, take: 1 },
    },
  });

  const map = new Map<string, CrossTab>();
  for (const it of items) {
    const m = it.metrics?.[0];
    const key = it.trackKey;
    let bucket = map.get(key);
    if (!bucket) {
      bucket = {
        key,
        label: key,
        postCount: 0,
        totalImpressions: 0,
        totalEngagement: 0,
        totalConversions: 0,
        avgEngagementRate: null,
      };
      map.set(key, bucket);
    }
    bucket.postCount++;
    bucket.totalImpressions += m?.impressions ?? 0;
    bucket.totalEngagement += m?.engagementCount ?? 0;
    bucket.totalConversions += m?.conversions ?? 0;
  }

  for (const bucket of map.values()) {
    bucket.avgEngagementRate =
      bucket.totalImpressions > 0
        ? (bucket.totalEngagement / bucket.totalImpressions) * 100
        : null;
  }

  return [...map.values()].sort((a, b) => b.totalEngagement - a.totalEngagement);
}

export async function crossByHookPattern(
  type?: string,
  since?: Date
): Promise<CrossTab[]> {
  const items = await prisma.contentItem.findMany({
    where: {
      status: "published",
      ...(type ? { type } : {}),
      ...(since ? { publishedAt: { gte: since } } : {}),
    },
    include: {
      hooks: { where: { selected: true }, take: 1 },
      metrics: { orderBy: { recordedAt: "desc" }, take: 1 },
    },
  });

  const map = new Map<string, CrossTab>();
  for (const it of items) {
    const m = it.metrics?.[0];
    const h = it.hooks?.[0];
    const key = h?.pattern ?? "(sans hook)";
    let bucket = map.get(key);
    if (!bucket) {
      bucket = {
        key,
        label: key,
        postCount: 0,
        totalImpressions: 0,
        totalEngagement: 0,
        totalConversions: 0,
        avgEngagementRate: null,
      };
      map.set(key, bucket);
    }
    bucket.postCount++;
    bucket.totalImpressions += m?.impressions ?? 0;
    bucket.totalEngagement += m?.engagementCount ?? 0;
    bucket.totalConversions += m?.conversions ?? 0;
  }

  for (const bucket of map.values()) {
    bucket.avgEngagementRate =
      bucket.totalImpressions > 0
        ? (bucket.totalEngagement / bucket.totalImpressions) * 100
        : null;
  }

  return [...map.values()].sort((a, b) => (b.avgEngagementRate ?? 0) - (a.avgEngagementRate ?? 0));
}

// =============================================================================
// Stats mensuelles consolidées
// =============================================================================

export interface MonthlyStats {
  period: string;            // "YYYY-MM"
  start: string;             // ISO
  end: string;               // ISO
  byType: {
    linkedin_post: { count: number; impressions: number; engagement: number; conversions: number; engagementRate: number | null };
    newsletter_edition: { count: number; impressions: number; engagement: number; conversions: number; engagementRate: number | null };
    seo_article: { count: number; impressions: number; engagement: number; conversions: number; engagementRate: number | null };
  };
  total: {
    count: number;
    impressions: number;
    engagement: number;
    conversions: number;
  };
}

/**
 * Agrège tous les ContentItem publiés sur la période YYYY-MM (UTC).
 * Pour chaque type : compteur + somme des dernières métriques + taux pondéré.
 */
export async function monthlyStats(period: string): Promise<MonthlyStats> {
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (!m) throw new Error(`Format period invalide : "${period}". Attendu YYYY-MM.`);
  const year = parseInt(m[1] ?? "0", 10);
  const month = parseInt(m[2] ?? "0", 10);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const items = await prisma.contentItem.findMany({
    where: {
      status: "published",
      publishedAt: { gte: start, lt: end },
    },
    include: {
      metrics: { orderBy: { recordedAt: "desc" }, take: 1 },
    },
  });

  const buckets = {
    linkedin_post:      { count: 0, impressions: 0, engagement: 0, conversions: 0 },
    newsletter_edition: { count: 0, impressions: 0, engagement: 0, conversions: 0 },
    seo_article:        { count: 0, impressions: 0, engagement: 0, conversions: 0 },
  };

  for (const it of items) {
    const k = it.type as keyof typeof buckets;
    if (!buckets[k]) continue;
    buckets[k].count++;
    const lastMetric = (it as { metrics?: { impressions: number | null; engagementCount: number | null; conversions: number | null }[] }).metrics?.[0];
    if (lastMetric) {
      buckets[k].impressions += lastMetric.impressions ?? 0;
      buckets[k].engagement += lastMetric.engagementCount ?? 0;
      buckets[k].conversions += lastMetric.conversions ?? 0;
    }
  }

  function withRate(b: { count: number; impressions: number; engagement: number; conversions: number }) {
    return {
      ...b,
      engagementRate: b.impressions > 0 ? (b.engagement / b.impressions) * 100 : null,
    };
  }

  const total = {
    count: buckets.linkedin_post.count + buckets.newsletter_edition.count + buckets.seo_article.count,
    impressions: buckets.linkedin_post.impressions + buckets.newsletter_edition.impressions + buckets.seo_article.impressions,
    engagement: buckets.linkedin_post.engagement + buckets.newsletter_edition.engagement + buckets.seo_article.engagement,
    conversions: buckets.linkedin_post.conversions + buckets.newsletter_edition.conversions + buckets.seo_article.conversions,
  };

  return {
    period,
    start: start.toISOString(),
    end: end.toISOString(),
    byType: {
      linkedin_post: withRate(buckets.linkedin_post),
      newsletter_edition: withRate(buckets.newsletter_edition),
      seo_article: withRate(buckets.seo_article),
    },
    total,
  };
}
