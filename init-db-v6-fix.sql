-- ============================================================================
-- Fix v6 — ajoute les DEFAULT manquants sur updatedAt
-- À exécuter AVANT de re-jouer les INSERT du init-db-v6.sql
-- Idempotent.
-- ============================================================================

ALTER TABLE "VoicePattern"
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "VoicePattern"
  ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "PromptTemplate"
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "PromptTemplate"
  ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Backfill des éventuelles lignes déjà insérées sans updatedAt
UPDATE "VoicePattern" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL;
UPDATE "PromptTemplate" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL;

-- Vérification
SELECT 'VoicePattern' AS tbl, count(*) AS rows FROM "VoicePattern"
UNION ALL
SELECT 'PromptTemplate', count(*) FROM "PromptTemplate";
