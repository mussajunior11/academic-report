import "server-only";

import { prisma } from "@/lib/db/prisma";
import { GRADE_CODES } from "@/lib/constants";
import { getGradingConfig } from "@/lib/services/grading";
import { getPrimarySchool } from "@/lib/services/school";

export type SubjectPerformanceRow = {
  subjectId: string;
  name: string;
  code: string | null;
  numericCode: string | null;
  satMale: number;
  satFemale: number;
  satTotal: number;
  /** Mean grade points of sitters on the configured scale (A=1 … F=5; lower is better). */
  gpa: number | null;
  /** Subject rank by average score (1 = best), out of the subject count. */
  rank: number;
  /** Mean score of the students who sat the subject. */
  average: number | null;
  /** Count of sitters per grade code (A, B, C, D, F). */
  gradeCounts: Record<string, number>;
  /** Percentage of sitters scoring at or above the configured pass mark. */
  passRate: number | null;
};

export type SubjectPerformance = {
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
  subjectCount: number;
  rows: SubjectPerformanceRow[];
};

export type SubjectGradeDistributionRow = {
  code: string;
  male: number;
  female: number;
  total: number;
  /** Share of the subject's sitters, as a percentage. */
  percent: number;
};

export type SubjectMeritRow = {
  position: number;
  /** Position among sitters of the same sex (equal scores share a position). */
  genderPosition: number;
  studentId: string;
  fullName: string;
  studentNumber: string;
  gender: string;
  streamName: string;
  score: number;
  grade: string | null;
};

export type SubjectPerformanceDetail = {
  examination: SubjectPerformance["examination"];
  subject: { id: string; name: string; code: string | null; numericCode: string | null };
  passMark: number;
  subjectCount: number;
  stats: {
    satMale: number;
    satFemale: number;
    satTotal: number;
    average: number | null;
    gpa: number | null;
    rank: number;
    passed: number;
    failed: number;
    passRate: number | null;
    failRate: number | null;
  };
  gradeDistribution: SubjectGradeDistributionRow[];
  /** Every sitter ranked by score (best first); equal scores share a position. */
  ranking: SubjectMeritRow[];
};

type GradeBand = { code: string; minScore: number; maxScore: number; points: number };

type LoadedStudent = {
  id: string;
  fullName: string;
  studentNumber: string;
  gender: string;
  streamName: string;
};

type LoadedMark = { studentId: string; subjectId: string; score: number };

type LoadedSubject = { id: string; name: string; code: string | null; numericCode: string | null };

type PerformanceData = {
  examination: SubjectPerformance["examination"];
  gradeScale: GradeBand[];
  passMark: number;
  students: LoadedStudent[];
  marks: LoadedMark[];
  subjects: LoadedSubject[];
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Loads everything the subject-level reports need for one examination, once. */
async function loadPerformanceData(examinationId: string): Promise<PerformanceData | null> {
  const school = await getPrimarySchool();
  if (!school) return null;

  const exam = await prisma.examination.findFirst({
    where: { id: examinationId, schoolId: school.id },
    include: { type: true, academicYear: true, classLevel: true },
  });
  if (!exam) return null;

  const config = await getGradingConfig();
  const gradeScale: GradeBand[] = config?.grades ?? [];
  const passMark = config?.passMark ?? 0;

  const students: LoadedStudent[] = (
    await prisma.student.findMany({
      where: { schoolId: school.id, archivedAt: null, status: "ACTIVE", classLevelId: exam.classLevelId },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, studentNumber: true, gender: true, stream: { select: { name: true } } },
    })
  ).map((student) => ({
    id: student.id,
    fullName: student.fullName,
    studentNumber: student.studentNumber,
    gender: student.gender,
    streamName: student.stream.name,
  }));

  const studentIds = students.map((student) => student.id);
  const marks: LoadedMark[] = studentIds.length
    ? await prisma.mark.findMany({
        where: { examinationId: exam.id, studentId: { in: studentIds } },
        select: { studentId: true, subjectId: true, score: true },
      })
    : [];

  const subjectIds = [...new Set(marks.map((mark) => mark.subjectId))];
  const subjects: LoadedSubject[] = subjectIds.length
    ? await prisma.subject.findMany({
        where: { id: { in: subjectIds } },
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true, numericCode: true },
      })
    : [];

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
    gradeScale,
    passMark,
    students,
    marks,
    subjects,
  };
}

/** Assigns competition ranks (best first) to a labelled list of averages. */
function assignRanks<T extends { average: number | null }>(entries: T[]): T[] {
  const sorted = [...entries].sort((a, b) => (b.average ?? -1) - (a.average ?? -1));
  let rank = 0;
  let previous: number | null | undefined;
  sorted.forEach((entry, index) => {
    if (previous === undefined || entry.average !== previous) {
      rank = index + 1;
      previous = entry.average;
    }
    (entry as T & { rank: number }).rank = rank;
  });
  return sorted;
}

/**
 * Subject-by-subject performance for an examination: how many students sat each
 * subject (split by sex), the mean score and mean grade points (GPA, A=1 … F=5,
 * lower is better), the grade distribution and the pass rate. Subjects with no
 * marks are omitted; subjects are ranked by average score.
 */
export async function getSubjectPerformance(examinationId: string): Promise<SubjectPerformance | null> {
  const data = await loadPerformanceData(examinationId);
  if (!data) return null;

  const { examination, gradeScale, passMark, students, marks, subjects } = data;
  const genderById = new Map(students.map((student) => [student.id, student.gender]));

  type Acc = {
    male: number;
    female: number;
    scoreSum: number;
    pointsSum: number;
    pointsCount: number;
    passed: number;
    gradeCounts: Record<string, number>;
  };
  const accBySubject = new Map<string, Acc>(
    subjects.map((subject) => [
      subject.id,
      { male: 0, female: 0, scoreSum: 0, pointsSum: 0, pointsCount: 0, passed: 0, gradeCounts: {} },
    ]),
  );

  const bandFor = (score: number) =>
    gradeScale.find((band) => score >= band.minScore && score <= band.maxScore) ?? null;

  for (const mark of marks) {
    const acc = accBySubject.get(mark.subjectId);
    if (!acc) continue;
    if (genderById.get(mark.studentId) === "FEMALE") acc.female += 1;
    else acc.male += 1;
    acc.scoreSum += mark.score;
    const band = bandFor(mark.score);
    if (band) {
      acc.pointsSum += band.points;
      acc.pointsCount += 1;
      acc.gradeCounts[band.code] = (acc.gradeCounts[band.code] ?? 0) + 1;
    }
    if (mark.score >= passMark) acc.passed += 1;
  }

  const rows: (SubjectPerformanceRow & { rank: number })[] = subjects.map((subject) => {
    const acc = accBySubject.get(subject.id)!;
    const satTotal = acc.male + acc.female;
    const gradeCounts: Record<string, number> = {};
    for (const code of GRADE_CODES) gradeCounts[code] = acc.gradeCounts[code] ?? 0;
    return {
      subjectId: subject.id,
      name: subject.name,
      code: subject.code,
      numericCode: subject.numericCode,
      satMale: acc.male,
      satFemale: acc.female,
      satTotal,
      gpa: acc.pointsCount ? round2(acc.pointsSum / acc.pointsCount) : null,
      rank: 0,
      average: satTotal ? round2(acc.scoreSum / satTotal) : null,
      gradeCounts,
      passRate: satTotal ? round2((acc.passed / satTotal) * 100) : null,
    };
  });

  assignRanks(rows);

  return { examination, passMark, subjectCount: rows.length, rows };
}

/**
 * Detailed performance for a single subject: headline stats, the grade
 * distribution split by sex, and a ranked merit list of every student who sat
 * the subject. The subject's rank matches the subject performance report.
 */
export async function getSubjectPerformanceDetail(
  examinationId: string,
  subjectId: string,
): Promise<SubjectPerformanceDetail | null> {
  const data = await loadPerformanceData(examinationId);
  if (!data) return null;

  const { examination, gradeScale, passMark, students, marks, subjects } = data;
  const subject = subjects.find((entry) => entry.id === subjectId);
  if (!subject) return null;

  const studentById = new Map(students.map((student) => [student.id, student]));
  const bandFor = (score: number) =>
    gradeScale.find((band) => score >= band.minScore && score <= band.maxScore) ?? null;

  // Rank of every subject by average score (matches the subject performance table).
  const subjectAverages = subjects.map((entry) => {
    const subjectMarks = marks.filter((mark) => mark.subjectId === entry.id);
    const sum = subjectMarks.reduce((total, mark) => total + mark.score, 0);
    return { id: entry.id, average: subjectMarks.length ? sum / subjectMarks.length : null, rank: 0 };
  });
  assignRanks(subjectAverages);
  const rank = subjectAverages.find((entry) => entry.id === subjectId)?.rank ?? 0;

  const sitters = marks
    .filter((mark) => mark.subjectId === subjectId)
    .flatMap((mark) => {
      const student = studentById.get(mark.studentId);
      return student ? [{ student, score: mark.score, band: bandFor(mark.score) }] : [];
    })
    .sort((a, b) => b.score - a.score || a.student.fullName.localeCompare(b.student.fullName));

  const distribution = new Map<string, { male: number; female: number }>(
    GRADE_CODES.map((code) => [code, { male: 0, female: 0 }]),
  );
  const ranking: SubjectMeritRow[] = [];
  let male = 0;
  let female = 0;
  let passed = 0;
  let scoreSum = 0;
  let position = 0;
  let previousScore: number | undefined;
  let malePosition = 0;
  let femalePosition = 0;
  let previousMaleScore: number | undefined;
  let previousFemaleScore: number | undefined;

  sitters.forEach((entry, index) => {
    if (previousScore === undefined || entry.score !== previousScore) {
      position = index + 1;
      previousScore = entry.score;
    }

    const isFemale = entry.student.gender === "FEMALE";
    if (isFemale) {
      female += 1;
      if (previousFemaleScore === undefined || entry.score !== previousFemaleScore) {
        femalePosition = female;
        previousFemaleScore = entry.score;
      }
    } else {
      male += 1;
      if (previousMaleScore === undefined || entry.score !== previousMaleScore) {
        malePosition = male;
        previousMaleScore = entry.score;
      }
    }
    scoreSum += entry.score;
    if (entry.score >= passMark) passed += 1;

    if (entry.band) {
      const bucket = distribution.get(entry.band.code);
      if (bucket) {
        if (isFemale) bucket.female += 1;
        else bucket.male += 1;
      }
    }

    ranking.push({
      position,
      genderPosition: isFemale ? femalePosition : malePosition,
      studentId: entry.student.id,
      fullName: entry.student.fullName,
      studentNumber: entry.student.studentNumber,
      gender: entry.student.gender,
      streamName: entry.student.streamName,
      score: entry.score,
      grade: entry.band?.code ?? null,
    });
  });

  const satTotal = male + female;
  const gradeDistribution: SubjectGradeDistributionRow[] = GRADE_CODES.map((code) => {
    const bucket = distribution.get(code) ?? { male: 0, female: 0 };
    const total = bucket.male + bucket.female;
    return {
      code,
      male: bucket.male,
      female: bucket.female,
      total,
      percent: satTotal ? round2((total / satTotal) * 100) : 0,
    };
  });

  return {
    examination,
    subject: { id: subject.id, name: subject.name, code: subject.code, numericCode: subject.numericCode },
    passMark,
    subjectCount: subjects.length,
    stats: {
      satMale: male,
      satFemale: female,
      satTotal,
      average: satTotal ? round2(scoreSum / satTotal) : null,
      gpa: (() => {
        const points = sitters.reduce((total, entry) => total + (entry.band?.points ?? 0), 0);
        const count = sitters.filter((entry) => entry.band).length;
        return count ? round2(points / count) : null;
      })(),
      rank,
      passed,
      failed: satTotal - passed,
      passRate: satTotal ? round2((passed / satTotal) * 100) : null,
      failRate: satTotal ? round2(((satTotal - passed) / satTotal) * 100) : null,
    },
    gradeDistribution,
    ranking,
  };
}
