/**
 * Import des exports LinkedIn et Substack (CSV/XLSX) :
 *  - LinkedIn Shares.csv (export "Get a copy of your data" : posts perso, sans métriques)
 *  - LinkedIn Articles.csv (idem : articles long format, sans métriques)
 *  - LinkedIn Page Analytics export (xlsx page company : URL + métriques)
 *  - Substack Posts CSV (Stats > Posts > Export : web_url, post_date, email_sends, email_opens, email_clicks, etc.)
 *  - CSV/XLSX custom utilisateur (recommandé pour le profil perso) :
 *    colonnes flexibles : url, date, impressions, reactions, comments, shares, conversions
 *
 * Détection automatique des colonnes par alias multiples (FR/EN, LinkedIn/Substack).
 * Strategy de matching : URL exacte sur publishedUrl, sinon ligne en validation manuelle.
 *
 * SERVER-ONLY.
 */

import "server-only";

import { prisma } from "@/lib/kpi/store";
import * as XLSX from "xlsx";

// =============================================================================
// Types
// =============================================================================

export type ImportKind = "shares" | "articles" | "metrics" | "substack";

/**
 * Représentation unifiée d'une ligne parsée, qu'elle vienne d'un Shares.csv,
 * d'un Articles.csv ou d'un export de métriques. Tous les champs métriques
 * sont optionnels — seuls url et date sont systématiquement présents.
 */
export interface ParsedRow {
  /** URL du post (publishedUrl). */
  url: string;
  /** Date de publication (ISO). Sert aussi de recordedAt pour les métriques. */
  date: Date;
  /** Pour les posts : contenu / extrait. Pour les articles : titre. */
  title: string;
  contentPreview?: string;
  /** Métriques optionnelles. */
  impressions?: number;
  reactions?: number;
  comments?: number;
  shares?: number;
  conversions?: number;
}

export interface PreviewRow extends ParsedRow {
  /** Index original (1-based) pour le mapping decisions. */
  index: number;
  kind: ImportKind;
  /** ID du ContentItem matché par URL exacte, ou null. */
  matchedItemId: number | null;
  matchedItemSubject?: string | null;
  /** Date au format ISO string (sérialisable pour le client). */
  dateIso: string;
  /** True si la ligne contient au moins une métrique numérique. */
  hasMetrics: boolean;
}

// =============================================================================
// Parser CSV minimal (RFC 4180)
// =============================================================================

function parseCsvText(text: string): string[][] {
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
      if (c === '"') inQuotes = true;
      else if (c === ",") { cur.push(cell); cell = ""; }
      else if (c === "\n") { cur.push(cell); rows.push(cur); cur = []; cell = ""; }
      else if (c === "\r") { /* skip */ }
      else { cell += c; }
    }
  }
  if (cell.length > 0 || cur.length > 0) {
    cur.push(cell);
    rows.push(cur);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

function indexHeaders(headers: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (typeof h === "string") {
      const norm = h.trim().toLowerCase().replace(/\s+/g, "");
      m.set(norm, i);
    }
  }
  return m;
}

function safeDate(s: unknown): Date {
  if (s instanceof Date) return s;
  if (typeof s === "number") {
    // Sérial Excel : nb de jours depuis 1900-01-00
    const d = new Date((s - 25569) * 86400 * 1000);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  if (typeof s === "string" && s.length > 0) {
    // Format "YYYY-MM-DD HH:MM:SS" ou ISO
    const cleaned = s.includes("T") ? s : s.replace(" ", "T") + (s.includes(":") ? "" : "T00:00:00");
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) return d;
    // Format "DD/MM/YYYY" français
    const fr = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
    if (fr) {
      const day = parseInt(fr[1] ?? "1", 10);
      const month = parseInt(fr[2] ?? "1", 10);
      const year = parseInt(fr[3] ?? "1970", 10);
      return new Date(Date.UTC(year, month - 1, day));
    }
  }
  return new Date();
}

function safeInt(s: unknown): number | undefined {
  if (s === undefined || s === null || s === "") return undefined;
  if (typeof s === "number") return Math.round(s);
  const cleaned = String(s).replace(/[^\d-]/g, "");
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? undefined : n;
}

// =============================================================================
// Lecture du fichier (CSV ou XLSX) → matrice générique
// =============================================================================

export async function readSheet(file: File): Promise<string[][]> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const firstName = wb.SheetNames[0];
    if (!firstName) return [];
    const sheet = wb.Sheets[firstName];
    if (!sheet) return [];
    // header: 1 → renvoie un tableau de tableaux
    const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      raw: false,
      dateNF: "yyyy-mm-dd",
    });
    return data.map((row) => row.map((c) => (c === null || c === undefined ? "" : String(c))));
  }
  // CSV / TXT : détection séparateur (, ou ;)
  const text = await file.text();
  const firstLine = text.split("\n")[0] ?? "";
  const useSemi = (firstLine.split(";").length - 1) > (firstLine.split(",").length - 1);
  const normalized = useSemi ? text.replace(/;/g, ",") : text;
  return parseCsvText(normalized);
}

// =============================================================================
// Extraction unifiée selon les colonnes détectées
// =============================================================================

const URL_KEYS = [
  "url", "sharelink", "articlelink", "posturl", "articleurl", "permalink", "lien",
  // Substack
  "web_url", "weburl", "post_url",
];
const DATE_KEYS = [
  "date", "publisheddate", "createddate", "createdat", "datepublished", "posteddate",
  // Substack
  "post_date", "postdate", "send_date", "publishdate",
];
const TITLE_KEYS = [
  "title", "articletitle", "posttitle", "subject", "sujet", "titre",
  // Substack : title = sujet de la newsletter
  "post_title",
];
const CONTENT_KEYS = [
  "sharecommentary", "content", "body", "description", "contenu", "texte",
  // Substack
  "subtitle", "post_subtitle", "excerpt",
];
const IMPRESSIONS_KEYS = [
  "impressions", "vues", "views", "vue", "viewcount",
  // Substack : sends = nb de mails delivres = audience touchee
  "email_sends", "emailsends", "sends", "delivered", "total_visitors", "totalvisitors",
];
const REACTIONS_KEYS = [
  "reactions", "likes", "réactions", "reactionscount", "likecount",
  // Substack : opens = engagement principal sur le canal email
  "email_opens", "emailopens", "opens", "unique_opens",
];
const COMMENTS_KEYS = [
  "comments", "commentaires", "commentcount",
  // Substack
  "comment_count",
];
const SHARES_KEYS = [
  "shares", "partages", "reposts", "sharescount", "repostcount",
  // Substack
  "restacks", "restack_count",
];
const CONVERSIONS_KEYS = [
  "conversions", "clicks", "clics", "ctaclicks", "linkclicks",
  // Substack : clicks email = conversion vers le contenu
  "email_clicks", "emailclicks", "unique_clicks",
];

function findCol(headers: Map<string, number>, candidates: string[]): number | undefined {
  for (const k of candidates) {
    const i = headers.get(k);
    if (i !== undefined) return i;
  }
  return undefined;
}

function extractRows(matrix: string[][]): ParsedRow[] {
  if (matrix.length < 2) return [];
  const headerRow = matrix[0] ?? [];
  const headers = indexHeaders(headerRow);

  const iUrl = findCol(headers, URL_KEYS);
  if (iUrl === undefined) return [];
  const iDate = findCol(headers, DATE_KEYS);
  const iTitle = findCol(headers, TITLE_KEYS);
  const iContent = findCol(headers, CONTENT_KEYS);
  const iImp = findCol(headers, IMPRESSIONS_KEYS);
  const iReact = findCol(headers, REACTIONS_KEYS);
  const iComm = findCol(headers, COMMENTS_KEYS);
  const iShare = findCol(headers, SHARES_KEYS);
  const iConv = findCol(headers, CONVERSIONS_KEYS);

  const out: ParsedRow[] = [];
  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r] ?? [];
    const url = (row[iUrl] ?? "").trim();
    if (!url) continue;
    const titleRaw = iTitle !== undefined ? (row[iTitle] ?? "").trim() : "";
    const contentRaw = iContent !== undefined ? (row[iContent] ?? "").trim() : "";
    const title = titleRaw || contentRaw.slice(0, 80) || "(sans titre)";
    out.push({
      url,
      date: iDate !== undefined ? safeDate(row[iDate]) : new Date(),
      title,
      contentPreview: contentRaw ? contentRaw.slice(0, 240) : undefined,
      impressions: iImp !== undefined ? safeInt(row[iImp]) : undefined,
      reactions: iReact !== undefined ? safeInt(row[iReact]) : undefined,
      comments: iComm !== undefined ? safeInt(row[iComm]) : undefined,
      shares: iShare !== undefined ? safeInt(row[iShare]) : undefined,
      conversions: iConv !== undefined ? safeInt(row[iConv]) : undefined,
    });
  }
  return out;
}

// =============================================================================
// Matching avec ContentItem existants
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
// Pipeline parse → preview rows enrichies du matching
// =============================================================================

export async function parseAndPreview(
  file: File,
  kind: ImportKind
): Promise<PreviewRow[]> {
  const matrix = await readSheet(file);
  const parsed = extractRows(matrix);
  const out: PreviewRow[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const p = parsed[i];
    if (!p) continue;
    const match = await findItemByUrl(p.url);
    const hasMetrics =
      p.impressions !== undefined ||
      p.reactions !== undefined ||
      p.comments !== undefined ||
      p.shares !== undefined;
    out.push({
      ...p,
      index: i + 1,
      kind,
      matchedItemId: match?.id ?? null,
      matchedItemSubject: match?.subject ?? null,
      dateIso: p.date.toISOString(),
      hasMetrics,
    });
  }
  return out;
}

// =============================================================================
// Exécution de l'import
// =============================================================================

interface ExecuteParams {
  rows: PreviewRow[];
  /** Clé : index. Valeur : "create" | "update:<itemId>" | "skip" */
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
    const decision =
      params.decisions[row.index] ??
      (row.matchedItemId ? `update:${row.matchedItemId}` : "create");

    if (decision === "skip") {
      result.skipped++;
      continue;
    }

    const date = row.dateIso ? new Date(row.dateIso) : row.date;
    let targetItemId: number;

    if (decision === "create") {
      const type =
        row.kind === "articles"
          ? "seo_article"
          : row.kind === "substack"
            ? "newsletter_edition"
            : "linkedin_post";
      const subject = (row.title ?? "(post LinkedIn importé)").slice(0, 280) || "(post LinkedIn importé)";
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
          brief:
            row.kind === "substack"
              ? "(importé depuis l'export Substack)"
              : "(importé depuis l'export LinkedIn)",
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
      // S'assurer que publishedUrl + publishedAt sont à jour
      await prisma.contentItem.update({
        where: { id },
        data: {
          publishedUrl: row.url,
          publishedAt: date,
        },
      });
      targetItemId = id;
      result.itemsUpdated++;
    } else {
      result.skipped++;
      continue;
    }

    // Si la ligne porte des métriques : on les enregistre, recordedAt = date du post
    if (row.hasMetrics) {
      const engagement = (row.reactions ?? 0) + (row.comments ?? 0) + (row.shares ?? 0);
      const rate =
        row.impressions && row.impressions > 0
          ? (engagement / row.impressions) * 100
          : null;
      await prisma.contentMetric.create({
        data: {
          contentId: targetItemId,
          recordedAt: date,
          impressions: row.impressions ?? null,
          engagementCount: engagement || null,
          conversions: row.conversions ?? null,
          engagementRate: rate,
          notes:
            row.kind === "substack"
              ? `Import Substack — ${row.reactions ?? 0} ouvertures / ${row.comments ?? 0} commentaires / ${row.conversions ?? 0} clics`
              : `Import LinkedIn — ${row.reactions ?? 0} réactions / ${row.comments ?? 0} commentaires / ${row.shares ?? 0} partages`,
          source: row.kind === "substack" ? "substack_export" : "linkedin_export",
        },
      });
      result.metricsAdded++;
    }
  }

  return result;
}
