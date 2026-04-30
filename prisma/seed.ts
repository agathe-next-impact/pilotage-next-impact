/**
 * Seed Prisma — baseline snapshot uniquement.
 * Les ContentItem se créent à la demande via la page Planning.
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
      linkedinPostsPublished: 0,
      nlSubscribers: 60,
      nlOpenRate: 0.38,
      nlCtrResource: 0.10,
      nlUnsubscribeRate: 0.02,
      nlLeadsMentioning: 0,
      nlEditionNumber: 0,
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

async function main(): Promise<void> {
  await seedSnapshot();
  console.log("OK Snapshot 2026-04 baseline injecté. Aucun ContentItem pré-établi.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
