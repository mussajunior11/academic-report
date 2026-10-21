"use client";

import { useState } from "react";
import type { z } from "zod";
import { CrudForm, type CrudField } from "@/components/ui/crud-form";
import { Modal } from "@/components/ui/modal";
import { buttonClasses } from "@/components/ui/button";
import type { ActionState } from "@/lib/validation/helpers";

export function EditDialog({
  triggerLabel = "Edit",
  triggerIcon,
  title,
  schema,
  fields,
  action,
  defaultValues,
  hiddenValues,
  columns = 2,
}: {
  triggerLabel?: string;
  triggerIcon?: React.ReactNode;
  title: string;
  schema: z.ZodType<unknown, unknown>;
  fields: CrudField[];
  action: (input: unknown) => Promise<ActionState>;
  defaultValues: Record<string, unknown>;
  hiddenValues: Record<string, unknown>;
  columns?: 1 | 2 | 3;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={triggerIcon ? triggerLabel : undefined}
        aria-label={triggerIcon ? triggerLabel : undefined}
        className={buttonClasses("ghost", triggerIcon ? "icon" : "sm")}
      >
        {triggerIcon ?? triggerLabel}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <CrudForm
          schema={schema}
          fields={fields}
          action={action}
          defaultValues={defaultValues}
          hiddenValues={hiddenValues}
          columns={columns}
          submitLabel="Save changes"
          onSuccess={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
