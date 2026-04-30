/**
 * POST /api/editorial/upload
 * Body : multipart/form-data avec champs `file` (File) et `contentId` (number)
 * Retour : MediaAsset
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { uploadMedia } from "@/lib/editorial/media";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Body multipart invalide" }, { status: 400 });
  }

  const file = form.get("file");
  const contentIdRaw = form.get("contentId");
  const alt = form.get("alt");
  const caption = form.get("caption");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file manquant" }, { status: 400 });
  }
  const contentId = Number(contentIdRaw);
  if (!Number.isFinite(contentId) || contentId <= 0) {
    return NextResponse.json({ error: "contentId invalide" }, { status: 400 });
  }

  try {
    const media = await uploadMedia({
      contentId,
      file,
      alt: typeof alt === "string" ? alt : undefined,
      caption: typeof caption === "string" ? caption : undefined,
    });
    return NextResponse.json({ media });
  } catch (err) {
    console.error("[upload]", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
