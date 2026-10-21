"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonClasses } from "@/components/ui/button";
import type { CrudField } from "@/components/ui/crud-form";
import { CrudForm } from "@/components/ui/crud-form";
import { EditDialog } from "@/components/ui/edit-dialog";
import { checkboxClasses } from "@/components/ui/form";
import { EditIcon, ListChecksIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import { subjectSchema } from "@/lib/validation/schemas";
import { cn } from "@/lib/utils/cn";
import { createSubjectAction, setSubjectClassesAction, updateSubjectAction } from "./actions";

const statusField: CrudField = {
  name: "status",
  label: "Status",
  type: "select",
  options: [
    { value: "ACTIVE", label: "Active" },
    { value: "INACTIVE", label: "Inactive" },
  ],
};

const subjectFields: CrudField[] = [
  { name: "name", label: "Subject name", required: true, fullWidth: true, placeholder: "e.g. MATHEMATICS" },
  { name: "code", label: "Short code (optional)", placeholder: "e.g. MATH" },
  { name: "numericCode", label: "Numeric code (optional)", placeholder: "e.g. 101" },
  statusField,
];

export function SubjectCreateForm() {
  return (
    <CrudForm
      schema={subjectSchema}
      fields={subjectFields}
      action={createSubjectAction}
      defaultValues={{ name: "", code: "", numericCode: "", status: "ACTIVE" }}
      submitLabel="Add subject"
      resetOnSuccess
    />
  );
}

export function SubjectEditButton({
  id,
  name,
  code,
  numericCode,
  status,
}: {
  id: string;
  name: string;
  code: string | null;
  numericCode: string | null;
  status: string;
}) {
  return (
    <EditDialog
      triggerLabel="Edit"
      triggerIcon={<EditIcon />}
      title="Edit subject"
      schema={subjectSchema}
      fields={subjectFields}
      action={updateSubjectAction}
      defaultValues={{ name, code: code ?? "", numericCode: numericCode ?? "", status }}
      hiddenValues={{ id }}
    />
  );
}

export function SubjectClassesButton({
  subjectId,
  subjectName,
  classOptions,
  selected,
}: {
  subjectId: string;
  subjectName: string;
  classOptions: { id: string; name: string; streams: { id: string; name: string }[] }[];
  selected: { classLevelId: string; streamId: string | null }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<{ classes: Set<string>; streams: Set<string> }>({
    classes: new Set(),
    streams: new Set(),
  });
  const [pending, startTransition] = useTransition();

  const openDialog = () => {
    const classes = new Set<string>();
    const streams = new Set<string>();
    for (const item of selected) {
      if (item.streamId) streams.add(`${item.classLevelId}:${item.streamId}`);
      else classes.add(item.classLevelId);
    }
    setSelection({ classes, streams });
    setOpen(true);
  };

  const toggleClass = (classLevelId: string) => {
    setSelection((prev) => {
      const classes = new Set(prev.classes);
      const streams = new Set(prev.streams);
      if (classes.has(classLevelId)) {
        classes.delete(classLevelId);
      } else {
        classes.add(classLevelId);
        for (const key of [...streams]) {
          if (key.startsWith(`${classLevelId}:`)) streams.delete(key);
        }
      }
      return { classes, streams };
    });
  };

  const toggleStream = (classLevelId: string, streamId: string) => {
    setSelection((prev) => {
      const classes = new Set(prev.classes);
      const streams = new Set(prev.streams);
      const key = `${classLevelId}:${streamId}`;
      if (streams.has(key)) {
        streams.delete(key);
      } else {
        streams.add(key);
        classes.delete(classLevelId);
      }
      return { classes, streams };
    });
  };

  const save = () => {
    const assignments: { classLevelId: string; streamId: string | null }[] = [];
    for (const option of classOptions) {
      if (selection.classes.has(option.id)) {
        assignments.push({ classLevelId: option.id, streamId: null });
        continue;
      }
      for (const stream of option.streams) {
        if (selection.streams.has(`${option.id}:${stream.id}`)) {
          assignments.push({ classLevelId: option.id, streamId: stream.id });
        }
      }
    }

    startTransition(async () => {
      const result = await setSubjectClassesAction({ subjectId, assignments });
      if (result?.ok) {
        toast.show(result.message ?? "Compulsory classes updated.", "success");
        setOpen(false);
        router.refresh();
      } else {
        toast.show(result?.message ?? "Could not update compulsory classes.", "error");
      }
    });
  };

  const assignedCount = selection.classes.size + selection.streams.size;

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        title="Compulsory classes"
        aria-label="Compulsory classes"
        className={buttonClasses("ghost", "icon")}
      >
        <ListChecksIcon />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Compulsory classes — ${subjectName}`}>
        {classOptions.length === 0 ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No class levels are configured yet. Add classes before marking a subject as compulsory.
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Select the classes for which{" "}
              <span className="font-medium text-slate-800">{subjectName}</span> is compulsory. Tick a whole class to
              make it compulsory for every student, or tick individual streams to limit it to those streams.
            </p>
            <div className="space-y-2">
              {classOptions.map((option) => {
                const wholeClass = selection.classes.has(option.id);
                return (
                  <div key={option.id} className="rounded-md border border-slate-200">
                    <label className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        className={checkboxClasses}
                        checked={wholeClass}
                        onChange={() => toggleClass(option.id)}
                      />
                      <span className="font-medium">{option.name}</span>
                      <span className="text-xs text-slate-400">— whole class</span>
                    </label>
                    {option.streams.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 px-3 py-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Streams</span>
                        {option.streams.map((stream) => (
                          <label
                            key={stream.id}
                            className={cn(
                              "flex items-center gap-1.5 text-sm text-slate-600",
                              wholeClass && "opacity-40",
                            )}
                          >
                            <input
                              type="checkbox"
                              className={checkboxClasses}
                              checked={selection.streams.has(`${option.id}:${stream.id}`)}
                              disabled={wholeClass}
                              onChange={() => toggleStream(option.id, stream.id)}
                            />
                            <span>{stream.name}</span>
                          </label>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setSelection({ classes: new Set(classOptions.map((c) => c.id)), streams: new Set() })
                }
                className={buttonClasses("secondary", "sm")}
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => setSelection({ classes: new Set(), streams: new Set() })}
                className={buttonClasses("secondary", "sm")}
              >
                Clear
              </button>
              <span className="text-xs text-slate-500">{assignedCount} selected</span>
            </div>
          </div>
        )}
        <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
          <button type="button" onClick={() => setOpen(false)} className={buttonClasses("secondary", "sm")}>
            Cancel
          </button>
          <button type="button" onClick={save} disabled={pending} className={buttonClasses("primary", "sm")}>
            {pending ? <Spinner className="h-3.5 w-3.5" /> : null}
            Save
          </button>
        </div>
      </Modal>
    </>
  );
}
