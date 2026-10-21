export class AppError extends Error {
  fieldErrors?: Record<string, string>;

  constructor(message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "AppError";
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Maps Prisma known request errors to friendly, non-technical messages so raw
 * database details are never surfaced to ordinary users.
 */
export function toFriendlyError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  const code =
    typeof error === "object" && error !== null && "code" in error
      ? (error as { code?: string }).code
      : undefined;

  if (code === "P2002") {
    return new AppError("A record with these details already exists.");
  }
  if (code === "P2003") {
    return new AppError("A related record is missing or invalid.");
  }
  if (code === "P2025") {
    return new AppError("The record could not be found.");
  }

  return new AppError("Something went wrong while saving. Please try again.");
}
