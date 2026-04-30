import { listContentItems } from "@/lib/editorial/store";
import { listPlanningContexts } from "@/lib/editorial/planning-context";
import { listPendingPlanRevisions } from "@/lib/editorial/store";
import { SectionTitle } from "@/components/ui/Card";
import { PlanningChat } from "@/components/editorial/PlanningChat";
import { WeeklyCalendar } from "@/components/editorial/WeeklyCalendar";
import { PlanningContextsList } from "@/components/editorial/PlanningContextsList";
import { PlanRevisionPanel } from "@/components/editorial/PlanRevisionPanel";

export const dynamic = "force-dynamic";

export default async function PlanningPage(): Promise<React.ReactElement> {
  const [items, contexts, revisions] = await Promise.all([
    listContentItems(),
    listPlanningContexts({ limit: 20 }),
    listPendingPlanRevisions(),
  ]);

  return (
    <div>
      <h1 className="text-xl font-medium text-ink">Planning hebdomadaire adaptatif</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Le plan s&rsquo;ajuste à 2 sources : tes <strong className="font-medium">facteurs imprévus</strong> saisis
        ci-dessous, et les <strong className="font-medium">signaux KPI</strong> issus du dashboard.
        Claude propose des changements concrets que tu valides ou refuses.
      </p>

      <SectionTitle>Saisir un facteur imprévu</SectionTitle>
      <PlanningChat />

      <SectionTitle>Calendrier — 4 prochaines semaines</SectionTitle>
      <WeeklyCalendar items={items} weeks={4} />

      <SectionTitle>Propositions d&rsquo;ajustement Claude (en attente)</SectionTitle>
      <PlanRevisionPanel revisions={revisions} />

      <SectionTitle>Historique des facteurs signalés</SectionTitle>
      <PlanningContextsList contexts={contexts} />
    </div>
  );
}
