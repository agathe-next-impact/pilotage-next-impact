/**
 * Import des exports LinkedIn (Get a copy of your data) :
 *  - Shares.csv  → posts standards
 *  - Articles.csv → articles long format
 *
 * Et import optionnel d'un CSV de métriques (saisi manuellement par l'utilisatrice).
 *
 * Strategy de matching : URL exacte d'abord, sinon ligne marquée 'no_match'
 * pour validation humaine côté UI.
 *
 * SERVER-ONLY.
 */

import "server-only";

import { prisma } from "@/lib/kpi/store";

// =============================================================================
// Types
// =============================================================================

export type ImportKind = "shares" | "articles" | "metrics";

export interface ParsedShare {
  date: Date;
  url: string;
  content: string;
  mediaType?: string | null;
  visibility?: string | null;
}

export interface ParsedArticle {
  date: Date;
  url: string;
  title: string;
  description?: string | null;
}

export interface ParsedMetric {
  url: string;
  impressions?: number;
  reactions?: number;
  comments?: number;
  shares?: number;
  conversions?: number;
}

export interface PreviewRow {
  /** Index original dans le CSV (1-based, sans header) */
  index: number;
  kind: "share" | "article" | "metric";
  date?: string;          // ISO ou ""
  url: string;
  title?: string;         // pour partage : extrait du content (60 chars)
  contentPreview?: string;
  /** ID du ContentItem matché par URL, ou null */
  matchedItemId: number | null;
  matchedItemSubject?: string | null;
  /** Métriques saisies (uniquement pour kind=metric) */
  metric?: ParsedMetric;
}

// =============================================================================
// Parser CSV minimal (RFC 4180)
// =============================================================================

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        cur.push(cell);
        cell = "";
      } else if (c === "\n") {
        cur.push(cell);
        rows.push(cur);
        cur = [];
        cell = "";
      } else if (c === "\r") {
        // skip CR (handled by LF)
      } else {
        cell += c;
      }
    }
  }
  // Dernière cellule / ligne
  if (cell.length > 0 || cur.length > 0) {
    cur.push(cell);
    rows.push(cur);
  }
  // Filtre les lignes 100% vides
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

function indexHeaders(headers: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (typeof h === "string") m.set(h.trim().toLowerCase(), i);
  }
  return m;
}

function safeDate(s: string | undefined): Date {
  if (!s) return new Date();
  // Format LinkedIn : "2024-10-01 14:32:11" ou ISO
  const cleaned = s.replace(" ", "T") + (s.includes(":") ? "" : "T00:00:00");
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? new Date() : d;
}

function safeInt(s: string | undefined): number | undefined {
  if (s === undefined || s === null || s === "") return undefined;
  const cleaned = s.replace(/[^\d-]/g, "");
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? undefined : n;
}

// =============================================================================
// Parsers spécifiques
// =============================================================================

/**
 * Parse Shares.csv (export LinkedIn perso).
 * Colonnes attendues : Date, ShareLink, ShareCommentary, SharedUrl, MediaUrl, MediaType, Visibility
 */
export function parseSharesCsv(text: string): ParsedShare[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = indexHeaders(rows[0] ?? []);
  const iDate = headers.get("date");
  const iLink = headers.get("sharelink");
  const iText = headers.get("sharecommentary");
  const iMedia = headers.get("mediatype");
  const iVis = headers.get("visibility");
  if (iDate === undefined || iLink === undefined) return [];

  const out: ParsedShare[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const url = (row[iLink] ?? "").trim();
    if (!url) continue;
    out.push({
      date: safeDate(row[iDate]),
      url,
      content: ((iText !== undefined ? row[iText] : "") ?? "").trim(),
      mediaType: iMedia !== undefined ? (row[iMedia] ?? null) : null,
      visibility: iVis !== undefined ? (row[iVis] ?? null) : null,
    });
  }
  return out;
}

/**
 * Parse Articles.csv (export LinkedIn perso).
 * Colonnes attendues : Date, ArticleLink, ArticleTitle, Topic, Description, ...
 */
export function parseArticlesCsv(text: string): ParsedArticle[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = indexHeaders(rows[0] ?? []);
  const iDate = headers.get("date") ?? headers.get("publisheddate");
  const iLink = headers.get("articlelink") ?? headers.get("articleurl") ?? headers.get("url");
  const iTitle = headers.get("articletitle") ?? headers.get("title");
  const iDesc = headers.get("description");
  if (iDate === undefined || iLink === undefined || iTitle === undefined) return [];

  const out: ParsedArticle[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const url = (row[iLink] ?? "").trim();
    if (!url) continue;
    out.push({
      date: safeDate(row[iDate]),
      url,
      title: ((row[iTitle] ?? "")).trim(),
      description: iDesc !== undefined ? (row[iDesc] ?? null) : null,
    });
  }
  return out;
}

/**
 * Parse un CSV de métriques utilisateur.
 * Format flexible : url, impressions, reactions, comments, shares, conversions.
 * Séparateur : virgule ou point-virgule.
 */
export function parseMetricsCsv(text: string): ParsedMetric[] {
  // Détection auto séparateur : si la 1ère ligne a plus de ; que de , on switch
  const firstLine = text.split("\n")[0] ?? "";
  const useSemi = (firstLine.split(";").length - 1) > (firstLine.split(",").length - 1);
  const normalized = useSemi ? text.replace(/;/g, ",") : text;

  const rows = parseCsv(normalized);
  if (rows.length < 2) return [];
  const headers = indexHeaders(rows[0] ?? []);
  const iUrl = headers.get("url") ?? headers.get("sharelink") ?? headers.get("articlelink");
  const iImp = headers.get("impressions") ?? headers.get("vues") ?? headers.get("views");
  const iReact = headers.get("reactions") ?? headers.get("likes") ?? headers.get("réactions");
  const iComm = headers.get("comments") ?? headers.get("commentaires");
  const iShare = headers.get("shares") ?? headers.get("partages") ?? headers.get("reposts");
  const iConv = headers.get("conversions") ?? headers.get("clicks") ?? headers.get("clics");
  if (iUrl === undefined) return [];

  const out: ParsedMetric[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const url = (row[iUrl] ?? "").trim();
    if (!url) continue;
    const reactions = iReact !== undefined ? (safeInt(row[iReact]) ?? 0) : 0;
    const comments = iComm !== undefined ? (safeInt(row[iComm]) ?? 0) : 0;
    const shares = iShare !== undefined ? (safeInt(row[iShare]) ?? 0) : 0;
    out.push({
      url,
      impressions: iImp !== undefined ? safeInt(row[iImp]) : undefined,
      reactions,
      comments,
      shares,
      conversions: iConv !== undefined ? safeInt(row[iConv]) : undefined,
    });
  }
  return out;
}

// =============================================================================
// Matching avec ContentItem existants (par URL exacte)
// =============================================================================

export async function findItemByUrl(url: string): Promise<{ id: number; subject: string } | null> {
  const row = await prisma.contentItem.findFirst({
    where: { publishedUrl: url },
    select: { id: true, subject: true, finalSubject: true },
  });
  if (!row) return null;
  return { id: row.id, subject: row.finalSubject ?? row.subject };
}

// =============================================================================
// Préparation des PreviewRow (pour la page /import)
// =============================================================================

export async function buildSharesPreview(parsed: ParsedShare[]): Promise<PreviewRow[]> {
  const rows: PreviewRow[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const p = parsed[i];
    if (!p) continue;
    const match = await findItemByUrl(p.url);
    rows.push({
      index: i + 1,
      kind: "share",
      date: p.date.toISOString(),
      url: p.url,
      title: p.content.slice(0, 80),
      contentPreview: p.content.slice(0, 200),
      matchedItemId: match?.id ?? null,
      matchedItemSubject: match?.subject ?? null,
    });
  }
  return rows;
}

export async function buildArticlesPreview(parsed: ParsedArticle[]): Promise<PreviewRow[]> {
  const rows: PreviewRow[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const p = parsed[i];
    if (!p) continue;
    const match = await findItemByUrl(p.url);
    rows.push({
      index: i + 1,
      kind: "article",
      date: p.date.toISOString(),
      url: p.url,
      title: p.title,
      contentPreview: p.description ?? "",
      matchedItemId: match?.id ?? null,
      matchedItemSubject: match?.subject ?? null,
    });
  }
  return rows;
}

export async function buildMetricsPreview(parsed: ParsedMetric[]): Promise<PreviewRow[]> {
  const rows: PreviewRow[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const p = parsed[i];
    if (!p) continue;
    const match = await findItemByUrl(p.url);
    rows.push({
      index: i + 1,
      kind: "metric",
      url: p.url,
      title: `${p.reactions ?? 0} réactions · ${p.comments ?? 0} commentaires · ${p.shares ?? 0} partages`,
      matchedItemId: match?.id ?? null,
      matchedItemSubject: match?.subject ?? null,
      metric: p,
    });
  }
  return rows;
}

// =============================================================================
// Exécution de l'import
// =============================================================================

interface ExecuteParams {
  rows: PreviewRow[];
  /** Clé : index de la ligne. Valeur : "create" | "update:<itemId>" | "skip" */
  decisions: Record<number, string>;
}

export interface ExecuteResult {
  itemsCreated: number;
  itemsUpdated: number;
  metricsAdded: number;
  skipped: number;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function executeImport(params: ExecuteParams): Promise<ExecuteResult> {
  const result: ExecuteResult = { itemsCreated: 0, itemsUpdated: 0, metricsAdded: 0, skipped: 0 };

  for (const row of params.rows) {
    const decision = params.decisions[row.index] ?? (row.matchedItemId ? `update:${row.matchedItemId}` : "skip");

    if (decision === "skip") {
      result.skipped++;
      continue;
    }

    let targetItemId: number;

    if (decision === "create") {
      // Création d'un ContentItem externe
      const type = row.kind === "article" ? "seo_article" : "linkedin_post";
      const subject = (row.title ?? "(post LinkedIn importé)").slice(0, 280) || "(post LinkedIn importé)";
      const date = row.date ? new Date(row.date) : new Date();
      const slug = `ext-${date.toISOString().slice(0, 10)}-${slugify(subject)}`.slice(0, 80);
      const created = await prisma.contentItem.create({
        data: {
          slug: `${slug}-${Date.now().toString(36).slice(-4)}`,
          type,
          trackKey: "external",
          plannedFor: date,
          publishedAt: date,
          status: "published",
          subject,
          finalSubject: subject,
          brief: "(importé depuis l'export LinkedIn)",
          finalBody: row.contentPreview ?? null,
          publishedUrl: row.url,
          source: "external",
          archivedAt: new Date(),
        },
      });
      targetItemId = created.id;
      result.itemsCreated++;
    } else if (decision.startsWith("update:")) {
      const idStr = decision.slice("update:".length);
      const id = parseInt(idStr, 10);
      if (isNaN(id)) {
        result.skipped++;
        continue;
      }
      // S'assurer que publishedUrl est rempli si pas déjà
      await prisma.contentItem.update({
        where: { id },
        data: { publishedUrl: row.url },
      });
      targetItemId = id;
      result.itemsUpdated++;
    } else {
      result.skipped++;
      continue;
    }

    // Si la ligne a des métriques, on les enregistre
    if (row.metric) {
      const m = row.metric;
      const engagement = (m.reactions ?? 0) + (m.comments ?? 0) + (m.shares ?? 0);
      const rate =
        m.impressions && m.impressions > 0
          ? (engagement / m.impressions) * 100
          : null;
      await prisma.contentMetric.create({
        data: {
          contentId: targetItemId,
          impressions: m.impressions ?? null,
          engagementCount: engagement || null,
          conversions: m.conversions ?? null,
          engagementRate: rate,
          notes: `Import LinkedIn — ${m.reactions ?? 0} réactions / ${m.comments ?? 0} commentaires / ${m.shares ?? 0} partages`,
          source: "linkedin_export",
        },
      });
      result.metricsAdded++;
    }
  }

  return result;
}
