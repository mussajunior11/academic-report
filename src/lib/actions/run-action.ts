import "server-only";

import { revalidatePath } from "next/cache";
import { toFriendlyError } from "@/lib/errors";
import type { ActionState } from "@/lib/validation/helpers";

/**
 * Wraps a mutation so server actions always return a friendly, structured
 * result and never leak database errors or stack traces to the client.
 */
export async function runAction<T = void>(
  operation: () => Promise<T>,
  options: { revalidate?: string[]; successMessage: string | ((result: T) => string) },
): Promise<ActionState> {
  try {
    const result = await operation();
    for (const path of options.revalidate ?? []) {
      revalidatePath(path);
    }
    const message =
      typeof options.successMessage === "function" ? options.successMessage(result) : options.successMessage;
    return { ok: true, message };
  } catch (error) {
    const friendly = toFriendlyError(error);
    return { ok: false, message: friendly.message, fieldErrors: friendly.fieldErrors };
  }
}
