/**
 * Singleton Prisma + helpers anti-bruteforce auth.
 * SERVER-ONLY.
 */

import "server-only";

import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __pilotage_prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__pilotage_prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__pilotage_prisma = prisma;
}

// Anti-bruteforce auth -------------------------------------------------------

export async function recordLoginAttempt(
  ip: string,
  email: string,
  success: boolean
): Promise<void> {
  await prisma.loginAttempt.create({ data: { ip, email, success } });
}

export async function recentFailedAttempts(
  ip: string,
  withinSec = 600
): Promise<number> {
  const since = new Date(Date.now() - withinSec * 1000);
  return prisma.loginAttempt.count({
    where: { ip, success: false, createdAt: { gte: since } },
  });
}
