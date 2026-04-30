/**
 * POST /api/editorial/generate-stream/[id]
 * Stream SSE de génération Claude pour un ContentItem.
 * À l'écoute côté client : EventSource ou fetch + ReadableStream.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getContentItem, attachDraft } from "@/lib/editorial/store";
import { streamClaude, MODELS } from "@/lib/editorial/anthropic";
import {
  EXTENDED_BRAND_BLOCK,
  getExtendedBrandBlock,
  buildLinkedInPrompt,
  buildNewsletterPrompt,
  buildSeoArticlePrompt,
} from "@/lib/editorial/prompts";
import type { ContentItem, GeneratedDraft } from "@/lib/editorial/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function buildPrompt(item: ContentItem): { system: string; user: string } {
  switch (item.type) {
    case "linkedin_post": return buildLinkedInPrompt(item);
    case "newsletter_edition": return buildNewsletterPrompt(item);
    case "seo_article": return buildSeoArticlePrompt(item);
  }
}

function maxTokensForType(type: ContentItem["type"]): number {
  return type === "linkedin_post" ? 1100 : type === "newsletter_edition" ? 3000 : 6000;
}

function modelForType(type: ContentItem["type"]) {
  return type === "seo_article" ? MODELS.opus : MODELS.sonnet;
}

/**
 * Format SSE : data: <json>\n\n
 */
function sse(event: string, data: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const numId = Number.parseInt(id, 10);
  if (!Number.isFinite(numId)) {
    return NextResponse.json({ error: "id invalide" }, { status: 400 });
  }

  const item = await getContentItem(numId);
  if (!item) {
    return NextResponse.json({ error: "Item introuvable" }, { status: 404 });
  }

  let feedback: string | undefined;
  try {
    const body = (await req.json()) as { feedback?: string };
    feedback = body.feedback?.trim() || undefined;
  } catch {
    // body optionnel
  }

  const { system, user } = buildPrompt(item);
  const userWithFeedback = feedback ? `${user}\n\nRetour humain :\n${feedback}` : user;
  const model = modelForType(item.type);

  // Pour le streaming, on demande à Claude de produire UNIQUEMENT le markdown du body
  // (pas de JSON enveloppe — le subject reste celui du brief, modifiable ensuite via l'éditeur).
  const streamPrompt = `${userWithFeedback}\n\nProduis UNIQUEMENT le contenu en markdown, sans JSON ni guillemets, sans préambule. Tu peux commencer directement par la première ligne.`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(sse("start", { itemId: numId, model })));

        const { fullText, usage } = await streamClaude(
          {
            model,
            cachedSystem: await getExtendedBrandBlock(),
            system,
            user: streamPrompt,
            maxTokens: maxTokensForType(item.type),
            temperature: 0.4,
          },
          {
            onText: (delta) => {
              controller.enqueue(encoder.encode(sse("delta", { text: delta })));
            },
          }
        );

        // Sauvegarde finale
        const draft: GeneratedDraft = {
          subject: item.subject,
          body: fullText,
          selfReview: "",
          model,
          prompt: `${system}\n\n---\n\n${userWithFeedback}`,
          feedback,
        };
        await attachDraft(numId, draft);

        controller.enqueue(encoder.encode(sse("done", {
          itemId: numId,
          tokensIn: usage.input_tokens,
          tokensOut: usage.output_tokens,
          cacheRead: usage.cache_read_input_tokens ?? 0,
        })));
        controller.close();
      } catch (err) {
        const msg = (err as Error).message;
        controller.enqueue(encoder.encode(sse("error", { error: msg })));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
