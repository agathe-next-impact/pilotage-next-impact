import { notFound } from "next/navigation";
import { z } from "zod";
import { getSnapshot } from "@/lib/kpi/store";
import { Card, CardBody, SectionTitle } from "@/components/ui/Card";
import { SnapshotForm } from "@/components/pilotage/SnapshotForm";
import { PeriodPicker } from "@/components/pilotage/PeriodPicker";
import { fmtPeriodLong } from "@/lib/format";
import type { Period } from "@/lib/kpi/types";

const PeriodSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

export const dynamic = "force-dynamic";

export default async function SnapshotEditPage({
  params,
}: {
  params: Promise<{ period: string }>;
}): Promise<React.ReactElement> {
  const { period: rawPeriod } = await params;
  const parsed = PeriodSchema.safeParse(rawPeriod);
  if (!parsed.success) notFound();
  const period = parsed.data as Period;

  const snapshot = await getSnapshot(period);

  return (
    <div>
      <h1 className="text-xl font-medium text-ink">Saisie — {fmtPeriodLong(period)}</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Renseigne les chiffres LinkedIn et Newsletter (les autres canaux sont auto-remplis par les cron jobs).
        Les champs vides sont ignorés.
      </p>

      <div className="mt-4">
        <PeriodPicker active={period} />
      </div>

      <SectionTitle>Chiffres du mois</SectionTitle>
      <SnapshotForm period={period} snapshot={snapshot} />

      {snapshot ? (
        <Card className="mt-6">
          <CardBody>
            <p className="text-xs text-ink-subtle">
              Dernière mise à jour : {new Date(snapshot.modified).toLocaleString("fr-FR")} ·
              Source du dernier update : <code className="rounded bg-surface-muted px-1.5 py-0.5">{snapshot.source}</code>
            </p>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
