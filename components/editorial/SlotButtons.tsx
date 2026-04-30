"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSlotAction, deleteSlotAction } from "@/app/(admin)/pilotage/contenus/planning/actions";
import type { ContentType } from "@/lib/editorial/types";

const TYPE_LABEL: Record<ContentType, string> = {
  linkedin_post: "Post LinkedIn",
  newsletter_edition: "Newsletter",
  seo_article: "Article blog",
};

export function CreateSlotButton({
  weekStart,
  type,
  variant = "primary",
  label,
}: {
  weekStart: string;
  type: ContentType;
  variant?: "primary" | "ghost";
  label?: string;
}): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onClick(): void {
    const fd = new FormData();
    fd.append("weekStart", weekStart);
    fd.append("type", type);
    startTransition(async () => {
      try {
        await createSlotAction(fd);
        router.refresh();
      } catch (err) {
        alert((err as Error).message);
      }
    });
  }

  const cls = variant === "primary"
    ? "rounded-md border border-dashed border-accent bg-accent-light/40 px-3 py-2 text-xs font-medium text-accent-dark hover:bg-accent hover:text-white"
    : "rounded-md border border-dashed border-surface-muted bg-surface-subtle px-3 py-2 text-xs font-medium text-ink-muted hover:border-accent hover:text-accent";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className={`${cls} disabled:opacity-50`}
    >
      {isPending ? "Création + hooks…" : (label ?? `+ Créer ${TYPE_LABEL[type]}`)}
    </button>
  );
}

export function DeleteSlotButton({ contentId }: { contentId: number }): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onClick(): void {
    if (!confirm("Supprimer ce slot et son contenu ?")) return;
    const fd = new FormData();
    fd.append("id", String(contentId));
    startTransition(async () => {
      try {
        await deleteSlotAction(fd);
        router.refresh();
      } catch (err) {
        alert((err as Error).message);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className="rounded bg-danger-light px-1.5 py-0.5 text-[10px] font-medium text-danger hover:bg-danger hover:text-white disabled:opacity-50"
    >
      {isPending ? "..." : "Supprimer"}
    </button>
  );
}
