-- ============================================================================
-- Migration v3 — Planning conversationnel
-- À exécuter dans la console Vercel Postgres
-- ============================================================================

-- 1. Table PlanningContext (facteurs imprévus saisis par chat ou détectés)
CREATE TABLE IF NOT EXISTS "PlanningContext" (
  "id" SERIAL PRIMARY KEY,
  "weekStart" TIMESTAMP(3),
  "source" TEXT NOT NULL,
  "rawInput" TEXT,
  "digest" TEXT NOT NULL,
  "affectedSlugs" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PlanningContext_weekStart_status_idx"
  ON "PlanningContext"("weekStart", "status");
CREATE INDEX IF NOT EXISTS "PlanningContext_createdAt_idx"
  ON "PlanningContext"("createdAt");

-- 2. Lier les PlanRevision aux PlanningContext (FK optionnelle)
ALTER TABLE "PlanRevision"
  ADD COLUMN IF NOT EXISTS "contextId" INTEGER;

-- Création de la FK seulement si elle n'existe pas déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'PlanRevision_contextId_fkey'
  ) THEN
    ALTER TABLE "PlanRevision"
      ADD CONSTRAINT "PlanRevision_contextId_fkey"
      FOREIGN KEY ("contextId") REFERENCES "PlanningContext"("id")
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "PlanRevision_contextId_idx"
  ON "PlanRevision"("contextId");

-- ============================================================================
-- Vérification
-- ============================================================================
-- SELECT count(*) FROM "PlanningContext";  -- 0 (table créée vide)
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'PlanRevision' AND column_name = 'contextId';  -- 1 ligne
