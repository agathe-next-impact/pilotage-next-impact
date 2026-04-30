import { listSnapshots, getLatestGeoAuditRun } from "@/lib/kpi/store";
import { buildSeries, computeProgress } from "@/lib/kpi/aggregate";
import { SEO_TARGETS, GEO_TARGETS, GEO_PROMPTS } from "@/lib/kpi/targets";
import { Card, CardBody, SectionTitle } from "@/components/ui/Card";
import { KpiCard } from "@/components/pilotage/KpiCard";
import { ProgressionChart } from "@/components/pilotage/ProgressionChart";
import { fmtPeriodLong } from "@/lib/format";
import type { Period } from "@/lib/kpi/types";

export const dynamic = "force-dynamic";

export default async function SeoGeoPage(): Promise<React.ReactElement> {
  const snapshots = await listSnapshots();
  const last = snapshots[snapshots.length - 1];
  const asOf = new Date();

  if (!last) {
    return <p className="text-sm text-ink-muted">Pas de données.</p>;
  }

  const clicks = computeProgress(last.seo.clicks, SEO_TARGETS.clicks, asOf);
  const indexed = computeProgress(last.seo.pagesIndexed, SEO_TARGETS.pagesIndexed, asOf);
  const top10 = computeProgress(last.seo.pagesTop10, SEO_TARGETS.pagesTop10, asOf);
  const sov = computeProgress(last.geo.shareOfVoice, GEO_TARGETS.shareOfVoice, asOf);
  const referral = computeProgress(last.geo.referralTraffic, GEO_TARGETS.referralTraffic, asOf);

  const clicksSeries = buildSeries(snapshots, (s) => s.seo.clicks, SEO_TARGETS.clicks);
  const top10Series = buildSeries(snapshots, (s) => s.seo.pagesTop10, SEO_TARGETS.pagesTop10);
  const sovSeries = buildSeries(snapshots, (s) => s.geo.shareOfVoice, GEO_TARGETS.shareOfVoice);

  // Dernier audit GEO pour le mois courant
  const audit = await getLatestGeoAuditRun(last.period as Period);

  return (
    <div>
      <h1 className="text-xl font-medium text-ink">SEO + GEO</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Captation longue · 9 articles · 3 clusters sémantiques (WP Headless · TIH/OETH · ROI)
      </p>

      <SectionTitle>SEO — KPIs au mois de {fmtPeriodLong(last.period)}</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Clics organiques/mois" value={last.seo.clicks} format="number" progress={clicks} />
        <KpiCard label="Pages indexées" value={last.seo.pagesIndexed} format="number" progress={indexed} />
        <KpiCard label="Pages en pos. 1–10" value={last.seo.pagesTop10} format="number" progress={top10} />
        <Card>
          <CardBody>
            <p className="text-xs text-ink-muted">Position moyenne</p>
            <p className="mt-1 text-3xl font-medium text-ink">{last.seo.avgPosition.toFixed(1)}</p>
            <p className="mt-2 text-xs text-ink-subtle">Plus le chiffre est bas, mieux c&rsquo;est.</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs text-ink-muted">Impressions Google</p>
            <p className="mt-1 text-3xl font-medium text-ink">
              {last.seo.impressions.toLocaleString("fr-FR")}
            </p>
          </CardBody>
        </Card>
      </div>

      <SectionTitle>GEO — Generative Engine Optimization</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Share of Voice IA" value={last.geo.shareOfVoice} format="percent" progress={sov} />
        <KpiCard label="Trafic référé IA/mois" value={last.geo.referralTraffic} format="number" progress={referral} />
        <Card>
          <CardBody>
            <p className="text-xs text-ink-muted">Citations directes</p>
            <p className="mt-1 text-3xl font-medium text-ink">{last.geo.citationsCount}</p>
            <p className="mt-2 text-xs text-ink-subtle">Sur 10 prompts × N plateformes</p>
          </CardBody>
        </Card>
      </div>

      <SectionTitle>Trajectoires</SectionTitle>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h3 className="text-sm font-medium text-ink">Clics organiques/mois</h3>
            <div className="mt-3">
              <ProgressionChart data={clicksSeries} label="Clics" />
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="text-sm font-medium text-ink">Pages en pos. 1–10</h3>
            <div className="mt-3">
              <ProgressionChart data={top10Series} label="Pages top 10" />
            </div>
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardBody>
            <h3 className="text-sm font-medium text-ink">Share of Voice IA</h3>
            <div className="mt-3">
              <ProgressionChart data={sovSeries} format="percent" label="Share of Voice" />
            </div>
          </CardBody>
        </Card>
      </div>

      <SectionTitle>Audit GEO — 10 prompts cibles</SectionTitle>
      {audit ? (
        <Card>
          <CardBody className="-mx-5 -my-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ink-subtle">
                  <th className="border-b border-surface-muted px-5 py-3 font-medium">Prompt</th>
                  <th className="border-b border-surface-muted px-5 py-3 font-medium">Plateforme</th>
                  <th className="border-b border-surface-muted px-5 py-3 font-medium">Cité ?</th>
                </tr>
              </thead>
              <tbody>
                {audit.prompts.map((r, i) => (
                  <tr key={i} className="border-b border-surface-muted last:border-b-0">
                    <td className="px-5 py-3 text-ink">{r.prompt}</td>
                    <td className="px-5 py-3 text-xs text-ink-muted">{r.platform}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                          r.cited ? "bg-success-light text-success" : "bg-surface-muted text-ink-muted"
                        }`}
                      >
                        {r.cited ? "✓ Cité" : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody>
            <p className="text-sm text-ink-muted">
              Aucun audit GEO encore exécuté. Le cron <code className="rounded bg-surface-muted px-1.5 py-0.5">/api/kpi/geo-audit</code> tourne tous les lundis à 08:00 UTC.
            </p>
            <p className="mt-3 text-xs text-ink-subtle">
              Prompts surveillés : {GEO_PROMPTS.length}.
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
