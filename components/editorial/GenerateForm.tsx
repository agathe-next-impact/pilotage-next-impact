import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { generateContentAction } from "@/app/(admin)/pilotage/contenus/actions";
import type { ContentItem } from "@/lib/editorial/types";

export function GenerateForm({ item }: { item: ContentItem }): React.ReactElement {
  const isFirstGen = !item.draft;

  return (
    <form action={generateContentAction} className="space-y-3">
      <input type="hidden" name="id" value={item.id} />

      {!isFirstGen ? (
        <Card>
          <CardBody>
            <label className="block text-xs text-ink-muted">
              Retour à intégrer dans la régénération (ce qui ne va pas, ce qu'il faut accentuer)
              <textarea
                name="feedback"
                rows={3}
                className="mt-1 w-full rounded-md border border-surface-muted bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Ex : trop technique au milieu, accentue l'argument fiscal au début, raccourcis le 3e paragraphe…"
              />
            </label>
          </CardBody>
        </Card>
      ) : null}

      <Button type="submit" variant="primary">
        {isFirstGen ? "Générer le 1er draft avec Claude" : "Régénérer avec Claude"}
      </Button>
    </form>
  );
}
