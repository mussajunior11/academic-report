// Shared grade colour palette used by the printable performance pages. The text
// map is tuned for legibility on white (C is darkened from pure yellow); the fill
// map is used for large solid blocks such as the class-results headline card.

export const GRADE_TEXT_COLORS: Record<string, string> = {
  A: "rgb(0, 138, 40)",
  B: "rgb(0, 255, 0)",
  C: "rgb(204, 153, 0)",
  D: "rgb(255, 102, 0)",
  F: "rgb(255, 0, 0)",
};

export const GRADE_FILL_COLORS: Record<string, { background: string; color: string }> = {
  A: { background: "rgb(0, 138, 40)", color: "#ffffff" },
  B: { background: "rgb(0, 255, 0)", color: "#0f172a" },
  C: { background: "rgb(255, 255, 0)", color: "#0f172a" },
  D: { background: "rgb(255, 102, 0)", color: "#0f172a" },
  F: { background: "rgb(255, 0, 0)", color: "#ffffff" },
};

export const CLASS_RESULT_NEUTRAL_FILL = { background: "#475569", color: "#ffffff" };
