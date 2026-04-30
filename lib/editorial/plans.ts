/**
 * Plans statiques — campagnes LinkedIn, structure newsletter, clusters SEO.
 * Sources : panneaux "Contenu" et "3 canaux" du dashboard stratégique.
 *
 * Ces tables servent de référentiel :
 *  - le seed Prisma s'en sert pour créer les ContentItem initiaux
 *  - les prompts Claude s'en servent comme contexte
 *  - le plan-adjuster les utilise pour proposer des changements cohérents
 */

export interface LinkedInCampaign {
  code: "A" | "B" | "C" | "D" | "E" | "F";
  name: string;
  audience: string;
  topics: string;
  goal: "expertise" | "conversion" | "conviction" | "fidelite" | "preuve" | "marque";
}

export const LINKEDIN_CAMPAIGNS: readonly LinkedInCampaign[] = [
  {
    code: "A",
    name: "Crédibilité technique",
    audience: "DSI · CTO · Resp. digital",
    topics: "Core Web Vitals · REST vs GraphQL · Astro vs Next.js · Sécurité",
    goal: "expertise",
  },
  {
    code: "B",
    name: "Avantage fiscal OETH",
    audience: "DAF · DRH · Acheteurs PME",
    topics: "Simulateur OETH · Attestation TIH · Barème 2025–2026 · Guide acheteur",
    goal: "conversion",
  },
  {
    code: "C",
    name: "ROI & Comparatifs",
    audience: "DSI · DAF · DG",
    topics: "Coût total possession · Simulateur ROI · Hébergement 3 ans · Budget CODIR",
    goal: "conviction",
  },
  {
    code: "D",
    name: "Coulisses & Méthode",
    audience: "Prescripteurs · Agences",
    topics: "Choisir la stack · Process 5 étapes · Templates · Usage IA",
    goal: "fidelite",
  },
  {
    code: "E",
    name: "Preuve sociale chiffrée",
    audience: "Tous décideurs — phase décision",
    topics: "Études de cas avant/après · Verbatims · Métriques J+90",
    goal: "preuve",
  },
  {
    code: "F",
    name: "Positionnement perso",
    audience: "Réseau général · Nouveaux abonnés",
    topics: "Parcours 20 ans WP · Remote Cantal · Statut TIH · Vision 2027",
    goal: "marque",
  },
] as const;

/** Structure invariante d'une édition newsletter (6 blocs). */
export const NEWSLETTER_STRUCTURE = [
  {
    code: "00",
    name: "Objet email",
    description: "Question décideur ou affirmation choc · 60 car. max · CTR cible >30%",
  },
  {
    code: "01",
    name: "L'Arbitrage du mois",
    description: "1 question décision + options + règle · 450–550 mots",
  },
  {
    code: "02",
    name: "Le Tableau de bord techno",
    description: "3–5 critères comparés entre 2–3 options · toujours sourcé",
  },
  {
    code: "03",
    name: "Le Chiffre qui tranche",
    description: "1 donnée chiffrée sourcée · 70–90 mots",
  },
  {
    code: "04",
    name: "La Ressource du mois",
    description: "1 outil ou article · 1 seul lien · CTR cible >12%",
  },
  {
    code: "05",
    name: "Q&R Décideur (dès #3)",
    description: "1 vraie question reçue · Réponse directe 5–7 lignes",
  },
] as const;

/** Piliers thématiques de la newsletter. */
export const NEWSLETTER_PILLARS = {
  W: { name: "WordPress", focus: "Bilan / état de l'art" },
  A: { name: "Alternatives", focus: "Comparatifs honnêtes Webflow / Wix / Astro" },
  H: { name: "Headless", focus: "Pédagogie sans jargon" },
  R: { name: "ROI / Méthode", focus: "Chiffrer / décider" },
  C: { name: "Cas clients", focus: "Études chiffrées avant/après" },
} as const;

export type NewsletterPillarCode = keyof typeof NEWSLETTER_PILLARS;

/** 3 clusters sémantiques SEO. */
export interface SeoCluster {
  code: "A-WP" | "B-TIH" | "C-ROI";
  label: string;
  mainKeyword: string;
  intent: string;
  competition: "Quasi-nulle" | "Faible" | "Moyenne";
  priority: "P1" | "P2" | "P3";
}

export const SEO_CLUSTERS: readonly SeoCluster[] = [
  {
    code: "A-WP",
    label: "WordPress Headless",
    mainKeyword: "freelance wordpress headless france",
    intent: "Achat / Comparaison / Décision",
    competition: "Faible",
    priority: "P1",
  },
  {
    code: "B-TIH",
    label: "TIH / OETH",
    mainKeyword: "prestataire TIH développement web",
    intent: "Fiscal / Informationnelle",
    competition: "Quasi-nulle",
    priority: "P1",
  },
  {
    code: "C-ROI",
    label: "ROI / Performance",
    mainKeyword: "ROI refonte site web",
    intent: "Décision / Outil",
    competition: "Faible",
    priority: "P1",
  },
] as const;

/** Promesse de marque — utilisée par tous les prompts Claude. */
export const BRAND_PROMISE = `Moderniser les sites WordPress sans toucher à l'administration que les équipes maîtrisent déjà — avec un avantage fiscal unique : 30% du coût de main-d'œuvre déductible de la contribution AGEFIPH (statut TIH).`;

/** Différenciateurs clés — repris dans tous les contenus. */
export const DIFFERENTIATORS = [
  "Statut TIH : 30% du coût main-d'œuvre déductible AGEFIPH (jusqu'à 1 500 € sur 5 000 €)",
  "Back-office WordPress préservé : équipes éditoriales gardent leur outil",
  "Performance mesurable : Lighthouse > 95, chargement < 1s (Comme des Fous : 6,4s → 0,9s)",
  "Honnêteté éditoriale : recommande Webflow / Astro / WP classique quand c'est mieux",
] as const;

/** Studies de cas réels — réutilisables comme preuves. */
export const CASE_STUDIES = [
  {
    name: "Comme des Fous (média)",
    stack: "WP Headless + Next.js",
    results: "6,4s → 0,9s · Lighthouse 96 · Trafic +38% en 3 mois",
    lesson: "Intégrer l'ISR dès le départ",
  },
  {
    name: "Café Citoyen (asso)",
    stack: "WP optimisé",
    results: "Livré en 3 sem · 0 appel support 6 mois · Équipe 100% autonome",
    lesson: "Le headless aurait été surdimensionné",
  },
  {
    name: "Comme des Fous Jeux",
    stack: "WP + Next.js + CDN global",
    results: "0 incident · 4 lancements · <100ms en pic",
    lesson: "Vercel Edge = résilience critique",
  },
  {
    name: "États Généraux Communaux",
    stack: "WP Headless + Astro",
    results: "Surface d'attaque quasi-zéro · Audit sécurité A+",
    lesson: "Astro bat Next.js sur les sites statiques",
  },
] as const;

/** Helpers d'accès. */
export function getLinkedInCampaign(code: string): LinkedInCampaign | undefined {
  return LINKEDIN_CAMPAIGNS.find((c) => c.code === code);
}

export function getSeoCluster(code: string): SeoCluster | undefined {
  return SEO_CLUSTERS.find((c) => c.code === code);
}
