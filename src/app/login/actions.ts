"use server";

import { authenticateUser } from "@/lib/auth/service";
import { endSession, startSession } from "@/lib/auth/server";
import { loginSchema } from "@/lib/validation/schemas";
import { zodToFieldErrors, type ActionState } from "@/lib/validation/helpers";

export async function loginAction(input: unknown): Promise<ActionState> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: zodToFieldErrors(parsed.error) };
  }

  const user = await authenticateUser(parsed.data.email, parsed.data.password);
  if (!user) {
    return { ok: false, message: "Invalid email or password." };
  }

  await startSession(user);
  return { ok: true, message: `Welcome back, ${user.name}.` };
}

export async function logoutAction(): Promise<ActionState> {
  await endSession();
  return { ok: true, message: "You have been signed out." };
}
