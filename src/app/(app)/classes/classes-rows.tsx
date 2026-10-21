"use client";

import { EditDialog } from "@/components/ui/edit-dialog";
import type { CrudField } from "@/components/ui/crud-form";
import { classLevelSchema, streamSchema } from "@/lib/validation/schemas";
import { updateClassLevelAction, updateStreamAction } from "./actions";

const statusField: CrudField = {
  name: "status",
  label: "Status",
  type: "select",
  options: [
    { value: "ACTIVE", label: "Active" },
    { value: "INACTIVE", label: "Inactive" },
  ],
};

export function ClassLevelEditButton({
  id,
  name,
  sortOrder,
  status,
}: {
  id: string;
  name: string;
  sortOrder: number;
  status: string;
}) {
  const fields: CrudField[] = [
    { name: "name", label: "Class name", required: true, fullWidth: true },
    { name: "sortOrder", label: "Sort order", type: "number" },
    statusField,
  ];
  return (
    <EditDialog
      title="Edit class"
      schema={classLevelSchema}
      fields={fields}
      action={updateClassLevelAction}
      defaultValues={{ name, sortOrder, status }}
      hiddenValues={{ id }}
    />
  );
}

export function StreamEditButton({
  id,
  name,
  sortOrder,
  status,
}: {
  id: string;
  name: string;
  sortOrder: number;
  status: string;
}) {
  const fields: CrudField[] = [
    { name: "name", label: "Stream name", required: true, fullWidth: true },
    { name: "sortOrder", label: "Sort order", type: "number" },
    statusField,
  ];
  return (
    <EditDialog
      title="Edit stream"
      schema={streamSchema}
      fields={fields}
      action={updateStreamAction}
      defaultValues={{ name, sortOrder, status }}
      hiddenValues={{ id }}
    />
  );
}
