-- ============================================================================
-- Migration v6 — PromptTemplate + VoicePattern (Phase 4)
-- À exécuter dans la console Vercel Postgres
-- ============================================================================

-- 1. Table PromptTemplate (versionning des prompts système)
CREATE TABLE IF NOT EXISTS "PromptTemplate" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "body" TEXT NOT NULL,
  "meta" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT FALSE,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PromptTemplate_name_version_key" UNIQUE ("name", "version")
);
CREATE INDEX IF NOT EXISTS "PromptTemplate_name_isActive_idx"
  ON "PromptTemplate"("name", "isActive");

-- 2. Table VoicePattern (lexique aimé/banni + hooks gagnants + structures)
CREATE TABLE IF NOT EXISTS "VoicePattern" (
  "id" SERIAL PRIMARY KEY,
  "kind" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "appearances" INTEGER NOT NULL DEFAULT 1,
  "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "VoicePattern_kind_active_idx"
  ON "VoicePattern"("kind", "active");

-- ============================================================================
-- 3. Seed initial des patterns de voix Next Impact
-- (basés sur les directives Agathe : pédagogique, anti-commercial, anti-métaphore)
-- ============================================================================

-- Lexique APPRÉCIÉ (à privilégier)
INSERT INTO "VoicePattern" ("kind", "text", "source", "weight") VALUES
('lexicon-loved', 'Headless WordPress', 'manual', 1.5),
('lexicon-loved', 'WordPress découplé', 'manual', 1.3),
('lexicon-loved', 'back-office', 'manual', 1.2),
('lexicon-loved', 'interface d''administration', 'manual', 1.0),
('lexicon-loved', 'Core Web Vitals', 'manual', 1.4),
('lexicon-loved', 'contribution AGEFIPH', 'manual', 1.4),
('lexicon-loved', 'déduction TIH', 'manual', 1.4),
('lexicon-loved', 'TJM', 'manual', 1.0),
('lexicon-loved', 'coût main-d''œuvre', 'manual', 1.0),
('lexicon-loved', 'audit', 'manual', 1.0),
('lexicon-loved', 'diagnostic', 'manual', 1.0),
('lexicon-loved', 'ROI sur 3 ans', 'manual', 1.2),
('lexicon-loved', 'TCO', 'manual', 1.0),
('lexicon-loved', 'stack', 'manual', 1.0),
('lexicon-loved', 'architecture', 'manual', 1.0),
('lexicon-loved', 'PME', 'manual', 1.0),
('lexicon-loved', 'arbitrage', 'manual', 1.0),
('lexicon-loved', 'décision', 'manual', 1.0)
ON CONFLICT DO NOTHING;

-- Lexique BANNI (à exclure absolument)
INSERT INTO "VoicePattern" ("kind", "text", "source", "weight") VALUES
('lexicon-banned', 'révolutionnaire', 'manual', 2.0),
('lexicon-banned', 'incroyable', 'manual', 2.0),
('lexicon-banned', 'magique', 'manual', 2.0),
('lexicon-banned', 'exceptionnel', 'manual', 2.0),
('lexicon-banned', 'unique', 'manual', 1.5),
('lexicon-banned', 'puissant', 'manual', 1.5),
('lexicon-banned', 'le meilleur', 'manual', 2.0),
('lexicon-banned', 'game-changer', 'manual', 2.0),
('lexicon-banned', 'disruptif', 'manual', 2.0),
('lexicon-banned', 'synergies', 'manual', 1.5),
('lexicon-banned', 'écosystème', 'manual', 1.2),
('lexicon-banned', 'leverage', 'manual', 1.5),
('lexicon-banned', 'scaler', 'manual', 1.5),
('lexicon-banned', 'boost', 'manual', 1.5),
('lexicon-banned', 'transformer votre business', 'manual', 2.0),
('lexicon-banned', 'passer au niveau supérieur', 'manual', 2.0),
('lexicon-banned', 'libérer le potentiel', 'manual', 2.0),
('lexicon-banned', 'offre exclusive', 'manual', 2.0),
('lexicon-banned', 'ne manquez pas', 'manual', 2.0),
('lexicon-banned', 'dernière chance', 'manual', 2.0)
ON CONFLICT DO NOTHING;

-- Tournures BANNIES (récit perso, fausse urgence)
INSERT INTO "VoicePattern" ("kind", "text", "source", "weight") VALUES
('phrase-banned', 'Je sais ce que vous pensez...', 'manual', 1.5),
('phrase-banned', 'Et si je vous disais que...', 'manual', 1.5),
('phrase-banned', 'Vous savez quoi ?', 'manual', 1.5),
('phrase-banned', 'Voici 5 secrets', 'manual', 1.5),
('phrase-banned', 'La vérité sur', 'manual', 1.5),
('phrase-banned', 'Êtes-vous prêt à transformer', 'manual', 2.0),
('phrase-banned', 'Cliquez ici', 'manual', 1.5),
('phrase-banned', 'Lundi 8h, le DSI m''envoie', 'manual', 1.0),
('phrase-banned', 'Dans ma carrière', 'manual', 1.0),
('phrase-banned', 'Depuis 20 ans', 'manual', 1.0),
('phrase-banned', 'Mon expérience montre', 'manual', 1.0),
('phrase-banned', 'malgré mon handicap', 'manual', 2.0),
('phrase-banned', 'comme un chef d''orchestre', 'manual', 1.5),
('phrase-banned', 'votre site est une autoroute', 'manual', 1.5)
ON CONFLICT DO NOTHING;

-- Tournures APPRÉCIÉES (factuelles, pédagogiques)
INSERT INTO "VoicePattern" ("kind", "text", "source", "weight") VALUES
('phrase-loved', 'Headless WordPress sépare le contenu de l''affichage.', 'manual', 1.0),
('phrase-loved', 'Quand cette solution n''est PAS adaptée :', 'manual', 1.5),
('phrase-loved', 'Pour estimer le ROI : simulateur sur next-impact.digital.', 'manual', 1.0),
('phrase-loved', 'Pour comprendre en détail : section Comprendre de next-impact.digital.', 'manual', 1.0),
('phrase-loved', 'Le détail chiffré : étude de cas Comme des Fous.', 'manual', 1.2),
('phrase-loved', 'Si Webflow correspond mieux à votre contexte, c''est la bonne réponse.', 'manual', 1.5)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Vérification
-- ============================================================================
-- SELECT count(*) FROM "PromptTemplate";
-- SELECT count(*) FROM "VoicePattern";
-- SELECT kind, count(*) FROM "VoicePattern" GROUP BY kind ORDER BY count DESC;
