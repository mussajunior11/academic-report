import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/app-nav";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { getExaminationById } from "@/lib/services/examinations";
import { getMarksEntry } from "@/lib/services/marks";

export const metadata = { title: "Examination" };
export const dynamic = "force-dynamic";

function formatDate(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(value);
}

export default async function ExaminationDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [exam, entry] = await Promise.all([getExaminationById(id), getMarksEntry(id)]);
  if (!exam) notFound();

  const students = entry?.students.length ?? 0;
  const subjects = entry?.subjects.length ?? 0;
  const expected = entry?.students.reduce((sum, student) => sum + student.subjectIds.length, 0) ?? 0;
  const entered = entry?.marks.length ?? 0;
  const percent = expected > 0 ? Math.min(100, Math.round((entered / expected) * 100)) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={exam.name || exam.type.name}
        description={`${exam.type.name} · ${exam.classLevel.name} · ${exam.term ?? "—"} · ${exam.academicYear.name}`}
        actions={
          <>
            <StatusBadge status={exam.status} />
            <Link href={`/examinations/${exam.id}/entry-status`} className={buttonClasses("primary", "md")}>
              Entry Status
            </Link>
            <Link href={`/examinations/${exam.id}/subject-performance`} className={buttonClasses("secondary", "md")}>
              Subject Performance
            </Link>
            <Link href={`/examinations/${exam.id}/edit`} className={buttonClasses("secondary", "md")}>
              Edit
            </Link>
            <Link href="/examinations" className={buttonClasses("secondary", "md")}>
              All exams
            </Link>
          </>
        }
      />

      <Card>
        <CardHeader title="Examination details" />
        <CardBody>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="mb-1 text-xs font-medium text-slate-700">Type</dt>
              <dd className="text-sm text-slate-800">{exam.type.name}</dd>
            </div>
            <div>
              <dt className="mb-1 text-xs font-medium text-slate-700">Name</dt>
              <dd className="text-sm text-slate-800">{exam.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="mb-1 text-xs font-medium text-slate-700">Class</dt>
              <dd className="text-sm text-slate-800">{exam.classLevel.name}</dd>
            </div>
            <div>
              <dt className="mb-1 text-xs font-medium text-slate-700">Term</dt>
              <dd className="text-sm text-slate-800">{exam.term ?? "—"}</dd>
            </div>
            <div>
              <dt className="mb-1 text-xs font-medium text-slate-700">Academic year</dt>
              <dd className="text-sm text-slate-800">{exam.academicYear.name}</dd>
            </div>
            <div>
              <dt className="mb-1 text-xs font-medium text-slate-700">Status</dt>
              <dd className="text-sm">
                <StatusBadge status={exam.status} />
              </dd>
            </div>
            <div>
              <dt className="mb-1 text-xs font-medium text-slate-700">Start date</dt>
              <dd className="text-sm text-slate-800">{formatDate(exam.startDate)}</dd>
            </div>
            <div>
              <dt className="mb-1 text-xs font-medium text-slate-700">End date</dt>
              <dd className="text-sm text-slate-800">{formatDate(exam.endDate)}</dd>
            </div>
            <div>
              <dt className="mb-1 text-xs font-medium text-slate-700">Created</dt>
              <dd className="text-sm text-slate-800">{formatDate(exam.createdAt)}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Marks progress"
          description="Marks entered against the marks registered students are expected to submit."
        />
        <CardBody className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Students</p>
              <p className="mt-1 text-2xl font-semibold text-slate-800">{students}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Subjects</p>
              <p className="mt-1 text-2xl font-semibold text-slate-800">{subjects}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total records</p>
              <p className="mt-1 text-2xl font-semibold text-slate-800">{expected}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Marks entered</p>
              <p className="mt-1 text-2xl font-semibold text-slate-800">{entered}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Marks progress</p>
              <p className="mt-1 text-2xl font-semibold text-slate-800">{percent}%</p>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
              <span>Marks completion</span>
              <span>{percent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-royal" style={{ width: `${percent}%` }} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/marks-entry/${exam.id}`} className={buttonClasses("primary", "md")}>
              Open marks entry
            </Link>
            <a
              href={`/api/marks-entry/template?examinationId=${exam.id}`}
              className={buttonClasses("secondary", "md")}
            >
              Download Excel template
            </a>
            <Link href={`/examinations/${exam.id}/class-results`} className={buttonClasses("secondary", "md")}>
              Class results
            </Link>
            <Link
              href={`/examinations/${exam.id}/results?print=1`}
              className={buttonClasses("secondary", "md")}
            >
              Download PDF results
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
