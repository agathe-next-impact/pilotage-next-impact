/**
 * Authentification — Iron Session (cookie HttpOnly signé). Single-user.
 * SERVER-ONLY.
 */

import "server-only";

import { cookies } from "next/headers";
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";

export interface AdminSession {
  isLoggedIn: boolean;
  email?: string;
  loginAt?: string;
}

/**
 * Construit les options Iron Session à la demande.
 * Le check du SESSION_PASSWORD a lieu au runtime, pas au build —
 * pour ne pas faire échouer `next build` quand l'env n'est pas encore renseigné.
 */
function buildSessionOptions(): SessionOptions {
  const sessionPassword = process.env.SESSION_PASSWORD;
  if (process.env.NODE_ENV === "production") {
    if (!sessionPassword || sessionPassword.length < 32) {
      throw new Error("SESSION_PASSWORD doit faire >= 32 caractères en production.");
    }
  }
  return {
    password: sessionPassword || "dev-only-32-chars-padding-padding-padding",
    cookieName: "pilotage_session",
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    },
  };
}

export async function getSession(): Promise<IronSession<AdminSession>> {
  return getIronSession<AdminSession>(await cookies(), buildSessionOptions());
}

export async function requireSession(): Promise<AdminSession> {
  const session = await getSession();
  if (!session.isLoggedIn) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

/** Comparaison constante-en-temps pour éviter les timing attacks. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function verifyCredentials(email: string, password: string): boolean {
  const expectedEmail = process.env.ADMIN_EMAIL ?? "";
  const expectedPwd = process.env.ADMIN_PASSWORD ?? "";
  return constantTimeEqual(email, expectedEmail) && constantTimeEqual(password, expectedPwd);
}

/** Vérifie le bearer token des cron Vercel. Utilisable côté API route. */
export function verifyCronAuth(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${expected}`;
}
