import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  accent,
}: {
  children: ReactNode;
  className?: string;
  accent?: "blue" | "green" | "violet" | "amber";
}): React.ReactElement {
  const accentClass =
    accent === "blue"
      ? "border-l-[3px] border-l-accent"
      : accent === "green"
        ? "border-l-[3px] border-l-success"
        : accent === "violet"
          ? "border-l-[3px] border-l-violet"
          : accent === "amber"
            ? "border-l-[3px] border-l-warning"
            : "";
  return (
    <div
      className={`rounded-lg border border-surface-muted bg-surface shadow-card ${accentClass} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <div className="flex items-start justify-between border-b border-surface-muted px-5 py-4">
      {children}
    </div>
  );
}

export function CardBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}): React.ReactElement {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children }: { children: ReactNode }): React.ReactElement {
  return <h3 className="text-sm font-medium text-ink">{children}</h3>;
}

export function SectionTitle({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <h2 className="mb-3 mt-6 text-[11px] font-medium uppercase tracking-wider text-ink-subtle">
      {children}
    </h2>
  );
}
