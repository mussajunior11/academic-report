import { beforeAll, describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db/prisma";
import { GET as getMarksTemplate } from "@/app/api/marks-entry/template/route";
import { AppError } from "@/lib/errors";
import {
  createSubject,
  deleteSubject,
  listCompulsorySubjectIdsForClass,
  listCompulsorySubjectIdsForStudent,
  setSubjectClasses,
  updateSubject,
} from "@/lib/services/academic";
import {
  bulkCreateStudents,
  createStudent,
  deleteStudent,
  getStudentById,
  getStudentSubjectIds,
  listSpecialNeedCategories,
  normalizeGender,
  previewBulkStudents,
  setStudentSpecialNeeds,
  setStudentSubjectRegistrations,
} from "@/lib/services/students";
import { getGradeRemarks, getGradingConfig, saveGradeRemarks, saveGradingConfig } from "@/lib/services/grading";
import { getTermSchedule, saveQuarterDates, saveTermDates } from "@/lib/services/terms";
import {
  getMarksEntry,
  importMarks,
  clearMarks,
  listMarksEntryExaminations,
  normalizeScore,
  registerCompulsorySubjectsForExamination,
  saveMark,
} from "@/lib/services/marks";
import type { ParsedMarksWorkbook } from "@/lib/excel/marks-workbook";
import {
  getHeadMasterSignatureUrl,
  getSidebarTheme,
  getSystemLogoUrl,
  updateHeadMasterSignature,
  updateSidebarTheme,
  updateSystemLogo,
} from "@/lib/services/school";
import {
  formatReportDate,
  getExaminationBreak,
  getExaminationReport,
  getStudentReport,
  listReportExaminations,
  saveReportRemarks,
} from "@/lib/services/reports";
import { DEFAULT_SIDEBAR_THEME } from "@/lib/utils/color";
import {
  createExaminationType,
  deleteExamination,
  deleteExaminationType,
  listExaminationTypes,
  setExaminationTypeStatus,
  updateExaminationType,
} from "@/lib/services/examinations";

let schoolId: string;
let classLevelId: string;
let streamId: string;
let subjectAId: string;
let subjectBId: string;
let academicYearId: string;

beforeAll(async () => {
  const school = await prisma.school.create({
    data: { name: "Test Secondary School", code: "TSS" },
  });
  schoolId = school.id;

  const year = await prisma.academicYear.create({
    data: { schoolId, name: "2026", isCurrent: true, status: "ACTIVE" },
  });
  academicYearId = year.id;

  const classLevel = await prisma.classLevel.create({
    data: { schoolId, name: "FORM 1", sortOrder: 1, status: "ACTIVE" },
  });
  classLevelId = classLevel.id;

  const stream = await prisma.stream.create({
    data: { schoolId, name: "A", sortOrder: 1, status: "ACTIVE" },
  });
  streamId = stream.id;

  await prisma.classStream.create({
    data: { schoolId, classLevelId, streamId, status: "ACTIVE" },
  });

  const subjectA = await prisma.subject.create({ data: { schoolId, name: "PHYSICS", code: "PHY" } });
  const subjectB = await prisma.subject.create({ data: { schoolId, name: "CHEMISTRY", code: "CHEM" } });
  subjectAId = subjectA.id;
  subjectBId = subjectB.id;
});

describe("student service", () => {
  it("generates sequential internal student numbers", async () => {
    const first = await createStudent({
      admissionNumber: "",
      fullName: "First Student",
      gender: "MALE",
      classLevelId,
      streamId,
      admissionYear: 2026,
      status: "ACTIVE",
    });
    const second = await createStudent({
      admissionNumber: "",
      fullName: "Second Student",
      gender: "FEMALE",
      classLevelId,
      streamId,
      admissionYear: 2026,
      status: "ACTIVE",
    });

    expect(first.studentNumber).toBe("TSS/2026/0001");
    expect(second.studentNumber).toBe("TSS/2026/0002");
  });

  it("rejects an inactive or unknown class-stream combination", async () => {
    const otherClass = await prisma.classLevel.create({
      data: { schoolId, name: "FORM 2", sortOrder: 2, status: "ACTIVE" },
    });

    await expect(
      createStudent({
        admissionNumber: "",
      fullName: "Bad Combo",
        gender: "MALE",
        classLevelId: otherClass.id,
        streamId,
        admissionYear: 2026,
        status: "ACTIVE",
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("registers and replaces a student's subjects", async () => {
    const student = await createStudent({
      admissionNumber: "",
      fullName: "Subject Student",
      gender: "FEMALE",
      classLevelId,
      streamId,
      admissionYear: 2026,
      status: "ACTIVE",
    });

    const afterTwo = await setStudentSubjectRegistrations(student.id, academicYearId, [
      subjectAId,
      subjectBId,
    ]);
    expect(afterTwo.sort()).toEqual([subjectAId, subjectBId].sort());

    const afterOne = await setStudentSubjectRegistrations(student.id, academicYearId, [subjectBId]);
    expect(afterOne).toEqual([subjectBId]);

    const ids = await getStudentSubjectIds(student.id, academicYearId);
    expect(ids).toEqual([subjectBId]);

    const loaded = await getStudentById(student.id);
    expect(loaded?.registrations).toHaveLength(1);
    expect(loaded?.registrations[0].subjectId).toBe(subjectBId);
  });

  it("deletes a student and cascades their registrations and support needs", async () => {
    const student = await createStudent({
      admissionNumber: "",
      fullName: "Delete Student",
      gender: "MALE",
      classLevelId,
      streamId,
      admissionYear: 2026,
      status: "ACTIVE",
    });
    await setStudentSubjectRegistrations(student.id, academicYearId, [subjectAId]);
    const [category] = await listSpecialNeedCategories();
    await setStudentSpecialNeeds(student.id, [{ key: category.id, note: "" }]);

    await deleteStudent(student.id);

    expect(await getStudentById(student.id)).toBeNull();
    expect(
      await prisma.studentSubjectRegistration.count({ where: { studentId: student.id } }),
    ).toBe(0);
    expect(await prisma.studentSpecialNeed.count({ where: { studentId: student.id } })).toBe(0);

    await expect(deleteStudent("missing-student")).rejects.toBeInstanceOf(AppError);
  });
});

describe("student bulk import", () => {
  it("normalizes gender aliases", () => {
    expect(normalizeGender("Male")).toBe("MALE");
    expect(normalizeGender(" f ")).toBe("FEMALE");
    expect(normalizeGender("girl")).toBe("FEMALE");
    expect(normalizeGender("unknown")).toBeNull();
  });

  it("imports valid rows and reports invalid ones", async () => {
    const summary = await bulkCreateStudents([
      { rowNumber: 2, fullName: "Bulk One", gender: "MALE", className: "FORM 1", streamName: "A" },
      { rowNumber: 3, fullName: "Bulk Two", gender: "F", className: "form 1", streamName: "a" },
      { rowNumber: 4, fullName: "", gender: "MALE", className: "FORM 1", streamName: "A" },
      { rowNumber: 5, fullName: "Bad Class", gender: "MALE", className: "FORM 9", streamName: "A" },
      { rowNumber: 6, fullName: "Bad Stream", gender: "MALE", className: "FORM 1", streamName: "Z" },
    ]);

    expect(summary.created).toBe(2);
    expect(summary.failed).toBe(3);
    expect(summary.issues.map((issue) => issue.row)).toEqual([4, 5, 6]);

    const imported = await prisma.student.findFirst({ where: { schoolId, fullName: "Bulk One" } });
    expect(imported?.studentNumber).toMatch(/^TSS\/\d{4}\/\d{4}$/);
    expect(imported?.gender).toBe("MALE");
  });

  it("previews rows and flags blank class or stream without importing", async () => {
    const preview = await previewBulkStudents([
      { rowNumber: 2, fullName: "Preview Good", gender: "MALE", className: "FORM 1", streamName: "A" },
      { rowNumber: 3, fullName: "Preview No Class", gender: "MALE", className: "  ", streamName: "A" },
      { rowNumber: 4, fullName: "Preview No Stream", gender: "FEMALE", className: "FORM 1", streamName: "" },
      { rowNumber: 5, fullName: "", gender: "MALE", className: "FORM 1", streamName: "A" },
      { rowNumber: 6, fullName: "Preview Bad Class", gender: "MALE", className: "FORM 9", streamName: "A" },
    ]);

    expect(preview.map((row) => row.status)).toEqual(["ok", "error", "error", "error", "error"]);
    expect(preview[0].problems).toEqual([]);
    expect(preview[1].problems).toContain("Class is missing.");
    expect(preview[2].problems).toContain("Stream is missing.");
    expect(preview[3].problems).toContain("Full name is missing.");
    expect(preview[4].problems[0]).toMatch(/was not found or is inactive/);

    // Previewing must not create anything.
    expect(await prisma.student.count({ where: { schoolId, fullName: "Preview Good" } })).toBe(0);
  });
});

describe("subject compulsory classes", () => {
  it("sets, replaces and clears the classes a subject is compulsory for", async () => {
    const otherClass = await prisma.classLevel.create({
      data: { schoolId, name: "FORM 4", sortOrder: 4, status: "ACTIVE" },
    });

    await setSubjectClasses(subjectAId, [
      { classLevelId, streamId: null },
      { classLevelId: otherClass.id, streamId: null },
    ]);
    const links = await prisma.subjectClass.findMany({ where: { schoolId, subjectId: subjectAId } });
    expect(links.map((link) => link.classLevelId).sort()).toEqual([classLevelId, otherClass.id].sort());

    await setSubjectClasses(subjectAId, [{ classLevelId, streamId: null }]);
    const replaced = await prisma.subjectClass.findMany({ where: { schoolId, subjectId: subjectAId } });
    expect(replaced.map((link) => link.classLevelId)).toEqual([classLevelId]);

    await setSubjectClasses(subjectAId, []);
    const cleared = await prisma.subjectClass.findMany({ where: { schoolId, subjectId: subjectAId } });
    expect(cleared).toHaveLength(0);
  });

  it("deduplicates assignments and rejects unknown classes", async () => {
    await setSubjectClasses(subjectAId, [
      { classLevelId, streamId: null },
      { classLevelId, streamId: null },
    ]);
    const links = await prisma.subjectClass.findMany({ where: { schoolId, subjectId: subjectAId } });
    expect(links).toHaveLength(1);

    await expect(
      setSubjectClasses(subjectAId, [{ classLevelId: "missing-class-id", streamId: null }]),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("rejects an unknown subject", async () => {
    await expect(setSubjectClasses("missing-subject-id", [])).rejects.toBeInstanceOf(AppError);
  });

  it("lists active compulsory subjects for a class level", async () => {
    await setSubjectClasses(subjectAId, [{ classLevelId, streamId: null }]);

    const ids = await listCompulsorySubjectIdsForClass(classLevelId);
    expect(ids.sort()).toEqual([subjectAId]);
    expect(ids).not.toContain(subjectBId);

    await updateSubject(subjectAId, { name: "PHYSICS", code: "PHY", numericCode: "", status: "INACTIVE" });
    expect(await listCompulsorySubjectIdsForClass(classLevelId)).toEqual([]);
    await updateSubject(subjectAId, { name: "PHYSICS", code: "PHY", numericCode: "", status: "ACTIVE" });

    await setSubjectClasses(subjectAId, []);
  });

  it("narrows a subject to specific streams and resolves student-level compulsories", async () => {
    const otherStream = await prisma.stream.create({
      data: { schoolId, name: "B", sortOrder: 2, status: "ACTIVE" },
    });
    await prisma.classStream.create({
      data: { schoolId, classLevelId, streamId: otherStream.id, status: "ACTIVE" },
    });

    await setSubjectClasses(subjectAId, [{ classLevelId, streamId }]);
    await setSubjectClasses(subjectBId, [{ classLevelId, streamId: null }]);

    const forA = await listCompulsorySubjectIdsForStudent(classLevelId, streamId);
    expect(forA.sort()).toEqual([subjectAId, subjectBId].sort());

    const forB = await listCompulsorySubjectIdsForStudent(classLevelId, otherStream.id);
    expect(forB).toEqual([subjectBId]);

    await expect(
      setSubjectClasses(subjectAId, [{ classLevelId, streamId: "missing-stream-id" }]),
    ).rejects.toBeInstanceOf(AppError);

    await setSubjectClasses(subjectAId, []);
    await setSubjectClasses(subjectBId, []);
  });

  it("applies the allocation to students and reconciles COMPULSORY registrations on edit", async () => {
    const streamB = await prisma.stream.findFirstOrThrow({ where: { schoolId, name: "B" } });
    const streamBStudent = await createStudent({
      admissionNumber: "",
      fullName: "Compulsory Stream B",
      gender: "MALE",
      classLevelId,
      streamId: streamB.id,
      admissionYear: 2026,
      status: "ACTIVE",
    });
    const streamAStudent = await createStudent({
      admissionNumber: "",
      fullName: "Compulsory Stream A",
      gender: "FEMALE",
      classLevelId,
      streamId,
      admissionYear: 2026,
      status: "ACTIVE",
    });

    const applyAll = await setSubjectClasses(subjectAId, [{ classLevelId, streamId: null }]);
    expect(applyAll.academicYearId).toBe(academicYearId);
    expect(applyAll.added).toBeGreaterThan(0);
    const rowB = await prisma.studentSubjectRegistration.findFirst({
      where: { studentId: streamBStudent.id, subjectId: subjectAId, academicYearId },
    });
    expect(rowB?.source).toBe("COMPULSORY");

    const narrow = await setSubjectClasses(subjectAId, [{ classLevelId, streamId }]);
    expect(narrow.removed).toBeGreaterThan(0);
    expect(
      await prisma.studentSubjectRegistration.count({
        where: { studentId: streamBStudent.id, subjectId: subjectAId, academicYearId },
      }),
    ).toBe(0);
    expect(
      await prisma.studentSubjectRegistration.count({
        where: { studentId: streamAStudent.id, subjectId: subjectAId, academicYearId },
      }),
    ).toBe(1);

    await prisma.studentSubjectRegistration.deleteMany({
      where: { studentId: streamBStudent.id, subjectId: subjectAId, academicYearId },
    });
    await prisma.studentSubjectRegistration.create({
      data: { schoolId, studentId: streamBStudent.id, subjectId: subjectAId, academicYearId, source: "MANUAL" },
    });

    await setSubjectClasses(subjectAId, [{ classLevelId, streamId: null }]);
    const afterApply = await prisma.studentSubjectRegistration.findFirst({
      where: { studentId: streamBStudent.id, subjectId: subjectAId, academicYearId },
    });
    expect(afterApply?.source).toBe("MANUAL");

    await setSubjectClasses(subjectAId, []);
    const afterClear = await prisma.studentSubjectRegistration.findFirst({
      where: { studentId: streamBStudent.id, subjectId: subjectAId, academicYearId },
    });
    expect(afterClear?.source).toBe("MANUAL");

    await prisma.studentSubjectRegistration.deleteMany({ where: { subjectId: subjectAId } });
  });

  it("unregisters an optional subject while keeping compulsory registrations", async () => {
    const student = await createStudent({
      admissionNumber: "",
      fullName: "Unregister Subject",
      gender: "FEMALE",
      classLevelId,
      streamId,
      admissionYear: 2026,
      status: "ACTIVE",
    });

    await setSubjectClasses(subjectAId, [{ classLevelId, streamId: null }]);
    await setStudentSubjectRegistrations(student.id, academicYearId, [subjectAId, subjectBId]);
    const registered = await getStudentSubjectIds(student.id, academicYearId);
    expect(registered.sort()).toEqual([subjectAId, subjectBId].sort());

    // The deselected optional subject is removed; the compulsory one stays even
    // when omitted from the request (the client always sends it).
    const afterRemove = await setStudentSubjectRegistrations(student.id, academicYearId, []);
    expect(afterRemove).toEqual([subjectAId]);

    expect(
      await prisma.studentSubjectRegistration.findFirst({
        where: { studentId: student.id, subjectId: subjectBId, academicYearId },
      }),
    ).toBeNull();
    const compulsoryRow = await prisma.studentSubjectRegistration.findFirst({
      where: { studentId: student.id, subjectId: subjectAId, academicYearId },
    });
    expect(compulsoryRow?.source).toBe("COMPULSORY");

    await setSubjectClasses(subjectAId, []);
    await prisma.studentSubjectRegistration.deleteMany({ where: { studentId: student.id } });
  });
});

describe("subject numeric code", () => {
  it("persists the short code and numeric code on create and update", async () => {
    const created = await createSubject({ name: "biology", code: "bio", numericCode: "011", status: "ACTIVE" });
    expect(created.code).toBe("BIO");
    expect(created.numericCode).toBe("011");

    const updated = await updateSubject(created.id, {
      name: "biology",
      code: "bio",
      numericCode: "012",
      status: "ACTIVE",
    });
    expect(updated.numericCode).toBe("012");

    const cleared = await updateSubject(created.id, {
      name: "biology",
      code: "bio",
      numericCode: "",
      status: "ACTIVE",
    });
    expect(cleared.numericCode).toBeNull();
  });
});

describe("subject deletion", () => {
  it("deletes a subject with no registrations", async () => {
    const subject = await createSubject({ name: "temporary", code: "TMP", numericCode: "", status: "ACTIVE" });
    await deleteSubject(subject.id);
    const found = await prisma.subject.findUnique({ where: { id: subject.id } });
    expect(found).toBeNull();
  });

  it("refuses to delete a subject that still has registrations", async () => {
    await expect(deleteSubject(subjectBId)).rejects.toBeInstanceOf(AppError);
  });

  it("rejects an unknown subject", async () => {
    await expect(deleteSubject("missing-subject-id")).rejects.toBeInstanceOf(AppError);
  });
});

describe("student support needs", () => {
  it("records and replaces multiple support-need categories", async () => {
    const student = await createStudent({
      admissionNumber: "",
      fullName: "Accessibility Student",
      gender: "MALE",
      classLevelId,
      streamId,
      admissionYear: 2026,
      status: "ACTIVE",
    });

    const recorded = await setStudentSpecialNeeds(student.id, [
      { key: "visual_impairment", note: "" },
      { key: "learning_difficulties", note: "" },
    ]);
    expect(recorded.map((r) => r.categoryId).sort()).toEqual([
      "learning_difficulties",
      "visual_impairment",
    ]);

    const replaced = await setStudentSpecialNeeds(student.id, [{ key: "hearing_impairment", note: "" }]);
    expect(replaced).toHaveLength(1);
    expect(replaced[0].categoryId).toBe("hearing_impairment");
  });

  it("requires a description for the other category and persists it", async () => {
    const student = await createStudent({
      admissionNumber: "",
      fullName: "Other Needs Student",
      gender: "FEMALE",
      classLevelId,
      streamId,
      admissionYear: 2026,
      status: "ACTIVE",
    });

    await expect(
      setStudentSpecialNeeds(student.id, [{ key: "other", note: "" }]),
    ).rejects.toBeInstanceOf(AppError);

    const saved = await setStudentSpecialNeeds(student.id, [
      { key: "other", note: "Requires flexible seating." },
    ]);
    expect(saved[0].note).toBe("Requires flexible seating.");
  });

  it("rejects an unknown category key", async () => {
    const student = await createStudent({
      admissionNumber: "",
      fullName: "Unknown Category Student",
      gender: "MALE",
      classLevelId,
      streamId,
      admissionYear: 2026,
      status: "ACTIVE",
    });

    await expect(
      setStudentSpecialNeeds(student.id, [{ key: "not_a_real_category", note: "" }]),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("rejects an unknown student", async () => {
    await expect(
      setStudentSpecialNeeds("missing-student-id", [{ key: "other", note: "test" }]),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("exposes the seeded support-need categories", async () => {
    const categories = await listSpecialNeedCategories();
    expect(categories.length).toBeGreaterThanOrEqual(10);
    expect(new Set(categories.map((c) => c.id)).size).toBe(categories.length);
  });
});

describe("grading service", () => {
  it("backfills defaults: a complete grade/division scale and required subjects", async () => {
    const config = await getGradingConfig();
    expect(config).not.toBeNull();
    expect(config!.divisionSubjects).toBe(7);
    expect(config!.grades.find((g) => g.code === "A")).toMatchObject({
      code: "A",
      minScore: 75,
      maxScore: 100,
      points: 1,
      remark: "Excellent",
    });
    expect(config!.grades.find((g) => g.code === "F")).toMatchObject({
      code: "F",
      minScore: 0,
      maxScore: 44,
      points: 5,
      remark: "Poor",
    });
    expect(config!.divisions.find((d) => d.code === "0")).toEqual({ code: "0", minPoints: 34, maxPoints: 35 });
    expect(new Set(config!.grades.map((g) => g.code))).toEqual(new Set(["A", "B", "C", "D", "F"]));
    expect(new Set(config!.divisions.map((d) => d.code))).toEqual(new Set(["I", "II", "III", "IV", "0"]));
  });

  it("persists a custom scale, points, remarks and required subjects", async () => {
    const saved = await saveGradingConfig({
      passMark: 50,
      divisionSubjects: 8,
      grades: [
        { code: "A", minScore: 70, maxScore: 100, points: 1, remark: "Very Good" },
        { code: "B", minScore: 60, maxScore: 69, points: 2, remark: "Good" },
        { code: "C", minScore: 50, maxScore: 59, points: 3, remark: "Average" },
        { code: "D", minScore: 35, maxScore: 49, points: 4, remark: "Below Average" },
        { code: "F", minScore: 0, maxScore: 34, points: 5, remark: "Poor" },
      ],
      divisions: [
        { code: "I", minPoints: 8, maxPoints: 19 },
        { code: "II", minPoints: 20, maxPoints: 24 },
        { code: "III", minPoints: 25, maxPoints: 29 },
        { code: "IV", minPoints: 30, maxPoints: 33 },
        { code: "0", minPoints: 34, maxPoints: 40 },
      ],
    });
    expect(saved).toBeUndefined();

    const config = await getGradingConfig();
    expect(config!.passMark).toBe(50);
    expect(config!.divisionSubjects).toBe(8);
    expect(config!.grades.find((g) => g.code === "A")).toMatchObject({
      code: "A",
      minScore: 70,
      maxScore: 100,
      points: 1,
      remark: "Very Good",
    });
    expect(config!.divisions.find((d) => d.code === "0")).toEqual({ code: "0", minPoints: 34, maxPoints: 40 });
    expect(new Set(config!.grades.map((g) => g.code))).toEqual(new Set(["A", "B", "C", "D", "F"]));
    expect(new Set(config!.divisions.map((d) => d.code))).toEqual(new Set(["I", "II", "III", "IV", "0"]));
  });
});

describe("grade remarks", () => {
  it("backfills a default academic and head master remark for every grade", async () => {
    const remarks = await getGradeRemarks();
    expect(remarks).not.toBeNull();
    expect(new Set(remarks!.map((g) => g.code))).toEqual(new Set(["A", "B", "C", "D", "F"]));
    for (const grade of remarks!) {
      expect(grade.academicMasterRemark.length).toBeGreaterThan(0);
      expect(grade.headMasterRemark.length).toBeGreaterThan(0);
    }
  });

  it("saves custom per-grade remarks and exposes them through the grading config", async () => {
    await saveGradeRemarks({
      grades: [
        { code: "A", academicMasterRemark: "Custom A academic", headMasterRemark: "Custom A head" },
        { code: "F", academicMasterRemark: "", headMasterRemark: "" },
      ],
    });

    const config = await getGradingConfig();
    expect(config!.grades.find((g) => g.code === "A")).toMatchObject({
      academicMasterRemark: "Custom A academic",
      headMasterRemark: "Custom A head",
    });
    expect(config!.grades.find((g) => g.code === "F")).toMatchObject({
      academicMasterRemark: "",
      headMasterRemark: "",
    });
  });
});

describe("term schedule service", () => {
  it("backfills two terms and four quarters for the current year", async () => {
    const schedule = await getTermSchedule();
    expect(schedule).not.toBeNull();
    expect(schedule!.academicYear.id).toBe(academicYearId);
    expect(schedule!.terms.map((t) => t.name)).toEqual(["First Term", "Second Term"]);
    expect(schedule!.terms.map((t) => t.quarters.map((q) => q.name))).toEqual([
      ["1st Quarter", "2nd Quarter"],
      ["3rd Quarter", "4th Quarter"],
    ]);
    expect(schedule!.terms.every((t) => t.startDate === null && t.endDate === null)).toBe(true);
  });

  it("defaults to the current academic year and backfills each year only once", async () => {
    const first = await getTermSchedule();
    const again = await getTermSchedule();
    expect(again!.terms.map((t) => t.id)).toEqual(first!.terms.map((t) => t.id));
  });

  it("persists term and quarter dates", async () => {
    const schedule = await getTermSchedule();
    const [firstTerm, secondTerm] = schedule!.terms;

    await saveTermDates({
      academicYearId,
      terms: [
        { id: firstTerm.id, startDate: "2026-01-05", endDate: "2026-06-12" },
        { id: secondTerm.id, startDate: "2026-07-05", endDate: "2026-12-04" },
      ],
    });
    await saveQuarterDates({
      academicYearId,
      quarters: [
        { id: firstTerm.quarters[0].id, startDate: "2026-01-05", endDate: "2026-03-20" },
        { id: firstTerm.quarters[1].id, startDate: "2026-03-30", endDate: "2026-06-12" },
        { id: secondTerm.quarters[0].id, startDate: "2026-07-05", endDate: "2026-09-18" },
        { id: secondTerm.quarters[1].id, startDate: "2026-09-28", endDate: "2026-12-04" },
      ],
    });

    const saved = await getTermSchedule(academicYearId);
    const asIso = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : null);
    expect(asIso(saved!.terms[0].startDate)).toBe("2026-01-05");
    expect(asIso(saved!.terms[1].endDate)).toBe("2026-12-04");
    expect(asIso(saved!.terms[0].quarters[1].startDate)).toBe("2026-03-30");
    expect(asIso(saved!.terms[1].quarters[0].endDate)).toBe("2026-09-18");
  });

  it("rejects term ids that do not belong to the academic year", async () => {
    await expect(
      saveTermDates({
        academicYearId,
        terms: [
          { id: "missing-term", startDate: "2026-01-01", endDate: "2026-06-01" },
          { id: "missing-term-2", startDate: "2026-07-01", endDate: "2026-12-01" },
        ],
      }),
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe("examination type service", () => {
  it("creates a type with an upper-cased name and an increasing sort order", async () => {
    const first = await createExaminationType({ name: "terminal", status: "ACTIVE" });
    const second = await createExaminationType({ name: "pre-mock", status: "ACTIVE" });
    expect(first.name).toBe("TERMINAL");
    expect(second.sortOrder).toBeGreaterThan(first.sortOrder);

    const list = await listExaminationTypes();
    expect(list.map((t) => t.name)).toEqual(expect.arrayContaining(["TERMINAL", "PRE-MOCK"]));
  });

  it("rejects a duplicate name", async () => {
    await expect(createExaminationType({ name: "TERMINAL", status: "ACTIVE" })).rejects.toBeInstanceOf(AppError);
  });

  it("renames a type", async () => {
    const type = await createExaminationType({ name: "MIDTERM", status: "ACTIVE" });
    const renamed = await updateExaminationType(type.id, { name: "midterm exam", status: "ACTIVE" });
    expect(renamed.name).toBe("MIDTERM EXAM");
  });

  it("filters inactive types out of the active-only list", async () => {
    const type = await createExaminationType({ name: "SPECIAL", status: "ACTIVE" });
    await setExaminationTypeStatus(type.id, "INACTIVE");

    const activeOnly = await listExaminationTypes(false);
    expect(activeOnly.some((t) => t.id === type.id)).toBe(false);

    const all = await listExaminationTypes();
    expect(all.some((t) => t.id === type.id)).toBe(true);
  });

  it("deletes an unused type but refuses to delete one in use", async () => {
    const used = await createExaminationType({ name: "USED TYPE", status: "ACTIVE" });
    await prisma.examination.create({
      data: {
        schoolId,
        typeId: used.id,
        academicYearId,
        classLevelId,
        term: "TERM 1",
        status: "DRAFT",
      },
    });

    await expect(deleteExaminationType(used.id)).rejects.toBeInstanceOf(AppError);

    const unused = await createExaminationType({ name: "UNUSED TYPE", status: "ACTIVE" });
    await deleteExaminationType(unused.id);
    const list = await listExaminationTypes();
    expect(list.some((t) => t.id === unused.id)).toBe(false);
  });
});

describe("examination service", () => {
  it("deletes an examination and rejects an unknown id", async () => {
    const type = await createExaminationType({ name: "DELETABLE", status: "ACTIVE" });
    const exam = await prisma.examination.create({
      data: { schoolId, typeId: type.id, academicYearId, classLevelId, term: "TERM 2", status: "DRAFT" },
    });

    await deleteExamination(exam.id);
    expect(await prisma.examination.findUnique({ where: { id: exam.id } })).toBeNull();

    await expect(deleteExamination("missing-examination")).rejects.toBeInstanceOf(AppError);
  });
});

describe("marks service", () => {
  let examId: string;
  let closedExamId: string;
  let registeredStudentId: string;
  let otherClassStudentId: string;

  beforeAll(async () => {
    const type = await createExaminationType({ name: "MARKS TEST", status: "ACTIVE" });
    const exam = await prisma.examination.create({
      data: {
        schoolId,
        typeId: type.id,
        academicYearId,
        classLevelId,
        term: "TERM 1",
        name: "Marks Exam",
        status: "OPEN",
      },
    });
    examId = exam.id;

    const closedType = await createExaminationType({ name: "MARKS CLOSED", status: "ACTIVE" });
    const closedExam = await prisma.examination.create({
      data: {
        schoolId,
        typeId: closedType.id,
        academicYearId,
        classLevelId,
        term: "TERM 2",
        status: "CLOSED",
      },
    });
    closedExamId = closedExam.id;

    const student = await createStudent({
      admissionNumber: "",
      fullName: "Marks Student",
      gender: "MALE",
      classLevelId,
      streamId,
      admissionYear: 2026,
      status: "ACTIVE",
    });
    registeredStudentId = student.id;
    await setStudentSubjectRegistrations(student.id, academicYearId, [subjectAId]);

    const otherClass = await prisma.classLevel.create({
      data: { schoolId, name: "FORM 3 MARKS", sortOrder: 3, status: "ACTIVE" },
    });
    const otherStudent = await prisma.student.create({
      data: {
        schoolId,
        studentNumber: "TSS/2026/9001",
        fullName: "Other Class Student",
        gender: "MALE",
        classLevelId: otherClass.id,
        streamId,
        admissionYear: 2026,
        status: "ACTIVE",
      },
    });
    otherClassStudentId = otherStudent.id;
  });

  it("normalizes scores to one decimal place", () => {
    expect(normalizeScore(85.54)).toBe(85.5);
    expect(normalizeScore(85.55)).toBe(85.6);
    expect(normalizeScore(70)).toBe(70);
  });

  it("loads the grid data for an examination and reports it editable", async () => {
    const entry = await getMarksEntry(examId);
    expect(entry).not.toBeNull();
    expect(entry!.examination.id).toBe(examId);
    expect(entry!.examination.classLevelName).toBe("FORM 1");
    expect(entry!.canEdit).toBe(true);
    expect(entry!.students.some((s) => s.id === registeredStudentId)).toBe(true);
    expect(entry!.subjects.some((s) => s.id === subjectAId)).toBe(true);
    expect(entry!.marks).toEqual([]);
  });

  it("returns null for an unknown examination", async () => {
    expect(await getMarksEntry("missing-examination")).toBeNull();
  });

  it("lists examinations for marks entry", async () => {
    const list = await listMarksEntryExaminations();
    expect(list.some((exam) => exam.id === examId)).toBe(true);
  });

  it("registers the class compulsory subjects for all active students", async () => {
    await setSubjectClasses(subjectAId, [{ classLevelId, streamId: null }]);

    const ids = await getStudentSubjectIds(registeredStudentId, academicYearId);
    expect(ids).toContain(subjectAId);

    // The explicit backfill is idempotent and fills in any gaps.
    await prisma.studentSubjectRegistration.deleteMany({
      where: { subjectId: subjectAId, source: "COMPULSORY" },
    });
    const result = await registerCompulsorySubjectsForExamination(examId);
    expect(result.students).toBeGreaterThan(0);
    expect(result.registered).toBeGreaterThan(0);

    const again = await registerCompulsorySubjectsForExamination(examId);
    expect(again.registered).toBe(0);

    await expect(
      registerCompulsorySubjectsForExamination("missing-examination"),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("registers stream-specific compulsory subjects only for matching students", async () => {
    const streamB = await prisma.stream.create({
      data: { schoolId, name: "MARKS-B", sortOrder: 2, status: "ACTIVE" },
    });
    await prisma.classStream.create({
      data: { schoolId, classLevelId, streamId: streamB.id, status: "ACTIVE" },
    });
    const streamBStudent = await createStudent({
      admissionNumber: "",
      fullName: "Stream B Student",
      gender: "FEMALE",
      classLevelId,
      streamId: streamB.id,
      admissionYear: 2026,
      status: "ACTIVE",
    });

    await setSubjectClasses(subjectBId, [{ classLevelId, streamId: streamB.id }]);
    await registerCompulsorySubjectsForExamination(examId);

    const streamBIds = await getStudentSubjectIds(streamBStudent.id, academicYearId);
    expect(streamBIds).toContain(subjectBId);

    const streamAIds = await getStudentSubjectIds(registeredStudentId, academicYearId);
    expect(streamAIds).not.toContain(subjectBId);

    await setSubjectClasses(subjectBId, []);
  });

  it("creates, updates and clears a mark", async () => {
    await saveMark({
      examinationId: examId,
      studentId: registeredStudentId,
      subjectId: subjectAId,
      score: 78,
      expectedScore: null,
    });
    let entry = await getMarksEntry(examId);
    expect(entry!.marks).toContainEqual({ studentId: registeredStudentId, subjectId: subjectAId, score: 78 });

    await saveMark({
      examinationId: examId,
      studentId: registeredStudentId,
      subjectId: subjectAId,
      score: 81.5,
      expectedScore: 78,
    });
    entry = await getMarksEntry(examId);
    expect(entry!.marks.find((m) => m.subjectId === subjectAId)!.score).toBe(81.5);

    await saveMark({
      examinationId: examId,
      studentId: registeredStudentId,
      subjectId: subjectAId,
      score: null,
      expectedScore: 81.5,
    });
    entry = await getMarksEntry(examId);
    expect(entry!.marks).toHaveLength(0);
  });

  it("rejects a concurrent edit and keeps the stored value", async () => {
    await saveMark({
      examinationId: examId,
      studentId: registeredStudentId,
      subjectId: subjectAId,
      score: 60,
      expectedScore: null,
    });

    await expect(
      saveMark({
        examinationId: examId,
        studentId: registeredStudentId,
        subjectId: subjectAId,
        score: 90,
        expectedScore: 55,
      }),
    ).rejects.toBeInstanceOf(AppError);

    const mark = await prisma.mark.findUnique({
      where: {
        examinationId_studentId_subjectId: {
          examinationId: examId,
          studentId: registeredStudentId,
          subjectId: subjectAId,
        },
      },
    });
    expect(mark!.score).toBe(60);

    await saveMark({
      examinationId: examId,
      studentId: registeredStudentId,
      subjectId: subjectAId,
      score: null,
      expectedScore: 60,
    });
  });

  it("rejects edits to a closed examination", async () => {
    await expect(
      saveMark({
        examinationId: closedExamId,
        studentId: registeredStudentId,
        subjectId: subjectAId,
        score: 50,
        expectedScore: null,
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("rejects a student who is not in the examination's class", async () => {
    await expect(
      saveMark({
        examinationId: examId,
        studentId: otherClassStudentId,
        subjectId: subjectAId,
        score: 50,
        expectedScore: null,
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("rejects a subject the student is not registered for", async () => {
    await expect(
      saveMark({
        examinationId: examId,
        studentId: registeredStudentId,
        subjectId: subjectBId,
        score: 50,
        expectedScore: null,
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("rejects an unknown examination", async () => {
    await expect(
      saveMark({
        examinationId: "missing-examination",
        studentId: registeredStudentId,
        subjectId: subjectAId,
        score: 50,
        expectedScore: null,
      }),
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe("marks import", () => {
  let examId: string;
  let studentName: string;
  let studentId: string;
  let biologyId: string;
  let chemistryId: string;
  const BIOLOGY = "IMPORT BIOLOGY";
  const CHEMISTRY = "IMPORT CHEMISTRY";

  function workbook(
    rows: ParsedMarksWorkbook["rows"],
    subjectHeaders: string[] = [BIOLOGY, CHEMISTRY],
  ): ParsedMarksWorkbook {
    return { headerRowNumber: 5, subjectHeaders, rows };
  }

  beforeAll(async () => {
    const type = await createExaminationType({ name: "IMPORT EXAM TYPE", status: "ACTIVE" });
    const exam = await prisma.examination.create({
      data: {
        schoolId,
        typeId: type.id,
        academicYearId,
        classLevelId,
        term: "TERM 1",
        name: "Import Exam",
        status: "OPEN",
      },
    });
    examId = exam.id;

    const biology = await prisma.subject.create({
      data: { schoolId, name: BIOLOGY, code: "IMP-BIO" },
    });
    const chemistry = await prisma.subject.create({
      data: { schoolId, name: CHEMISTRY, code: "IMP-CHEM" },
    });
    biologyId = biology.id;
    chemistryId = chemistry.id;

    studentName = "Import Target";
    const student = await createStudent({
      admissionNumber: "",
      fullName: studentName,
      gender: "MALE",
      classLevelId,
      streamId,
      admissionYear: 2026,
      status: "ACTIVE",
    });
    studentId = student.id;
    await setStudentSubjectRegistrations(student.id, academicYearId, [biologyId]);
  });

  it("creates, updates and clears marks and reports unmatched rows", async () => {
    const summary = await importMarks(
      examId,
      workbook([
        {
          rowNumber: 6,
          fullName: studentName,
          gender: "MALE",
          className: "FORM 1",
          streamName: "A",
          scores: { [BIOLOGY]: "72.5", [CHEMISTRY]: "", "NOT A SUBJECT": "10" },
        },
        {
          rowNumber: 7,
          fullName: "Ghost Student",
          gender: "MALE",
          className: "FORM 1",
          streamName: "A",
          scores: { [BIOLOGY]: "10" },
        },
      ], [BIOLOGY, CHEMISTRY, "NOT A SUBJECT"]),
    );

    expect(summary.created).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.issues.some((issue) => issue.error.includes("did not match a subject"))).toBe(true);

    const stored = await prisma.mark.findMany({ where: { examinationId: examId, studentId } });
    expect(stored).toHaveLength(1);
    expect(stored[0].subjectId).toBe(biologyId);
    expect(stored[0].score).toBe(72.5);

    const updated = await importMarks(
      examId,
      workbook([
        {
          rowNumber: 6,
          fullName: studentName,
          gender: "MALE",
          className: "FORM 1",
          streamName: "A",
          scores: { [BIOLOGY]: "88" },
        },
      ]),
    );
    expect(updated.updated).toBe(1);
    expect(updated.created).toBe(0);
    expect(updated.cleared).toBe(0);

    const cleared = await importMarks(
      examId,
      workbook([
        {
          rowNumber: 6,
          fullName: studentName,
          gender: "MALE",
          className: "FORM 1",
          streamName: "A",
          scores: { [BIOLOGY]: "" },
        },
      ]),
    );
    expect(cleared.cleared).toBe(1);
    expect(await prisma.mark.count({ where: { examinationId: examId, studentId } })).toBe(0);
  });

  it("skips scores for subjects the student is not registered for", async () => {
    const summary = await importMarks(
      examId,
      workbook([
        {
          rowNumber: 6,
          fullName: studentName,
          gender: "MALE",
          className: "FORM 1",
          streamName: "A",
          scores: { [BIOLOGY]: "50", [CHEMISTRY]: "40" },
        },
      ]),
    );

    expect(summary.created).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.issues.some((issue) => issue.error.includes("not registered"))).toBe(true);
    expect(
      await prisma.mark.count({ where: { examinationId: examId, studentId, subjectId: chemistryId } }),
    ).toBe(0);
  });

  it("rejects a score outside the valid range", async () => {
    const summary = await importMarks(
      examId,
      workbook([
        {
          rowNumber: 6,
          fullName: studentName,
          gender: "MALE",
          className: "FORM 1",
          streamName: "A",
          scores: { [BIOLOGY]: "150" },
        },
      ]),
    );
    expect(summary.failed).toBe(1);
    expect(summary.created).toBe(0);
    expect(summary.issues.some((issue) => issue.error.includes("not a valid"))).toBe(true);
  });

  it("rejects imports for a closed examination", async () => {
    const type = await createExaminationType({ name: "IMPORT CLOSED TYPE", status: "ACTIVE" });
    const closed = await prisma.examination.create({
      data: {
        schoolId,
        typeId: type.id,
        academicYearId,
        classLevelId,
        term: "TERM 1",
        status: "CLOSED",
      },
    });

    await expect(
      importMarks(
        closed.id,
        workbook([
          {
            rowNumber: 6,
            fullName: studentName,
            gender: "MALE",
            className: "FORM 1",
            streamName: "A",
            scores: { [BIOLOGY]: "70" },
          },
        ]),
      ),
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe("clear marks", () => {
  let examId: string;
  let subjectXId: string;
  let subjectYId: string;
  let streamAId: string;
  let streamBId: string;
  let studentAId: string;
  let studentBId: string;

  beforeAll(async () => {
    const type = await createExaminationType({ name: "CLEAR EXAM TYPE", status: "ACTIVE" });
    const exam = await prisma.examination.create({
      data: {
        schoolId,
        typeId: type.id,
        academicYearId,
        classLevelId,
        term: "TERM 2",
        name: "Clear Exam",
        status: "OPEN",
      },
    });
    examId = exam.id;

    const subjectX = await prisma.subject.create({
      data: { schoolId, name: "CLEAR MATH", code: "CLR-M" },
    });
    const subjectY = await prisma.subject.create({
      data: { schoolId, name: "CLEAR ENGLISH", code: "CLR-E" },
    });
    subjectXId = subjectX.id;
    subjectYId = subjectY.id;

    streamAId = streamId;
    const streamB = await prisma.stream.create({
      data: { schoolId, name: "CLEAR-B", sortOrder: 9, status: "ACTIVE" },
    });
    streamBId = streamB.id;
    await prisma.classStream.create({
      data: { schoolId, classLevelId, streamId: streamB.id, status: "ACTIVE" },
    });

    const studentA = await createStudent({
      admissionNumber: "",
      fullName: "Clear Student A",
      gender: "MALE",
      classLevelId,
      streamId: streamAId,
      admissionYear: 2026,
      status: "ACTIVE",
    });
    studentAId = studentA.id;
    const studentB = await createStudent({
      admissionNumber: "",
      fullName: "Clear Student B",
      gender: "FEMALE",
      classLevelId,
      streamId: streamBId,
      admissionYear: 2026,
      status: "ACTIVE",
    });
    studentBId = studentB.id;

    await setStudentSubjectRegistrations(studentAId, academicYearId, [subjectXId, subjectYId]);
    await setStudentSubjectRegistrations(studentBId, academicYearId, [subjectXId, subjectYId]);
  });

  it("clears marks for the selected subjects and streams only", async () => {
    await prisma.mark.createMany({
      data: [studentAId, studentBId].flatMap((studentId) => [
        { schoolId, examinationId: examId, studentId, subjectId: subjectXId, score: 60 },
        { schoolId, examinationId: examId, studentId, subjectId: subjectYId, score: 70 },
      ]),
    });
    expect(await prisma.mark.count({ where: { examinationId: examId } })).toBe(4);

    const first = await clearMarks({
      examinationId: examId,
      subjectIds: [subjectXId],
      streamIds: [streamAId],
    });
    expect(first.cleared).toBe(1);
    let remaining = await prisma.mark.findMany({
      where: { examinationId: examId },
      select: { studentId: true, subjectId: true },
    });
    expect(remaining).toHaveLength(3);
    expect(
      remaining.some((mark) => mark.studentId === studentAId && mark.subjectId === subjectXId),
    ).toBe(false);

    const second = await clearMarks({
      examinationId: examId,
      subjectIds: [subjectXId, subjectYId],
      streamIds: [streamBId],
    });
    expect(second.cleared).toBe(2);
    remaining = await prisma.mark.findMany({ where: { examinationId: examId } });
    expect(remaining).toHaveLength(1);

    const third = await clearMarks({ examinationId: examId, subjectIds: [subjectXId, subjectYId] });
    expect(third.cleared).toBe(1);
    expect(await prisma.mark.count({ where: { examinationId: examId } })).toBe(0);
  });

  it("requires a subject and refuses a closed or unknown examination", async () => {
    await expect(clearMarks({ examinationId: examId, subjectIds: [] })).rejects.toBeInstanceOf(AppError);

    const type = await createExaminationType({ name: "CLEAR CLOSED TYPE", status: "ACTIVE" });
    const closed = await prisma.examination.create({
      data: {
        schoolId,
        typeId: type.id,
        academicYearId,
        classLevelId,
        term: "TERM 2",
        status: "CLOSED",
      },
    });

    await expect(
      clearMarks({ examinationId: closed.id, subjectIds: [subjectXId] }),
    ).rejects.toBeInstanceOf(AppError);
    await expect(
      clearMarks({ examinationId: "missing-examination", subjectIds: [subjectXId] }),
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe("system logo", () => {
  it("stores, reads back and clears the system logo URL", async () => {
    expect(await getSystemLogoUrl()).toBeNull();

    await updateSystemLogo("/uploads/system-logo.png");
    expect(await getSystemLogoUrl()).toBe("/uploads/system-logo.png");

    await updateSystemLogo("/uploads/system-logo.svg");
    expect(await getSystemLogoUrl()).toBe("/uploads/system-logo.svg");

    await updateSystemLogo(null);
    expect(await getSystemLogoUrl()).toBeNull();
  });
});

describe("head master signature", () => {
  it("stores, reads back and clears the signature URL", async () => {
    expect(await getHeadMasterSignatureUrl()).toBeNull();

    await updateHeadMasterSignature("/uploads/head-master-signature.png");
    expect(await getHeadMasterSignatureUrl()).toBe("/uploads/head-master-signature.png");

    await updateHeadMasterSignature("/uploads/head-master-signature.svg");
    expect(await getHeadMasterSignatureUrl()).toBe("/uploads/head-master-signature.svg");

    await updateHeadMasterSignature(null);
    expect(await getHeadMasterSignatureUrl()).toBeNull();
  });
});

describe("sidebar theme", () => {
  it("stores, reads back and clears the sidebar colour and opacity", async () => {
    expect(await getSidebarTheme()).toEqual(DEFAULT_SIDEBAR_THEME);

    await updateSidebarTheme({ color: "#1e3a8a", opacity: 40 });
    expect(await getSidebarTheme()).toEqual({ color: "#1e3a8a", opacity: 40 });

    await updateSidebarTheme({ color: "#FAFAFA", opacity: 120 });
    expect(await getSidebarTheme()).toEqual({ color: "#fafafa", opacity: 100 });

    await updateSidebarTheme(DEFAULT_SIDEBAR_THEME);
    expect(await getSidebarTheme()).toEqual(DEFAULT_SIDEBAR_THEME);
  });
});

describe("formatReportDate", () => {
  it("formats dates as Weekday/DD/Month/YYYY", () => {
    expect(formatReportDate(new Date("2026-06-05T00:00:00.000Z"))).toBe("Friday/05/June/2026");
    expect(formatReportDate(null)).toBe("—");
  });
});

describe("report service", () => {
  let reportExamId: string;
  let reportStudent1Id: string;
  let reportStudent2Id: string;
  let subjectId1: string;
  let subjectId2: string;
  let subjectId3: string;
  let subjectId4: string;

  beforeAll(async () => {
    await saveGradingConfig({
      passMark: 40,
      divisionSubjects: 3,
      grades: [
        { code: "A", minScore: 75, maxScore: 100, points: 1, remark: "Excellent" },
        { code: "B", minScore: 65, maxScore: 74, points: 2, remark: "Very Good" },
        { code: "C", minScore: 55, maxScore: 64, points: 3, remark: "Good" },
        { code: "D", minScore: 45, maxScore: 54, points: 4, remark: "Satisfactory" },
        { code: "F", minScore: 0, maxScore: 44, points: 5, remark: "Poor" },
      ],
      divisions: [
        { code: "I", minPoints: 3, maxPoints: 4 },
        { code: "II", minPoints: 5, maxPoints: 6 },
        { code: "III", minPoints: 7, maxPoints: 9 },
        { code: "IV", minPoints: 10, maxPoints: 12 },
        { code: "0", minPoints: 13, maxPoints: 15 },
      ],
    });

    const reportClass = await prisma.classLevel.create({
      data: { schoolId, name: "FORM 4 REPORT", sortOrder: 4, status: "ACTIVE" },
    });
    const reportStream = await prisma.stream.create({
      data: { schoolId, name: "RPT", sortOrder: 9, status: "ACTIVE" },
    });

    const [s1, s2, s3, s4] = await Promise.all([
      prisma.subject.create({ data: { schoolId, name: "RPT SUBJECT 1", code: "RS1", status: "ACTIVE" } }),
      prisma.subject.create({ data: { schoolId, name: "RPT SUBJECT 2", code: "RS2", status: "ACTIVE" } }),
      prisma.subject.create({ data: { schoolId, name: "RPT SUBJECT 3", code: "RS3", status: "ACTIVE" } }),
      prisma.subject.create({ data: { schoolId, name: "RPT SUBJECT 4", code: "RS4", status: "ACTIVE" } }),
    ]);
    subjectId1 = s1.id;
    subjectId2 = s2.id;
    subjectId3 = s3.id;
    subjectId4 = s4.id;

    const reportType = await createExaminationType({ name: "REPORT TYPE", status: "ACTIVE" });
    const exam = await prisma.examination.create({
      data: {
        schoolId,
        typeId: reportType.id,
        academicYearId,
        classLevelId: reportClass.id,
        term: "TERM 1",
        name: "Report Exam",
        status: "OPEN",
      },
    });
    reportExamId = exam.id;

    const makeStudent = (index: number) =>
      prisma.student.create({
        data: {
          schoolId,
          studentNumber: `TSS/2026/RPT${index}`,
          fullName: `Report Student ${index}`,
          gender: index % 2 === 0 ? "FEMALE" : "MALE",
          classLevelId: reportClass.id,
          streamId: reportStream.id,
          admissionYear: 2026,
          status: "ACTIVE",
        },
      });

    const [st1, st2, st3] = await Promise.all([makeStudent(1), makeStudent(2), makeStudent(3)]);
    reportStudent1Id = st1.id;
    reportStudent2Id = st2.id;

    const subjects = [subjectId1, subjectId2, subjectId3, subjectId4];
    for (const student of [st1, st2, st3]) {
      for (const subjectId of subjects) {
        await prisma.studentSubjectRegistration.create({
          data: { schoolId, studentId: student.id, subjectId, academicYearId },
        });
      }
    }

    const marks: { studentId: string; subjectId: string; score: number }[] = [
      // Student 1: 4 graded subjects → best 3 points = 1 + 2 + 4 = 7 (Division III)
      { studentId: st1.id, subjectId: subjectId1, score: 80 },
      { studentId: st1.id, subjectId: subjectId2, score: 65 },
      { studentId: st1.id, subjectId: subjectId3, score: 45 },
      { studentId: st1.id, subjectId: subjectId4, score: 20 },
      // Student 2: 3 graded subjects → points 4 + 4 + 3 = 11 (Division IV)
      { studentId: st2.id, subjectId: subjectId1, score: 50 },
      { studentId: st2.id, subjectId: subjectId2, score: 45 },
      { studentId: st2.id, subjectId: subjectId3, score: 60 },
      // Student 3: only 1 graded subject → INC
      { studentId: st3.id, subjectId: subjectId1, score: 70 },
    ];
    for (const mark of marks) {
      await prisma.mark.create({ data: { schoolId, examinationId: exam.id, ...mark } });
    }

    const schedule = await getTermSchedule();
    const firstTerm = schedule!.terms[0];
    await prisma.term.update({
      where: { id: firstTerm.id },
      data: { startDate: new Date("2026-01-05T00:00:00.000Z"), endDate: new Date("2026-06-12T00:00:00.000Z") },
    });
    await prisma.term.update({
      where: { id: schedule!.terms[1].id },
      data: { startDate: new Date("2026-07-05T00:00:00.000Z"), endDate: new Date("2026-12-04T00:00:00.000Z") },
    });
  });

  it("computes grades, best-N points, division and position for the whole class", async () => {
    const report = await getExaminationReport(reportExamId);
    expect(report).not.toBeNull();
    expect(report!.requiredSubjects).toBe(3);
    expect(report!.students.map((c) => c.student.fullName)).toEqual([
      "Report Student 1",
      "Report Student 2",
      "Report Student 3",
    ]);

    const [first, second, third] = report!.students;
    expect(first.totalMarks).toBe(210);
    expect(first.average).toBe(52.5);
    expect(first.averageGrade).toBe("D");
    expect(first.gradedSubjects).toBe(4);
    expect(first.totalPoints).toBe(7);
    expect(first.division).toBe("III");
    expect(first.position).toBe(1);
    expect(first.classSize).toBe(3);
    // SUBJECT 4 (F, 5 points) is dropped when keeping the best 3.
    expect(first.subjects.find((s) => s.subjectId === subjectId4)?.counted).toBe(false);
    expect(first.subjects.filter((s) => s.counted)).toHaveLength(3);

    expect(second.totalPoints).toBe(11);
    expect(second.division).toBe("IV");
    expect(second.position).toBe(2);

    expect(third.gradedSubjects).toBe(1);
    expect(third.totalPoints).toBe(2);
    expect(third.division).toBe("INC");
    expect(third.position).toBe(3);
  });

  it("lists examinations for reporting", async () => {
    const list = await listReportExaminations();
    const entry = list.find((exam) => exam.id === reportExamId);
    expect(entry).toBeDefined();
    expect(entry!.classLevelName).toBe("FORM 4 REPORT");
  });

  it("auto-fills remarks and persists overrides", async () => {
    const before = await getStudentReport(reportExamId, reportStudent1Id);
    expect(before!.students[0].remarksSaved).toBe(false);
    expect(before!.students[0].remarks.academicMaster.length).toBeGreaterThan(0);

    await saveReportRemarks({
      examinationId: reportExamId,
      studentId: reportStudent1Id,
      academicMaster: "Custom academic remark",
      headMaster: "Custom head remark",
    });

    const after = await getStudentReport(reportExamId, reportStudent1Id);
    expect(after!.students[0].remarksSaved).toBe(true);
    expect(after!.students[0].remarks.academicMaster).toBe("Custom academic remark");
    expect(after!.students[0].remarks.headMaster).toBe("Custom head remark");
    expect(after!.students[0].classSize).toBe(3);

    await expect(
      saveReportRemarks({
        examinationId: "missing-examination",
        studentId: reportStudent1Id,
        academicMaster: "",
        headMaster: "",
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("auto-fills remarks from the remarks configured for the average grade", async () => {
    await saveGradeRemarks({
      grades: [
        {
          code: "D",
          academicMasterRemark: "Configured remark for average grade D",
          headMasterRemark: "Configured head remark for average grade D",
        },
      ],
    });

    const report = await getStudentReport(reportExamId, reportStudent2Id);
    expect(report).not.toBeNull();
    const card = report!.students[0];
    expect(card.averageGrade).toBe("D");
    expect(card.remarks.academicMaster).toBe("Configured remark for average grade D");
    expect(card.remarks.headMaster).toBe("Configured head remark for average grade D");
  });

  it("resolves the term break for the examination's term", async () => {
    const schoolBreak = await getExaminationBreak(reportExamId);
    expect(schoolBreak.closesOn).toEqual(new Date("2026-06-12T00:00:00.000Z"));
    expect(schoolBreak.reopensOn).toEqual(new Date("2026-07-05T00:00:00.000Z"));
    expect(schoolBreak.holidayLength).toMatch(/Week|Day/);
  });

  it("formats report dates in the template style", () => {
    expect(formatReportDate(new Date("2026-06-12T00:00:00.000Z"))).toBe("Friday/12/June/2026");
  });
});

describe("marks template download route", () => {
  let routeExamId: string;
  let routeSubjectAId: string;
  let routeSubjectBId: string;
  let routeStreamBId: string;

  beforeAll(async () => {
    const routeClass = await prisma.classLevel.create({
      data: { schoolId, name: "FORM 9 ROUTE", sortOrder: 9, status: "ACTIVE" },
    });
    const [routeStreamA, routeStreamB] = await Promise.all([
      prisma.stream.create({ data: { schoolId, name: "R", sortOrder: 10, status: "ACTIVE" } }),
      prisma.stream.create({ data: { schoolId, name: "S", sortOrder: 11, status: "ACTIVE" } }),
    ]);
    routeStreamBId = routeStreamB.id;

    const [subjectA, subjectB] = await Promise.all([
      prisma.subject.create({ data: { schoolId, name: "ROUTE SUBJECT A", code: "RTEA", status: "ACTIVE" } }),
      prisma.subject.create({ data: { schoolId, name: "ROUTE SUBJECT B", code: "RTEB", status: "ACTIVE" } }),
    ]);
    routeSubjectAId = subjectA.id;
    routeSubjectBId = subjectB.id;

    const studentA = await prisma.student.create({
      data: {
        schoolId,
        studentNumber: "TSS/2026/RTEA",
        fullName: "Route Student A",
        gender: "FEMALE",
        classLevelId: routeClass.id,
        streamId: routeStreamA.id,
        admissionYear: 2026,
        status: "ACTIVE",
      },
    });
    const studentB = await prisma.student.create({
      data: {
        schoolId,
        studentNumber: "TSS/2026/RTEB",
        fullName: "Route Student B",
        gender: "MALE",
        classLevelId: routeClass.id,
        streamId: routeStreamB.id,
        admissionYear: 2026,
        status: "ACTIVE",
      },
    });

    await prisma.studentSubjectRegistration.create({
      data: { schoolId, studentId: studentA.id, subjectId: routeSubjectAId, academicYearId },
    });
    await prisma.studentSubjectRegistration.create({
      data: { schoolId, studentId: studentB.id, subjectId: routeSubjectBId, academicYearId },
    });

    const routeType = await createExaminationType({ name: "ROUTE TYPE", status: "ACTIVE" });
    const exam = await prisma.examination.create({
      data: {
        schoolId,
        typeId: routeType.id,
        academicYearId,
        classLevelId: routeClass.id,
        term: "TERM 1",
        name: "Route Subject Exam",
        status: "OPEN",
      },
    });
    routeExamId = exam.id;

    await prisma.mark.create({
      data: { schoolId, examinationId: exam.id, studentId: studentA.id, subjectId: routeSubjectAId, score: 55 },
    });
  });

  async function loadSheet(url: string) {
    const response = await getMarksTemplate(new Request(url));
    return response;
  }

  it("includes only the students taking the subject when one subject is selected", async () => {
    const response = await loadSheet(
      `http://test/api/marks-entry/template?examinationId=${routeExamId}&subjects=${routeSubjectAId}`,
    );
    expect(response.status).toBe(200);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(await response.arrayBuffer()) as unknown as ArrayBuffer);
    const sheet = workbook.getWorksheet("Marks")!;

    expect(sheet.getCell(5, 6).value).toBe("ROUTE SUBJECT A");
    expect(sheet.getCell(6, 2).value).toBe("Route Student A");
    expect(sheet.getCell(6, 6).value).toBe(55);
    // The student registered for the other subject is omitted entirely.
    expect(sheet.getCell(7, 2).value ?? "").toBe("");
  });

  it("lists every student with locked cells when several subjects are selected", async () => {
    const response = await loadSheet(
      `http://test/api/marks-entry/template?examinationId=${routeExamId}&subjects=${routeSubjectAId},${routeSubjectBId}`,
    );
    expect(response.status).toBe(200);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(await response.arrayBuffer()) as unknown as ArrayBuffer);
    const sheet = workbook.getWorksheet("Marks")!;

    expect(sheet.getCell(5, 6).value).toBe("ROUTE SUBJECT A");
    expect(sheet.getCell(5, 7).value).toBe("ROUTE SUBJECT B");
    expect(sheet.getCell(6, 2).value).toBe("Route Student A");
    expect(sheet.getCell(7, 2).value).toBe("Route Student B");
    // Each student is missing the other subject, so those cells are locked.
    expect(sheet.getCell(6, 7).protection?.locked).not.toBe(false);
    expect(sheet.getCell(7, 6).protection?.locked).not.toBe(false);
    expect(sheet.getCell(6, 6).protection?.locked).toBe(false);
    expect(sheet.getCell(7, 7).protection?.locked).toBe(false);
  });

  it("rejects a single subject the selected stream is not registered for", async () => {
    const response = await loadSheet(
      `http://test/api/marks-entry/template?examinationId=${routeExamId}&subjects=${routeSubjectAId}&streams=${routeStreamBId}`,
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { message: string };
    expect(body.message).toMatch(/no students are registered/i);
  });
});
