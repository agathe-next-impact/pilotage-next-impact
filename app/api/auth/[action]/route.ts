/**
 * Endpoints d'authentification :
 *  - POST /api/auth/login    body: { email, password }
 *  - POST /api/auth/logout
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession, verifyCredentials } from "@/lib/auth";
import { recentFailedAttempts, recordLoginAttempt } from "@/lib/db";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SEC = 600; // 10 min

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ action: string }> }
) {
  const { action } = await ctx.params;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0";

  if (action === "logout") {
    const session = await getSession();
    session.destroy();
    return NextResponse.json({ ok: true });
  }

  if (action !== "login") {
    return NextResponse.json({ error: "Unknown action" }, { status: 404 });
  }

  // Rate limit basique
  const recentFails = await recentFailedAttempts(ip, RATE_LIMIT_WINDOW_SEC);
  if (recentFails >= RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans 10 minutes." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body invalide." }, { status: 400 });
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email ou mot de passe invalide." }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const ok = verifyCredentials(email, password);

  await recordLoginAttempt(ip, email, ok);

  if (!ok) {
    return NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });
  }

  const session = await getSession();
  session.isLoggedIn = true;
  session.email = email;
  session.loginAt = new Date().toISOString();
  await session.save();

  return NextResponse.json({ ok: true });
}
