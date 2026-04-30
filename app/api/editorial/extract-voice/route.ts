/**
 * Cron Vercel — extrait les patterns de voix depuis les contenus publiés.
 * GET /api/editorial/extract-voice
 * Header : Authorization: Bearer ${CRON_SECRET}
 *
 * Les patterns extraits sont insérés en `lexicon-loved` source `extracted`,
 * avec un weight modeste (0.5-2). À valider manuellement dans /pilotage/contenus/voice.
 */

import { NextResponse, type NextRequest } from "next/server";
import { verifyCronAuth } from "@/lib/auth";
import {
  extractFromPublishedContent,
  upsertPattern,
} from "@/lib/editorial/voice-fingerprint";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { candidates, totalDocs } = await extractFromPublishedContent(20);
    let inserted = 0;
    for (const c of candidates) {
      try {
        await upsertPattern({
          kind: "lexicon-loved",
          text: c.text,
          source: "extracted",
          weight: Math.min(2, 0.5 + c.appearances / 10),
        });
        inserted++;
      } catch {
        /* ignore */
      }
    }
    return NextResponse.json({
      ok: true,
      totalDocs,
      candidatesFound: candidates.length,
      inserted,
    });
  } catch (err) {
    console.error("[extract-voice]", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
