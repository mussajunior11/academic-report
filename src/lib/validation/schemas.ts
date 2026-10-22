const scoreInt = z.coerce.number().int().min(0, "Score must be between 0 and 100").max(100, "Score must be between 0 and 100");
const pointsInt = z.coerce.number().int().min(0, "Points must be zero or more").max(1000, "Points value is too large");
const scoreDecimal = z.coerce
  .number({ message: "Enter a valid score" })
  .min(0, "Score must be between 0 and 100")
  .max(100, "Score must be between 0 and 100")
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, "Use at most two decimal places");

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
