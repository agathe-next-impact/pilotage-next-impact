/**
 * Seed Prisma — baseline avr. 2026 + plan éditorial complet (21 ContentItem).
 * Source : panneau "KPI 6 mois" et "Contenu" du dashboard stratégique.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedSnapshot(): Promise<void> {
  await prisma.snapshot.upsert({
    where: { period: "2026-04" },
    update: {},
    create: {
      period: "2026-04",
      source: "manual",
      linkedinFollowers: 150,
      linkedinImpressions: 5000,
      linkedinEngagementRate: 0.03,
      linkedinDmsQualified: 1,
      linkedinFormLeads: 1,
      linkedinPostsPublished: 12,
      nlSubscribers: 60,
      nlOpenRate: 0.38,
      nlCtrResource: 0.10,
      nlUnsubscribeRate: 0.02,
      nlLeadsMentioning: 0,
      nlEditionNumber: 1,
      seoClicks: 50,
      seoImpressions: 2400,
      seoPagesIndexed: 15,
      seoPagesTop10: 2,
      seoAvgPosition: 24.5,
      geoShareOfVoice: 0,
      geoCitationsCount: 0,
      geoReferralTraffic: 0,
      ga4Sessions: 850,
      ga4Users: 720,
      ga4Conversions: 1,
    },
  });
}

interface SeedItem {
  slug: string;
  type: "linkedin_post" | "newsletter_edition" | "seo_article";
  trackKey: string;
  plannedFor: string;
  subject: string;
  brief: string;
  meta?: Record<string, unknown>;
}

const items: SeedItem[] = [
  // Newsletter (6 éditions)
  { slug: "nl-1", type: "newsletter_edition", trackKey: "edition", plannedFor: "2026-04-14",
    subject: "Mon site WordPress est-il encore la bonne solution en 2026 ?",
    brief: "Pilier W. Question décideur frontale. Argumenter qu'on peut moderniser sans tout jeter. CTA : audit gratuit. Sync SEO : /articles/wordpress-headless-vs-classique-2026.",
    meta: { pillier: "W", syncSEO: "/articles/wordpress-headless-vs-classique-2026" } },
  { slug: "nl-2", type: "newsletter_edition", trackKey: "edition", plannedFor: "2026-05-13",
    subject: "Webflow, WordPress Headless, Wix Pro : ce que personne ne vous dit vraiment",
    brief: "Pilier A. Comparatif honnête entre 3 solutions, critères chiffrés. Sync SEO : /articles/cout-migration-wordpress-headless. Activer livre blanc gaté.",
    meta: { pillier: "A", syncSEO: "/articles/cout-migration-wordpress-headless" } },
  { slug: "nl-3", type: "newsletter_edition", trackKey: "edition", plannedFor: "2026-06-10",
    subject: "Headless : le mot que tout le monde utilise, que personne n'explique vraiment",
    brief: "Pilier H. Définition pédagogique pour décideurs. Démystifier sans jargon. Première Q&R lecteurs. Sync : /documentation/headless-cms.",
    meta: { pillier: "H", syncSEO: "/documentation/headless-cms" } },
  { slug: "nl-4", type: "newsletter_edition", trackKey: "edition", plannedFor: "2026-07-08",
    subject: "Comment chiffrer votre choix techno avant de signer un devis",
    brief: "Pilier R. Méthode + simulateur. CTA : essayez le simulateur. Cible DAF/RH avec angle OETH. Sync : /articles/roi-refonte-site-web-calcul.",
    meta: { pillier: "R", syncSEO: "/articles/roi-refonte-site-web-calcul" } },
  { slug: "nl-5", type: "newsletter_edition", trackKey: "edition", plannedFor: "2026-08-11",
    subject: "4 projets réels, 4 technologies, 4 décisions",
    brief: "Pilier C. 4 mini études de cas, dont 1 où le headless n'était PAS la bonne réponse (Café Citoyen). Honnêteté éditoriale. Sync : /etudes-de-cas.",
    meta: { pillier: "C", syncSEO: "/etudes-de-cas" } },
  { slug: "nl-6", type: "newsletter_edition", trackKey: "edition", plannedFor: "2026-09-08",
    subject: "Rentrée web : comment prendre LA décision avant le 31 décembre",
    brief: "Pilier R. Check-list décision Q4 + CTA projets Q4. Bilan rapide des 6 mois de NL. Sync : /services + /contact.",
    meta: { pillier: "R", syncSEO: "/services" } },
  // SEO (9 articles)
  { slug: "seo-1", type: "seo_article", trackKey: "B-TIH", plannedFor: "2026-04-15",
    subject: "Prestataire TIH développement web : réduire sa contribution AGEFIPH",
    brief: "Cluster B-TIH P1. Concurrence quasi-nulle. Cible DAF/DRH. KW : 'prestataire TIH développement web'. Inclure simulateur OETH, attestation, témoignages.",
    meta: { cluster: "B-TIH", priorite: "P1" } },
  { slug: "seo-2", type: "seo_article", trackKey: "A-WP", plannedFor: "2026-04-22",
    subject: "WordPress Headless vs classique : comparatif complet 2026",
    brief: "Cluster A-WP P1. Comparatif technique + financier sur 3 ans. KW : 'wordpress headless vs classique'. Tableau perf, schema FAQ, lien vers /etudes-de-cas.",
    meta: { cluster: "A-WP", priorite: "P1" } },
  { slug: "seo-3", type: "seo_article", trackKey: "A-WP", plannedFor: "2026-05-12",
    subject: "Coût d'une migration WordPress Headless : grille tarifaire et ROI calculé",
    brief: "Cluster A-WP P1. Grille de prix transparente : 2 250 / 4 000 / 5 000 €. Cas Comme des Fous (6,4s -> 0,9s). Simulateur intégré.",
    meta: { cluster: "A-WP", priorite: "P1" } },
  { slug: "seo-4", type: "seo_article", trackKey: "B-TIH", plannedFor: "2026-05-26",
    subject: "Réduire sa contribution AGEFIPH avec la sous-traitance TIH : guide 2026",
    brief: "Cluster B-TIH P1. Guide pratique pour DAF : barème 2025-2026, calcul de la déduction (jusqu'à 1 500 € sur 5 000 €), checklist administrative.",
    meta: { cluster: "B-TIH", priorite: "P1" } },
  { slug: "seo-5", type: "seo_article", trackKey: "B-TIH", plannedFor: "2026-06-09",
    subject: "Attestation de déductibilité TIH : guide complet pour les entreprises",
    brief: "Cluster B-TIH P1. Mode d'emploi de l'attestation, modèle téléchargeable. Schema HowTo. CTA : demande d'attestation.",
    meta: { cluster: "B-TIH", priorite: "P1" } },
  { slug: "seo-6", type: "seo_article", trackKey: "A-WP", plannedFor: "2026-06-23",
    subject: "WordPress Headless Next.js vs Astro : comment choisir en 2026",
    brief: "Cluster A-WP P2. Décision technique. Cas EGC (Astro) vs CDF (Next.js). Tableau de critères. Conclusion ouverte.",
    meta: { cluster: "A-WP", priorite: "P2" } },
  { slug: "seo-7", type: "seo_article", trackKey: "C-ROI", plannedFor: "2026-07-14",
    subject: "Calculer le ROI d'une refonte web WordPress : méthode et simulateur",
    brief: "Cluster C-ROI P2. Méthode + simulateur intégré. KW : 'roi refonte site web'. Cas chiffré : trafic +38%.",
    meta: { cluster: "C-ROI", priorite: "P2" } },
  { slug: "seo-8", type: "seo_article", trackKey: "A-WP", plannedFor: "2026-08-18",
    subject: "Sécurité WordPress Headless : pourquoi l'architecture découplée est plus sûre",
    brief: "Cluster A-WP P2. Cas EGC (audit A+). Surface d'attaque réduite. Mention OETH/TIH en pied. Schema FAQ.",
    meta: { cluster: "A-WP", priorite: "P2" } },
  { slug: "seo-9", type: "seo_article", trackKey: "A-WP", plannedFor: "2026-09-15",
    subject: "Freelance WordPress Headless en France : pourquoi choisir un prestataire TIH ?",
    brief: "Cluster A-WP P1. Article positionnement personnel. Statut TIH comme avantage compétitif. CTA : projet Q4.",
    meta: { cluster: "A-WP", priorite: "P1" } },
  // LinkedIn (6 posts pivots — un par campagne)
  { slug: "li-A-01", type: "linkedin_post", trackKey: "A", plannedFor: "2026-04-15",
    subject: "Core Web Vitals : pourquoi votre site WP plafonne à 60/100",
    brief: "Campagne A (Crédibilité technique). Cible DSI/CTO. Hook chiffré. 5 raisons + 1 solution headless. 1200-1400 car., 0-1 emoji, CTA -> article SEO #2.",
    meta: { campaign: "A" } },
  { slug: "li-B-01", type: "linkedin_post", trackKey: "B", plannedFor: "2026-04-22",
    subject: "OETH : ce que votre DAF n'a pas calculé sur sa contribution AGEFIPH",
    brief: "Campagne B (Avantage fiscal OETH). Cible DAF/DRH. Calcul concret : déduction TIH 30%. CTA simulateur. Pas de pathos, levier fiscal pur.",
    meta: { campaign: "B" } },
  { slug: "li-C-01", type: "linkedin_post", trackKey: "C", plannedFor: "2026-05-06",
    subject: "Le vrai coût d'un site web sur 3 ans (vs ce qu'on vous vend en année 1)",
    brief: "Campagne C (ROI & Comparatifs). TCO comparatif WP / WP HL / Webflow. Tableau ASCII. CTA : article SEO #3.",
    meta: { campaign: "C" } },
  { slug: "li-D-01", type: "linkedin_post", trackKey: "D", plannedFor: "2026-05-20",
    subject: "Comment je choisis la stack d'un projet client (en 5 étapes)",
    brief: "Campagne D (Coulisses & Méthode). Cible prescripteurs/agences. Format process. Inclure : 'parfois je recommande Webflow' (honnêteté).",
    meta: { campaign: "D" } },
  { slug: "li-E-01", type: "linkedin_post", trackKey: "E", plannedFor: "2026-06-03",
    subject: "6,4s -> 0,9s : ce qu'on a vraiment changé chez Comme des Fous",
    brief: "Campagne E (Preuve sociale). Avant/après chiffré. Architecture en 3 lignes. Témoignage client si autorisé. Lien étude de cas.",
    meta: { campaign: "E" } },
  { slug: "li-F-01", type: "linkedin_post", trackKey: "F", plannedFor: "2026-06-17",
    subject: "20 ans de WordPress, depuis le Cantal, en TIH : pourquoi je n'ai pas changé de méthode",
    brief: "Campagne F (Positionnement perso). Récit personnel. Remote Cantal + TIH = singularité. Vision 2027. Pas plus d'1 emoji.",
    meta: { campaign: "F" } },
];

async function seedContent(): Promise<void> {
  for (const item of items) {
    await prisma.contentItem.upsert({
      where: { slug: item.slug },
      update: {},
      create: {
        slug: item.slug,
        type: item.type,
        trackKey: item.trackKey,
        plannedFor: new Date(item.plannedFor),
        subject: item.subject,
        brief: item.brief,
        status: "planned",
        meta: item.meta ? JSON.stringify(item.meta) : null,
      },
    });
  }
}

async function main(): Promise<void> {
  await seedSnapshot();
  await seedContent();
  console.log(`OK Snapshot 2026-04 + ${items.length} ContentItem injectes.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
