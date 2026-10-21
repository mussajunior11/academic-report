import { describe, expect, it } from "vitest";
import {
  formatStudentNumber,
  parseSequence,
  studentNumberPrefix,
} from "@/lib/utils/student-number";
import { labelStatus } from "@/lib/constants";

describe("student number helpers", () => {
  it("builds the internal student number format", () => {
    expect(studentNumberPrefix("ARS", 2026)).toBe("ARS/2026/");
    expect(formatStudentNumber("ARS", 2026, 1)).toBe("ARS/2026/0001");
    expect(formatStudentNumber("ARS", 2026, 42)).toBe("ARS/2026/0042");
  });

  it("keeps growing past four digits", () => {
    expect(formatStudentNumber("ARS", 2026, 10000)).toBe("ARS/2026/10000");
  });

  it("falls back to sequence 1 for invalid values", () => {
    expect(formatStudentNumber("ARS", 2026, 0)).toBe("ARS/2026/0001");
    expect(formatStudentNumber("ARS", 2026, Number.NaN)).toBe("ARS/2026/0001");
  });

  it("parses the sequence from a matching student number", () => {
    expect(parseSequence("ARS/2026/0042", "ARS/2026/")).toBe(42);
  });

  it("returns undefined when the prefix does not match", () => {
    expect(parseSequence("ARS/2025/0001", "ARS/2026/")).toBeUndefined();
  });
});

describe("labelStatus", () => {
  it("humanises a status value", () => {
    expect(labelStatus("ACTIVE")).toBe("Active");
    expect(labelStatus("DRAFT")).toBe("Draft");
  });
});
