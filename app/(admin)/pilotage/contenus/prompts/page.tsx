import Link from "next/link";
import { listVersions, type PromptName } from "@/lib/editorial/prompt-store";
import { activateVersionAction, createNewVersionAction } from "./actions";

const PROMPT_LABELS: Record<PromptName, { label: string; help: string }> = {
  brand_block: {
    label: "BRAND_BLOCK",
    help: "Bloc système commun à toutes les générations (voix, lexique, CTA).",
  },
  linkedin_post_system: {
    label: "LinkedIn — system",
    help: "Instructions spécifiques pour la génération de posts LinkedIn.",
  },
  newsletter_system: {
    label: "Newsletter — system",
    help: "Instructions spécifiques pour les éditions newsletter Substack.",
  },
  seo_article_system: {
    label: "Article SEO — system",
    help: "Instructions spécifiques pour les articles de blog long format.",
  },
  hooks_system: {
    label: "Hooks — system",
    help: "Instructions pour la génération des 3 hooks (1ère ligne) par item.",
  },
  plan_adjuster_system: {
    label: "Plan adjuster — system",
    help: "Instructions pour réajuster le planning selon les KPIs.",
  },
  weekly_theme_system: {
    label: "Thème hebdomadaire — system",
    help: "Instructions pour suggérer 3 thèmes de campagne par semaine.",
  },
};

const NAMES: PromptName[] = [
  "brand_block",
  "linkedin_post_system",
  "newsletter_system",
  "seo_article_system",
  "hooks_system",
  "plan_adjuster_system",
  "weekly_theme_system",
];

export const dynamic = "force-dynamic";

export default async function PromptsPage(): Promise<React.ReactElement> {
  const grouped = await Promise.all(
    NAMES.map(async (n) => ({ name: n, versions: await listVersions(n) }))
  );

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Templates de prompts</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Versionning des prompts système. Une seule version active par template ; rollback sans redéploiement.
          </p>
        </div>
        <Link
          href="/pilotage/contenus/voice"
          className="rounded-md border border-surface-muted px-3 py-1.5 text-xs text-ink-muted hover:bg-surface-muted"
        >
          Voice fingerprint
        </Link>
      </div>

      {grouped.map(({ name, versions }) => {
        const active = versions.find((v) => v.isActive);
        const lastBody = versions[0]?.body ?? "";
        return (
          <section key={name} className="rounded-lg border border-surface-muted bg-surface p-4">
            <div className="flex items-baseline justify-between">
              <div>
                <h2 className="text-sm font-medium text-ink">
                  {PROMPT_LABELS[name].label}
                </h2>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {PROMPT_LABELS[name].help}
                </p>
              </div>
              <span className="text-xs text-ink-subtle">
                {versions.length === 0
                  ? "aucune version (fallback hardcodé)"
                  : active
                    ? `actif : v${active.version}`
                    : `${versions.length} version(s) — fallback hardcodé`}
              </span>
            </div>

            {versions.length > 0 && (
              <ul className="mt-3 divide-y divide-surface-muted/60 text-xs">
                {versions.map((v) => (
                  <li key={v.id} className="flex items-center justify-between py-1.5">
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-ink-muted">v{v.version}</span>
                      {v.isActive && (
                        <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                          ACTIF
                        </span>
                      )}
                      <span className="text-ink-subtle">
                        {new Date(v.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {v.notes && (
                        <span className="text-ink-muted italic truncate max-w-[400px]">— {v.notes}</span>
                      )}
                    </span>
                    {!v.isActive && (
                      <form action={activateVersionAction}>
                        <input type="hidden" name="id" value={v.id} />
                        <button
                          type="submit"
                          className="rounded px-2 py-0.5 text-[11px] text-ink-muted hover:bg-surface-muted"
                        >
                          Activer
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <details className="mt-3 group">
              <summary className="cursor-pointer text-xs text-ink-muted hover:text-ink">
                Créer une nouvelle version
              </summary>
              <form action={createNewVersionAction} className="mt-3 space-y-2">
                <input type="hidden" name="name" value={name} />
                <textarea
                  name="body"
                  required
                  rows={10}
                  defaultValue={active?.body ?? lastBody}
                  className="w-full rounded-md border border-surface-muted bg-surface px-3 py-2 font-mono text-xs leading-relaxed"
                />
                <input
                  name="notes"
                  placeholder="Notes (optionnel)"
                  className="w-full rounded-md border border-surface-muted bg-surface px-3 py-1.5 text-xs"
                />
                <label className="flex items-center gap-2 text-xs text-ink-muted">
                  <input type="checkbox" name="activate" value="1" />
                  Activer immédiatement
                </label>
                <button
                  type="submit"
                  className="rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                >
                  Créer la version v{(versions[0]?.version ?? 0) + 1}
                </button>
              </form>
            </details>
          </section>
        );
      })}
    </div>
  );
}
