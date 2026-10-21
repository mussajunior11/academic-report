import { describe, expect, it } from "vitest";
import { hexToRgb, hexToRgba, isDarkColor, normalizeHex } from "@/lib/utils/color";

describe("normalizeHex", () => {
  it("expands short hex and lowercases", () => {
    expect(normalizeHex("#ABC")).toBe("#aabbcc");
    expect(normalizeHex("AABBCC")).toBe("#aabbcc");
    expect(normalizeHex("  #1e3a8a  ")).toBe("#1e3a8a");
  });

  it("rejects invalid values", () => {
    expect(normalizeHex("")).toBeNull();
    expect(normalizeHex("#12")).toBeNull();
    expect(normalizeHex("#12345")).toBeNull();
    expect(normalizeHex("red")).toBeNull();
  });
});

describe("hexToRgb / hexToRgba", () => {
  it("converts hex to channel values", () => {
    expect(hexToRgb("#ffffff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb("#000000")).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb("#1e3a8a")).toEqual({ r: 30, g: 58, b: 138 });
  });

  it("builds an rgba string and clamps the opacity", () => {
    expect(hexToRgba("#ffffff", 75)).toBe("rgba(255, 255, 255, 0.75)");
    expect(hexToRgba("#000000", 0)).toBe("rgba(0, 0, 0, 0)");
    expect(hexToRgba("#000000", 150)).toBe("rgba(0, 0, 0, 1)");
  });
});

describe("isDarkColor", () => {
  it("flags dark colours for light text", () => {
    expect(isDarkColor("#000000")).toBe(true);
    expect(isDarkColor("#1e3a8a")).toBe(true);
    expect(isDarkColor("#ffffff")).toBe(false);
    expect(isDarkColor("#f1f5f9")).toBe(false);
  });
});
