"use server";

import { runAction } from "@/lib/actions/run-action";
import { saveGradingConfig } from "@/lib/services/grading";
import { zodToFieldErrors, type ActionState } from "@/lib/validation/helpers";
import { gradingConfigSchema } from "@/lib/validation/schemas";

export async function saveGradingConfigAction(input: unknown): Promise<ActionState> {
  const parsed = gradingConfigSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: zodToFieldErrors(parsed.error) };
  }
  return runAction(() => saveGradingConfig(parsed.data).then(() => undefined), {
    revalidate: ["/grading", "/"],
    successMessage: "Grading settings saved.",
  });
}