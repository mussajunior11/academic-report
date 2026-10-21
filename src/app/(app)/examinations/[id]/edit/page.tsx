import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/app-nav";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { listClassLevels } from "@/lib/services/academic";
import { getExaminationById, listExaminationTypes } from "@/lib/services/examinations";
import { listAcademicYears } from "@/lib/services/school";
import { ExaminationForm } from "../../examination-form";
import { updateExaminationAction } from "../../actions";

export const metadata = { title: "Edit Examination" };

function toDateInput(value: Date | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export default async function EditExaminationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [exam, types, years, classes] = await Promise.all([
    getExaminationById(id),
    listExaminationTypes(),
    listAcademicYears(),
    listClassLevels(),
  ]);

  if (!exam) notFound();

  const typeOptions = types
    .filter((type) => type.status === "ACTIVE" || type.id === exam.typeId)
    .map((type) => ({ value: type.id, label: type.name }));

  return (
    <div className="space-y-6">
      <PageHeader title="Edit examination" description={`Update ${exam.type.name} · ${exam.classLevel.name}.`} />
      <Card>
        <CardHeader title="Examination details" />
        <CardBody>
          <ExaminationForm
            action={updateExaminationAction}
            id={exam.id}
            typeOptions={typeOptions}
            yearOptions={years.map((y) => ({ value: y.id, label: y.name }))}
            classOptions={classes.map((c) => ({ value: c.id, label: c.name }))}
            defaultValues={{
              typeId: exam.typeId,
              classLevelId: exam.classLevelId,
              academicYearId: exam.academicYearId,
              term: exam.term ?? "",
              name: exam.name ?? "",
              startDate: toDateInput(exam.startDate),
              endDate: toDateInput(exam.endDate),
              status: exam.status,
            }}
            submitLabel="Save changes"
            successRedirect="/examinations"
          />
        </CardBody>
      </Card>
    </div>
  );
}
