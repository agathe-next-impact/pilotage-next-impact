import { listSnapshots } from "@/lib/kpi/store";
import { buildSeries, computeProgress } from "@/lib/kpi/aggregate";
import { NEWSLETTER_TARGETS } from "@/lib/kpi/targets";
import { Card, CardBody, SectionTitle } from "@/components/ui/Card";
import { KpiCard } from "@/components/pilotage/KpiCard";
import { ProgressionChart } from "@/components/pilotage/ProgressionChart";
import { fmtPeriodLong } from "@/lib/format";

export const dynamic = "force-dynamic";

const editions = [
  { n: 1, date: "14 avr.", subject: "Mon site WordPress est-il encore la bonne solution en 2026 ?" },
  { n: 2, date: "13 mai",  subject: "Webflow, WordPress Headless, Wix Pro : ce que personne ne vous dit vraiment" },
  { n: 3, date: "10 juin", subject: "Headless : le mot que tout le monde utilise, que personne n'explique vraiment" },
  { n: 4, date: "8 juil.", subject: "Comment chiffrer votre choix techno avant de signer un devis" },
  { n: 5, date: "11 août", subject: "4 projets réels, 4 technologies, 4 décisions" },
  { n: 6, date: "8 sept.", subject: "Rentrée web : comment prendre LA décision avant le 31 décembre" },
];

export default async function NewsletterPage(): Promise<React.ReactElement> {
  const snapshots = await listSnapshots();
  const last = snapshots[snapshots.length - 1];
  const asOf = new Date();

  if (!last) {
    return <p className="text-sm text-ink-muted">Pas de données.</p>;
  }

  const subscribers = computeProgress(last.newsletter.subscribers, NEWSLETTER_TARGETS.subscribers, asOf);
  const openRate = computeProgress(last.newsletter.openRate, NEWSLETTER_TARGETS.openRate, asOf);
  const ctr = computeProgress(last.newsletter.ctrResource, NEWSLETTER_TARGETS.ctrResource, asOf);

  const subscribersSeries = buildSeries(snapshots, (s) => s.newsletter.subscribers, NEWSLETTER_TARGETS.subscribers);
  const openRateSeries = buildSeries(snapshots, (s) => s.newsletter.openRate, NEWSLETTER_TARGETS.openRate);

  return (
    <div>
      <h1 className="text-xl font-medium text-ink">Newsletter Substack</h1>
      <p className="mt-1 text-sm text-ink-muted">Fidélité · 1× par mois · 700–950 mots · 2e mardi du mois</p>

      <SectionTitle>KPIs au mois de {fmtPeriodLong(last.period)}</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Abonnés" value={last.newsletter.subscribers} format="number" progress={subscribers} />
        <KpiCard label="Open rate" value={last.newsletter.openRate} format="percent" progress={openRate} />
        <KpiCard label="CTR ressource" value={last.newsletter.ctrResource} format="percent" progress={ctr} />
      </div>

      <SectionTitle>Trajectoires vs cible</SectionTitle>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h3 className="text-sm font-medium text-ink">Abonnés</h3>
            <div className="mt-3">
              <ProgressionChart data={subscribersSeries} label="Abonnés" />
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="text-sm font-medium text-ink">Open rate</h3>
            <div className="mt-3">
              <ProgressionChart data={openRateSeries} format="percent" label="Open rate" />
            </div>
          </CardBody>
        </Card>
      </div>

      <SectionTitle>Calendrier éditorial — 6 éditions</SectionTitle>
      <Card>
        <CardBody className="-mx-5 -my-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink-subtle">
                <th className="border-b border-surface-muted px-5 py-3 font-medium">N°</th>
                <th className="border-b border-surface-muted px-5 py-3 font-medium">Date</th>
                <th className="border-b border-surface-muted px-5 py-3 font-medium">Objet</th>
                <th className="border-b border-surface-muted px-5 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {editions.map((e) => {
                const sent = e.n <= last.newsletter.editionNumber;
                return (
                  <tr key={e.n} className="border-b border-surface-muted last:border-b-0">
                    <td className="px-5 py-3 font-medium text-ink">#{e.n}</td>
                    <td className="px-5 py-3 text-ink-muted">{e.date}</td>
                    <td className="px-5 py-3 text-ink">{e.subject}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                          sent ? "bg-success-light text-success" : "bg-surface-muted text-ink-muted"
                        }`}
                      >
                        {sent ? "Envoyée" : "À venir"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
