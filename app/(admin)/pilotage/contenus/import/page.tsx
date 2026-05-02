import Link from "next/link";
import { ImportClient } from "./ImportClient";

export const dynamic = "force-dynamic";

export default function ImportPage(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Import LinkedIn</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Charge un export (.csv ou .xlsx) pour alimenter l'archive et les métriques.
          </p>
        </div>
        <Link
          href="/pilotage/contenus/archive"
          className="rounded-md border border-surface-muted px-3 py-1.5 text-xs text-ink-muted hover:bg-surface-muted"
        >
          ← Retour à l'archive
        </Link>
      </div>

      <ImportClient />

      <details className="rounded-lg border border-surface-muted bg-surface-subtle p-4 text-xs text-ink-muted">
        <summary className="cursor-pointer font-medium text-ink">D'où viennent les fichiers ?</summary>
        <div className="mt-3 space-y-4">
          <div>
            <p className="font-medium text-ink">Option 1 — Export complet LinkedIn (sans métriques)</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li><em>Settings &amp; Privacy → Data privacy → Get a copy of your data</em></li>
              <li>Coche <em>« Posts, photos and articles »</em>, demande l'archive</li>
              <li>LinkedIn envoie un mail avec un .zip sous 10 min à 24 h</li>
              <li>Charge ici <code>Shares.csv</code> (posts) ou <code>Articles.csv</code></li>
            </ol>
            <p className="mt-1 text-[11px]">
              ⚠️ Cet export contient l'historique des posts mais <strong>pas les métriques d'engagement</strong> — il sert à créer la fiche de chaque post dans l'archive.
            </p>
          </div>

          <div>
            <p className="font-medium text-ink">Option 2 — Export Page Analytics (Page company)</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Sur ta Page LinkedIn → <em>Analytics → Content</em></li>
              <li>Choisis la période (jusqu'à 365 j)</li>
              <li>Bouton <em>Export</em> en haut à droite → <em>Posts</em> → format .xlsx</li>
              <li>Charge le fichier ici en type <em>Posts</em></li>
            </ol>
            <p className="mt-1 text-[11px]">
              ✅ L'export Page Analytics inclut <strong>impressions, réactions, commentaires, partages, taux d'engagement et clics</strong>. Date du post et métriques sont enregistrées en un seul import.
            </p>
          </div>

          <div>
            <p className="font-medium text-ink">Option 3 — CSV/XLSX manuel (profil perso)</p>
            <p className="mt-1">
              Le profil perso n'a pas d'export bulk de métriques. Le plus pratique : prépare toi-même un fichier avec ces colonnes (FR ou EN, , ou ; comme séparateur, .csv ou .xlsx) :
            </p>
            <pre className="mt-2 overflow-x-auto rounded bg-surface px-3 py-2 text-[10px]">{`url,date,impressions,reactions,comments,shares,conversions
https://www.linkedin.com/feed/update/urn:li:activity:7185...,2026-04-12,4820,142,18,7,3
https://www.linkedin.com/feed/update/urn:li:activity:7186...,2026-04-15,2110,68,5,2,1`}</pre>
            <p className="mt-1 text-[11px]">
              Pour relever les chiffres : sur ton profil → onglet <em>Posts → Analytics</em> de chaque post. 5-10 min pour un mois de publi.
            </p>
          </div>

          <div>
            <p className="font-medium text-ink">Colonnes reconnues automatiquement</p>
            <ul className="mt-1 list-disc pl-5 text-[11px]">
              <li><strong>URL</strong> : url, sharelink, articlelink, posturl, lien…</li>
              <li><strong>Date</strong> : date, publishedDate, createdDate, posteddate…</li>
              <li><strong>Titre/contenu</strong> : title, articleTitle, postTitle, sujet, sharecommentary, content, body, contenu…</li>
              <li><strong>Métriques</strong> : impressions/vues, reactions/likes/réactions, comments/commentaires, shares/partages/reposts, conversions/clicks/clics</li>
            </ul>
          </div>
        </div>
      </details>
    </div>
  );
}
