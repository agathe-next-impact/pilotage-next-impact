/**
 * Cron Vercel hebdomadaire — audit GEO des 10 prompts cibles.
 * GET /api/kpi/geo-audit
 * Header : Authorization: Bearer ${CRON_SECRET}
 */

import { NextResponse, type NextRequest } from "next/server";
import { verifyCronAuth } from "@/lib/auth";
import { saveGeoAuditRun, upsertSnapshot } from "@/lib/kpi/store";
import { runGeoAudit, computeShareOfVoice } from "@/lib/kpi/geo-tester";
import { currentPeriod } from "@/lib/format";
import type { Period } from "@/lib/kpi/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — l'audit peut être long

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const period = currentPeriod() as Period;

  try {
    const payload = await runGeoAudit();
    const { shareOfVoice, citationsCount } = computeShareOfVoice(payload);

    await saveGeoAuditRun(period, payload);
    const snap = await upsertSnapshot({
      period,
      source: "geo-audit",
      geo: { shareOfVoice, citationsCount },
    });

    return NextResponse.json({
      ok: true,
      period,
      shareOfVoice,
      citationsCount,
      promptCount: payload.prompts.length,
      snapshot: snap,
    });
  } catch (err) {
    console.error("[geo-audit]", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
