"use client";

import { useActionState, useState } from "react";
import { parseImportAction, executeImportAction } from "./actions";
import type { PreviewRow } from "@/lib/editorial/linkedin-import";

const KIND_LABELS = {
  shares: "Posts (Shares.csv)",
  articles: "Articles (Articles.csv)",
  metrics: "Métriques (CSV custom)",
} as const;

export function ImportClient(): React.ReactElement {
  const [parseState, parseAction, parsePending] = useActionState(parseImportAction, { ok: false });
  const [execState, execAction, execPending] = useActionState(executeImportAction, { ok: false });
  const [decisions, setDecisions] = useState<Record<number, string>>({});

  const rows = parseState.rows ?? [];

  function setDecision(index: number, value: string): void {
    setDecisions((prev) => ({ ...prev, [index]: value }));
  }

  function decisionFor(row: PreviewRow): string {
    if (decisions[row.index] !== undefined) return decisions[row.index] as string;
    // défaut : update si match, sinon create
    return row.matchedItemId ? `update:${row.matchedItemId}` : "create";
  }

  return (
    <div className="space-y-8">
      {/* === ZONE UPLOAD === */}
      <section className="rounded-lg border border-surface-muted bg-surface p-4">
        <h2 className="text-sm font-medium text-ink">1. Charger un export</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Trois formats acceptés. Pour les exports LinkedIn perso : <em>Settings → Get a copy of your data</em>, puis envoyer Shares.csv ou Articles.csv une fois reçus.
          Pour les métriques : un CSV simple avec colonnes <code>url, impressions, reactions, comments, shares, conversions</code> (séparateur , ou ;).
        </p>
        <form action={parseAction} className="mt-3 flex flex-wrap items-center gap-2">
          <select
            name="kind"
            required
            defaultValue="shares"
            className="rounded-md border border-surface-muted bg-surface px-2 py-1.5 text-sm"
          >
            {(Object.entries(KIND_LABELS) as [keyof typeof KIND_LABELS, string][]).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
          <input
            name="file"
            type="file"
            accept=".csv,.txt"
            required
            className="text-xs"
          />
          <button
            type="submit"
            disabled={parsePending}
            className="rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {parsePending ? "Analyse…" : "Analyser le fichier"}
          </button>
        </form>
        {parseState.message && (
          <p className={`mt-2 text-xs ${parseState.ok ? "text-ink-muted" : "text-red-600"}`}>
            {parseState.message}
          </p>
        )}
      </section>

      {/* === ZONE PRÉVISUALISATION === */}
      {rows.length > 0 && (
        <section className="rounded-lg border border-surface-muted bg-surface p-4">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-sm font-medium text-ink">
                2. Valider les correspondances ({rows.length} ligne·s)
              </h2>
              <p className="mt-1 text-xs text-ink-muted">
                Vert = match URL trouvé, mise à jour de l'item existant. Sinon création en archive externe (modifiable ligne par ligne).
              </p>
            </div>
            <div className="text-xs text-ink-muted">
              {rows.filter((r) => r.matchedItemId).length} match(s) auto sur {rows.length}
            </div>
          </div>

          <div className="mt-4 max-h-[600px] overflow-auto rounded-md border border-surface-muted">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-surface-muted/60 text-ink-muted">
                <tr>
                  <th className="px-2 py-2 text-left">#</th>
                  <th className="px-2 py-2 text-left">Date</th>
                  <th className="px-2 py-2 text-left">Aperçu</th>
                  <th className="px-2 py-2 text-left">URL</th>
                  <th className="px-2 py-2 text-left">Match</th>
                  <th className="px-2 py-2 text-left">Décision</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isMatched = !!row.matchedItemId;
                  return (
                    <tr
                      key={row.index}
                      className={`border-t border-surface-muted/50 ${isMatched ? "bg-emerald-50/30" : ""}`}
                    >
                      <td className="px-2 py-1.5 text-ink-subtle">{row.index}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-ink-muted">
                        {row.date ? new Date(row.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" }) : "—"}
                      </td>
                      <td className="max-w-[280px] truncate px-2 py-1.5 text-ink" title={row.contentPreview ?? ""}>
                        {row.title ?? "—"}
                      </td>
                      <td className="max-w-[180px] truncate px-2 py-1.5 text-ink-muted">
                        <a href={row.url} target="_blank" rel="noreferrer" className="hover:underline">
                          {row.url.replace(/^https?:\/\//, "").slice(0, 40)}…
                        </a>
                      </td>
                      <td className="px-2 py-1.5">
                        {row.matchedItemId ? (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                            #{row.matchedItemId} {row.matchedItemSubject?.slice(0, 30)}
                          </span>
                        ) : (
                          <span className="text-ink-subtle">aucun</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={decisionFor(row)}
                          onChange={(e) => setDecision(row.index, e.target.value)}
                          className="rounded border border-surface-muted bg-surface px-1 py-0.5 text-[11px]"
                        >
                          {row.matchedItemId && (
                            <option value={`update:${row.matchedItemId}`}>Mettre à jour #{row.matchedItemId}</option>
                          )}
                          <option value="create">Créer en archive externe</option>
                          <option value="skip">Ignorer</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <form action={execAction} className="mt-4 flex items-center justify-end gap-3">
            <input type="hidden" name="rowsJson" value={JSON.stringify(rows)} />
            <input type="hidden" name="decisionsJson" value={JSON.stringify(decisions)} />
            <button
              type="submit"
              disabled={execPending}
              className="rounded-md bg-accent px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {execPending ? "Import en cours…" : `Lancer l'import (${rows.filter((r) => decisionFor(r) !== "skip").length} ligne·s)`}
            </button>
          </form>
        </section>
      )}

      {/* === RÉSULTAT === */}
      {execState.message && (
        <section
          className={`rounded-lg border p-4 ${
            execState.ok ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"
          }`}
        >
          <p className={`text-sm font-medium ${execState.ok ? "text-emerald-800" : "text-red-800"}`}>
            {execState.message}
          </p>
          {execState.result && (
            <ul className="mt-2 text-xs text-emerald-700">
              <li>Items créés : <strong>{execState.result.itemsCreated}</strong></li>
              <li>Items mis à jour : <strong>{execState.result.itemsUpdated}</strong></li>
              <li>Métriques ajoutées : <strong>{execState.result.metricsAdded}</strong></li>
              <li>Lignes ignorées : <strong>{execState.result.skipped}</strong></li>
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
