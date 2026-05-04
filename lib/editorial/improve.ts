/**
 * Polish d'un brouillon utilisateur par Claude — sans changer son intention.
 * Utilisé par les boutons "Améliorer avec Claude" sur les champs éditables.
 * SERVER-ONLY.
 */

import "server-only";

import { callClaude, MODELS } from "./anthropic";
import { getExtendedBrandBlock } from "./prompts";

export type ImproveFieldType =
  | "weekly_theme_title"
  | "weekly_theme_summary"
  | "weekly_theme_directive"
  | "post_subject"
  | "hook_linkedin"
  | "hook_newsletter"
  | "hook_seo"
  | "post_body_linkedin"
  | "post_body_newsletter"
  | "post_body_seo";

interface ImproveOptions {
  /** Type de champ → contraintes de format */
  type: ImproveFieldType;
  /** Brouillon écrit par l'utilisatrice */
  draft: string;
  /** Contexte additionnel : sujet du post, brief, semaine… */
  context?: string;
}

const FIELD_INSTRUCTIONS: Record<ImproveFieldType, { name: string; rules: string }> = {
  weekly_theme_title: {
    name: "Titre de thème hebdomadaire",
    rules: "8-12 mots maximum. Doit poser un angle stratégique précis. Sans verbe à l'impératif. Sans emoji.",
  },
  weekly_theme_summary: {
    name: "Résumé de thème hebdomadaire",
    rules: "2 à 3 phrases. Explique pourquoi cette semaine doit traiter ce sujet maintenant. Cite un chiffre ou un fait concret si possible.",
  },
  weekly_theme_directive: {
    name: "Directive d'action courte",
    rules: "1 phrase impérative courte (≤15 mots). Doit indiquer concrètement quoi faire (publier, réagir, citer, etc.).",
  },
  post_subject: {
    name: "Sujet de post",
    rules: "Phrase courte (≤140 caractères) qui résume le post. Pas de hook ici, pas d'emoji, pas de question rhétorique.",
  },
  hook_linkedin: {
    name: "Hook de post LinkedIn (1ère ligne)",
    rules: "≤18 mots. Stoppe le scroll. Pas d'emoji. Pas de superlatif creux ('incroyable', 'révolutionnaire', 'unique'). Voix institutionnelle Next Impact.",
  },
  hook_newsletter: {
    name: "Objet email newsletter",
    rules: "≤60 caractères. Donne envie d'ouvrir. Ton décideur PME. Pas d'emoji. Pas de tout-majuscules.",
  },
  hook_seo: {
    name: "Titre H1 article SEO",
    rules: "≤70 caractères. Intègre le mot-clé naturellement. Pas de marketing creux.",
  },
  post_body_linkedin: {
    name: "Corps de post LinkedIn (markdown)",
    rules: "Entre 1100 et 1500 caractères au total. Structure : hook (1ère ligne) + 2-4 paragraphes courts + CTA final. Sans emoji. Sans superlatif creux. Conserve les sauts de ligne et la structure markdown du brouillon.",
  },
  post_body_newsletter: {
    name: "Corps d'édition newsletter (markdown)",
    rules: "Entre 800 et 2500 mots. Plusieurs sections (titres en H2/H3 markdown). Cite des chiffres et faits. CTA en fin de chaque section principale vers next-impact.digital. Conserve la structure markdown du brouillon.",
  },
  post_body_seo: {
    name: "Corps d'article SEO (markdown)",
    rules: "Entre 1500 et 3000 mots. Structure H1/H2/H3 hiérarchisée. Maillage interne explicite (next-impact.digital). Format scannable (listes à puces, tableaux). Conserve la structure markdown du brouillon.",
  },
};

/**
 * Demande à Claude de polir un brouillon en gardant son intention.
 * Retourne uniquement le texte amélioré (pas de markdown, pas de guillemets).
 */
export async function improveText(opts: ImproveOptions): Promise<string> {
  const fieldDef = FIELD_INSTRUCTIONS[opts.type];
  if (!fieldDef) throw new Error(`Type de champ inconnu : ${opts.type}`);

  const cleanedDraft = opts.draft.trim();
  if (cleanedDraft.length === 0) {
    throw new Error("Brouillon vide — écris d'abord quelque chose à améliorer.");
  }

  const system = `Tu es éditeur pour Next Impact Digital.
Mission : POLIR un brouillon écrit par l'auteure, en respectant strictement son intention.

Règles non négociables :
- N'ajoute aucune information non présente dans le brouillon.
- Ne change ni l'angle ni le sujet — uniquement la formulation.
- Si le brouillon est déjà bon, fais peu de changements (1 mot, 1 ponctuation).
- Si le brouillon est mauvais, propose une version qui aurait pu être écrite par l'auteure (même angle, mieux dit).
- Respecte les règles du champ "${fieldDef.name}" :
  ${fieldDef.rules}
- Respecte la voix Next Impact (lexique préféré, lexique banni, anti-commercial, anti-métaphore).

Format de réponse : uniquement le texte amélioré, sans guillemets, sans préfixe, sans markdown, sans commentaire.`;

  const user = `# Brouillon à polir
${cleanedDraft}

${opts.context ? `# Contexte\n${opts.context}\n` : ""}
Renvoie uniquement la version améliorée.`;

  const result = await callClaude({
    model: MODELS.sonnet,
    cachedSystem: await getExtendedBrandBlock(),
    system,
    user,
    maxTokens: 600,
    temperature: 0.4,
    maxRetries: 1,
  });

  // Nettoyage : trim, suppression de guillemets entourants éventuels
  let out = result.text.trim();
  if (
    (out.startsWith('"') && out.endsWith('"')) ||
    (out.startsWith('«') && out.endsWith('»'))
  ) {
    out = out.slice(1, -1).trim();
  }
  if (out.length === 0) {
    throw new Error("Claude a renvoyé un texte vide.");
  }
  return out;
}
