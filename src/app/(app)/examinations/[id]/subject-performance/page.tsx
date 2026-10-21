import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { GRADE_CODES } from "@/lib/constants";
import { getSubjectPerformance } from "@/lib/services/performance";
import { getSchoolSettings } from "@/lib/services/school";
import { SubjectPerformancePrintControls } from "./subject-performance-print-controls";

export const metadata = { title: "Subject performance" };
export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return `${String(value.getUTCDate()).padStart(2, "0")}/${String(value.getUTCMonth() + 1).padStart(2, "0")}/${value.getUTCFullYear()}`;
}

function formatNumber(value: number | null) {
  return value === null ? "—" : value.toFixed(2);
}

export default async function SubjectPerformancePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [performance, schoolSettings] = await Promise.all([getSubjectPerformance(id), getSchoolSettings()]);
  if (!performance) notFound();

  const { examination, rows, subjectCount, passMark } = performance;
  const schoolName = schoolSettings?.settings.schoolName ?? schoolSettings?.school.name ?? "School";
  const logoUrl = schoolSettings?.settings.logoUrl ?? schoolSettings?.school.logoUrl ?? null;

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Link href={`/examinations/${id}`} className={buttonClasses("secondary", "md")}>
          Back to examination
        </Link>
        <SubjectPerformancePrintControls autoPrint={query.print === "1"} />
      </div>

      <div className="report-sheet print-exact mx-auto w-full max-w-5xl rounded-lg border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-300 pb-3">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={`${schoolName} logo`} className="h-12 w-auto object-contain" />
            ) : null}
            <div>
              <h1 className="text-lg font-bold uppercase tracking-wide">{schoolName}</h1>
              <p className="text-[11px] text-slate-600">Subject performance analysis</p>
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-600">
            <p className="font-semibold text-slate-800">{examination.name}</p>
            <p>
              {examination.typeName} · {examination.classLevelName} · {examination.term ?? "—"}
            </p>
            <p>
              {examination.academicYearName} · Generated {formatDate(new Date())}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
          <span>
            <span className="font-semibold text-slate-600">GPA</span> = mean grade points (A=1 … F=5; lower is better)
          </span>
          <span>
            <span className="font-semibold text-slate-600">AVR</span> = mean score of sitters
          </span>
          <span>
            <span className="font-semibold text-slate-600">Pass %</span> = sitters scoring ≥ {passMark}
          </span>
          <span>
            <span className="font-semibold text-slate-600">Rank</span> = position by average score
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-[11px]">
            <thead>
              <tr className="border-y border-slate-300 bg-slate-50 uppercase tracking-wide text-slate-500">
                <th className="px-1.5 py-1.5 font-semibold">Code</th>
                <th className="px-1.5 py-1.5 font-semibold">Subject</th>
                <th className="px-1.5 py-1.5 text-right font-semibold">Sat M/F/T</th>
                <th className="px-1.5 py-1.5 text-right font-semibold">GPA</th>
                <th className="px-1.5 py-1.5 text-right font-semibold">Rank</th>
                <th className="px-1.5 py-1.5 text-right font-semibold">AVR</th>
                {GRADE_CODES.map((code) => (
                  <th key={code} className="px-1.5 py-1.5 text-right font-semibold">
                    {code}
                  </th>
                ))}
                <th className="px-1.5 py-1.5 text-right font-semibold">Pass %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.subjectId} className="border-b border-slate-100">
                  <td className="px-1.5 py-1.5 font-medium text-slate-700">{row.numericCode ?? row.code ?? "—"}</td>
                  <td className="px-1.5 py-1.5 font-medium text-slate-800">
                    <Link
                      href={`/examinations/${id}/subject-performance/${row.subjectId}`}
                      className="text-royal underline-offset-2 hover:underline"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-1.5 py-1.5 text-right tabular-nums text-slate-700">
                    {row.satMale}/{row.satFemale}/{row.satTotal}
                  </td>
                  <td className="px-1.5 py-1.5 text-right tabular-nums text-slate-700">{formatNumber(row.gpa)}</td>
                  <td className="px-1.5 py-1.5 text-right tabular-nums text-slate-700">
                    {row.rank}/{subjectCount}
                  </td>
                  <td className="px-1.5 py-1.5 text-right tabular-nums text-slate-700">{formatNumber(row.average)}</td>
                  {GRADE_CODES.map((code) => (
                    <td key={code} className="px-1.5 py-1.5 text-right tabular-nums text-slate-700">
                      {row.gradeCounts[code] ?? 0}
                    </td>
                  ))}
                  <td className="px-1.5 py-1.5 text-right tabular-nums text-slate-700">
                    {row.passRate === null ? "—" : `${row.passRate}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-slate-500">
            No subject has any marks entered for this examination yet.
          </p>
        ) : null}

        <p className="mt-4 border-t border-slate-200 pt-2 text-center text-[10px] text-slate-400">
          {subjectCount} subject{subjectCount === 1 ? "" : "s"} · Pass mark {passMark} · Generated by Academic Report —{" "}
          {schoolName}
        </p>
      </div>
    </div>
  );
}
