import type { TopPost } from "@/lib/analytics";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" });
}

export function TopPosts({ posts }: { posts: TopPost[] }): React.ReactElement {
  if (posts.length === 0) {
    return (
      <div className="rounded-md border border-surface-muted bg-surface px-3 py-3 text-xs text-ink-muted italic">
        Aucun post saisi pour l'instant.
      </div>
    );
  }
  return (
    <ol className="space-y-2">
      {posts.map((p, i) => (
        <li key={p.id} className="flex items-start gap-3 rounded-md border border-surface-muted bg-surface px-3 py-2">
          <span className="text-xs font-bold text-accent">#{i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium text-ink">
              {p.url ? (
                <a href={p.url} target="_blank" rel="noreferrer" className="hover:underline">{p.subject}</a>
              ) : (
                p.subject
              )}
            </div>
            <div className="mt-0.5 text-[10px] text-ink-subtle">
              {fmtDate(p.publishedAt)} · {p.reactions} réactions · {p.comments} comm. · {p.shares} partages
            </div>
          </div>
          <span className="rounded bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
            {p.engagement}
          </span>
        </li>
      ))}
    </ol>
  );
}
