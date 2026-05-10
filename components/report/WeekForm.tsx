"use client";

import { useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  saveReportAction,
  deleteReportAction,
} from "@/app/(admin)/pilotage/semaine/[date]/actions";
import type {
  WeekReportFull,
  WeekPostInput,
  WeekNewsletterInput,
  SeoGeoActionInput,
  SeoGeoActionType,
} from "@/lib/reports";

interface Props {
  weekStart: string;       // ISO Monday
  weekStartKey: string;    // YYYY-MM-DD
  initial: WeekReportFull | null;
}

const ACTION_TYPES: { value: SeoGeoActionType; label: string }[] = [
  { value: "seo-page", label: "SEO — page éditée" },
  { value: "seo-backlink", label: "SEO — backlink obtenu" },
  { value: "seo-audit", label: "SEO — audit / correctif" },
  { value: "geo-citation", label: "GEO — citation IA gagnée" },
  { value: "geo-prompt", label: "GEO — prompt suivi" },
  { value: "autre", label: "Autre" },
];

function emptyPost(weekStart: string): WeekPostInput {
  return {
    publishedAt: weekStart,
    subject: "",
    content: "",
    url: "",
    impressions: null,
    reactions: null,
    comments: null,
    shares: null,
  };
}

function emptyNewsletter(weekStart: string): WeekNewsletterInput {
  return {
    publishedAt: weekStart,
    subject: "",
    content: "",
    url: "",
    emailSends: null,
    emailOpens: null,
    emailClicks: null,
  };
}

function emptyAction(): SeoGeoActionInput {
  return { type: "seo-page", description: "", result: "" };
}

function intOrNull(v: string): number | null {
  if (v.trim() === "") return null;
  const n = parseInt(v.replace(/[^\d-]/g, ""), 10);
  return isNaN(n) ? null : n;
}

function floatOrNull(v: string): number | null {
  if (v.trim() === "") return null;
  const n = parseFloat(v.replace(",", "."));
  return isNaN(n) ? null : n;
}

export function WeekForm({ weekStart, weekStartKey, initial }: Props): React.ReactElement {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveReportAction, { ok: false });

  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [linkedinFollowers, setLinkedinFollowers] = useState(initial?.linkedinFollowers?.toString() ?? "");
  const [newsletterSubscribers, setNewsletterSubscribers] = useState(initial?.newsletterSubscribers?.toString() ?? "");
  const [seoClicks, setSeoClicks] = useState(initial?.seoClicks?.toString() ?? "");
  const [seoImpressions, setSeoImpressions] = useState(initial?.seoImpressions?.toString() ?? "");
  const [geoShareOfVoice, setGeoShareOfVoice] = useState(initial?.geoShareOfVoice?.toString() ?? "");

  const [posts, setPosts] = useState<WeekPostInput[]>(
    initial?.posts.map((p) => ({ ...p })) ?? []
  );
  const [newsletter, setNewsletter] = useState<WeekNewsletterInput | null>(
    initial?.newsletter ? { ...initial.newsletter } : null
  );
  const [actions, setActions] = useState<SeoGeoActionInput[]>(
    initial?.seoGeoActions.map((a) => ({ ...a })) ?? []
  );

  function updatePost(i: number, patch: Partial<WeekPostInput>): void {
    setPosts((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function removePost(i: number): void {
    setPosts((prev) => prev.filter((_, idx) => idx !== i));
  }
  function addPost(): void {
    setPosts((prev) => [...prev, emptyPost(weekStart)]);
  }

  function updateAction(i: number, patch: Partial<SeoGeoActionInput>): void {
    setActions((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  }
  function removeAction(i: number): void {
    setActions((prev) => prev.filter((_, idx) => idx !== i));
  }
  function addAction(): void {
    setActions((prev) => [...prev, emptyAction()]);
  }

  function buildPayload(): string {
    return JSON.stringify({
      weekStart,
      notes: notes.trim() || null,
      linkedinFollowers: intOrNull(linkedinFollowers),
      newsletterSubscribers: intOrNull(newsletterSubscribers),
      seoClicks: intOrNull(seoClicks),
      seoImpressions: intOrNull(seoImpressions),
      geoShareOfVoice: floatOrNull(geoShareOfVoice),
      posts,
      newsletter,
      seoGeoActions: actions,
    });
  }

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="payload" value={buildPayload()} />

      {/* === KPIs globaux === */}
      <section className="rounded-lg border border-surface-muted bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">KPIs globaux fin de semaine</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Snapshots à reporter une fois par semaine. Vide = non saisi (pas zéro).
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="LinkedIn — followers" value={linkedinFollowers} onChange={setLinkedinFollowers} type="number" />
          <Field label="Newsletter — abonnés" value={newsletterSubscribers} onChange={setNewsletterSubscribers} type="number" />
          <Field label="SEO — clics (GSC)" value={seoClicks} onChange={setSeoClicks} type="number" />
          <Field label="SEO — impressions (GSC)" value={seoImpressions} onChange={setSeoImpressions} type="number" />
          <Field label="GEO — Share of Voice (0-1)" value={geoShareOfVoice} onChange={setGeoShareOfVoice} type="text" placeholder="0.12" />
        </div>
      </section>

      {/* === Posts LinkedIn === */}
      <section className="rounded-lg border border-surface-muted bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-ink">Posts LinkedIn ({posts.length})</h2>
          <button type="button" onClick={addPost} className="rounded bg-accent px-2.5 py-1 text-xs font-medium text-white hover:opacity-90">
            + Ajouter un post
          </button>
        </div>
        {posts.length === 0 ? (
          <p className="mt-2 text-xs text-ink-muted italic">Aucun post saisi.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {posts.map((p, i) => (
              <li key={i} className="rounded-md border border-surface-muted/50 bg-surface-muted/20 p-3">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-xs font-medium text-ink">Post #{i + 1}</h3>
                  <button type="button" onClick={() => removePost(i)} className="text-[11px] text-ink-muted hover:text-red-600">
                    Supprimer
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Field label="Date publication" value={p.publishedAt.slice(0, 10)} onChange={(v) => updatePost(i, { publishedAt: v })} type="date" />
                  <Field label="URL" value={p.url ?? ""} onChange={(v) => updatePost(i, { url: v })} type="url" placeholder="https://www.linkedin.com/posts/..." />
                </div>
                <Field label="Sujet" value={p.subject} onChange={(v) => updatePost(i, { subject: v })} placeholder="Sujet en 1 ligne" />
                <div className="mt-2">
                  <label className="text-[11px] font-medium text-ink-subtle">Contenu (markdown)</label>
                  <textarea
                    value={p.content}
                    onChange={(e) => updatePost(i, { content: e.target.value })}
                    rows={6}
                    className="mt-1 w-full rounded border border-surface-muted bg-surface px-2 py-1.5 font-mono text-xs"
                  />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Field label="Impressions" value={p.impressions?.toString() ?? ""} onChange={(v) => updatePost(i, { impressions: intOrNull(v) })} type="number" />
                  <Field label="Réactions" value={p.reactions?.toString() ?? ""} onChange={(v) => updatePost(i, { reactions: intOrNull(v) })} type="number" />
                  <Field label="Commentaires" value={p.comments?.toString() ?? ""} onChange={(v) => updatePost(i, { comments: intOrNull(v) })} type="number" />
                  <Field label="Partages" value={p.shares?.toString() ?? ""} onChange={(v) => updatePost(i, { shares: intOrNull(v) })} type="number" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* === Newsletter === */}
      <section className="rounded-lg border border-surface-muted bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-ink">Édition newsletter (1 / semaine max)</h2>
          {newsletter === null ? (
            <button type="button" onClick={() => setNewsletter(emptyNewsletter(weekStart))} className="rounded bg-accent px-2.5 py-1 text-xs font-medium text-white hover:opacity-90">
              + Ajouter
            </button>
          ) : (
            <button type="button" onClick={() => setNewsletter(null)} className="text-[11px] text-ink-muted hover:text-red-600">
              Retirer
            </button>
          )}
        </div>
        {newsletter === null ? (
          <p className="mt-2 text-xs text-ink-muted italic">Aucune édition cette semaine.</p>
        ) : (
          <div className="mt-4 space-y-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Field label="Date d'envoi" value={newsletter.publishedAt.slice(0, 10)} onChange={(v) => setNewsletter({ ...newsletter, publishedAt: v })} type="date" />
              <Field label="URL Substack" value={newsletter.url ?? ""} onChange={(v) => setNewsletter({ ...newsletter, url: v })} type="url" placeholder="https://...substack.com/p/..." />
            </div>
            <Field label="Objet email" value={newsletter.subject} onChange={(v) => setNewsletter({ ...newsletter, subject: v })} placeholder="Objet ≤ 60 caractères" />
            <div>
              <label className="text-[11px] font-medium text-ink-subtle">Contenu (markdown)</label>
              <textarea
                value={newsletter.content}
                onChange={(e) => setNewsletter({ ...newsletter, content: e.target.value })}
                rows={8}
                className="mt-1 w-full rounded border border-surface-muted bg-surface px-2 py-1.5 font-mono text-xs"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Envois" value={newsletter.emailSends?.toString() ?? ""} onChange={(v) => setNewsletter({ ...newsletter, emailSends: intOrNull(v) })} type="number" />
              <Field label="Ouvertures" value={newsletter.emailOpens?.toString() ?? ""} onChange={(v) => setNewsletter({ ...newsletter, emailOpens: intOrNull(v) })} type="number" />
              <Field label="Clics" value={newsletter.emailClicks?.toString() ?? ""} onChange={(v) => setNewsletter({ ...newsletter, emailClicks: intOrNull(v) })} type="number" />
            </div>
          </div>
        )}
      </section>

      {/* === Actions SEO/GEO === */}
      <section className="rounded-lg border border-surface-muted bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-ink">Actions SEO / GEO ({actions.length})</h2>
          <button type="button" onClick={addAction} className="rounded bg-accent px-2.5 py-1 text-xs font-medium text-white hover:opacity-90">
            + Ajouter une action
          </button>
        </div>
        {actions.length === 0 ? (
          <p className="mt-2 text-xs text-ink-muted italic">Aucune action saisie.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {actions.map((a, i) => (
              <li key={i} className="rounded-md border border-surface-muted/50 bg-surface-muted/20 p-3">
                <div className="flex items-baseline justify-between">
                  <select
                    value={a.type}
                    onChange={(e) => updateAction(i, { type: e.target.value as SeoGeoActionType })}
                    className="rounded border border-surface-muted bg-surface px-2 py-1 text-xs"
                  >
                    {ACTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => removeAction(i)} className="text-[11px] text-ink-muted hover:text-red-600">
                    Supprimer
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  <div>
                    <label className="text-[11px] font-medium text-ink-subtle">Description (ce qui a été fait)</label>
                    <textarea
                      value={a.description}
                      onChange={(e) => updateAction(i, { description: e.target.value })}
                      rows={2}
                      className="mt-1 w-full rounded border border-surface-muted bg-surface px-2 py-1.5 text-xs"
                      placeholder="Ex : refonte de la page WordPress Headless / suivi prompt 'meilleur freelance WP headless France'"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-ink-subtle">Résultat (optionnel)</label>
                    <textarea
                      value={a.result ?? ""}
                      onChange={(e) => updateAction(i, { result: e.target.value })}
                      rows={2}
                      className="mt-1 w-full rounded border border-surface-muted bg-surface px-2 py-1.5 text-xs"
                      placeholder="Ex : passé de position 14 à 8 / cité par Perplexity le 12/05"
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* === Notes synthèse === */}
      <section className="rounded-lg border border-surface-muted bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Notes / observations</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Ce qui a marché, ce qui n'a pas marché, à retenir pour la semaine prochaine…"
          className="mt-2 w-full rounded border border-surface-muted bg-surface px-2 py-1.5 text-sm"
        />
      </section>

      {/* === Footer actions === */}
      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t border-surface-muted bg-surface px-4 py-3 sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Enregistrement…" : "Enregistrer la semaine"}
          </button>
          {state.message && (
            <span className={`text-xs ${state.ok ? "text-emerald-700" : "text-red-600"}`}>
              {state.message}
            </span>
          )}
        </div>
        {initial && (
          <form
            action={async (fd) => {
              if (confirm(`Supprimer définitivement la semaine du ${weekStartKey} ?`)) {
                await deleteReportAction(fd);
                router.push("/pilotage");
              }
            }}
          >
            <input type="hidden" name="weekStart" value={weekStart} />
            <button type="submit" className="rounded-md border border-red-300 px-3 py-2 text-xs text-red-600 hover:bg-red-50">
              Supprimer
            </button>
          </form>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}): React.ReactElement {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-ink-subtle">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded border border-surface-muted bg-surface px-2 py-1.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
    </label>
  );
}
