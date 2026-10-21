import "server-only";

import { prisma } from "@/lib/db/prisma";
import { getPrimarySchool } from "@/lib/services/school";

export type DashboardData = {
  configured: boolean;
  counts: {
    students: number;
    activeStudents: number;
    classes: number;
    streams: number;
    subjects: number;
    examinations: number;
  };
  recentStudents: {
    id: string;
    studentNumber: string;
    fullName: string;
    gender: string;
    status: string;
    className: string;
    streamName: string;
    createdAt: Date;
  }[];
  recentExaminations: {
    id: string;
    typeName: string;
    className: string;
    term: string | null;
    academicYear: string;
    status: string;
    createdAt: Date;
  }[];
};

const EMPTY: DashboardData = {
  configured: false,
  counts: { students: 0, activeStudents: 0, classes: 0, streams: 0, subjects: 0, examinations: 0 },
  recentStudents: [],
  recentExaminations: [],
};

export async function getDashboardData(): Promise<DashboardData> {
  const school = await getPrimarySchool();
  if (!school) return EMPTY;

  const [students, activeStudents, classes, streams, subjects, examinations] = await Promise.all([
    prisma.student.count({ where: { schoolId: school.id, archivedAt: null } }),
    prisma.student.count({ where: { schoolId: school.id, archivedAt: null, status: "ACTIVE" } }),
    prisma.classLevel.count({ where: { schoolId: school.id } }),
    prisma.stream.count({ where: { schoolId: school.id } }),
    prisma.subject.count({ where: { schoolId: school.id } }),
    prisma.examination.count({ where: { schoolId: school.id } }),
  ]);

  const [recent, exams] = await Promise.all([
    prisma.student.findMany({
      where: { schoolId: school.id, archivedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { classLevel: true, stream: true },
    }),
    prisma.examination.findMany({
      where: { schoolId: school.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { type: true, classLevel: true, academicYear: true },
    }),
  ]);

  return {
    configured: true,
    counts: { students, activeStudents, classes, streams, subjects, examinations },
    recentStudents: recent.map((s) => ({
      id: s.id,
      studentNumber: s.studentNumber,
      fullName: s.fullName,
      gender: s.gender,
      status: s.status,
      className: s.classLevel.name,
      streamName: s.stream.name,
      createdAt: s.createdAt,
    })),
    recentExaminations: exams.map((e) => ({
      id: e.id,
      typeName: e.type.name,
      className: e.classLevel.name,
      term: e.term,
      academicYear: e.academicYear.name,
      status: e.status,
      createdAt: e.createdAt,
    })),
  };
}
