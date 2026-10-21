import "server-only";

import { DIVISION_CODES, GRADE_CODES } from "@/lib/constants";
import { prisma } from "@/lib/db/prisma";
import { getGradingConfig } from "@/lib/services/grading";
import { getPrimarySchool } from "@/lib/services/school";

type GradeBand = {
  code: string;
  minScore: number;
  maxScore: number;
  points: number;
  remark: string;
};

type DivisionBand = { code: string; minPoints: number; maxPoints: number };

export type ClassResultSubject = {
  subjectId: string;
  name: string;
  code: string | null;
  numericCode: string | null;
  score: number | null;
  grade: string | null;
};

export type ClassResultStudent = {
  studentId: string;
  fullName: string;
  studentNumber: string;
  gender: string;
  streamName: string;
  totalPoints: number;
  division: string;
  gradedSubjects: number;
  totalMarks: number;
  average: number;
  averageGrade: string | null;
  subjects: ClassResultSubject[];
  positionOverall: number;
  positionSex: number;
  attended: boolean;
};

export type DivisionBucket = { key: string; label: string };

export type DivisionRow = {
  key: string;
  label: string;
  counts: Record<string, number>;
  total: number;
};

export type ClassResultSubjectAnalysis = {
  subjectId: string;
  name: string;
  code: string | null;
  numericCode: string | null;
  registered: number;
  sat: number;
  absent: number;
  gradeCounts: Record<string, number>;
  passed: number;
  failed: number;
  average: number | null;
  gpa: number | null;
  grade: string | null;
  competency: string | null;
  rank: number;
};

export type ClassResults = {
  examination: {
    id: string;
    name: string;
    typeName: string;
    term: string | null;
    status: string;
    classLevelName: string;
    academicYearName: string;
  };
  passMark: number;
  requiredSubjects: number;
  headline: {
    gpa: number | null;
    average: number | null;
    grade: string | null;
    competency: string | null;
  };
  divisionBuckets: DivisionBucket[];
  divisionRows: DivisionRow[];
  divisionTotals: Record<string, number>;
  students: ClassResultStudent[];
  subjects: ClassResultSubjectAnalysis[];
  subjectCount: number;
};

function gradeFor(score: number, scale: GradeBand[]): GradeBand | null {
  return scale.find((band) => score >= band.minScore && score <= band.maxScore) ?? null;
}

function divisionFor(points: number, scale: DivisionBand[]): string {
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
function assignPositions(entries: { studentId: string; totalMarks: number }[]) {
  const positions = new Map<string, number>();
  const sorted = [...entries].sort((a, b) => b.totalMarks - a.totalMarks || a.studentId.localeCompare(b.studentId));
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

/**
 * Builds the whole-class results for an examination: a headline (class average,
 * GPA and grade), the division distribution by sex, the per-student results
 * table (division on the best N subjects, positions, per-subject detail) and a
 * per-subject analysis (registration/attendance, grade spread, pass/fail,
 * average, GPA, competency comment and rank).
 */
export async function getClassResults(examinationId: string): Promise<ClassResults | null> {
  const school = await getPrimarySchool();
  if (!school) return null;

  const exam = await prisma.examination.findFirst({
    where: { id: examinationId, schoolId: school.id },
    include: { type: true, academicYear: true, classLevel: true },
  });
  if (!exam) return null;

  const config = await getGradingConfig();
  const gradeScale: GradeBand[] = (config?.grades ?? []).map((grade) => ({
    code: grade.code,
    minScore: grade.minScore,
    maxScore: grade.maxScore,
    points: grade.points,
    remark: grade.remark,
  }));
  const divisionScale = config?.divisions ?? [];
  const requiredSubjects = config?.divisionSubjects ?? 7;
  const passMark = config?.passMark ?? 0;

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

  const studentIds = students.map((student) => student.id);
  const marks = studentIds.length
    ? await prisma.mark.findMany({
        where: { examinationId: exam.id, studentId: { in: studentIds } },
        select: { studentId: true, subjectId: true, score: true },
      })
    : [];

  const subjectIds = [
    ...new Set([
      ...marks.map((mark) => mark.subjectId),
      ...students.flatMap((student) => student.registrations.map((registration) => registration.subjectId)),
    ]),
  ];
  const subjects = subjectIds.length
    ? await prisma.subject.findMany({
        where: { id: { in: subjectIds } },
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true, numericCode: true },
      })
    : [];
  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));

  const markKey = (studentId: string, subjectId: string) => `${studentId}:${subjectId}`;
  const markByKey = new Map(marks.map((mark) => [markKey(mark.studentId, mark.subjectId), mark.score]));

  const cards: ClassResultStudent[] = students.map((student) => {
    const registeredIds = student.registrations.map((registration) => registration.subjectId);
    const markedIds = marks.filter((mark) => mark.studentId === student.id).map((mark) => mark.subjectId);
    const rows: ClassResultSubject[] = [];
    for (const subjectId of [...new Set([...registeredIds, ...markedIds])]) {
      const subject = subjectById.get(subjectId);
      if (!subject) continue;
      const score = markByKey.get(markKey(student.id, subjectId)) ?? null;
      const grade = score === null ? null : gradeFor(score, gradeScale);
      rows.push({
        subjectId,
        name: subject.name,
        code: subject.code,
        numericCode: subject.numericCode,
        score,
        grade: grade?.code ?? null,
      });
    }
    rows.sort((a, b) => a.name.localeCompare(b.name));

    const graded = rows.filter((row) => row.score !== null);
    const gradedCount = graded.length;
    const totalMarks = graded.reduce((sum, row) => sum + (row.score ?? 0), 0);
    const average = gradedCount ? round2(totalMarks / gradedCount) : 0;
    const averageGrade = gradedCount ? gradeFor(average, gradeScale)?.code ?? null : null;

    const totalPoints = graded
      .map((row) => gradeFor(row.score ?? 0, gradeScale)?.points ?? 0)
      .sort((a, b) => a - b)
      .slice(0, requiredSubjects)
      .reduce((sum, points) => sum + points, 0);
    const division =
      gradedCount === 0 ? "ABS" : gradedCount < requiredSubjects ? "INC" : divisionFor(totalPoints, divisionScale);

    return {
      studentId: student.id,
      fullName: student.fullName,
      studentNumber: student.studentNumber,
      gender: student.gender,
      streamName: student.stream.name,
      totalPoints,
      division,
      gradedSubjects: gradedCount,
      totalMarks,
      average,
      averageGrade,
      subjects: rows,
      positionOverall: 0,
      positionSex: 0,
      attended: gradedCount > 0,
    } satisfies ClassResultStudent;
  });

  // Positions are competition ranks over marks total (students who sat nothing are unranked).
  const attended = cards.filter((card) => card.attended);
  const overallPositions = assignPositions(
    attended.map((card) => ({ studentId: card.studentId, totalMarks: card.totalMarks })),
  );
  for (const gender of ["MALE", "FEMALE"]) {
    const sexEntries = attended
      .filter((card) => card.gender === gender)
      .map((card) => ({ studentId: card.studentId, totalMarks: card.totalMarks }));
    const sexPositions = assignPositions(sexEntries);
    for (const card of cards) {
      if (card.gender === gender) card.positionSex = sexPositions.get(card.studentId) ?? 0;
    }
  }
  for (const card of cards) card.positionOverall = overallPositions.get(card.studentId) ?? 0;

  const divisionBuckets: DivisionBucket[] = [
    ...DIVISION_CODES.map((code) => ({ key: code, label: code })),
    { key: "INC", label: "INC" },
    { key: "ABS", label: "ABS" },
  ];
  const divisionRows: DivisionRow[] = ["MALE", "FEMALE"].map((gender) => {
    const counts: Record<string, number> = {};
    for (const bucket of divisionBuckets) counts[bucket.key] = 0;
    let total = 0;
    for (const card of cards) {
      if (card.gender !== gender) continue;
      counts[card.division] = (counts[card.division] ?? 0) + 1;
      total += 1;
    }
    return { key: gender, label: gender, counts, total };
  });
  const divisionTotals: Record<string, number> = {};
  for (const bucket of divisionBuckets) {
    divisionTotals[bucket.key] = divisionRows.reduce((sum, row) => sum + (row.counts[bucket.key] ?? 0), 0);
  }
  divisionTotals.total = divisionRows.reduce((sum, row) => sum + row.total, 0);

  const subjectRows: ClassResultSubjectAnalysis[] = subjects.map((subject) => {
    const registered = students.reduce(
      (count, student) => count + (student.registrations.some((registration) => registration.subjectId === subject.id) ? 1 : 0),
      0,
    );
    const subjectMarks = marks.filter((mark) => mark.subjectId === subject.id);
    const gradeCounts: Record<string, number> = {};
    for (const code of GRADE_CODES) gradeCounts[code] = 0;
    let scoreSum = 0;
    let pointsSum = 0;
    let pointsCount = 0;
    let passed = 0;
    for (const mark of subjectMarks) {
      scoreSum += mark.score;
      const band = gradeFor(mark.score, gradeScale);
      if (band) {
        gradeCounts[band.code] = (gradeCounts[band.code] ?? 0) + 1;
        pointsSum += band.points;
        pointsCount += 1;
      }
      if (mark.score >= passMark) passed += 1;
    }
    const average = subjectMarks.length ? round2(scoreSum / subjectMarks.length) : null;
    const gpa = pointsCount ? round2(pointsSum / pointsCount) : null;
    const averageBand = average === null ? null : gradeFor(average, gradeScale);

    return {
      subjectId: subject.id,
      name: subject.name,
      code: subject.code,
      numericCode: subject.numericCode,
      registered,
      sat: subjectMarks.length,
      absent: Math.max(0, registered - subjectMarks.length),
      gradeCounts,
      passed,
      failed: subjectMarks.length - passed,
      average,
      gpa,
      grade: averageBand?.code ?? null,
      competency: averageBand?.remark ?? null,
      rank: 0,
    };
  });

  const rankedSubjects = subjectRows
    .filter((subject) => subject.average !== null)
    .sort((a, b) => (b.average as number) - (a.average as number) || a.name.localeCompare(b.name));
  rankedSubjects.forEach((subject, index) => {
    const previous = rankedSubjects[index - 1];
    subject.rank = previous && previous.average === subject.average ? previous.rank : index + 1;
  });

  let scoreSum = 0;
  let pointsSum = 0;
  let pointsCount = 0;
  for (const mark of marks) {
    scoreSum += mark.score;
    const band = gradeFor(mark.score, gradeScale);
    if (band) {
      pointsSum += band.points;
      pointsCount += 1;
    }
  }
  const classAverage = marks.length ? round2(scoreSum / marks.length) : null;
  const classGpa = pointsCount ? round2(pointsSum / pointsCount) : null;
  const classBand = classAverage === null ? null : gradeFor(classAverage, gradeScale);

  return {
    examination: {
      id: exam.id,
      name: exam.name ?? exam.type.name,
      typeName: exam.type.name,
      term: exam.term,
      status: exam.status,
      classLevelName: exam.classLevel.name,
      academicYearName: exam.academicYear.name,
    },
    passMark,
    requiredSubjects,
    headline: {
      gpa: classGpa,
      average: classAverage,
      grade: classBand?.code ?? null,
      competency: classBand?.remark ?? null,
    },
    divisionBuckets,
    divisionRows,
    divisionTotals,
    students: cards,
    subjects: subjectRows,
    subjectCount: subjectRows.length,
  };
}
