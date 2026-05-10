"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { generateMonthlyAnalysis } from "@/lib/analysis";

const PeriodSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, "Format YYYY-MM"),
});

interface State {
  ok: boolean;
  message?: string;
}

export async function generateAnalysisAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  await requireSession();
  try {
    const { period } = PeriodSchema.parse({ period: formData.get("period") });
    await generateMonthlyAnalysis(period);
    revalidatePath("/pilotage/analyses");
    return { ok: true, message: `Synthèse ${period} générée.` };
  } catch (err) {
    console.error("[generateAnalysisAction]", err);
    return { ok: false, message: (err as Error).message };
  }
}
