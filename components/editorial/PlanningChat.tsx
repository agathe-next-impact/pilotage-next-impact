"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitPlanningInputAction } from "@/app/(admin)/pilotage/contenus/planning/actions";

const SUGGESTIONS = [
  "Je suis en déplacement client toute la semaine prochaine, décale les posts non urgents",
  "Le barème AGEFIPH 2027 vient de sortir, ajoute un post réactif sur la campagne B",
  "Le client Comme des Fous m'autorise à citer ses résultats nominativement",
  "L'engagement LinkedIn baisse depuis 2 semaines, change de format",
  "J'ai besoin de prioriser les posts qui ramènent des leads DAF d'ici fin du mois",
];

export function PlanningChat(): React.ReactElement {
  const router = useRouter();
  const [text, setText] = useState("");
  const [weekStart, setWeekStart] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent): void {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (text.trim().length < 5) {
      setError("Saisis au moins 5 caractères.");
      return;
    }
    const fd = new FormData();
    fd.append("rawInput", text.trim());
    if (weekStart) fd.append("weekStart", weekStart);

    startTransition(async () => {
      try {
        await submitPlanningInputAction(fd);
        setSuccess("Claude a analysé ton input. Voir la proposition ci-dessous.");
        setText("");
        setWeekStart("");
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <div className="rounded-md border border-surface-muted bg-surface p-4">
      <h3 className="text-sm font-medium text-ink">
        Saisis un facteur qui impacte ton planning
      </h3>
      <p className="mt-1 text-xs text-ink-muted">
        Claude analyse ton message + tes KPIs récents + ton plan en cours, et propose
        des ajustements concrets que tu peux accepter ou refuser.
      </p>

      <form onSubmit={onSubmit} className="mt-3 space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Ex : 'Je serai en déplacement la semaine du 12 mai, décale les posts non urgents…'"
          className="w-full rounded-md border border-surface-muted bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          disabled={isPending}
        />

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-ink-muted">
            Semaine impactée (optionnel)
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              className="rounded-md border border-surface-muted bg-surface px-2 py-1 text-xs text-ink"
              disabled={isPending}
            />
          </label>
          <button
            type="submit"
            disabled={isPending || text.trim().length < 5}
            className="ml-auto rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-50"
          >
            {isPending ? "Analyse en cours…" : "Analyser & proposer"}
          </button>
        </div>

        {error ? (
          <p className="rounded-md bg-danger-light px-3 py-2 text-xs text-danger">{error}</p>
        ) : null}
        {success ? (
          <p className="rounded-md bg-success-light px-3 py-2 text-xs text-success">{success}</p>
        ) : null}
      </form>

      <details className="mt-4 text-xs text-ink-subtle">
        <summary className="cursor-pointer font-medium hover:text-ink">
          💡 Exemples de facteurs qu'on peut signaler à Claude
        </summary>
        <ul className="mt-2 space-y-1.5 pl-4">
          {SUGGESTIONS.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => setText(s)}
                className="text-left text-ink-muted hover:text-accent"
              >
                — {s}
              </button>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
