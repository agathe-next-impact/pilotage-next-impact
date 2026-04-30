/**
 * Suggestions de hooks (3 par ContentItem) — régénérables sur prompt.
 * Inclut performance learning + few-shot examples + prompt caching.
 * SERVER-ONLY.
 */

import "server-only";

import { prisma } from "@/lib/kpi/store";
import { callClaudeJson, MODELS } from "./anthropic";
import { getContentItem } from "./store";
import { EXTENDED_BRAND_BLOCK, getExtendedBrandBlock } from "./prompts";
import {
  LINKEDIN_CAMPAIGNS,
  NEWSLETTER_PILLARS,
  SEO_CLUSTERS,
} from "./plans";
import { embedTexts, findSimilarPairs, embeddingsAvailable } from "./embeddings";
import type { HookSuggestion, HookPattern, ContentType } from "./types";

const DIVERSITY_THRESHOLD = 0.25;
const MAX_DIVERSITY_RETRIES = 1;

interface DbHookSuggestion {
  id: number;
  contentId: number;
  hook: string;
  pattern: string;
  position: number;
  selected: boolean;
  model: string | null;
  userPrompt: string | null;
  createdAt: Date;
}

function toHook(row: DbHookSuggestion): HookSuggestion {
  return {
    id: row.id,
    contentId: row.contentId,
    hook: row.hook,
    pattern: row.pattern as HookPattern,
    position: row.position,
    selected: row.selected,
    model: row.model,
    userPrompt: row.userPrompt,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listHooks(contentId: number): Promise<HookSuggestion[]> {
  const rows = await prisma.hookSuggestion.findMany({
    where: { contentId },
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
  });
  return rows.map(toHook);
}

export async function selectHook(hookId: number): Promise<HookSuggestion> {
  const target = await prisma.hookSuggestion.findUnique({ where: { id: hookId } });
  if (!target) throw new Error("Hook introuvable");
  await prisma.hookSuggestion.updateMany({
    where: { contentId: target.contentId, id: { not: hookId } },
    data: { selected: false },
  });
  const row = await prisma.hookSuggestion.update({
    where: { id: hookId },
    data: { selected: true },
  });
  return toHook(row);
}

export async function deleteHooks(contentId: number): Promise<void> {
  await prisma.hookSuggestion.deleteMany({ where: { contentId } });
}

async function getWinningHooks(type: ContentType, limit = 8): Promise<HookSuggestion[]> {
  const rows = await prisma.hookSuggestion.findMany({
    where: {
      selected: true,
      content: {
        type,
        status: { in: ["published", "validated"] },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(toHook);
}

const SEED_EXAMPLES: Record<ContentType, { hook: string; pattern: HookPattern; why: string }[]> = {
  linkedin_post: [
    { hook: "Pourquoi votre site WP plafonne à 60/100 sur Lighthouse ?", pattern: "question", why: "Question DSI directe, chiffre concret." },
    { hook: "87% des sites WP ont une note Core Web Vitals < 70.", pattern: "stat", why: "Stat choc, déclenche la curiosité." },
    { hook: "Je recommande Webflow à la moitié de mes prospects. Voici pourquoi.", pattern: "contre-intuitif", why: "Casse la croyance que le freelance pousse toujours sa stack." },
    { hook: "3 erreurs qui plombent votre SEO WordPress — fix en 2h.", pattern: "promesse", why: "Promesse concrète + délai." },
    { hook: "Lundi 8h, le DSI m'envoie : « On a 4j pour décider. »", pattern: "histoire", why: "Récit personnel, déclenche identification." },
    { hook: "Si vous gérez un site WP > 5 ans, ce post est pour vous.", pattern: "cta-direct", why: "Filtre l'audience explicitement." },
  ],
  newsletter_edition: [
    { hook: "Votre site WordPress est-il encore la bonne solution ?", pattern: "question", why: "Question décideur, ouverte." },
    { hook: "30% de votre AGEFIPH récupérable en 2 lignes de code.", pattern: "stat", why: "Chiffre fiscal précis." },
    { hook: "Webflow > WordPress ? Pas pour vous.", pattern: "contre-intuitif", why: "Casse une mode." },
    { hook: "La méthode pour chiffrer un choix techno avant de signer.", pattern: "promesse", why: "Bénéfice immédiat." },
    { hook: "4 projets, 4 technos, 4 décisions différentes.", pattern: "histoire", why: "Promet du concret." },
    { hook: "Lis ça avant ton prochain devis web.", pattern: "cta-direct", why: "Filtre l'urgence." },
  ],
  seo_article: [
    { hook: "WordPress Headless vs classique : comparatif complet 2026", pattern: "promesse", why: "KW direct + promesse exhaustive." },
    { hook: "Combien coûte une migration WordPress Headless ?", pattern: "question", why: "Question fréquente, intention décision." },
    { hook: "Prestataire TIH développement web : -30% sur AGEFIPH", pattern: "stat", why: "KW + bénéfice chiffré." },
    { hook: "Pourquoi WordPress Headless est plus sûr que classique", pattern: "contre-intuitif", why: "Casse la croyance opposée." },
    { hook: "Calculer le ROI d'une refonte web : méthode + simulateur", pattern: "promesse", why: "Promesse outil." },
    { hook: "WordPress Headless en France : guide pour DAF", pattern: "cta-direct", why: "Cible explicitement le persona." },
  ],
};

const SCHEMA = `interface Response {
  hooks: Array<{
    hook: string;
    pattern: "question" | "stat" | "contre-intuitif" | "promesse" | "histoire" | "cta-direct";
    rationale: string;
  }>;
}`;

interface GenerateHooksOptions {
  userPrompt?: string;
  count?: number;
  replace?: boolean;
}

export async function generateHooksForItem(
  contentId: number,
  options: GenerateHooksOptions = {}
): Promise<HookSuggestion[]> {
  const item = await getContentItem(contentId);
  if (!item) throw new Error("Item introuvable");

  const count = Math.max(2, Math.min(5, options.count ?? 3));
  const winners = await getWinningHooks(item.type, 8);

  let typeContext = "";
  if (item.type === "linkedin_post") {
    const camp = LINKEDIN_CAMPAIGNS.find((c) => c.code === item.trackKey);
    typeContext = `Post LinkedIn — campagne ${item.trackKey}${camp ? ` (${camp.name}, cible ${camp.audience})` : ""}.
Le hook = PREMIÈRE LIGNE qui stoppe le scroll. ≤18 mots, pas d'emoji.`;
  } else if (item.type === "newsletter_edition") {
    const pk = (item.meta?.["pillier"] as string | undefined) ?? "";
    const pillar = (NEWSLETTER_PILLARS as Record<string, { name: string; focus: string }>)[pk];
    typeContext = `Édition newsletter — pilier ${pk}${pillar ? ` (${pillar.name})` : ""}.
Le hook = OBJET EMAIL : ≤60 caractères, donne envie d'ouvrir, ton décideur PME.`;
  } else if (item.type === "seo_article") {
    const cluster = SEO_CLUSTERS.find((c) => c.code === item.trackKey);
    typeContext = `Article SEO — cluster ${item.trackKey}${cluster ? ` (KW : ${cluster.mainKeyword})` : ""}.
Le hook = TITRE H1 : intègre le mot-clé naturellement, ≤70 caractères.`;
  }

  const examples = winners.length >= 3
    ? winners.slice(0, 6).map((w) => ({ hook: w.hook, pattern: w.pattern, why: "Hook gagnant historique" }))
    : SEED_EXAMPLES[item.type] ?? [];

  const examplesBlock = examples.length === 0
    ? ""
    : `# EXEMPLES DE HOOKS DANS LA VOIX NEXT IMPACT
${examples.map((e) => `<example pattern="${e.pattern}">
"${e.hook}"
↪ ${e.why}
</example>`).join("\n")}

Inspire-toi de ces patterns SANS copier mot à mot. Ta voix doit être reconnaissable.`;

  const system = `Contexte de l'élément :
${typeContext}

Tu dois générer ${count} hooks DIFFÉRENTS en variant les patterns :
- "question" / "stat" / "contre-intuitif" / "promesse" / "histoire" / "cta-direct"

${examplesBlock}

Règles strictes :
- ≤18 mots / 60 car. / 70 car. selon format.
- Aucun emoji.
- Pas de superlatifs creux ("incroyable", "révolutionnaire", "unique").
- Tes ${count} hooks doivent être VRAIMENT différents (pas 3 variations du même angle).`;

  const user = `Sujet : ${item.subject}
Brief : ${item.brief}
Type : ${item.type}
Track : ${item.trackKey}
${options.userPrompt ? `\nDirective utilisateur : "${options.userPrompt}"` : ""}

Génère ${count} hooks variés.`;

  type HookJson = { hook?: string; pattern?: string };

  const result = await callClaudeJson<{ hooks?: HookJson[] }>({
    model: MODELS.sonnet,
    cachedSystem: await getExtendedBrandBlock(),
    system,
    user,
    jsonShape: SCHEMA,
    maxTokens: 800,
    temperature: 0.7,
    maxRetries: 2,
  });

  if (!result.json || !Array.isArray(result.json.hooks) || result.json.hooks.length === 0) {
    throw new Error(`Claude n'a pas renvoye de hooks valides apres ${result.attempts} tentatives.\n${result.text.slice(0, 300)}`);
  }
  let hooksList: HookJson[] = result.json.hooks as HookJson[];

  if (embeddingsAvailable() && hooksList.length >= 2) {
    let diversityRetries = 0;
    while (diversityRetries < MAX_DIVERSITY_RETRIES) {
      const hookTexts = hooksList.map((h) => h?.hook ?? "");
      try {
        const vectors = await embedTexts(hookTexts);
        const similar = findSimilarPairs(vectors, DIVERSITY_THRESHOLD);
        if (similar.length === 0) break;

        const toReplace = new Set<number>();
        for (const pair of similar) {
          toReplace.add(pair.j);
        }
        const indicesToReplace = Array.from(toReplace).sort((a, b) => a - b);
        const keepingHooks: HookJson[] = hooksList.filter((_, idx) => !toReplace.has(idx));

        const diversityUser = `Tu as deja propose ${keepingHooks.length} hook(s) qu'on conserve :
${keepingHooks.map((h, i) => `${i + 1}. [${h?.pattern}] "${h?.hook}"`).join("\n")}

Genere ${indicesToReplace.length} hook(s) supplementaire(s) qui couvrent des ANGLES VRAIMENT DIFFERENTS de ceux-ci.

Sujet : ${item.subject}
Brief : ${item.brief}`;

        const retry = await callClaudeJson<{ hooks?: HookJson[] }>({
          model: MODELS.sonnet,
          cachedSystem: await getExtendedBrandBlock(),
          system,
          user: diversityUser,
          jsonShape: SCHEMA,
          maxTokens: 600,
          temperature: 0.85,
          maxRetries: 1,
        });
        const newHooks: HookJson[] = retry.json?.hooks ?? [];
        if (newHooks.length === 0) break;

        const merged: HookJson[] = [...keepingHooks];
        for (let k = 0; k < indicesToReplace.length && k < newHooks.length; k++) {
          const nh = newHooks[k];
          if (nh) merged.push(nh);
        }
        hooksList = merged;
        diversityRetries++;
      } catch (err) {
        console.warn("[hooks diversity] check skipped:", (err as Error).message);
        break;
      }
    }
  }

  if (options.replace !== false) {
    await deleteHooks(contentId);
  }

  const created: HookSuggestion[] = [];
  for (let i = 0; i < hooksList.length; i++) {
    const h = hooksList[i];
    if (!h?.hook) continue;
    const row = await prisma.hookSuggestion.create({
      data: {
        contentId,
        hook: h.hook,
        pattern: (h.pattern ?? "question") as HookPattern,
        position: i,
        model: result.model,
        userPrompt: options.userPrompt ?? null,
      },
    });
    created.push(toHook(row));
  }

  return created;
}
