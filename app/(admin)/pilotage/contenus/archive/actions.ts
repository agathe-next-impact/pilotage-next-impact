"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import {
  archiveWeek,
  unarchiveWeek,
  archiveItem,
  unarchiveItem,
  createExternalItem,
} from "@/lib/editorial/archive";
import { recordMetric, deleteMetric } from "@/lib/editorial/metrics";
import { generateMonthlyAnalysis } from "@/lib/editorial/analysis";

const WeekSchema = z.object({ weekStart: z.coerce.date() });

export async function archiveWeekAction(formData: FormData): Promise<void> {
  await requireSession();
  const { weekStart } = WeekSchema.parse({ weekStart: formData.get("weekStart") });
  await archiveWeek(weekStart);
  revalidatePath("/pilotage/contenus/planning");
  revalidatePath("/pilotage/contenus/archive");
}

export async function unarchiveWeekAction(formData: FormData): Promise<void> {
  await requireSession();
  const { weekStart } = WeekSchema.parse({ weekStart: formData.get("weekStart") });
  await unarchiveWeek(weekStart);
  revalidatePath("/pilotage/contenus/planning");
  revalidatePath("/pilotage/contenus/archive");
}

const IdSchema = z.object({ id: z.coerce.number().int().positive() });

export async function archiveItemAction(formData: FormData): Promise<void> {
  await requireSession();
  const { id } = IdSchema.parse({ id: formData.get("id") });
  await archiveItem(id);
  revalidatePath("/pilotage/contenus");
  revalidatePath("/pilotage/contenus/archive");
}

export async function unarchiveItemAction(formData: FormData): Promise<void> {
  await requireSession();
  const { id } = IdSchema.parse({ id: formData.get("id") });
  await unarchiveItem(id);
  revalidatePath("/pilotage/contenus/archive");
}

const ExternalSchema = z.object({
  type: z.enum(["linkedin_post", "newsletter_edition", "seo_article"]),
  trackKey: z.string().min(1),
  publishedAt: z.coerce.date(),
  subject: z.string().min(3).max(300),
  publishedUrl: z.string().url().optional().or(z.literal("")),
  finalBody: z.string().optional(),
});

export async function createExternalItemAction(formData: FormData): Promise<void> {
  await requireSession();
  const parsed = ExternalSchema.parse({
    type: formData.get("type"),
    trackKey: formData.get("trackKey"),
    publishedAt: formData.get("publishedAt"),
    subject: String(formData.get("subject") ?? "").trim(),
    publishedUrl: String(formData.get("publishedUrl") ?? "").trim() || undefined,
    finalBody: String(formData.get("finalBody") ?? "").trim() || undefined,
  });
  await createExternalItem({
    ...parsed,
    publishedUrl: parsed.publishedUrl || undefined,
  });
  revalidatePath("/pilotage/contenus/archive");
}

const MetricSchema = z.object({
  contentId: z.coerce.number().int().positive(),
  impressions: z.coerce.number().int().nonnegative().optional(),
  engagementCount: z.coerce.number().int().nonnegative().optional(),
  conversions: z.coerce.number().int().nonnegative().optional(),
  notes: z.string().optional(),
});

export async function recordMetricAction(formData: FormData): Promise<void> {
  await requireSession();
  const parsed = MetricSchema.parse({
    contentId: formData.get("contentId"),
    impressions: formData.get("impressions") || undefined,
    engagementCount: formData.get("engagementCount") || undefined,
    conversions: formData.get("conversions") || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });
  await recordMetric(parsed);
  revalidatePath("/pilotage/contenus/archive");
}

export async function deleteMetricAction(formData: FormData): Promise<void> {
  await requireSession();
  const { id } = IdSchema.parse({ id: formData.get("id") });
  await deleteMetric(id);
  revalidatePath("/pilotage/contenus/archive");
}

const PeriodSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, "Format YYYY-MM"),
});

export async function generateAnalysisAction(formData: FormData): Promise<void> {
  await requireSession();
  const { period } = PeriodSchema.parse({ period: formData.get("period") });
  await generateMonthlyAnalysis(period);
  revalidatePath("/pilotage/contenus/archive");
}
