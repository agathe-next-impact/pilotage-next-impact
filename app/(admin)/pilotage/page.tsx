import Link from "next/link";
import { listRecentReports, weekStartOf, fmtWeekKey } from "@/lib/reports";

export const dynamic = "force-dynamic";

function fmtWeekLabel(iso: string): string {
  const d = new Date(iso);
  const end = new Date(d);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (x: Date) =>
    x.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  return `Semaine du ${fmt(d)} au ${fmt(end)}`;
}

function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("fr-FR");
}

export default async function PilotageHome(): Promise<React.ReactElement> {
  const reports = await listRecentReports(8);
  const currentWeekKey = fmtWeekKey(weekStartOf(new Date()));
  const hasCurrent = reports.some((r) => fmtWeekKey(new Date(r.weekStart)) === currentWeekKey);

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Mes performances marketing</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Saisis chaque semaine ce que tu as publié et les chiffres clés. Les semaines passées restent éditables.
          </p>
        </div>
        {!hasCurrent && (
          <Link
            href={`/pilotage/semaine/${currentWeekKey}`}
            className="rounded-md bg-accent px-3 py-2 text-xs font-medium text-white hover:opacity-90"
          >
            Saisir la semaine en cours
          </Link>
        )}
      </header>

      {reports.length === 0 ? (
        <div className="rounded-lg border border-surface-muted bg-surface p-8 text-center">
          <p className="text-sm text-ink-muted">
            Aucune semaine enregistrée pour le moment.
          </p>
          <Link
            href={`/pilotage/semaine/${currentWeekKey}`}
            className="mt-3 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Démarrer la 1ère semaine
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {reports.map((r) => {
            const key = fmtWeekKey(new Date(r.weekStart));
            const isCurrent = key === currentWeekKey;
            return (
              <li key={r.id}>
                <Link
                  href={`/pilotage/semaine/${key}`}
                  className={`block rounded-lg border bg-surface px-4 py-3 hover:border-accent ${
                    isCurrent ? "border-accent" : "border-surface-muted"
                  }`}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
                      {isCurrent ? "Cette semaine" : "Semaine passée"}
                    </span>
                    <span className="text-[11px] text-ink-subtle">
                      Mis à jour {new Date(r.updatedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                  <h2 className="mt-1 text-sm font-medium text-ink">{fmtWeekLabel(r.weekStart)}</h2>

                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-ink-subtle">Posts LinkedIn</dt>
                      <dd className="font-medium text-ink">{r.posts.length}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-subtle">Newsletter</dt>
                      <dd className="font-medium text-ink">{r.newsletter ? "Publiée" : "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-subtle">Actions SEO/GEO</dt>
                      <dd className="font-medium text-ink">{r.seoGeoActions.length}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-subtle">LinkedIn followers</dt>
                      <dd className="font-medium text-ink">{fmtNum(r.linkedinFollowers)}</dd>
                    </div>
                  </dl>

                  {r.notes && (
                    <p className="mt-3 line-clamp-2 text-[11px] italic text-ink-muted">
                      « {r.notes} »
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {reports.length > 0 && (
        <div className="pt-4 text-center">
          <Link
            href={`/pilotage/semaine/${currentWeekKey}`}
            className="text-xs text-ink-muted hover:text-accent"
          >
            + Saisir / éditer une autre semaine
          </Link>
        </div>
      )}
    </div>
  );
}
