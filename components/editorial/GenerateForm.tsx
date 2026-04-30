"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { generateContentAction } from "@/app/(admin)/pilotage/contenus/actions";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { ContentItem } from "@/lib/editorial/types";

interface Props {
  item: ContentItem;
}

const STREAM_TYPES: ContentItem["type"][] = ["newsletter_edition", "seo_article"];

export function GenerateForm({ item }: Props): React.ReactElement {
  const router = useRouter();
  const [feedback, setFeedback] = useState("");
  const [isGenerating, setGenerating] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<{
    tokensIn: number;
    tokensOut: number;
    cacheRead: number;
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isFirstGen = !item.draft;
  const useStreaming = STREAM_TYPES.includes(item.type);

  // Mode classique : Server Action (LinkedIn — rapide)
  async function generateClassic(formData: FormData): Promise<void> {
    setGenerating(true);
    setError(null);
    try {
      await generateContentAction(formData);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  // Mode streaming : SSE pour newsletter / article SEO
  async function generateStreaming(): Promise<void> {
    setGenerating(true);
    setError(null);
    setStreamedText("");
    setUsage(null);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch(`/api/editorial/generate-stream/${item.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedback.trim() || undefined }),
        signal: abort.signal,
      });
      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const block of events) {
          const eventLine = block.split("\n").find((l) => l.startsWith("event: "));
          const dataLine = block.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          const data = JSON.parse(dataLine.slice("data: ".length));
          const event = eventLine?.slice("event: ".length) ?? "message";
          if (event === "delta" && typeof data.text === "string") {
            accumulated += data.text;
            setStreamedText(accumulated);
          } else if (event === "done") {
            setUsage({
              tokensIn: data.tokensIn ?? 0,
              tokensOut: data.tokensOut ?? 0,
              cacheRead: data.cacheRead ?? 0,
            });
            // Refresh pour afficher le draft sauvegardé
            router.refresh();
          } else if (event === "error") {
            throw new Error(data.error ?? "Erreur de génération");
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message);
      }
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
  }

  function handleAbort(): void {
    abortRef.current?.abort();
  }

  return (
    <div className="space-y-3">
      {!isFirstGen ? (
        <Card>
          <CardBody>
            <label className="block text-xs text-ink-muted">
              Retour à intégrer dans la régénération (ce qui ne va pas, ce qu'il faut accentuer)
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-surface-muted bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Ex : trop technique au milieu, accentue l'argument fiscal au début, raccourcis le 3e paragraphe…"
                disabled={isGenerating}
              />
            </label>
          </CardBody>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {useStreaming ? (
          <>
            <Button
              type="button"
              variant="primary"
              onClick={generateStreaming}
              disabled={isGenerating}
            >
              {isGenerating
                ? "Génération en cours…"
                : isFirstGen
                  ? "Générer (streaming)"
                  : "Régénérer (streaming)"}
            </Button>
            {isGenerating ? (
              <Button type="button" variant="ghost" onClick={handleAbort}>
                Interrompre
              </Button>
            ) : null}
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData();
              fd.append("id", String(item.id));
              if (feedback.trim()) fd.append("feedback", feedback.trim());
              generateClassic(fd);
            }}
          >
            <Button type="submit" variant="primary" disabled={isGenerating}>
              {isGenerating
                ? "Génération…"
                : isFirstGen
                  ? "Générer le 1er draft avec Claude"
                  : "Régénérer avec Claude"}
            </Button>
          </form>
        )}
        {item.type === "seo_article" ? (
          <span className="text-[11px] text-ink-subtle">
            ⚙️ Auto-critique 2 passes activée (qualité ↑)
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-md bg-danger-light px-3 py-2 text-sm text-danger">{error}</p>
      ) : null}

      {streamedText ? (
        <Card>
          <CardBody>
            <p className="text-[10px] uppercase tracking-wider text-ink-subtle">
              Génération en direct
            </p>
            <pre className="mt-2 max-h-96 overflow-y-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-ink">
              {streamedText}
            </pre>
            {usage ? (
              <p className="mt-2 text-[11px] text-ink-subtle">
                ✓ Terminé · {usage.tokensIn} tokens in · {usage.tokensOut} out · {usage.cacheRead} lus depuis cache
              </p>
            ) : null}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
