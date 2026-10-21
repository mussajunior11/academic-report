"use server";

import { z } from "zod";
import { runAction } from "@/lib/actions/run-action";
import {
  createExamination,
  deleteExamination,
  setExaminationStatus,
  updateExamination,
} from "@/lib/services/examinations";
import { examinationSchema } from "@/lib/validation/schemas";
import { zodToFieldErrors, type ActionState } from "@/lib/validation/helpers";

const statusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["DRAFT", "OPEN", "CLOSED"]),
});

function invalid(error: z.ZodError): ActionState {
  return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: zodToFieldErrors(error) };
}

export async function createExaminationAction(input: unknown): Promise<ActionState> {
  const parsed = examinationSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return runAction(() => createExamination(parsed.data).then(() => undefined), {
    revalidate: ["/examinations", "/"],
    successMessage: "Examination created.",
  });
}

export async function updateExaminationAction(input: unknown): Promise<ActionState> {
  const idResult = z.object({ id: z.string().min(1) }).safeParse(input);
  if (!idResult.success) return invalid(idResult.error);
  const parsed = examinationSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const id = idResult.data.id;
  return runAction(() => updateExamination(id, parsed.data).then(() => undefined), {
    revalidate: ["/examinations", `/examinations/${id}/edit`, "/"],
    successMessage: "Examination updated.",
  });
}

export async function setExaminationStatusAction(input: unknown): Promise<ActionState> {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return runAction(() => setExaminationStatus(parsed.data.id, parsed.data.status).then(() => undefined), {
    revalidate: ["/examinations", "/"],
    successMessage: "Examination status updated.",
  });
}

export async function deleteExaminationAction(input: unknown): Promise<ActionState> {
  const parsed = z.object({ id: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { id } = parsed.data;
  return runAction(() => deleteExamination(id).then(() => undefined), {
    revalidate: ["/examinations", `/examinations/${id}/edit`, "/"],
    successMessage: "Examination deleted.",
  });
}
