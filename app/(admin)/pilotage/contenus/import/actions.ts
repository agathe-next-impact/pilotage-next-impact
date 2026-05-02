"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import {
  parseAndPreview,
  executeImport,
  type PreviewRow,
  type ImportKind,
} from "@/lib/editorial/linkedin-import";

interface ParseState {
  ok: boolean;
  message?: string;
  rows?: PreviewRow[];
  kind?: ImportKind;
}

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
  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, message: "Fichier trop gros (>10 Mo)." };
  }
  if (!["shares", "articles", "metrics", "substack"].includes(kind)) {
    return { ok: false, message: "Type d'import invalide." };
  }

  let rows: PreviewRow[];
  try {
    rows = await parseAndPreview(file, kind as ImportKind);
  } catch (err) {
    return { ok: false, message: `Erreur de parsing : ${(err as Error).message}` };
  }

  if (rows.length === 0) {
    return {
      ok: false,
      message:
        "Aucune ligne valide trouvée. Vérifie l'en-tête du fichier (colonne URL obligatoire : url, sharelink, articlelink…).",
    };
  }

  const withMetrics = rows.filter((r) => r.hasMetrics).length;
  return {
    ok: true,
    rows,
    kind: kind as ImportKind,
    message: `${rows.length} ligne(s) parsée(s)${withMetrics > 0 ? ` · ${withMetrics} avec métriques` : ""}.`,
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
