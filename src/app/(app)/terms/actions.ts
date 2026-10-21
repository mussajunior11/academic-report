"use server";

import { runAction } from "@/lib/actions/run-action";
import { saveQuarterDates, saveTermDates } from "@/lib/services/terms";
import { zodToFieldErrors, type ActionState } from "@/lib/validation/helpers";
import { quarterScheduleSchema, termScheduleSchema } from "@/lib/validation/schemas";

function invalid(error: Parameters<typeof zodToFieldErrors>[0]): ActionState {
  return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: zodToFieldErrors(error) };
}

export async function saveTermDatesAction(input: unknown): Promise<ActionState> {
  const parsed = termScheduleSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return runAction(() => saveTermDates(parsed.data).then(() => undefined), {
    revalidate: ["/terms", "/terms/quarters", "/"],
    successMessage: "Term dates saved.",
  });
}

export async function saveQuarterDatesAction(input: unknown): Promise<ActionState> {
  const parsed = quarterScheduleSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return runAction(() => saveQuarterDates(parsed.data).then(() => undefined), {
    revalidate: ["/terms", "/terms/quarters", "/"],
    successMessage: "Quarter dates saved.",
  });
}
