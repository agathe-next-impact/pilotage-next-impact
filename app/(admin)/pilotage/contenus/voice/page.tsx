import Link from "next/link";
import { listPatterns, type VoicePatternKind } from "@/lib/editorial/voice-fingerprint";
import {
  addPatternAction,
  togglePatternAction,
  deletePatternAction,
  extractPatternsAction,
} from "./actions";

const KIND_LABELS: Record<VoicePatternKind, string> = {
  "lexicon-loved": "Lexique apprécié",
  "lexicon-banned": "Lexique banni",
  "phrase-loved": "Tournures appréciées",
  "phrase-banned": "Tournures bannies",
  structure: "Structures de phrase",
  "winning-hook": "Hooks gagnants",
};

const KIND_ORDER: VoicePatternKind[] = [
  "lexicon-loved",
  "lexicon-banned",
  "phrase-loved",
  "phrase-banned",
  "winning-hook",
  "structure",
];

export const dynamic = "force-dynamic";

export default async function VoicePage(): Promise<React.ReactElement> {
  const patterns = await listPatterns();
  const grouped = new Map<VoicePatternKind, typeof patterns>();
  for (const k of KIND_ORDER) grouped.set(k, []);
  for (const p of patterns) {
    const arr = grouped.get(p.kind);
    if (arr) arr.push(p);
  }

  const total = patterns.length;
  const active = patterns.filter((p) => p.active).length;

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Voice fingerprint</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Patterns injectés dynamiquement dans le BRAND_BLOCK Claude. {active} actifs sur {total}.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/pilotage/contenus/prompts"
            className="rounded-md border border-surface-muted px-3 py-1.5 text-xs text-ink-muted hover:bg-surface-muted"
          >
            Templates de prompts
          </Link>
          <form action={extractPatternsAction}>
            <button
              type="submit"
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            >
              Extraire depuis publiés
            </button>
          </form>
        </div>
      </div>

      <section className="rounded-lg border border-surface-muted bg-surface p-4">
        <h2 className="text-sm font-medium text-ink">Ajouter un pattern</h2>
        <form action={addPatternAction} className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr_80px_auto]">
          <select
            name="kind"
            required
            className="rounded-md border border-surface-muted bg-surface px-2 py-1.5 text-sm"
          >
            {KIND_ORDER.map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
          <input
            name="text"
            required
            placeholder="Mot, phrase ou structure"
            className="rounded-md border border-surface-muted bg-surface px-2 py-1.5 text-sm"
          />
          <input
            name="weight"
            type="number"
            min="0"
            max="5"
            step="0.5"
            defaultValue="1"
            title="Poids (0-5)"
            className="rounded-md border border-surface-muted bg-surface px-2 py-1.5 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            Ajouter
          </button>
        </form>
      </section>

      {KIND_ORDER.map((kind) => {
        const items = grouped.get(kind) ?? [];
        if (items.length === 0) {
          return (
            <section key={kind} className="rounded-lg border border-surface-muted bg-surface p-4">
              <h2 className="text-sm font-medium text-ink">{KIND_LABELS[kind]}</h2>
              <p className="mt-2 text-xs text-ink-muted">Aucun pattern dans cette catégorie.</p>
            </section>
          );
        }
        return (
          <section key={kind} className="rounded-lg border border-surface-muted bg-surface p-4">
            <h2 className="text-sm font-medium text-ink">
              {KIND_LABELS[kind]} <span className="text-ink-muted">({items.length})</span>
            </h2>
            <ul className="mt-3 space-y-1">
              {items.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded border border-surface-muted/50 bg-surface-muted/20 px-3 py-1.5 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <span
                      className={
                        p.active ? "text-ink" : "text-ink-subtle line-through"
                      }
                    >
                      {p.text}
                    </span>
                    <span className="ml-2 text-ink-subtle">
                      [{p.source} · poids {p.weight} · {p.appearances}×]
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <form action={togglePatternAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="active" value={p.active ? "0" : "1"} />
                      <button
                        type="submit"
                        className="rounded px-2 py-0.5 text-xs text-ink-muted hover:bg-surface"
                        title={p.active ? "Désactiver" : "Activer"}
                      >
                        {p.active ? "🟢" : "⚪"}
                      </button>
                    </form>
                    <form action={deletePatternAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <button
                        type="submit"
                        className="rounded px-2 py-0.5 text-xs text-ink-muted hover:bg-red-50 hover:text-red-600"
                        title="Supprimer"
                      >
                        ✕
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
