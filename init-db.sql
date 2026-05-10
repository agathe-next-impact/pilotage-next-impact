-- ============================================================================
-- Pilotage Next Impact — Initialisation DB Postgres (à exécuter dans la console Vercel)
-- Vercel → Storage → ta DB Postgres → onglet "Query" ou "Console" → colle ce SQL
-- ============================================================================

-- 1. Snapshot ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Snapshot" (
  "id" SERIAL PRIMARY KEY,
  "period" TEXT NOT NULL UNIQUE,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "linkedinFollowers" INTEGER,
  "linkedinImpressions" INTEGER,
  "linkedinEngagementRate" DOUBLE PRECISION,
  "linkedinDmsQualified" INTEGER,
  "linkedinFormLeads" INTEGER,
  "linkedinPostsPublished" INTEGER,
  "nlSubscribers" INTEGER,
  "nlOpenRate" DOUBLE PRECISION,
  "nlCtrResource" DOUBLE PRECISION,
  "nlUnsubscribeRate" DOUBLE PRECISION,
  "nlLeadsMentioning" INTEGER,
  "nlEditionNumber" INTEGER,
  "seoClicks" INTEGER,
  "seoImpressions" INTEGER,
  "seoPagesIndexed" INTEGER,
  "seoPagesTop10" INTEGER,
  "seoAvgPosition" DOUBLE PRECISION,
  "geoShareOfVoice" DOUBLE PRECISION,
  "geoCitationsCount" INTEGER,
  "geoReferralTraffic" INTEGER,
  "ga4Sessions" INTEGER,
  "ga4Users" INTEGER,
  "ga4Conversions" INTEGER
);

-- 2. GeoAuditRun -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "GeoAuditRun" (
  "id" SERIAL PRIMARY KEY,
  "period" TEXT NOT NULL,
  "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "payload" TEXT NOT NULL,
  CONSTRAINT "GeoAuditRun_period_fkey" FOREIGN KEY ("period")
    REFERENCES "Snapshot"("period") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "GeoAuditRun_period_idx" ON "GeoAuditRun"("period");

-- 3. LoginAttempt ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "LoginAttempt" (
  "id" SERIAL PRIMARY KEY,
  "ip" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "success" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "LoginAttempt_ip_createdAt_idx" ON "LoginAttempt"("ip", "createdAt");
CREATE INDEX IF NOT EXISTS "LoginAttempt_email_createdAt_idx" ON "LoginAttempt"("email", "createdAt");

-- 4. ContentItem -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ContentItem" (
  "id" SERIAL PRIMARY KEY,
  "slug" TEXT NOT NULL UNIQUE,
  "type" TEXT NOT NULL,
  "trackKey" TEXT NOT NULL,
  "plannedFor" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'planned',
  "subject" TEXT NOT NULL,
  "brief" TEXT NOT NULL,
  "draft" TEXT,
  "finalBody" TEXT,
  "generatedModel" TEXT,
  "generatedAt" TIMESTAMP(3),
  "validatedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "meta" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ContentItem_type_plannedFor_idx" ON "ContentItem"("type", "plannedFor");
CREATE INDEX IF NOT EXISTS "ContentItem_status_idx" ON "ContentItem"("status");

-- 5. ContentRevision ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ContentRevision" (
  "id" SERIAL PRIMARY KEY,
  "contentId" INTEGER NOT NULL,
  "payload" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentRevision_contentId_fkey" FOREIGN KEY ("contentId")
    REFERENCES "ContentItem"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ContentRevision_contentId_createdAt_idx" ON "ContentRevision"("contentId", "createdAt");

-- 6. PlanRevision ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "PlanRevision" (
  "id" SERIAL PRIMARY KEY,
  "scope" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "basedOnPeriod" TEXT NOT NULL,
  "payload" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "appliedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "PlanRevision_scope_status_idx" ON "PlanRevision"("scope", "status");

-- ============================================================================
-- 7. SEED — Baseline avr. 2026 + 21 ContentItem du plan éditorial
-- ============================================================================

-- Snapshot baseline avr. 2026
INSERT INTO "Snapshot" ("period", "source",
  "linkedinFollowers", "linkedinImpressions", "linkedinEngagementRate",
  "linkedinDmsQualified", "linkedinFormLeads", "linkedinPostsPublished",
  "nlSubscribers", "nlOpenRate", "nlCtrResource", "nlUnsubscribeRate",
  "nlLeadsMentioning", "nlEditionNumber",
  "seoClicks", "seoImpressions", "seoPagesIndexed", "seoPagesTop10", "seoAvgPosition",
  "geoShareOfVoice", "geoCitationsCount", "geoReferralTraffic",
  "ga4Sessions", "ga4Users", "ga4Conversions")
VALUES ('2026-04', 'manual',
  150, 5000, 0.03, 1, 1, 12,
  60, 0.38, 0.10, 0.02, 0, 1,
  50, 2400, 15, 2, 24.5,
  0, 0, 0,
  850, 720, 1)
ON CONFLICT ("period") DO NOTHING;

-- 21 ContentItem du plan éditorial
INSERT INTO "ContentItem" ("slug", "type", "trackKey", "plannedFor", "status", "subject", "brief", "meta") VALUES
-- Newsletter (6 éditions)
('nl-1', 'newsletter_edition', 'edition', '2026-04-14',  'planned',
  'Mon site WordPress est-il encore la bonne solution en 2026 ?',
  'Pilier W. Question décideur frontale. Argumenter qu''on peut moderniser sans tout jeter. CTA : audit gratuit. Sync SEO : /articles/wordpress-headless-vs-classique-2026.',
  '{"pillier":"W","syncSEO":"/articles/wordpress-headless-vs-classique-2026"}'),
('nl-2', 'newsletter_edition', 'edition', '2026-05-13',  'planned',
  'Webflow, WordPress Headless, Wix Pro : ce que personne ne vous dit vraiment',
  'Pilier A. Comparatif honnête entre 3 solutions, critères chiffrés. Sync SEO : /articles/cout-migration-wordpress-headless. Activer livre blanc gaté.',
  '{"pillier":"A","syncSEO":"/articles/cout-migration-wordpress-headless"}'),
('nl-3', 'newsletter_edition', 'edition', '2026-06-10',  'planned',
  'Headless : le mot que tout le monde utilise, que personne n''explique vraiment',
  'Pilier H. Définition pédagogique pour décideurs. Démystifier sans jargon. Première Q&R lecteurs. Sync : /documentation/headless-cms.',
  '{"pillier":"H","syncSEO":"/documentation/headless-cms"}'),
('nl-4', 'newsletter_edition', 'edition', '2026-07-08',  'planned',
  'Comment chiffrer votre choix techno avant de signer un devis',
  'Pilier R. Méthode + simulateur. CTA : essayez le simulateur. Cible DAF/RH avec angle OETH. Sync : /articles/roi-refonte-site-web-calcul.',
  '{"pillier":"R","syncSEO":"/articles/roi-refonte-site-web-calcul"}'),
('nl-5', 'newsletter_edition', 'edition', '2026-08-11',  'planned',
  '4 projets réels, 4 technologies, 4 décisions',
  'Pilier C. 4 mini études de cas, dont 1 où le headless n''était PAS la bonne réponse (Café Citoyen). Honnêteté éditoriale. Sync : /etudes-de-cas.',
  '{"pillier":"C","syncSEO":"/etudes-de-cas"}'),
('nl-6', 'newsletter_edition', 'edition', '2026-09-08',  'planned',
  'Rentrée web : comment prendre LA décision avant le 31 décembre',
  'Pilier R. Check-list décision Q4 + CTA projets Q4. Bilan rapide des 6 mois de NL. Sync : /services + /contact.',
  '{"pillier":"R","syncSEO":"/services"}'),
-- SEO (9 articles)
('seo-1', 'seo_article', 'B-TIH', '2026-04-15', 'planned',
  'Prestataire TIH développement web : réduire sa contribution AGEFIPH',
  'Cluster B-TIH P1. Concurrence quasi-nulle. Cible DAF/DRH. KW : prestataire TIH développement web. Inclure simulateur OETH, attestation, témoignages.',
  '{"cluster":"B-TIH","priorite":"P1"}'),
('seo-2', 'seo_article', 'A-WP',  '2026-04-22', 'planned',
  'WordPress Headless vs classique : comparatif complet 2026',
  'Cluster A-WP P1. Comparatif technique + financier sur 3 ans. KW : wordpress headless vs classique. Tableau perf, schema FAQ, lien vers /etudes-de-cas.',
  '{"cluster":"A-WP","priorite":"P1"}'),
('seo-3', 'seo_article', 'A-WP',  '2026-05-12', 'planned',
  'Coût d''une migration WordPress Headless : grille tarifaire et ROI calculé',
  'Cluster A-WP P1. Grille de prix transparente : 2 250 / 4 000 / 5 000 €. Cas Comme des Fous. Simulateur intégré.',
  '{"cluster":"A-WP","priorite":"P1"}'),
('seo-4', 'seo_article', 'B-TIH', '2026-05-26', 'planned',
  'Réduire sa contribution AGEFIPH avec la sous-traitance TIH : guide 2026',
  'Cluster B-TIH P1. Guide pratique pour DAF : barème 2025-2026, calcul de la déduction (jusqu''à 1 500 € sur 5 000 €), checklist administrative.',
  '{"cluster":"B-TIH","priorite":"P1"}'),
('seo-5', 'seo_article', 'B-TIH', '2026-06-09', 'planned',
  'Attestation de déductibilité TIH : guide complet pour les entreprises',
  'Cluster B-TIH P1. Mode d''emploi de l''attestation, modèle téléchargeable. Schema HowTo. CTA : demande d''attestation.',
  '{"cluster":"B-TIH","priorite":"P1"}'),
('seo-6', 'seo_article', 'A-WP',  '2026-06-23', 'planned',
  'WordPress Headless Next.js vs Astro : comment choisir en 2026',
  'Cluster A-WP P2. Décision technique. Cas EGC (Astro) vs CDF (Next.js). Tableau de critères. Conclusion ouverte.',
  '{"cluster":"A-WP","priorite":"P2"}'),
('seo-7', 'seo_article', 'C-ROI', '2026-07-14', 'planned',
  'Calculer le ROI d''une refonte web WordPress : méthode et simulateur',
  'Cluster C-ROI P2. Méthode + simulateur intégré. KW : roi refonte site web. Cas chiffré : trafic +38%.',
  '{"cluster":"C-ROI","priorite":"P2"}'),
('seo-8', 'seo_article', 'A-WP',  '2026-08-18', 'planned',
  'Sécurité WordPress Headless : pourquoi l''architecture découplée est plus sûre',
  'Cluster A-WP P2. Cas EGC (audit A+). Surface d''attaque réduite. Mention OETH/TIH en pied. Schema FAQ.',
  '{"cluster":"A-WP","priorite":"P2"}'),
('seo-9', 'seo_article', 'A-WP',  '2026-09-15', 'planned',
  'Freelance WordPress Headless en France : pourquoi choisir un prestataire TIH ?',
  'Cluster A-WP P1. Article positionnement personnel. Statut TIH comme avantage compétitif. CTA : projet Q4.',
  '{"cluster":"A-WP","priorite":"P1"}'),
-- LinkedIn (6 posts pivots)
('li-A-01', 'linkedin_post', 'A', '2026-04-15', 'planned',
  'Core Web Vitals : pourquoi votre site WP plafonne à 60/100',
  'Campagne A (Crédibilité technique). Cible DSI/CTO. Hook chiffré. 5 raisons + 1 solution headless. 1200-1400 car., 0-1 emoji, CTA -> article SEO #2.',
  '{"campaign":"A"}'),
('li-B-01', 'linkedin_post', 'B', '2026-04-22', 'planned',
  'OETH : ce que votre DAF n''a pas calculé sur sa contribution AGEFIPH',
  'Campagne B (Avantage fiscal OETH). Cible DAF/DRH. Calcul concret : déduction TIH 30%. CTA simulateur. Pas de pathos, levier fiscal pur.',
  '{"campaign":"B"}'),
('li-C-01', 'linkedin_post', 'C', '2026-05-06', 'planned',
  'Le vrai coût d''un site web sur 3 ans (vs ce qu''on vous vend en année 1)',
  'Campagne C (ROI & Comparatifs). TCO comparatif WP / WP HL / Webflow. Tableau ASCII. CTA : article SEO #3.',
  '{"campaign":"C"}'),
('li-D-01', 'linkedin_post', 'D', '2026-05-20', 'planned',
  'Comment je choisis la stack d''un projet client (en 5 étapes)',
  'Campagne D (Coulisses & Méthode). Cible prescripteurs/agences. Format process. Inclure : parfois je recommande Webflow (honnêteté).',
  '{"campaign":"D"}'),
('li-E-01', 'linkedin_post', 'E', '2026-06-03', 'planned',
  '6,4s -> 0,9s : ce qu''on a vraiment changé chez Comme des Fous',
  'Campagne E (Preuve sociale). Avant/après chiffré. Architecture en 3 lignes. Témoignage client si autorisé. Lien étude de cas.',
  '{"campaign":"E"}'),
('li-F-01', 'linkedin_post', 'F', '2026-06-17', 'planned',
  '20 ans de WordPress, depuis le Cantal, en TIH : pourquoi je n''ai pas changé de méthode',
  'Campagne F (Positionnement perso). Récit personnel. Remote Cantal + TIH = singularité. Vision 2027. Pas plus d''1 emoji.',
  '{"campaign":"F"}')
ON CONFLICT ("slug") DO NOTHING;

-- ============================================================================
-- Vérification : ces requêtes doivent retourner 1 et 21
-- ============================================================================
-- SELECT count(*) FROM "Snapshot";       -- 1
-- SELECT count(*) FROM "ContentItem";    -- 21
