import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { formatReportDate, getExaminationBreak, getStudentReport } from "@/lib/services/reports";
import { getSchoolSettings } from "@/lib/services/school";
import { PrintButton } from "./print-button";
import { RemarksEditor } from "./remarks-editor";

export const metadata = { title: "Report Form" };
export const dynamic = "force-dynamic";

export default async function StudentReportPage({
  params,
}: {
  params: Promise<{ examinationId: string; studentId: string }>;
}) {
  const { examinationId, studentId } = await params;
  const report = await getStudentReport(examinationId, studentId);
  if (!report) notFound();

  const [card] = report.students;
  if (!card) notFound();

  const [schoolData, schoolBreak] = await Promise.all([
    getSchoolSettings(),
    getExaminationBreak(examinationId),
  ]);

  const school = schoolData?.school;
  const settings = schoolData?.settings;
  const schoolName = settings?.schoolName?.trim() || school?.name || "School";
  const poBox = settings?.poBox ?? school?.poBox ?? null;
  const address = settings?.address ?? school?.address ?? null;
  const phones = [
    settings?.mobile1 ?? school?.mobile1,
    settings?.mobile2 ?? school?.mobile2,
    settings?.mobile3 ?? school?.mobile3,
  ]
    .filter(Boolean)
    .join(" · ");
  const email = settings?.email ?? school?.email ?? null;
  const website = settings?.website ?? school?.website ?? null;
  const logoUrl = settings?.logoUrl ?? school?.logoUrl ?? null;
  const systemLogoUrl = settings?.systemLogoUrl ?? null;
  const headMasterSignatureUrl = settings?.headMasterSignatureUrl ?? null;

  const { examination } = report;
  const printedOn = formatReportDate(new Date());

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Link href={`/reports/${examinationId}`} className={buttonClasses("secondary", "md")}>
          Back to reports
        </Link>
        <PrintButton />
      </div>

      <div className="report-sheet relative mx-auto w-full max-w-3xl overflow-hidden rounded-lg border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
        {systemLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={systemLogoUrl}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 m-auto h-[70%] w-[70%] object-contain opacity-[0.15] print:opacity-[0.15]"
          />
        ) : null}

        <div className="relative z-10 flex h-full flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="w-20">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={`${schoolName} logo`} className="h-16 w-auto object-contain" />
            ) : null}
          </div>
          <div className="flex-1 text-center">
            <h1 className="text-lg font-bold uppercase tracking-wide">{schoolName}</h1>
            {poBox || address ? (
              <p className="text-[11px] text-slate-600">{[poBox, address].filter(Boolean).join(" · ")}</p>
            ) : null}
            <p className="text-[11px] text-slate-600">{[phones, email, website].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="flex w-20 flex-col items-end gap-2">
            {systemLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={systemLogoUrl} alt={`${schoolName} system logo`} className="h-16 w-auto object-contain" />
            ) : null}
            <div className="text-right text-[10px] leading-tight text-slate-500">
              <p>Printed</p>
              <p>{printedOn}</p>
            </div>
          </div>
        </div>

        <hr className="my-3 border-slate-300" />

        <h2 className="text-center text-base font-bold underline">{examination.title}</h2>

        {/* Student block */}
        <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <p>
            <span className="font-semibold">Student&apos;s Name:</span> {card.student.fullName}
          </p>
          <p>
            <span className="font-semibold">Class:</span> {card.student.classLevelName}
          </p>
          <p>
            <span className="font-semibold">Student Number:</span> {card.student.studentNumber}
          </p>
          <p>
            <span className="font-semibold">Stream:</span> {card.student.streamName}
          </p>
        </div>

        {/* Subject results */}
        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-400 px-3 py-1.5 text-left font-semibold uppercase">Subject</th>
              <th className="w-24 border border-slate-400 px-3 py-1.5 text-center font-semibold uppercase">Marks</th>
              <th className="w-24 border border-slate-400 px-3 py-1.5 text-center font-semibold uppercase">Grade</th>
              <th className="w-32 border border-slate-400 px-3 py-1.5 text-center font-semibold uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {card.subjects.length === 0 ? (
              <tr>
                <td colSpan={4} className="border border-slate-400 px-3 py-3 text-center text-slate-500">
                  No subjects are registered for this student.
                </td>
              </tr>
            ) : (
              card.subjects.map((row) => (
                <tr key={row.subjectId}>
                  <td className="border border-slate-400 px-3 py-1.5">{row.name}</td>
                  <td className="border border-slate-400 px-3 py-1.5 text-center tabular-nums">
                    {row.score ?? ""}
                  </td>
                  <td className="border border-slate-400 px-3 py-1.5 text-center">{row.grade ?? ""}</td>
                  <td className="border border-slate-400 px-3 py-1.5 text-center">{row.remark ?? ""}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Summary */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Total Marks", value: card.totalMarks },
            { label: "Average", value: card.gradedSubjects ? card.average : "—" },
            { label: "Grade", value: card.averageGrade ?? "—" },
            {
              label: "Position",
              value: card.position ? `${card.position} of ${card.classSize}` : "—",
            },
            { label: "Division", value: card.division },
            { label: "Points", value: card.totalPoints },
          ].map((item) => (
            <div key={item.label} className="rounded border border-slate-400 px-2 py-1.5 text-center">
              <p className="text-[10px] font-semibold uppercase text-slate-500">{item.label}</p>
              <p className="font-semibold">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Grading scale */}
        <div className="mt-4">
          <p className="text-sm font-bold uppercase">Grading</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700">
            {report.gradeScale.map((grade) => (
              <span key={grade.code}>
                <span className="font-semibold">{grade.code}</span>: {grade.minScore}–{grade.maxScore}
                {grade.remark ? ` (${grade.remark})` : ""}
              </span>
            ))}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700">
            {report.divisionScale.map((division) => (
              <span key={division.code}>
                <span className="font-semibold">Division {division.code}</span>: {division.minPoints}–{division.maxPoints} pts
              </span>
            ))}
          </div>
        </div>

        <hr className="my-4 border-slate-300" />

        {/* Remarks */}
        <RemarksEditor
          examinationId={examinationId}
          studentId={studentId}
          academicMaster={card.remarks.academicMaster}
          headMaster={card.remarks.headMaster}
        />

        <div className="mt-6 flex justify-end">
          <div className="w-56 text-center text-xs text-slate-600">
            <div className="flex h-12 items-end justify-center">
              {headMasterSignatureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={headMasterSignatureUrl}
                  alt="Head master's signature"
                  className="max-h-12 w-auto max-w-full object-contain"
                />
              ) : null}
            </div>
            <div className="border-b border-slate-500" />
            <p className="mt-1 font-semibold">Head Master&apos;s Signature</p>
          </div>
        </div>

        <hr className="my-4 border-slate-300" />

        {/* Term break */}
        <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
          <p>
            <span className="font-semibold">School closes on:</span> {formatReportDate(schoolBreak.closesOn)}
          </p>
          <p className="text-center">
            <span className="font-semibold">Holiday Length:</span> {schoolBreak.holidayLength ?? "—"}
          </p>
          <p className="text-right">
            <span className="font-semibold">School reopens on:</span> {formatReportDate(schoolBreak.reopensOn)}
          </p>
        </div>

        <p className="mt-4 text-center text-[10px] text-slate-400">
          Generated by Academic Report — {schoolName}
        </p>
        </div>
      </div>
    </div>
  );
}
