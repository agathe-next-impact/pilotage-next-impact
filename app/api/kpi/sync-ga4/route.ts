/**
 * Cron Vercel — synchronise GA4 pour le mois courant.
 * GET /api/kpi/sync-ga4
 * Header : Authorization: Bearer ${CRON_SECRET}
 */

import { NextResponse, type NextRequest } from "next/server";
import { verifyCronAuth } from "@/lib/auth";
import { upsertSnapshot } from "@/lib/kpi/store";
import { fetchGa4Metrics, ga4ToSnapshotPatch } from "@/lib/kpi/ga4-client";
import { currentPeriod } from "@/lib/format";
import type { Period } from "@/lib/kpi/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const period = currentPeriod() as Period;
  try {
    const result = await fetchGa4Metrics(period);
    const patch = ga4ToSnapshotPatch(result);
    const snap = await upsertSnapshot({ period, source: "ga4", ...patch });
    return NextResponse.json({ ok: true, period, snapshot: snap });
  } catch (err) {
    console.error("[sync-ga4]", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
