"use server";

import { z } from "zod";
import { runAction } from "@/lib/actions/run-action";
import {
  createClassLevel,
  createClassStream,
  createStream,
  deleteClassStream,
  setClassLevelStatus,
  setClassStreamStatus,
  setStreamStatus,
  updateClassLevel,
  updateStream,
} from "@/lib/services/academic";
import {
  classLevelSchema,
  classStreamSchema,
  streamSchema,
} from "@/lib/validation/schemas";
import { zodToFieldErrors, type ActionState } from "@/lib/validation/helpers";

const statusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

function invalid(error: z.ZodError): ActionState {
  return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: zodToFieldErrors(error) };
}

export async function createClassLevelAction(input: unknown): Promise<ActionState> {
  const parsed = classLevelSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return runAction(() => createClassLevel(parsed.data).then(() => undefined), {
    revalidate: ["/classes", "/students", "/"],
    successMessage: "Class created.",
  });
}

export async function updateClassLevelAction(input: unknown): Promise<ActionState> {
  const schema = classLevelSchema.extend({ id: z.string().min(1) });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...data } = parsed.data;
  return runAction(() => updateClassLevel(id, data).then(() => undefined), {
    revalidate: ["/classes", "/"],
    successMessage: "Class updated.",
  });
}

export async function toggleClassLevelStatusAction(input: unknown): Promise<ActionState> {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return runAction(() => setClassLevelStatus(parsed.data.id, parsed.data.status).then(() => undefined), {
    revalidate: ["/classes", "/"],
    successMessage: "Class status updated.",
  });
}

export async function createStreamAction(input: unknown): Promise<ActionState> {
  const parsed = streamSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return runAction(() => createStream(parsed.data).then(() => undefined), {
    revalidate: ["/classes", "/students", "/"],
    successMessage: "Stream created.",
  });
}

export async function updateStreamAction(input: unknown): Promise<ActionState> {
  const schema = streamSchema.extend({ id: z.string().min(1) });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...data } = parsed.data;
  return runAction(() => updateStream(id, data).then(() => undefined), {
    revalidate: ["/classes", "/"],
    successMessage: "Stream updated.",
  });
}

export async function toggleStreamStatusAction(input: unknown): Promise<ActionState> {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return runAction(() => setStreamStatus(parsed.data.id, parsed.data.status).then(() => undefined), {
    revalidate: ["/classes", "/"],
    successMessage: "Stream status updated.",
  });
}

export async function createClassStreamAction(input: unknown): Promise<ActionState> {
  const parsed = classStreamSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return runAction(() => createClassStream(parsed.data).then(() => undefined), {
    revalidate: ["/classes", "/students", "/"],
    successMessage: "Class-stream combination added.",
  });
}

export async function toggleClassStreamStatusAction(input: unknown): Promise<ActionState> {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return runAction(() => setClassStreamStatus(parsed.data.id, parsed.data.status).then(() => undefined), {
    revalidate: ["/classes", "/"],
    successMessage: "Class-stream status updated.",
  });
}

export async function deleteClassStreamAction(input: unknown): Promise<ActionState> {
  const parsed = z.object({ id: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return runAction(() => deleteClassStream(parsed.data.id).then(() => undefined), {
    revalidate: ["/classes", "/students", "/"],
    successMessage: "Class-stream combination deleted.",
  });
}
