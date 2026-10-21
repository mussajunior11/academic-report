"use client";

import { CrudForm, type CrudField } from "@/components/ui/crud-form";
import { settingsSchema } from "@/lib/validation/schemas";
import type { ActionState } from "@/lib/validation/helpers";

export function SettingsForm({
  action,
  yearOptions,
  defaultValues,
}: {
  action: (input: unknown) => Promise<ActionState>;
  yearOptions: { value: string; label: string }[];
  defaultValues: Record<string, unknown>;
}) {
  const fields: CrudField[] = [
    { name: "schoolName", label: "School name", required: true, fullWidth: true },
    { name: "address", label: "Address", type: "textarea", fullWidth: true },
    { name: "poBox", label: "P.O. Box" },
    { name: "defaultAcademicYearId", label: "Default academic year", type: "select", options: [{ value: "", label: "Not set" }, ...yearOptions] },
    { name: "mobile1", label: "Mobile 1", type: "tel" },
    { name: "mobile2", label: "Mobile 2", type: "tel" },
    { name: "mobile3", label: "Mobile 3", type: "tel" },
    { name: "email", label: "Email", type: "email" },
    { name: "website", label: "Website", placeholder: "https://", fullWidth: true },
  ];

  return (
    <CrudForm
      schema={settingsSchema}
      fields={fields}
      action={action}
      defaultValues={defaultValues}
      submitLabel="Save settings"
      successRedirect="/settings"
    />
  );
}
