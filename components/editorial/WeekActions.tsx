"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { suggestThemesAction } from "@/app/(admin)/pilotage/contenus/planning/actions";

const ACTUALITY_HINTS = [
  "Le décret AGEFIPH du 15 mai change le barème — intégrer cette actu",
  "Webflow vient d'annoncer X — réagir avec un post comparatif",
  "Comme des Fous a sorti une nouvelle fonctionnalité — citer le cas",
  "Next.js 16 sorti — capitaliser sur la veille technique",
  "Audit ANSSI sur WP en sortie — angle sécurité",
  "Conférence WP Paris la semaine prochaine — se positionner",
];

export function WeekActions({ weekStart }: { weekStart: string }): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [scope, setScope] = useState<"this" | "next4">("this");
  const [prompt, setPrompt] = useState("");
  const [showHints, setShowHints] = useState(false);

  function suggest(replace: boolean): void {
    const fd = new FormData();
    fd.append("fromWeek", weekStart);
    fd.append("weekCount", scope === "this" ? "1" : "4");
    fd.append("proposalsPerWeek", "3");
    if (prompt.trim()) fd.append("userPrompt", prompt.trim());
    fd.append("replace", replace ? "1" : "0");
    startTransition(async () => {
      try {
        await suggestThemesAction(fd);
        setPrompt("");
        setShowHints(false);
        router.refresh();
      } catch (err) {
        alert((err as Error).message);
      }
    });
  }

  return (
    <div className="w-full rounded-md border border-surface-muted bg-surface-subtle px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-ink">
          Demander 3 thématiques à Claude
        </h3>
        <p className="text-[11px] text-ink-subtle">
          Claude intègre : KPIs · actualité business · actualité tech · actualité Next Impact · facteurs imprévus signalés
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink-muted">Portée :</span>
        <button
          type="button"
          onClick={() => setScope("this")}
          className={`rounded px-2 py-1 text-xs font-medium ${
            scope === "this"
              ? "bg-accent text-white"
              : "bg-surface text-ink-muted hover:bg-surface-muted"
          }`}
        >
          Cette semaine
        </button>
        <button
          type="button"
          onClick={() => setScope("next4")}
          className={`rounded px-2 py-1 text-xs font-medium ${
            scope === "next4"
              ? "bg-accent text-white"
              : "bg-surface text-ink-muted hover:bg-surface-muted"
          }`}
        >
          4 prochaines semaines
        </button>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={2}
        placeholder="Optionnel — actualité business/tech/Next Impact à intégrer (ex : 'décret AGEFIPH du 15 mai', 'sortie Astro 5.5', 'nouveau client Café Citoyen…')"
        className="mt-3 w-full rounded-md border border-surface-muted bg-surface px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        disabled={isPending}
      />

      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowHints((s) => !s)}
          className="text-[11px] text-ink-muted hover:text-accent"
        >
          {showHints ? "Masquer" : "Voir"} des exemples d'actualités
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => suggest(true)}
            disabled={isPending}
            className="rounded-md bg-accent px-3.5 py-2 text-xs font-medium text-white hover:bg-accent-dark disabled:opacity-50"
          >
            {isPending ? "Génération…" : prompt.trim() ? "Régénérer 3 thèmes avec ce prompt" : "Proposer 3 thèmes"}
          </button>
          {prompt.trim() ? (
            <button
              type="button"
              onClick={() => suggest(false)}
              disabled={isPending}
              className="rounded-md bg-surface-muted px-3.5 py-2 text-xs font-medium text-ink-muted hover:bg-surface-subtle disabled:opacity-50"
            >
              Ajouter (sans remplacer)
            </button>
          ) : null}
        </div>
      </div>

      {showHints ? (
        <ul className="mt-3 space-y-1 border-t border-surface-muted pt-2 text-[11px]">
          {ACTUALITY_HINTS.map((hint, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => setPrompt(hint)}
                className="text-left text-ink-muted hover:text-accent"
              >
                — {hint}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
