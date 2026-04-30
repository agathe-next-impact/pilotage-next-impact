/**
 * Wrapper Anthropic SDK — un seul point d'entrée pour appeler Claude.
 *
 * Modèles utilisés :
 *  - claude-opus-4-6  → génération haute qualité (newsletter, articles SEO)
 *  - claude-sonnet-4-6 → posts LinkedIn, ajustements rapides
 *
 * SERVER-ONLY.
 */

import "server-only";

import Anthropic from "@anthropic-ai/sdk";

// Modèles Anthropic publiquement disponibles via l'API.
// claude-opus-4-7 est interne et non exposé : on utilise opus-4-6 (long format)
// et sonnet-4-6 (rapide) — cohérence des deux.
export const MODELS = {
  opus: "claude-opus-4-6",
  sonnet: "claude-sonnet-4-6",
} as const;

export type ClaudeModel = (typeof MODELS)[keyof typeof MODELS];

let _client: Anthropic | null = null;

function client(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquant.");
  _client = new Anthropic({ apiKey });
  return _client;
}

export interface CallOptions {
  model: ClaudeModel;
  system: string;
  user: string;
  /** Si fourni, Claude doit renvoyer un JSON parsable correspondant à ce schéma. */
  jsonShape?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface CallResult {
  text: string;
  /** Parsé si jsonShape fourni. */
  json: unknown | null;
  model: ClaudeModel;
  usage: { input_tokens: number; output_tokens: number };
}

/**
 * Appel non-streamé à Claude.
 * Si jsonShape est fourni, on instruit Claude à répondre exclusivement en JSON
 * et on extrait le bloc JSON de la réponse.
 */
export async function callClaude(opts: CallOptions): Promise<CallResult> {
  const a = client();
  const userBody = opts.jsonShape
    ? `${opts.user}\n\n# Format de réponse OBLIGATOIRE\nRéponds UNIQUEMENT par un objet JSON valide qui respecte ce schéma TypeScript :\n\n\`\`\`typescript\n${opts.jsonShape}\n\`\`\`\n\nRéponds DIRECTEMENT par le JSON, sans introduction, sans markdown, sans \`\`\`json\`\`\`. Le premier caractère de ta réponse doit être \`{\`.`
    : opts.user;

  const resp = await a.messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 4096,
    temperature: opts.temperature ?? 0.4,
    system: opts.system,
    messages: [{ role: "user", content: userBody }],
  });

  const block = resp.content.find((c) => c.type === "text");
  const text = block && "text" in block ? block.text : "";

  let json: unknown | null = null;
  if (opts.jsonShape) {
    json = extractJson(text);
  }

  return {
    text,
    json,
    model: opts.model,
    usage: {
      input_tokens: resp.usage.input_tokens,
      output_tokens: resp.usage.output_tokens,
    },
  };
}

/**
 * Tente de parser un JSON depuis la réponse de Claude.
 * Tolère un éventuel markdown fence ou texte introductif.
 */
function extractJson(text: string): unknown | null {
  const trimmed = text.trim();
  // Cas idéal : la réponse commence par { ou [
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // continue
    }
  }
  // Markdown fence ```json ... ```
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch && fenceMatch[1]) {
    try {
      return JSON.parse(fenceMatch[1]);
    } catch {
      // continue
    }
  }
  // Heuristique : prendre du premier { au dernier } équilibré
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    const candidate = trimmed.slice(first, last + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // continue
    }
  }
  return null;
}
