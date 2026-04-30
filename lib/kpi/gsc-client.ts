/**
 * Client Google Search Console — récupère clics, impressions, position moyenne,
 * pages indexées et top 10 pour le mois courant.
 *
 * Pré-requis : service account avec rôle "Owner" ou "Full" sur la propriété GSC.
 */

import "server-only";

import { google } from "googleapis";
import type { Snapshot, Period } from "./types";

interface GscFetchResult {
  clicks: number;
  impressions: number;
  avgPosition: number;
  pagesIndexed: number;
  pagesTop10: number;
}

function getClient() {
  const clientEmail = process.env.GSC_CLIENT_EMAIL;
  const privateKey = process.env.GSC_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) {
    throw new Error("GSC_CLIENT_EMAIL ou GSC_PRIVATE_KEY manquant.");
  }
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
  return google.searchconsole({ version: "v1", auth });
}

function periodRange(period: Period): { start: string; end: string } {
  const [yearStr, monthStr] = period.split("-");
  const year = Number.parseInt(yearStr ?? "", 10);
  const month = Number.parseInt(monthStr ?? "", 10);
  const start = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10); // dernier jour du mois
  return { start, end };
}

export async function fetchGscMetrics(period: Period): Promise<GscFetchResult> {
  const siteUrl = process.env.GSC_SITE_URL;
  if (!siteUrl) throw new Error("GSC_SITE_URL manquant.");

  const sc = getClient();
  const { start, end } = periodRange(period);

  // 1. Totaux du mois
  const totals = await sc.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: start,
      endDate: end,
      dimensions: [],
      type: "web",
      rowLimit: 1,
    },
  });
  const t = totals.data.rows?.[0];
  const clicks = t?.clicks ?? 0;
  const impressions = t?.impressions ?? 0;
  const avgPosition = t?.position ?? 0;

  // 2. Pages avec ≥1 impression (proxy "indexées")
  const pages = await sc.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: start,
      endDate: end,
      dimensions: ["page"],
      type: "web",
      rowLimit: 5000,
    },
  });
  const pagesIndexed = pages.data.rows?.length ?? 0;
  const pagesTop10 = pages.data.rows?.filter((r) => (r.position ?? 99) <= 10).length ?? 0;

  return {
    clicks: Math.round(clicks),
    impressions: Math.round(impressions),
    avgPosition: Number(avgPosition.toFixed(2)),
    pagesIndexed,
    pagesTop10,
  };
}

export function gscToSnapshotPatch(r: GscFetchResult): Pick<Snapshot, "seo"> {
  return {
    seo: {
      clicks: r.clicks,
      impressions: r.impressions,
      pagesIndexed: r.pagesIndexed,
      pagesTop10: r.pagesTop10,
      avgPosition: r.avgPosition,
    },
  };
}
