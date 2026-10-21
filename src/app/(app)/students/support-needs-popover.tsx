"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { checkboxClasses, Textarea } from "@/components/ui/form";
import { FloatingWindow } from "@/components/ui/floating-window";
import { AccessibilityIcon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import { setStudentSpecialNeedsAction } from "./actions";

export type SupportNeedOption = {
  key: string;
  label: string;
  description: string;
};

export type SupportNeedSelection = {
  key: string;
  note: string;
};

export function SupportNeedsPopover({
  studentId,
  studentName,
  categories,
  selected,
}: {
  studentId: string;
  studentName: string;
  categories: SupportNeedOption[];
  selected: SupportNeedSelection[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<SupportNeedSelection[]>(selected);
  const [pending, startTransition] = useTransition();

  const openDialog = () => {
    setEntries(selected);
    setOpen(true);
  };

  const toggleKey = (key: string) => {
    setEntries((prev) =>
      prev.some((e) => e.key === key)
        ? prev.filter((e) => e.key !== key)
        : [...prev, { key, note: "" }],
    );
  };

  const setNote = (key: string, note: string) => {
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, note } : e)));
  };

  const save = () => {
    startTransition(async () => {
      const result = await setStudentSpecialNeedsAction({
        id: studentId,
        categories: entries,
      });
      if (result?.ok) {
        toast.show(result.message ?? "Support needs saved.", "success");
        router.refresh();
        setOpen(false);
      } else {
        toast.show(result?.message ?? "Could not save support needs.", "error");
      }
    });
  };

  const triggerLabel =
    selected.length > 0
      ? `Support needs: ${selected.length} recorded`
      : "Record support needs";

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        title={triggerLabel}
        aria-label={triggerLabel}
        className={buttonClasses(selected.length > 0 ? "danger" : "ghost", "icon")}
      >
        <AccessibilityIcon />
      </button>

      <FloatingWindow
        open={open}
        onClose={() => setOpen(false)}
        title="Support needs"
        headerExtra={
          <span className="text-xs tabular-nums text-slate-500">{entries.length} selected</span>
        }
      >
        <div className="max-h-[55vh] overflow-y-auto p-3">
          <p className="mb-2 px-1 text-xs text-slate-500">
            Select every category that applies to {studentName}. The school uses this to make
            reasonable adjustments. Nothing here affects marks.
          </p>
          <div className="space-y-1">
            {categories.map((category) => {
              const isSelected = entries.some((e) => e.key === category.key);
              return (
                <div key={category.key}>
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      className={checkboxClasses}
                      checked={isSelected}
                      onChange={() => toggleKey(category.key)}
                    />
                    <span>
                      <span className="block text-sm font-medium text-slate-800">{category.label}</span>
                      <span className="block text-xs text-slate-500">{category.description}</span>
                    </span>
                  </label>
                  {isSelected && category.key === "other" ? (
                    <div className="px-1 pt-2">
                      <Textarea
                        rows={2}
                        placeholder="Describe the need (required)"
                        value={entries.find((e) => e.key === category.key)?.note ?? ""}
                        onChange={(event) => setNote(category.key, event.target.value)}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            onClick={() => setEntries([])}
            className={buttonClasses("ghost", "sm")}
          >
            Clear selection
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setOpen(false)} className={buttonClasses("secondary", "sm")}>
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className={buttonClasses("primary", "sm")}
            >
              {pending ? <Spinner className="h-3.5 w-3.5" /> : null}
              Save
            </button>
          </div>
        </div>
      </FloatingWindow>
    </>
  );
}