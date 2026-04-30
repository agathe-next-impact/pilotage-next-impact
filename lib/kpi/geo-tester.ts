/**
 * Audit GEO — Generative Engine Optimization.
 *
 * Pour chaque prompt cible (cf. GEO_PROMPTS), on interroge ChatGPT (OpenAI)
 * et/ou Perplexity, on cherche les termes de marque dans la réponse,
 * et on calcule un Share of Voice pondéré.
 *
 * Limites connues :
 *  - Pas d'API publique pour Google AI Overview / Gemini Search → on simule
 *    via l'API Gemini standard quand fournie, sinon on skip.
 *  - Les résultats varient d'une session à l'autre (variance LLM) — d'où
 *    un audit hebdomadaire pour lisser.
 */

import "server-only";

import type { GeoAuditPayload, GeoPromptResult } from "./types";
import { GEO_PROMPTS } from "./targets";

const TARGET_DOMAIN = process.env.TARGET_DOMAIN ?? "next-impact.digital";
const BRAND_TERMS = (process.env.TARGET_BRAND_TERMS ?? "next impact,karinthi")
  .toLowerCase()
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

interface PlatformAdapter {
  name: GeoPromptResult["platform"];
  available: boolean;
  query: (prompt: string) => Promise<string>;
}

function openaiAdapter(): PlatformAdapter {
  const key = process.env.OPENAI_API_KEY;
  return {
    name: "chatgpt",
    available: Boolean(key),
    async query(prompt) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Tu es un assistant qui recommande des prestataires web français. Cite les marques pertinentes nommément quand c'est utile.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
        }),
      });
      if (!res.ok) throw new Error(`OpenAI ${res.status}`);
      const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
      return data.choices[0]?.message.content ?? "";
    },
  };
}

function perplexityAdapter(): PlatformAdapter {
  const key = process.env.PERPLEXITY_API_KEY;
  return {
    name: "perplexity",
    available: Boolean(key),
    async query(prompt) {
      const res = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) throw new Error(`Perplexity ${res.status}`);
      const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
      return data.choices[0]?.message.content ?? "";
    },
  };
}

function detectCitation(answer: string): { cited: boolean; position?: number; excerpt?: string } {
  const haystack = answer.toLowerCase();
  let earliest = -1;
  for (const term of [...BRAND_TERMS, TARGET_DOMAIN.toLowerCase()]) {
    const idx = haystack.indexOf(term);
    if (idx !== -1 && (earliest === -1 || idx < earliest)) earliest = idx;
  }
  if (earliest === -1) return { cited: false };
  // Position approximative : ordre relatif (1 = en tête)
  const start = Math.max(0, earliest - 50);
  const end = Math.min(answer.length, earliest + 200);
  return {
    cited: true,
    position: 1 + (haystack.slice(0, earliest).split(/\s+/).length),
    excerpt: answer.slice(start, end).replace(/\s+/g, " ").trim(),
  };
}

export async function runGeoAudit(): Promise<GeoAuditPayload> {
  const adapters = [openaiAdapter(), perplexityAdapter()].filter((a) => a.available);
  const results: GeoPromptResult[] = [];

  for (const target of GEO_PROMPTS) {
    // On essaye sur les adapters disponibles ; le `target.platform` est indicatif.
    for (const adapter of adapters) {
      try {
        const answer = await adapter.query(target.prompt);
        const detection = detectCitation(answer);
        results.push({
          prompt: target.prompt,
          platform: adapter.name,
          cited: detection.cited,
          position: detection.position,
          excerpt: detection.excerpt,
        });
      } catch (err) {
        results.push({
          prompt: target.prompt,
          platform: adapter.name,
          cited: false,
          excerpt: `Erreur audit : ${(err as Error).message}`,
        });
      }
    }
  }

  return {
    ranAt: new Date().toISOString(),
    prompts: results,
  };
}

/**
 * Calcule le Share of Voice pondéré à partir des résultats d'un audit.
 * Chaque prompt a un poids défini dans GEO_PROMPTS (1.0–1.5).
 * SoV = Σ(poids des prompts cités) / Σ(poids total) — sur l'ensemble des plateformes.
 */
export function computeShareOfVoice(payload: GeoAuditPayload): {
  shareOfVoice: number;
  citationsCount: number;
} {
  const totalWeight = GEO_PROMPTS.reduce((sum, p) => sum + p.weight, 0);
  // Compte les prompts cités (si cité sur ≥1 plateforme on retient 1× le poids)
  const promptToWeight = new Map<string, number>(
    GEO_PROMPTS.map((p) => [p.prompt as string, p.weight])
  );
  const citedPrompts = new Set<string>();
  let citationsCount = 0;
  for (const r of payload.prompts) {
    if (r.cited) {
      citationsCount++;
      citedPrompts.add(r.prompt);
    }
  }
  const cumulativeWeight = [...citedPrompts].reduce(
    (sum, p) => sum + (promptToWeight.get(p) ?? 0),
    0
  );
  const shareOfVoice = totalWeight === 0 ? 0 : cumulativeWeight / totalWeight;
  return { shareOfVoice: Number(shareOfVoice.toFixed(3)), citationsCount };
}
