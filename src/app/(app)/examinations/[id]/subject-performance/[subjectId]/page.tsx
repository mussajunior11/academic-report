import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { GRADE_TEXT_COLORS } from "@/lib/grade-colors";
import { getSubjectPerformanceDetail } from "@/lib/services/performance";
import { getSchoolSettings } from "@/lib/services/school";
import { SubjectPerformancePrintControls } from "../subject-performance-print-controls";

export const metadata = { title: "Subject performance detail" };
export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return `${String(value.getUTCDate()).padStart(2, "0")}/${String(value.getUTCMonth() + 1).padStart(2, "0")}/${value.getUTCFullYear()}`;
}

function formatNumber(value: number | null) {
  return value === null ? "—" : value.toFixed(2);
}

function formatPercent(value: number | null) {
  return value === null ? "—" : `${value}%`;
}

export default async function SubjectPerformanceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; subjectId: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const [{ id, subjectId }, query] = await Promise.all([params, searchParams]);
  const [detail, schoolSettings] = await Promise.all([
    getSubjectPerformanceDetail(id, subjectId),
    getSchoolSettings(),
  ]);
  if (!detail) notFound();

  const { examination, subject, stats, gradeDistribution, ranking, passMark, subjectCount } = detail;
  const schoolName = schoolSettings?.settings.schoolName ?? schoolSettings?.school.name ?? "School";
  const logoUrl = schoolSettings?.settings.logoUrl ?? schoolSettings?.school.logoUrl ?? null;

  const totals = gradeDistribution.reduce(
    (acc, row) => ({ male: acc.male + row.male, female: acc.female + row.female, total: acc.total + row.total }),
    { male: 0, female: 0, total: 0 },
  );

  const cards: { label: string; value: string }[] = [
    { label: "Average", value: formatNumber(stats.average) },
    { label: "GPA", value: formatNumber(stats.gpa) },
    { label: "Rank", value: `${stats.rank}/${subjectCount}` },
    { label: "Passed", value: String(stats.passed) },
    { label: "Failed", value: String(stats.failed) },
    { label: "Pass rate", value: formatPercent(stats.passRate) },
    { label: "Fail rate", value: formatPercent(stats.failRate) },
  ];

  const maleRanking = ranking.filter((row) => row.gender === "MALE");
  const femaleRanking = ranking.filter((row) => row.gender !== "MALE");
  const lists: { title: string; showSex: boolean; rows: typeof ranking }[] = [
    { title: "Top 10 overall", rows: ranking.slice(0, 10), showSex: true },
    { title: "Bottom 10 overall", rows: ranking.slice(-10), showSex: true },
    { title: "Top 10 male", rows: maleRanking.slice(0, 10), showSex: false },
    { title: "Last 10 male", rows: maleRanking.slice(-10), showSex: false },
    { title: "Top 10 female", rows: femaleRanking.slice(0, 10), showSex: false },
    { title: "Last 10 female", rows: femaleRanking.slice(-10), showSex: false },
  ];

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Link href={`/examinations/${id}/subject-performance`} className={buttonClasses("secondary", "md")}>
          Back to subject performance
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
              <p className="text-[11px] text-slate-600">Individual subject performance</p>
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

        <div className="mt-3 border-b border-slate-200 pb-3">
          <h2 className="text-base font-bold uppercase tracking-wide text-slate-800">{subject.name}</h2>
          <p className="text-[11px] text-slate-600">Code: {subject.numericCode ?? subject.code ?? "—"}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-center">
            <p className="text-[22.5px] font-bold leading-none tabular-nums text-royal lg:text-[27px]">{stats.satTotal}</p>
            <p className="mt-1 text-[11px] font-medium text-black">Total Sat</p>
            <p className="text-[11px] tabular-nums text-slate-600">
              {stats.satMale}M/{stats.satFemale}F
            </p>
          </div>
          {cards.map((card) => (
            <div key={card.label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-center">
              <p className="text-[22.5px] font-bold leading-none tabular-nums text-royal lg:text-[27px]">{card.value}</p>
              <p className="mt-1 text-[11px] font-medium text-black">{card.label}</p>
            </div>
          ))}
        </div>

        <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-slate-700">Grade distribution by sex</h3>
        <table className="mt-2 w-full border-collapse text-center text-xs">
          <thead>
            <tr className="border-y border-slate-300 bg-slate-50 uppercase tracking-wide text-slate-500">
              <th className="px-2 py-1.5 font-semibold">Grade</th>
              <th className="px-2 py-1.5 font-semibold">Male</th>
              <th className="px-2 py-1.5 font-semibold">Female</th>
              <th className="px-2 py-1.5 font-semibold">Total</th>
              <th className="px-2 py-1.5 font-semibold">%</th>
            </tr>
          </thead>
          <tbody>
            {gradeDistribution.map((row) => (
              <tr key={row.code} className="border-b border-slate-100">
                <td className="px-2 py-1.5 font-medium text-slate-800">{row.code}</td>
                <td className="px-2 py-1.5 tabular-nums text-slate-700">{row.male}</td>
                <td className="px-2 py-1.5 tabular-nums text-slate-700">{row.female}</td>
                <td className="px-2 py-1.5 tabular-nums text-slate-700">{row.total}</td>
                <td className="px-2 py-1.5 tabular-nums text-slate-700">{row.percent}%</td>
              </tr>
            ))}
            <tr className="border-y-2 border-slate-300 bg-slate-50 font-semibold text-slate-800">
              <td className="px-2 py-1.5">Total</td>
              <td className="px-2 py-1.5 tabular-nums">{totals.male}</td>
              <td className="px-2 py-1.5 tabular-nums">{totals.female}</td>
              <td className="px-2 py-1.5 tabular-nums">{totals.total}</td>
              <td className="px-2 py-1.5 tabular-nums">
                {stats.satTotal ? "100%" : "—"}
              </td>
            </tr>
          </tbody>
        </table>

        <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-slate-700">Ranking</h3>
        {ranking.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-slate-500">
            No student has sat this subject yet for this examination.
          </p>
        ) : (
          <div className="mt-2 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {lists.map((list) => (
              <div key={list.title} className="overflow-hidden rounded-lg border border-slate-200">
                <p className="border-b border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  {list.title}
                </p>
                <table className="w-full border-collapse text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-200 uppercase tracking-wide text-slate-500">
                      <th className="px-2 py-1 text-center font-semibold">Pos</th>
                      <th className="px-2 py-1 font-semibold">Student</th>
                      {list.showSex ? <th className="px-2 py-1 text-center font-semibold">Sex</th> : null}
                      <th className="px-2 py-1 text-center font-semibold">Stream</th>
                      <th className="px-2 py-1 text-center font-semibold">Score</th>
                      <th className="px-2 py-1 text-center font-semibold">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.rows.map((row) => (
                      <tr key={row.studentId} className="border-b border-slate-100 last:border-0">
                        <td className="px-2 py-1 text-center font-medium text-slate-700">
                          {row.position}/{stats.satTotal}
                        </td>
                        <td className="px-2 py-1">
                          <span className="font-medium text-slate-800">{row.fullName}</span>
                          <span className="ml-1 text-slate-400">{row.studentNumber}</span>
                        </td>
                        {list.showSex ? (
                          <td className="px-2 py-1 text-center text-slate-600">{row.gender === "FEMALE" ? "F" : "M"}</td>
                        ) : null}
                        <td className="px-2 py-1 text-center text-slate-600">{row.streamName}</td>
                        <td className="px-2 py-1 text-center tabular-nums text-slate-700">{row.score}</td>
                        <td className="px-2 py-1 text-center text-slate-700">{row.grade ?? "—"}</td>
                      </tr>
                    ))}
                    {list.rows.length === 0 ? (
                      <tr>
                        <td colSpan={list.showSex ? 6 : 5} className="px-2 py-3 text-center text-slate-400">
                          No students.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-slate-700">Full Results List</h3>
        {ranking.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-slate-500">
            No student has sat this subject yet for this examination.
          </p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead>
                <tr className="border-b border-slate-200 uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-1 text-center font-semibold">#</th>
                  <th className="px-2 py-1 font-semibold">Student</th>
                  <th className="px-2 py-1 text-center font-semibold">Sex</th>
                  <th className="px-2 py-1 text-center font-semibold">Trade</th>
                  <th className="px-2 py-1 text-center font-semibold">Score</th>
                  <th className="px-2 py-1 text-center font-semibold">Grade</th>
                  <th className="px-2 py-1 text-center font-semibold">POS</th>
                  <th className="px-2 py-1 text-center font-semibold">POS-Sex</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((row, index) => (
                  <tr key={row.studentId} className="border-b border-slate-100 last:border-0">
                    <td className="px-2 py-1 text-center tabular-nums text-slate-500">{index + 1}</td>
                    <td className="px-2 py-1">
                      <span className="font-medium text-slate-800">{row.fullName}</span>
                      <span className="ml-1 text-slate-400">{row.studentNumber}</span>
                    </td>
                    <td className="px-2 py-1 text-center text-slate-600">{row.gender === "FEMALE" ? "F" : "M"}</td>
                    <td className="px-2 py-1 text-center text-slate-400">—</td>
                    <td className="px-2 py-1 text-center tabular-nums text-slate-700">{row.score}</td>
                    <td className="px-2 py-1 text-center">
                      {row.grade && GRADE_TEXT_COLORS[row.grade] ? (
                        <span className="font-bold" style={{ color: GRADE_TEXT_COLORS[row.grade] }}>
                          {row.grade}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-center tabular-nums text-slate-700">
                      {row.position}/{stats.satTotal}
                    </td>
                    <td className="px-2 py-1 text-center tabular-nums text-slate-700">
                      {row.genderPosition}/{row.gender === "FEMALE" ? stats.satFemale : stats.satMale}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 border-t border-slate-200 pt-2 text-center text-[10px] text-slate-400">
          {stats.satTotal} sat · {ranking.length} ranked · Pass mark {passMark} · Generated by Academic Report —{" "}
          {schoolName}
        </p>
      </div>
    </div>
  );
}
