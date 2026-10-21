"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { Spinner } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import { gradingConfigSchema } from "@/lib/validation/schemas";
import type { ActionState } from "@/lib/validation/helpers";
import { saveGradingConfigAction } from "./actions";

type GradingDefaults = {
  grades: { code: string; minScore: number; maxScore: number; points: number; remark: string }[];
  divisions: { code: string; minPoints: number; maxPoints: number }[];
  passMark: number;
  divisionSubjects: number;
};

function gradeTone(code: string): "success" | "info" | "warning" | "danger" {
  if (code === "A" || code === "B") return "success";
  if (code === "C") return "info";
  if (code === "D") return "warning";
  return "danger";
}

function divisionTone(code: string): "success" | "info" | "warning" | "danger" {
  if (code === "I" || code === "II") return "success";
  if (code === "III") return "info";
  if (code === "IV") return "warning";
  return "danger";
}

export function GradingForm({ defaultValues }: { defaultValues: GradingDefaults }) {
  const router = useRouter();
  const toast = useToast();
  const [message, setMessage] = useState<ActionState>(null);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setError,
    formState,
  } = useForm<Record<string, unknown>>({
    resolver: zodResolver(gradingConfigSchema as never),
    defaultValues,
  });
  const { errors } = formState;

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);
    startTransition(async () => {
      const result = await saveGradingConfigAction(values);
      setMessage(result);
      if (result?.ok) {
        toast.show(result.message ?? "Grading settings saved.", "success");
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

  const errorFor = (name: string) => {
    const err = errors[name as never];
    return typeof err?.message === "string" ? err.message : undefined;
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <Card>
        <CardHeader
          title="Grade scale"
          description="Each subject mark falls into the grade whose range contains it. Points are used for division ranking and the status remark is printed on report forms."
        />
        <CardBody>
          <div className="space-y-2">
            {defaultValues.grades.map((band, index) => (
              <div key={band.code} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-slate-200 px-3 py-2">
                <div className="flex w-28 items-center gap-2">
                  <Badge tone={gradeTone(band.code)}>Grade {band.code}</Badge>
                </div>
                <Field label="Minimum score" htmlFor={`grade-${band.code}-min`} error={errorFor(`grades.${index}.minScore`)} className="min-w-24 flex-1">
                  <Input
                    id={`grade-${band.code}-min`}
                    type="number"
                    min={0}
                    max={100}
                    aria-invalid={Boolean(errorFor(`grades.${index}.minScore`))}
                    {...register(`grades.${index}.minScore`, { valueAsNumber: true })}
                  />
                </Field>
                <Field label="Maximum score" htmlFor={`grade-${band.code}-max`} error={errorFor(`grades.${index}.maxScore`)} className="min-w-24 flex-1">
                  <Input
                    id={`grade-${band.code}-max`}
                    type="number"
                    min={0}
                    max={100}
                    aria-invalid={Boolean(errorFor(`grades.${index}.maxScore`))}
                    {...register(`grades.${index}.maxScore`, { valueAsNumber: true })}
                  />
                </Field>
                <Field label="Points" htmlFor={`grade-${band.code}-points`} error={errorFor(`grades.${index}.points`)} className="min-w-20 flex-1">
                  <Input
                    id={`grade-${band.code}-points`}
                    type="number"
                    min={0}
                    max={1000}
                    aria-invalid={Boolean(errorFor(`grades.${index}.points`))}
                    {...register(`grades.${index}.points`, { valueAsNumber: true })}
                  />
                </Field>
                <Field label="Status remark" htmlFor={`grade-${band.code}-remark`} error={errorFor(`grades.${index}.remark`)} className="min-w-36 flex-[2]">
                  <Input
                    id={`grade-${band.code}-remark`}
                    type="text"
                    placeholder="e.g. Poor"
                    aria-invalid={Boolean(errorFor(`grades.${index}.remark`))}
                    {...register(`grades.${index}.remark`)}
                  />
                </Field>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Division scale"
          description="Divisions are ranked from the total points of the counted subjects (lower is better), not from the average score."
        />
        <CardBody>
          <div className="space-y-2">
            {defaultValues.divisions.map((band, index) => (
              <div key={band.code} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-slate-200 px-3 py-2">
                <div className="flex w-28 items-center gap-2">
                  <Badge tone={divisionTone(band.code)}>Division {band.code}</Badge>
                </div>
                <Field label="Minimum points" htmlFor={`division-${band.code}-min`} error={errorFor(`divisions.${index}.minPoints`)} className="min-w-28 flex-1">
                  <Input
                    id={`division-${band.code}-min`}
                    type="number"
                    min={0}
                    max={1000}
                    aria-invalid={Boolean(errorFor(`divisions.${index}.minPoints`))}
                    {...register(`divisions.${index}.minPoints`, { valueAsNumber: true })}
                  />
                </Field>
                <Field label="Maximum points" htmlFor={`division-${band.code}-max`} error={errorFor(`divisions.${index}.maxPoints`)} className="min-w-28 flex-1">
                  <Input
                    id={`division-${band.code}-max`}
                    type="number"
                    min={0}
                    max={1000}
                    aria-invalid={Boolean(errorFor(`divisions.${index}.maxPoints`))}
                    {...register(`divisions.${index}.maxPoints`, { valueAsNumber: true })}
                  />
                </Field>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Division subjects"
          description="Number of graded subjects counted when ranking a division. Students with fewer graded subjects are reported as INC. Defaults assume seven subjects — change this if your exam covers a different number."
        />
        <CardBody>
          <div className="max-w-xs">
            <Field
              label="Graded subjects for division"
              htmlFor="division-subjects"
              error={errorFor("divisionSubjects")}
              hint="Enter a number between 1 and 50."
            >
              <Input
                id="division-subjects"
                type="number"
                min={1}
                max={50}
                aria-invalid={Boolean(errorFor("divisionSubjects"))}
                {...register("divisionSubjects", { valueAsNumber: true })}
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Pass mark"
          description="The minimum average score required to pass. Averages below this threshold are reported as Fail."
        />
        <CardBody>
          <div className="max-w-xs">
            <Field label="Minimum average score for PASS" htmlFor="pass-mark" error={errorFor("passMark")} hint="Enter a value between 0 and 100.">
              <Input
                id="pass-mark"
                type="number"
                min={0}
                max={100}
                aria-invalid={Boolean(errorFor("passMark"))}
                {...register("passMark", { valueAsNumber: true })}
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      {message && !message.ok && message.message ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {message.message}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-royal px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-royal-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? <Spinner className="h-4 w-4" /> : null}
          Save grading settings
        </button>
      </div>
    </form>
  );
}