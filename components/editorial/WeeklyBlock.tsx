import { CreateSlotButton, DeleteSlotButton } from "./SlotButtons";
import { HookSuggestionsRow } from "./HookSuggestionsRow";
import { WeeklyThemeBlock } from "./WeeklyThemeBlock";
import { StatusBadge } from "./StatusBadge";
import Link from "next/link";
import type {
  ContentItem,
  HookSuggestion,
  WeeklyTheme,
} from "@/lib/editorial/types";

const LI_SLOTS_TARGET = 3; // 3 LI par défaut, max 5

interface Props {
  weekStart: Date;
  isCurrent: boolean;
  isPast: boolean;
  weekLabel: string;
  items: ContentItem[];
  hooksByItem: Map<number, HookSuggestion[]>;
  theme: WeeklyTheme | null;
  themeSuggestions: WeeklyTheme[];
}

function fmtDay(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function ItemRow({
  item,
  hooks,
}: {
  item: ContentItem;
  hooks: HookSuggestion[];
}): React.ReactElement {
  return (
    <div className="rounded-md border border-surface-muted bg-surface px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
              {item.trackKey}
            </span>
            <Link
              href={{ pathname: `/pilotage/contenus/${item.id}` }}
              className="truncate text-sm font-medium text-ink hover:text-accent"
            >
              {item.finalSubject ?? item.subject}
            </Link>
          </div>
          {item.brief && item.brief !== "(brief à compléter)" ? (
            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-ink-muted">
              {item.brief}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <StatusBadge status={item.status} />
          <DeleteSlotButton contentId={item.id} />
        </div>
      </div>

      <div className="mt-2.5 border-t border-surface-muted pt-2">
        <HookSuggestionsRow contentId={item.id} hooks={hooks} />
      </div>
    </div>
  );
}

function EmptySlot({
  weekStart,
  type,
  label,
}: {
  weekStart: string;
  type: "linkedin_post" | "newsletter_edition" | "seo_article";
  label: string;
}): React.ReactElement {
  return (
    <div className="rounded-md border border-dashed border-surface-muted bg-surface-subtle/50 px-3 py-2.5">
      <CreateSlotButton weekStart={weekStart} type={type} label={label} />
    </div>
  );
}

export function WeeklyBlock({
  weekStart,
  isCurrent,
  isPast,
  weekLabel,
  items,
  hooksByItem,
  theme,
  themeSuggestions,
}: Props): React.ReactElement {
  const wsKey = weekStart.toISOString();
  const wsEnd = new Date(weekStart);
  wsEnd.setUTCDate(wsEnd.getUTCDate() + 6);

  const liItems = items.filter((i) => i.type === "linkedin_post");
  const nlItem = items.find((i) => i.type === "newsletter_edition");
  const seoItem = items.find((i) => i.type === "seo_article");

  // Combien de slots LI manquants à afficher comme "à créer" (jusqu'à 3)
  const liEmptySlots = Math.max(0, LI_SLOTS_TARGET - liItems.length);

  return (
    <section
      className={`rounded-lg border bg-surface px-4 py-4 ${
        isCurrent
          ? "border-accent shadow-card"
          : isPast
            ? "border-surface-muted opacity-70"
            : "border-surface-muted"
      }`}
    >
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-surface-muted pb-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-ink-subtle">
            {isCurrent ? "Cette semaine" : isPast ? "Semaine passée" : "Semaine à venir"}
          </p>
          <h2 className="text-base font-medium text-ink">
            {weekLabel} ({fmtDay(weekStart)} → {fmtDay(wsEnd)})
          </h2>
          <p className="mt-0.5 text-[11px] text-ink-subtle">
            {liItems.length}/{Math.max(LI_SLOTS_TARGET, liItems.length)} LinkedIn ·
            {nlItem ? " 1/1 " : " 0/1 "}Substack ·
            {seoItem ? " 1/1 " : " 0/1 "}Article
          </p>
        </div>
      </header>

      <WeeklyThemeBlock active={theme} suggestions={themeSuggestions} />

      <div className="mt-4 space-y-3">
        {/* LinkedIn */}
        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-accent-dark">
            LinkedIn ({liItems.length}{liEmptySlots > 0 ? ` + ${liEmptySlots} à créer` : ""})
          </p>
          <div className="space-y-2">
            {liItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                hooks={hooksByItem.get(item.id) ?? []}
              />
            ))}
            {!isPast && Array.from({ length: liEmptySlots }, (_, i) => (
              <EmptySlot
                key={`li-empty-${i}`}
                weekStart={wsKey}
                type="linkedin_post"
                label={`+ Créer post LinkedIn ${liItems.length + i + 1}/${LI_SLOTS_TARGET}`}
              />
            ))}
            {!isPast && liItems.length >= LI_SLOTS_TARGET && liItems.length < 5 ? (
              <div className="rounded-md border border-dashed border-surface-muted bg-surface-subtle/30 px-3 py-1.5">
                <CreateSlotButton
                  weekStart={wsKey}
                  type="linkedin_post"
                  variant="ghost"
                  label={`+ Ajouter un 4e/5e post LinkedIn (${liItems.length}/5)`}
                />
              </div>
            ) : null}
          </div>
        </div>

        {/* Newsletter Substack — 1 par semaine */}
        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-violet">
            Newsletter Substack (1/semaine)
          </p>
          {nlItem ? (
            <ItemRow item={nlItem} hooks={hooksByItem.get(nlItem.id) ?? []} />
          ) : !isPast ? (
            <EmptySlot
              weekStart={wsKey}
              type="newsletter_edition"
              label="+ Créer édition newsletter de la semaine"
            />
          ) : (
            <p className="rounded-md border border-dashed border-surface-muted px-3 py-2 text-[11px] text-ink-subtle">
              Aucune newsletter cette semaine
            </p>
          )}
        </div>

        {/* SEO / Blog */}
        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-success">
            Article blog (1/semaine)
          </p>
          {seoItem ? (
            <ItemRow item={seoItem} hooks={hooksByItem.get(seoItem.id) ?? []} />
          ) : !isPast ? (
            <EmptySlot
              weekStart={wsKey}
              type="seo_article"
              label="+ Créer article de blog"
            />
          ) : (
            <p className="rounded-md border border-dashed border-surface-muted px-3 py-2 text-[11px] text-ink-subtle">
              Aucun article cette semaine
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
