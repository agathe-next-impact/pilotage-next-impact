"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import {
  upsertPattern,
  setPatternActive,
  deletePattern,
  extractFromPublishedContent,
  type VoicePatternKind,
} from "@/lib/editorial/voice-fingerprint";

const KIND_VALUES: VoicePatternKind[] = [
  "lexicon-loved",
  "lexicon-banned",
  "phrase-loved",
  "phrase-banned",
  "structure",
  "winning-hook",
];

const KindSchema = z.enum([
  "lexicon-loved",
  "lexicon-banned",
  "phrase-loved",
  "phrase-banned",
  "structure",
  "winning-hook",
]);

const AddSchema = z.object({
  kind: KindSchema,
  text: z.string().min(2).max(500),
  weight: z.coerce.number().min(0).max(5).default(1),
});

export async function addPatternAction(formData: FormData): Promise<void> {
  await requireSession();
  const parsed = AddSchema.parse({
    kind: formData.get("kind"),
    text: String(formData.get("text") ?? "").trim(),
    weight: formData.get("weight") ?? 1,
  });
  await upsertPattern(parsed);
  revalidatePath("/pilotage/contenus/voice");
}

const ToggleSchema = z.object({
  id: z.coerce.number().int().positive(),
  active: z.coerce.boolean(),
});

export async function togglePatternAction(formData: FormData): Promise<void> {
  await requireSession();
  const { id, active } = ToggleSchema.parse({
    id: formData.get("id"),
    active: formData.get("active") === "1",
  });
  await setPatternActive(id, active);
  revalidatePath("/pilotage/contenus/voice");
}

const DeleteSchema = z.object({ id: z.coerce.number().int().positive() });

export async function deletePatternAction(formData: FormData): Promise<void> {
  await requireSession();
  const { id } = DeleteSchema.parse({ id: formData.get("id") });
  await deletePattern(id);
  revalidatePath("/pilotage/contenus/voice");
}

/**
 * Lance l'extraction depuis le corpus publié et insère les top candidats
 * comme `lexicon-loved` source `extracted` (active=false par défaut, à valider).
 */
export async function extractPatternsAction(): Promise<void> {
  await requireSession();
  const { candidates } = await extractFromPublishedContent(15);
  for (const c of candidates) {
    try {
      await upsertPattern({
        kind: "lexicon-loved",
        text: c.text,
        source: "extracted",
        weight: Math.min(2, 0.5 + c.appearances / 10),
      });
    } catch {
      /* ignore */
    }
  }
  revalidatePath("/pilotage/contenus/voice");
}

export const VOICE_KINDS = KIND_VALUES;
