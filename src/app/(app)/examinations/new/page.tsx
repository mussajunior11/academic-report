import { PageHeader } from "@/components/layout/app-nav";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { listClassLevels } from "@/lib/services/academic";
import { listExaminationTypes } from "@/lib/services/examinations";
import { getCurrentAcademicYear, listAcademicYears } from "@/lib/services/school";
import { ExaminationForm } from "../examination-form";
import { createExaminationAction } from "../actions";

export const metadata = { title: "Create Examination" };
export const dynamic = "force-dynamic";

export default async function NewExaminationPage() {
  const [types, years, classes, currentYear] = await Promise.all([
    listExaminationTypes(false),
    listAcademicYears(),
    listClassLevels(),
    getCurrentAcademicYear(),
  ]);

  const yearOptions = years.map((y) => ({ value: y.id, label: y.name }));

  return (
    <div className="space-y-6">
      <PageHeader title="Create an examination" description="Define an examination for a class within an academic period." />
      <Card>
        <CardHeader title="Examination details" />
        <CardBody>
          <ExaminationForm
            action={createExaminationAction}
            typeOptions={types.map((t) => ({ value: t.id, label: t.name }))}
            yearOptions={yearOptions}
            classOptions={classes.map((c) => ({ value: c.id, label: c.name }))}
            defaultValues={{
              typeId: "",
              classLevelId: "",
              academicYearId: currentYear?.id ?? years[0]?.id ?? "",
              term: "",
              name: "",
              startDate: "",
              endDate: "",
              status: "DRAFT",
            }}
            submitLabel="Create examination"
            successRedirect="/examinations"
          />
        </CardBody>
      </Card>
    </div>
  );
}
