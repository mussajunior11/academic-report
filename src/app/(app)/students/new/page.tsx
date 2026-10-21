import { PageHeader } from "@/components/layout/app-nav";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { getCurrentAcademicYear } from "@/lib/services/school";
import { listActiveClassStreamsForStudentAssignment } from "@/lib/services/academic";
import { StudentForm } from "../student-form";
import { createStudentAction } from "../actions";

export const metadata = { title: "Register Student" };
export const dynamic = "force-dynamic";

export default async function NewStudentPage() {
  const [combos, year] = await Promise.all([
    listActiveClassStreamsForStudentAssignment(),
    getCurrentAcademicYear(),
  ]);

  const classStreams = combos.map((combo) => ({
    classLevelId: combo.classLevelId,
    classLevelName: combo.classLevel.name,
    streamId: combo.streamId,
    streamName: combo.stream.name,
  }));

  const defaultYear = year ? Number(year.name.replace(/\D/g, "").slice(0, 4)) || new Date().getFullYear() : new Date().getFullYear();

  return (
    <div className="space-y-6">
      <PageHeader title="Register a student" description="Create a new student record." />
      <Card>
        <CardHeader title="Student information" />
        <CardBody>
          <StudentForm
            action={createStudentAction}
            classStreams={classStreams}
            defaultValues={{
              admissionNumber: "",
              fullName: "",
              gender: "",
              classLevelId: "",
              streamId: "",
              admissionYear: defaultYear,
              status: "ACTIVE",
            }}
            submitLabel="Register student"
            successRedirect="/students"
          />
        </CardBody>
      </Card>
    </div>
  );
}
