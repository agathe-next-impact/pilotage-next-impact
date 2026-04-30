"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import {
  attachDraft,
  getContentItem,
  markPublished,
  validateContent,
  applyPlanRevision,
  rejectPlanRevision,
} from "@/lib/editorial/store";
import { generateDraft } from "@/lib/editorial/generator";
import { adjustPlanWithClaude } from "@/lib/editorial/plan-adjuster";
import type { PlanScope } from "@/lib/editorial/types";

const IdSchema = z.object({ id: z.coerce.number().int().positive() });

export async function generateContentAction(formData: FormData): Promise<void> {
  await requireSession();
  const { id } = IdSchema.parse({ id: formData.get("id") });
  const feedback = String(formData.get("feedback") ?? "").trim() || undefined;

  const item = await getContentItem(id);
  if (!item) throw new Error("Item introuvable.");

  const draft = await generateDraft(item, { feedback });
  await attachDraft(id, draft);
  revalidatePath(`/pilotage/contenus`, "layout");
}

export async function validateContentAction(formData: FormData): Promise<void> {
  await requireSession();
  const { id } = IdSchema.parse({ id: formData.get("id") });
  const finalBody = String(formData.get("finalBody") ?? "").trim();
  if (!finalBody) throw new Error("Corps final vide.");

  await validateContent(id, finalBody);
  revalidatePath(`/pilotage/contenus`, "layout");
}

export async function publishContentAction(formData: FormData): Promise<void> {
  await requireSession();
  const { id } = IdSchema.parse({ id: formData.get("id") });
  await markPublished(id);
  revalidatePath(`/pilotage/contenus`, "layout");
}

const ScopeSchema = z.enum(["linkedin", "newsletter", "seo", "global"]);

export async function adjustPlanAction(formData: FormData): Promise<void> {
  await requireSession();
  const scope = ScopeSchema.parse(formData.get("scope") ?? "global") as PlanScope;
  const force = formData.get("force") === "1";
  await adjustPlanWithClaude({ scope, force });
  revalidatePath(`/pilotage/contenus`, "layout");
}

export async function applyPlanRevisionAction(formData: FormData): Promise<void> {
  await requireSession();
  const { id } = IdSchema.parse({ id: formData.get("id") });
  await applyPlanRevision(id);
  revalidatePath(`/pilotage/contenus`, "layout");
}

export async function rejectPlanRevisionAction(formData: FormData): Promise<void> {
  await requireSession();
  const { id } = IdSchema.parse({ id: formData.get("id") });
  await rejectPlanRevision(id);
  revalidatePath(`/pilotage/contenus`, "layout");
}
