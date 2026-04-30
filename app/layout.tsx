import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pilotage — Next Impact Digital",
  description: "Tableau de bord de la communication digitale Next Impact (LinkedIn, Newsletter, SEO, GEO).",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="fr">
      <body className="bg-surface-subtle font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
