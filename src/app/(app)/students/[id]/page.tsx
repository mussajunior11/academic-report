import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { PageHeader } from "@/components/layout/app-nav";
import { listCompulsorySubjectIdsForStudent, listSubjects } from "@/lib/services/academic";
import { getCurrentAcademicYear, listAcademicYears } from "@/lib/services/school";
import { getStudentById, getStudentSubjectIds } from "@/lib/services/students";
import { SubjectRegistration } from "./subject-registration";

export const metadata = { title: "Student Details" };

function formatDate(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(value);
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{value}</dd>
    </div>
  );
}

export default async function StudentDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { id } = await params;
  const { year } = await searchParams;

  const student = await getStudentById(id);
  if (!student) notFound();

  const [years, currentYear, subjects] = await Promise.all([
    listAcademicYears(),
    getCurrentAcademicYear(),
    listSubjects(false),
  ]);

  const selectedYearId = year ?? currentYear?.id ?? years[0]?.id ?? "";
  const compulsoryIds = await listCompulsorySubjectIdsForStudent(student.classLevelId, student.streamId);
  const registeredIds = selectedYearId ? await getStudentSubjectIds(student.id, selectedYearId) : [];
  const registeredSet = new Set([...compulsoryIds, ...registeredIds]);
  const registeredSubjects = subjects.filter((subject) => registeredSet.has(subject.id));

  return (
    <div className="space-y-6">
      <PageHeader
        title={student.fullName}
        description={`${student.studentNumber} · ${student.classLevel.name} · Stream ${student.stream.name}`}
        actions={
          <>
            <Link href={`/students/${student.id}/edit`} className={buttonClasses("secondary", "md")}>
              Edit
            </Link>
            <Link href="/students" className={buttonClasses("ghost", "md")}>
              Back to list
            </Link>
          </>
        }
      />

      <Card>
        <CardHeader title="Registered information" />
        <CardBody>
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Detail label="Student number" value={<span className="font-mono text-xs">{student.studentNumber}</span>} />
            <Detail label="Admission number" value={student.admissionNumber ?? "—"} />
            <Detail label="Full name" value={student.fullName} />
            <Detail
              label="Gender"
              value={student.gender.charAt(0) + student.gender.slice(1).toLowerCase()}
            />
            <Detail label="Class" value={student.classLevel.name} />
            <Detail label="Stream" value={student.stream.name} />
            <Detail label="Admission year" value={student.admissionYear} />
            <Detail label="Status" value={<StatusBadge status={student.status} />} />
            <Detail
              label="Support needs"
              value={
                student.specialNeeds.length === 0 ? (
                  <span className="text-slate-500">None</span>
                ) : (
                  <div className="space-y-1.5">
                    {student.specialNeeds.map((need) => (
                      <div key={need.categoryId}>
                        <Badge tone="warning">{need.category.label}</Badge>
                        {need.note ? (
                          <p className="mt-0.5 text-xs text-slate-500">{need.note}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )
              }
            />
            <Detail label="Date created" value={formatDate(student.createdAt)} />
            <Detail label="Date updated" value={formatDate(student.updatedAt)} />
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Subject registration"
          description="Compulsory subjects for this class are pre-registered and can't be removed here. Optional subjects can be registered or unregistered — changes are saved together."
          actions={
            years.length > 1 ? (
              <form method="get" className="flex items-center gap-2">
                <label htmlFor="year" className="text-xs font-medium text-slate-600">
                  Academic year
                </label>
                <Select id="year" name="year" defaultValue={selectedYearId} className="w-40">
                  {years.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
                </Select>
                <button type="submit" className={buttonClasses("secondary", "sm")}>
                  View
                </button>
              </form>
            ) : null
          }
        />
        <CardBody>
          {selectedYearId ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Registered subjects ({registeredSubjects.length})
                </p>
                {registeredSubjects.length === 0 ? (
                  <p className="text-sm text-slate-500">No subjects registered for this academic year.</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {registeredSubjects.map((subject) => (
                      <Badge key={subject.id} tone="info">
                        {subject.name}
                        {subject.code ? ` · ${subject.code}` : ""}
                        {subject.numericCode ? ` (${subject.numericCode})` : ""}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <SubjectRegistration
                studentId={student.id}
                studentName={student.fullName}
                academicYearId={selectedYearId}
                subjects={subjects.map((s) => ({
                  id: s.id,
                  name: s.name,
                  code: s.code,
                  numericCode: s.numericCode,
                }))}
                compulsoryIds={compulsoryIds}
                registeredIds={registeredIds}
              />
            </div>
          ) : (
            <p className="text-sm text-slate-500">No academic year is configured.</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Examination history" description="Available in a later phase." />
        <CardBody>
          <p className="text-sm text-slate-500">
            Examination results and report cards will be built in Phase 2 and Phase 3.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
