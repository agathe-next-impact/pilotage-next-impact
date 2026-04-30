/**
 * Wrapper Anthropic SDK — point d'entrée unique pour tous les appels Claude.
 *
 * Optimisations :
 *  - Prompt caching (ephemeral) sur le bloc BRAND stable
 *  - Tool use natif (au lieu de JSON dans le user prompt)
 *  - Retry intelligent sur JSON invalide
 *  - Modèles : Sonnet par défaut, Opus uniquement sur demande
 *
 * SERVER-ONLY.
 */

import "server-only";

import Anthropic from "@anthropic-ai/sdk";

export const MODELS = {
  opus: "claude-opus-4-6",
  sonnet: "claude-sonnet-4-6",
  haiku: "claude-haiku-4-5-20251001",
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

/** JSON schema simple pour tool use. */
export type JsonSchema = Record<string, unknown>;

export interface ToolDefinition<TInput = unknown> {
  name: string;
  description: string;
  input_schema: JsonSchema;
  _typeHint?: TInput;
}

export interface ThinkingOptions {
  budgetTokens: number;
}

export interface CallOptions<TToolInput = unknown> {
  model?: ClaudeModel;
  cachedSystem?: string;
  system?: string;
  user: string;
  tool?: ToolDefinition<TToolInput>;
  maxTokens?: number;
  temperature?: number;
  maxRetries?: number;
  thinking?: ThinkingOptions;
}

export interface CallResult<TToolInput = unknown> {
  text: string;
  toolInput: TToolInput | null;
  model: ClaudeModel;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
  attempts: number;
}

const DEFAULT_RETRIES = 2;
const MIN_CACHEABLE_TOKENS = 1024;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function buildSystemBlocks(
  cachedSystem: string | undefined,
  system: string | undefined
): Anthropic.Messages.TextBlockParam[] | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocks: any[] = [];
  if (cachedSystem) {
    const tokens = estimateTokens(cachedSystem);
    if (tokens >= MIN_CACHEABLE_TOKENS) {
      blocks.push({
        type: "text",
        text: cachedSystem,
        cache_control: { type: "ephemeral" },
      });
    } else {
      blocks.push({ type: "text", text: cachedSystem });
    }
  }
  if (system) {
    blocks.push({ type: "text", text: system });
  }
  return blocks.length > 0 ? (blocks as Anthropic.Messages.TextBlockParam[]) : undefined;
}

export async function callClaude<TToolInput = unknown>(
  opts: CallOptions<TToolInput>
): Promise<CallResult<TToolInput>> {
  const a = client();
  const model = opts.model ?? MODELS.sonnet;
  const maxTokens = opts.maxTokens ?? 2048;
  const temperature = opts.temperature ?? 0.5;
  const maxRetries = opts.maxRetries ?? DEFAULT_RETRIES;

  const systemBlocks = buildSystemBlocks(opts.cachedSystem, opts.system);

  let lastError: Error | null = null;
  let lastText = "";

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const correctionPrefix = attempt > 1
      ? `IMPORTANT : à l'essai précédent, ta réponse n'était pas exploitable (${lastError?.message ?? "format invalide"}).
Cette fois-ci, utilise STRICTEMENT l'outil fourni avec le schéma demandé.

`
      : "";

    const userContent = correctionPrefix + opts.user;

    try {
      const params: Anthropic.Messages.MessageCreateParamsNonStreaming = {
        model,
        max_tokens: maxTokens,
        temperature,
        ...(systemBlocks ? { system: systemBlocks } : {}),
        messages: [{ role: "user", content: userContent }],
      };

      if (opts.thinking) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (params as any).thinking = {
          type: "enabled",
          budget_tokens: opts.thinking.budgetTokens,
        };
      }

      if (opts.tool) {
        params.tools = [
          {
            name: opts.tool.name,
            description: opts.tool.description,
            input_schema: opts.tool.input_schema as Anthropic.Messages.Tool.InputSchema,
          },
        ];
        params.tool_choice = { type: "tool", name: opts.tool.name };
      }

      const resp = await a.messages.create(params);

      let text = "";
      let toolInput: TToolInput | null = null;
      for (const block of resp.content) {
        if (block.type === "text") text += block.text;
        else if (block.type === "tool_use" && opts.tool && block.name === opts.tool.name) {
          toolInput = block.input as TToolInput;
        }
      }
      lastText = text;

      if (opts.tool && !toolInput) {
        throw new Error("Claude n'a pas appelé le tool requis.");
      }

      const usage = resp.usage as Anthropic.Messages.Usage & {
        cache_read_input_tokens?: number;
        cache_creation_input_tokens?: number;
      };

      return {
        text,
        toolInput,
        model,
        usage: {
          input_tokens: usage.input_tokens,
          output_tokens: usage.output_tokens,
          cache_read_input_tokens: usage.cache_read_input_tokens,
          cache_creation_input_tokens: usage.cache_creation_input_tokens,
        },
        attempts: attempt,
      };
    } catch (err) {
      lastError = err as Error;
      if (attempt > maxRetries) {
        throw new Error(
          `Claude appel échoué après ${attempt} tentatives : ${lastError.message}\nDernier texte :\n${lastText.slice(0, 400)}`
        );
      }
    }
  }

  throw new Error("callClaude : flux inattendu");
}

/**
 * Helper pour les anciens appels JSON-in-text (rétrocompat).
 */
export async function callClaudeJson<T = unknown>(opts: {
  model?: ClaudeModel;
  cachedSystem?: string;
  system?: string;
  user: string;
  jsonShape: string;
  maxTokens?: number;
  temperature?: number;
  maxRetries?: number;
  thinking?: ThinkingOptions;
}): Promise<{ json: T | null; text: string; model: ClaudeModel; attempts: number }> {
  const result = await callClaude({
    model: opts.model,
    cachedSystem: opts.cachedSystem,
    system: opts.system,
    user: `${opts.user}\n\n# Format de réponse\nRéponds UNIQUEMENT par un objet JSON valide :\n\n\`\`\`typescript\n${opts.jsonShape}\n\`\`\`\n\nLe premier caractère de ta réponse doit être \`{\`.`,
    maxTokens: opts.maxTokens,
    temperature: opts.temperature,
    maxRetries: opts.maxRetries,
    thinking: opts.thinking,
  });

  let json: T | null = null;
  const trimmed = result.text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try { json = JSON.parse(trimmed) as T; } catch { /* fallthrough */ }
  }
  if (json === null) {
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fence?.[1]) {
      try { json = JSON.parse(fence[1]) as T; } catch { /* fallthrough */ }
    }
  }
  if (json === null) {
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first !== -1 && last > first) {
      try { json = JSON.parse(trimmed.slice(first, last + 1)) as T; } catch { /* fallthrough */ }
    }
  }

  return { json, text: result.text, model: result.model, attempts: result.attempts };
}

// =============================================================================
// Streaming — pour les longs formats (newsletter, article SEO)
// =============================================================================

export interface StreamCallbacks {
  onText?: (delta: string, accumulated: string) => void;
  onDone?: (fullText: string, usage: CallResult["usage"]) => void;
  onError?: (error: Error) => void;
}

export interface StreamOptions {
  model?: ClaudeModel;
  cachedSystem?: string;
  system?: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}

export async function streamClaude(
  opts: StreamOptions,
  callbacks: StreamCallbacks = {}
): Promise<{ fullText: string; usage: CallResult["usage"]; model: ClaudeModel }> {
  const a = client();
  const model = opts.model ?? MODELS.sonnet;
  const maxTokens = opts.maxTokens ?? 4096;
  const temperature = opts.temperature ?? 0.4;

  const systemBlocks = buildSystemBlocks(opts.cachedSystem, opts.system);

  let fullText = "";
  let usage: CallResult["usage"] = { input_tokens: 0, output_tokens: 0 };

  try {
    const stream = a.messages.stream({
      model,
      max_tokens: maxTokens,
      temperature,
      ...(systemBlocks ? { system: systemBlocks } : {}),
      messages: [{ role: "user", content: opts.user }],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        const delta = event.delta.text;
        fullText += delta;
        callbacks.onText?.(delta, fullText);
      }
    }

    const finalMessage = await stream.finalMessage();
    const u = finalMessage.usage as Anthropic.Messages.Usage & {
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    };
    usage = {
      input_tokens: u.input_tokens,
      output_tokens: u.output_tokens,
      cache_read_input_tokens: u.cache_read_input_tokens,
      cache_creation_input_tokens: u.cache_creation_input_tokens,
    };
    callbacks.onDone?.(fullText, usage);
    return { fullText, usage, model };
  } catch (err) {
    const error = err as Error;
    callbacks.onError?.(error);
    throw error;
  }
}
