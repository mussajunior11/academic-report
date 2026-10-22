const scoreInt = z.coerce.number().int().min(0, "Score must be between 0 and 100").max(100, "Score must be between 0 and 100");
const scoreDecimal = z.coerce
  .number({ message: "Enter a valid score" })
  .min(0, "Score must be between 0 and 100")
  .max(100, "Score must be between 0 and 100")
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, "Use at most two decimal places");
const pointsInt = z.coerce.number().int().min(0, "Points must be zero or more").max(1000, "Points value is too large");

const gradeBoundarySchema = z
  .object({
    code: z.enum(GRADE_CODES),
    minScore: scoreDecimal,
    maxScore: scoreDecimal,
    points: pointsInt,
    remark: z.string().trim().max(120, "Remark is too long").default(""),
  })
  .refine((band) => band.minScore <= band.maxScore, {
    message: "Minimum must not exceed maximum",
    path: ["minScore"],
  });
export type GradeBoundaryInput = z.infer<typeof gradeBoundarySchema>;

export const gradingConfigSchema = z
  .object({
    grades: z.array(gradeBoundarySchema),
    divisions: z.array(divisionBoundarySchema),
    passMark: scoreDecimal,
    divisionSubjects: z.coerce
      .number()
      .int()
      .min(1, "At least one subject is required")
      .max(50, "Number of subjects is too large"),
  })
  .superRefine((data, ctx) => {
    const seen = {
      grades: new Set<string>(),
      divisions: new Set<string>(),
    };
    data.grades.forEach((band, index) => {
      if (seen.grades.has(band.code)) {
        ctx.addIssue({ code: "custom", message: "Each grade may appear only once.", path: ["grades", index, "code"] });
      }
      seen.grades.add(band.code);
    });
    for (const code of GRADE_CODES) {
      if (!seen.grades.has(code)) {
        ctx.addIssue({ code: "custom", message: `Missing grade ${code}.`, path: ["grades"] });
      }
    }
    data.divisions.forEach((band, index) => {
      if (seen.divisions.has(band.code)) {
        ctx.addIssue({ code: "custom", message: "Each division may appear only once.", path: ["divisions", index, "code"] });
      }
      seen.divisions.add(band.code);
    });
    for (const code of DIVISION_CODES) {
      if (!seen.divisions.has(code)) {
        ctx.addIssue({ code: "custom", message: `Missing division ${code}.`, path: ["divisions"] });
      }
    }
  });
