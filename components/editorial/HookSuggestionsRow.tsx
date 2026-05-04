"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  generateHooksAction,
  selectHookAction,
  updateHookAction,
  improveTextAction,
} from "@/app/(admin)/pilotage/contenus/planning/actions";
import { EditableField } from "./EditableField";
import type { HookSuggestion } from "@/lib/editorial/types";

const PATTERN_LABEL: Record<HookSuggestion["pattern"], string> = {
  question: "Question",
  stat: "Stat",
  "contre-intuitif": "Contre-intuitif",
  promesse: "Promesse",
  histoire: "Histoire",
  "cta-direct": "CTA",
};

const PATTERN_CLASS: Record<HookSuggestion["pattern"], string> = {
  question: "bg-accent-light text-accent-dark",
  stat: "bg-success-light text-success",
  "contre-intuitif": "bg-warning-light text-warning",
  promesse: "bg-violet-light text-violet",
  histoire: "bg-surface-muted text-ink-muted",
  "cta-direct": "bg-danger-light text-danger",
};

interface Props {
  contentId: number;
  hooks: HookSuggestion[];
}

export function HookSuggestionsRow({ contentId, hooks }: Props): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPrompt, setShowPrompt] = useState(false);
  const [userPrompt, setUserPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleGenerate(prompt?: string): void {
    const fd = new FormData();
    fd.append("contentId", String(contentId));
    if (prompt) fd.append("userPrompt", prompt);
    setError(null);
    startTransition(async () => {
      try {
        await generateHooksAction(fd);
        setUserPrompt("");
        setShowPrompt(false);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  function handleSelect(hookId: number): void {
    const fd = new FormData();
    fd.append("id", String(hookId));
    startTransition(async () => {
      try {
        await selectHookAction(fd);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-ink-subtle">
          Hooks suggérés ({hooks.length})
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => handleGenerate()}
            disabled={isPending}
            className="rounded bg-surface-muted px-2 py-1 text-[10px] font-medium text-ink-muted hover:bg-surface-subtle disabled:opacity-50"
          >
            {isPending ? "..." : hooks.length === 0 ? "Générer 3 hooks" : "Régénérer"}
          </button>
          <button
            type="button"
            onClick={() => setShowPrompt((s) => !s)}
            disabled={isPending}
            className="rounded bg-accent-light px-2 py-1 text-[10px] font-medium text-accent-dark hover:bg-accent hover:text-white"
          >
            Régénérer avec prompt
          </button>
        </div>
      </div>

      {showPrompt ? (
        <div className="rounded-md border border-surface-muted bg-surface-subtle px-2 py-2">
          <textarea
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            rows={2}
            placeholder="Ex: 'plus chiffré', 'moins agressif', 'angle DAF', 'orienté ROI'..."
            className="w-full rounded border border-surface-muted bg-surface px-2 py-1 text-xs text-ink focus:border-accent focus:outline-none"
            disabled={isPending}
          />
          <div className="mt-1 flex justify-end gap-1">
            <button
              type="button"
              onClick={() => {
                setShowPrompt(false);
                setUserPrompt("");
              }}
              className="rounded px-2 py-0.5 text-[10px] text-ink-muted hover:bg-surface-muted"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => handleGenerate(userPrompt.trim() || undefined)}
              disabled={isPending}
              className="rounded bg-accent px-2 py-0.5 text-[10px] font-medium text-white hover:bg-accent-dark disabled:opacity-50"
            >
              Générer
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="rounded bg-danger-light px-2 py-1 text-[11px] text-danger">{error}</p>
      ) : null}

      {hooks.length === 0 ? (
        <p className="rounded border border-dashed border-surface-muted px-3 py-2 text-[11px] text-ink-subtle">
          Aucun hook généré. Clique sur « Générer 3 hooks » pour que Claude propose 3 variantes.
        </p>
      ) : (
        <ul className="space-y-1">
          {hooks.map((h) => (
            <li
              key={h.id}
              className={`rounded border px-2 py-1.5 text-xs ${
                h.selected
                  ? "border-accent bg-accent-light"
                  : "border-surface-muted bg-surface hover:bg-surface-subtle"
              }`}
            >
              <div className="flex items-start gap-2">
                <span
                  className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-medium ${PATTERN_CLASS[h.pattern]}`}
                >
                  {PATTERN_LABEL[h.pattern]}
                </span>
                <div className="flex-1 leading-relaxed text-ink">
                  <EditableField
                    initialValue={h.hook}
                    saveAction={updateHookAction}
                    improveAction={improveTextAction}
                    extraFields={{ id: h.id, type: "hook_linkedin" }}
                    placeholder="(hook vide)"
                  />
                </div>
                {!h.selected ? (
                  <button
                    type="button"
                    onClick={() => handleSelect(h.id)}
                    disabled={isPending}
                    className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 text-[9px] font-medium text-ink-muted hover:bg-accent hover:text-white disabled:opacity-50"
                  >
                    Choisir
                  </button>
                ) : (
                  <span className="shrink-0 rounded bg-accent px-1.5 py-0.5 text-[9px] font-medium text-white">
                    ✓ Retenu
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
