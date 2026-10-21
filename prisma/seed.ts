import "dotenv/config";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_NAME,
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_CLASS_LEVELS,
  DEFAULT_EXAMINATION_TYPES,
  DEFAULT_STREAMS,
  DEFAULT_SUBJECTS,
} from "../src/lib/constants";
import { hashPassword } from "../src/lib/auth/password";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");
}

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

async function main() {
  const schoolName = process.env.SEED_SCHOOL_NAME ?? "Academic Report Secondary School";
  const schoolCode = process.env.SEED_SCHOOL_CODE ?? "ARS";
  const academicYearName = process.env.SEED_ACADEMIC_YEAR ?? String(new Date().getFullYear());

  const school = await prisma.school.upsert({
    where: { code: schoolCode },
    update: { name: schoolName },
    create: {
      name: schoolName,
      code: schoolCode,
      address: "P.O. Box 1, Dar es Salaam, Tanzania",
      email: "info@example.ac.tz",
      website: "https://example.ac.tz",
      poBox: "P.O. Box 1",
      mobile1: "+255 700 000 000",
    },
  });

  const year = await prisma.academicYear.upsert({
    where: { schoolId_name: { schoolId: school.id, name: academicYearName } },
    update: { isCurrent: true },
    create: {
      schoolId: school.id,
      name: academicYearName,
      startDate: new Date(`${academicYearName}-01-01T00:00:00.000Z`),
      endDate: new Date(`${academicYearName}-12-31T00:00:00.000Z`),
      isCurrent: true,
      status: "ACTIVE",
    },
  });

  const settings = await prisma.schoolSettings.upsert({
    where: { schoolId: school.id },
    update: { defaultAcademicYearId: year.id },
    create: {
      schoolId: school.id,
      schoolName: school.name,
      address: school.address,
      email: school.email,
      website: school.website,
      poBox: school.poBox,
      mobile1: school.mobile1,
      defaultAcademicYearId: year.id,
    },
  });

  for (const level of DEFAULT_CLASS_LEVELS) {
    await prisma.classLevel.upsert({
      where: { schoolId_name: { schoolId: school.id, name: level.name } },
      update: { sortOrder: level.sortOrder },
      create: { schoolId: school.id, name: level.name, sortOrder: level.sortOrder, status: "ACTIVE" },
    });
  }

  for (let i = 0; i < DEFAULT_STREAMS.length; i++) {
    const name = DEFAULT_STREAMS[i];
    await prisma.stream.upsert({
      where: { schoolId_name: { schoolId: school.id, name } },
      update: { sortOrder: i + 1 },
      create: { schoolId: school.id, name, sortOrder: i + 1, status: "ACTIVE" },
    });
  }

  const [levels, streams] = await Promise.all([
    prisma.classLevel.findMany({ where: { schoolId: school.id } }),
    prisma.stream.findMany({ where: { schoolId: school.id } }),
  ]);

  for (const level of levels) {
    for (const stream of streams) {
      await prisma.classStream.upsert({
        where: { classLevelId_streamId: { classLevelId: level.id, streamId: stream.id } },
        update: {},
        create: {
          schoolId: school.id,
          classLevelId: level.id,
          streamId: stream.id,
          status: "ACTIVE",
        },
      });
    }
  }

  for (const subject of DEFAULT_SUBJECTS) {
    await prisma.subject.upsert({
      where: { schoolId_name: { schoolId: school.id, name: subject.name } },
      update: { code: subject.code ?? null },
      create: {
        schoolId: school.id,
        name: subject.name,
        code: subject.code ?? null,
        status: "ACTIVE",
      },
    });
  }

  for (let i = 0; i < DEFAULT_EXAMINATION_TYPES.length; i++) {
    const name = DEFAULT_EXAMINATION_TYPES[i];
    await prisma.examinationType.upsert({
      where: { schoolId_name: { schoolId: school.id, name } },
      update: { sortOrder: i + 1 },
      create: { schoolId: school.id, name, sortOrder: i + 1, status: "ACTIVE" },
    });
  }

  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;
  const adminName = DEFAULT_ADMIN_NAME;

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        schoolId: school.id,
        name: adminName,
        email: adminEmail,
        passwordHash: await hashPassword(adminPassword),
        role: "ADMIN",
        status: "ACTIVE",
      },
    });
    console.log(`Created administrator "${adminEmail}".`);
  } else {
    await prisma.user.update({
      where: { email: adminEmail },
      data: { schoolId: school.id, status: "ACTIVE" },
    });
    console.log(`Administrator "${adminEmail}" already exists (password unchanged).`);
  }

  if (process.env.SEED_DEV_DATA === "true") {
    const form1 = levels.find((l) => l.name === "FORM 1");
    const streamA = streams.find((s) => s.name === "A");
    if (form1 && streamA) {
      const existing = await prisma.student.count({ where: { schoolId: school.id } });
      if (existing === 0) {
        const subjects = await prisma.subject.findMany({
          where: { schoolId: school.id },
          take: 3,
        });
        for (let i = 1; i <= 3; i++) {
          const student = await prisma.student.create({
            data: {
              schoolId: school.id,
              studentNumber: `${schoolCode}/${academicYearName}/${String(i).padStart(4, "0")}`,
              admissionNumber: `DEV-${String(i).padStart(3, "0")}`,
              fullName: `Development Student ${i}`,
              gender: i % 2 === 0 ? "FEMALE" : "MALE",
              classLevelId: form1.id,
              streamId: streamA.id,
              admissionYear: Number(academicYearName),
              status: "ACTIVE",
            },
          });
          for (const subject of subjects) {
            await prisma.studentSubjectRegistration.create({
              data: {
                schoolId: school.id,
                studentId: student.id,
                subjectId: subject.id,
                academicYearId: year.id,
              },
            });
          }
        }
      }
    }
  }

  console.log(`Seed complete for school "${settings.schoolName}" (${schoolCode}).`);
  console.log(`Academic year: ${academicYearName}.`);
  console.log("Configured: class levels, streams, class-stream combinations, subjects, examination types.");
  if (process.env.SEED_DEV_DATA === "true") {
    console.log("Development students were seeded (SEED_DEV_DATA=true).");
  }
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
