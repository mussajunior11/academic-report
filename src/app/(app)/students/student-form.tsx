"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Field, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import { GENDERS, STUDENT_STATUSES } from "@/lib/constants";
import { studentSchema } from "@/lib/validation/schemas";
import type { ActionState } from "@/lib/validation/helpers";

export type ClassStreamOption = {
  classLevelId: string;
  classLevelName: string;
  streamId: string;
  streamName: string;
};

export function StudentForm({
  action,
  classStreams,
  defaultValues,
  submitLabel,
  successRedirect,
}: {
  action: (input: unknown) => Promise<ActionState>;
  classStreams: ClassStreamOption[];
  defaultValues: Record<string, unknown>;
  submitLabel: string;
  successRedirect: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [message, setMessage] = useState<ActionState>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors },
  } = useForm<Record<string, unknown>>({
    resolver: zodResolver(studentSchema as never),
    defaultValues,
  });

  const selectedClass = useWatch({ control, name: "classLevelId" }) as string | undefined;

  const classOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const option of classStreams) map.set(option.classLevelId, option.classLevelName);
    return Array.from(map, ([value, label]) => ({ value, label }));
  }, [classStreams]);

  const streamOptions = useMemo(
    () => classStreams.filter((c) => c.classLevelId === selectedClass),
    [classStreams, selectedClass],
  );

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);
    const result = await action(values);
    setMessage(result);
    if (result?.ok) {
      toast.show(result.message ?? "Saved.", "success");
      router.push(successRedirect);
      router.refresh();
    } else {
      toast.show(result?.message ?? "Please fix the highlighted fields.", "error");
      if (result?.fieldErrors) {
        for (const [key, msg] of Object.entries(result.fieldErrors)) {
          setError(key as never, { type: "server", message: msg });
        }
      }
    }
  });

  const errorFor = (name: string) => {
    const err = errors[name];
    return typeof err?.message === "string" ? err.message : undefined;
  };

  if (classStreams.length === 0) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        No active class-stream combinations are configured. Create them under Classes before
        registering students.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="fullName" error={errorFor("fullName")} required className="sm:col-span-2">
          <Input id="fullName" placeholder="e.g. John Michael Doe" {...register("fullName")} />
        </Field>

        <Field label="Admission / registration number" htmlFor="admissionNumber" error={errorFor("admissionNumber")} hint="Optional, but must be unique">
          <Input id="admissionNumber" placeholder="e.g. ARS-2026-001" {...register("admissionNumber")} />
        </Field>

        <Field label="Gender" htmlFor="gender" error={errorFor("gender")} required>
          <Select id="gender" {...register("gender")}>
            <option value="">Select gender</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {g.charAt(0) + g.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Class" htmlFor="classLevelId" error={errorFor("classLevelId")} required>
          <Select
            id="classLevelId"
            {...register("classLevelId", {
              onChange: () => setValue("streamId", ""),
            })}
          >
            <option value="">Select class</option>
            {classOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Stream" htmlFor="streamId" error={errorFor("streamId")} required>
          <Select id="streamId" {...register("streamId")} disabled={!selectedClass}>
            <option value="">Select stream</option>
            {streamOptions.map((option) => (
              <option key={option.streamId} value={option.streamId}>
                {option.streamName}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Admission year" htmlFor="admissionYear" error={errorFor("admissionYear")} required>
          <Input id="admissionYear" type="number" {...register("admissionYear")} />
        </Field>

        <Field label="Status" htmlFor="status" error={errorFor("status")}>
          <Select id="status" {...register("status")}>
            {STUDENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {message && !message.ok && message.message ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {message.message}
        </p>
      ) : null}

      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
