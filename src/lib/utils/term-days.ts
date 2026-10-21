/**
 * Pure helpers for academic-period day counts (terms and quarters). Kept free of
 * database access so the "days passed / days remaining" rules can be unit tested
 * directly and reused on both the server and the client.
 */

export type PeriodState = "UNSCHEDULED" | "UPCOMING" | "ONGOING" | "COMPLETED";

export type DayCounts = {
  /** Whole days between the start and end dates (0 when unscheduled). */
  totalDays: number;
  /** Whole days elapsed from the start date up to today (clamped to the range). */
  daysPassed: number;
  /** Whole days left from today up to the end date (clamped to the range). */
  daysRemaining: number;
  state: PeriodState;
};

const MS_PER_DAY = 86_400_000;
const EMPTY: DayCounts = { totalDays: 0, daysPassed: 0, daysRemaining: 0, state: "UNSCHEDULED" };

/** Normalises a Date or "YYYY-MM-DD" string to UTC midnight so diffs are whole days. */
function toUtcDay(value: Date | string): Date {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
}

function diffDays(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/**
 * Computes the day counts for a period. `daysPassed + daysRemaining === totalDays`
 * whenever both dates are set, so the two numbers always add up to the period
 * length. Dates are compared by whole calendar days (UTC).
 */
export function computeDayCounts(
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined,
  today: Date | string = new Date(),
): DayCounts {
  if (!startDate || !endDate) return { ...EMPTY };

  const start = toUtcDay(startDate);
  const end = toUtcDay(endDate);
  const now = toUtcDay(today);

  if (end < start) {
    return { totalDays: 0, daysPassed: 0, daysRemaining: 0, state: "COMPLETED" };
  }

  const totalDays = diffDays(start, end);

  if (now < start) {
    return { totalDays, daysPassed: 0, daysRemaining: totalDays, state: "UPCOMING" };
  }
  if (now > end) {
    return { totalDays, daysPassed: totalDays, daysRemaining: 0, state: "COMPLETED" };
  }

  const daysPassed = diffDays(start, now);
  return { totalDays, daysPassed, daysRemaining: totalDays - daysPassed, state: "ONGOING" };
}

/** Percentage of the period elapsed (0–100); 0 when unscheduled. */
export function progressPercent(counts: DayCounts): number {
  if (counts.totalDays <= 0) return counts.state === "ONGOING" ? 100 : 0;
  return Math.min(100, Math.max(0, Math.round((counts.daysPassed / counts.totalDays) * 100)));
}
