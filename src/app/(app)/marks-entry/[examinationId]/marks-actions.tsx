"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { buttonClasses } from "@/components/ui/button";
import { FloatingWindow } from "@/components/ui/floating-window";
import { Spinner } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";
import {
  clearMarksAction,
  importMarksAction,
  previewMarksAction,
  type ImportMarksResult,
  type PreviewMarksResult,
} from "../actions";

export type MarksActionSubject = { id: string; name: string; code: string | null };
export type MarksActionStream = { id: string; name: string };

type View = "menu" | "download" | "clear" | "review";

const VIEW_TITLE: Record<View, string> = {
  menu: "Marks entry actions",
  download: "Download template",
  clear: "Clear scores",
  review: "Review scores",
};

const ICON = {
  download: "M12 3v12m0 0-4-4m4 4 4-4M5 21h14",
  upload: "M12 21V9m0 0 4 4m-4-4-4 4M5 3h14",
  clear: "M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m-9 0 1 14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-14M10 11v6M14 11v6",
  sliders: "M4 7h10m4 0h2M4 17h2m4 0h10M4 12h6m4 0h6M14 5v4M10 10v4M8 15v4",
} as const;

function MenuButton({
  icon,
  label,
  hint,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition",
        "hover:bg-royal-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal/40",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent",
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-royal-soft text-royal">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        <span className="block truncate text-xs text-slate-500">{hint}</span>
      </span>
    </button>
  );
}

function MenuIcon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

export function MarksActions({
  examinationId,
  subjects,
  streams,
  canEdit,
}: {
  examinationId: string;
  subjects: MarksActionSubject[];
  streams: MarksActionStream[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportMarksResult | null>(null);
  const [preview, setPreview] = useState<PreviewMarksResult | null>(null);
  const [previewing, startPreview] = useTransition();
  const [downloadSubjects, setDownloadSubjects] = useState<string[]>(() => subjects.map((s) => s.id));
  const [downloadStreams, setDownloadStreams] = useState<string[]>(() => streams.map((s) => s.id));
  const [clearSubjects, setClearSubjects] = useState<string[]>(() => subjects.map((s) => s.id));
  const [clearStreams, setClearStreams] = useState<string[]>(() => streams.map((s) => s.id));
  const [importing, startImport] = useTransition();
  const [clearing, startClear] = useTransition();

  const close = () => {
    setOpen(false);
    setView("menu");
  };

  const startDownload = () => {
    if (downloadSubjects.length === 0) {
      toast.show("Select at least one subject.", "error");
      return;
    }
    if (downloadStreams.length === 0) {
      toast.show("Select at least one stream.", "error");
      return;
    }
    const params = new URLSearchParams({
      examinationId,
      subjects: downloadSubjects.join(","),
      streams: downloadStreams.join(","),
    });
    const link = document.createElement("a");
    link.href = `/api/marks-entry/template?${params.toString()}`;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.show("Template download started.", "success");
    close();
  };

  const upload = () => {
    if (!canEdit) {
      toast.show("Uploading is disabled while the examination is closed.", "error");
      return;
    }
    if (!file) {
      inputRef.current?.click();
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("examinationId", examinationId);
    startImport(async () => {
      const outcome = await importMarksAction(formData);
      setResult(outcome);
      toast.show(outcome.message, outcome.ok ? "success" : "error");
      if (inputRef.current) inputRef.current.value = "";
      setFile(null);
      setView("review");
      router.refresh();
    });
  };

  const clear = () => {
    if (!canEdit) {
      toast.show("Clearing is disabled while the examination is closed.", "error");
      return;
    }
    if (clearSubjects.length === 0) {
      toast.show("Select at least one subject.", "error");
      return;
    }
    if (clearStreams.length === 0) {
      toast.show("Select at least one stream.", "error");
      return;
    }
    startClear(async () => {
      const outcome = await clearMarksAction({
        examinationId,
        subjectIds: clearSubjects,
        streamIds: clearStreams,
      });
      toast.show(outcome.message, outcome.ok ? "success" : "error");
      if (outcome.ok) {
        router.refresh();
        close();
      }
    });
  };

  const chooseFile = () => inputRef.current?.click();

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(event) => {
          const selected = event.target.files?.[0] ?? null;
          if (!selected) return;
          setFile(selected);
          setResult(null);
          setPreview(null);
          setView("review");
          const formData = new FormData();
          formData.append("file", selected);
          startPreview(async () => {
            const outcome = await previewMarksAction(formData);
            setPreview(outcome);
            if (!outcome.ok) setFile(null);
          });
        }}
      />

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Marks entry actions"
        aria-haspopup="dialog"
        className={cn(
          "fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full",
          "bg-royal text-white shadow-lg shadow-royal/30 transition",
          "hover:bg-royal-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-royal/30",
        )}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
          <path d={ICON.sliders} />
        </svg>
      </button>

      <FloatingWindow
        open={open}
        onClose={close}
        title={VIEW_TITLE[view]}
        width={view === "review" ? 620 : 440}
      >
        {view === "menu" ? (
          <div className="space-y-1 p-2">
            <MenuButton
              icon={<MenuIcon path={ICON.download} />}
              label="Download template"
              hint="Get an Excel template for selected subjects and streams."
              onClick={() => setView("download")}
            />
            <MenuButton
              icon={<MenuIcon path={ICON.upload} />}
              label="Upload marks"
              hint="Choose the filled .xlsx template to upload."
              onClick={chooseFile}
              disabled={importing || !canEdit}
            />
            <MenuButton
              icon={<MenuIcon path={ICON.clear} />}
              label="Clear scores"
              hint="Permanently delete stored marks for selected subjects and streams."
              onClick={() => setView("clear")}
              disabled={!canEdit}
            />
            {!canEdit ? (
              <p className="px-3 pt-1 text-xs text-amber-700">
                This examination is closed. Upload and clear are disabled.
              </p>
            ) : null}
          </div>
        ) : null}

        {view === "download" ? (
          <div className="space-y-4 px-4 py-4">
            <p className="text-sm text-slate-500">
              Pick the subjects and streams to include. A blank cell in the filled file clears that mark.
            </p>
            <Picker
              subjects={subjects}
              streams={streams}
              subjectIds={downloadSubjects}
              setSubjectIds={setDownloadSubjects}
              streamIds={downloadStreams}
              setStreamIds={setDownloadStreams}
            />
            <div className="flex justify-end gap-2">
              <button type="button" className={buttonClasses("secondary", "sm")} onClick={() => setView("menu")}>
                Back
              </button>
              <button type="button" className={buttonClasses("primary", "sm")} onClick={startDownload}>
                Download
              </button>
            </div>
          </div>
        ) : null}

        {view === "clear" ? (
          <div className="space-y-4 px-4 py-4">
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              This permanently deletes the selected scores. It cannot be undone.
            </div>
            <Picker
              subjects={subjects}
              streams={streams}
              subjectIds={clearSubjects}
              setSubjectIds={setClearSubjects}
              streamIds={clearStreams}
              setStreamIds={setClearStreams}
            />
            <div className="flex items-center justify-end gap-2">
              <button type="button" className={buttonClasses("secondary", "sm")} onClick={() => setView("menu")}>
                Back
              </button>
              <button
                type="button"
                className={buttonClasses("danger", "sm")}
                onClick={clear}
                disabled={clearing || clearSubjects.length === 0}
              >
                {clearing ? <Spinner className="h-3.5 w-3.5" /> : null}
                Clear {clearSubjects.length} subject{clearSubjects.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        ) : null}

        {view === "review" ? (
          <div className="space-y-3 px-4 py-4">
            {result ? (
              <>
                <p
                  className={
                    result.ok
                      ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                      : "rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
                  }
                >
                  {result.message}
                </p>
                <dl className="grid grid-cols-3 gap-2 text-center text-sm">
                  <Stat label="Added" value={result.created} tone="text-emerald-700" />
                  <Stat label="Updated" value={result.updated} tone="text-royal" />
                  <Stat label="Cleared" value={result.cleared} tone="text-slate-700" />
                  <Stat label="Unchanged" value={result.unchanged} tone="text-slate-500" />
                  <Stat label="Skipped" value={result.failed} tone="text-red-700" />
                </dl>
                {result.issues.length > 0 ? (
                  <div className="max-h-56 overflow-auto rounded-md border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-3 py-2 font-medium">Row</th>
                          <th className="px-3 py-2 font-medium">Name</th>
                          <th className="px-3 py-2 font-medium">Problem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {result.issues.map((issue, index) => (
                          <tr key={`${issue.row}-${index}`}>
                            <td className="px-3 py-2 text-slate-500">{issue.row}</td>
                            <td className="px-3 py-2 font-medium text-slate-800">{issue.name || "—"}</td>
                            <td className="px-3 py-2 text-red-700">{issue.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Every row in the file was imported.</p>
                )}
              </>
            ) : previewing ? (
              <p className="flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-8 text-sm text-slate-500">
                <Spinner className="h-4 w-4" />
                Reading {file?.name ?? "the file"}…
              </p>
            ) : preview ? (
              preview.ok ? (
                <ScoresPreview preview={preview} fileName={file?.name} />
              ) : (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {preview.message}
                </p>
              )
            ) : file ? (
              <p className="rounded-md border border-royal-soft bg-royal-tint px-3 py-3 text-sm text-royal-dark">
                Ready to upload <span className="font-medium">{file.name}</span>. Click Upload marks to
                import the scores.
              </p>
            ) : (
              <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
                No file selected. Click Upload marks to choose the filled template.
              </p>
            )}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button type="button" className={buttonClasses("secondary", "sm")} onClick={() => setView("menu")}>
                Back
              </button>
              <button
                type="button"
                className={buttonClasses("primary", "sm")}
                onClick={upload}
                disabled={importing || !canEdit}
              >
                {importing ? <Spinner className="h-3.5 w-3.5" /> : null}
                Upload marks
              </button>
            </div>
          </div>
        ) : null}
      </FloatingWindow>
    </>
  );
}

function isScoreValid(raw: string): boolean {
  if (raw === "") return true;
  const parsed = Number(raw);
  return (
    Number.isFinite(parsed) &&
    parsed >= 0 &&
    parsed <= 100 &&
    Math.abs(parsed * 10 - Math.round(parsed * 10)) < 1e-6
  );
}

function ScoresPreview({ preview, fileName }: { preview: PreviewMarksResult; fileName?: string }) {
  return (
    <div className="space-y-2">
      <div className="max-h-64 overflow-auto rounded-md border border-slate-200">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] uppercase text-slate-500">
            <tr>
              <th className="whitespace-nowrap px-2 py-2 font-medium">Name</th>
              <th className="whitespace-nowrap px-2 py-2 font-medium">Class</th>
              <th className="whitespace-nowrap px-2 py-2 font-medium">Stream</th>
              {preview.subjectHeaders.map((header) => (
                <th
                  key={header}
                  className="whitespace-nowrap px-2 py-2 text-center font-medium"
                  title={header}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {preview.rows.map((row) => (
              <tr key={row.rowNumber}>
                <td className="whitespace-nowrap px-2 py-1.5 font-medium text-slate-800">
                  {row.fullName || "—"}
                </td>
                <td className="whitespace-nowrap px-2 py-1.5 text-slate-500">{row.className || "—"}</td>
                <td className="whitespace-nowrap px-2 py-1.5 text-slate-500">{row.streamName || "—"}</td>
                {preview.subjectHeaders.map((header) => {
                  const raw = row.scores[header] ?? "";
                  const valid = isScoreValid(raw);
                  return (
                    <td key={header} className="px-2 py-1.5 text-center">
                      <span
                        className={cn(
                          "tabular-nums",
                          raw === ""
                            ? "text-slate-300"
                            : valid
                              ? "text-slate-800"
                              : "font-medium text-red-600",
                        )}
                        title={raw !== "" && !valid ? "Not a valid score (0–100, one decimal place)" : undefined}
                      >
                        {raw === "" ? "—" : raw}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        {fileName ? <span className="font-medium text-slate-600">{fileName} · </span> : null}
        {preview.message} Blank cells clear that mark; invalid scores are shown in red.
      </p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2 py-2">
      <dt className="text-[11px] uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className={cn("text-lg font-semibold", tone)}>{value}</dd>
    </div>
  );
}

function Picker({
  subjects,
  streams,
  subjectIds,
  setSubjectIds,
  streamIds,
  setStreamIds,
}: {
  subjects: MarksActionSubject[];
  streams: MarksActionStream[];
  subjectIds: string[];
  setSubjectIds: (next: string[]) => void;
  streamIds: string[];
  setStreamIds: (next: string[]) => void;
}) {
  const toggle = (list: string[], setList: (next: string[]) => void, id: string) => {
    setList(list.includes(id) ? list.filter((value) => value !== id) : [...list, id]);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Subjects</span>
          <div className="flex gap-2 text-xs">
            <button type="button" className="text-royal hover:underline" onClick={() => setSubjectIds(subjects.map((s) => s.id))}>
              All
            </button>
            <button type="button" className="text-royal hover:underline" onClick={() => setSubjectIds([])}>
              None
            </button>
          </div>
        </div>
        <div className="grid max-h-44 grid-cols-2 gap-1 overflow-auto rounded-md border border-slate-200 p-2">
          {subjects.map((subject) => (
            <label key={subject.id} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={subjectIds.includes(subject.id)}
                onChange={() => toggle(subjectIds, setSubjectIds, subject.id)}
                className="h-4 w-4 rounded border-slate-300 text-royal focus:ring-royal"
              />
              <span className="truncate" title={subject.name}>
                {subject.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Streams</span>
          <div className="flex gap-2 text-xs">
            <button type="button" className="text-royal hover:underline" onClick={() => setStreamIds(streams.map((s) => s.id))}>
              All
            </button>
            <button type="button" className="text-royal hover:underline" onClick={() => setStreamIds([])}>
              None
            </button>
          </div>
        </div>
        <div className="flex max-h-40 flex-wrap gap-2 overflow-auto rounded-md border border-slate-200 p-2">
          {streams.map((stream) => (
            <label
              key={stream.id}
              className="flex items-center gap-2 rounded border border-slate-200 px-2 py-1 text-sm text-slate-700"
            >
              <input
                type="checkbox"
                checked={streamIds.includes(stream.id)}
                onChange={() => toggle(streamIds, setStreamIds, stream.id)}
                className="h-4 w-4 rounded border-slate-300 text-royal focus:ring-royal"
              />
              <span>{stream.name}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
