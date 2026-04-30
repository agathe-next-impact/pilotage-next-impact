import { listContentItems } from "@/lib/editorial/store";
import { listPlanningContexts } from "@/lib/editorial/planning-context";
import {
  listThemes,
  weekStartOf,
  addDays,
  listWeekStarts,
} from "@/lib/editorial/weekly-theme";
import { listHooks } from "@/lib/editorial/hooks";
import { SectionTitle } from "@/components/ui/Card";
import { PlanningChat } from "@/components/editorial/PlanningChat";
import { PlanningContextsList } from "@/components/editorial/PlanningContextsList";
import { WeeklyBlock } from "@/components/editorial/WeeklyBlock";
import { WeekActions } from "@/components/editorial/WeekActions";
import type {
  ContentItem,
  HookSuggestion,
  WeeklyTheme,
} from "@/lib/editorial/types";

export const dynamic = "force-dynamic";

const STRATEGY_END = new Date(Date.UTC(2026, 8, 30)); // 30 sept. 2026

function fmtWeekLabel(d: Date): string {
  const week = Math.ceil(((d.getTime() - new Date(Date.UTC(d.getUTCFullYear(), 0, 1)).getTime()) / 86400000 + 1) / 7);
  return `Semaine ${week}`;
}

export default async function PlanningPage(): Promise<React.ReactElement> {
  const todayWeek = weekStartOf(new Date());

  // Démarrage de la stratégie : la semaine en cours (aujourd'hui)
  // Fin : 30 sept. 2026
  const allWeeks = listWeekStarts(todayWeek, STRATEGY_END);

  const [items, contexts, themes] = await Promise.all([
    listContentItems(),
    listPlanningContexts({ limit: 10 }),
    listThemes({ fromWeek: todayWeek, toWeek: STRATEGY_END }),
  ]);

  // Index : items par semaine
  const itemsByWeek = new Map<string, ContentItem[]>();
  for (const item of items) {
    if (item.status === "skipped") continue;
    const ws = weekStartOf(new Date(item.plannedFor)).toISOString();
    const arr = itemsByWeek.get(ws) ?? [];
    arr.push(item);
    itemsByWeek.set(ws, arr);
  }

  // Index : thèmes par semaine
  const themesByWeek = new Map<string, { active: WeeklyTheme | null; suggestions: WeeklyTheme[] }>();
  for (const t of themes) {
    const ws = new Date(t.weekStart).toISOString();
    const bucket = themesByWeek.get(ws) ?? { active: null, suggestions: [] };
    if (t.status === "active" && !bucket.active) bucket.active = t;
    else if (t.status === "draft") bucket.suggestions.push(t);
    themesByWeek.set(ws, bucket);
  }

  // Hooks pour les items affichés
  const hooksByItem = new Map<number, HookSuggestion[]>();
  for (const item of items) {
    if (item.status === "skipped") continue;
    const hooks = await listHooks(item.id);
    if (hooks.length > 0) hooksByItem.set(item.id, hooks);
  }

  return (
    <div>
      <h1 className="text-xl font-medium text-ink">Planning hebdomadaire</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Démarrage : <strong className="font-medium text-ink">aujourd&rsquo;hui</strong> (semaine du {todayWeek.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })}).
        Pour chaque semaine : 1 thématique de campagne + 3 posts LinkedIn + 1 newsletter Substack + 1 article de blog.
        Tout part vide : <strong className="font-medium text-ink">Claude crée chaque slot avec 3 hooks suggérés</strong> (régénérables sur prompt).
        Les hooks retenus dans les semaines passées <strong className="font-medium text-ink">nourrissent les suggestions futures</strong>.
      </p>

      <SectionTitle>Saisir un facteur imprévu</SectionTitle>
      <PlanningChat />

      <SectionTitle>Calendrier — semaines à venir ({allWeeks.length})</SectionTitle>

      <div className="mb-3 flex flex-wrap gap-2">
        <WeekActions weekStart={todayWeek.toISOString()} />
      </div>

      <div className="space-y-6">
        {allWeeks.map((ws) => {
          const wsKey = ws.toISOString();
          const isCurrent = ws.getTime() === todayWeek.getTime();
          const isPast = ws < todayWeek;
          const weekItems = itemsByWeek.get(wsKey) ?? [];
          const themeBucket = themesByWeek.get(wsKey) ?? { active: null, suggestions: [] };

          return (
            <WeeklyBlock
              key={wsKey}
              weekStart={ws}
              isCurrent={isCurrent}
              isPast={isPast}
              weekLabel={fmtWeekLabel(ws)}
              items={weekItems}
              hooksByItem={hooksByItem}
              theme={themeBucket.active}
              themeSuggestions={themeBucket.suggestions}
            />
          );
        })}
      </div>

      <SectionTitle>Historique des facteurs signalés</SectionTitle>
      <PlanningContextsList contexts={contexts} />
    </div>
  );
}
