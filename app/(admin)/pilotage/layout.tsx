import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

const tabs = [
  { href: "/pilotage", label: "Vue d'ensemble" },
  { href: "/pilotage/contenus", label: "Contenus" },
  { href: "/pilotage/contenus/planning", label: "Planning" },
  { href: "/pilotage/contenus/archive", label: "Archive" },
  { href: "/pilotage/contenus/voice", label: "Voix" },
  { href: "/pilotage/contenus/prompts", label: "Prompts" },
  { href: "/pilotage/linkedin", label: "LinkedIn" },
  { href: "/pilotage/newsletter", label: "Newsletter" },
  { href: "/pilotage/seo-geo", label: "SEO + GEO" },
  { href: "/pilotage/snapshot/2026-04", label: "Saisir un mois" },
] as const;

export default async function PilotageLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const session = await getSession();
  if (!session.isLoggedIn) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-surface-muted bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="inline-block h-2 w-2 rounded-full bg-accent" aria-hidden />
            <Link href="/pilotage" className="text-sm font-medium text-ink">
              Pilotage <span className="font-normal text-ink-muted">— Next Impact Digital</span>
            </Link>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="text-xs text-ink-muted hover:text-ink"
              formAction="/api/auth/logout"
            >
              Se déconnecter
            </button>
          </form>
        </div>
        <nav className="mx-auto max-w-7xl overflow-x-auto px-4 sm:px-6">
          <ul className="flex gap-1">
            {tabs.map((t) => (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className="block whitespace-nowrap rounded-t-md px-3 py-2 text-xs font-medium text-ink-muted hover:bg-surface-muted hover:text-ink"
                >
                  {t.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>

      <footer className="mx-auto max-w-7xl px-4 py-8 text-xs text-ink-subtle sm:px-6">
        Données collectées : LinkedIn (manuel) · Substack (manuel) · Search Console (cron 06:00) · GA4 (cron 06:15) · Audit GEO (cron lundi 08:00) · Plan adjuster (cron 1er du mois 09:00)
      </footer>
    </div>
  );
}
