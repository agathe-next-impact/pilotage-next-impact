-- ============================================================================
-- Migration v5 — Reset des plannings + démarrage à partir d'aujourd'hui
-- À exécuter dans la console Vercel Postgres
-- ============================================================================

-- Vider les plannings pré-établis (les 21 ContentItem du seed initial)
-- Cascade automatique sur HookSuggestion / MediaAsset / ContentRevision
DELETE FROM "ContentItem";

-- (Optionnel) Vider les anciens thèmes/contextes orphelins
-- DELETE FROM "WeeklyTheme" WHERE "status" = 'draft';
-- DELETE FROM "PlanningContext" WHERE "status" IN ('ignored', 'stale');

-- ============================================================================
-- Vérification
-- ============================================================================
-- SELECT count(*) FROM "ContentItem";       -- 0
-- SELECT count(*) FROM "HookSuggestion";    -- 0 (cascade)
-- SELECT count(*) FROM "MediaAsset";        -- 0 (cascade)
