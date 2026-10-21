import { z } from "zod";
import {
  DIVISION_CODES,
  EXAMINATION_STATUSES,
  GENDERS,
  GRADE_CODES,
  RECORD_STATUSES,
  SPECIAL_NEED_KEYS,
  STUDENT_STATUSES,
  TERMS,
} from "@/lib/constants";
import { optionalDateString } from "@/lib/validation/helpers";

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v.length > 0 ? v : ""))
  .optional()
  .default("");

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(160, "Email is too long")
    .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email address"),
  password: z.string().min(1, "Password is required").max(200, "Password is too long"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const classLevelSchema = z.object({
  name: z.string().trim().min(1, "Class name is required").max(60, "Class name is too long"),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  status: z.enum(RECORD_STATUSES).default("ACTIVE"),
});
export type ClassLevelInput = z.infer<typeof classLevelSchema>;

export const streamSchema = z.object({
  name: z.string().trim().min(1, "Stream name is required").max(60, "Stream name is too long"),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  status: z.enum(RECORD_STATUSES).default("ACTIVE"),
});
export type StreamInput = z.infer<typeof streamSchema>;

export const classStreamSchema = z.object({
  classLevelId: z.string().trim().min(1, "Select a class"),
  streamId: z.string().trim().min(1, "Select a stream"),
  status: z.enum(RECORD_STATUSES).default("ACTIVE"),
});
export type ClassStreamInput = z.infer<typeof classStreamSchema>;

export const subjectSchema = z.object({
  name: z.string().trim().min(1, "Subject name is required").max(80, "Subject name is too long"),
  code: optionalText,
  numericCode: z
    .string()
    .trim()
    .max(20, "Numeric code is too long")
    .refine((v) => v.length === 0 || /^\d+$/.test(v), "Numeric code must contain digits only")
    .optional()
    .default(""),
  status: z.enum(RECORD_STATUSES).default("ACTIVE"),
});
export type SubjectInput = z.infer<typeof subjectSchema>;

export const subjectClassAssignmentSchema = z.object({
  classLevelId: z.string().trim().min(1, "Class is required"),
  streamId: z.string().trim().min(1).nullable().default(null),
});
export type SubjectClassAssignmentInput = z.infer<typeof subjectClassAssignmentSchema>;

export const subjectClassesSchema = z.object({
  subjectId: z.string().trim().min(1, "Subject is required"),
  assignments: z.array(subjectClassAssignmentSchema).default([]),
});
export type SubjectClassesInput = z.infer<typeof subjectClassesSchema>;

export const subjectRegistrationSchema = z.object({
  studentId: z.string().trim().min(1, "Student is required"),
  academicYearId: z.string().trim().min(1, "Academic year is required"),
  subjectIds: z.array(z.string().trim().min(1)).default([]),
});
export type SubjectRegistrationInput = z.infer<typeof subjectRegistrationSchema>;

const currentYear = new Date().getFullYear();

export const studentSchema = z.object({
  admissionNumber: optionalText,
  fullName: z.string().trim().min(2, "Full name is required").max(120, "Full name is too long"),
  gender: z.enum(GENDERS, { message: "Gender must be MALE or FEMALE" }),
  classLevelId: z.string().trim().min(1, "Select a class"),
  streamId: z.string().trim().min(1, "Select a stream"),
  admissionYear: z.coerce
    .number()
    .int()
    .min(1990, "Enter a valid admission year")
    .max(currentYear + 1, "Enter a valid admission year"),
  status: z.enum(STUDENT_STATUSES).default("ACTIVE"),
});
export type StudentInput = z.infer<typeof studentSchema>;

// A student may have more than one support need. Each entry references a
// category by its stable key; `note` is a short description that is required
// for the "other" category.
export const specialNeedEntrySchema = z.object({
  key: z.enum(SPECIAL_NEED_KEYS),
  note: optionalText,
});
export type SpecialNeedEntryInput = z.infer<typeof specialNeedEntrySchema>;

export const studentSpecialNeedsSchema = z
  .object({
    id: z.string().trim().min(1, "Student is required"),
    categories: z.array(specialNeedEntrySchema).max(10, "Too many categories selected").default([]),
  })
  .superRefine((data, ctx) => {
    const seen = new Set<string>();
    data.categories.forEach((entry, index) => {
      if (seen.has(entry.key)) {
        ctx.addIssue({
          code: "custom",
          message: "Each category may be selected only once.",
          path: ["categories", index, "key"],
        });
      }
      seen.add(entry.key);
      if (entry.key === "other" && entry.note.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Add a short description for the other special educational need.",
          path: ["categories", index, "note"],
        });
      }
    });
  });
export type StudentSpecialNeedsInput = z.infer<typeof studentSpecialNeedsSchema>;

export const examinationSchema = z
  .object({
    typeId: z.string().trim().min(1, "Select an examination type"),
    academicYearId: z.string().trim().min(1, "Select an academic year"),
    classLevelId: z.string().trim().min(1, "Select a class"),
    term: z.enum(TERMS, { message: "Select a term or period" }),
    name: optionalText,
    startDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid start date")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : "")),
    endDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid end date")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : "")),
    status: z.enum(EXAMINATION_STATUSES).default("DRAFT"),
  })
  .refine(
    (data) => !data.startDate || !data.endDate || data.startDate <= data.endDate,
    { message: "End date must be on or after the start date", path: ["endDate"] },
  );
export type ExaminationInput = z.infer<typeof examinationSchema>;

export const examinationTypeSchema = z.object({
  name: z.string().trim().min(1, "Examination type name is required").max(60, "Examination type name is too long"),
  status: z.enum(RECORD_STATUSES).default("ACTIVE"),
});
export type ExaminationTypeInput = z.infer<typeof examinationTypeSchema>;

export const academicYearSchema = z
  .object({
    name: z.string().trim().min(1, "Academic year name is required").max(40),
    startDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
    endDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
    isCurrent: z.coerce.boolean().default(false),
  })
  .refine((d) => !d.startDate || !d.endDate || d.startDate <= d.endDate, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });
export type AcademicYearInput = z.infer<typeof academicYearSchema>;

export const settingsSchema = z.object({
  schoolName: z.string().trim().min(1, "School name is required").max(160),
  address: optionalText,
  mobile1: optionalText,
  mobile2: optionalText,
  mobile3: optionalText,
  email: z
    .string()
    .trim()
    .max(160)
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email address"),
  website: optionalText,
  poBox: optionalText,
  defaultAcademicYearId: z.string().trim().optional().default(""),
});
export type SettingsInput = z.infer<typeof settingsSchema>;

/** Sidebar background appearance: a hex colour and its opacity percentage. */
export const sidebarThemeSchema = z.object({
  sidebarColor: z
    .string()
    .trim()
    .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Choose a valid colour"),
  sidebarOpacity: z.coerce
    .number()
    .int()
    .min(0, "Transparency must be between 0 and 100")
    .max(100, "Transparency must be between 0 and 100"),
});
export type SidebarThemeInput = z.infer<typeof sidebarThemeSchema>;

const scoreInt = z.coerce.number().int().min(0, "Score must be between 0 and 100").max(100, "Score must be between 0 and 100");
const pointsInt = z.coerce.number().int().min(0, "Points must be zero or more").max(1000, "Points value is too large");

const gradeBoundarySchema = z
  .object({
    code: z.enum(GRADE_CODES),
    minScore: scoreInt,
    maxScore: scoreInt,
    points: pointsInt,
    remark: z.string().trim().max(120, "Remark is too long").default(""),
  })
  .refine((band) => band.minScore <= band.maxScore, {
    message: "Minimum must not exceed maximum",
    path: ["minScore"],
  });
export type GradeBoundaryInput = z.infer<typeof gradeBoundarySchema>;

const divisionBoundarySchema = z
  .object({
    code: z.enum(DIVISION_CODES),
    minPoints: pointsInt,
    maxPoints: pointsInt,
  })
  .refine((band) => band.minPoints <= band.maxPoints, {
    message: "Minimum must not exceed maximum",
    path: ["minPoints"],
  });
export type DivisionBoundaryInput = z.infer<typeof divisionBoundarySchema>;

/**
 * Full grading configuration: one band per grade/division (all codes must be
 * present exactly once) plus the minimum average score required to pass.
 */
export const gradingConfigSchema = z
  .object({
    grades: z.array(gradeBoundarySchema),
    divisions: z.array(divisionBoundarySchema),
    passMark: scoreInt,
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
export type GradingConfigInput = z.infer<typeof gradingConfigSchema>;

/**
 * Free-text remarks printed on a single student's report card. Either field may
 * be cleared; values are trimmed and length-limited.
 */
export const reportRemarksSchema = z.object({
  examinationId: z.string().trim().min(1, "Select an examination"),
  studentId: z.string().trim().min(1, "Select a student"),
  academicMaster: z.string().trim().max(1000, "Remark is too long").default(""),
  headMaster: z.string().trim().max(1000, "Remark is too long").default(""),
});
export type ReportRemarksInput = z.infer<typeof reportRemarksSchema>;

/**
 * Per-grade report-card remarks configured in Settings. Each grade in the scale
 * carries an academic master's and a head master's remark that are used to
 * auto-fill a student's report when their average falls in that grade.
 */
export const gradeRemarksSchema = z.object({
  grades: z.array(
    z.object({
      code: z.string().trim().min(1),
      academicMasterRemark: z.string().trim().max(1000, "Remark is too long").default(""),
      headMasterRemark: z.string().trim().max(1000, "Remark is too long").default(""),
    }),
  ),
});
export type GradeRemarksInput = z.infer<typeof gradeRemarksSchema>;

// ---------------------------------------------------------------------------
// Academic calendar: term and quarter schedules
// ---------------------------------------------------------------------------

const periodRowSchema = z
  .object({
    id: z.string().trim().min(1),
    startDate: optionalDateString,
    endDate: optionalDateString,
  })
  .refine((row) => !row.startDate || !row.endDate || row.startDate <= row.endDate, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });
export type PeriodRowInput = z.infer<typeof periodRowSchema>;

/** All term dates for one academic year (exactly two terms). */
export const termScheduleSchema = z.object({
  academicYearId: z.string().trim().min(1, "Select an academic year"),
  terms: z.array(periodRowSchema).length(2, "Both terms are required"),
});
export type TermScheduleInput = z.infer<typeof termScheduleSchema>;

/** All quarter dates for one academic year (exactly four quarters). */
export const quarterScheduleSchema = z.object({
  academicYearId: z.string().trim().min(1, "Select an academic year"),
  quarters: z.array(periodRowSchema).length(4, "All four quarters are required"),
});
export type QuarterScheduleInput = z.infer<typeof quarterScheduleSchema>;

// ---------------------------------------------------------------------------
// Marks entry
// ---------------------------------------------------------------------------

/** A single subject score: 0–100 with at most one decimal place. */
export const markScoreSchema = z
  .number({ message: "Enter a valid score" })
  .min(0, "Score must be between 0 and 100")
  .max(100, "Score must be between 0 and 100")
  .refine((v) => Math.abs(v * 10 - Math.round(v * 10)) < 1e-6, "Use at most one decimal place");
export type MarkScoreInput = z.infer<typeof markScoreSchema>;

/**
 * A single cell write from the marks grid. `score` is null when the cell is
 * cleared. `expectedScore` is the value the client loaded so concurrent edits
 * can be detected.
 */
export const saveMarkSchema = z.object({
  examinationId: z.string().trim().min(1, "Examination is required"),
  studentId: z.string().trim().min(1, "Student is required"),
  subjectId: z.string().trim().min(1, "Subject is required"),
  score: markScoreSchema.nullable(),
  expectedScore: markScoreSchema.nullable().optional().default(null),
});
export type SaveMarkInput = z.infer<typeof saveMarkSchema>;

export { studentSchema as default };
