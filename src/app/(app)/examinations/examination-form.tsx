"use client";

import { CrudForm, type CrudField } from "@/components/ui/crud-form";
import { TERMS } from "@/lib/constants";
import { examinationSchema } from "@/lib/validation/schemas";
import type { ActionState } from "@/lib/validation/helpers";

export function ExaminationForm({
  action,
  id,
  typeOptions,
  yearOptions,
  classOptions,
  defaultValues,
  submitLabel,
  successRedirect,
}: {
  action: (input: unknown) => Promise<ActionState>;
  id?: string;
  typeOptions: { value: string; label: string }[];
  yearOptions: { value: string; label: string }[];
  classOptions: { value: string; label: string }[];
  defaultValues: Record<string, unknown>;
  submitLabel: string;
  successRedirect: string;
}) {
  const fields: CrudField[] = [
    {
      name: "typeId",
      label: "Examination type",
      type: "select",
      required: true,
      options: [{ value: "", label: "Select examination type" }, ...typeOptions],
    },
    {
      name: "classLevelId",
      label: "Class",
      type: "select",
      required: true,
      options: [{ value: "", label: "Select class" }, ...classOptions],
    },
    {
      name: "academicYearId",
      label: "Academic year",
      type: "select",
      required: true,
      options: [{ value: "", label: "Select academic year" }, ...yearOptions],
    },
    {
      name: "term",
      label: "Term / period",
      type: "select",
      required: true,
      options: [{ value: "", label: "Select term" }, ...TERMS.map((t) => ({ value: t, label: t }))],
    },
    { name: "name", label: "Display name (optional)", placeholder: "e.g. Form 1 Terminal Examination", fullWidth: true },
    { name: "startDate", label: "Start date (optional)", type: "date" },
    { name: "endDate", label: "End date (optional)", type: "date" },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "DRAFT", label: "Draft" },
        { value: "OPEN", label: "Open" },
        { value: "CLOSED", label: "Closed" },
      ],
    },
  ];

  return (
    <CrudForm
      schema={examinationSchema}
      fields={fields}
      action={action}
      defaultValues={defaultValues}
      hiddenValues={id ? { id } : undefined}
      submitLabel={submitLabel}
      successRedirect={successRedirect}
    />
  );
}
