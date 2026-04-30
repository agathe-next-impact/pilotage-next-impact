import {
  listContentItems,
  listPendingPlanRevisions,
} from "@/lib/editorial/store";
import { Card, CardBody, SectionTitle } from "@/components/ui/Card";
import { ContentItemCard } from "@/components/editorial/ContentItemCard";
import { PlanRevisionPanel } from "@/components/editorial/PlanRevisionPanel";
import type { ContentItem, ContentType } from "@/lib/editorial/types";

export const dynamic = "force-dynamic";

const typeLabels: Record<ContentType, string> = {
  linkedin_post: "LinkedIn",
  newsletter_edition: "Newsletter",
  seo_article: "Articles SEO",
};

const typeOrder: ContentType[] = ["linkedin_post", "newsletter_edition", "seo_article"];

export default async function ContenusOverview(): Promise<React.ReactElement> {
  const [items, revisions] = await Promise.all([
    listContentItems(),
    listPendingPlanRevisions(),
  ]);

  const byType = new Map<ContentType, ContentItem[]>();
  for (const t of typeOrder) byType.set(t, []);
  for (const item of items) byType.get(item.type)?.push(item);

  const counts = (type: ContentType) => {
    const list = byType.get(type) ?? [];
    return {
      total: list.length,
      drafted: list.filter((i) => i.status === "drafted").length,
      validated: list.filter((i) => i.status === "validated").length,
      published: list.filter((i) => i.status === "published").length,
    };
  };

  return (
    <div>
      <h1 className="text-xl font-medium text-ink">Calendrier éditorial</h1>
      <p className="mt-1 text-sm text-ink-muted">
        21 publications planifiées sur 6 mois — générées avec Claude, validées par toi, ajustées selon les KPIs.
      </p>

      <SectionTitle>État global</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {typeOrder.map((t) => {
          const c = counts(t);
          return (
            <Card key={t}>
              <CardBody>
                <p className="text-xs uppercase tracking-wide text-ink-subtle">{typeLabels[t]}</p>
                <p className="mt-1 text-2xl font-medium text-ink">
                  {c.published}<span className="text-sm font-normal text-ink-subtle"> / {c.total}</span>
                </p>
                <p className="mt-1 text-xs text-ink-muted">publiés · {c.drafted} draft · {c.validated} validés</p>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <PlanRevisionPanel revisions={revisions} />

      {typeOrder.map((t) => {
        const list = byType.get(t) ?? [];
        if (list.length === 0) return null;
        return (
          <div key={t}>
            <SectionTitle>{typeLabels[t]} ({list.length})</SectionTitle>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {list.map((item) => (
                <ContentItemCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
