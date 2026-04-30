/**
 * Client Google Analytics 4 — sessions, utilisateurs, conversions du mois.
 *
 * Pré-requis : même service account que GSC, ajouté en "Viewer" sur la propriété GA4.
 */

import "server-only";

import { BetaAnalyticsDataClient } from "@google-analytics/data";
import type { Period, Snapshot } from "./types";

function getClient() {
  const clientEmail = process.env.GSC_CLIENT_EMAIL;
  const privateKey = process.env.GSC_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) {
    throw new Error("Service account credentials manquants.");
  }
  return new BetaAnalyticsDataClient({
    credentials: { client_email: clientEmail, private_key: privateKey },
  });
}

function periodRange(period: Period): { start: string; end: string } {
  const [yearStr, monthStr] = period.split("-");
  const year = Number.parseInt(yearStr ?? "", 10);
  const month = Number.parseInt(monthStr ?? "", 10);
  const start = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { start, end };
}

export interface Ga4FetchResult {
  sessions: number;
  users: number;
  conversions: number;
}

export async function fetchGa4Metrics(period: Period): Promise<Ga4FetchResult> {
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) throw new Error("GA4_PROPERTY_ID manquant.");

  const client = getClient();
  const { start, end } = periodRange(period);

  const [resp] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: start, endDate: end }],
    metrics: [
      { name: "sessions" },
      { name: "totalUsers" },
      { name: "conversions" },
    ],
  });

  const row = resp.rows?.[0];
  const m = row?.metricValues ?? [];
  return {
    sessions: Number.parseInt(m[0]?.value ?? "0", 10),
    users: Number.parseInt(m[1]?.value ?? "0", 10),
    conversions: Number.parseInt(m[2]?.value ?? "0", 10),
  };
}

export function ga4ToSnapshotPatch(r: Ga4FetchResult): Pick<Snapshot, "ga4"> {
  return {
    ga4: { sessions: r.sessions, users: r.users, conversions: r.conversions },
  };
}
