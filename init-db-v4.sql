-- ============================================================================
-- Migration v4 — Thématiques hebdo + suggestions de hooks
-- À exécuter dans la console Vercel Postgres
-- ============================================================================

-- 1. Table WeeklyTheme
CREATE TABLE IF NOT EXISTS "WeeklyTheme" (
  "id" SERIAL PRIMARY KEY,
  "weekStart" TIMESTAMP(3) NOT NULL,
  "theme" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "primaryCampaign" TEXT,
  "primaryCluster" TEXT,
  "primaryPillar" TEXT,
  "actionDirectives" TEXT,
  "source" TEXT NOT NULL DEFAULT 'indicative',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "model" TEXT,
  "rationale" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "WeeklyTheme_weekStart_status_idx"
  ON "WeeklyTheme"("weekStart", "status");

-- 2. Table HookSuggestion
CREATE TABLE IF NOT EXISTS "HookSuggestion" (
  "id" SERIAL PRIMARY KEY,
  "contentId" INTEGER NOT NULL,
  "hook" TEXT NOT NULL,
  "pattern" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "selected" BOOLEAN NOT NULL DEFAULT FALSE,
  "model" TEXT,
  "userPrompt" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HookSuggestion_contentId_fkey" FOREIGN KEY ("contentId")
    REFERENCES "ContentItem"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "HookSuggestion_contentId_position_idx"
  ON "HookSuggestion"("contentId", "position");

-- ============================================================================
-- Vérification
-- ============================================================================
-- SELECT count(*) FROM "WeeklyTheme";       -- 0
-- SELECT count(*) FROM "HookSuggestion";    -- 0
