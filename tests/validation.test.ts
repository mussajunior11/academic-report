import { describe, expect, it } from "vitest";
import {
  DEFAULT_DIVISION_SUBJECTS,
  DEFAULT_DIVISIONS,
  DEFAULT_GRADES,
  DEFAULT_PASS_MARK,
  DIVISION_CODES,
  GRADE_CODES,
  SPECIAL_NEED_CATEGORIES,
  SPECIAL_NEED_KEYS,
} from "@/lib/constants";
import {
  examinationSchema,
  examinationTypeSchema,
  gradingConfigSchema,
  gradeRemarksSchema,
  markScoreSchema,
  quarterScheduleSchema,
  saveMarkSchema,
  settingsSchema,
  studentSchema,
  studentSpecialNeedsSchema,
  subjectClassesSchema,
  subjectSchema,
  termScheduleSchema,
} from "@/lib/validation/schemas";

const validStudent = {
  fullName: "Jane Doe",
  gender: "FEMALE",
  classLevelId: "class-1",
  streamId: "stream-1",
  admissionYear: 2026,
};

describe("studentSchema", () => {
  it("accepts a valid student and defaults the status", () => {
    const result = studentSchema.parse(validStudent);
    expect(result.fullName).toBe("Jane Doe");
    expect(result.status).toBe("ACTIVE");
  });

  it("normalises an empty admission number to an empty string", () => {
    const result = studentSchema.parse({ ...validStudent, admissionNumber: "   " });
    expect(result.admissionNumber).toBe("");
  });

  it("rejects an invalid gender", () => {
    const result = studentSchema.safeParse({ ...validStudent, gender: "OTHER" });
    expect(result.success).toBe(false);
  });

  it("rejects an out-of-range admission year", () => {
    const result = studentSchema.safeParse({ ...validStudent, admissionYear: 1800 });
    expect(result.success).toBe(false);
  });

  it("requires a name of at least two characters", () => {
    const result = studentSchema.safeParse({ ...validStudent, fullName: "A" });
    expect(result.success).toBe(false);
  });
});

describe("studentSpecialNeedsSchema", () => {
  it("accepts multiple categories with an optional note", () => {
    const result = studentSpecialNeedsSchema.parse({
      id: "student-1",
      categories: [
        { key: "visual_impairment", note: "" },
        { key: "learning_difficulties", note: "" },
        { key: "other", note: "Requires flexible seating." },
      ],
    });
    expect(result.categories).toHaveLength(3);
    expect(result.categories[2].note).toBe("Requires flexible seating.");
  });

  it("defaults to no categories when omitted", () => {
    const result = studentSpecialNeedsSchema.parse({ id: "student-1" });
    expect(result.categories).toEqual([]);
  });

  it("rejects an unknown category key", () => {
    const result = studentSpecialNeedsSchema.safeParse({
      id: "student-1",
      categories: [{ key: "not_a_real_category" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a duplicate category", () => {
    const result = studentSpecialNeedsSchema.safeParse({
      id: "student-1",
      categories: [{ key: "hearing_impairment" }, { key: "hearing_impairment" }],
    });
    expect(result.success).toBe(false);
  });

  it("requires a description for the other category", () => {
    const result = studentSpecialNeedsSchema.safeParse({
      id: "student-1",
      categories: [{ key: "other", note: "" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("support-need taxonomy", () => {
  it("keeps the categories and keys in sync", () => {
    expect(SPECIAL_NEED_CATEGORIES.map((c) => c.key)).toEqual([...SPECIAL_NEED_KEYS]);
    for (const category of SPECIAL_NEED_CATEGORIES) {
      expect(category.label.length).toBeGreaterThan(0);
      expect(category.description.length).toBeGreaterThan(0);
    }
  });
});

describe("examinationSchema", () => {
  const base = {
    typeId: "type-1",
    academicYearId: "year-1",
    classLevelId: "class-1",
    term: "TERM 1",
  };

  it("defaults the status to DRAFT", () => {
    const result = examinationSchema.parse(base);
    expect(result.status).toBe("DRAFT");
  });

  it("rejects an unknown term", () => {
    const result = examinationSchema.safeParse({ ...base, term: "SUMMER" });
    expect(result.success).toBe(false);
  });

  it("rejects an end date before the start date", () => {
    const result = examinationSchema.safeParse({
      ...base,
      startDate: "2026-05-10",
      endDate: "2026-05-01",
    });
    expect(result.success).toBe(false);
  });

  it("accepts an end date on or after the start date", () => {
    const result = examinationSchema.safeParse({
      ...base,
      startDate: "2026-05-01",
      endDate: "2026-05-10",
    });
    expect(result.success).toBe(true);
  });
});

describe("subjectSchema", () => {
  it("trims the name and defaults the status", () => {
    const result = subjectSchema.parse({ name: "  Geography  " });
    expect(result.name).toBe("Geography");
    expect(result.status).toBe("ACTIVE");
  });

  it("rejects an empty name", () => {
    expect(subjectSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("defaults the numeric code to empty and accepts digits", () => {
    expect(subjectSchema.parse({ name: "Geography" }).numericCode).toBe("");
    expect(subjectSchema.parse({ name: "Geography", numericCode: " 101 " }).numericCode).toBe("101");
  });

  it("rejects a non-numeric numeric code", () => {
    expect(subjectSchema.safeParse({ name: "Geography", numericCode: "12a" }).success).toBe(false);
    expect(subjectSchema.safeParse({ name: "Geography", numericCode: "10.1" }).success).toBe(false);
  });
});

describe("subjectClassesSchema", () => {
  it("requires a subject and defaults the assignment list to empty", () => {
    const result = subjectClassesSchema.parse({ subjectId: "subject-1" });
    expect(result.assignments).toEqual([]);
  });

  it("accepts class and stream assignments", () => {
    const result = subjectClassesSchema.parse({
      subjectId: "subject-1",
      assignments: [
        { classLevelId: "class-1", streamId: null },
        { classLevelId: "class-1", streamId: "stream-1" },
        { classLevelId: "class-2" },
      ],
    });
    expect(result.assignments).toEqual([
      { classLevelId: "class-1", streamId: null },
      { classLevelId: "class-1", streamId: "stream-1" },
      { classLevelId: "class-2", streamId: null },
    ]);
  });

  it("rejects a missing subject and a class-less assignment", () => {
    expect(subjectClassesSchema.safeParse({ subjectId: "" }).success).toBe(false);
    expect(
      subjectClassesSchema.safeParse({
        subjectId: "subject-1",
        assignments: [{ classLevelId: "", streamId: null }],
      }).success,
    ).toBe(false);
  });
});

describe("settingsSchema", () => {
  it("requires a school name", () => {
    expect(settingsSchema.safeParse({ schoolName: "" }).success).toBe(false);
  });

  it("rejects an invalid email address", () => {
    const result = settingsSchema.safeParse({ schoolName: "School", email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid email address and defaults the academic year", () => {
    const result = settingsSchema.parse({ schoolName: "School", email: "info@school.ac.tz" });
    expect(result.email).toBe("info@school.ac.tz");
    expect(result.defaultAcademicYearId).toBe("");
  });
});

describe("grading taxonomy", () => {
  it("keeps the default scales aligned with the code constants", () => {
    expect(DEFAULT_GRADES.map((g) => g.code)).toEqual([...GRADE_CODES]);
    expect(DEFAULT_DIVISIONS.map((d) => d.code)).toEqual([...DIVISION_CODES]);
    expect(DEFAULT_PASS_MARK).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_PASS_MARK).toBeLessThanOrEqual(100);
  });

  it("defines contiguous default grade bands", () => {
    for (const grade of DEFAULT_GRADES) {
      expect(grade.minScore).toBeLessThanOrEqual(grade.maxScore);
    }
    expect(DEFAULT_GRADES[0].maxScore).toBe(100);
    expect(DEFAULT_GRADES[DEFAULT_GRADES.length - 1].minScore).toBe(0);
  });
});

describe("gradingConfigSchema", () => {
  const defaults = {
    grades: DEFAULT_GRADES,
    divisions: DEFAULT_DIVISIONS,
    passMark: DEFAULT_PASS_MARK,
    divisionSubjects: DEFAULT_DIVISION_SUBJECTS,
  };

  it("accepts the default configuration", () => {
    const result = gradingConfigSchema.parse(defaults);
    expect(result.grades).toHaveLength(GRADE_CODES.length);
    expect(result.divisions).toHaveLength(DIVISION_CODES.length);
    expect(result.passMark).toBe(DEFAULT_PASS_MARK);
  });

  it("coerces string scores and marks to integers", () => {
    const result = gradingConfigSchema.parse({
      grades: DEFAULT_GRADES.map((g) => ({ ...g, minScore: `${g.minScore}` })) as never,
      divisions: DEFAULT_DIVISIONS,
      passMark: "40",
      divisionSubjects: "7",
    });
    expect(result.grades.every((g) => Number.isInteger(g.minScore))).toBe(true);
    expect(result.passMark).toBe(40);
    expect(result.divisionSubjects).toBe(7);
  });

  it("rejects a band whose minimum exceeds its maximum", () => {
    const result = gradingConfigSchema.safeParse({
      ...defaults,
      grades: DEFAULT_GRADES.map((g) => (g.code === "C" ? { ...g, minScore: 70, maxScore: 60 } : g)),
    });
    expect(result.success).toBe(false);
  });

  it("rejects scores outside 0-100", () => {
    const result = gradingConfigSchema.safeParse({
      ...defaults,
      grades: DEFAULT_GRADES.map((g) => (g.code === "A" ? { ...g, maxScore: 101 } : g)),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a pass mark outside 0-100", () => {
    expect(gradingConfigSchema.safeParse({ ...defaults, passMark: 101 }).success).toBe(false);
    expect(gradingConfigSchema.safeParse({ ...defaults, passMark: -1 }).success).toBe(false);
    expect(gradingConfigSchema.safeParse({ ...defaults, passMark: 40.5 }).success).toBe(false);
  });

  it("rejects a missing grade code", () => {
    const result = gradingConfigSchema.safeParse({
      ...defaults,
      grades: DEFAULT_GRADES.filter((g) => g.code !== "F"),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a duplicate grade code", () => {
    const result = gradingConfigSchema.safeParse({
      ...defaults,
      grades: [
        ...DEFAULT_GRADES.map((g) => (g.code === "B" ? { ...g, code: "A" } : g)),
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown division code", () => {
    const result = gradingConfigSchema.safeParse({
      ...defaults,
      divisions: DEFAULT_DIVISIONS.map((d) => (d.code === "I" ? { ...d, code: "V" } : d)),
    });
    expect(result.success).toBe(false);
  });
});

describe("gradeRemarksSchema", () => {
  it("accepts a per-grade remark list and defaults missing remarks to empty strings", () => {
    const result = gradeRemarksSchema.parse({
      grades: [{ code: "A" }, { code: "F", academicMasterRemark: "  Keep trying.  " }],
    });
    expect(result.grades[0]).toEqual({ code: "A", academicMasterRemark: "", headMasterRemark: "" });
    expect(result.grades[1].academicMasterRemark).toBe("Keep trying.");
  });

  it("rejects a grade without a code", () => {
    expect(gradeRemarksSchema.safeParse({ grades: [{ code: "" }] }).success).toBe(false);
  });

  it("rejects a remark longer than 1000 characters", () => {
    const result = gradeRemarksSchema.safeParse({
      grades: [{ code: "A", headMasterRemark: "x".repeat(1001) }],
    });
    expect(result.success).toBe(false);
  });
});

describe("termScheduleSchema", () => {
  const terms = [
    { id: "term-1", startDate: "2026-01-05", endDate: "2026-06-12" },
    { id: "term-2", startDate: "2026-07-05", endDate: "2026-12-04" },
  ];

  it("accepts two terms with valid dates", () => {
    const result = termScheduleSchema.parse({ academicYearId: "year-1", terms });
    expect(result.terms).toHaveLength(2);
    expect(result.terms[0].startDate).toBe("2026-01-05");
  });

  it("allows empty (unset) dates", () => {
    const result = termScheduleSchema.safeParse({
      academicYearId: "year-1",
      terms: [
        { id: "term-1", startDate: "", endDate: "" },
        { id: "term-2" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an end date before the start date", () => {
    const result = termScheduleSchema.safeParse({
      academicYearId: "year-1",
      terms: [terms[0], { id: "term-2", startDate: "2026-07-05", endDate: "2026-07-01" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed date", () => {
    const result = termScheduleSchema.safeParse({
      academicYearId: "year-1",
      terms: [terms[0], { id: "term-2", startDate: "05/07/2026", endDate: "2026-12-04" }],
    });
    expect(result.success).toBe(false);
  });

  it("requires exactly two terms and an academic year", () => {
    expect(termScheduleSchema.safeParse({ academicYearId: "year-1", terms: [terms[0]] }).success).toBe(false);
    expect(termScheduleSchema.safeParse({ academicYearId: "", terms }).success).toBe(false);
  });
});

describe("quarterScheduleSchema", () => {
  const quarters = [
    { id: "q-1", startDate: "2026-01-05", endDate: "2026-03-20" },
    { id: "q-2", startDate: "2026-03-30", endDate: "2026-06-12" },
    { id: "q-3", startDate: "2026-07-05", endDate: "2026-09-18" },
    { id: "q-4", startDate: "2026-09-28", endDate: "2026-12-04" },
  ];

  it("accepts four quarters", () => {
    const result = quarterScheduleSchema.parse({ academicYearId: "year-1", quarters });
    expect(result.quarters).toHaveLength(4);
  });

  it("requires exactly four quarters", () => {
    expect(quarterScheduleSchema.safeParse({ academicYearId: "year-1", quarters: quarters.slice(0, 3) }).success).toBe(
      false,
    );
  });

  it("rejects an end date before the start date", () => {
    const result = quarterScheduleSchema.safeParse({
      academicYearId: "year-1",
      quarters: [quarters[0], quarters[1], quarters[2], { id: "q-4", startDate: "2026-09-28", endDate: "2026-09-01" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("examinationTypeSchema", () => {
  it("accepts a name and defaults the status to ACTIVE", () => {
    const result = examinationTypeSchema.parse({ name: "MIDTERM 2ND QUARTER" });
    expect(result).toEqual({ name: "MIDTERM 2ND QUARTER", status: "ACTIVE" });
  });

  it("trims the name and accepts an explicit status", () => {
    const result = examinationTypeSchema.parse({ name: "  PRE-NECTA  ", status: "INACTIVE" });
    expect(result).toEqual({ name: "PRE-NECTA", status: "INACTIVE" });
  });

  it("rejects an empty or whitespace-only name", () => {
    expect(examinationTypeSchema.safeParse({ name: "" }).success).toBe(false);
    expect(examinationTypeSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("rejects a name longer than 60 characters", () => {
    expect(examinationTypeSchema.safeParse({ name: "X".repeat(61) }).success).toBe(false);
  });

  it("rejects an unknown status", () => {
    expect(examinationTypeSchema.safeParse({ name: "TERMINAL", status: "ARCHIVED" }).success).toBe(false);
  });
});

describe("markScoreSchema", () => {
  it("accepts the boundary scores 0 and 100", () => {
    expect(markScoreSchema.parse(0)).toBe(0);
    expect(markScoreSchema.parse(100)).toBe(100);
  });

  it("accepts a score with one decimal place", () => {
    expect(markScoreSchema.parse(85.5)).toBe(85.5);
  });

  it("rejects scores below 0 or above 100", () => {
    expect(markScoreSchema.safeParse(-0.5).success).toBe(false);
    expect(markScoreSchema.safeParse(100.5).success).toBe(false);
  });

  it("rejects a score with more than one decimal place", () => {
    expect(markScoreSchema.safeParse(85.55).success).toBe(false);
  });

  it("rejects non-numeric input", () => {
    expect(markScoreSchema.safeParse("eighty").success).toBe(false);
    expect(markScoreSchema.safeParse(Number.NaN).success).toBe(false);
  });
});

describe("saveMarkSchema", () => {
  const base = {
    examinationId: "exam-1",
    studentId: "student-1",
    subjectId: "subject-1",
  };

  it("accepts a numeric score", () => {
    const result = saveMarkSchema.parse({ ...base, score: 72.5 });
    expect(result.score).toBe(72.5);
    expect(result.expectedScore).toBeNull();
  });

  it("accepts a null score to clear a cell", () => {
    const result = saveMarkSchema.parse({ ...base, score: null });
    expect(result.score).toBeNull();
  });

  it("defaults expectedScore to null when omitted", () => {
    const result = saveMarkSchema.parse({ ...base, score: 50 });
    expect(result.expectedScore).toBeNull();
  });

  it("accepts an explicit expectedScore for concurrency", () => {
    const result = saveMarkSchema.parse({ ...base, score: 50, expectedScore: 40 });
    expect(result.expectedScore).toBe(40);
  });

  it("rejects missing identifiers", () => {
    expect(saveMarkSchema.safeParse({ studentId: "s", subjectId: "sub", score: 50 }).success).toBe(false);
    expect(saveMarkSchema.safeParse({ examinationId: "e", subjectId: "sub", score: 50 }).success).toBe(false);
    expect(saveMarkSchema.safeParse({ examinationId: "e", studentId: "s", score: 50 }).success).toBe(false);
  });

  it("rejects an out-of-range score", () => {
    expect(saveMarkSchema.safeParse({ ...base, score: 101 }).success).toBe(false);
  });
});
