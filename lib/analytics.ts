/**
 * Agrégations / stats sur les WeekReport pour les graphiques et tableaux.
 * SERVER-ONLY.
 */

import "server-only";

import { prisma } from "./db";

export interface KpiPoint {
  weekStart: string;     // ISO
  weekLabel: string;     // "S 12" / "16 mars"
  linkedinFollowers: number | null;
  newsletterSubscribers: number | null;
  seoClicks: number | null;
  seoImpressions: number | null;
  geoShareOfVoice: number | null;
}

export interface WeeklyEngagementPoint {
  weekStart: string;
  weekLabel: string;
  linkedin: number;
  newsletter: number;
  seoActions: number;
  total: number;
}

export interface PostDistributionSlice {
  label: string;
  count: number;
}

export interface CalendarDay {
  date: string;       // YYYY-MM-DD
  dayOfMonth: number;
  weekday: number;    // 0 = lundi
  hasPost: boolean;
  hasNewsletter: boolean;
  hasAction: boolean;
  intensity: number;  // 0-3 selon densité d'activité
}

export interface TopPost {
  id: number;
  weekStart: string;
  publishedAt: string;
  subject: string;
  url: string | null;
  reactions: number;
  comments: number;
  shares: number;
  engagement: number;
}

function fmtWeekShort(d: Date): string {
  // Numéro de semaine ISO (approx)
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const days = Math.floor((d.getTime() - start.getTime()) / 86400000);
  const week = Math.ceil((days + start.getUTCDay() + 1) / 7);
  return `S${week}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// =============================================================================
// Évolution des KPIs (n dernières semaines)
// =============================================================================

export async function kpiSeries(weeks = 12): Promise<KpiPoint[]> {
  const reports = await prisma.weekReport.findMany({
    orderBy: { weekStart: "desc" },
    take: weeks,
  });
  return reports
    .map((r) => ({
      weekStart: r.weekStart.toISOString(),
      weekLabel: fmtWeekShort(r.weekStart),
      linkedinFollowers: r.linkedinFollowers,
      newsletterSubscribers: r.newsletterSubscribers,
      seoClicks: r.seoClicks,
      seoImpressions: r.seoImpressions,
      geoShareOfVoice: r.geoShareOfVoice,
    }))
    .reverse(); // ordre chronologique pour l'affichage
}

// =============================================================================
// Engagement par semaine (bar chart)
// =============================================================================

export async function weeklyEngagement(weeks = 12): Promise<WeeklyEngagementPoint[]> {
  const reports = await prisma.weekReport.findMany({
    orderBy: { weekStart: "desc" },
    take: weeks,
    include: {
      posts: true,
      newsletter: true,
      seoGeoActions: true,
    },
  });

  return reports
    .map((r) => {
      const linkedin = r.posts.reduce(
        (sum, p) =>
          sum + (p.reactions ?? 0) + (p.comments ?? 0) + (p.shares ?? 0),
        0
      );
      const newsletter = r.newsletter
        ? (r.newsletter.emailOpens ?? 0) + (r.newsletter.emailClicks ?? 0)
        : 0;
      const seoActions = r.seoGeoActions.length;
      return {
        weekStart: r.weekStart.toISOString(),
        weekLabel: fmtWeekShort(r.weekStart),
        linkedin,
        newsletter,
        seoActions,
        total: linkedin + newsletter,
      };
    })
    .reverse();
}

// =============================================================================
// Distribution des posts (camembert)
// =============================================================================

export async function postsDistribution(): Promise<PostDistributionSlice[]> {
  const [linkedinCount, newsletterCount, actionsCount] = await Promise.all([
    prisma.weekPost.count(),
    prisma.weekNewsletter.count(),
    prisma.seoGeoAction.count(),
  ]);
  const slices: PostDistributionSlice[] = [];
  if (linkedinCount > 0) slices.push({ label: "Posts LinkedIn", count: linkedinCount });
  if (newsletterCount > 0) slices.push({ label: "Newsletters", count: newsletterCount });
  if (actionsCount > 0) slices.push({ label: "Actions SEO/GEO", count: actionsCount });
  return slices;
}

// =============================================================================
// Calendrier heatmap (90 derniers jours)
// =============================================================================

export async function calendarHeatmap(days = 90): Promise<CalendarDay[]> {
  const now = new Date();
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - days + 1);
  start.setUTCHours(0, 0, 0, 0);

  // On charge tous les WeekReport qui chevauchent la fenêtre
  const reports = await prisma.weekReport.findMany({
    where: { weekStart: { gte: new Date(start.getTime() - 7 * 86400000) } },
    include: {
      posts: { select: { publishedAt: true } },
      newsletter: { select: { publishedAt: true } },
      seoGeoActions: { select: { createdAt: true } },
    },
  });

  // Index par date YYYY-MM-DD
  const map = new Map<string, { posts: number; newsletter: boolean; actions: number }>();
  for (const r of reports) {
    for (const p of r.posts) {
      const key = p.publishedAt.toISOString().slice(0, 10);
      const cur = map.get(key) ?? { posts: 0, newsletter: false, actions: 0 };
      cur.posts++;
      map.set(key, cur);
    }
    if (r.newsletter) {
      const key = r.newsletter.publishedAt.toISOString().slice(0, 10);
      const cur = map.get(key) ?? { posts: 0, newsletter: false, actions: 0 };
      cur.newsletter = true;
      map.set(key, cur);
    }
    for (const a of r.seoGeoActions) {
      const key = a.createdAt.toISOString().slice(0, 10);
      const cur = map.get(key) ?? { posts: 0, newsletter: false, actions: 0 };
      cur.actions++;
      map.set(key, cur);
    }
  }

  // Génère les `days` derniers jours
  const out: CalendarDay[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const key = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
    const m = map.get(key);
    const total = (m?.posts ?? 0) + (m?.newsletter ? 1 : 0) + (m?.actions ?? 0);
    const intensity = Math.min(3, total);
    out.push({
      date: key,
      dayOfMonth: d.getUTCDate(),
      weekday: (d.getUTCDay() + 6) % 7, // 0 = lundi
      hasPost: (m?.posts ?? 0) > 0,
      hasNewsletter: !!m?.newsletter,
      hasAction: (m?.actions ?? 0) > 0,
      intensity,
    });
  }
  return out;
}

// =============================================================================
// Top N posts par engagement (toutes périodes)
// =============================================================================

export async function topPosts(limit = 3): Promise<TopPost[]> {
  const posts = await prisma.weekPost.findMany({
    include: { weekReport: { select: { weekStart: true } } },
  });
  const enriched: TopPost[] = posts.map((p) => ({
    id: p.id,
    weekStart: p.weekReport.weekStart.toISOString(),
    publishedAt: p.publishedAt.toISOString(),
    subject: p.subject,
    url: p.url,
    reactions: p.reactions ?? 0,
    comments: p.comments ?? 0,
    shares: p.shares ?? 0,
    engagement: (p.reactions ?? 0) + (p.comments ?? 0) + (p.shares ?? 0),
  }));
  enriched.sort((a, b) => b.engagement - a.engagement);
  return enriched.slice(0, limit);
}

// =============================================================================
// Snapshot pour la synthèse Claude
// =============================================================================

export async function monthSnapshot(period: string): Promise<{
  period: string;
  start: string;
  end: string;
  reports: Array<{
    weekStart: string;
    notes: string | null;
    linkedinFollowers: number | null;
    newsletterSubscribers: number | null;
    seoClicks: number | null;
    seoImpressions: number | null;
    geoShareOfVoice: number | null;
    postsCount: number;
    postsEngagement: number;
    newsletter: { subject: string; opens: number | null; clicks: number | null } | null;
    actions: Array<{ type: string; description: string; result: string | null }>;
  }>;
  totals: { posts: number; newsletters: number; actions: number; engagement: number };
}> {
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (!m) throw new Error(`Format period invalide : "${period}". Attendu YYYY-MM.`);
  const year = parseInt(m[1] ?? "0", 10);
  const month = parseInt(m[2] ?? "0", 10);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const reports = await prisma.weekReport.findMany({
    where: { weekStart: { gte: start, lt: end } },
    orderBy: { weekStart: "asc" },
    include: { posts: true, newsletter: true, seoGeoActions: true },
  });

  let totalPosts = 0;
  let totalNewsletters = 0;
  let totalActions = 0;
  let totalEngagement = 0;
  const reportSummaries = reports.map((r) => {
    const postsEngagement = r.posts.reduce(
      (s, p) => s + (p.reactions ?? 0) + (p.comments ?? 0) + (p.shares ?? 0),
      0
    );
    totalPosts += r.posts.length;
    if (r.newsletter) totalNewsletters++;
    totalActions += r.seoGeoActions.length;
    totalEngagement += postsEngagement;
    return {
      weekStart: r.weekStart.toISOString(),
      notes: r.notes,
      linkedinFollowers: r.linkedinFollowers,
      newsletterSubscribers: r.newsletterSubscribers,
      seoClicks: r.seoClicks,
      seoImpressions: r.seoImpressions,
      geoShareOfVoice: r.geoShareOfVoice,
      postsCount: r.posts.length,
      postsEngagement,
      newsletter: r.newsletter
        ? {
            subject: r.newsletter.subject,
            opens: r.newsletter.emailOpens,
            clicks: r.newsletter.emailClicks,
          }
        : null,
      actions: r.seoGeoActions.map((a) => ({
        type: a.type,
        description: a.description,
        result: a.result,
      })),
    };
  });

  return {
    period,
    start: start.toISOString(),
    end: end.toISOString(),
    reports: reportSummaries,
    totals: {
      posts: totalPosts,
      newsletters: totalNewsletters,
      actions: totalActions,
      engagement: totalEngagement,
    },
  };
}
