/**
 * Cron Vercel — synchronise GSC pour le mois courant.
 * GET /api/kpi/sync-gsc
 * Header : Authorization: Bearer ${CRON_SECRET}
 */

import { NextResponse, type NextRequest } from "next/server";
import { verifyCronAuth } from "@/lib/auth";
import { upsertSnapshot } from "@/lib/kpi/store";
import { fetchGscMetrics, gscToSnapshotPatch } from "@/lib/kpi/gsc-client";
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
    const result = await fetchGscMetrics(period);
    const patch = gscToSnapshotPatch(result);
    const snap = await upsertSnapshot({ period, source: "gsc", ...patch });
    return NextResponse.json({ ok: true, period, snapshot: snap });
  } catch (err) {
    console.error("[sync-gsc]", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
