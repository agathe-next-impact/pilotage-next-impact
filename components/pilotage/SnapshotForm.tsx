import { saveSnapshotAction } from "@/app/(admin)/pilotage/snapshot/[period]/actions";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, SectionTitle } from "@/components/ui/Card";
import type { Snapshot, Period } from "@/lib/kpi/types";

type FieldRow = { name: string; label: string; step?: string; min?: number; max?: number };

const linkedinFields: FieldRow[] = [
  { name: "linkedinFollowers", label: "Abonnés LinkedIn", step: "1" },
  { name: "linkedinImpressions", label: "Impressions du mois", step: "1" },
  { name: "linkedinEngagementRate", label: "Engagement moyen (0–1)", step: "0.001", min: 0, max: 1 },
  { name: "linkedinDmsQualified", label: "DM qualifiés", step: "1" },
  { name: "linkedinFormLeads", label: "Leads via formulaire", step: "1" },
  { name: "linkedinPostsPublished", label: "Posts publiés", step: "1" },
];

const nlFields: FieldRow[] = [
  { name: "nlSubscribers", label: "Abonnés (fin de mois)", step: "1" },
  { name: "nlOpenRate", label: "Open rate (0–1)", step: "0.001", min: 0, max: 1 },
  { name: "nlCtrResource", label: "CTR ressource (0–1)", step: "0.001", min: 0, max: 1 },
  { name: "nlUnsubscribeRate", label: "Désabonnement (0–1)", step: "0.001", min: 0, max: 1 },
  { name: "nlLeadsMentioning", label: "Leads citant la NL", step: "1" },
  { name: "nlEditionNumber", label: "N° édition (1–6)", step: "1", min: 1, max: 12 },
];

const seoFields: FieldRow[] = [
  { name: "seoClicks", label: "Clics organiques", step: "1" },
  { name: "seoImpressions", label: "Impressions Google", step: "1" },
  { name: "seoPagesIndexed", label: "Pages indexées", step: "1" },
  { name: "seoPagesTop10", label: "Pages en pos. 1–10", step: "1" },
  { name: "seoAvgPosition", label: "Position moyenne", step: "0.1" },
];

const geoFields: FieldRow[] = [
  { name: "geoShareOfVoice", label: "Share of Voice IA (0–1)", step: "0.001", min: 0, max: 1 },
  { name: "geoCitationsCount", label: "Citations IA", step: "1" },
  { name: "geoReferralTraffic", label: "Trafic référé IA", step: "1" },
];

const ga4Fields: FieldRow[] = [
  { name: "ga4Sessions", label: "Sessions GA4", step: "1" },
  { name: "ga4Users", label: "Utilisateurs GA4", step: "1" },
  { name: "ga4Conversions", label: "Conversions formulaire", step: "1" },
];

function valueOf(snapshot: Snapshot | null, key: string): string {
  if (!snapshot) return "";
  const flat: Record<string, number> = {
    linkedinFollowers: snapshot.linkedin.followers,
    linkedinImpressions: snapshot.linkedin.impressions,
    linkedinEngagementRate: snapshot.linkedin.engagementRate,
    linkedinDmsQualified: snapshot.linkedin.dmsQualified,
    linkedinFormLeads: snapshot.linkedin.formLeads,
    linkedinPostsPublished: snapshot.linkedin.postsPublished,
    nlSubscribers: snapshot.newsletter.subscribers,
    nlOpenRate: snapshot.newsletter.openRate,
    nlCtrResource: snapshot.newsletter.ctrResource,
    nlUnsubscribeRate: snapshot.newsletter.unsubscribeRate,
    nlLeadsMentioning: snapshot.newsletter.leadsMentioning,
    nlEditionNumber: snapshot.newsletter.editionNumber,
    seoClicks: snapshot.seo.clicks,
    seoImpressions: snapshot.seo.impressions,
    seoPagesIndexed: snapshot.seo.pagesIndexed,
    seoPagesTop10: snapshot.seo.pagesTop10,
    seoAvgPosition: snapshot.seo.avgPosition,
    geoShareOfVoice: snapshot.geo.shareOfVoice,
    geoCitationsCount: snapshot.geo.citationsCount,
    geoReferralTraffic: snapshot.geo.referralTraffic,
    ga4Sessions: snapshot.ga4.sessions,
    ga4Users: snapshot.ga4.users,
    ga4Conversions: snapshot.ga4.conversions,
  };
  const v = flat[key];
  return v === undefined || v === 0 ? "" : String(v);
}

function FieldGroup({
  title,
  fields,
  snapshot,
  hint,
}: {
  title: string;
  fields: FieldRow[];
  snapshot: Snapshot | null;
  hint?: string;
}): React.ReactElement {
  return (
    <Card>
      <CardBody>
        <h3 className="text-sm font-medium text-ink">{title}</h3>
        {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fields.map((f) => (
            <label key={f.name} className="block text-xs text-ink-muted">
              {f.label}
              <input
                type="number"
                name={f.name}
                step={f.step ?? "any"}
                min={f.min}
                max={f.max}
                defaultValue={valueOf(snapshot, f.name)}
                className="mt-1 w-full rounded-md border border-surface-muted bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </label>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

export function SnapshotForm({
  period,
  snapshot,
}: {
  period: Period;
  snapshot: Snapshot | null;
}): React.ReactElement {
  return (
    <form action={saveSnapshotAction} className="space-y-4">
      <input type="hidden" name="period" value={period} />

      <SectionTitle>LinkedIn</SectionTitle>
      <FieldGroup title="Abonnés · engagement · leads" fields={linkedinFields} snapshot={snapshot} />

      <SectionTitle>Newsletter Substack</SectionTitle>
      <FieldGroup title="Abonnés · open rate · CTR" fields={nlFields} snapshot={snapshot} />

      <SectionTitle>SEO</SectionTitle>
      <FieldGroup
        title="Clics · positions · indexation"
        fields={seoFields}
        snapshot={snapshot}
        hint="Auto-rempli par le cron sync-gsc — modifier seulement en cas de correction."
      />

      <SectionTitle>GEO (IA)</SectionTitle>
      <FieldGroup
        title="Share of Voice · citations"
        fields={geoFields}
        snapshot={snapshot}
        hint="Auto-rempli par le cron geo-audit hebdomadaire."
      />

      <SectionTitle>Trafic global GA4</SectionTitle>
      <FieldGroup
        title="Sessions · utilisateurs · conversions"
        fields={ga4Fields}
        snapshot={snapshot}
        hint="Auto-rempli par le cron sync-ga4."
      />

      <div className="flex items-center justify-end gap-3 pt-4">
        <Button type="submit" variant="primary">
          Enregistrer le snapshot
        </Button>
      </div>
    </form>
  );
}
