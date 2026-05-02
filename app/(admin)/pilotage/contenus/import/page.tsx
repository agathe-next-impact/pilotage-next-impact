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
            Charge l'export LinkedIn de tes posts/articles + un CSV de métriques pour alimenter l'archive et les analyses.
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
        <summary className="cursor-pointer font-medium text-ink">Comment récupérer l'export LinkedIn ?</summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>Sur LinkedIn, ouvre <em>Settings &amp; Privacy → Data privacy → Get a copy of your data</em>.</li>
          <li>
            Coche <em>« Posts, photos and articles »</em> uniquement (le reste est inutile pour l'analyse).
          </li>
          <li>
            Clique <em>Request archive</em>. LinkedIn t'envoie un mail sous 10 minutes à 24h avec un lien de téléchargement.
          </li>
          <li>
            Décompresse le .zip — tu trouveras notamment <code>Shares.csv</code> (posts) et <code>Articles.csv</code> (articles long format).
          </li>
          <li>
            Charge ici l'un, l'autre, ou les deux (un à la fois). L'app détecte les posts déjà connus par leur URL et propose une mise à jour ; sinon création en archive externe.
          </li>
        </ol>
        <p className="mt-3">
          <strong>Limite :</strong> l'export LinkedIn perso ne contient pas les métriques d'engagement.
          Pour les enrichir, prépare un CSV séparé avec les colonnes <code>url, impressions, reactions, comments, shares, conversions</code> (en relevant les chiffres depuis l'analytics post par post),
          puis charge-le avec le type <em>Métriques</em>.
        </p>
        <p className="mt-2">
          Format CSV métriques accepté (séparateur , ou ;) :
        </p>
        <pre className="mt-1 overflow-x-auto rounded bg-surface px-3 py-2 text-[10px]">{`url,impressions,reactions,comments,shares,conversions
https://www.linkedin.com/posts/agathe-...activity-1234,4820,142,18,7,3
https://www.linkedin.com/posts/agathe-...activity-5678,2110,68,5,2,1`}</pre>
      </details>
    </div>
  );
}
