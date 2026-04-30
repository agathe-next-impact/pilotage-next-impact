/**
 * POST /api/editorial/adjust-plan
 * Header : Authorization: Bearer ${CRON_SECRET}
 *
 * Cron-friendly : peut être déclenché chaque début de mois (ex: 1er à 09:00)
 * pour analyser le mois écoulé et proposer des ajustements.
 */

import { NextResponse, type NextRequest } from "next/server";
import { verifyCronAuth } from "@/lib/auth";
import { adjustPlanWithClaude } from "@/lib/editorial/plan-adjuster";
import type { PlanScope } from "@/lib/editorial/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const scope = (url.searchParams.get("scope") ?? "global") as PlanScope;
  const force = url.searchParams.get("force") === "1";

  try {
    const revision = await adjustPlanWithClaude({ scope, force });
    return NextResponse.json({
      ok: true,
      revisionCreated: Boolean(revision),
      revision,
    });
  } catch (err) {
    console.error("[adjust-plan]", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
