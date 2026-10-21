import { describe, expect, it } from "vitest";
import { AppError, toFriendlyError } from "@/lib/errors";

describe("toFriendlyError", () => {
  it("returns the same AppError instance unchanged", () => {
    const original = new AppError("Custom message", { field: "problem" });
    const result = toFriendlyError(original);
    expect(result).toBe(original);
    expect(result.fieldErrors).toEqual({ field: "problem" });
  });

  it("maps duplicate-key errors to a friendly message", () => {
    const result = toFriendlyError({ code: "P2002" });
    expect(result.message).toMatch(/already exists/i);
  });

  it("maps missing-relation errors to a friendly message", () => {
    expect(toFriendlyError({ code: "P2003" }).message).toMatch(/related record/i);
  });

  it("maps not-found errors to a friendly message", () => {
    expect(toFriendlyError({ code: "P2025" }).message).toMatch(/could not be found/i);
  });

  it("falls back to a generic message for unknown errors", () => {
    const result = toFriendlyError(new Error("raw database detail"));
    expect(result.message).toBe("Something went wrong while saving. Please try again.");
    expect(result.message).not.toContain("raw database detail");
  });
});
