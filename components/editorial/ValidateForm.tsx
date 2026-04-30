import { Button } from "@/components/ui/Button";
import { validateContentAction, publishContentAction } from "@/app/(admin)/pilotage/contenus/actions";
import type { ContentItem } from "@/lib/editorial/types";

export function ValidateForm({ item }: { item: ContentItem }): React.ReactElement {
  const initial = item.finalBody ?? item.draft ?? "";

  return (
    <div className="space-y-4">
      <form action={validateContentAction} className="space-y-3">
        <input type="hidden" name="id" value={item.id} />
        <label className="block text-xs text-ink-muted">
          Version finale (éditable avant validation)
          <textarea
            name="finalBody"
            rows={20}
            defaultValue={initial}
            className="mt-1 w-full rounded-md border border-surface-muted bg-surface px-3 py-2 font-mono text-xs text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </label>
        <div className="flex gap-2">
          <Button type="submit" variant="primary">
            Valider cette version
          </Button>
        </div>
      </form>

      {item.status === "validated" ? (
        <form action={publishContentAction}>
          <input type="hidden" name="id" value={item.id} />
          <Button type="submit" variant="secondary">
            Marquer comme publié
          </Button>
        </form>
      ) : null}
    </div>
  );
}
