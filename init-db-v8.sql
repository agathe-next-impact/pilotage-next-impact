-- ============================================================================
-- Migration v8 — Refonte : Suivi de performances marketing
-- ATTENTION : ce script SUPPRIME toutes les anciennes tables (génération IA).
-- À exécuter dans la console Vercel Postgres.
-- ============================================================================

-- 1. DROP des anciennes tables (avec CASCADE pour les FK)
DROP TABLE IF EXISTS "ContentMetric"     CASCADE;
DROP TABLE IF EXISTS "MonthlyAnalysis"   CASCADE;
DROP TABLE IF EXISTS "HookSuggestion"    CASCADE;
DROP TABLE IF EXISTS "MediaAsset"        CASCADE;
DROP TABLE IF EXISTS "ContentRevision"   CASCADE;
DROP TABLE IF EXISTS "ContentItem"       CASCADE;
DROP TABLE IF EXISTS "WeeklyTheme"       CASCADE;
DROP TABLE IF EXISTS "PlanRevision"      CASCADE;
DROP TABLE IF EXISTS "PlanningContext"   CASCADE;
DROP TABLE IF EXISTS "PromptTemplate"    CASCADE;
DROP TABLE IF EXISTS "VoicePattern"      CASCADE;
DROP TABLE IF EXISTS "GeoAuditRun"       CASCADE;
DROP TABLE IF EXISTS "Snapshot"          CASCADE;

-- 2. LoginAttempt : on garde si elle existe, sinon on crée
CREATE TABLE IF NOT EXISTS "LoginAttempt" (
  "id" SERIAL PRIMARY KEY,
  "ip" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "success" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "LoginAttempt_ip_createdAt_idx"
  ON "LoginAttempt"("ip", "createdAt");
CREATE INDEX IF NOT EXISTS "LoginAttempt_email_createdAt_idx"
  ON "LoginAttempt"("email", "createdAt");

-- 3. WeekReport : 1 rapport par semaine
CREATE TABLE IF NOT EXISTS "WeekReport" (
  "id" SERIAL PRIMARY KEY,
  "weekStart" TIMESTAMP(3) NOT NULL UNIQUE,
  "notes" TEXT,
  "linkedinFollowers" INTEGER,
  "newsletterSubscribers" INTEGER,
  "seoClicks" INTEGER,
  "seoImpressions" INTEGER,
  "geoShareOfVoice" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. WeekPost : 0..N posts LinkedIn par semaine
CREATE TABLE IF NOT EXISTS "WeekPost" (
  "id" SERIAL PRIMARY KEY,
  "weekReportId" INTEGER NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL,
  "subject" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "url" TEXT,
  "impressions" INTEGER,
  "reactions" INTEGER,
  "comments" INTEGER,
  "shares" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WeekPost_weekReportId_fkey"
    FOREIGN KEY ("weekReportId") REFERENCES "WeekReport"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "WeekPost_weekReportId_idx" ON "WeekPost"("weekReportId");

-- 5. WeekNewsletter : 0 ou 1 édition par semaine
CREATE TABLE IF NOT EXISTS "WeekNewsletter" (
  "id" SERIAL PRIMARY KEY,
  "weekReportId" INTEGER NOT NULL UNIQUE,
  "publishedAt" TIMESTAMP(3) NOT NULL,
  "subject" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "url" TEXT,
  "emailSends" INTEGER,
  "emailOpens" INTEGER,
  "emailClicks" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WeekNewsletter_weekReportId_fkey"
    FOREIGN KEY ("weekReportId") REFERENCES "WeekReport"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 6. SeoGeoAction : 0..N actions par semaine
CREATE TABLE IF NOT EXISTS "SeoGeoAction" (
  "id" SERIAL PRIMARY KEY,
  "weekReportId" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "result" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SeoGeoAction_weekReportId_fkey"
    FOREIGN KEY ("weekReportId") REFERENCES "WeekReport"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "SeoGeoAction_weekReportId_idx" ON "SeoGeoAction"("weekReportId");

-- ============================================================================
-- Vérification
-- ============================================================================
-- SELECT count(*) FROM "WeekReport";
-- SELECT count(*) FROM "WeekPost";
-- SELECT count(*) FROM "WeekNewsletter";
-- SELECT count(*) FROM "SeoGeoAction";
