/**
 * Synthèse mensuelle Claude basée sur les WeekReport du mois.
 * SERVER-ONLY.
 */

import "server-only";

import { prisma } from "./db";
import { callClaude, MODELS } from "./claude";
import { monthSnapshot } from "./analytics";

export interface MonthlyAnalysis {
  id: number;
  period: string;
  body: string;
  model: string;
  createdAt: string;
  updatedAt: string;
}

interface DbMonthlyAnalysis {
  id: number;
  period: string;
  body: string;
  model: string;
  createdAt: Date;
  updatedAt: Date;
}

function toAnalysis(row: DbMonthlyAnalysis): MonthlyAnalysis {
  return {
    id: row.id,
    period: row.period,
    body: row.body,
    model: row.model,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getAnalysis(period: string): Promise<MonthlyAnalysis | null> {
  const row = await prisma.monthlyAnalysis.findUnique({ where: { period } });
  return row ? toAnalysis(row) : null;
}

export async function listAnalyses(): Promise<MonthlyAnalysis[]> {
  const rows = await prisma.monthlyAnalysis.findMany({
    orderBy: { period: "desc" },
  });
  return rows.map(toAnalysis);
}

function nextPeriod(period: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (!m) return period;
  const year = parseInt(m[1] ?? "0", 10);
  const month = parseInt(m[2] ?? "0", 10);
  const next = new Date(Date.UTC(year, month, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Génère ou écrase la synthèse mensuelle pour la period donnée.
 */
export async function generateMonthlyAnalysis(period: string): Promise<MonthlyAnalysis> {
  const snap = await monthSnapshot(period);
  if (snap.reports.length === 0) {
    throw new Error(`Aucune semaine enregistrée sur ${period}.`);
  }

  const reportLines = snap.reports
    .map((r) => {
      const dateLabel = new Date(r.weekStart).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
      });
      const kpis = [
        r.linkedinFollowers !== null ? `LI ${r.linkedinFollowers} followers` : null,
        r.newsletterSubscribers !== null ? `NL ${r.newsletterSubscribers} abonnés` : null,
        r.seoClicks !== null ? `SEO ${r.seoClicks} clics` : null,
        r.geoShareOfVoice !== null ? `GEO SoV ${(r.geoShareOfVoice * 100).toFixed(1)}%` : null,
      ].filter(Boolean).join(" · ");
      const nl = r.newsletter
        ? `\n  Newsletter : « ${r.newsletter.subject} » (${r.newsletter.opens ?? "?"} ouvertures, ${r.newsletter.clicks ?? "?"} clics)`
        : "";
      const actions = r.actions.length > 0
        ? `\n  Actions SEO/GEO (${r.actions.length}) :\n${r.actions.map((a) => `    - ${a.type} : ${a.description}${a.result ? ` → ${a.result}` : ""}`).join("\n")}`
        : "";
      const notes = r.notes ? `\n  Notes : « ${r.notes} »` : "";
      return `Semaine du ${dateLabel} :
  KPIs : ${kpis || "(non saisis)"}
  Posts LinkedIn : ${r.postsCount} (engagement total ${r.postsEngagement})${nl}${actions}${notes}`;
    })
    .join("\n\n");

  const system = `Tu es analyste marketing pour Next Impact Digital. Tu produis une synthèse mensuelle FACTUELLE basée uniquement sur les chiffres et notes fournis.

Règles :
- Ne fabule pas. N'ajoute aucun chiffre que tu ne vois pas dans le dataset.
- Cite des semaines précises et des chiffres précis.
- Voix institutionnelle (pas de "je"), didactique, sérieuse, sans jargon marketing creux.
- Si une donnée manque, dis-le ("KPIs non saisis sur 2 semaines, à compléter pour analyse plus précise").
- 3 recommandations max pour le mois suivant, chacune actionnable et chiffrée.

Format :
# Synthèse ${period}

## Volumes du mois
[chiffres consolidés]

## Ce qui a marché
[1-3 paragraphes courts, semaines/posts cités]

## Ce qui n'a pas marché
[1-2 paragraphes courts]

## 3 recommandations pour ${nextPeriod(period)}
1. [reco actionnable + chiffre/référence]
2. ...
3. ...`;

  const user = `# Période : ${period}

## Totaux du mois
- Posts LinkedIn : ${snap.totals.posts}
- Newsletters : ${snap.totals.newsletters}
- Actions SEO/GEO : ${snap.totals.actions}
- Engagement LinkedIn cumulé : ${snap.totals.engagement}

## Détail semaine par semaine
${reportLines}

Produis la synthèse markdown.`;

  const result = await callClaude({
    model: MODELS.sonnet,
    system,
    user,
    maxTokens: 2_500,
    temperature: 0.3,
  });

  if (!result.text || result.text.length < 50) {
    throw new Error(`Réponse Claude trop courte / vide. Texte brut : ${result.text.slice(0, 200)}`);
  }

  // Upsert
  const existing = await prisma.monthlyAnalysis.findUnique({ where: { period } });
  const data = { period, body: result.text, model: result.model };
  const row = existing
    ? await prisma.monthlyAnalysis.update({ where: { period }, data })
    : await prisma.monthlyAnalysis.create({ data });

  return toAnalysis(row);
}
