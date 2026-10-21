"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Field, Textarea } from "@/components/ui/form";
import { Spinner } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import { gradeRemarksSchema } from "@/lib/validation/schemas";
import type { ActionState } from "@/lib/validation/helpers";
import { saveGradeRemarksAction } from "./actions";

type GradeRemark = {
  code: string;
  minScore: number;
  maxScore: number;
  academicMasterRemark: string;
  headMasterRemark: string;
};

function gradeTone(code: string): "success" | "info" | "warning" | "danger" {
  if (code === "A" || code === "B") return "success";
  if (code === "C") return "info";
  if (code === "D") return "warning";
  return "danger";
}

export function GradeRemarksForm({ defaultValues }: { defaultValues: { grades: GradeRemark[] } }) {
  const router = useRouter();
  const toast = useToast();
  const [message, setMessage] = useState<ActionState>(null);
  const [pending, startTransition] = useTransition();

  const { register, handleSubmit, formState } = useForm<Record<string, unknown>>({
    resolver: zodResolver(gradeRemarksSchema as never),
    defaultValues,
  });
  const { errors } = formState;

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);
    startTransition(async () => {
      const result = await saveGradeRemarksAction(values);
      setMessage(result);
      if (result?.ok) {
        toast.show(result.message ?? "Report remarks saved.", "success");
        router.refresh();
      } else {
        toast.show(result?.message ?? "Please fix the highlighted fields.", "error");
      }
    });
  });

  const errorFor = (name: string) => {
    const err = errors[name as never];
    return typeof err?.message === "string" ? err.message : undefined;
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {defaultValues.grades.map((grade, index) => (
        <div key={grade.code} className="space-y-3 rounded-md border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <Badge tone={gradeTone(grade.code)}>Average grade {grade.code}</Badge>
            <span className="text-xs text-slate-500">
              {grade.minScore}% – {grade.maxScore}%
            </span>
            <input type="hidden" {...register(`grades.${index}.code`)} />
          </div>
          <Field
            label="Academic master's remark"
            htmlFor={`remarks-${grade.code}-academic`}
            error={errorFor(`grades.${index}.academicMasterRemark`)}
          >
            <Textarea
              id={`remarks-${grade.code}-academic`}
              placeholder="Remark printed under “Academic Master's Remarks”"
              aria-invalid={Boolean(errorFor(`grades.${index}.academicMasterRemark`))}
              {...register(`grades.${index}.academicMasterRemark`)}
            />
          </Field>
          <Field
            label="Head master's remark"
            htmlFor={`remarks-${grade.code}-head`}
            error={errorFor(`grades.${index}.headMasterRemark`)}
          >
            <Textarea
              id={`remarks-${grade.code}-head`}
              placeholder="Remark printed under “Head Master's Remarks”"
              aria-invalid={Boolean(errorFor(`grades.${index}.headMasterRemark`))}
              {...register(`grades.${index}.headMasterRemark`)}
            />
          </Field>
        </div>
      ))}

      {message && !message.ok && message.message ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {message.message}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60"
        >
          {pending ? <Spinner className="h-4 w-4" /> : null}
          Save report remarks
        </button>
      </div>
    </form>
  );
}
