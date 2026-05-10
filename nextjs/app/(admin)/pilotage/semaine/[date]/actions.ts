"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import {
  upsertReport,
  deleteReport,
  weekStartFromIso,
  type WeekReportInput,
} from "@/lib/reports";

const PostSchema = z.object({
  publishedAt: z.string().min(1),
  subject: z.string().min(1).max(500),
  content: z.string().min(0).max(20000),
  url: z.string().url().nullable().optional().or(z.literal("")),
  impressions: z.number().int().nonnegative().nullable().optional(),
  reactions: z.number().int().nonnegative().nullable().optional(),
  comments: z.number().int().nonnegative().nullable().optional(),
  shares: z.number().int().nonnegative().nullable().optional(),
});

const NewsletterSchema = z.object({
  publishedAt: z.string().min(1),
  subject: z.string().min(1).max(500),
  content: z.string().min(0).max(50000),
  url: z.string().url().nullable().optional().or(z.literal("")),
  emailSends: z.number().int().nonnegative().nullable().optional(),
  emailOpens: z.number().int().nonnegative().nullable().optional(),
  emailClicks: z.number().int().nonnegative().nullable().optional(),
});

const ActionSchema = z.object({
  type: z.enum(["seo-page", "seo-backlink", "seo-audit", "geo-citation", "geo-prompt", "autre"]),
  description: z.string().min(1).max(2000),
  result: z.string().nullable().optional(),
});

const ReportSchema = z.object({
  weekStart: z.string().min(1),
  notes: z.string().nullable().optional(),
  linkedinFollowers: z.number().int().nullable().optional(),
  newsletterSubscribers: z.number().int().nullable().optional(),
  seoClicks: z.number().int().nullable().optional(),
  seoImpressions: z.number().int().nullable().optional(),
  geoShareOfVoice: z.number().nullable().optional(),
  posts: z.array(PostSchema),
  newsletter: NewsletterSchema.nullable(),
  seoGeoActions: z.array(ActionSchema),
});

export async function saveReportAction(
  _prev: { ok: boolean; message?: string },
  formData: FormData
): Promise<{ ok: boolean; message?: string }> {
  await requireSession();
  const payload = formData.get("payload");
  if (typeof payload !== "string") {
    return { ok: false, message: "Payload manquant." };
  }
  let data: unknown;
  try {
    data = JSON.parse(payload);
  } catch {
    return { ok: false, message: "Payload JSON invalide." };
  }
  let parsed: WeekReportInput;
  try {
    parsed = ReportSchema.parse(data) as WeekReportInput;
  } catch (err) {
    return { ok: false, message: `Validation : ${(err as Error).message}` };
  }
  try {
    await upsertReport(parsed);
    revalidatePath("/pilotage");
    revalidatePath(`/pilotage/semaine/${parsed.weekStart.slice(0, 10)}`);
    return { ok: true, message: "Semaine enregistrée." };
  } catch (err) {
    console.error("[saveReportAction]", err);
    return { ok: false, message: `Sauvegarde impossible : ${(err as Error).message}` };
  }
}

export async function deleteReportAction(formData: FormData): Promise<void> {
  await requireSession();
  const weekStart = String(formData.get("weekStart") ?? "");
  if (!weekStart) throw new Error("weekStart manquant.");
  const date = weekStartFromIso(weekStart);
  await deleteReport(date);
  revalidatePath("/pilotage");
  redirect("/pilotage");
}
