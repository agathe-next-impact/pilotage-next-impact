/**
 * Bibliothèque de prompts versionnés.
 * Permet de modifier les prompts depuis l'admin sans redéployer + rollback + A/B.
 * SERVER-ONLY.
 */

import "server-only";

import { prisma } from "@/lib/kpi/store";

export type PromptName =
  | "brand_block"
  | "linkedin_post_system"
  | "newsletter_system"
  | "seo_article_system"
  | "hooks_system"
  | "plan_adjuster_system"
  | "weekly_theme_system";

export interface PromptTemplate {
  id: number;
  name: PromptName;
  version: number;
  body: string;
  meta: Record<string, unknown> | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DbPromptTemplate {
  id: number;
  name: string;
  version: number;
  body: string;
  meta: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function toTemplate(row: DbPromptTemplate): PromptTemplate {
  let meta: Record<string, unknown> | null = null;
  if (row.meta) {
    try { meta = JSON.parse(row.meta); } catch { /* fallback */ }
  }
  return {
    id: row.id,
    name: row.name as PromptName,
    version: row.version,
    body: row.body,
    meta,
    isActive: row.isActive,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Charge le template ACTIF d'un name. Retourne null si aucun en DB
 * (le caller doit alors utiliser le fallback hardcodé dans prompts.ts).
 */
export async function getActiveTemplate(name: PromptName): Promise<PromptTemplate | null> {
  const row = await prisma.promptTemplate.findFirst({
    where: { name, isActive: true },
    orderBy: { version: "desc" },
  });
  return row ? toTemplate(row) : null;
}

export async function listVersions(name: PromptName): Promise<PromptTemplate[]> {
  const rows = await prisma.promptTemplate.findMany({
    where: { name },
    orderBy: { version: "desc" },
  });
  return rows.map(toTemplate);
}

export async function createNewVersion(input: {
  name: PromptName;
  body: string;
  notes?: string;
  meta?: Record<string, unknown>;
  activate?: boolean;
}): Promise<PromptTemplate> {
  // Trouve la version max actuelle
  const latest = await prisma.promptTemplate.findFirst({
    where: { name: input.name },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const nextVersion = (latest?.version ?? 0) + 1;

  if (input.activate) {
    // Désactiver les autres versions
    await prisma.promptTemplate.updateMany({
      where: { name: input.name, isActive: true },
      data: { isActive: false },
    });
  }

  const row = await prisma.promptTemplate.create({
    data: {
      name: input.name,
      version: nextVersion,
      body: input.body,
      notes: input.notes ?? null,
      meta: input.meta ? JSON.stringify(input.meta) : null,
      isActive: input.activate ?? false,
    },
  });
  return toTemplate(row);
}

/**
 * Active une version donnée et désactive les autres.
 */
export async function activateVersion(id: number): Promise<PromptTemplate> {
  const target = await prisma.promptTemplate.findUnique({ where: { id } });
  if (!target) throw new Error("Template introuvable");
  await prisma.promptTemplate.updateMany({
    where: { name: target.name, isActive: true, id: { not: id } },
    data: { isActive: false },
  });
  const row = await prisma.promptTemplate.update({
    where: { id },
    data: { isActive: true },
  });
  return toTemplate(row);
}

/**
 * Charge le body actif OU retourne le fallback hardcodé.
 * À utiliser dans les modules consommateurs (generator, hooks…).
 */
export async function loadPromptBody(
  name: PromptName,
  fallback: string
): Promise<string> {
  try {
    const t = await getActiveTemplate(name);
    return t?.body ?? fallback;
  } catch {
    return fallback;
  }
}
