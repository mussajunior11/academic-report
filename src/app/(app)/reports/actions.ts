"use server";

import { runAction } from "@/lib/actions/run-action";
import { saveReportRemarks } from "@/lib/services/reports";
import { zodToFieldErrors, type ActionState } from "@/lib/validation/helpers";
import { reportRemarksSchema } from "@/lib/validation/schemas";

export async function saveReportRemarksAction(input: unknown): Promise<ActionState> {
  const parsed = reportRemarksSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors: zodToFieldErrors(parsed.error),
    };
  }

  return runAction(() => saveReportRemarks(parsed.data), {
    revalidate: [
      `/reports/${parsed.data.examinationId}/${parsed.data.studentId}`,
      `/reports/${parsed.data.examinationId}`,
    ],
    successMessage: "Remarks saved.",
  });
}
