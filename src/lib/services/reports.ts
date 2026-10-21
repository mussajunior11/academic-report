import "server-only";

import { prisma } from "@/lib/db/prisma";
import { AppError, toFriendlyError } from "@/lib/errors";
import { getGradingConfig } from "@/lib/services/grading";
import { getPrimarySchool } from "@/lib/services/school";
import type { ReportRemarksInput } from "@/lib/validation/schemas";

type GradeScale = {
  code: string;
  minScore: number;
  maxScore: number;
  points: number;
  remark: string;
  academicMasterRemark: string;
  headMasterRemark: string;
};
type DivisionScale = { code: string; minPoints: number; maxPoints: number };

export type ReportSubjectRow = {
  subjectId: string;
  name: string;
  code: string | null;
  score: number | null;
  grade: string | null;
  points: number | null;
  /** Status label for the grade (e.g. "Poor"). */
  remark: string | null;
  /** True when this subject was counted towards the division points total. */
  counted: boolean;
};

export type ReportCard = {
  student: {
    id: string;
    fullName: string;
    studentNumber: string;
    admissionNumber: string | null;
    gender: string;
    classLevelName: string;
    streamName: string;
  };
  subjects: ReportSubjectRow[];
  totalMarks: number;
  average: number;
  averageGrade: string | null;
  totalPoints: number;
  division: string;
  position: number;
  classSize: number;
  gradedSubjects: number;
  requiredSubjects: number;
  remarks: { academicMaster: string; headMaster: string };
  remarksSaved: boolean;
};

export type ReportExaminationInfo = {
  id: string;
  title: string;
  name: string;
  typeName: string;
  term: string | null;
  status: string;
  classLevelName: string;
  academicYearName: string;
};

export type ExaminationReport = {
  examination: ReportExaminationInfo;
  gradeScale: GradeScale[];
  divisionScale: DivisionScale[];
  requiredSubjects: number;
  students: ReportCard[];
};

export type ReportExaminationSummary = {
  id: string;
  name: string;
  typeName: string;
  term: string | null;
  status: string;
  classLevelName: string;
  academicYearName: string;
  markCount: number;
  studentCount: number;
};

export type ReportBreak = {
  closesOn: Date | null;
  reopensOn: Date | null;
  holidayLength: string | null;
};

async function requireSchool() {
  const school = await getPrimarySchool();
  if (!school) {
    throw new AppError("No school is configured. Run `npm run db:seed` to set up the database.");
  }
  return school;
}

function gradeFor(score: number, scale: GradeScale[]): GradeScale | null {
  return scale.find((band) => score >= band.minScore && score <= band.maxScore) ?? null;
}

function divisionFor(points: number, scale: DivisionScale[]): string {
  const match = scale.find((band) => points >= band.minPoints && points <= band.maxPoints);
  if (match) return match.code;
  // Above every configured range → worst band; below → best band.
  const sorted = [...scale].sort((a, b) => a.minPoints - b.minPoints);
  if (sorted.length === 0) return "INC";
  if (points < (sorted[0]?.minPoints ?? 0)) return sorted[0]?.code ?? "INC";
  return sorted[sorted.length - 1]?.code ?? "INC";
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Competition ranking: equal totals share a rank, the next distinct total skips. */
function assignPositions(totals: { studentId: string; totalMarks: number }[]) {
  const positions = new Map<string, number>();
  const sorted = [...totals].sort((a, b) => b.totalMarks - a.totalMarks || a.studentId.localeCompare(b.studentId));
  let rank = 0;
  let previous: number | null = null;
  sorted.forEach((entry, index) => {
    if (previous === null || entry.totalMarks !== previous) {
      rank = index + 1;
      previous = entry.totalMarks;
    }
    positions.set(entry.studentId, rank);
  });
  return positions;
}

function suggestionFor(card: Pick<ReportCard, "division" | "totalPoints" | "average" | "gradedSubjects" | "requiredSubjects">) {
  const { division, totalPoints, average } = card;
  const summary = `${card.gradedSubjects} of ${card.requiredSubjects} required subjects graded · average ${average}% · ${totalPoints} points.`;
  if (division === "INC") {
    return {
      academicMaster: `Results are incomplete — ${summary} A division will be awarded once the required subjects are graded.`,
      headMaster: "Complete all required subjects so a division can be determined.",
    };
  }
  if (division === "I" || division === "II") {
    return {
      academicMaster: `Congratulations on a strong performance: Division ${division}. ${summary}`,
      headMaster: "Excellent work — maintain this standard in the next examination.",
    };
  }
  if (division === "III") {
    return {
      academicMaster: `A fair performance: Division ${division}. ${summary} More consistent effort is needed.`,
      headMaster: "There is clear room for improvement. Work harder next term.",
    };
  }
  return {
    academicMaster: `Weak performance: Division ${division}. ${summary} Serious extra effort is required.`,
    headMaster: "You must improve significantly. Seek help and study diligently.",
  };
}

/**
 * Builds the complete report for every active student in an examination's class:
 * per-subject grades, marks totals, points-based division (best N subjects), and
 * whole-class position. Unregistered subjects are excluded; subjects without a
 * mark never contribute points.
 */
async function buildExaminationReport(examinationId: string): Promise<ExaminationReport | null> {
  const school = await getPrimarySchool();
  if (!school) return null;

  const exam = await prisma.examination.findFirst({
    where: { id: examinationId, schoolId: school.id },
    include: { type: true, academicYear: true, classLevel: true },
  });
  if (!exam) return null;

  const config = await getGradingConfig();
  const gradeScale = config?.grades ?? [];
  const divisionScale = config?.divisions ?? [];
  const requiredSubjects = config?.divisionSubjects ?? 7;

  const students = await prisma.student.findMany({
    where: {
      schoolId: school.id,
      archivedAt: null,
      status: "ACTIVE",
      classLevelId: exam.classLevelId,
    },
    orderBy: { fullName: "asc" },
    include: {
      stream: true,
      registrations: { where: { academicYearId: exam.academicYearId }, select: { subjectId: true } },
    },
  });

  const studentIds = students.map((s) => s.id);
  const marks = studentIds.length
    ? await prisma.mark.findMany({
        where: { examinationId: exam.id, studentId: { in: studentIds } },
        select: { studentId: true, subjectId: true, score: true },
      })
    : [];

  const subjectIds = [...new Set([
    ...marks.map((m) => m.subjectId),
    ...students.flatMap((s) => s.registrations.map((r) => r.subjectId)),
  ])];
  const subjects = subjectIds.length
    ? await prisma.subject.findMany({
        where: { id: { in: subjectIds } },
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true },
      })
    : [];
  const subjectById = new Map(subjects.map((s) => [s.id, s]));

  const markKey = (studentId: string, subjectId: string) => `${studentId}:${subjectId}`;
  const markByKey = new Map(marks.map((m) => [markKey(m.studentId, m.subjectId), m.score]));

  const remarks = studentIds.length
    ? await prisma.reportRemark.findMany({
        where: { examinationId: exam.id, studentId: { in: studentIds } },
      })
    : [];
  const remarkByStudent = new Map(remarks.map((r) => [r.studentId, r]));

  const cards = students.map((student) => {
    const rows: ReportSubjectRow[] = [];
    for (const registration of student.registrations) {
      const subject = subjectById.get(registration.subjectId);
      if (!subject) continue;
      const score = markByKey.get(markKey(student.id, registration.subjectId)) ?? null;
      const grade = score === null ? null : gradeFor(score, gradeScale);
      rows.push({
        subjectId: subject.id,
        name: subject.name,
        code: subject.code,
        score,
        grade: grade?.code ?? null,
        points: grade ? grade.points : null,
        remark: grade?.remark ?? null,
        counted: false,
      });
    }
    rows.sort((a, b) => a.name.localeCompare(b.name));

    const graded = rows.filter((row) => row.score !== null && row.points !== null);
    const gradedCount = graded.length;
    const totalMarks = graded.reduce((sum, row) => sum + (row.score ?? 0), 0);
    const average = gradedCount ? round2(totalMarks / gradedCount) : 0;
    const averageGrade = gradedCount ? gradeFor(average, gradeScale)?.code ?? null : null;

    const enough = gradedCount >= requiredSubjects;
    const counted = enough
      ? [...graded].sort((a, b) => (a.points ?? 0) - (b.points ?? 0)).slice(0, requiredSubjects)
      : graded;
    const countedIds = new Set(counted.map((row) => row.subjectId));
    for (const row of rows) row.counted = countedIds.has(row.subjectId);
    const totalPoints = counted.reduce((sum, row) => sum + (row.points ?? 0), 0);
    const division = enough ? divisionFor(totalPoints, divisionScale) : "INC";

    const saved = remarkByStudent.get(student.id);
    const suggestion = suggestionFor({
      division,
      totalPoints,
      average,
      gradedSubjects: gradedCount,
      requiredSubjects,
    });

    // Remarks configured per average grade take precedence over the generated
    // suggestion; a saved per-student remark overrides both.
    const averageBand = averageGrade ? gradeScale.find((band) => band.code === averageGrade) ?? null : null;
    const configuredAcademic = averageBand?.academicMasterRemark.trim() ?? "";
    const configuredHead = averageBand?.headMasterRemark.trim() ?? "";

    return {
      student: {
        id: student.id,
        fullName: student.fullName,
        studentNumber: student.studentNumber,
        admissionNumber: student.admissionNumber,
        gender: student.gender,
        classLevelName: exam.classLevel.name,
        streamName: student.stream.name,
      },
      subjects: rows,
      totalMarks,
      average,
      averageGrade,
      totalPoints,
      division,
      position: 0,
      classSize: 0,
      gradedSubjects: gradedCount,
      requiredSubjects,
      remarks: {
        academicMaster: saved?.academicMaster?.trim() || configuredAcademic || suggestion.academicMaster,
        headMaster: saved?.headMaster?.trim() || configuredHead || suggestion.headMaster,
      },
      remarksSaved: Boolean(saved),
    } satisfies ReportCard;
  });

  const ranked = cards.filter((card) => card.gradedSubjects > 0);
  const positions = assignPositions(ranked.map((card) => ({ studentId: card.student.id, totalMarks: card.totalMarks })));
  for (const card of cards) {
    card.position = positions.get(card.student.id) ?? 0;
    card.classSize = ranked.length;
  }

  return {
    examination: {
      id: exam.id,
      title: `${exam.classLevel.name} ${exam.type.name} ${exam.academicYear.name} EXAMINATION RESULTS`,
      name: exam.name ?? exam.type.name,
      typeName: exam.type.name,
      term: exam.term,
      status: exam.status,
      classLevelName: exam.classLevel.name,
      academicYearName: exam.academicYear.name,
    },
    gradeScale,
    divisionScale,
    requiredSubjects,
    students: cards,
  };
}

/** The full examination report (used by the reports list page). */
export async function getExaminationReport(examinationId: string): Promise<ExaminationReport | null> {
  return buildExaminationReport(examinationId);
}

/** A single student's report card within an examination. */
export async function getStudentReport(examinationId: string, studentId: string): Promise<ExaminationReport | null> {
  const report = await buildExaminationReport(examinationId);
  if (!report) return null;
  const student = report.students.find((card) => card.student.id === studentId);
  if (!student) return null;
  return { ...report, students: [student] };
}

/** All examinations available for reporting, newest first. */
export async function listReportExaminations(): Promise<ReportExaminationSummary[]> {
  const school = await getPrimarySchool();
  if (!school) return [];
  const examinations = await prisma.examination.findMany({
    where: { schoolId: school.id },
    orderBy: [{ createdAt: "desc" }],
    include: {
      type: true,
      academicYear: true,
      classLevel: true,
      _count: { select: { marks: true } },
    },
  });
  const results: ReportExaminationSummary[] = [];
  for (const exam of examinations) {
    const studentCount = await prisma.student.count({
      where: { schoolId: school.id, archivedAt: null, status: "ACTIVE", classLevelId: exam.classLevelId },
    });
    results.push({
      id: exam.id,
      name: exam.name ?? exam.type.name,
      typeName: exam.type.name,
      term: exam.term,
      status: exam.status,
      classLevelName: exam.classLevel.name,
      academicYearName: exam.academicYear.name,
      markCount: exam._count.marks,
      studentCount,
    });
  }
  return results;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Formats a date as "Friday/05/June/2026" for the report header. */
export function formatReportDate(date: Date | null): string {
  if (!date) return "—";
  return `${WEEKDAYS[date.getUTCDay()]}/${String(date.getUTCDate()).padStart(2, "0")}/${MONTHS[date.getUTCMonth()]}/${date.getUTCFullYear()}`;
}

/**
 * Resolves the end-of-term break for an examination: the closing date of the
 * examination's term/quarter and the opening date of the next period.
 */
export async function getExaminationBreak(examinationId: string): Promise<ReportBreak> {
  const school = await getPrimarySchool();
  if (!school) return { closesOn: null, reopensOn: null, holidayLength: null };

  const exam = await prisma.examination.findFirst({
    where: { id: examinationId, schoolId: school.id },
    select: { term: true, academicYearId: true },
  });
  if (!exam) return { closesOn: null, reopensOn: null, holidayLength: null };

  const terms = await prisma.term.findMany({
    where: { academicYearId: exam.academicYearId },
    orderBy: { sequence: "asc" },
    include: { quarters: { orderBy: { sequence: "asc" } } },
  });
  if (terms.length === 0) return { closesOn: null, reopensOn: null, holidayLength: null };

  let closesOn: Date | null = null;
  let reopensOn: Date | null = null;

  const [termName, periodName] = (exam.term ?? "").split(" ");
  if (termName === "QUARTER") {
    const termIndex = (Number(periodName) - 1) % 2;
    const term = terms[Math.min(termIndex, terms.length - 1)];
    const quarterIndex = Number(periodName) <= 2 ? Number(periodName) - 1 : Number(periodName) - 3;
    closesOn = term?.quarters[quarterIndex]?.endDate ?? null;
    reopensOn = term?.quarters[quarterIndex + 1]?.startDate ?? terms[termIndex + 1]?.quarters[0]?.startDate ?? null;
  } else {
    const index = exam.term?.includes("2") ? 1 : 0;
    closesOn = terms[index]?.endDate ?? null;
    reopensOn = terms[index + 1]?.startDate ?? null;
  }

  let holidayLength: string | null = null;
  if (closesOn && reopensOn) {
    const days = Math.round((reopensOn.getTime() - closesOn.getTime()) / 86_400_000);
    const weeks = Math.floor(days / 7);
    const remainder = days % 7;
    const parts: string[] = [];
    if (weeks > 0) parts.push(`${weeks} ${weeks === 1 ? "Week" : "Weeks"}`);
    if (remainder > 0) parts.push(`${remainder} ${remainder === 1 ? "Day" : "Days"}`);
    holidayLength = parts.join(" and ") || "0 Days";
  }

  return { closesOn, reopensOn, holidayLength };
}

/** Saves (or clears) the printed remarks for a student's report card. */
export async function saveReportRemarks(input: ReportRemarksInput) {
  const school = await requireSchool();

  const exam = await prisma.examination.findFirst({
    where: { id: input.examinationId, schoolId: school.id },
    select: { id: true },
  });
  if (!exam) throw new AppError("Select a valid examination.");

  const student = await prisma.student.findFirst({
    where: { id: input.studentId, schoolId: school.id },
    select: { id: true },
  });
  if (!student) throw new AppError("Select a valid student.");

  const academicMaster = input.academicMaster.trim() || null;
  const headMaster = input.headMaster.trim() || null;

  try {
    await prisma.reportRemark.upsert({
      where: { examinationId_studentId: { examinationId: exam.id, studentId: student.id } },
      create: {
        schoolId: school.id,
        examinationId: exam.id,
        studentId: student.id,
        academicMaster,
        headMaster,
      },
      update: { academicMaster, headMaster },
    });
  } catch (error) {
    throw toFriendlyError(error);
  }
}
