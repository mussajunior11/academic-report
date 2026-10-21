import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/app-nav";
import { ActionButton } from "@/components/ui/action-button";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { getMarksEntry } from "@/lib/services/marks";
import { registerClassSubjectsAction } from "../actions";
import { MarksGrid } from "./marks-grid";
import { MarksActions } from "./marks-actions";

export const metadata = { title: "Marks Entry" };
export const dynamic = "force-dynamic";

export default async function MarksEntryGridPage({
  params,
}: {
  params: Promise<{ examinationId: string }>;
}) {
  const { examinationId } = await params;
  const data = await getMarksEntry(examinationId);
  if (!data) notFound();

  const { examination, students, subjects, canEdit } = data;
  const hasData = students.length > 0 && subjects.length > 0;

  const streams = [
    ...new Map(students.map((student) => [student.streamId, { id: student.streamId, name: student.streamName }])).values(),
  ].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      <PageHeader
        title={examination.name}
        description={`${examination.typeName} · ${examination.classLevelName} · ${examination.term ?? "—"} · ${examination.academicYearName}`}
        actions={
          <>
            <StatusBadge status={examination.status} />
            <Link href="/marks-entry" className={buttonClasses("secondary", "md")}>
              Back to examinations
            </Link>
          </>
        }
      />

      {!canEdit ? (
        <Alert tone="warning">
          This examination is closed. Marks are shown read-only. Reopen it to make changes.
        </Alert>
      ) : null}

      {!hasData ? (
        students.length > 0 ? (
          <Alert tone="info">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>
                {students.length} student{students.length === 1 ? "" : "s"} in{" "}
                {examination.classLevelName} have no registered subjects for{" "}
                {examination.academicYearName} yet. Register the class&apos;s compulsory subjects to
                start entering marks.
              </span>
              <ActionButton
                action={registerClassSubjectsAction}
                arg={{ examinationId: examination.id }}
                variant="primary"
                successMessage="Subjects registered for the class. You can enter marks now."
              >
                Register class subjects
              </ActionButton>
            </div>
          </Alert>
        ) : (
          <Alert tone="info">
            No active students were found in {examination.classLevelName}. Register students in this
            class, then try again.
          </Alert>
        )
      ) : (
        <>
          <MarksActions
            examinationId={examination.id}
            subjects={subjects}
            streams={streams}
            canEdit={canEdit}
          />
          <MarksGrid data={data} />
        </>
      )}
    </div>
  );
}
