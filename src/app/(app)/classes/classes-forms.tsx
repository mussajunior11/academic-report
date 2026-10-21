"use client";

import { CrudForm, type CrudField } from "@/components/ui/crud-form";
import {
  createClassLevelAction,
  createClassStreamAction,
  createStreamAction,
} from "./actions";
import {
  classLevelSchema,
  classStreamSchema,
  streamSchema,
} from "@/lib/validation/schemas";

const statusField: CrudField = {
  name: "status",
  label: "Status",
  type: "select",
  options: [
    { value: "ACTIVE", label: "Active" },
    { value: "INACTIVE", label: "Inactive" },
  ],
};

export function ClassLevelCreateForm() {
  const fields: CrudField[] = [
    { name: "name", label: "Class name", required: true, placeholder: "e.g. FORM 5", fullWidth: true },
    { name: "sortOrder", label: "Sort order", type: "number", hint: "Lower numbers appear first" },
    statusField,
  ];
  return (
    <CrudForm
      schema={classLevelSchema}
      fields={fields}
      action={createClassLevelAction}
      defaultValues={{ name: "", sortOrder: 0, status: "ACTIVE" }}
      submitLabel="Add class"
      resetOnSuccess
    />
  );
}

export function StreamCreateForm() {
  const fields: CrudField[] = [
    { name: "name", label: "Stream name", required: true, placeholder: "e.g. F", fullWidth: true },
    { name: "sortOrder", label: "Sort order", type: "number", hint: "Lower numbers appear first" },
    statusField,
  ];
  return (
    <CrudForm
      schema={streamSchema}
      fields={fields}
      action={createStreamAction}
      defaultValues={{ name: "", sortOrder: 0, status: "ACTIVE" }}
      submitLabel="Add stream"
      resetOnSuccess
    />
  );
}

export function ClassStreamCreateForm({
  classOptions,
  streamOptions,
}: {
  classOptions: { value: string; label: string }[];
  streamOptions: { value: string; label: string }[];
}) {
  const fields: CrudField[] = [
    {
      name: "classLevelId",
      label: "Class",
      type: "select",
      required: true,
      options: [{ value: "", label: "Select a class" }, ...classOptions],
    },
    {
      name: "streamId",
      label: "Stream",
      type: "select",
      required: true,
      options: [{ value: "", label: "Select a stream" }, ...streamOptions],
    },
    statusField,
  ];
  return (
    <CrudForm
      schema={classStreamSchema}
      fields={fields}
      action={createClassStreamAction}
      defaultValues={{ classLevelId: "", streamId: "", status: "ACTIVE" }}
      submitLabel="Add combination"
      resetOnSuccess
    />
  );
}
