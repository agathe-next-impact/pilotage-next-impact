/**
 * Service de génération de contenu — orchestre Claude pour les 3 types.
 * SERVER-ONLY.
 */

import "server-only";

import { callClaude, MODELS, type ClaudeModel } from "./anthropic";
import {
  GENERATED_DRAFT_SCHEMA,
  buildLinkedInPrompt,
  buildNewsletterPrompt,
  buildSeoArticlePrompt,
} from "./prompts";
import type { ContentItem, GeneratedDraft } from "./types";

function modelForType(type: ContentItem["type"]): ClaudeModel {
  switch (type) {
    case "linkedin_post":
      return MODELS.sonnet; // posts courts → Sonnet suffit, plus rapide/moins cher
    case "newsletter_edition":
    case "seo_article":
      return MODELS.opus; // longs formats → Opus pour la qualité éditoriale
  }
}

function maxTokensForType(type: ContentItem["type"]): number {
  switch (type) {
    case "linkedin_post":
      return 1_200;
    case "newsletter_edition":
      return 4_000;
    case "seo_article":
      return 8_000;
  }
}

interface GenerateOptions {
  /** Feedback humain pour une régénération (optionnel). */
  feedback?: string;
  /** Override du modèle. */
  model?: ClaudeModel;
}

export async function generateDraft(
  item: ContentItem,
  options: GenerateOptions = {}
): Promise<GeneratedDraft> {
  const { system, user } = buildPromptForItem(item);
  const userWithFeedback = options.feedback
    ? `${user}\n\nRetour humain à intégrer dans cette nouvelle version :\n${options.feedback}`
    : user;

  const model = options.model ?? modelForType(item.type);

  const result = await callClaude({
    model,
    system,
    user: userWithFeedback,
    jsonShape: GENERATED_DRAFT_SCHEMA,
    maxTokens: maxTokensForType(item.type),
    temperature: 0.4,
  });

  const json = result.json as Partial<GeneratedDraft> | null;
  if (!json || typeof json.body !== "string" || typeof json.subject !== "string") {
    throw new Error(
      `Claude n'a pas renvoyé un JSON valide (modèle ${model}). Texte brut :\n${result.text.slice(0, 400)}`
    );
  }

  return {
    subject: json.subject,
    body: json.body,
    selfReview: typeof json.selfReview === "string" ? json.selfReview : "",
    model,
    prompt: `${system}\n\n---\n\n${userWithFeedback}`,
    feedback: options.feedback,
  };
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
