/**
 * Pure helpers for internal student numbers of the form `${schoolCode}/${year}/0001`.
 * Kept free of database access so the numbering rule can be unit tested directly.
 */

export function studentNumberPrefix(schoolCode: string, year: number) {
  return `${schoolCode}/${year}/`;
}

export function formatStudentNumber(schoolCode: string, year: number, sequence: number) {
  const safe = Number.isFinite(sequence) && sequence > 0 ? Math.floor(sequence) : 1;
  return `${studentNumberPrefix(schoolCode, year)}${String(safe).padStart(4, "0")}`;
}

/** Extracts the numeric sequence from an existing student number, if it matches the prefix. */
export function parseSequence(studentNumber: string, prefix: string): number | undefined {
  if (!studentNumber.startsWith(prefix)) return undefined;
  const parsed = Number(studentNumber.slice(prefix.length));
  return Number.isFinite(parsed) ? parsed : undefined;
}
