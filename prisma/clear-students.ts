import "dotenv/config";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");
}

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

async function main() {
  const before = await prisma.student.count();
  const registrations = await prisma.studentSubjectRegistration.count();
  const supportNeeds = await prisma.studentSpecialNeed.count();
  const marks = await prisma.mark.count();

  const { count } = await prisma.student.deleteMany();

  const after = await prisma.student.count();
  console.log(`Deleted ${count} student${count === 1 ? "" : "s"}.`);
  console.log(
    `Cascaded: ${registrations} registrations, ${supportNeeds} support needs, ${marks} marks.`,
  );
  console.log(`Students before: ${before}, after: ${after}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
