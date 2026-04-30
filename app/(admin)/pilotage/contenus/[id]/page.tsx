import { notFound } from "next/navigation";
import Link from "next/link";
import { getContentItem, listRevisions } from "@/lib/editorial/store";
import { Card, CardBody, SectionTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/editorial/StatusBadge";
import { GenerateForm } from "@/components/editorial/GenerateForm";
import { ContentEditor } from "@/components/editorial/ContentEditor";

export const dynamic = "force-dynamic";

export default async function ContentItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  const numId = Number.parseInt(id, 10);
  if (!Number.isFinite(numId)) notFound();

  const item = await getContentItem(numId, /* includeMedia */ true);
  if (!item) notFound();

  const revisions = await listRevisions(numId);
  const planned = new Date(item.plannedFor);

  const typeLabel: Record<typeof item.type, string> = {
    linkedin_post: "Post LinkedIn",
    newsletter_edition: "Édition newsletter",
    seo_article: "Article SEO",
  };

  return (
    <div>
      <Link href="/pilotage/contenus" className="text-xs text-ink-muted hover:text-ink">
        ← Calendrier éditorial
      </Link>

      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-subtle">
            {typeLabel[item.type]} · piste {item.trackKey}
          </p>
          <h1 className="mt-1 text-xl font-medium text-ink">
            {item.finalSubject ?? item.subject}
          </h1>
          <p className="mt-1 text-xs text-ink-muted">
            Prévu le {planned.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>
        <StatusBadge status={item.status} />
      </div>

      <Card className="mt-4">
        <CardBody>
          <p className="text-xs uppercase tracking-wide text-ink-subtle">Brief</p>
          <p className="mt-1 text-sm leading-relaxed text-ink">{item.brief}</p>
          {item.meta ? (
            <p className="mt-3 text-xs text-ink-subtle font-mono">
              meta: {JSON.stringify(item.meta)}
            </p>
          ) : null}
        </CardBody>
      </Card>

      <SectionTitle>Génération avec Claude</SectionTitle>
      <GenerateForm item={item} />

      {item.draft ? (
        <>
          <SectionTitle>Édition + médias + publication</SectionTitle>
          <ContentEditor item={item} />
        </>
      ) : null}

      {revisions.length > 1 ? (
        <>
          <SectionTitle>Historique des générations ({revisions.length})</SectionTitle>
          <Card>
            <CardBody>
              <ul className="space-y-2">
                {revisions.map((r) => (
                  <li key={r.id} className="border-b border-surface-muted py-2 last:border-b-0">
                    <p className="text-xs text-ink-muted">
                      {new Date(r.createdAt).toLocaleString("fr-FR")} · {r.payload.model}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-ink">{r.payload.subject}</p>
                    {r.payload.feedback ? (
                      <p className="mt-1 rounded bg-surface-muted px-2 py-1 text-xs text-ink-muted">
                        Retour : {r.payload.feedback}
                      </p>
                    ) : null}
                    {r.payload.selfReview ? (
                      <p className="mt-1 text-xs italic text-ink-subtle">
                        Auto-critique Claude : {r.payload.selfReview}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </>
      ) : null}
    </div>
  );
}
