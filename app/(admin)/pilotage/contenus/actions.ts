"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import {
  attachDraft,
  getContentItem,
  saveFinalContent,
  setPublishedUrl,
  markPublished,
  markSkipped,
  applyPlanRevision,
  rejectPlanRevision,
} from "@/lib/editorial/store";
import { deleteMedia, updateMediaMeta } from "@/lib/editorial/media";
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

/**
 * Sauvegarde la version finale (sujet + corps).
 * `validate=true` la marque aussi comme validée.
 */
export async function saveFinalAction(formData: FormData): Promise<void> {
  await requireSession();
  const { id } = IdSchema.parse({ id: formData.get("id") });
  const finalSubject = String(formData.get("finalSubject") ?? "").trim();
  const finalBody = String(formData.get("finalBody") ?? "").trim();
  const validate = formData.get("validate") === "1";

  if (!finalSubject) throw new Error("Sujet final vide.");
  if (!finalBody) throw new Error("Corps final vide.");

  await saveFinalContent({ id, finalSubject, finalBody, validate });
  revalidatePath(`/pilotage/contenus`, "layout");
}

/**
 * Enregistre l'URL du post publié (LinkedIn, Substack, blog).
 * Marque automatiquement comme publié.
 */
export async function setPublishedUrlAction(formData: FormData): Promise<void> {
  await requireSession();
  const { id } = IdSchema.parse({ id: formData.get("id") });
  const urlRaw = String(formData.get("publishedUrl") ?? "").trim();
  const url = urlRaw === "" ? null : urlRaw;

  if (url && !/^https?:\/\//.test(url)) {
    throw new Error("URL invalide (doit commencer par http:// ou https://).");
  }

  await setPublishedUrl(id, url);
  revalidatePath(`/pilotage/contenus`, "layout");
}

export async function publishContentAction(formData: FormData): Promise<void> {
  await requireSession();
  const { id } = IdSchema.parse({ id: formData.get("id") });
  await markPublished(id);
  revalidatePath(`/pilotage/contenus`, "layout");
}

export async function skipContentAction(formData: FormData): Promise<void> {
  await requireSession();
  const { id } = IdSchema.parse({ id: formData.get("id") });
  await markSkipped(id);
  revalidatePath(`/pilotage/contenus`, "layout");
}

// Médias --------------------------------------------------------------------

export async function deleteMediaAction(formData: FormData): Promise<void> {
  await requireSession();
  const mediaId = Number(formData.get("mediaId"));
  if (!Number.isFinite(mediaId) || mediaId <= 0) throw new Error("mediaId invalide");
  await deleteMedia(mediaId);
  revalidatePath(`/pilotage/contenus`, "layout");
}

export async function updateMediaAction(formData: FormData): Promise<void> {
  await requireSession();
  const mediaId = Number(formData.get("mediaId"));
  if (!Number.isFinite(mediaId) || mediaId <= 0) throw new Error("mediaId invalide");
  const alt = String(formData.get("alt") ?? "").trim() || null;
  const caption = String(formData.get("caption") ?? "").trim() || null;
  const positionRaw = formData.get("position");
  const position = positionRaw !== null && positionRaw !== "" ? Number(positionRaw) : undefined;
  await updateMediaMeta({ mediaId, alt, caption, position });
  revalidatePath(`/pilotage/contenus`, "layout");
}

// Plan revisions ------------------------------------------------------------

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
