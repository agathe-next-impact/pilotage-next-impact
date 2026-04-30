"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import {
  submitChatInput,
  markContextResolved,
  weekStartOf as weekStartCtx,
} from "@/lib/editorial/planning-context";
import {
  suggestThemesWithClaude,
  activateTheme,
  rejectTheme,
  updateThemeContent,
  weekStartOf,
  addDays,
} from "@/lib/editorial/weekly-theme";
import { generateHooksForItem, selectHook } from "@/lib/editorial/hooks";
import { createWeekSlot, deleteWeekSlot } from "@/lib/editorial/slot-creator";
import type { PlanningContextStatus, ContentType } from "@/lib/editorial/types";

const InputSchema = z.object({
  rawInput: z.string().trim().min(5).max(2000),
  weekStart: z.string().optional(),
});

export async function submitPlanningInputAction(formData: FormData): Promise<void> {
  await requireSession();
  const parsed = InputSchema.parse({
    rawInput: formData.get("rawInput") ?? "",
    weekStart: formData.get("weekStart") ?? undefined,
  });
  const weekStart = parsed.weekStart ? weekStartCtx(new Date(parsed.weekStart)) : undefined;
  await submitChatInput({ rawInput: parsed.rawInput, weekStart });
  revalidatePath("/pilotage/contenus", "layout");
}

const ResolveSchema = z.object({
  id: z.coerce.number().int().positive(),
  outcome: z.enum(["applied", "ignored", "stale"]),
});

export async function resolvePlanningContextAction(formData: FormData): Promise<void> {
  await requireSession();
  const parsed = ResolveSchema.parse({
    id: formData.get("id"),
    outcome: formData.get("outcome"),
  });
  await markContextResolved(parsed.id, parsed.outcome as PlanningContextStatus & ("applied" | "ignored" | "stale"));
  revalidatePath("/pilotage/contenus", "layout");
}

const SuggestSchema = z.object({
  fromWeek: z.string(),
  weekCount: z.coerce.number().int().min(1).max(8).default(1),
  proposalsPerWeek: z.coerce.number().int().min(2).max(5).default(3),
  userPrompt: z.string().trim().max(2000).optional(),
  replace: z.boolean().default(true),
});

export async function suggestThemesAction(formData: FormData): Promise<void> {
  await requireSession();
  const parsed = SuggestSchema.parse({
    fromWeek: formData.get("fromWeek") ?? "",
    weekCount: formData.get("weekCount") ?? 1,
    proposalsPerWeek: formData.get("proposalsPerWeek") ?? 3,
    userPrompt: (formData.get("userPrompt") as string) || undefined,
    replace: formData.get("replace") !== "0",
  });
  const start = weekStartOf(new Date(parsed.fromWeek));
  const weekStarts = Array.from({ length: parsed.weekCount }, (_, i) => addDays(start, i * 7));
  await suggestThemesWithClaude({
    weekStarts,
    proposalsPerWeek: parsed.proposalsPerWeek,
    userPrompt: parsed.userPrompt,
    replace: parsed.replace,
  });
  revalidatePath("/pilotage/contenus", "layout");
}

const IdSchema = z.object({ id: z.coerce.number().int().positive() });

export async function activateThemeAction(formData: FormData): Promise<void> {
  await requireSession();
  const { id } = IdSchema.parse({ id: formData.get("id") });
  await activateTheme(id);
  revalidatePath("/pilotage/contenus", "layout");
}

export async function rejectThemeAction(formData: FormData): Promise<void> {
  await requireSession();
  const { id } = IdSchema.parse({ id: formData.get("id") });
  await rejectTheme(id);
  revalidatePath("/pilotage/contenus", "layout");
}

const UpdateThemeSchema = z.object({
  id: z.coerce.number().int().positive(),
  theme: z.string().trim().min(1).max(200).optional(),
  summary: z.string().trim().max(800).optional(),
  primaryCampaign: z.string().nullable().optional(),
  primaryCluster: z.string().nullable().optional(),
  primaryPillar: z.string().nullable().optional(),
  actionDirectives: z.array(z.string()).optional(),
});

export async function updateThemeAction(formData: FormData): Promise<void> {
  await requireSession();
  const directivesRaw = String(formData.get("actionDirectives") ?? "").trim();
  const directives = directivesRaw
    ? directivesRaw.split("\n").map((s) => s.trim()).filter(Boolean)
    : undefined;
  const parsed = UpdateThemeSchema.parse({
    id: formData.get("id"),
    theme: formData.get("theme") ?? undefined,
    summary: formData.get("summary") ?? undefined,
    primaryCampaign: (formData.get("primaryCampaign") as string) || null,
    primaryCluster: (formData.get("primaryCluster") as string) || null,
    primaryPillar: (formData.get("primaryPillar") as string) || null,
    actionDirectives: directives,
  });
  await updateThemeContent(parsed);
  revalidatePath("/pilotage/contenus", "layout");
}

const HooksSchema = z.object({
  contentId: z.coerce.number().int().positive(),
  userPrompt: z.string().trim().max(500).optional(),
});

export async function generateHooksAction(formData: FormData): Promise<void> {
  await requireSession();
  const parsed = HooksSchema.parse({
    contentId: formData.get("contentId"),
    userPrompt: (formData.get("userPrompt") as string) || undefined,
  });
  await generateHooksForItem(parsed.contentId, {
    userPrompt: parsed.userPrompt,
    count: 3,
    replace: true,
  });
  revalidatePath("/pilotage/contenus", "layout");
}

export async function selectHookAction(formData: FormData): Promise<void> {
  await requireSession();
  const { id } = IdSchema.parse({ id: formData.get("id") });
  await selectHook(id);
  revalidatePath("/pilotage/contenus", "layout");
}

const CreateSlotSchema = z.object({
  weekStart: z.string(),
  type: z.enum(["linkedin_post", "newsletter_edition", "seo_article"]),
  trackKey: z.string().optional(),
});

export async function createSlotAction(formData: FormData): Promise<void> {
  await requireSession();
  const parsed = CreateSlotSchema.parse({
    weekStart: formData.get("weekStart") ?? "",
    type: formData.get("type"),
    trackKey: (formData.get("trackKey") as string) || undefined,
  });
  await createWeekSlot({
    weekStart: weekStartOf(new Date(parsed.weekStart)),
    type: parsed.type as ContentType,
    trackKey: parsed.trackKey,
  });
  revalidatePath("/pilotage/contenus", "layout");
}

export async function deleteSlotAction(formData: FormData): Promise<void> {
  await requireSession();
  const { id } = IdSchema.parse({ id: formData.get("id") });
  await deleteWeekSlot(id);
  revalidatePath("/pilotage/contenus", "layout");
}
