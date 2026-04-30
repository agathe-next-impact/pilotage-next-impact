/**
 * Helpers d'embeddings — utilisés pour mesurer la diversité sémantique
 * entre des textes (ex : 3 hooks suggérés, drafts vs winners passés).
 *
 * Provider : OpenAI text-embedding-3-small (1536 dims, ~$0.02 / 1M tokens).
 * Désactive proprement si OPENAI_API_KEY absent.
 *
 * SERVER-ONLY.
 */

import "server-only";

const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const MODEL = "text-embedding-3-small";

/**
 * True si on peut appeler l'API embeddings.
 */
export function embeddingsAvailable(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/**
 * Embed plusieurs textes en un seul appel API.
 * Retourne un vecteur par texte. Lève si OPENAI_API_KEY absent ou erreur HTTP.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY manquant pour embeddings");
  if (texts.length === 0) return [];

  const res = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      input: texts,
      encoding_format: "float",
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`OpenAI embeddings HTTP ${res.status} : ${errBody.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    data: Array<{ embedding: number[]; index: number }>;
  };

  // Tri par index pour garantir l'ordre
  const sorted = [...data.data].sort((a, b) => a.index - b.index);
  return sorted.map((d) => d.embedding);
}

/** Embed un seul texte. */
export async function embedText(text: string): Promise<number[]> {
  const [v] = await embedTexts([text]);
  if (!v) throw new Error("Embedding vide");
  return v;
}

/**
 * Cosine similarity entre 2 vecteurs (0 = orthogonaux, 1 = identiques).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Dims incompatibles : ${a.length} vs ${b.length}`);
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const va = a[i] ?? 0;
    const vb = b[i] ?? 0;
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dot / denom;
}

/** Cosine distance = 1 - similarity (0 = identiques, 1 = orthogonaux). */
export function cosineDistance(a: number[], b: number[]): number {
  return 1 - cosineSimilarity(a, b);
}

/**
 * Pour un ensemble de N vecteurs, retourne la matrice triangulaire des distances.
 * matrix[i][j] avec i < j = distance(vecteurs[i], vecteurs[j])
 */
export function pairwiseDistances(vectors: number[][]): Array<{ i: number; j: number; distance: number }> {
  const out: Array<{ i: number; j: number; distance: number }> = [];
  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      const a = vectors[i];
      const b = vectors[j];
      if (!a || !b) continue;
      out.push({ i, j, distance: cosineDistance(a, b) });
    }
  }
  return out;
}

/**
 * Identifie les paires sous le seuil de diversité.
 * threshold typique : 0.30 (en dessous = trop similaire).
 */
export function findSimilarPairs(
  vectors: number[][],
  threshold: number = 0.30
): Array<{ i: number; j: number; distance: number }> {
  return pairwiseDistances(vectors).filter((p) => p.distance < threshold);
}
