"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import {
  submitChatInput,
  markContextResolved,
  weekStartOf,
} from "@/lib/editorial/planning-context";
import type { PlanningContextStatus } from "@/lib/editorial/types";

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

  const weekStart = parsed.weekStart
    ? weekStartOf(new Date(parsed.weekStart))
    : undefined;

  await submitChatInput({
    rawInput: parsed.rawInput,
    weekStart,
  });

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
