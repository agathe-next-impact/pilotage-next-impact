"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import {
  createNewVersion,
  activateVersion,
  type PromptName,
} from "@/lib/editorial/prompt-store";

const NameSchema = z.enum([
  "brand_block",
  "linkedin_post_system",
  "newsletter_system",
  "seo_article_system",
  "hooks_system",
  "plan_adjuster_system",
  "weekly_theme_system",
]);

const NewVersionSchema = z.object({
  name: NameSchema,
  body: z.string().min(50),
  notes: z.string().optional(),
  activate: z.boolean().default(false),
});

export async function createNewVersionAction(formData: FormData): Promise<void> {
  await requireSession();
  const parsed = NewVersionSchema.parse({
    name: formData.get("name"),
    body: String(formData.get("body") ?? ""),
    notes: String(formData.get("notes") ?? "") || undefined,
    activate: formData.get("activate") === "1",
  });
  await createNewVersion(parsed);
  revalidatePath("/pilotage/contenus/prompts");
}

const ActivateSchema = z.object({ id: z.coerce.number().int().positive() });

export async function activateVersionAction(formData: FormData): Promise<void> {
  await requireSession();
  const { id } = ActivateSchema.parse({ id: formData.get("id") });
  await activateVersion(id);
  revalidatePath("/pilotage/contenus/prompts");
}

export const PROMPT_NAMES: PromptName[] = [
  "brand_block",
  "linkedin_post_system",
  "newsletter_system",
  "seo_article_system",
  "hooks_system",
  "plan_adjuster_system",
  "weekly_theme_system",
];
