import Link from "next/link";
import { fmtPeriodShort } from "@/lib/format";
import { PERIODS } from "@/lib/kpi/targets";

export function PeriodPicker({ active }: { active: string }): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-2">
      {PERIODS.map((p) => {
        const isActive = p === active;
        return (
          <Link
            key={p}
            href={{ pathname: `/pilotage/snapshot/${p}` }}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "border-accent bg-accent-light text-accent-dark"
                : "border-surface-muted bg-surface text-ink-muted hover:bg-surface-muted"
            }`}
          >
            {fmtPeriodShort(p)} {p.split("-")[0]}
          </Link>
        );
      })}
    </div>
  );
}
