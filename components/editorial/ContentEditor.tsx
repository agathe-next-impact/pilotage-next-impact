"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ContentItem, MediaAsset } from "@/lib/editorial/types";
import {
  saveFinalAction,
  setPublishedUrlAction,
  deleteMediaAction,
} from "@/app/(admin)/pilotage/contenus/actions";

interface Props {
  item: ContentItem;
}

export function ContentEditor({ item }: Props): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [subject, setSubject] = useState<string>(
    item.finalSubject ?? item.subject ?? ""
  );
  const [body, setBody] = useState<string>(
    item.finalBody ?? item.draft ?? ""
  );
  const [media, setMedia] = useState<MediaAsset[]>(item.media ?? []);
  const [publishedUrl, setPublishedUrl] = useState<string>(
    item.publishedUrl ?? ""
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const isLinkedIn = item.type === "linkedin_post";
  const isNewsletter = item.type === "newsletter_edition";

  const charCount = body.length;
  const linkedinTooLong = isLinkedIn && charCount > 1500;
  const linkedinTooShort = isLinkedIn && charCount > 0 && charCount < 1100;

  // Upload --------------------------------------------------------------------
  async function handleUpload(files: FileList | null): Promise<void> {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("contentId", String(item.id));
        const res = await fetch("/api/editorial/upload", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erreur d'upload");
        setMedia((prev) => [...prev, data.media as MediaAsset]);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    handleUpload(e.dataTransfer.files);
  }

  function insertMediaInBody(asset: MediaAsset): void {
    const snippet =
      asset.kind === "image"
        ? `\n\n![${asset.alt ?? asset.filename}](${asset.url})\n\n`
        : `\n\n[${asset.filename}](${asset.url})\n\n`;
    setBody((prev) => prev + snippet);
  }

  // Save ---------------------------------------------------------------------
  function handleSaveDraft(): void {
    const fd = new FormData();
    fd.append("id", String(item.id));
    fd.append("finalSubject", subject);
    fd.append("finalBody", body);
    startTransition(async () => {
      try {
        await saveFinalAction(fd);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  function handleValidate(): void {
    const fd = new FormData();
    fd.append("id", String(item.id));
    fd.append("finalSubject", subject);
    fd.append("finalBody", body);
    fd.append("validate", "1");
    startTransition(async () => {
      try {
        await saveFinalAction(fd);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  function handleSetPublishedUrl(): void {
    const fd = new FormData();
    fd.append("id", String(item.id));
    fd.append("publishedUrl", publishedUrl);
    startTransition(async () => {
      try {
        await setPublishedUrlAction(fd);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  function handleDeleteMedia(mediaId: number): void {
    if (!confirm("Supprimer ce média ?")) return;
    const fd = new FormData();
    fd.append("mediaId", String(mediaId));
    startTransition(async () => {
      try {
        await deleteMediaAction(fd);
        setMedia((prev) => prev.filter((m) => m.id !== mediaId));
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-md bg-danger-light px-3 py-2 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {/* Sujet ------------------------------------------------------ */}
      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-ink-subtle">
          {isLinkedIn ? "Première ligne (hook)" : isNewsletter ? "Objet email" : "Titre H1"}
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="mt-1 w-full rounded-md border border-surface-muted bg-surface px-3 py-2 text-base font-medium text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder={item.subject}
        />
        {isNewsletter ? (
          <p className="mt-1 text-xs text-ink-subtle">
            {subject.length}/60 caractères
            {subject.length > 60 ? " — trop long" : ""}
          </p>
        ) : null}
      </div>

      {/* Body : split view ----------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-ink-subtle">
            Édition (Markdown)
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={24}
            className="mt-1 w-full rounded-md border border-surface-muted bg-surface px-3 py-2 font-mono text-xs leading-relaxed text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <div className="mt-1 flex items-center justify-between text-xs text-ink-subtle">
            <span>{charCount.toLocaleString("fr-FR")} caractères</span>
            {isLinkedIn ? (
              <span
                className={
                  linkedinTooLong
                    ? "text-danger"
                    : linkedinTooShort
                      ? "text-warning"
                      : "text-success"
                }
              >
                Cible LinkedIn : 1100–1500 car.
              </span>
            ) : null}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-ink-subtle">
            Aperçu
          </label>
          <div className="mt-1 max-h-[600px] overflow-y-auto rounded-md border border-surface-muted bg-surface px-4 py-3 prose prose-sm max-w-none text-ink">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {body || "_Le rendu apparaîtra ici_"}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Boutons d'action ------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-2 border-t border-surface-muted pt-4">
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={isPending}
          className="rounded-md bg-surface-muted px-3.5 py-2 text-sm font-medium text-ink hover:bg-surface-subtle disabled:opacity-50"
        >
          Enregistrer
        </button>
        <button
          type="button"
          onClick={handleValidate}
          disabled={isPending}
          className="rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-50"
        >
          Valider cette version
        </button>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(body)}
          className="rounded-md bg-transparent px-3.5 py-2 text-sm font-medium text-ink hover:bg-surface-muted"
        >
          Copier le corps
        </button>
        <span className="ml-auto text-xs text-ink-subtle">
          {item.generatedModel ? `Dernière génération : ${item.generatedModel}` : ""}
        </span>
      </div>

      {/* Médias ----------------------------------------------------- */}
      <section className="rounded-md border border-surface-muted bg-surface px-4 py-4">
        <h3 className="text-sm font-medium text-ink">Médias attachés</h3>
        <p className="mt-1 text-xs text-ink-muted">
          {isLinkedIn
            ? "Images / vidéos à uploader directement sur LinkedIn lors de la publication."
            : isNewsletter
              ? "Médias pour Substack — à insérer dans l'éditeur Substack au moment de l'envoi."
              : "Images de l'article — peuvent être insérées directement dans le markdown via le bouton « Insérer »."}
        </p>

        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="mt-3 flex cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-surface-muted px-4 py-6 text-sm text-ink-muted hover:border-accent hover:bg-accent-light"
        >
          {uploading
            ? "Upload en cours…"
            : "Glisse un fichier ici ou clique pour parcourir (image / vidéo / PDF, max 25 MB)"}
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            accept="image/*,video/*,.pdf"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>

        {media.length > 0 ? (
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {media.map((m) => (
              <li
                key={m.id}
                className="flex flex-col gap-2 rounded-md border border-surface-muted bg-surface-subtle p-2"
              >
                {m.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.url}
                    alt={m.alt ?? m.filename}
                    className="h-32 w-full rounded object-cover"
                  />
                ) : m.kind === "video" ? (
                  <video
                    src={m.url}
                    controls
                    className="h-32 w-full rounded object-cover"
                  />
                ) : (
                  <div className="flex h-32 w-full items-center justify-center rounded bg-surface-muted text-xs text-ink-muted">
                    📄 {m.mimeType}
                  </div>
                )}
                <p className="truncate text-xs text-ink" title={m.filename}>
                  {m.filename}
                </p>
                <p className="text-[10px] text-ink-subtle">
                  {(m.size / 1024).toFixed(0)} kB
                </p>
                <div className="flex flex-wrap gap-1">
                  {item.type === "seo_article" ? (
                    <button
                      type="button"
                      onClick={() => insertMediaInBody(m)}
                      className="rounded bg-accent-light px-2 py-1 text-[10px] font-medium text-accent-dark hover:bg-accent hover:text-white"
                    >
                      Insérer
                    </button>
                  ) : null}
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded bg-surface-muted px-2 py-1 text-[10px] font-medium text-ink-muted hover:bg-surface"
                  >
                    Ouvrir
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDeleteMedia(m.id)}
                    className="rounded bg-danger-light px-2 py-1 text-[10px] font-medium text-danger hover:bg-danger hover:text-white"
                  >
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {/* Lien de publication --------------------------------------- */}
      <section className="rounded-md border border-surface-muted bg-surface px-4 py-4">
        <h3 className="text-sm font-medium text-ink">Lien du post publié</h3>
        <p className="mt-1 text-xs text-ink-muted">
          Une fois le contenu publié sur {isLinkedIn ? "LinkedIn" : isNewsletter ? "Substack" : "next-impact.digital"},
          colle l'URL ici pour archiver. Marque automatiquement comme publié.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="url"
            value={publishedUrl}
            onChange={(e) => setPublishedUrl(e.target.value)}
            placeholder={
              isLinkedIn
                ? "https://www.linkedin.com/posts/..."
                : isNewsletter
                  ? "https://nextimpactdigital.substack.com/p/..."
                  : "https://next-impact.digital/articles/..."
            }
            className="flex-1 rounded-md border border-surface-muted bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            type="button"
            onClick={handleSetPublishedUrl}
            disabled={isPending}
            className="rounded-md bg-success px-3.5 py-2 text-sm font-medium text-white hover:bg-success/80 disabled:opacity-50"
          >
            Enregistrer & publier
          </button>
        </div>
        {item.publishedAt ? (
          <p className="mt-2 text-xs text-success">
            ✓ Publié le {new Date(item.publishedAt).toLocaleString("fr-FR")}
          </p>
        ) : null}
      </section>
    </div>
  );
}
