import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/app-nav";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { listActiveClassStreamsForStudentAssignment } from "@/lib/services/academic";
import { getStudentById } from "@/lib/services/students";
import { StudentForm } from "../../student-form";
import { updateStudentAction } from "../../actions";

export const metadata = { title: "Edit Student" };

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [student, combos] = await Promise.all([
    getStudentById(id),
    listActiveClassStreamsForStudentAssignment(),
  ]);

  if (!student) notFound();

  const classStreams = combos.map((combo) => ({
    classLevelId: combo.classLevelId,
    classLevelName: combo.classLevel.name,
    streamId: combo.streamId,
    streamName: combo.stream.name,
  }));

  // Ensure the student's current combination is available even if it was later deactivated.
  if (!classStreams.some((c) => c.classLevelId === student.classLevelId && c.streamId === student.streamId)) {
    classStreams.push({
      classLevelId: student.classLevelId,
      classLevelName: student.classLevel.name,
      streamId: student.streamId,
      streamName: student.stream.name,
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit student"
        description={`Update the record for ${student.fullName} (${student.studentNumber}).`}
      />
      <Card>
        <CardHeader title="Student information" />
        <CardBody>
          <StudentForm
            action={updateStudentAction}
            classStreams={classStreams}
            defaultValues={{
              id: student.id,
              admissionNumber: student.admissionNumber ?? "",
              fullName: student.fullName,
              gender: student.gender,
              classLevelId: student.classLevelId,
              streamId: student.streamId,
              admissionYear: student.admissionYear,
              status: student.status,
            }}
            submitLabel="Save changes"
            successRedirect={`/students/${student.id}`}
          />
        </CardBody>
      </Card>
    </div>
  );
}
