import type { CalendarDay } from "@/lib/analytics";

const INTENSITY_COLORS = ["#f3f4f6", "#bbf7d0", "#4ade80", "#16a34a"];

export function CalendarHeatmap({ data }: { data: CalendarDay[] }): React.ReactElement {
  if (data.length === 0) {
    return <p className="text-xs text-ink-subtle italic">Pas encore de données.</p>;
  }
  // Grouper par semaine (chaque colonne = 1 semaine)
  const weeks: CalendarDay[][] = [];
  let currentWeek: CalendarDay[] = [];
  let lastWeekday = -1;
  for (const day of data) {
    if (day.weekday <= lastWeekday) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
    lastWeekday = day.weekday;
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <div className="flex gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {Array.from({ length: 7 }, (_, dayIdx) => {
                const day = week.find((d) => d.weekday === dayIdx);
                if (!day) {
                  return <div key={dayIdx} className="h-3 w-3" />;
                }
                const color = INTENSITY_COLORS[day.intensity] ?? INTENSITY_COLORS[0];
                const tooltip = [
                  day.date,
                  day.hasPost ? "post LinkedIn" : null,
                  day.hasNewsletter ? "newsletter" : null,
                  day.hasAction ? "action SEO/GEO" : null,
                ].filter(Boolean).join(" · ") || day.date;
                return (
                  <div
                    key={dayIdx}
                    className="h-3 w-3 rounded-sm"
                    style={{ backgroundColor: color }}
                    title={tooltip}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-ink-subtle">
        <span>Moins</span>
        {INTENSITY_COLORS.map((c, i) => (
          <div key={i} className="h-3 w-3 rounded-sm" style={{ backgroundColor: c }} />
        ))}
        <span>Plus</span>
      </div>
    </div>
  );
}
