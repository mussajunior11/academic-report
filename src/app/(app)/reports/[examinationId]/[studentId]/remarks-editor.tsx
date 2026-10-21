"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { Spinner } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import { saveReportRemarksAction } from "../../actions";

export function RemarksEditor({
  examinationId,
  studentId,
  academicMaster,
  headMaster,
}: {
  examinationId: string;
  studentId: string;
  academicMaster: string;
  headMaster: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState({ academicMaster, headMaster });
  const [pending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      const result = await saveReportRemarksAction({ examinationId, studentId, ...values });
      if (result?.ok) {
        toast.show(result.message ?? "Remarks saved.", "success");
        router.refresh();
      } else {
        toast.show(result?.message ?? "Could not save remarks.", "error");
      }
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="academic-master" className="mb-1 block text-sm font-semibold text-slate-700">
          Academic Master&apos;s Remarks
        </label>
        <Textarea
          id="academic-master"
          value={values.academicMaster}
          onChange={(event) => setValues((prev) => ({ ...prev, academicMaster: event.target.value }))}
          rows={1}
          className="resize-none"
          style={{ minHeight: 0, height: "2.25rem" }}
        />
      </div>
      <div>
        <label htmlFor="head-master" className="mb-1 block text-sm font-semibold text-slate-700">
          Head Master&apos;s Remarks
        </label>
        <Textarea
          id="head-master"
          value={values.headMaster}
          onChange={(event) => setValues((prev) => ({ ...prev, headMaster: event.target.value }))}
          rows={1}
          className="resize-none"
          style={{ minHeight: 0, height: "2.25rem" }}
        />
      </div>
      <div className="no-print flex items-center gap-2">
        <button type="button" onClick={save} disabled={pending} className={buttonClasses("secondary", "sm")}>
          {pending ? <Spinner className="h-3.5 w-3.5" /> : null}
          Save remarks
        </button>
        <span className="text-xs text-slate-500">Remarks are auto-filled from performance; edit to override.</span>
      </div>
    </div>
  );
}
