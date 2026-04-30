"use server";

/**
 * Server Actions pour le formulaire de saisie d'un snapshot mensuel.
 * Appelées depuis SnapshotForm.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { upsertSnapshot } from "@/lib/kpi/store";
import type { Period } from "@/lib/kpi/types";

const PeriodSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

function num(v: FormDataEntryValue | null): number | undefined {
  if (v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function int(v: FormDataEntryValue | null): number | undefined {
  const n = num(v);
  return n === undefined ? undefined : Math.round(n);
}

export async function saveSnapshotAction(formData: FormData): Promise<void> {
  await requireSession();

  const periodRaw = String(formData.get("period") ?? "");
  const period = PeriodSchema.parse(periodRaw) as Period;

  await upsertSnapshot({
    period,
    source: "manual",
    linkedin: {
      followers: int(formData.get("linkedinFollowers")),
      impressions: int(formData.get("linkedinImpressions")),
      engagementRate: num(formData.get("linkedinEngagementRate")),
      dmsQualified: int(formData.get("linkedinDmsQualified")),
      formLeads: int(formData.get("linkedinFormLeads")),
      postsPublished: int(formData.get("linkedinPostsPublished")),
    },
    newsletter: {
      subscribers: int(formData.get("nlSubscribers")),
      openRate: num(formData.get("nlOpenRate")),
      ctrResource: num(formData.get("nlCtrResource")),
      unsubscribeRate: num(formData.get("nlUnsubscribeRate")),
      leadsMentioning: int(formData.get("nlLeadsMentioning")),
      editionNumber: int(formData.get("nlEditionNumber")),
    },
    seo: {
      clicks: int(formData.get("seoClicks")),
      impressions: int(formData.get("seoImpressions")),
      pagesIndexed: int(formData.get("seoPagesIndexed")),
      pagesTop10: int(formData.get("seoPagesTop10")),
      avgPosition: num(formData.get("seoAvgPosition")),
    },
    geo: {
      shareOfVoice: num(formData.get("geoShareOfVoice")),
      citationsCount: int(formData.get("geoCitationsCount")),
      referralTraffic: int(formData.get("geoReferralTraffic")),
    },
    ga4: {
      sessions: int(formData.get("ga4Sessions")),
      users: int(formData.get("ga4Users")),
      conversions: int(formData.get("ga4Conversions")),
    },
  });

  revalidatePath("/pilotage", "layout");
  redirect("/pilotage");
}
