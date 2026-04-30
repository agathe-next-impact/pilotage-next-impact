import { fmtNumber, fmtPercent, fmtSignedDelta } from "@/lib/format";
import { StatusPill } from "@/components/ui/StatusPill";
import { Card, CardBody } from "@/components/ui/Card";
import type { KpiProgress } from "@/lib/kpi/types";

export function KpiCard({
  label,
  value,
  format,
  progress,
  helper,
}: {
  label: string;
  value: number;
  format: "number" | "percent";
  progress: KpiProgress;
  helper?: string;
}): React.ReactElement {
  const display = format === "percent" ? fmtPercent(value) : fmtNumber(value);
  const target = format === "percent" ? fmtPercent(progress.target) : fmtNumber(progress.target);
  const delta =
    format === "percent" ? `${(progress.delta * 100).toFixed(1)} pts` : fmtSignedDelta(progress.delta);

  // Largeur de la barre : pct du target final (cap 100%)
  const widthPct = Math.min(100, Math.max(0, progress.pctOfTarget * 100));

  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-ink-muted">{label}</p>
            <p className="mt-1 text-3xl font-medium text-ink">{display}</p>
          </div>
          <StatusPill status={progress.status} />
        </div>

        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${widthPct}%` }}
            aria-hidden
          />
        </div>

        <p className="mt-2 text-xs text-ink-muted">
          Cible sept. : <strong className="font-medium text-ink">{target}</strong>
          <span className="mx-1.5 text-ink-subtle">·</span>
          Delta : <span className="font-medium">{delta}</span>
          {helper ? (
            <>
              <span className="mx-1.5 text-ink-subtle">·</span>
              {helper}
            </>
          ) : null}
        </p>
      </CardBody>
    </Card>
  );
}
