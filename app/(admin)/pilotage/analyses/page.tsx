import Link from "next/link";
import { kpiSeries, weeklyEngagement, postsDistribution, calendarHeatmap, topPosts } from "@/lib/analytics";
import { listAnalyses } from "@/lib/analysis";
import { KpiLineChart } from "@/components/charts/KpiLineChart";
import { EngagementBarChart } from "@/components/charts/EngagementBarChart";
import { PostsPieChart } from "@/components/charts/PostsPieChart";
import { CalendarHeatmap } from "@/components/charts/CalendarHeatmap";
import { TopPosts } from "@/components/dashboard/TopPosts";
import { AnalysisGenerator } from "./AnalysisGenerator";

export const dynamic = "force-dynamic";

function fmtPeriod(period: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (!m) return period;
  const d = new Date(Date.UTC(parseInt(m[1] ?? "0", 10), parseInt(m[2] ?? "0", 10) - 1, 1));
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export default async function AnalysesPage(): Promise<React.ReactElement> {
  const [kpis, engagement, dist, heatmap, top, analyses] = await Promise.all([
    kpiSeries(12),
    weeklyEngagement(12),
    postsDistribution(),
    calendarHeatmap(90),
    topPosts(5),
    listAnalyses(),
  ]);

  return (
    <div className="space-y-8">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Analyses & visualisations</h1>
          <p className="mt-1 text-sm text-ink-muted">Tendances long terme + synthèse mensuelle Claude.</p>
        </div>
        <Link href="/pilotage" className="rounded-md border border-surface-muted px-3 py-1.5 text-xs text-ink-muted hover:bg-surface-muted">
          ← Retour
        </Link>
      </header>

      <section className="rounded-lg border border-surface-muted bg-surface p-4">
        <h2 className="text-sm font-medium text-ink">Évolution des KPIs (12 dernières semaines)</h2>
        <div className="mt-3">
          <KpiLineChart data={kpis} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-surface-muted bg-surface p-4">
          <h2 className="text-sm font-medium text-ink">Engagement par semaine</h2>
          <div className="mt-3">
            <EngagementBarChart data={engagement} />
          </div>
        </section>

        <section className="rounded-lg border border-surface-muted bg-surface p-4">
          <h2 className="text-sm font-medium text-ink">Distribution des contenus</h2>
          <div className="mt-3">
            <PostsPieChart data={dist} />
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-surface-muted bg-surface p-4">
        <h2 className="text-sm font-medium text-ink">Activité (90 derniers jours)</h2>
        <p className="mt-1 text-xs text-ink-subtle">Une case par jour — vert plus foncé = plus d'activité.</p>
        <div className="mt-3">
          <CalendarHeatmap data={heatmap} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium text-ink">Top 5 posts par engagement</h2>
        <div className="mt-3">
          <TopPosts posts={top} />
        </div>
      </section>

      <section className="rounded-lg border border-surface-muted bg-surface p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium text-ink">Synthèses mensuelles Claude</h2>
            <p className="mt-1 text-xs text-ink-muted">
              Claude lit toutes les semaines du mois et écrit une synthèse factuelle avec 3 recommandations.
            </p>
          </div>
          <AnalysisGenerator />
        </div>

        {analyses.length === 0 ? (
          <p className="mt-4 text-xs text-ink-subtle italic">Aucune synthèse générée pour l'instant.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {analyses.map((a, i) => (
              <details key={a.id} open={i === 0} className="rounded-md border border-surface-muted bg-surface-subtle p-3">
                <summary className="cursor-pointer text-sm font-medium text-ink">
                  {fmtPeriod(a.period)}
                  <span className="ml-2 text-[11px] text-ink-subtle">
                    Généré le {new Date(a.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} avec {a.model}
                  </span>
                </summary>
                <article className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                  {a.body}
                </article>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
