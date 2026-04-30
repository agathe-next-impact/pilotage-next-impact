import type { ContentStatus } from "@/lib/editorial/types";

const styles: Record<ContentStatus, string> = {
  planned: "bg-surface-muted text-ink-muted",
  drafted: "bg-accent-light text-accent-dark",
  validated: "bg-violet-light text-violet",
  published: "bg-success-light text-success",
  skipped: "bg-warning-light text-warning",
};

const labels: Record<ContentStatus, string> = {
  planned: "Planifié",
  drafted: "Brouillon",
  validated: "Validé",
  published: "Publié",
  skipped: "Skippé",
};

export function StatusBadge({ status }: { status: ContentStatus }): React.ReactElement {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
