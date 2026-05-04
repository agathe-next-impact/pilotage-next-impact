"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

type SaveAction = (formData: FormData) => Promise<void>;
type ImproveAction = (formData: FormData) => Promise<{ ok: boolean; text?: string; message?: string }>;

interface Props {
  /** Valeur initiale (depuis le serveur). */
  initialValue: string;
  /** Action serveur appelée pour sauvegarder. Reçoit FormData avec name="value" et tout ce qui est dans extraFields. */
  saveAction: SaveAction;
  /** Action serveur "Améliorer avec Claude". Reçoit FormData avec name="draft". Retourne le texte amélioré. */
  improveAction?: ImproveAction;
  /** Champs cachés à inclure dans les FormData (ex: id, kind…). */
  extraFields?: Record<string, string | number>;
  /** Type de rendu : input simple ou textarea. */
  multiline?: boolean;
  /** Hauteur des textarea (default 3 lignes). */
  rows?: number;
  /** Classes additionnelles pour le rendu en mode lecture. */
  className?: string;
  /** Texte par défaut si vide. */
  placeholder?: string;
}

export function EditableField({
  initialValue,
  saveAction,
  improveAction,
  extraFields = {},
  multiline = false,
  rows = 3,
  className = "",
  placeholder = "(vide)",
}: Props): React.ReactElement {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [savedValue, setSavedValue] = useState(initialValue);
  const [pending, startTransition] = useTransition();
  const [improving, setImproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Reset si la valeur serveur change (ex: revalidation)
  useEffect(() => {
    setSavedValue(initialValue);
    if (!editing) setValue(initialValue);
  }, [initialValue, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if ("setSelectionRange" in inputRef.current) {
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      }
    }
  }, [editing]);

  function startEdit(): void {
    setError(null);
    setEditing(true);
  }

  function cancelEdit(): void {
    setValue(savedValue);
    setEditing(false);
    setError(null);
  }

  function save(): void {
    if (value.trim() === savedValue.trim()) {
      setEditing(false);
      return;
    }
    const fd = new FormData();
    fd.set("value", value);
    for (const [k, v] of Object.entries(extraFields)) fd.set(k, String(v));
    setError(null);
    startTransition(async () => {
      try {
        await saveAction(fd);
        setSavedValue(value);
        setEditing(false);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  async function improve(): Promise<void> {
    if (!improveAction) return;
    if (value.trim().length === 0) {
      setError("Écris d'abord un brouillon à améliorer.");
      return;
    }
    setError(null);
    setImproving(true);
    try {
      const fd = new FormData();
      fd.set("draft", value);
      for (const [k, v] of Object.entries(extraFields)) fd.set(k, String(v));
      const res = await improveAction(fd);
      if (res.ok && res.text) {
        setValue(res.text);
      } else {
        setError(res.message ?? "Échec de l'amélioration.");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setImproving(false);
    }
  }

  function handleKey(e: React.KeyboardEvent): void {
    if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    } else if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      save();
    } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      save();
    }
  }

  if (!editing) {
    const display = (savedValue ?? "").trim();
    return (
      <button
        type="button"
        onClick={startEdit}
        className={`group inline-flex w-full text-left ${className} cursor-text rounded px-1 -mx-1 hover:bg-surface-muted/40`}
        title="Cliquer pour modifier"
      >
        <span className={display ? "" : "italic text-ink-subtle"}>
          {display || placeholder}
        </span>
        <span className="ml-2 hidden text-[10px] text-ink-subtle group-hover:inline">✎</span>
      </button>
    );
  }

  return (
    <div className="space-y-1">
      {multiline ? (
        <textarea
          ref={(el) => { inputRef.current = el; }}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          rows={rows}
          disabled={pending || improving}
          className={`w-full rounded-md border border-accent bg-surface px-2 py-1 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent ${className}`}
        />
      ) : (
        <input
          ref={(el) => { inputRef.current = el; }}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          disabled={pending || improving}
          className={`w-full rounded-md border border-accent bg-surface px-2 py-1 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent ${className}`}
        />
      )}
      <div className="flex items-center gap-2 text-[11px]">
        <button
          type="button"
          onClick={save}
          disabled={pending || improving}
          className="rounded bg-ink px-2 py-0.5 font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "…" : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={cancelEdit}
          disabled={pending || improving}
          className="rounded px-2 py-0.5 text-ink-muted hover:bg-surface-muted disabled:opacity-50"
        >
          Annuler
        </button>
        {improveAction && (
          <button
            type="button"
            onClick={improve}
            disabled={pending || improving || value.trim().length === 0}
            className="rounded border border-accent/40 px-2 py-0.5 text-accent hover:bg-accent/10 disabled:opacity-50"
            title="Demande à Claude de polir le brouillon en gardant ton intention"
          >
            {improving ? "Claude polit…" : "↻ Améliorer avec Claude"}
          </button>
        )}
        <span className="text-ink-subtle">
          {multiline ? "⌘+Entrée pour sauver" : "Entrée pour sauver"} · Esc pour annuler
        </span>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
