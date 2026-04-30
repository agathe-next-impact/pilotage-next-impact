/**
 * Création à la demande d'un emplacement de contenu dans une semaine donnée.
 * SERVER-ONLY.
 */

import "server-only";

import { prisma } from "@/lib/kpi/store";
import { generateHooksForItem } from "./hooks";
import { getActiveTheme } from "./weekly-theme";
import type { ContentItem, ContentType } from "./types";

interface CreateSlotInput {
  weekStart: Date; // lundi 00:00 UTC
  type: ContentType;
  /** Track key suggéré (sinon repris du thème actif si dispo). */
  trackKey?: string;
  /** Sujet provisoire — sinon "(à définir)" ou repris du thème. */
  subject?: string;
}

function midOfWeek(weekStart: Date): Date {
  const d = new Date(weekStart);
  d.setUTCDate(d.getUTCDate() + 2); // mercredi
  d.setUTCHours(9, 0, 0, 0);
  return d;
}

function counterFor(weekStart: Date, type: ContentType): number {
  // Suffixe d'unicité du slug : timestamp court
  return Math.floor(weekStart.getTime() / 86_400_000);
}

async function nextLinkedInIndex(weekStart: Date): Promise<number> {
  const wsEnd = new Date(weekStart);
  wsEnd.setUTCDate(wsEnd.getUTCDate() + 7);
  const count = await prisma.contentItem.count({
    where: {
      type: "linkedin_post",
      plannedFor: { gte: weekStart, lt: wsEnd },
    },
  });
  return count + 1;
}

/**
 * Crée un ContentItem vide dans la semaine donnée + auto-génère 3 hooks.
 * Limites : 5 LI / 1 NL / 1 SEO par semaine.
 */
export async function createWeekSlot(input: CreateSlotInput): Promise<ContentItem> {
  const wsEnd = new Date(input.weekStart);
  wsEnd.setUTCDate(wsEnd.getUTCDate() + 7);

  // Vérifier les limites par type
  if (input.type === "linkedin_post") {
    const count = await prisma.contentItem.count({
      where: { type: "linkedin_post", plannedFor: { gte: input.weekStart, lt: wsEnd } },
    });
    if (count >= 5) throw new Error("Maximum 5 posts LinkedIn par semaine atteint.");
  } else if (input.type === "newsletter_edition" || input.type === "seo_article") {
    const existing = await prisma.contentItem.count({
      where: { type: input.type, plannedFor: { gte: input.weekStart, lt: wsEnd } },
    });
    if (existing >= 1) {
      throw new Error(
        input.type === "newsletter_edition"
          ? "1 seule newsletter par semaine."
          : "1 seul article SEO par semaine."
      );
    }
  }

  // Si pas de trackKey, on essaye de récupérer celui du thème actif
  const activeTheme = await getActiveTheme(input.weekStart);
  let trackKey = input.trackKey;
  if (!trackKey && activeTheme) {
    if (input.type === "linkedin_post" && activeTheme.primaryCampaign) {
      trackKey = activeTheme.primaryCampaign;
    } else if (input.type === "seo_article" && activeTheme.primaryCluster) {
      trackKey = activeTheme.primaryCluster;
    } else if (input.type === "newsletter_edition") {
      trackKey = activeTheme.primaryPillar ?? "edition";
    }
  }
  if (!trackKey) {
    trackKey = input.type === "newsletter_edition" ? "edition" : "?";
  }

  // Slug unique
  const stamp = counterFor(input.weekStart, input.type);
  const idx = input.type === "linkedin_post" ? await nextLinkedInIndex(input.weekStart) : 1;
  const slug = `${input.type === "linkedin_post" ? "li" : input.type === "newsletter_edition" ? "nl" : "seo"}-${stamp}-${idx}`;

  // Subject par défaut : repris du thème + type
  const subject = input.subject ?? (activeTheme
    ? `${activeTheme.theme} — ${input.type === "linkedin_post" ? "Post LinkedIn" : input.type === "newsletter_edition" ? "Newsletter" : "Article SEO"}`
    : "(à définir avec Claude)");

  const brief = activeTheme
    ? `${activeTheme.summary}\n\nDirectives : ${activeTheme.actionDirectives.join(" · ") || "(aucune)"}`
    : "(brief à compléter)";

  const created = await prisma.contentItem.create({
    data: {
      slug,
      type: input.type,
      trackKey,
      plannedFor: midOfWeek(input.weekStart),
      status: "planned",
      subject,
      brief,
      meta: activeTheme
        ? JSON.stringify({
            themeId: activeTheme.id,
            campaign: activeTheme.primaryCampaign,
            cluster: activeTheme.primaryCluster,
            pillier: activeTheme.primaryPillar,
          })
        : null,
    },
  });

  // Auto-génération de 3 hooks (best effort, non bloquant si Claude tombe)
  try {
    await generateHooksForItem(created.id, { count: 3, replace: true });
  } catch (err) {
    console.warn("[createWeekSlot] hooks generation failed:", (err as Error).message);
  }

  // Retour : recharger pour le mapping ContentItem
  const row = await prisma.contentItem.findUnique({ where: { id: created.id } });
  if (!row) throw new Error("Item créé mais introuvable");

  return {
    id: row.id,
    slug: row.slug,
    type: row.type as ContentType,
    trackKey: row.trackKey,
    plannedFor: row.plannedFor.toISOString(),
    status: row.status as ContentItem["status"],
    subject: row.subject,
    finalSubject: row.finalSubject,
    brief: row.brief,
    draft: row.draft,
    finalBody: row.finalBody,
    publishedUrl: row.publishedUrl,
    generatedModel: row.generatedModel,
    generatedAt: row.generatedAt ? row.generatedAt.toISOString() : null,
    validatedAt: row.validatedAt ? row.validatedAt.toISOString() : null,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    meta: row.meta ? JSON.parse(row.meta) : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function deleteWeekSlot(contentId: number): Promise<void> {
  // Cascade automatique sur HookSuggestion / MediaAsset / ContentRevision
  await prisma.contentItem.delete({ where: { id: contentId } });
}
