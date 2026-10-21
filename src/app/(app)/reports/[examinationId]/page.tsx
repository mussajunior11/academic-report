import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/app-nav";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { getExaminationReport } from "@/lib/services/reports";

export const metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

export default async function ExaminationReportPage({
  params,
}: {
  params: Promise<{ examinationId: string }>;
}) {
  const { examinationId } = await params;
  const report = await getExaminationReport(examinationId);
  if (!report) notFound();

  const { examination, students, gradeScale, divisionScale, requiredSubjects } = report;
  const ranked = students.filter((card) => card.gradedSubjects > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={examination.title}
        description={`${examination.typeName} · ${examination.term ?? "—"} · ${examination.academicYearName}`}
        actions={
          <>
            <StatusBadge status={examination.status} />
            <Link href="/reports" className={buttonClasses("secondary", "md")}>
              All reports
            </Link>
          </>
        }
      />

      <Card>
        <CardHeader
          title="Grading scale"
          description={`Divisions count the best ${requiredSubjects} graded subject${requiredSubjects === 1 ? "" : "s"}. Students with fewer graded subjects are reported as INC.`}
        />
        <CardBody>
          <div className="flex flex-wrap gap-2">
            {gradeScale.map((grade) => (
              <span
                key={grade.code}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600"
              >
                <span className="font-semibold text-slate-800">{grade.code}</span>
                <span>
                  {grade.minScore}–{grade.maxScore}
                </span>
                <span className="text-slate-400">· {grade.points} pt</span>
                {grade.remark ? <span className="text-slate-400">· {grade.remark}</span> : null}
              </span>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {divisionScale.map((division) => (
              <span
                key={division.code}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600"
              >
                <span className="font-semibold text-slate-800">Division {division.code}</span>
                <span>
                  {division.minPoints}–{division.maxPoints} pts
                </span>
              </span>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Class results"
          description={`${ranked.length} student${ranked.length === 1 ? "" : "s"} ranked, whole class across all streams`}
        />
        <CardBody className={students.length === 0 ? "" : "p-0"}>
          {students.length === 0 ? (
            <EmptyState
              title="No students to report"
              description={`No active students were found in ${examination.classLevelName}. Register students in this class, then try again.`}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">Pos</th>
                    <th className="px-4 py-2 font-medium">Student</th>
                    <th className="px-4 py-2 font-medium">Stream</th>
                    <th className="px-4 py-2 font-medium">Total</th>
                    <th className="px-4 py-2 font-medium">Average</th>
                    <th className="px-4 py-2 font-medium">Grade</th>
                    <th className="px-4 py-2 font-medium">Points</th>
                    <th className="px-4 py-2 font-medium">Division</th>
                    <th className="px-4 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((card) => (
                    <tr key={card.student.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-700">
                        {card.position > 0 ? card.position : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <p className="font-medium text-slate-800">{card.student.fullName}</p>
                        <p className="text-xs text-slate-500">{card.student.studentNumber}</p>
                      </td>
                      <td className="px-4 py-2 text-slate-600">{card.student.streamName}</td>
                      <td className="px-4 py-2 text-slate-600">{card.totalMarks}</td>
                      <td className="px-4 py-2 text-slate-600">{card.average}</td>
                      <td className="px-4 py-2 text-slate-600">{card.averageGrade ?? "—"}</td>
                      <td className="px-4 py-2 text-slate-600">{card.totalPoints}</td>
                      <td className="px-4 py-2">
                        <span
                          className={
                            card.division === "INC"
                              ? "rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700"
                              : "font-medium text-slate-700"
                          }
                        >
                          {card.division}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <Link
                          href={`/reports/${examination.id}/${card.student.id}`}
                          className={buttonClasses("secondary", "sm")}
                        >
                          Report form
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {ranked.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-500">
                  No student has any marks yet for this examination.
                </p>
              ) : null}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
