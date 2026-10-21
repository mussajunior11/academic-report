"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Spinner } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import {
  importStudentsAction,
  previewStudentsAction,
  type ImportPreviewResult,
  type ImportStudentsResult,
} from "./actions";

function buildFormData(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return formData;
}

export function StudentImport() {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [result, setResult] = useState<ImportStudentsResult | null>(null);
  const [reviewing, startReview] = useTransition();
  const [importing, startImport] = useTransition();

  const busy = reviewing || importing;

  const onFileChange = () => {
    setResult(null);
    setPreview(null);
    setFileName(inputRef.current?.files?.[0]?.name ?? "");
  };

  const resetInput = () => {
    if (inputRef.current) inputRef.current.value = "";
    setFileName("");
  };

  const review = () => {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      toast.show("Choose a file first.", "error");
      return;
    }

    startReview(async () => {
      const res = await previewStudentsAction(buildFormData(file));
      setPreview(res);
      setResult(null);
      if (!res.ok) toast.show(res.message, "error");
    });
  };

  const confirmImport = () => {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      toast.show("Choose a file first.", "error");
      return;
    }

    startImport(async () => {
      const res = await importStudentsAction(buildFormData(file));
      setResult(res);
      setPreview(null);
      toast.show(res.message, res.ok ? "success" : "error");
      if (res.created > 0) {
        resetInput();
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
        <li>Download the template and open it in Excel.</li>
        <li>Enter one student per row (Full Name, Gender, Class, Stream).</li>
        <li>Save as .xlsx and choose it here, then review the list below.</li>
        <li>Fix any rows flagged with a missing class or stream, then import.</li>
      </ol>

      <div className="flex flex-wrap items-center gap-2">
        <a href="/api/students/template" className={buttonClasses("secondary", "sm")} download>
          Download template
        </a>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={onFileChange}
          className="block w-full max-w-xs text-sm text-slate-600 file:mr-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-royal hover:file:bg-royal-soft"
        />
        <button
          type="button"
          onClick={review}
          disabled={busy || !fileName}
          className={buttonClasses("secondary", "sm")}
        >
          {reviewing ? <Spinner className="h-3.5 w-3.5" /> : null}
          Review list
        </button>
      </div>

      {preview ? (
        <div className="space-y-3">
          <p
            className={
              preview.ok && preview.invalid === 0
                ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                : "rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
            }
          >
            {preview.message}
          </p>

          {preview.rows.length > 0 ? (
            <div className="max-h-[50vh] overflow-auto rounded-md border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Row</th>
                    <th className="px-3 py-2 font-medium">Full name</th>
                    <th className="px-3 py-2 font-medium">Gender</th>
                    <th className="px-3 py-2 font-medium">Class</th>
                    <th className="px-3 py-2 font-medium">Stream</th>
                    <th className="px-3 py-2 font-medium">Problem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.rows.map((row) => (
                    <tr key={row.rowNumber} className={row.status === "error" ? "bg-red-50" : undefined}>
                      <td className="px-3 py-2 text-slate-500">{row.rowNumber}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">
                        {row.fullName || <Missing />}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{row.gender || <Missing />}</td>
                      <td className="px-3 py-2 text-slate-700">{row.className || <Missing />}</td>
                      <td className="px-3 py-2 text-slate-700">{row.streamName || <Missing />}</td>
                      <td className="px-3 py-2 text-red-700">{row.problems.join(" ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs tabular-nums text-slate-500">
              {preview.rows.length} row{preview.rows.length === 1 ? "" : "s"} · {preview.valid} ready ·{" "}
              {preview.invalid} with problems
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPreview(null);
                  resetInput();
                }}
                disabled={busy}
                className={buttonClasses("secondary", "sm")}
              >
                Choose another file
              </button>
              <button
                type="button"
                onClick={confirmImport}
                disabled={busy || preview.valid === 0}
                className={buttonClasses("primary", "sm")}
              >
                {importing ? <Spinner className="h-3.5 w-3.5" /> : null}
                Import {preview.valid} student{preview.valid === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="space-y-3">
          <p
            className={
              result.ok
                ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                : "rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
            }
          >
            {result.message}
          </p>
          {result.issues.length > 0 ? (
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
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
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Missing() {
  return <span className="italic text-red-600">missing</span>;
}
