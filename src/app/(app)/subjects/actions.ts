"use server";

import { z } from "zod";
import { runAction } from "@/lib/actions/run-action";
import {
  createSubject,
  deleteSubject,
  setSubjectClasses,
  setSubjectStatus,
  updateSubject,
} from "@/lib/services/academic";
import { subjectClassesSchema, subjectSchema } from "@/lib/validation/schemas";
import { zodToFieldErrors, type ActionState } from "@/lib/validation/helpers";

const statusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

function invalid(error: z.ZodError): ActionState {
  return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: zodToFieldErrors(error) };
}

export async function createSubjectAction(input: unknown): Promise<ActionState> {
  const parsed = subjectSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return runAction(() => createSubject(parsed.data).then(() => undefined), {
    revalidate: ["/subjects", "/"],
    successMessage: "Subject created.",
  });
}

export async function updateSubjectAction(input: unknown): Promise<ActionState> {
  const schema = subjectSchema.extend({ id: z.string().min(1) });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...data } = parsed.data;
  return runAction(() => updateSubject(id, data).then(() => undefined), {
    revalidate: ["/subjects", "/", "/students"],
    successMessage: "Subject updated.",
  });
}

export async function toggleSubjectStatusAction(input: unknown): Promise<ActionState> {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return runAction(() => setSubjectStatus(parsed.data.id, parsed.data.status).then(() => undefined), {
    revalidate: ["/subjects", "/", "/students"],
    successMessage: "Subject status updated.",
  });
}

export async function deleteSubjectAction(input: unknown): Promise<ActionState> {
  const parsed = z.object({ id: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return runAction(() => deleteSubject(parsed.data.id).then(() => undefined), {
    revalidate: ["/subjects", "/", "/students"],
    successMessage: "Subject deleted.",
  });
}

export async function setSubjectClassesAction(input: unknown): Promise<ActionState> {
  const parsed = subjectClassesSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return runAction(
    () => setSubjectClasses(parsed.data.subjectId, parsed.data.assignments),
    {
      revalidate: ["/subjects", "/", "/students", "/marks-entry"],
      successMessage: (result) => {
        if (result.added === 0 && result.removed === 0) {
          return "Compulsory classes updated.";
        }
        const parts: string[] = [];
        if (result.added > 0) parts.push(`${result.added} registration${result.added === 1 ? "" : "s"} added`);
        if (result.removed > 0) parts.push(`${result.removed} removed`);
        return `Compulsory classes updated — ${parts.join(", ")}.`;
      },
    },
  );
}
