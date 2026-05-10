-- ============================================================================
-- Migration v7 — Archive + Métriques + Analyse mensuelle (Phase 5)
-- À exécuter dans la console Vercel Postgres
-- Idempotent.
-- ============================================================================

-- 1. Champs archive sur ContentItem
ALTER TABLE "ContentItem" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'platform';
ALTER TABLE "ContentItem" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "ContentItem_archivedAt_idx" ON "ContentItem"("archivedAt");
CREATE INDEX IF NOT EXISTS "ContentItem_source_type_idx" ON "ContentItem"("source", "type");

-- 2. Champ archive sur WeeklyTheme
ALTER TABLE "WeeklyTheme" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "WeeklyTheme_archivedAt_idx" ON "WeeklyTheme"("archivedAt");

-- 3. Table ContentMetric (snapshots temporels par item)
CREATE TABLE IF NOT EXISTS "ContentMetric" (
  "id" SERIAL PRIMARY KEY,
  "contentId" INTEGER NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "impressions" INTEGER,
  "engagementCount" INTEGER,
  "conversions" INTEGER,
  "engagementRate" DOUBLE PRECISION,
  "notes" TEXT,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentMetric_contentId_fkey"
    FOREIGN KEY ("contentId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ContentMetric_contentId_recordedAt_idx"
  ON "ContentMetric"("contentId", "recordedAt");

-- 4. Table MonthlyAnalysis (synthèses Claude)
CREATE TABLE IF NOT EXISTS "MonthlyAnalysis" (
  "id" SERIAL PRIMARY KEY,
  "period" TEXT NOT NULL UNIQUE,
  "body" TEXT NOT NULL,
  "itemsRefs" TEXT,
  "model" TEXT NOT NULL,
  "inputTokens" INTEGER,
  "outputTokens" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Vérification
-- ============================================================================
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'ContentItem' AND column_name IN ('source', 'archivedAt');
-- SELECT count(*) FROM "ContentMetric";
-- SELECT count(*) FROM "MonthlyAnalysis";
