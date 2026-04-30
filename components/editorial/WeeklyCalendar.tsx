import Link from "next/link";
import type { ContentItem } from "@/lib/editorial/types";

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const TYPE_BADGE: Record<ContentItem["type"], { label: string; cls: string }> = {
  linkedin_post: { label: "LI", cls: "bg-accent-light text-accent-dark" },
  newsletter_edition: { label: "NL", cls: "bg-violet-light text-violet" },
  seo_article: { label: "SEO", cls: "bg-success-light text-success" },
};

const STATUS_DOT: Record<ContentItem["status"], string> = {
  planned: "bg-ink-subtle",
  drafted: "bg-accent",
  validated: "bg-violet",
  published: "bg-success",
  skipped: "bg-warning",
};

function startOfWeek(d: Date): Date {
  const u = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = u.getUTCDay();
  const offset = (day + 6) % 7;
  u.setUTCDate(u.getUTCDate() - offset);
  return u;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

function sameDayUTC(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear()
    && a.getUTCMonth() === b.getUTCMonth()
    && a.getUTCDate() === b.getUTCDate();
}

export function WeeklyCalendar({
  items,
  weeks = 4,
}: {
  items: ContentItem[];
  weeks?: number;
}): React.ReactElement {
  const today = new Date();
  const firstMonday = startOfWeek(today);

  return (
    <div className="space-y-3">
      {Array.from({ length: weeks }, (_, w) => {
        const weekStart = addDays(firstMonday, w * 7);
        return (
          <div
            key={w}
            className="rounded-md border border-surface-muted bg-surface px-3 py-3"
          >
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-subtle">
              Semaine du {weekStart.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
              {w === 0 ? " · cette semaine" : ""}
            </p>
            <div className="grid grid-cols-7 gap-1">
              {DAY_LABELS.map((label, di) => {
                const day = addDays(weekStart, di);
                const dayItems = items.filter((i) =>
                  sameDayUTC(new Date(i.plannedFor), day)
                );
                const isToday = sameDayUTC(day, today);
                const isPast = day < new Date(today.getTime() - 86_400_000);
                return (
                  <div
                    key={di}
                    className={`min-h-[80px] rounded border px-1.5 py-1 text-[11px] ${
                      isToday
                        ? "border-accent bg-accent-light"
                        : isPast
                          ? "border-surface-muted bg-surface-subtle opacity-60"
                          : "border-surface-muted bg-surface"
                    }`}
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="font-medium text-ink">{label}</span>
                      <span className="text-ink-subtle">{day.getUTCDate()}</span>
                    </div>
                    <ul className="mt-1 space-y-1">
                      {dayItems.map((item) => {
                        const badge = TYPE_BADGE[item.type];
                        return (
                          <li key={item.id}>
                            <Link
                              href={`/pilotage/contenus/${item.id}`}
                              className="block rounded-sm px-1 py-0.5 hover:bg-surface-muted"
                              title={item.subject}
                            >
                              <span className="flex items-center gap-1">
                                <span
                                  className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT[item.status]}`}
                                  aria-hidden
                                />
                                <span
                                  className={`rounded px-1 text-[9px] font-medium ${badge.cls}`}
                                >
                                  {badge.label}
                                </span>
                                <span className="truncate text-ink">{item.trackKey}</span>
                              </span>
                              <span className="mt-0.5 line-clamp-1 text-[10px] text-ink-muted">
                                {item.subject}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
