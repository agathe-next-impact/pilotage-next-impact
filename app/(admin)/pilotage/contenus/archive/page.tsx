import Link from "next/link";
import { listArchivedWeeks, listArchivedItems } from "@/lib/editorial/archive";
import {
  topPostsByEngagement,
  crossByTrackKey,
  crossByHookPattern,
  getLatestMetric,
  getMetricsHistory,
} from "@/lib/editorial/metrics";
import { listAnalyses } from "@/lib/editorial/analysis";
import {
  archiveItemAction,
  unarchiveItemAction,
  unarchiveWeekAction,
  createExternalItemAction,
  recordMetricAction,
  generateAnalysisAction,
} from "./actions";
import { LINKEDIN_CAMPAIGNS, NEWSLETTER_PILLARS, SEO_CLUSTERS } from "@/lib/editorial/plans";
import { currentPeriod, fmtPeriodLong } from "@/lib/format";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function typeLabel(t: string): string {
  if (t === "linkedin_post") return "LinkedIn";
  if (t === "newsletter_edition") return "Newsletter";
  if (t === "seo_article") return "SEO";
  return t;
}

export default async function ArchivePage(): Promise<React.ReactElement> {
  const [weeks, externals, top, byTrack, byPattern, analyses] = await Promise.all([
    listArchivedWeeks(),
    listArchivedItems({ source: "external" }),
    topPostsByEngagement(10),
    crossByTrackKey(),
    crossByHookPattern(),
    listAnalyses(),
  ]);

  const allArchived = await listArchivedItems();
  const period = currentPeriod();

  return (
    <div className="space-y-10">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Archive & analyse</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {allArchived.length} item(s) archivé(s) · {weeks.length} semaine(s) close(s) · {externals.length} post(s) externe(s)
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/pilotage/contenus/planning"
            className="rounded-md border border-surface-muted px-3 py-1.5 text-xs text-ink-muted hover:bg-surface-muted"
          >
            ← Planning
          </Link>
          <form action={generateAnalysisAction}>
            <input type="hidden" name="period" value={period} />
            <button
              type="submit"
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            >
              Générer la synthèse {period}
            </button>
          </form>
        </div>
      </header>

      {/* === SYNTHÈSES MENSUELLES === */}
      <section>
        <h2 className="text-lg font-medium text-ink">Synthèses mensuelles</h2>
        {analyses.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            Aucune synthèse encore générée. Clique sur « Générer la synthèse » ci-dessus.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {analyses.map((a) => (
              <details
                key={a.id}
                className="rounded-lg border border-surface-muted bg-surface p-4"
                open={a === analyses[0]}
              >
                <summary className="cursor-pointer text-sm font-medium text-ink">
                  {fmtPeriodLong(a.period)}
                  <span className="ml-2 text-xs text-ink-subtle">
                    {a.itemsRefs.length} item(s) cité(s) · généré le {fmtDate(a.createdAt)}
                  </span>
                </summary>
                <article className="prose prose-sm mt-4 max-w-none whitespace-pre-wrap text-ink-muted">
                  {a.body}
                </article>
              </details>
            ))}
          </div>
        )}
      </section>

      {/* === TOP 10 PAR ENGAGEMENT === */}
      <section>
        <h2 className="text-lg font-medium text-ink">Top 10 posts par engagement</h2>
        {top.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">Aucun post avec métrique saisie.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-surface-muted bg-surface">
            <table className="w-full text-xs">
              <thead className="bg-surface-muted/40 text-ink-muted">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Type · Track</th>
                  <th className="px-3 py-2 text-left">Sujet</th>
                  <th className="px-3 py-2 text-left">Hook</th>
                  <th className="px-3 py-2 text-right">Impr.</th>
                  <th className="px-3 py-2 text-right">Engag.</th>
                  <th className="px-3 py-2 text-right">Taux</th>
                  <th className="px-3 py-2 text-right">Conv.</th>
                </tr>
              </thead>
              <tbody>
                {top.map((p, i) => (
                  <tr key={p.id} className="border-t border-surface-muted/50">
                    <td className="px-3 py-2 text-ink-muted">{i + 1}</td>
                    <td className="px-3 py-2">
                      <span className="font-mono">
                        {typeLabel(p.type)}/{p.trackKey}
                      </span>
                    </td>
                    <td className="max-w-[280px] truncate px-3 py-2 text-ink">
                      {p.publishedUrl ? (
                        <a href={p.publishedUrl} target="_blank" rel="noreferrer" className="hover:underline">
                          {p.subject}
                        </a>
                      ) : (
                        p.subject
                      )}
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-2 text-ink-muted">
                      {p.selectedHook ? (
                        <span title={p.selectedHook}>
                          [{p.hookPattern}] {p.selectedHook}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">{p.impressions ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-medium text-ink">
                      {p.engagementCount ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {p.engagementRate ? `${p.engagementRate.toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">{p.conversions ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* === CROISEMENTS === */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-medium text-ink">Performance par track</h2>
          <div className="mt-3 overflow-x-auto rounded-lg border border-surface-muted bg-surface">
            <table className="w-full text-xs">
              <thead className="bg-surface-muted/40 text-ink-muted">
                <tr>
                  <th className="px-3 py-2 text-left">Track</th>
                  <th className="px-3 py-2 text-right">Posts</th>
                  <th className="px-3 py-2 text-right">Impr.</th>
                  <th className="px-3 py-2 text-right">Engag.</th>
                  <th className="px-3 py-2 text-right">Taux</th>
                </tr>
              </thead>
              <tbody>
                {byTrack.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-3 text-ink-subtle">Aucune donnée</td></tr>
                ) : byTrack.map((b) => (
                  <tr key={b.key} className="border-t border-surface-muted/50">
                    <td className="px-3 py-2 font-mono">{b.key}</td>
                    <td className="px-3 py-2 text-right">{b.postCount}</td>
                    <td className="px-3 py-2 text-right">{b.totalImpressions || "—"}</td>
                    <td className="px-3 py-2 text-right">{b.totalEngagement || "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {b.avgEngagementRate ? `${b.avgEngagementRate.toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-medium text-ink">Performance par hook pattern</h2>
          <div className="mt-3 overflow-x-auto rounded-lg border border-surface-muted bg-surface">
            <table className="w-full text-xs">
              <thead className="bg-surface-muted/40 text-ink-muted">
                <tr>
                  <th className="px-3 py-2 text-left">Pattern</th>
                  <th className="px-3 py-2 text-right">Posts</th>
                  <th className="px-3 py-2 text-right">Engag.</th>
                  <th className="px-3 py-2 text-right">Taux moyen</th>
                </tr>
              </thead>
              <tbody>
                {byPattern.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-3 text-ink-subtle">Aucune donnée</td></tr>
                ) : byPattern.map((b) => (
                  <tr key={b.key} className="border-t border-surface-muted/50">
                    <td className="px-3 py-2">{b.label}</td>
                    <td className="px-3 py-2 text-right">{b.postCount}</td>
                    <td className="px-3 py-2 text-right">{b.totalEngagement || "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {b.avgEngagementRate ? `${b.avgEngagementRate.toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* === SEMAINES ARCHIVÉES === */}
      <section>
        <h2 className="text-lg font-medium text-ink">Semaines archivées ({weeks.length})</h2>
        {weeks.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">Aucune semaine archivée.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {weeks.map((w) => (
              <li
                key={w.weekStart.toISOString()}
                className="flex items-center justify-between rounded-md border border-surface-muted bg-surface px-3 py-2 text-xs"
              >
                <span>
                  <span className="font-medium text-ink">Semaine du {fmtDate(w.weekStart)}</span>
                  <span className="ml-3 text-ink-muted">{w.theme ?? "(pas de thème)"}</span>
                  <span className="ml-3 text-ink-subtle">{w.itemCount} item(s)</span>
                </span>
                <form action={unarchiveWeekAction}>
                  <input type="hidden" name="weekStart" value={w.weekStart.toISOString()} />
                  <button
                    type="submit"
                    className="rounded px-2 py-0.5 text-ink-muted hover:bg-surface-muted"
                  >
                    Désarchiver
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* === AJOUT POST EXTERNE === */}
      <section className="rounded-lg border border-surface-muted bg-surface p-4">
        <h2 className="text-sm font-medium text-ink">Ajouter un post externe</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Pour les posts publiés ailleurs (LinkedIn perso, articles invités, repost…). Sera créé en archive directement.
        </p>
        <form action={createExternalItemAction} className="mt-3 grid gap-3 sm:grid-cols-2">
          <select name="type" required className="rounded-md border border-surface-muted bg-surface px-2 py-1.5 text-sm">
            <option value="linkedin_post">LinkedIn</option>
            <option value="newsletter_edition">Newsletter</option>
            <option value="seo_article">SEO / blog</option>
          </select>
          <select name="trackKey" required className="rounded-md border border-surface-muted bg-surface px-2 py-1.5 text-sm">
            <optgroup label="LinkedIn (campagnes)">
              {LINKEDIN_CAMPAIGNS.map((c) => (
                <option key={c.code} value={c.code}>{c.code} · {c.name}</option>
              ))}
            </optgroup>
            <optgroup label="Newsletter (piliers)">
              {Object.entries(NEWSLETTER_PILLARS).map(([k, v]) => (
                <option key={k} value={k}>{k} · {v.name}</option>
              ))}
            </optgroup>
            <optgroup label="SEO (clusters)">
              {SEO_CLUSTERS.map((c) => (
                <option key={c.code} value={c.code}>{c.code} · {c.label}</option>
              ))}
            </optgroup>
          </select>
          <input
            name="publishedAt"
            type="date"
            required
            className="rounded-md border border-surface-muted bg-surface px-2 py-1.5 text-sm"
          />
          <input
            name="publishedUrl"
            type="url"
            placeholder="URL du post (optionnel)"
            className="rounded-md border border-surface-muted bg-surface px-2 py-1.5 text-sm"
          />
          <input
            name="subject"
            required
            placeholder="Sujet / titre"
            className="rounded-md border border-surface-muted bg-surface px-2 py-1.5 text-sm sm:col-span-2"
          />
          <textarea
            name="finalBody"
            placeholder="Corps du post (optionnel — pour analyse Claude)"
            rows={3}
            className="rounded-md border border-surface-muted bg-surface px-2 py-1.5 text-sm sm:col-span-2"
          />
          <button
            type="submit"
            className="rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 sm:col-span-2"
          >
            Ajouter à l'archive
          </button>
        </form>
      </section>

      {/* === LISTE DES ITEMS ARCHIVÉS + SAISIE MÉTRIQUES === */}
      <section>
        <h2 className="text-lg font-medium text-ink">Tous les items archivés ({allArchived.length})</h2>
        {allArchived.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">Aucun item dans l'archive.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {allArchived.map((it) => {
              const lastMetric = it.metrics?.[0];
              return (
                <li key={it.id} className="rounded-lg border border-surface-muted bg-surface p-3 text-xs">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
                          {typeLabel(it.type)}
                        </span>
                        <span className="font-mono text-ink-muted">{it.trackKey}</span>
                        {it.source === "external" && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                            EXT
                          </span>
                        )}
                        <span className="text-ink-subtle">
                          {it.publishedAt ? fmtDate(it.publishedAt) : "non publié"}
                        </span>
                      </div>
                      <div className="mt-1 truncate font-medium text-ink">
                        {it.publishedUrl ? (
                          <a href={it.publishedUrl} target="_blank" rel="noreferrer" className="hover:underline">
                            {it.finalSubject ?? it.subject}
                          </a>
                        ) : (
                          (it.finalSubject ?? it.subject)
                        )}
                      </div>
                      {lastMetric && (
                        <div className="mt-1 text-ink-muted">
                          {lastMetric.impressions ?? "—"} impr · {lastMetric.engagementCount ?? "—"} eng · {lastMetric.conversions ?? "—"} conv
                          {lastMetric.engagementRate
                            ? ` · taux ${lastMetric.engagementRate.toFixed(1)}%`
                            : ""}
                        </div>
                      )}
                    </div>
                    <form action={unarchiveItemAction}>
                      <input type="hidden" name="id" value={it.id} />
                      <button
                        type="submit"
                        className="rounded px-2 py-0.5 text-ink-muted hover:bg-surface-muted"
                      >
                        Désarchiver
                      </button>
                    </form>
                  </div>

                  <details className="mt-2">
                    <summary className="cursor-pointer text-ink-muted hover:text-ink">
                      + Saisir / mettre à jour les métriques
                    </summary>
                    <form action={recordMetricAction} className="mt-2 grid gap-2 sm:grid-cols-5">
                      <input type="hidden" name="contentId" value={it.id} />
                      <input
                        name="impressions"
                        type="number"
                        min="0"
                        placeholder="Impr."
                        defaultValue={lastMetric?.impressions ?? ""}
                        className="rounded border border-surface-muted bg-surface px-2 py-1"
                      />
                      <input
                        name="engagementCount"
                        type="number"
                        min="0"
                        placeholder="Engag."
                        defaultValue={lastMetric?.engagementCount ?? ""}
                        className="rounded border border-surface-muted bg-surface px-2 py-1"
                      />
                      <input
                        name="conversions"
                        type="number"
                        min="0"
                        placeholder="Conv."
                        defaultValue={lastMetric?.conversions ?? ""}
                        className="rounded border border-surface-muted bg-surface px-2 py-1"
                      />
                      <input
                        name="notes"
                        placeholder="Notes / observations"
                        defaultValue={lastMetric?.notes ?? ""}
                        className="rounded border border-surface-muted bg-surface px-2 py-1 sm:col-span-1"
                      />
                      <button
                        type="submit"
                        className="rounded bg-ink px-2 py-1 text-[11px] font-medium text-white hover:opacity-90"
                      >
                        Enregistrer
                      </button>
                    </form>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
