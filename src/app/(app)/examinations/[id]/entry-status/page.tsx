import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { getMarksEntry } from "@/lib/services/marks";
import { getSchoolSettings } from "@/lib/services/school";
import { EntryStatusPrintControls } from "./entry-status-print-controls";

export const metadata = { title: "Entry status" };
export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return `${String(value.getUTCDate()).padStart(2, "0")}/${String(value.getUTCMonth() + 1).padStart(2, "0")}/${value.getUTCFullYear()}`;
}

function subjectLabel(subject: { name: string; code: string | null; numericCode: string | null }) {
  const prefix = subject.numericCode || subject.code;
  return prefix ? `${prefix} ${subject.name}` : subject.name;
}

export default async function EntryStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [entry, schoolSettings] = await Promise.all([getMarksEntry(id), getSchoolSettings()]);
  if (!entry) notFound();

  const { examination, subjects, students, marks } = entry;
  const schoolName = schoolSettings?.settings.schoolName ?? schoolSettings?.school.name ?? "School";
  const logoUrl = schoolSettings?.settings.logoUrl ?? schoolSettings?.school.logoUrl ?? null;

  const registeredByStudent = new Map(students.map((student) => [student.id, new Set(student.subjectIds)]));

  const subjectStats = subjects.map((subject) => {
    const registeredIds = new Set(
      students.filter((student) => registeredByStudent.get(student.id)?.has(subject.id)).map((s) => s.id),
    );
    const completed = marks.filter((mark) => mark.subjectId === subject.id && registeredIds.has(mark.studentId)).length;
    const percent = registeredIds.size > 0 ? Math.round((completed / registeredIds.size) * 100) : 0;
    return { subject, registered: registeredIds.size, completed, percent };
  });

  const totalRecords = subjectStats.reduce((sum, row) => sum + row.registered, 0);
  const totalCompleted = subjectStats.reduce((sum, row) => sum + row.completed, 0);
  const overallPercent = totalRecords > 0 ? Math.round((totalCompleted / totalRecords) * 100) : 0;
  const subjectsCompleted = subjectStats.filter((row) => row.registered > 0 && row.completed >= row.registered).length;
  const subjectsPending = subjectStats.length - subjectsCompleted;

  const statCards = [
    { label: "Total subjects", value: subjects.length },
    { label: "Total records", value: totalRecords },
    { label: "Subjects completed", value: subjectsCompleted },
    { label: "Subjects pending", value: subjectsPending },
  ];

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Link href={`/examinations/${id}`} className={buttonClasses("secondary", "md")}>
          Back to examination
        </Link>
        <EntryStatusPrintControls autoPrint={query.print === "1"} />
      </div>

      <div className="report-sheet print-exact mx-auto w-full max-w-4xl rounded-lg border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-300 pb-3">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={`${schoolName} logo`} className="h-12 w-auto object-contain" />
            ) : null}
            <div>
              <h1 className="text-lg font-bold uppercase tracking-wide">{schoolName}</h1>
              <p className="text-[11px] text-slate-600">Examination entry status</p>
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

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statCards.map((card) => (
            <div key={card.label} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-800">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-[11px] text-slate-600">
            <span className="font-semibold text-slate-700">Overall entry completion</span>
            <span>
              {totalCompleted} / {totalRecords} · {overallPercent}%
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-royal" style={{ width: `${overallPercent}%` }} />
          </div>
        </div>

        <table className="mt-5 w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-y border-slate-300 bg-slate-50 uppercase tracking-wide text-slate-500">
              <th className="px-2 py-2 font-semibold">Subject</th>
              <th className="px-2 py-2 text-right font-semibold">Students</th>
              <th className="px-2 py-2 font-semibold">Completion status</th>
            </tr>
          </thead>
          <tbody>
            {subjectStats.map((row) => (
              <tr key={row.subject.id} className="border-b border-slate-100 align-middle">
                <td className="px-2 py-2 font-medium text-slate-800">{subjectLabel(row.subject)}</td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-700">{row.registered}</td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-full max-w-[16rem] overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-royal" style={{ width: `${row.percent}%` }} />
                    </div>
                    <span className="w-10 shrink-0 text-right tabular-nums font-semibold text-slate-700">
                      {row.percent}%
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {row.completed}/{row.registered} students completed
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {subjectStats.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-slate-500">
            No subjects are registered for this examination yet.
          </p>
        ) : null}

        <p className="mt-4 border-t border-slate-200 pt-2 text-center text-[10px] text-slate-400">
          {subjects.length} subject{subjects.length === 1 ? "" : "s"} · {totalCompleted} of {totalRecords} records
          entered · Generated by Academic Report — {schoolName}
        </p>
      </div>
    </div>
  );
}
