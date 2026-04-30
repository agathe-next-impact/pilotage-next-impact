import { listSnapshots } from "@/lib/kpi/store";
import { summarize, projectToTarget, buildSeries } from "@/lib/kpi/aggregate";
import {
  LINKEDIN_TARGETS,
  NEWSLETTER_TARGETS,
  SEO_TARGETS,
  GEO_TARGETS,
} from "@/lib/kpi/targets";
import { Card, CardBody, SectionTitle } from "@/components/ui/Card";
import { ChannelGrid } from "@/components/pilotage/ChannelGrid";
import { ProgressionChart } from "@/components/pilotage/ProgressionChart";
import { ObjectiveProgress } from "@/components/pilotage/ObjectiveProgress";
import { fmtNumber, fmtPercent, fmtPeriodLong } from "@/lib/format";
import type { Snapshot } from "@/lib/kpi/types";

export const dynamic = "force-dynamic";

export default async function PilotageOverview(): Promise<React.ReactElement> {
  const snapshots = await listSnapshots();
  const last: Snapshot | undefined = snapshots[snapshots.length - 1];
  const asOf = new Date();

  if (!last) {
    return (
      <div className="rounded-lg border border-dashed border-surface-muted bg-surface p-8 text-center">
        <p className="text-sm text-ink-muted">
          Aucune donnée encore. Lance <code className="rounded bg-surface-muted px-1.5 py-0.5">pnpm db:seed</code> ou
          saisis le premier snapshot.
        </p>
      </div>
    );
  }

  const summaries = summarize(last, asOf);

  // Projections sept. 2026
  const liProjection = projectToTarget(snapshots, (s) => s.linkedin.followers, LINKEDIN_TARGETS.followers);
  const nlProjection = projectToTarget(snapshots, (s) => s.newsletter.subscribers, NEWSLETTER_TARGETS.subscribers);
  const seoProjection = projectToTarget(snapshots, (s) => s.seo.clicks, SEO_TARGETS.clicks);
  const geoProjection = projectToTarget(snapshots, (s) => s.geo.shareOfVoice, GEO_TARGETS.shareOfVoice);

  // Séries pour le graphique principal (LI + NL)
  const liSeries = buildSeries(snapshots, (s) => s.linkedin.followers, LINKEDIN_TARGETS.followers);
  const nlSeries = buildSeries(snapshots, (s) => s.newsletter.subscribers, NEWSLETTER_TARGETS.subscribers);

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-medium text-ink">Vue d&rsquo;ensemble</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Dernière donnée&nbsp;: <strong className="font-medium text-ink">{fmtPeriodLong(last.period)}</strong> · cible&nbsp;: sept. 2026
          </p>
        </div>
      </div>

      <ChannelGrid summaries={summaries} />

      <SectionTitle>Projections vers septembre 2026</SectionTitle>
      <Card>
        <CardBody className="space-y-4">
          <ObjectiveProgress
            label="LinkedIn — abonnés"
            current={last.linkedin.followers}
            expected={liProjection.projected}
            target={liProjection.target}
          />
          <ObjectiveProgress
            label="Newsletter — abonnés"
            current={last.newsletter.subscribers}
            expected={nlProjection.projected}
            target={nlProjection.target}
          />
          <ObjectiveProgress
            label="SEO — clics organiques/mois"
            current={last.seo.clicks}
            expected={seoProjection.projected}
            target={seoProjection.target}
          />
          <ObjectiveProgress
            label="GEO — Share of Voice IA"
            current={last.geo.shareOfVoice}
            expected={geoProjection.projected}
            target={geoProjection.target}
            format="percent"
          />
        </CardBody>
      </Card>

      <p className="mt-3 text-xs text-ink-subtle">
        Le repère vertical sur chaque barre indique la <strong className="font-medium text-ink-muted">projection</strong> calculée par régression linéaire sur les 3 derniers mois.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h3 className="text-sm font-medium text-ink">LinkedIn — trajectoire abonnés</h3>
            <p className="mt-0.5 text-xs text-ink-muted">
              Cible sept. : <strong className="font-medium text-ink">900</strong> · projection : {fmtNumber(liProjection.projected)}
            </p>
            <div className="mt-4">
              <ProgressionChart data={liSeries} label="Abonnés réels" />
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="text-sm font-medium text-ink">Newsletter — trajectoire abonnés</h3>
            <p className="mt-0.5 text-xs text-ink-muted">
              Cible sept. : <strong className="font-medium text-ink">210</strong> · projection : {fmtNumber(nlProjection.projected)}
            </p>
            <div className="mt-4">
              <ProgressionChart data={nlSeries} label="Abonnés réels" />
            </div>
          </CardBody>
        </Card>
      </div>

      <SectionTitle>Lecture rapide</SectionTitle>
      <Card>
        <CardBody className="space-y-2 text-sm leading-relaxed text-ink-muted">
          <p>
            Sur le mois <strong className="font-medium text-ink">{fmtPeriodLong(last.period)}</strong> :
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              LinkedIn : <strong className="font-medium text-ink">{fmtNumber(last.linkedin.followers)}</strong> abonnés
              ({fmtPercent(last.linkedin.engagementRate)} d&rsquo;engagement, {last.linkedin.formLeads} lead{last.linkedin.formLeads > 1 ? "s" : ""}).
            </li>
            <li>
              Newsletter : <strong className="font-medium text-ink">{fmtNumber(last.newsletter.subscribers)}</strong> abonnés ·
              open rate {fmtPercent(last.newsletter.openRate)}.
            </li>
            <li>
              SEO : <strong className="font-medium text-ink">{fmtNumber(last.seo.clicks)}</strong> clics ·
              {fmtNumber(last.seo.pagesTop10)} page{last.seo.pagesTop10 > 1 ? "s" : ""} en pos. 1–10.
            </li>
            <li>
              GEO : Share of Voice {fmtPercent(last.geo.shareOfVoice)} ·
              {fmtNumber(last.geo.citationsCount)} citation{last.geo.citationsCount > 1 ? "s" : ""} IA.
            </li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
