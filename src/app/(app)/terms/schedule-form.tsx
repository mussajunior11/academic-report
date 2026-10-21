"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { PeriodProgress } from "@/components/ui/period-progress";
import { Spinner } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import type { ActionState } from "@/lib/validation/helpers";
import { quarterScheduleSchema, termScheduleSchema } from "@/lib/validation/schemas";
import { saveQuarterDatesAction, saveTermDatesAction } from "./actions";

export type ScheduleRow = {
  /** Global index of the row within the flat field array. */
  index: number;
  id: string;
  name: string;
  startDate: string;
  endDate: string;
};

export type ScheduleGroup = { heading?: string; rows: ScheduleRow[] };

export function ScheduleForm({
  academicYearId,
  fieldName,
  groups,
  today,
  submitLabel,
}: {
  academicYearId: string;
  fieldName: "terms" | "quarters";
  groups: ScheduleGroup[];
  today: string;
  submitLabel: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [message, setMessage] = useState<ActionState>(null);
  const [pending, startTransition] = useTransition();

  const ordered = groups.flatMap((group) => group.rows).sort((a, b) => a.index - b.index);
  const schema = fieldName === "terms" ? termScheduleSchema : quarterScheduleSchema;
  const action = fieldName === "terms" ? saveTermDatesAction : saveQuarterDatesAction;

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<Record<string, unknown>>({
    resolver: zodResolver(schema as never),
    defaultValues: {
      academicYearId,
      [fieldName]: ordered.map((row) => ({ id: row.id, startDate: row.startDate, endDate: row.endDate })),
    },
  });

  const live = (useWatch({ control, name: fieldName }) as { startDate?: string; endDate?: string }[] | undefined) ?? [];

  const errorFor = (name: string) => {
    const err = errors[name as never];
    return typeof err?.message === "string" ? err.message : undefined;
  };

  const onSubmit = handleSubmit((values) => {
    setMessage(null);
    startTransition(async () => {
      const result = await action(values);
      setMessage(result);
      if (result?.ok) {
        toast.show(result.message ?? "Dates saved.", "success");
        router.refresh();
      } else {
        toast.show(result?.message ?? "Please fix the highlighted fields.", "error");
        if (result?.fieldErrors) {
          for (const [key, msg] of Object.entries(result.fieldErrors)) {
            try {
              setError(key as never, { type: "server", message: msg });
            } catch {
              // ignore keys that do not map to a field
            }
          }
        }
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <input type="hidden" {...register("academicYearId")} />

      {groups.map((group, groupIndex) => (
        <Card key={group.heading ?? groupIndex}>
          {group.heading ? <CardHeader title={group.heading} /> : null}
          <CardBody className="space-y-3">
            {group.rows.map((row) => (
              <div key={row.id} className="space-y-3 rounded-md border border-slate-200 p-3">
                <input type="hidden" {...register(`${fieldName}.${row.index}.id`)} />
                <div className="flex flex-wrap items-end gap-3">
                  <p className="w-28 pb-2 text-sm font-medium text-slate-800">{row.name}</p>
                  <Field
                    label="Start date"
                    htmlFor={`${fieldName}-${row.index}-start`}
                    error={errorFor(`${fieldName}.${row.index}.startDate`)}
                    className="min-w-40 flex-1"
                  >
                    <Input
                      id={`${fieldName}-${row.index}-start`}
                      type="date"
                      aria-invalid={Boolean(errorFor(`${fieldName}.${row.index}.startDate`))}
                      {...register(`${fieldName}.${row.index}.startDate`)}
                    />
                  </Field>
                  <Field
                    label="End date"
                    htmlFor={`${fieldName}-${row.index}-end`}
                    error={errorFor(`${fieldName}.${row.index}.endDate`)}
                    className="min-w-40 flex-1"
                  >
                    <Input
                      id={`${fieldName}-${row.index}-end`}
                      type="date"
                      aria-invalid={Boolean(errorFor(`${fieldName}.${row.index}.endDate`))}
                      {...register(`${fieldName}.${row.index}.endDate`)}
                    />
                  </Field>
                </div>
                <PeriodProgress
                  startDate={live[row.index]?.startDate ?? row.startDate}
                  endDate={live[row.index]?.endDate ?? row.endDate}
                  today={today}
                  compact
                />
              </div>
            ))}
          </CardBody>
        </Card>
      ))}

      {message && !message.ok && message.message ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{message.message}</p>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-royal px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-royal-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? <Spinner className="h-4 w-4" /> : null}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
