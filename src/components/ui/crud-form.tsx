"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Field, Input, Select, Textarea, checkboxClasses } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";
import type { ActionState } from "@/lib/validation/helpers";

export type CrudField = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "textarea" | "checkbox" | "email" | "tel";
  options?: { value: string; label: string }[];
  placeholder?: string;
  hint?: string;
  required?: boolean;
  fullWidth?: boolean;
};

export function CrudForm({
  schema,
  fields,
  action,
  defaultValues,
  submitLabel = "Save",
  columns = 2,
  hiddenValues,
  resetOnSuccess = false,
  successRedirect,
  onSuccess,
  pendingLabel = "Saving...",
}: {
  schema: z.ZodType<unknown, unknown>;
  fields: CrudField[];
  action: (input: unknown) => Promise<ActionState>;
  defaultValues: Record<string, unknown>;
  submitLabel?: string;
  columns?: 1 | 2 | 3;
  hiddenValues?: Record<string, unknown>;
  resetOnSuccess?: boolean;
  successRedirect?: string;
  onSuccess?: () => void;
  pendingLabel?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [message, setMessage] = useState<ActionState>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Record<string, unknown>>({
    resolver: zodResolver(schema as never),
    defaultValues,
  });

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);
    const result = await action({ ...values, ...(hiddenValues ?? {}) });
    setMessage(result);
    if (result?.ok) {
      toast.show(result.message ?? "Saved successfully.", "success");
      if (resetOnSuccess) reset(defaultValues);
      onSuccess?.();
      if (successRedirect) {
        router.push(successRedirect);
      }
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

  const errorFor = (name: string) => {
    const err = errors[name];
    return typeof err?.message === "string" ? err.message : undefined;
  };

  const gridClass =
    columns === 1 ? "grid-cols-1" : columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className={cn("grid grid-cols-1 gap-4", gridClass)}>
        {fields.map((field) => {
          const id = `field-${field.name}`;
          const wrapperClass = field.fullWidth ? "sm:col-span-full" : undefined;

          if (field.type === "checkbox") {
            return (
              <Field
                key={field.name}
                label={field.label}
                htmlFor={id}
                error={errorFor(field.name)}
                hint={field.hint}
                className={wrapperClass}
              >
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input id={id} type="checkbox" className={checkboxClasses} {...register(field.name)} />
                  {field.placeholder ?? "Enabled"}
                </label>
              </Field>
            );
          }

          return (
            <Field
              key={field.name}
              label={field.label}
              htmlFor={id}
              error={errorFor(field.name)}
              hint={field.hint}
              required={field.required}
              className={wrapperClass}
            >
              {field.type === "select" ? (
                <Select id={id} {...register(field.name)} aria-invalid={Boolean(errorFor(field.name))}>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              ) : field.type === "textarea" ? (
                <Textarea
                  id={id}
                  placeholder={field.placeholder}
                  aria-invalid={Boolean(errorFor(field.name))}
                  {...register(field.name)}
                />
              ) : (
                <Input
                  id={id}
                  type={field.type ?? "text"}
                  placeholder={field.placeholder}
                  aria-invalid={Boolean(errorFor(field.name))}
                  {...register(field.name)}
                />
              )}
            </Field>
          );
        })}
      </div>

      {message && !message.ok && message.message ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {message.message}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <SubmitButton pendingLabel={pendingLabel}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
