-- ============================================================================
-- Migration v9 — Synthèses mensuelles Claude
-- À exécuter dans la console Vercel Postgres. Idempotent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "MonthlyAnalysis" (
  "id" SERIAL PRIMARY KEY,
  "period" TEXT NOT NULL UNIQUE,
  "body" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Vérification
-- SELECT count(*) FROM "MonthlyAnalysis";
