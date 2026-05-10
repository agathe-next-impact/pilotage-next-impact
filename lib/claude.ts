/**
 * Wrapper minimal Anthropic SDK pour les synthèses mensuelles.
 * SERVER-ONLY.
 */

import "server-only";

import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

function client(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquant.");
  _client = new Anthropic({ apiKey });
  return _client;
}

export interface CallOptions {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export const MODELS = {
  sonnet: "claude-sonnet-4-6",
  opus: "claude-opus-4-6",
} as const;

export async function callClaude(opts: CallOptions): Promise<{ text: string; model: string }> {
  const c = client();
  const model = opts.model ?? MODELS.sonnet;
  const resp = await c.messages.create({
    model,
    max_tokens: opts.maxTokens ?? 2_000,
    temperature: opts.temperature ?? 0.4,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });
  let text = "";
  for (const block of resp.content) {
    if (block.type === "text") text += block.text;
  }
  return { text: text.trim(), model };
}
