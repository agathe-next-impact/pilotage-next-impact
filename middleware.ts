/**
 * Middleware Next.js — protège /pilotage/* en vérifiant la présence du cookie
 * de session signé. Pas de validation crypto ici (Edge runtime — Iron Session
 * n'est pas Edge-compatible) ; on se contente de vérifier la présence du
 * cookie. La validation cryptographique est faite côté Server Component.
 */

import { NextResponse, type NextRequest } from "next/server";

const COOKIE = "pilotage_session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Pages publiques : login + assets
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Protection /pilotage/*
  if (pathname.startsWith("/pilotage")) {
    const cookie = req.cookies.get(COOKIE);
    if (!cookie?.value) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/pilotage/:path*", "/login", "/api/auth/:path*"],
};
