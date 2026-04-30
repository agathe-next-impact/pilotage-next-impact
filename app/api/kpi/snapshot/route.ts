/**
 * POST /api/kpi/snapshot  → upsert un snapshot (admin uniquement).
 *
 * Body :
 * {
 *   period: "2026-04",
 *   linkedin?: { followers, impressions, ... },
 *   newsletter?: { ... },
 *   seo?: { ... },
 *   geo?: { ... },
 *   ga4?: { ... },
 *   source?: "manual" | "gsc" | "ga4" | "geo-audit"
 * }
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { upsertSnapshot } from "@/lib/kpi/store";

const PeriodSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Format YYYY-MM");

const Body = z.object({
  period: PeriodSchema,
  source: z.enum(["manual", "gsc", "ga4", "geo-audit", "ga4+gsc"]).optional(),
  linkedin: z.object({
    followers: z.number().int().nonnegative().optional(),
    impressions: z.number().int().nonnegative().optional(),
    engagementRate: z.number().min(0).max(1).optional(),
    dmsQualified: z.number().int().nonnegative().optional(),
    formLeads: z.number().int().nonnegative().optional(),
    postsPublished: z.number().int().nonnegative().optional(),
  }).partial().optional(),
  newsletter: z.object({
    subscribers: z.number().int().nonnegative().optional(),
    openRate: z.number().min(0).max(1).optional(),
    ctrResource: z.number().min(0).max(1).optional(),
    unsubscribeRate: z.number().min(0).max(1).optional(),
    leadsMentioning: z.number().int().nonnegative().optional(),
    editionNumber: z.number().int().min(1).max(12).optional(),
  }).partial().optional(),
  seo: z.object({
    clicks: z.number().int().nonnegative().optional(),
    impressions: z.number().int().nonnegative().optional(),
    pagesIndexed: z.number().int().nonnegative().optional(),
    pagesTop10: z.number().int().nonnegative().optional(),
    avgPosition: z.number().min(0).optional(),
  }).partial().optional(),
  geo: z.object({
    shareOfVoice: z.number().min(0).max(1).optional(),
    citationsCount: z.number().int().nonnegative().optional(),
    referralTraffic: z.number().int().nonnegative().optional(),
  }).partial().optional(),
  ga4: z.object({
    sessions: z.number().int().nonnegative().optional(),
    users: z.number().int().nonnegative().optional(),
    conversions: z.number().int().nonnegative().optional(),
  }).partial().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", details: parsed.error.flatten() }, { status: 400 });
  }

  const snapshot = await upsertSnapshot(parsed.data as Parameters<typeof upsertSnapshot>[0]);
  return NextResponse.json({ snapshot });
}
