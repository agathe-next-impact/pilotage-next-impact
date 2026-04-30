/**
 * GET /api/kpi  → liste tous les snapshots (admin uniquement).
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listSnapshots } from "@/lib/kpi/store";

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const snapshots = await listSnapshots();
  return NextResponse.json({ snapshots });
}
