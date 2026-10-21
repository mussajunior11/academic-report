"use client";

import { CrudForm, type CrudField } from "@/components/ui/crud-form";
import { EditDialog } from "@/components/ui/edit-dialog";
import { EditIcon } from "@/components/ui/icons";
import { examinationTypeSchema } from "@/lib/validation/schemas";
import {
  createExaminationTypeAction,
  updateExaminationTypeAction,
} from "./actions";

const examinationTypeFields: CrudField[] = [
  {
    name: "name",
    label: "Examination type",
    required: true,
    fullWidth: true,
    placeholder: "e.g. MIDTERM 2ND QUARTER",
  },
  {
    name: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "ACTIVE", label: "Active" },
      { value: "INACTIVE", label: "Inactive" },
    ],
  },
];

export function ExaminationTypeCreateForm() {
  return (
    <CrudForm
      schema={examinationTypeSchema}
      fields={examinationTypeFields}
      action={createExaminationTypeAction}
      defaultValues={{ name: "", status: "ACTIVE" }}
      submitLabel="Add type"
      resetOnSuccess
    />
  );
}

export function ExaminationTypeEditButton({
  id,
  name,
  status,
}: {
  id: string;
  name: string;
  status: string;
}) {
  return (
    <EditDialog
      triggerLabel="Edit"
      triggerIcon={<EditIcon />}
      title="Edit examination type"
      schema={examinationTypeSchema}
      fields={examinationTypeFields}
      action={updateExaminationTypeAction}
      defaultValues={{ name, status }}
      hiddenValues={{ id }}
    />
  );
}
