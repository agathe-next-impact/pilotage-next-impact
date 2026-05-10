-- ============================================================================
-- Migration v2 — Médias + lien de publication + sujet final
-- À exécuter dans la console Vercel Postgres
-- ============================================================================

-- 1. Ajouter colonnes manquantes sur ContentItem
ALTER TABLE "ContentItem"
  ADD COLUMN IF NOT EXISTS "finalSubject" TEXT,
  ADD COLUMN IF NOT EXISTS "publishedUrl" TEXT;

-- 2. Créer la table MediaAsset
CREATE TABLE IF NOT EXISTS "MediaAsset" (
  "id" SERIAL PRIMARY KEY,
  "contentId" INTEGER NOT NULL,
  "kind" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "mimeType" TEXT NOT NULL,
  "alt" TEXT,
  "caption" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaAsset_contentId_fkey" FOREIGN KEY ("contentId")
    REFERENCES "ContentItem"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "MediaAsset_contentId_position_idx"
  ON "MediaAsset"("contentId", "position");

-- ============================================================================
-- Vérification
-- ============================================================================
-- SELECT count(*) FROM "MediaAsset";  -- 0 (table créée mais vide)
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'ContentItem'
--     AND column_name IN ('finalSubject', 'publishedUrl');  -- doit retourner 2 lignes
