import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { buildMarksTemplate, type MarksLogoExtension } from "@/lib/excel/marks-workbook";
import { getMarksEntry } from "@/lib/services/marks";
import { getPrimarySchool } from "@/lib/services/school";

export const dynamic = "force-dynamic";

const LOGO_EXTENSIONS: Record<string, MarksLogoExtension> = {
  png: "png",
  jpg: "jpeg",
  jpeg: "jpeg",
  gif: "gif",
};

async function readLogo(logoUrl: string | null | undefined) {
  if (!logoUrl) return null;
  const extension = LOGO_EXTENSIONS[path.extname(logoUrl).slice(1).toLowerCase()];
  if (!extension) return null;
  try {
    const buffer = await readFile(path.join(process.cwd(), "public", logoUrl));
    return { buffer, extension };
  } catch {
    return null;
  }
}

function slug(value: string): string {
  return (
    value
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "examination"
  );
}

function csv(value: string | null): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const examinationId = searchParams.get("examinationId") ?? "";
  if (!examinationId) {
    return NextResponse.json({ message: "Missing examination." }, { status: 400 });
  }

  const data = await getMarksEntry(examinationId);
  if (!data) {
    return NextResponse.json({ message: "Examination not found." }, { status: 404 });
  }

  const subjectFilter = new Set(csv(searchParams.get("subjects")));
  const streamFilter = new Set(csv(searchParams.get("streams")));

  const subjects = data.subjects.filter(
    (subject) => subjectFilter.size === 0 || subjectFilter.has(subject.id),
  );
  if (subjects.length === 0) {
    return NextResponse.json({ message: "Select at least one subject." }, { status: 400 });
  }

  let students = data.students.filter(
    (student) => streamFilter.size === 0 || streamFilter.has(student.streamId),
  );
  if (students.length === 0) {
    return NextResponse.json(
      { message: "No students found for the selected stream(s)." },
      { status: 400 },
    );
  }

  // A single-subject template is a mark list for that subject only, so include
  // just the students registered to take it instead of everyone with locked cells.
  if (subjects.length === 1) {
    const onlySubjectId = subjects[0].id;
    students = students.filter((student) => student.subjectIds.includes(onlySubjectId));
    if (students.length === 0) {
      return NextResponse.json(
        { message: "No students are registered for the selected subject." },
        { status: 400 },
      );
    }
  }

  const selectedSubjectIds = new Set(subjects.map((subject) => subject.id));
  const marks = new Map<string, number>();
  for (const mark of data.marks) {
    if (selectedSubjectIds.has(mark.subjectId)) {
      marks.set(`${mark.studentId}:${mark.subjectId}`, mark.score);
    }
  }

  const school = await getPrimarySchool();
  const logo = await readLogo(school?.logoUrl);

  const buffer = await buildMarksTemplate({
    school: { name: school?.name ?? "School", logo },
    examination: {
      name: data.examination.name,
      typeName: data.examination.typeName,
      className: data.examination.classLevelName,
      term: data.examination.term,
      academicYearName: data.examination.academicYearName,
    },
    subjects,
    students: students.map((student) => ({
      id: student.id,
      fullName: student.fullName,
      gender: student.gender,
      className: student.classLevelName,
      streamName: student.streamName,
      subjectIds: student.subjectIds,
    })),
    marks,
  });

  const filename = `marks-entry-${slug(data.examination.classLevelName)}-${slug(data.examination.name)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
