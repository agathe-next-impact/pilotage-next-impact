import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { fmtNumber, fmtPercent } from "@/lib/format";
import type { ChannelSummary } from "@/lib/kpi/types";

const accentByChannel: Record<ChannelSummary["channel"], "blue" | "green" | "violet" | "amber"> = {
  linkedin: "blue",
  newsletter: "violet",
  seo: "green",
  geo: "amber",
  global: "blue",
};

const linkByChannel: Record<ChannelSummary["channel"], string> = {
  linkedin: "/pilotage/linkedin",
  newsletter: "/pilotage/newsletter",
  seo: "/pilotage/seo-geo",
  geo: "/pilotage/seo-geo",
  global: "/pilotage",
};

function fmt(value: number, format: ChannelSummary["primaryFormat"]): string {
  return format === "percent" ? fmtPercent(value) : fmtNumber(value);
}

export function ChannelGrid({ summaries }: { summaries: ChannelSummary[] }): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {summaries.map((s) => (
        <Card key={s.channel} accent={accentByChannel[s.channel]}>
          <CardBody>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-ink-subtle">{s.label}</p>
                <p className="mt-1 text-2xl font-medium text-ink">
                  {fmt(s.primaryValue, s.primaryFormat)}
                </p>
                <p className="text-xs text-ink-muted">{s.primaryKpi}</p>
              </div>
              <StatusPill status={s.progress.status} />
            </div>

            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full bg-accent"
                style={{ width: `${Math.min(100, s.progress.pctOfTarget * 100)}%` }}
              />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              {s.secondaryStats.map((st) => (
                <div key={st.label} className="flex items-center justify-between">
                  <dt className="text-ink-subtle">{st.label}</dt>
                  <dd className="font-medium text-ink">{st.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-4 border-t border-surface-muted pt-3">
              <Link
                href={linkByChannel[s.channel]}
                className="text-xs font-medium text-accent hover:text-accent-dark"
              >
                Voir le détail →
              </Link>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
