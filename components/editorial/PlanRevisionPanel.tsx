import { Button } from "@/components/ui/Button";
import { Card, CardBody, SectionTitle } from "@/components/ui/Card";
import {
  applyPlanRevisionAction,
  rejectPlanRevisionAction,
  adjustPlanAction,
} from "@/app/(admin)/pilotage/contenus/actions";
import type { PlanRevision } from "@/lib/editorial/types";

const kindLabel: Record<string, string> = {
  reschedule: "Replanifier",
  "rewrite-subject": "Réécrire le sujet",
  "rewrite-brief": "Réécrire le brief",
  skip: "Skipper",
  split: "Découper en 2",
};

export function PlanRevisionPanel({
  revisions,
}: {
  revisions: PlanRevision[];
}): React.ReactElement {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <SectionTitle>Ajustements proposés par Claude</SectionTitle>
        <form action={adjustPlanAction} className="flex items-center gap-2">
          <input type="hidden" name="scope" value="global" />
          <input type="hidden" name="force" value="1" />
          <Button type="submit" variant="ghost">
            Demander un ajustement maintenant
          </Button>
        </form>
      </div>

      {revisions.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-ink-muted">
              Aucun ajustement en attente. Le cron mensuel (1er du mois 09:00 UTC) déclenche
              automatiquement Claude si un canal dérive de plus de 15% par rapport à la trajectoire.
              Tu peux aussi forcer une analyse via le bouton ci-dessus.
            </p>
          </CardBody>
        </Card>
      ) : null}

      <div className="space-y-3">
        {revisions.map((rev) => (
          <Card key={rev.id} accent="amber">
            <CardBody>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink-subtle">
                    Scope {rev.scope} · sur la base de {rev.basedOnPeriod} · {rev.model}
                  </p>
                  <p className="mt-1 text-sm font-medium text-ink">{rev.payload.rationale}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <form action={applyPlanRevisionAction}>
                    <input type="hidden" name="id" value={rev.id} />
                    <Button type="submit" variant="primary">
                      Appliquer
                    </Button>
                  </form>
                  <form action={rejectPlanRevisionAction}>
                    <input type="hidden" name="id" value={rev.id} />
                    <Button type="submit" variant="ghost">
                      Refuser
                    </Button>
                  </form>
                </div>
              </div>

              <div className="mt-3 rounded-md bg-surface-muted px-3 py-2 text-xs leading-relaxed text-ink-muted">
                <strong className="font-medium text-ink">Synthèse perf :</strong> {rev.payload.perfSummary}
              </div>

              <ul className="mt-3 space-y-2">
                {rev.payload.changes.map((c, i) => (
                  <li key={i} className="rounded-md border border-surface-muted px-3 py-2 text-xs">
                    <p className="font-medium text-ink">
                      {kindLabel[c.kind] ?? c.kind} · <span className="font-mono text-ink-muted">{c.slug}</span>
                    </p>
                    <p className="mt-1 text-ink-muted">
                      <strong className="font-medium">Avant :</strong> {c.before.subject} · {c.before.plannedFor.slice(0, 10)}
                    </p>
                    {(c.after.subject || c.after.plannedFor || c.after.brief) ? (
                      <p className="mt-0.5 text-ink-muted">
                        <strong className="font-medium">Après :</strong>
                        {c.after.subject ? ` ${c.after.subject}` : ""}
                        {c.after.plannedFor ? ` · ${c.after.plannedFor.slice(0, 10)}` : ""}
                        {c.after.brief ? ` · brief réécrit` : ""}
                      </p>
                    ) : null}
                    <p className="mt-1 text-ink-subtle">↪ {c.rationale}</p>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
