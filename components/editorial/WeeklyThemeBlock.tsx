import {
  activateThemeAction,
  rejectThemeAction,
  updateThemeFieldAction,
  updateThemeDirectivesAction,
  improveTextAction,
} from "@/app/(admin)/pilotage/contenus/planning/actions";
import { EditableField } from "./EditableField";
import type { WeeklyTheme } from "@/lib/editorial/types";

const SOURCE_LABEL: Record<WeeklyTheme["source"], string> = {
  indicative: "Trame initiale",
  claude_suggestion: "Proposé par Claude",
  user_edited: "Édité",
  applied: "Appliqué",
};

export function WeeklyThemeBlock({
  active,
  suggestions,
}: {
  active: WeeklyTheme | null;
  suggestions: WeeklyTheme[];
}): React.ReactElement {
  return (
    <div className="space-y-3">
      {/* Thème actif */}
      {active ? (
        <div className="rounded-md border-l-4 border-l-accent bg-accent-light/50 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wider text-accent-dark">
                Thème actif · {SOURCE_LABEL[active.source]}
              </p>
              <div className="mt-1 text-sm font-medium text-ink">
                <EditableField
                  initialValue={active.theme}
                  saveAction={updateThemeFieldAction}
                  improveAction={improveTextAction}
                  extraFields={{ id: active.id, field: "theme", type: "weekly_theme_title" }}
                  placeholder="Titre du thème (8-12 mots)"
                />
              </div>
              <div className="mt-1 text-xs leading-relaxed text-ink-muted">
                <EditableField
                  initialValue={active.summary}
                  saveAction={updateThemeFieldAction}
                  improveAction={improveTextAction}
                  extraFields={{ id: active.id, field: "summary", type: "weekly_theme_summary" }}
                  multiline
                  rows={3}
                  placeholder="Résumé en 2-3 phrases"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                {active.primaryCampaign ? (
                  <span className="rounded bg-accent-light px-1.5 py-0.5 font-medium text-accent-dark">
                    Campagne {active.primaryCampaign}
                  </span>
                ) : null}
                {active.primaryCluster ? (
                  <span className="rounded bg-success-light px-1.5 py-0.5 font-medium text-success">
                    Cluster {active.primaryCluster}
                  </span>
                ) : null}
                {active.primaryPillar ? (
                  <span className="rounded bg-violet-light px-1.5 py-0.5 font-medium text-violet">
                    Pilier NL {active.primaryPillar}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 text-xs text-ink">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-ink-subtle">
                  Directives d'action (1 par ligne)
                </p>
                <EditableField
                  initialValue={active.actionDirectives.join("\n")}
                  saveAction={updateThemeDirectivesAction}
                  extraFields={{ id: active.id }}
                  multiline
                  rows={Math.max(2, active.actionDirectives.length + 1)}
                  placeholder="Aucune directive — clique pour en ajouter"
                  className="font-mono text-[11px]"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-surface-muted bg-surface-subtle px-4 py-3">
          <p className="text-xs text-ink-muted">
            Aucun thème actif pour cette semaine. Sélectionne ou demande à Claude des propositions ci-dessous.
          </p>
        </div>
      )}

      {/* Propositions Claude */}
      {suggestions.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-ink-subtle">
            {suggestions.length} proposition{suggestions.length > 1 ? "s" : ""} en attente
          </p>
          {suggestions.map((s) => (
            <div
              key={s.id}
              className="rounded-md border border-warning/30 bg-warning-light/30 px-3 py-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-medium text-ink">{s.theme}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">{s.summary}</p>
                  {s.rationale ? (
                    <p className="mt-1 text-[11px] italic text-ink-subtle">↪ {s.rationale}</p>
                  ) : null}
                  <div className="mt-1.5 flex flex-wrap gap-1 text-[10px]">
                    {s.primaryCampaign ? (
                      <span className="rounded bg-surface px-1.5 py-0.5 text-ink-muted">
                        Camp. {s.primaryCampaign}
                      </span>
                    ) : null}
                    {s.primaryCluster ? (
                      <span className="rounded bg-surface px-1.5 py-0.5 text-ink-muted">
                        {s.primaryCluster}
                      </span>
                    ) : null}
                    {s.primaryPillar ? (
                      <span className="rounded bg-surface px-1.5 py-0.5 text-ink-muted">
                        Pilier {s.primaryPillar}
                      </span>
                    ) : null}
                  </div>
                  {s.actionDirectives.length > 0 ? (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer text-ink-muted hover:text-ink">
                        {s.actionDirectives.length} directive{s.actionDirectives.length > 1 ? "s" : ""}
                      </summary>
                      <ul className="mt-1 space-y-0.5 pl-3 text-ink-muted">
                        {s.actionDirectives.map((d, i) => (
                          <li key={i}>· {d}</li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <form action={activateThemeAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      className="w-full rounded bg-accent px-2 py-1 text-[11px] font-medium text-white hover:bg-accent-dark"
                    >
                      Activer
                    </button>
                  </form>
                  <form action={rejectThemeAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      className="w-full rounded bg-surface-muted px-2 py-1 text-[11px] font-medium text-ink-muted hover:bg-surface-subtle"
                    >
                      Refuser
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
