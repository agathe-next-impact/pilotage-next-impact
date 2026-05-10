"use client";

import { useActionState, useState } from "react";
import { generateAnalysisAction } from "./actions";

function currentPeriod(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function previousPeriod(): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function AnalysisGenerator(): React.ReactElement {
  const [state, action, pending] = useActionState(generateAnalysisAction, { ok: false });
  const [period, setPeriod] = useState(previousPeriod());

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <label className="text-xs">
        <span className="block text-ink-subtle">Mois (YYYY-MM)</span>
        <input
          name="period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          pattern="\d{4}-\d{2}"
          required
          className="mt-1 rounded border border-surface-muted bg-surface px-2 py-1.5 text-sm font-mono"
        />
      </label>
      <div className="flex gap-1 text-[10px]">
        <button type="button" onClick={() => setPeriod(previousPeriod())} className="text-ink-muted hover:underline">mois précédent</button>
        <span className="text-ink-subtle">|</span>
        <button type="button" onClick={() => setPeriod(currentPeriod())} className="text-ink-muted hover:underline">mois en cours</button>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-accent px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Claude analyse…" : "Générer la synthèse"}
      </button>
      {state.message && (
        <span className={`text-xs ${state.ok ? "text-emerald-700" : "text-red-600"}`}>{state.message}</span>
      )}
    </form>
  );
}
