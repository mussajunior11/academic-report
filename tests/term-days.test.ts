import { describe, expect, it } from "vitest";
import { computeDayCounts, progressPercent } from "@/lib/utils/term-days";

describe("computeDayCounts", () => {
  it("reports an unscheduled period with zero counts", () => {
    expect(computeDayCounts(null, null, "2026-01-15")).toEqual({
      totalDays: 0,
      daysPassed: 0,
      daysRemaining: 0,
      state: "UNSCHEDULED",
    });
    expect(computeDayCounts("2026-01-01", null, "2026-01-15").state).toBe("UNSCHEDULED");
  });

  it("is upcoming when today is before the start date", () => {
    const counts = computeDayCounts("2026-01-01", "2026-01-31", "2025-12-20");
    expect(counts).toEqual({ totalDays: 30, daysPassed: 0, daysRemaining: 30, state: "UPCOMING" });
  });

  it("counts elapsed and remaining days while ongoing", () => {
    const counts = computeDayCounts("2026-01-01", "2026-01-31", "2026-01-15");
    expect(counts.state).toBe("ONGOING");
    expect(counts.totalDays).toBe(30);
    expect(counts.daysPassed).toBe(14);
    expect(counts.daysRemaining).toBe(16);
    expect(counts.daysPassed + counts.daysRemaining).toBe(counts.totalDays);
  });

  it("clamps to the full total once the period is over", () => {
    expect(computeDayCounts("2026-01-01", "2026-01-31", "2026-02-10")).toEqual({
      totalDays: 30,
      daysPassed: 30,
      daysRemaining: 0,
      state: "COMPLETED",
    });
  });

  it("treats the boundary days as ongoing", () => {
    expect(computeDayCounts("2026-01-01", "2026-01-31", "2026-01-01")).toMatchObject({
      daysPassed: 0,
      daysRemaining: 30,
      state: "ONGOING",
    });
    expect(computeDayCounts("2026-01-01", "2026-01-31", "2026-01-31")).toMatchObject({
      daysPassed: 30,
      daysRemaining: 0,
      state: "ONGOING",
    });
  });

  it("accepts Date objects and date strings interchangeably", () => {
    const fromStrings = computeDayCounts("2026-01-01", "2026-01-31", "2026-01-15");
    const fromDates = computeDayCounts(
      new Date("2026-01-01T00:00:00.000Z"),
      new Date("2026-01-31T00:00:00.000Z"),
      new Date("2026-01-15T12:00:00.000Z"),
    );
    expect(fromDates).toEqual(fromStrings);
  });

  it("handles a single-day period", () => {
    const counts = computeDayCounts("2026-03-10", "2026-03-10", "2026-03-10");
    expect(counts).toEqual({ totalDays: 0, daysPassed: 0, daysRemaining: 0, state: "ONGOING" });
  });
});

describe("progressPercent", () => {
  it("is zero when unscheduled", () => {
    expect(progressPercent(computeDayCounts(null, null))).toBe(0);
  });

  it("reflects the elapsed fraction while ongoing", () => {
    expect(progressPercent(computeDayCounts("2026-01-01", "2026-01-31", "2026-01-16"))).toBe(50);
  });

  it("reaches 100 when complete", () => {
    expect(progressPercent(computeDayCounts("2026-01-01", "2026-01-31", "2026-02-05"))).toBe(100);
  });
});
