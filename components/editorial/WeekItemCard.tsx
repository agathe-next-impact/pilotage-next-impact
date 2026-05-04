import Link from "next/link";
import { HookSuggestionsRow } from "./HookSuggestionsRow";
import { StatusBadge } from "./StatusBadge";
import { EditableField } from "./EditableField";
import {
  updateItemSubjectAction,
  improveTextAction,
} from "@/app/(admin)/pilotage/contenus/planning/actions";
import type { ContentItem, HookSuggestion } from "@/lib/editorial/types";

const TYPE_BADGE: Record<ContentItem["type"], { label: string; cls: string }> = {
  linkedin_post: { label: "LinkedIn", cls: "bg-accent-light text-accent-dark" },
  newsletter_edition: { label: "Newsletter", cls: "bg-violet-light text-violet" },
  seo_article: { label: "Article SEO", cls: "bg-success-light text-success" },
};

export function WeekItemCard({
  item,
  hooks,
}: {
  item: ContentItem;
  hooks: HookSuggestion[];
}): React.ReactElement {
  const date = new Date(item.plannedFor);
  const badge = TYPE_BADGE[item.type];
  const displaySubject = item.finalSubject ?? item.subject;

  return (
    <div className="rounded-md border border-surface-muted bg-surface px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${badge.cls}`}>
              {badge.label}
            </span>
            <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
              {item.trackKey}
            </span>
            <span className="text-[10px] text-ink-subtle">
              {date.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" })}
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <div className="flex-1 text-sm font-medium text-ink">
              <EditableField
                initialValue={displaySubject}
                saveAction={updateItemSubjectAction}
                improveAction={improveTextAction}
                extraFields={{ id: item.id, type: "post_subject" }}
                placeholder="Sujet du post"
              />
            </div>
            <Link
              href={{ pathname: `/pilotage/contenus/${item.id}` }}
              className="shrink-0 text-[11px] text-ink-muted hover:text-accent"
              title="Ouvrir l'éditeur complet"
            >
              ↗
            </Link>
          </div>
        </div>
        <StatusBadge status={item.status} />
      </div>

      <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-ink-muted">
        {item.brief}
      </p>

      <div className="mt-3 border-t border-surface-muted pt-3">
        <HookSuggestionsRow contentId={item.id} hooks={hooks} />
      </div>
    </div>
  );
}
