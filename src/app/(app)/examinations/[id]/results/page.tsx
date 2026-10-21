import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { getExaminationReport, formatReportDate } from "@/lib/services/reports";
import { getSchoolSettings } from "@/lib/services/school";
import { ResultsPrintControls } from "./results-print-controls";

export const metadata = { title: "Examination results" };
export const dynamic = "force-dynamic";

export default async function ExaminationResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [report, schoolSettings] = await Promise.all([getExaminationReport(id), getSchoolSettings()]);
  if (!report) notFound();

  const { examination, students, gradeScale, divisionScale, requiredSubjects } = report;
  const ranked = students.filter((card) => card.gradedSubjects > 0);
  const schoolName = schoolSettings?.settings.schoolName ?? schoolSettings?.school.name ?? "School";
  const logoUrl = schoolSettings?.settings.logoUrl ?? schoolSettings?.school.logoUrl ?? null;

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Link href={`/examinations/${id}`} className={buttonClasses("secondary", "md")}>
          Back to examination
        </Link>
        <ResultsPrintControls autoPrint={query.print === "1"} />
      </div>

      <div className="report-sheet mx-auto w-full max-w-4xl rounded-lg border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-300 pb-3">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={`${schoolName} logo`} className="h-12 w-auto object-contain" />
            ) : null}
            <div>
              <h1 className="text-lg font-bold uppercase tracking-wide">{schoolName}</h1>
              <p className="text-[11px] text-slate-600">Examination results</p>
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-600">
            <p className="font-semibold text-slate-800">{examination.title}</p>
            <p>
              {examination.classLevelName} · {examination.term ?? "—"} · {examination.academicYearName}
            </p>
            <p>Generated {formatReportDate(new Date())}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
          <span className="font-semibold text-slate-700">Grades:</span>
          {gradeScale.map((grade) => (
            <span key={grade.code}>
              {grade.code} {grade.minScore}–{grade.maxScore}
            </span>
          ))}
          <span className="font-semibold text-slate-700">· Divisions:</span>
          {divisionScale.map((division) => (
            <span key={division.code}>
              {division.code} {division.minPoints}–{division.maxPoints}
            </span>
          ))}
          <span className="text-slate-500">(best {requiredSubjects} subjects)</span>
        </div>

        <table className="mt-4 w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-y border-slate-300 bg-slate-50 uppercase tracking-wide text-slate-500">
              <th className="px-2 py-1.5 font-semibold">Pos</th>
              <th className="px-2 py-1.5 font-semibold">Student</th>
              <th className="px-2 py-1.5 font-semibold">Stream</th>
              <th className="px-2 py-1.5 text-right font-semibold">Total</th>
              <th className="px-2 py-1.5 text-right font-semibold">Average</th>
              <th className="px-2 py-1.5 font-semibold">Grade</th>
              <th className="px-2 py-1.5 text-right font-semibold">Points</th>
              <th className="px-2 py-1.5 font-semibold">Division</th>
            </tr>
          </thead>
          <tbody>
            {students.map((card) => (
              <tr key={card.student.id} className="border-b border-slate-100">
                <td className="px-2 py-1.5 font-medium">{card.position > 0 ? card.position : "—"}</td>
                <td className="px-2 py-1.5">
                  <span className="font-medium">{card.student.fullName}</span>
                  <span className="ml-1 text-slate-400">{card.student.studentNumber}</span>
                </td>
                <td className="px-2 py-1.5 text-slate-600">{card.student.streamName}</td>
                <td className="px-2 py-1.5 text-right">{card.totalMarks}</td>
                <td className="px-2 py-1.5 text-right">{card.average}</td>
                <td className="px-2 py-1.5">{card.averageGrade ?? "—"}</td>
                <td className="px-2 py-1.5 text-right">{card.totalPoints}</td>
                <td className="px-2 py-1.5">{card.division}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {students.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-slate-500">No students to report for this examination.</p>
        ) : ranked.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-slate-500">No student has any marks yet for this examination.</p>
        ) : null}

        <p className="mt-4 border-t border-slate-200 pt-2 text-center text-[10px] text-slate-400">
          {ranked.length} of {students.length} student{students.length === 1 ? "" : "s"} ranked · Generated by
          Academic Report — {schoolName}
        </p>
      </div>
    </div>
  );
}
