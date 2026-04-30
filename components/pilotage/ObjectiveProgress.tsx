import { fmtNumber, fmtPercent } from "@/lib/format";

export function ObjectiveProgress({
  label,
  current,
  expected,
  target,
  format = "number",
}: {
  label: string;
  current: number;
  expected: number;
  target: number;
  format?: "number" | "percent";
}): React.ReactElement {
  const fmt = (v: number) => (format === "percent" ? fmtPercent(v) : fmtNumber(v));
  const pct = target ? Math.min(100, (current / target) * 100) : 0;
  const expectedPct = target ? Math.min(100, (expected / target) * 100) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-ink-muted">{label}</span>
        <span className="font-medium text-ink">
          {fmt(current)} <span className="text-ink-subtle">/ {fmt(target)}</span>
        </span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-surface-muted">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-accent transition-all"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-ink-subtle"
          style={{ left: `${expectedPct}%` }}
          title={`Trajectoire attendue : ${fmt(expected)}`}
          aria-hidden
        />
      </div>
    </div>
  );
}
