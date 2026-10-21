import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { GRADE_CODES } from "@/lib/constants";
import { GRADE_FILL_COLORS, GRADE_TEXT_COLORS } from "@/lib/grade-colors";
import { getClassResults, type ClassResultStudent } from "@/lib/services/class-results";
import { getSchoolSettings } from "@/lib/services/school";
import { ClassResultsPrintControls } from "./class-results-print-controls";

export const metadata = { title: "Class results" };
export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return `${String(value.getUTCDate()).padStart(2, "0")}/${String(value.getUTCMonth() + 1).padStart(2, "0")}/${value.getUTCFullYear()}`;
}

function formatNumber(value: number | null) {
  return value === null ? "—" : value.toFixed(2);
}

function detailedResults(student: ClassResultStudent) {
  const parts = student.subjects.map((subject) => {
    const label = subject.code ?? subject.numericCode ?? subject.name;
    return `${label}-${subject.score ?? "—"}'${subject.grade ?? "—"}'`;
  });
  parts.push(`AVG-${student.average}'${student.averageGrade ?? "—"}'`);
  return parts.join(" ");
}

export default async function ClassResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const results = await getClassResults(id);
  if (!results) notFound();

  const { examination, headline, divisionBuckets, divisionRows, divisionTotals, students, subjects, subjectCount } = results;
  const schoolSettings = await getSchoolSettings();
  const schoolName = schoolSettings?.settings.schoolName ?? schoolSettings?.school.name ?? "School";
  const logoUrl = schoolSettings?.settings.logoUrl ?? schoolSettings?.school.logoUrl ?? null;

  const headlineStyle = headline.grade ? GRADE_FILL_COLORS[headline.grade] : undefined;

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Link href={`/examinations/${id}`} className={buttonClasses("secondary", "md")}>
          Back to examination
        </Link>
        <ClassResultsPrintControls autoPrint={query.print === "1"} />
      </div>

      <div className="report-sheet print-exact mx-auto w-full max-w-6xl rounded-lg border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-300 pb-3">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={`${schoolName} logo`} className="h-12 w-auto object-contain" />
            ) : null}
            <div>
              <h1 className="text-lg font-bold uppercase tracking-wide">{schoolName}</h1>
              <p className="text-[11px] text-slate-600">Class results</p>
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-600">
            <p className="font-semibold text-slate-800">{examination.name}</p>
            <p>
              {examination.typeName} · {examination.classLevelName} · {examination.term ?? "—"}
            </p>
            <p>
              {examination.academicYearName} · {examination.status}
            </p>
            <p>Generated {formatDate(new Date())}</p>
          </div>
        </div>

        <section
          className="mt-4 rounded-xl px-6 py-5"
          style={headlineStyle ?? { backgroundColor: "#475569", color: "#ffffff" }}
        >
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">Class GPA</p>
              <p className="text-4xl font-bold leading-none tabular-nums">{formatNumber(headline.gpa)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">Average</p>
              <p className="text-4xl font-bold leading-none tabular-nums">{formatNumber(headline.average)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">Grade</p>
              <p className="text-4xl font-bold leading-none">{headline.grade ?? "—"}</p>
            </div>
          </div>
          {headline.competency ? (
            <p className="mt-3 text-center text-xs font-semibold uppercase tracking-wide">{headline.competency}</p>
          ) : null}
        </section>

        <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-slate-700">Division Distribution</h3>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse text-center text-xs">
            <thead>
              <tr className="border-y border-slate-300 bg-slate-50 uppercase tracking-wide text-slate-500">
                <th className="px-3 py-1.5 text-left font-semibold">Gender</th>
                {divisionBuckets.map((bucket) => (
                  <th key={bucket.key} className="px-3 py-1.5 font-semibold">
                    {bucket.label}
                  </th>
                ))}
                <th className="px-3 py-1.5 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {divisionRows.map((row) => (
                <tr key={row.key} className="border-b border-slate-100">
                  <td className="px-3 py-1.5 text-left font-medium text-slate-800">{row.label}</td>
                  {divisionBuckets.map((bucket) => (
                    <td key={bucket.key} className="px-3 py-1.5 tabular-nums text-slate-700">
                      {row.counts[bucket.key] ?? 0}
                    </td>
                  ))}
                  <td className="px-3 py-1.5 font-semibold tabular-nums text-slate-800">{row.total}</td>
                </tr>
              ))}
              <tr className="border-y-2 border-slate-300 bg-slate-50 font-semibold text-slate-800">
                <td className="px-3 py-1.5 text-left">Total</td>
                {divisionBuckets.map((bucket) => (
                  <td key={bucket.key} className="px-3 py-1.5 tabular-nums">
                    {divisionTotals[bucket.key] ?? 0}
                  </td>
                ))}
                <td className="px-3 py-1.5 tabular-nums">{divisionTotals.total ?? 0}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-slate-700">Student Results</h3>
        <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full border-collapse text-left text-[11px]">
            <thead>
              <tr className="border-b border-slate-200 uppercase tracking-wide text-slate-500">
                <th className="px-2 py-1.5 text-center font-semibold">S/N</th>
                <th className="px-2 py-1.5 font-semibold">Students</th>
                <th className="px-2 py-1.5 text-center font-semibold">Sex</th>
                <th className="px-2 py-1.5 text-center font-semibold">Division Point</th>
                <th className="px-2 py-1.5 text-center font-semibold">Division</th>
                <th className="px-2 py-1.5 font-semibold">Detailed Results</th>
                <th className="px-2 py-1.5 text-center font-semibold">POS-SEX</th>
                <th className="px-2 py-1.5 text-center font-semibold">POS-OVR</th>
                <th className="no-print px-2 py-1.5 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => (
                <tr key={student.studentId} className="border-b border-slate-100 last:border-0">
                  <td className="px-2 py-1.5 text-center tabular-nums text-slate-500">{index + 1}</td>
                  <td className="px-2 py-1.5">
                    <span className="font-medium text-slate-800">{student.fullName}</span>
                    <span className="ml-1 text-slate-400">{student.studentNumber}</span>
                  </td>
                  <td className="px-2 py-1.5 text-center text-slate-600">{student.gender === "FEMALE" ? "F" : "M"}</td>
                  <td className="px-2 py-1.5 text-center tabular-nums text-slate-700">{student.totalPoints}</td>
                  <td className="px-2 py-1.5 text-center font-semibold text-slate-800">{student.division}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 font-mono text-slate-600">{detailedResults(student)}</td>
                  <td className="px-2 py-1.5 text-center tabular-nums text-slate-700">
                    {student.positionSex || "—"}
                  </td>
                  <td className="px-2 py-1.5 text-center tabular-nums text-slate-700">
                    {student.positionOverall || "—"}
                  </td>
                  <td className="no-print px-2 py-1.5">
                    <div className="flex items-center justify-center gap-1">
                      <button type="button" className={buttonClasses("secondary", "sm")}>
                        View
                      </button>
                      <button type="button" className={buttonClasses("secondary", "sm")}>
                        Download
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {students.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-2 py-4 text-center text-slate-400">
                    No active students in this class.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-slate-700">Subject Analysis</h3>
        <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full border-collapse text-center text-[11px]">
            <thead>
              <tr className="border-b border-slate-200 uppercase tracking-wide text-slate-500">
                <th className="px-2 py-1.5 font-semibold">CODE</th>
                <th className="px-2 py-1.5 text-left font-semibold">Subject Name</th>
                <th className="px-2 py-1.5 font-semibold">REG</th>
                <th className="px-2 py-1.5 font-semibold">SAT</th>
                <th className="px-2 py-1.5 font-semibold">ABS</th>
                {GRADE_CODES.map((code) => (
                  <th key={code} className="px-2 py-1.5 font-semibold">
                    {code}
                  </th>
                ))}
                <th className="px-2 py-1.5 font-semibold">PASS</th>
                <th className="px-2 py-1.5 font-semibold">FAIL</th>
                <th className="px-2 py-1.5 font-semibold">AVR</th>
                <th className="px-2 py-1.5 font-semibold">GPA</th>
                <th className="px-2 py-1.5 text-left font-semibold">Competency</th>
                <th className="px-2 py-1.5 font-semibold">Rank</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject) => (
                <tr key={subject.subjectId} className="border-b border-slate-100 last:border-0">
                  <td className="px-2 py-1.5 font-medium text-slate-700">{subject.code ?? subject.numericCode ?? "—"}</td>
                  <td className="px-2 py-1.5 text-left font-medium text-slate-800">{subject.name}</td>
                  <td className="px-2 py-1.5 tabular-nums text-slate-700">{subject.registered}</td>
                  <td className="px-2 py-1.5 tabular-nums text-slate-700">{subject.sat}</td>
                  <td className="px-2 py-1.5 tabular-nums text-slate-700">{subject.absent}</td>
                  {GRADE_CODES.map((code) => (
                    <td key={code} className="px-2 py-1.5 tabular-nums text-slate-700">
                      {subject.gradeCounts[code] ?? 0}
                    </td>
                  ))}
                  <td className="px-2 py-1.5 tabular-nums text-slate-700">{subject.passed}</td>
                  <td className="px-2 py-1.5 tabular-nums text-slate-700">{subject.failed}</td>
                  <td className="px-2 py-1.5 tabular-nums text-slate-700">{formatNumber(subject.average)}</td>
                  <td className="px-2 py-1.5 tabular-nums text-slate-700">{formatNumber(subject.gpa)}</td>
                  <td className="px-2 py-1.5 text-left font-semibold">
                    {subject.competency && subject.grade && GRADE_TEXT_COLORS[subject.grade] ? (
                      <span style={{ color: GRADE_TEXT_COLORS[subject.grade] }}>{subject.competency}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 tabular-nums text-slate-700">
                    {subject.rank ? `${subject.rank}/${subjectCount}` : "—"}
                  </td>
                </tr>
              ))}
              {subjects.length === 0 ? (
                <tr>
                  <td colSpan={GRADE_CODES.length + 11} className="px-2 py-4 text-center text-slate-400">
                    No subjects registered or graded for this examination.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <p className="mt-4 border-t border-slate-200 pt-2 text-center text-[10px] text-slate-400">
          {students.length} students · {subjectCount} subjects · Pass mark {results.passMark} · Required subjects{" "}
          {results.requiredSubjects} · Generated by Academic Report — {schoolName}
        </p>
      </div>
    </div>
  );
}
