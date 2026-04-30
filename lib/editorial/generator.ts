/**
 * Service de génération de contenu — orchestre Claude pour les 3 types.
 * Optimisé : prompt caching + Sonnet par défaut + auto-critique 2 passes (SEO).
 * SERVER-ONLY.
 */

import "server-only";

import { callClaudeJson, MODELS, type ClaudeModel } from "./anthropic";
import {
  EXTENDED_BRAND_BLOCK,
  getExtendedBrandBlock,
  GENERATED_DRAFT_SCHEMA,
  buildLinkedInPrompt,
  buildNewsletterPrompt,
  buildSeoArticlePrompt,
} from "./prompts";
import type { ContentItem, GeneratedDraft } from "./types";

function modelForType(type: ContentItem["type"]): ClaudeModel {
  switch (type) {
    case "seo_article":
      return MODELS.opus;
    default:
      return MODELS.sonnet;
  }
}

function maxTokensForType(type: ContentItem["type"]): number {
  switch (type) {
    case "linkedin_post":
      return 1_100;
    case "newsletter_edition":
      return 3_000;
    case "seo_article":
      return 6_000;
  }
}

interface GenerateOptions {
  feedback?: string;
  model?: ClaudeModel;
  /** Active la 2e passe d'auto-critique (default true pour SEO articles, false pour le reste). */
  selfReview?: boolean;
  /** Active l'évaluation auto avec retry si score < seuil (default true). */
  autoEvaluate?: boolean;
}

const QUALITY_THRESHOLD = 7; // /10
const MAX_QUALITY_RETRIES = 1;

const QUALITY_SCHEMA = `interface QualityScore {
  /** Score global sur 10. */
  score: number;
  /** Notes détaillées par critère sur 10. */
  detail: {
    clarity: number;       // clarté du message
    hook: number;          // efficacité de la 1ère ligne / titre
    voice: number;         // adhérence à la voix Next Impact
    length: number;        // respect des contraintes de longueur
    value: number;         // valeur ajoutée pour le décideur
  };
  /** Si score < 7 : 2 raisons concrètes du faible score. */
  weaknesses: string[];
}`;

/**
 * Note un draft sur 10 selon 5 critères. Léger (Sonnet, ~500 tokens output).
 */
async function evaluateDraftQuality(
  draft: GeneratedDraft,
  item: ContentItem
): Promise<{ score: number; weaknesses: string[] }> {
  const system = `Tu es éditeur expert en contenu B2B (Next Impact Digital). Tu évalues un draft sans rien réécrire — juste une note sur 5 critères.`;

  const user = `# DRAFT À ÉVALUER (type ${item.type})

## Sujet
${draft.subject}

## Corps
${draft.body.slice(0, 6000)}

# CONTEXTE
Brief : ${item.brief}
Track : ${item.trackKey}

Note ce draft sur 10 selon : clarté, hook, voix Next Impact, longueur, valeur ajoutée.
Si score global < 7, indique 2 raisons concrètes de cette note.`;

  try {
    const result = await callClaudeJson<{
      score?: number;
      weaknesses?: string[];
    }>({
      model: MODELS.sonnet,
      cachedSystem: await getExtendedBrandBlock(),
      system,
      user,
      jsonShape: QUALITY_SCHEMA,
      maxTokens: 500,
      temperature: 0.2,
      maxRetries: 1,
    });

    const json = result.json;
    if (!json || typeof json.score !== "number") {
      return { score: 10, weaknesses: [] };
    }
    return {
      score: json.score,
      weaknesses: Array.isArray(json.weaknesses) ? json.weaknesses : [],
    };
  } catch (err) {
    console.warn("[evaluateDraftQuality] skipped:", (err as Error).message);
    return { score: 10, weaknesses: [] };
  }
}

const CRITIQUE_SCHEMA = `interface Critique {
  /** Score global du draft sur 10. */
  score: number;
  /** 3 axes d'amélioration concrets. */
  improvements: string[];
  /** Body amélioré (markdown complet). */
  improvedBody: string;
  /** Sujet amélioré si nécessaire (sinon : null). */
  improvedSubject: string | null;
  /** Note finale après amélioration. */
  finalScore: number;
}`;

/**
 * Pipeline auto-critique : Claude critique son propre draft + l'améliore.
 */
async function selfReviewDraft(
  draft: GeneratedDraft,
  item: ContentItem
): Promise<GeneratedDraft> {
  const system = `Tu es éditeur en chef d'un blog professionnel B2B (Next Impact Digital). Tu reviens sur un draft généré par toi-même il y a quelques minutes.

Ta mission :
1. Note le draft sur 10 sur 5 critères (clarté, hook, voix, longueur, valeur ajoutée pour le décideur).
2. Identifie 3 axes d'amélioration CONCRETS (pas "améliorer la fluidité" — dis exactement quoi changer).
3. Produis une version améliorée qui applique ces 3 axes.
4. Note la version finale sur 10.

Règles :
- Ne change pas le sujet sauf si vraiment nécessaire (typo, longueur excessive).
- Ne réinvente pas le contenu : améliore-le.
- Garde la structure markdown originale.
- Si le draft initial est ≥ 9/10, dis-le et renvoie le body inchangé.`;

  const user = `# DRAFT INITIAL À CRITIQUER

## Sujet
${draft.subject}

## Corps (markdown)
${draft.body}

## Auto-critique de la 1ère passe (à compléter ou contredire)
${draft.selfReview || "(aucune)"}

# CONTEXTE
Type : ${item.type}
Track : ${item.trackKey}
Brief original : ${item.brief}

Critique ce draft puis applique 3 améliorations concrètes.`;

  const result = await callClaudeJson<{
    score?: number;
    improvements?: string[];
    improvedBody?: string;
    improvedSubject?: string | null;
    finalScore?: number;
  }>({
    model: MODELS.opus,
    cachedSystem: await getExtendedBrandBlock(),
    system,
    user,
    jsonShape: CRITIQUE_SCHEMA,
    maxTokens: 7_000,
    temperature: 0.3,
    maxRetries: 2,
  });

  const json = result.json;
  if (!json || typeof json.improvedBody !== "string") {
    console.warn("[selfReviewDraft] Critique non exploitable, draft original conservé.");
    return draft;
  }

  return {
    subject: json.improvedSubject || draft.subject,
    body: json.improvedBody,
    selfReview: `Pass 1 : ${draft.selfReview || "(aucun)"} | Pass 2 (score ${json.score ?? "?"} → ${json.finalScore ?? "?"}) : ${(json.improvements ?? []).join(" · ")}`,
    model: draft.model,
    prompt: draft.prompt,
    feedback: draft.feedback,
  };
}

async function generateOnce(
  item: ContentItem,
  system: string,
  user: string,
  model: ClaudeModel,
  feedback?: string
): Promise<GeneratedDraft> {
  const result = await callClaudeJson<Partial<GeneratedDraft>>({
    model,
    cachedSystem: await getExtendedBrandBlock(),
    system,
    user,
    jsonShape: GENERATED_DRAFT_SCHEMA,
    maxTokens: maxTokensForType(item.type),
    temperature: 0.4,
    maxRetries: 2,
  });

  const json = result.json;
  if (!json || typeof json.body !== "string" || typeof json.subject !== "string") {
    throw new Error(
      `Claude n'a pas renvoyé un JSON valide après ${result.attempts} tentatives (modèle ${model}). Texte :\n${result.text.slice(0, 400)}`
    );
  }

  return {
    subject: json.subject,
    body: json.body,
    selfReview: typeof json.selfReview === "string" ? json.selfReview : "",
    model,
    prompt: `${system}\n\n---\n\n${user}`,
    feedback,
  };
}

export async function generateDraft(
  item: ContentItem,
  options: GenerateOptions = {}
): Promise<GeneratedDraft> {
  const { system, user } = buildPromptForItem(item);
  const userWithFeedback = options.feedback
    ? `${user}\n\nRetour humain à intégrer :\n${options.feedback}`
    : user;

  const model = options.model ?? modelForType(item.type);

  // Pass 1 : génération initiale
  let initialDraft = await generateOnce(item, system, userWithFeedback, model, options.feedback);

  // Évaluation automatique : si score < 7, on régénère 1 fois
  const enableEval = options.autoEvaluate ?? true;
  if (enableEval) {
    const quality = await evaluateDraftQuality(initialDraft, item);
    if (quality.score < QUALITY_THRESHOLD && quality.weaknesses.length > 0) {
      const retryFeedback = [
        options.feedback,
        `Le draft précédent a obtenu ${quality.score}/10. Faiblesses identifiées :`,
        ...quality.weaknesses.map((w, i) => `${i + 1}. ${w}`),
        "Régénère en corrigeant ces points spécifiques.",
      ].filter(Boolean).join("\n");

      let attempts = 0;
      while (attempts < MAX_QUALITY_RETRIES) {
        const retried = await generateOnce(
          item,
          system,
          `${user}\n\nRetour humain à intégrer :\n${retryFeedback}`,
          model,
          retryFeedback
        );
        const retryQuality = await evaluateDraftQuality(retried, item);
        if (retryQuality.score >= quality.score) {
          initialDraft = {
            ...retried,
            selfReview: `${retried.selfReview}\n[Auto-eval: ${quality.score} → ${retryQuality.score}]`,
          };
          break;
        }
        attempts++;
      }
    } else if (quality.score >= QUALITY_THRESHOLD) {
      initialDraft = {
        ...initialDraft,
        selfReview: `${initialDraft.selfReview}\n[Auto-eval OK: ${quality.score}/10]`,
      };
    }
  }

  // Pass 2 : auto-critique (par défaut activée sur SEO articles)
  const enableSelfReview = options.selfReview ?? (item.type === "seo_article");

  if (enableSelfReview) {
    return await selfReviewDraft(initialDraft, item);
  }

  return initialDraft;
}

function buildPromptForItem(item: ContentItem): { system: string; user: string } {
  switch (item.type) {
    case "linkedin_post":
      return buildLinkedInPrompt(item);
    case "newsletter_edition":
      return buildNewsletterPrompt(item);
    case "seo_article":
      return buildSeoArticlePrompt(item);
  }
}
