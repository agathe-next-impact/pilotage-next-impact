import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

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
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/pilotage" className="text-sm font-medium text-ink">
            <span className="inline-block h-2 w-2 rounded-full bg-accent align-middle" aria-hidden /> Pilotage <span className="font-normal text-ink-muted">— Next Impact Digital</span>
          </Link>
          <Link href="/pilotage/analyses" className="text-xs text-ink-muted hover:text-ink">
            Analyses
          </Link>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="text-xs text-ink-muted hover:text-ink">
              Se déconnecter
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">{children}</main>

      <footer className="mx-auto max-w-5xl px-4 py-8 text-xs text-ink-subtle sm:px-6">
        Suivi de performances marketing · saisie hebdomadaire
      </footer>
    </div>
  );
}
