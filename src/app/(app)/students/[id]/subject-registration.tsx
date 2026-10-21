"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { FloatingWindow } from "@/components/ui/floating-window";
import { Spinner } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import { saveStudentSubjectsAction } from "../actions";

export type RegisterableSubject = {
  id: string;
  name: string;
  code: string | null;
  numericCode: string | null;
};

export function SubjectRegistration({
  studentId,
  studentName,
  academicYearId,
  subjects,
  compulsoryIds,
  registeredIds,
}: {
  studentId: string;
  studentName: string;
  academicYearId: string;
  subjects: RegisterableSubject[];
  compulsoryIds: string[];
  registeredIds: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set(registeredIds));
  const [pending, startTransition] = useTransition();

  const compulsory = new Set(compulsoryIds);
  const optionalPicked = Array.from(picked).filter((id) => !compulsory.has(id));

  const openDialog = () => {
    setPicked(new Set(registeredIds));
    setOpen(true);
  };

  const toggle = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = () => {
    startTransition(async () => {
      const subjectIds = Array.from(new Set([...compulsoryIds, ...Array.from(picked)]));
      const result = await saveStudentSubjectsAction({ studentId, academicYearId, subjectIds });
      if (result?.ok) {
        toast.show(result.message ?? "Subject registrations saved.", "success");
        router.refresh();
        setOpen(false);
      } else {
        toast.show(result?.message ?? "Could not save registrations.", "error");
      }
    });
  };

  if (subjects.length === 0) {
    return (
      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        No active subjects are configured. Add subjects before registering a student.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <button type="button" onClick={openDialog} className={buttonClasses("secondary", "md")}>
        Register subjects
      </button>

      <FloatingWindow
        open={open}
        onClose={() => setOpen(false)}
        title={`Subjects — ${studentName}`}
        headerExtra={
          <span className="text-xs tabular-nums text-slate-500">
            {optionalPicked.length} optional registered
          </span>
        }
      >
        <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
          Tap an optional subject to register it. Tap a registered optional subject again to unregister it. Compulsory
          subjects are always registered and can&apos;t be removed here.
        </p>
        <div className="max-h-[55vh] overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {subjects.map((subject) => {
              const isCompulsory = compulsory.has(subject.id);
              const isPicked = picked.has(subject.id);
              return (
                <button
                  key={subject.id}
                  type="button"
                  disabled={isCompulsory}
                  onClick={() => toggle(subject.id)}
                  aria-label={
                    isCompulsory
                      ? `${subject.name} — compulsory, cannot be removed`
                      : `${subject.name} — ${isPicked ? "registered, click to unregister" : "not registered, click to register"}`
                  }
                  aria-pressed={!isCompulsory && isPicked}
                  title={
                    isCompulsory
                      ? `${subject.name} — compulsory for ${studentName}'s class or stream`
                      : isPicked
                        ? `${subject.name} — click to unregister`
                        : `${subject.name} — click to register`
                  }
                  className={
                    isCompulsory
                      ? "relative flex flex-col items-center justify-center gap-0.5 rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-white"
                      : isPicked
                        ? "relative flex flex-col items-center justify-center gap-0.5 rounded-md border border-emerald-500 bg-emerald-500 px-3 py-2 text-white transition-colors hover:bg-emerald-600"
                        : "relative flex flex-col items-center justify-center gap-0.5 rounded-md border border-amber-300 bg-amber-200 px-3 py-2 text-slate-800 transition-colors hover:border-amber-400 hover:bg-amber-300"
                  }
                >
                  {isPicked && !isCompulsory ? (
                    <span
                      aria-hidden
                      className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white/25 text-[10px] font-bold leading-none"
                    >
                      ×
                    </span>
                  ) : null}
                  <span className="font-semibold">{subject.code ?? "—"}</span>
                  <span
                    className={
                      isCompulsory || isPicked
                        ? "text-xs tabular-nums text-white/70"
                        : "text-xs tabular-nums text-slate-500"
                    }
                  >
                    {subject.numericCode ?? "—"}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-slate-700" /> Compulsory
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-amber-300" /> Optional &mdash; not registered
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-emerald-500" /> Optional &mdash; registered (tap to unregister)
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-4 py-3">
          <span className="text-xs tabular-nums text-slate-500">
            Registered: {compulsory.size + optionalPicked.length}
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setOpen(false)} className={buttonClasses("secondary", "sm")}>
              Cancel
            </button>
            <button type="button" onClick={save} disabled={pending} className={buttonClasses("primary", "sm")}>
              {pending ? <Spinner className="h-3.5 w-3.5" /> : null}
              Save
            </button>
          </div>
        </div>
      </FloatingWindow>
    </div>
  );
}