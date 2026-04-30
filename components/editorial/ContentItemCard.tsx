import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { StatusBadge } from "./StatusBadge";
import type { ContentItem } from "@/lib/editorial/types";

const typeIcon: Record<ContentItem["type"], string> = {
  linkedin_post: "in",
  newsletter_edition: "n°",
  seo_article: "art.",
};

const typeAccent: Record<ContentItem["type"], "blue" | "violet" | "green"> = {
  linkedin_post: "blue",
  newsletter_edition: "violet",
  seo_article: "green",
};

export function ContentItemCard({ item }: { item: ContentItem }): React.ReactElement {
  const planned = new Date(item.plannedFor);
  const dateLabel = planned.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <Card accent={typeAccent[item.type]}>
      <CardBody>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-subtle">
                {typeIcon[item.type]} · {item.trackKey}
              </span>
              <StatusBadge status={item.status} />
            </div>
            <h3 className="mt-1 truncate text-sm font-medium text-ink">{item.subject}</h3>
            <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{item.brief}</p>
            <p className="mt-2 text-xs text-ink-subtle">
              Prévu le {dateLabel}
              {item.generatedAt ? ` · Drafté ${new Date(item.generatedAt).toLocaleDateString("fr-FR")}` : ""}
              {item.generatedModel ? ` (${item.generatedModel})` : ""}
            </p>
          </div>
          <Link
            href={{ pathname: `/pilotage/contenus/${item.id}` }}
            className="shrink-0 text-xs font-medium text-accent hover:text-accent-dark"
          >
            Ouvrir →
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
