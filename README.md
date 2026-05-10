# Pilotage Next Impact — Application standalone

> Application Next.js indépendante du site `next-impact.digital` (lui-même Next.js).
> Tableau de bord temps réel des 3 canaux **LinkedIn · Newsletter Substack · SEO + GEO** pour piloter la stratégie commerciale Next Impact Digital — avr.→sept. 2026.

---

## Pourquoi standalone ?

- Le site public (`next-impact.digital`) reste léger, performant, public.
- L'app Pilotage est **privée**, contient des dépendances tierces (Google APIs, Prisma, Iron Session) qu'on ne veut pas embarquer dans le bundle public.
- Déploiement séparé (sous-domaine `pilotage.next-impact.digital` ou `app.next-impact.digital`).
- Permet de cycler la base de données indépendamment du site éditorial.

---

## Stack

| Couche       | Choix                                                |
|--------------|------------------------------------------------------|
| Framework    | Next.js 15 — App Router · React Server Components    |
| Langage      | TypeScript 5 strict                                  |
| Style        | Tailwind CSS 4 (palette alignée site `next-impact.digital`) |
| Charts       | Recharts 2                                           |
| ORM          | Prisma 6                                             |
| DB dev       | SQLite (fichier local)                               |
| DB prod      | Postgres (Neon free tier recommandé)                 |
| Auth         | Iron Session (cookie HttpOnly signé) — single user   |
| Cron         | Vercel Cron Jobs                                     |
| Email leads  | (optionnel) Resend                                   |
| Hébergement  | Vercel                                               |

---

## Arborescence

```
nextjs/
├── app/
│   ├── (admin)/
│   │   ├── login/page.tsx
│   │   └── pilotage/
│   │       ├── layout.tsx
│   │       ├── page.tsx                         ← Vue d'ensemble (3 canaux)
│   │       ├── linkedin/page.tsx
│   │       ├── newsletter/page.tsx
│   │       ├── seo-geo/page.tsx
│   │       └── snapshot/[period]/page.tsx       ← Saisie manuelle
│   ├── api/
│   │   ├── auth/[action]/route.ts
│   │   └── kpi/
│   │       ├── route.ts                         ← GET tous les snapshots
│   │       ├── snapshot/route.ts                ← POST upsert
│   │       ├── sync-gsc/route.ts                ← cron
│   │       ├── sync-ga4/route.ts                ← cron
│   │       └── geo-audit/route.ts               ← cron
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── pilotage/
│   │   ├── KpiCard.tsx
│   │   ├── ChannelGrid.tsx
│   │   ├── ProgressionChart.tsx
│   │   ├── ObjectiveProgress.tsx
│   │   ├── SnapshotForm.tsx
│   │   └── PeriodPicker.tsx
│   └── ui/
│       ├── Card.tsx
│       ├── Button.tsx
│       └── StatusPill.tsx
├── lib/
│   ├── auth.ts                                  ← Iron Session + helpers
│   ├── format.ts                                ← Formatage % / nombre / date
│   └── kpi/
│       ├── types.ts
│       ├── targets.ts
│       ├── store.ts                             ← Prisma queries
│       ├── aggregate.ts
│       ├── gsc-client.ts
│       ├── ga4-client.ts
│       └── geo-tester.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── middleware.ts
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── package.json
├── vercel.json
└── .env.example
```

---

## Installation

### Pré-requis
- Node 20+
- pnpm (ou npm/yarn)
- Un compte Neon (ou Vercel Postgres) pour la prod

### 1. Setup local
```bash
cd nextjs
cp .env.example .env.local
pnpm install
pnpm prisma migrate dev --name init
pnpm prisma db seed     # injecte la baseline avr. 2026 (150 LI, 60 NL, etc.)
pnpm dev
```
Accès : `http://localhost:3000/login` (mot de passe : `ADMIN_PASSWORD` du `.env.local`).

### 2. Variables d'environnement (`.env.local`)
```bash
# Base ----------------------------------------------------------------
DATABASE_URL="file:./pilotage.db"               # dev : SQLite
# DATABASE_URL="postgres://..."                 # prod : Neon/Vercel

# Auth ----------------------------------------------------------------
ADMIN_EMAIL="agathe.karinthi.martin@gmail.com"
ADMIN_PASSWORD="change-me"                      # à changer
SESSION_PASSWORD="32-chars-minimum-please"      # cookie signature

# Cron Vercel ---------------------------------------------------------
CRON_SECRET="generate-with-openssl-rand-hex-32"

# Google Search Console ----------------------------------------------
GSC_CLIENT_EMAIL="...@iam.gserviceaccount.com"
GSC_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GSC_SITE_URL="sc-domain:next-impact.digital"

# Google Analytics 4 -------------------------------------------------
GA4_PROPERTY_ID="123456789"

# GEO audit (optionnel) ----------------------------------------------
OPENAI_API_KEY=""
PERPLEXITY_API_KEY=""
```

### 3. Déploiement Vercel
```bash
vercel link
vercel env pull .env.production.local
vercel deploy --prod
```
Configurer le domaine custom `pilotage.next-impact.digital` dans Vercel → Settings → Domains.

---

## Sources de données — quel KPI vient d'où ?

| KPI                     | Source                  | Fréquence    | Comment                                    |
|-------------------------|-------------------------|--------------|--------------------------------------------|
| LinkedIn — abonnés/etc. | Saisie manuelle         | Hebdo/Mensuel| Page `/pilotage/snapshot/2026-04`          |
| Newsletter — subs/open  | Saisie manuelle         | Mensuel      | Idem                                       |
| SEO — clics/positions   | Google Search Console   | Quotidien    | Cron `/api/kpi/sync-gsc` 06:00 UTC         |
| Trafic — sessions       | Google Analytics 4      | Quotidien    | Cron `/api/kpi/sync-ga4` 06:15 UTC         |
| GEO — Share of Voice    | Audit prompts auto      | Hebdo        | Cron `/api/kpi/geo-audit` lundi 08:00 UTC  |

Le module GEO interroge ChatGPT et Perplexity sur les **10 prompts cibles** (cf. `lib/kpi/targets.ts → GEO_PROMPTS`) et compte les citations de "Next Impact" / "Karinthi" dans les réponses pour calculer le Share of Voice pondéré.

---

## Objectifs sept. 2026 (rappel stratégie)

| KPI                     | Avr. (baseline) | Sept. (cible) |
|-------------------------|-----------------|---------------|
| LinkedIn — abonnés      | 150             | **900**       |
| Newsletter — abonnés    | 60              | **210**       |
| Newsletter — open rate  | 38%             | **46%**       |
| SEO — clics/mois        | 50              | **450**       |
| SEO — pages pos. 1–10   | 2               | **20**        |
| GEO — Share of Voice    | 0%              | **30%**       |
| Leads formulaire/mois   | 1               | **6**         |

L'app calcule en continu :
- la **valeur courante** vs la **trajectoire attendue** à la date d'observation
- un statut `ahead` / `on-track` / `behind` (tolérance 15%)
- une **projection** vers sept. 2026 si on extrapole le trend actuel

---

## Sécurité

- `/pilotage/*` protégé par `middleware.ts` (cookie session signé)
- Routes `/api/kpi/sync-*` exigent header `Authorization: Bearer ${CRON_SECRET}`
- Aucun secret n'est exposé au bundle client (lecture serveur uniquement)
- Cookie `pilotage_session` : `HttpOnly`, `Secure`, `SameSite=Lax`, durée 7 jours

---

## Roadmap après MVP

- [ ] Webhook GitHub → snapshot automatique à chaque article publié sur `next-impact.digital`
- [ ] Module "Campagnes LinkedIn" : tag par campagne A–F sur chaque post (compteur par campagne)
- [ ] Alerting Slack/email si KPI dérive >15% vs trajectoire cible
- [ ] Export PDF mensuel (rapport CODIR)
- [ ] Cohort tracking : abonnés issus de NL #1 vs NL #2
