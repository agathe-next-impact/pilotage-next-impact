import { listSnapshots } from "@/lib/kpi/store";
import { buildSeries, computeProgress } from "@/lib/kpi/aggregate";
import { LINKEDIN_TARGETS } from "@/lib/kpi/targets";
import { Card, CardBody, SectionTitle } from "@/components/ui/Card";
import { KpiCard } from "@/components/pilotage/KpiCard";
import { ProgressionChart } from "@/components/pilotage/ProgressionChart";
import { fmtPeriodLong } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LinkedInPage(): Promise<React.ReactElement> {
  const snapshots = await listSnapshots();
  const last = snapshots[snapshots.length - 1];
  const asOf = new Date();

  if (!last) {
    return <p className="text-sm text-ink-muted">Pas de données.</p>;
  }

  const followers = computeProgress(last.linkedin.followers, LINKEDIN_TARGETS.followers, asOf);
  const impressions = computeProgress(last.linkedin.impressions, LINKEDIN_TARGETS.impressions, asOf);
  const engagement = computeProgress(last.linkedin.engagementRate, LINKEDIN_TARGETS.engagementRate, asOf);
  const dms = computeProgress(last.linkedin.dmsQualified, LINKEDIN_TARGETS.dmsQualified, asOf);
  const leads = computeProgress(last.linkedin.formLeads, LINKEDIN_TARGETS.formLeads, asOf);

  const followersSeries = buildSeries(snapshots, (s) => s.linkedin.followers, LINKEDIN_TARGETS.followers);
  const impressionsSeries = buildSeries(snapshots, (s) => s.linkedin.impressions, LINKEDIN_TARGETS.impressions);
  const engagementSeries = buildSeries(snapshots, (s) => s.linkedin.engagementRate, LINKEDIN_TARGETS.engagementRate);

  return (
    <div>
      <h1 className="text-xl font-medium text-ink">LinkedIn</h1>
      <p className="mt-1 text-sm text-ink-muted">Acquisition · 3 posts/semaine · 6 campagnes A–F</p>

      <SectionTitle>KPIs au mois de {fmtPeriodLong(last.period)}</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Abonnés" value={last.linkedin.followers} format="number" progress={followers} />
        <KpiCard label="Impressions/mois" value={last.linkedin.impressions} format="number" progress={impressions} />
        <KpiCard label="Taux d'engagement" value={last.linkedin.engagementRate} format="percent" progress={engagement} />
        <KpiCard label="DM qualifiés" value={last.linkedin.dmsQualified} format="number" progress={dms} />
        <KpiCard label="Leads formulaire" value={last.linkedin.formLeads} format="number" progress={leads} />
        <Card>
          <CardBody>
            <p className="text-xs text-ink-muted">Posts publiés</p>
            <p className="mt-1 text-3xl font-medium text-ink">{last.linkedin.postsPublished}</p>
            <p className="mt-2 text-xs text-ink-subtle">Cible mensuelle : 12 posts (3/sem.)</p>
          </CardBody>
        </Card>
      </div>

      <SectionTitle>Trajectoires vs cible</SectionTitle>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h3 className="text-sm font-medium text-ink">Abonnés</h3>
            <div className="mt-3">
              <ProgressionChart data={followersSeries} label="Abonnés" />
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="text-sm font-medium text-ink">Impressions/mois</h3>
            <div className="mt-3">
              <ProgressionChart data={impressionsSeries} label="Impressions" />
            </div>
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardBody>
            <h3 className="text-sm font-medium text-ink">Taux d&rsquo;engagement</h3>
            <div className="mt-3">
              <ProgressionChart data={engagementSeries} format="percent" label="Engagement" />
            </div>
          </CardBody>
        </Card>
      </div>

      <SectionTitle>Les 6 campagnes</SectionTitle>
      <Card>
        <CardBody>
          <ul className="divide-y divide-surface-muted text-sm">
            {[
              ["A — Crédibilité technique", "DSI · CTO · Resp. digital", "Core Web Vitals · REST vs GraphQL · Astro vs Next.js"],
              ["B — Avantage fiscal OETH", "DAF · DRH · Acheteurs PME", "Simulateur OETH · Attestation TIH · Barème 2025–2026"],
              ["C — ROI & Comparatifs", "DSI · DAF · DG", "Coût total possession · Simulateur ROI · Hébergement 3 ans"],
              ["D — Coulisses & Méthode", "Prescripteurs · Agences", "Choisir la stack · Process 5 étapes · Templates · Usage IA"],
              ["E — Preuve sociale chiffrée", "Tous décideurs — phase décision", "Études de cas avant/après · Verbatims · Métriques J+90"],
              ["F — Positionnement perso", "Réseau général · Nouveaux abonnés", "Parcours 20 ans WP · Remote Cantal · Statut TIH"],
            ].map(([name, target, desc]) => (
              <li key={name} className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-[1fr_2fr] sm:items-baseline">
                <div>
                  <p className="font-medium text-ink">{name}</p>
                  <p className="text-xs text-ink-subtle">{target}</p>
                </div>
                <p className="text-xs text-ink-muted">{desc}</p>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
