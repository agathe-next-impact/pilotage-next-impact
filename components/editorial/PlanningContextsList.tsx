import { Card, CardBody } from "@/components/ui/Card";
import { resolvePlanningContextAction } from "@/app/(admin)/pilotage/contenus/planning/actions";
import type { PlanningContext } from "@/lib/editorial/types";

const SOURCE_LABELS: Record<PlanningContext["source"], string> = {
  user_chat: "Saisie chat",
  kpi_signal: "Signal KPI",
  external_event: "Événement externe",
  perf_learning: "Apprentissage perf",
};

const STATUS_BADGES: Record<PlanningContext["status"], { label: string; cls: string }> = {
  pending: { label: "En attente", cls: "bg-warning-light text-warning" },
  applied: { label: "Appliqué", cls: "bg-success-light text-success" },
  ignored: { label: "Ignoré", cls: "bg-surface-muted text-ink-muted" },
  stale: { label: "Périmé", cls: "bg-surface-muted text-ink-subtle" },
};

export function PlanningContextsList({
  contexts,
}: {
  contexts: PlanningContext[];
}): React.ReactElement {
  if (contexts.length === 0) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-ink-muted">
            Aucun facteur signalé pour l&rsquo;instant. Saisis ci-dessus une situation, un événement,
            ou un changement de priorité — Claude proposera un ajustement de plan en quelques secondes.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <ul className="space-y-3">
      {contexts.map((ctx) => {
        const badge = STATUS_BADGES[ctx.status];
        return (
          <li
            key={ctx.id}
            className="rounded-md border border-surface-muted bg-surface px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-subtle">
                  <span className="font-medium text-ink">
                    {new Date(ctx.createdAt).toLocaleString("fr-FR")}
                  </span>
                  <span>·</span>
                  <span>{SOURCE_LABELS[ctx.source]}</span>
                  {ctx.weekStart ? (
                    <>
                      <span>·</span>
                      <span>Semaine du {new Date(ctx.weekStart).toLocaleDateString("fr-FR")}</span>
                    </>
                  ) : null}
                  <span
                    className={`ml-auto rounded px-1.5 py-0.5 font-medium ${badge.cls}`}
                  >
                    {badge.label}
                  </span>
                </div>

                {ctx.rawInput ? (
                  <p className="mt-2 rounded bg-surface-muted px-3 py-2 text-xs italic text-ink-muted">
                    « {ctx.rawInput} »
                  </p>
                ) : null}

                <p className="mt-2 text-sm leading-relaxed text-ink">
                  <strong className="font-medium">Synthèse Claude :</strong> {ctx.digest}
                </p>

                {ctx.affectedSlugs.length > 0 ? (
                  <p className="mt-2 text-xs text-ink-subtle">
                    Items impactés :{" "}
                    {ctx.affectedSlugs.map((s) => (
                      <code
                        key={s}
                        className="mr-1 rounded bg-surface-muted px-1 py-0.5 text-[11px]"
                      >
                        {s}
                      </code>
                    ))}
                  </p>
                ) : null}
              </div>

              {ctx.status === "pending" ? (
                <div className="flex shrink-0 flex-col gap-1">
                  <form action={resolvePlanningContextAction}>
                    <input type="hidden" name="id" value={ctx.id} />
                    <input type="hidden" name="outcome" value="ignored" />
                    <button
                      type="submit"
                      className="rounded bg-surface-muted px-2 py-1 text-xs text-ink-muted hover:bg-surface-subtle"
                    >
                      Ignorer
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
