import type { ProgressStatus } from "@/lib/kpi/types";

const styles: Record<ProgressStatus, string> = {
  ahead: "bg-success-light text-success",
  "on-track": "bg-accent-light text-accent-dark",
  behind: "bg-warning-light text-warning",
  "no-data": "bg-surface-muted text-ink-muted",
};

const labels: Record<ProgressStatus, string> = {
  ahead: "En avance",
  "on-track": "Sur la trajectoire",
  behind: "En retard",
  "no-data": "Pas de donnée",
};

export function StatusPill({ status }: { status: ProgressStatus }): React.ReactElement {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {labels[status]}
    </span>
  );
}
