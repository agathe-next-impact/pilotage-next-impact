"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import {
  parseSharesCsv,
  parseArticlesCsv,
  parseMetricsCsv,
  buildSharesPreview,
  buildArticlesPreview,
  buildMetricsPreview,
  executeImport,
  type PreviewRow,
} from "@/lib/editorial/linkedin-import";

interface ParseState {
  ok: boolean;
  message?: string;
  rows?: PreviewRow[];
  kind?: "shares" | "articles" | "metrics";
}

/**
 * Parse l'export uploadé et renvoie les PreviewRow (matchage URL effectué).
 * Utilisé via useActionState côté client.
 */
export async function parseImportAction(
  _prev: ParseState,
  formData: FormData
): Promise<ParseState> {
  await requireSession();

  const file = formData.get("file");
  const kind = String(formData.get("kind") ?? "");

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Aucun fichier fourni." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, message: "Fichier trop gros (>5 Mo)." };
  }
  if (!["shares", "articles", "metrics"].includes(kind)) {
    return { ok: false, message: "Type d'import invalide." };
  }

  const text = await file.text();
  let rows: PreviewRow[];
  try {
    if (kind === "shares") {
      const parsed = parseSharesCsv(text);
      rows = await buildSharesPreview(parsed);
    } else if (kind === "articles") {
      const parsed = parseArticlesCsv(text);
      rows = await buildArticlesPreview(parsed);
    } else {
      const parsed = parseMetricsCsv(text);
      rows = await buildMetricsPreview(parsed);
    }
  } catch (err) {
    return { ok: false, message: `Erreur de parsing : ${(err as Error).message}` };
  }

  if (rows.length === 0) {
    return { ok: false, message: "Aucune ligne valide trouvée. Vérifie l'en-tête du fichier." };
  }

  return {
    ok: true,
    rows,
    kind: kind as "shares" | "articles" | "metrics",
    message: `${rows.length} ligne(s) parsée(s).`,
  };
}

const ExecuteSchema = z.object({
  rowsJson: z.string().min(2),
  decisionsJson: z.string().min(2),
});

interface ExecuteState {
  ok: boolean;
  message?: string;
  result?: { itemsCreated: number; itemsUpdated: number; metricsAdded: number; skipped: number };
}

export async function executeImportAction(
  _prev: ExecuteState,
  formData: FormData
): Promise<ExecuteState> {
  await requireSession();

  let rows: PreviewRow[];
  let decisions: Record<number, string>;
  try {
    const parsed = ExecuteSchema.parse({
      rowsJson: formData.get("rowsJson"),
      decisionsJson: formData.get("decisionsJson"),
    });
    rows = JSON.parse(parsed.rowsJson) as PreviewRow[];
    decisions = JSON.parse(parsed.decisionsJson) as Record<number, string>;
  } catch (err) {
    return { ok: false, message: `Données invalides : ${(err as Error).message}` };
  }

  try {
    const result = await executeImport({ rows, decisions });
    revalidatePath("/pilotage/contenus/archive");
    revalidatePath("/pilotage/contenus");
    return {
      ok: true,
      result,
      message: `${result.itemsCreated} créé(s), ${result.itemsUpdated} mis à jour, ${result.metricsAdded} métriques, ${result.skipped} ignoré(s).`,
    };
  } catch (err) {
    return { ok: false, message: `Erreur lors de l'import : ${(err as Error).message}` };
  }
}
