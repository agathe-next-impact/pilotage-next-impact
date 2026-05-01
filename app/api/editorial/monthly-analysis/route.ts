/**
 * Cron Vercel — génère la synthèse mensuelle Claude pour le mois précédent.
 * GET /api/editorial/monthly-analysis
 * Header : Authorization: Bearer ${CRON_SECRET}
 *
 * Lancé le 2 du mois à 09h00 UTC pour analyser le mois précédent complet.
 */

import { NextResponse, type NextRequest } from "next/server";
import { verifyCronAuth } from "@/lib/auth";
import { generateMonthlyAnalysis } from "@/lib/editorial/analysis";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function previousPeriod(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0-11 (mois courant), donc m-1+1 = m pour le mois précédent
  // Si on est en janvier, période = décembre année précédente
  if (m === 0) return `${y - 1}-12`;
  return `${y}-${String(m).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const period = req.nextUrl.searchParams.get("period") ?? previousPeriod();

  try {
    const analysis = await generateMonthlyAnalysis(period);
    return NextResponse.json({
      ok: true,
      period: analysis.period,
      itemsCited: analysis.itemsRefs.length,
      bodyLength: analysis.body.length,
    });
  } catch (err) {
    console.error("[monthly-analysis]", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
