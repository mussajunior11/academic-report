import { z } from "zod";

export type FieldErrors = Record<string, string>;

/**
 * Result shape returned by server actions so forms can render inline errors
 * and a top-level status message without throwing raw database errors.
 */
export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: FieldErrors;
} | null;

export function zodToFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** ISO date string (YYYY-MM-DD) accepted from <input type="date">. */
export const optionalDateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : undefined));

export const optionalTrimmed = z
  .string()
  .trim()
  .transform((v) => (v.length > 0 ? v : undefined))
  .optional();
