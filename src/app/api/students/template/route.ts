import { NextResponse } from "next/server";
import { listClassLevels, listStreams } from "@/lib/services/academic";
import { buildStudentTemplate, TEMPLATE_FILENAME } from "@/lib/excel/students-workbook";

export const dynamic = "force-dynamic";

export async function GET() {
  const [levels, streams] = await Promise.all([listClassLevels(false), listStreams(false)]);

  const buffer = await buildStudentTemplate({
    classes: levels.map((level) => level.name),
    streams: streams.map((stream) => stream.name),
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${TEMPLATE_FILENAME}"`,
      "Cache-Control": "no-store",
    },
  });
}
