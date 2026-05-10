import Link from "next/link";
import { notFound } from "next/navigation";
import { getReportByWeek, weekStartFromIso, fmtWeekKey } from "@/lib/reports";
import { WeekForm } from "@/components/report/WeekForm";

export const dynamic = "force-dynamic";

function fmtWeekLabel(iso: string): string {
  const d = new Date(iso);
  const end = new Date(d);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (x: Date) =>
    x.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  return `${fmt(d)} → ${fmt(end)}`;
}

export default async function WeekPage({
  params,
}: {
  params: Promise<{ date: string }>;
}): Promise<React.ReactElement> {
  const { date } = await params;
  // Le param doit être YYYY-MM-DD (lundi)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  let weekStart: Date;
  try {
    weekStart = weekStartFromIso(date);
  } catch {
    notFound();
  }

  const weekStartKey = fmtWeekKey(weekStart);
  const weekStartIso = weekStart.toISOString();
  const initial = await getReportByWeek(weekStart);

  return (
    <div className="space-y-6 pb-20">
      <header>
        <Link href="/pilotage" className="text-xs text-ink-muted hover:text-ink">
          ← Retour
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-ink">
          Semaine du {fmtWeekLabel(weekStartIso)}
        </h1>
        <p className="mt-1 text-xs text-ink-muted">
          {initial
            ? `Modification d'une semaine existante. Tous les champs vides seront effacés en base.`
            : `Nouvelle semaine. Remplis ce qui s'applique, laisse le reste vide.`}
        </p>
      </header>

      <WeekForm weekStart={weekStartIso} weekStartKey={weekStartKey} initial={initial} />
    </div>
  );
}
