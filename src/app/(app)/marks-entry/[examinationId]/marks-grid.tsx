"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FloatingWindow } from "@/components/ui/floating-window";
import { Select } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";
import type { MarksEntry } from "@/lib/services/marks";
import { saveMarkAction } from "../actions";

type CellStatus = "idle" | "saving" | "saved" | "error";

const STICKY = [
  { key: "sn", label: "#", width: 44, left: 0, align: "center" as const },
  { key: "reg", label: "Reg / Adm No", width: 116, left: 44, align: "left" as const },
  { key: "name", label: "Full name", width: 190, left: 160, align: "left" as const },
  { key: "gender", label: "Gender", width: 68, left: 350, align: "center" as const },
  { key: "class", label: "Class", width: 66, left: 418, align: "center" as const },
  { key: "stream", label: "Stream", width: 64, left: 484, align: "center" as const },
];
const SUBJECT_WIDTH = 68;

const keyOf = (studentId: string, subjectId: string) => `${studentId}::${subjectId}`;

export function MarksGrid({ data }: { data: MarksEntry }) {
  const { examination, subjects, students, marks, canEdit } = data;
  const toast = useToast();

  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>(() =>
    subjects.map((s) => s.id),
  );
  const [q, setQ] = useState("");
  const [streamId, setStreamId] = useState("");
  const [entryStatus, setEntryStatus] = useState<"ALL" | "ENTERED" | "MISSING">("ALL");

  const initialScores = useMemo(() => {
    const map = new Map<string, number>();
    for (const mark of marks) map.set(keyOf(mark.studentId, mark.subjectId), mark.score);
    return map;
  }, [marks]);
  const [scores, setScores] = useState<Map<string, number>>(initialScores);

  const [statuses, setStatuses] = useState<Map<string, CellStatus>>(new Map());
  const [subjectsOpen, setSubjectsOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);

  // Refresh the local grid whenever the server sends fresh marks (e.g. after an
  // Excel upload or a clear) so the table reflects the change without a reload.
  const [marksSnapshot, setMarksSnapshot] = useState(marks);
  if (marks !== marksSnapshot) {
    setMarksSnapshot(marks);
    setScores(initialScores);
    setStatuses(new Map());
  }

  const inputs = useRef<Map<string, HTMLInputElement | null>>(new Map());

  const selectedSet = useMemo(() => new Set(selectedSubjectIds), [selectedSubjectIds]);
  const visibleSubjects = useMemo(
    () => subjects.filter((s) => selectedSet.has(s.id)),
    [subjects, selectedSet],
  );
  const streams = useMemo(() => {
    const map = new Map<string, string>();
    for (const student of students) map.set(student.streamId, student.streamName);
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [students]);

  const registeredSets = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const student of students) map.set(student.id, new Set(student.subjectIds));
    return map;
  }, [students]);

  const visibleStudents = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return students.filter((student) => {
      if (streamId && student.streamId !== streamId) return false;
      if (needle) {
        const haystack = `${student.fullName} ${student.studentNumber} ${student.admissionNumber ?? ""}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (entryStatus !== "ALL") {
        const registered = student.subjectIds.filter((id) => selectedSet.has(id));
        const missing = registered.some((id) => !scores.has(keyOf(student.id, id)));
        if (entryStatus === "ENTERED" && missing) return false;
        if (entryStatus === "MISSING" && (!registered.length || !missing)) return false;
      }
      return true;
    });
  }, [students, q, streamId, entryStatus, selectedSet, scores]);

  const latestVisible = useRef({ visibleStudents, visibleSubjects });
  useEffect(() => {
    latestVisible.current = { visibleStudents, visibleSubjects };
  });
  useEffect(() => {
    const map = inputs.current;
    const { visibleStudents: rows, visibleSubjects: cols } = latestVisible.current;
    rows.forEach((student, row) => {
      cols.forEach((subject, col) => {
        const input = map.get(`${row}:${col}`);
        if (!input) return;
        const score = initialScores.get(keyOf(student.id, subject.id));
        input.value = score === undefined ? "" : String(score);
      });
    });
  }, [initialScores]);

  const progress = useMemo(() => {
    let eligible = 0;
    let entered = 0;
    for (const student of students) {
      const registered = registeredSets.get(student.id) ?? new Set<string>();
      for (const subject of subjects) {
        if (!registered.has(subject.id)) continue;
        eligible += 1;
        if (scores.has(keyOf(student.id, subject.id))) entered += 1;
      }
    }
    const remaining = eligible - entered;
    const percent = eligible === 0 ? 0 : Math.round((entered / eligible) * 100);
    return { eligible, entered, remaining, percent };
  }, [students, subjects, registeredSets, scores]);

  const setStatus = (key: string, status: CellStatus) => {
    setStatuses((prev) => {
      const next = new Map(prev);
      if (status === "idle") next.delete(key);
      else next.set(key, status);
      return next;
    });
  };

  const commit = async ({
    studentId,
    subjectId,
    input,
  }: {
    studentId: string;
    subjectId: string;
    input: HTMLInputElement;
  }) => {
    const key = keyOf(studentId, subjectId);
    const expected = scores.get(key) ?? null;
    const raw = input.value.trim();

    let score: number | null;
    if (raw === "") {
      score = null;
    } else {
      const parsed = Number(raw);
      const valid =
        Number.isFinite(parsed) &&
        parsed >= 0 &&
        parsed <= 100 &&
        Math.abs(parsed * 10 - Math.round(parsed * 10)) < 1e-6;
      if (!valid) {
        setStatus(key, "error");
        toast.show("Enter a score between 0 and 100 with at most one decimal place.", "error");
        input.value = expected === null ? "" : String(expected);
        return;
      }
      score = Math.round(parsed * 10) / 10;
    }

    if (score === expected) {
      input.value = score === null ? "" : String(score);
      setStatus(key, "idle");
      return;
    }

    setStatus(key, "saving");
    try {
      const result = await saveMarkAction({
        examinationId: examination.id,
        studentId,
        subjectId,
        score,
        expectedScore: expected,
      });
      if (result?.ok) {
        setScores((prev) => {
          const next = new Map(prev);
          if (score === null) next.delete(key);
          else next.set(key, score);
          return next;
        });
        input.value = score === null ? "" : String(score);
        setStatus(key, "saved");
        window.setTimeout(() => setStatus(key, "idle"), 1200);
      } else {
        setStatus(key, "error");
        input.value = expected === null ? "" : String(expected);
        toast.show(result?.message ?? "Could not save the mark.", "error");
      }
    } catch {
      setStatus(key, "error");
      input.value = expected === null ? "" : String(expected);
      toast.show("Could not save the mark. Please try again.", "error");
    }
  };

  const focusRelative = (row: number, col: number, dRow: number, dCol: number) => {
    let r = row + dRow;
    let c = col + dCol;
    while (r >= 0 && r < visibleStudents.length && c >= 0 && c < visibleSubjects.length) {
      const el = inputs.current.get(`${r}:${c}`);
      if (el && !el.disabled) {
        el.focus();
        el.select();
        return;
      }
      r += dRow;
      c += dCol;
    }
  };

  const onCellKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    row: number,
    col: number,
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const current = event.currentTarget;
      focusRelative(row, col, 1, 0);
      if (document.activeElement === current) current.blur();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusRelative(row, col, 1, 0);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusRelative(row, col, -1, 0);
      return;
    }
    const atStart = event.currentTarget.selectionStart === 0;
    const atEnd =
      event.currentTarget.selectionStart === event.currentTarget.value.length;
    if (event.key === "ArrowLeft" && atStart) {
      event.preventDefault();
      focusRelative(row, col, 0, -1);
    } else if (event.key === "ArrowRight" && atEnd) {
      event.preventDefault();
      focusRelative(row, col, 0, 1);
    }
  };

  const toggleSubject = (id: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const clearFilters = () => {
    setQ("");
    setStreamId("");
    setEntryStatus("ALL");
    setSelectedSubjectIds(subjects.map((s) => s.id));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <div className="min-w-48 flex-1">
          <label htmlFor="marks-q" className="mb-1 block text-xs font-medium text-slate-700">
            Search student
          </label>
          <input
            id="marks-q"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Name, reg no or admission no"
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none"
          />
        </div>
        <div className="min-w-32">
          <label htmlFor="marks-stream" className="mb-1 block text-xs font-medium text-slate-700">
            Stream
          </label>
          <Select
            id="marks-stream"
            value={streamId}
            onChange={(event) => setStreamId(event.target.value)}
          >
            <option value="">All</option>
            {streams.map((stream) => (
              <option key={stream.id} value={stream.id}>
                {stream.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-32">
          <label htmlFor="marks-status" className="mb-1 block text-xs font-medium text-slate-700">
            Entry status
          </label>
          <Select
            id="marks-status"
            value={entryStatus}
            onChange={(event) =>
              setEntryStatus(event.target.value as "ALL" | "ENTERED" | "MISSING")
            }
          >
            <option value="ALL">All</option>
            <option value="ENTERED">Entered</option>
            <option value="MISSING">Missing</option>
          </Select>
        </div>
        <button
          type="button"
          onClick={() => setSubjectsOpen(true)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-blue-900 hover:bg-slate-50"
        >
          Subjects ({visibleSubjects.length}/{subjects.length})
        </button>
        <button
          type="button"
          onClick={clearFilters}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-blue-900 hover:bg-slate-50"
        >
          Clear filters
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded border border-emerald-300 bg-emerald-50" /> Editable
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded border border-slate-300 bg-slate-100" /> Entered
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded border border-red-200 bg-red-50" /> Not registered
        </span>
        <span className="text-slate-400">
          {visibleStudents.length} student{visibleStudents.length === 1 ? "" : "s"} ·{" "}
          {visibleSubjects.length} subject{visibleSubjects.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="overflow-auto rounded-lg border border-slate-200 bg-white" style={{ maxHeight: "72vh" }}>
        <table className="border-collapse text-sm">
          <thead>
            <tr>
              {STICKY.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "sticky top-0 z-30 border-b border-r border-slate-200 bg-slate-50 px-2 py-2 text-xs font-semibold uppercase text-slate-500",
                    col.align === "center" ? "text-center" : "text-left",
                  )}
                  style={{ left: col.left, width: col.width, minWidth: col.width }}
                >
                  {col.label}
                </th>
              ))}
              {visibleSubjects.map((subject) => (
                <th
                  key={subject.id}
                  className="sticky top-0 z-20 border-b border-r border-slate-200 bg-slate-50 px-1 py-2 text-center text-xs font-semibold text-slate-500"
                  style={{ width: SUBJECT_WIDTH, minWidth: SUBJECT_WIDTH }}
                  title={subject.name}
                >
                  {subject.code ?? subject.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleStudents.map((student, row) => {
              const registered = registeredSets.get(student.id) ?? new Set<string>();
              return (
                <tr key={student.id} className="group">
                  <td
                    className="sticky z-10 border-b border-r border-slate-100 bg-white px-2 py-1 text-center text-xs text-slate-500 group-hover:bg-slate-50"
                    style={{ left: 0, width: 44, minWidth: 44 }}
                  >
                    {row + 1}
                  </td>
                  <td
                    className="sticky z-10 border-b border-r border-slate-100 bg-white px-2 py-1 text-xs text-slate-600 group-hover:bg-slate-50"
                    style={{ left: 44, width: 116, minWidth: 116 }}
                  >
                    {student.admissionNumber ?? student.studentNumber}
                  </td>
                  <td
                    className="sticky z-10 border-b border-r border-slate-100 bg-white px-2 py-1 text-xs font-medium text-slate-800 group-hover:bg-slate-50"
                    style={{ left: 160, width: 190, minWidth: 190 }}
                  >
                    {student.fullName}
                  </td>
                  <td
                    className="sticky z-10 border-b border-r border-slate-100 bg-white px-2 py-1 text-center text-xs text-slate-600 group-hover:bg-slate-50"
                    style={{ left: 350, width: 68, minWidth: 68 }}
                  >
                    {student.gender === "MALE" ? "M" : "F"}
                  </td>
                  <td
                    className="sticky z-10 border-b border-r border-slate-100 bg-white px-2 py-1 text-center text-xs text-slate-600 group-hover:bg-slate-50"
                    style={{ left: 418, width: 66, minWidth: 66 }}
                  >
                    {student.classLevelName}
                  </td>
                  <td
                    className="sticky z-10 border-b border-r border-slate-100 bg-white px-2 py-1 text-center text-xs text-slate-600 group-hover:bg-slate-50"
                    style={{ left: 484, width: 64, minWidth: 64 }}
                  >
                    {student.streamName}
                  </td>
                  {visibleSubjects.map((subject, col) => {
                    const key = keyOf(student.id, subject.id);
                    const eligible = registered.has(subject.id);
                    const value = scores.get(key);
                    const status = statuses.get(key) ?? "idle";
                    return (
                      <td
                        key={subject.id}
                        className="border-b border-r border-slate-100 px-1 py-1 text-center"
                        style={{ width: SUBJECT_WIDTH, minWidth: SUBJECT_WIDTH }}
                      >
                        <input
                          ref={(el) => {
                            const map = inputs.current;
                            const k = `${row}:${col}`;
                            if (el) map.set(k, el);
                            else map.delete(k);
                          }}
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          disabled={!canEdit || !eligible}
                          defaultValue={value === undefined ? "" : String(value)}
                          aria-label={`${student.fullName} ${subject.name}`}
                          onBlur={(event) => void commit({ studentId: student.id, subjectId: subject.id, input: event.currentTarget })}
                          onFocus={(event) => event.currentTarget.select()}
                          onKeyDown={(event) => onCellKeyDown(event, row, col)}
                          className={cn(
                            "h-7 w-full rounded border text-center text-xs text-slate-800 focus:outline-none",
                            eligible
                              ? value === undefined
                                ? "border-emerald-300 bg-emerald-50 focus:border-blue-600"
                                : "border-slate-300 bg-slate-100 focus:border-blue-600"
                              : "cursor-not-allowed border-red-200 bg-red-50 text-slate-300",
                            status === "saving" && "ring-2 ring-amber-400",
                            status === "saved" && "ring-2 ring-emerald-500",
                            status === "error" && "ring-2 ring-red-500",
                          )}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {visibleStudents.length === 0 ? (
              <tr>
                <td
                  colSpan={STICKY.length + visibleSubjects.length}
                  className="px-4 py-8 text-center text-sm text-slate-500"
                >
                  No students match the current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() => setProgressOpen(true)}
        className="fixed bottom-24 right-6 z-40 flex h-16 w-16 flex-col items-center justify-center rounded-full bg-royal-soft text-royal shadow-lg ring-1 ring-royal/20 hover:bg-royal-tint"
        aria-label="Show marks entry progress"
      >
        <span className="text-sm font-semibold">{progress.percent}%</span>
        <span className="text-[10px] text-royal-dark">entered</span>
      </button>

      <FloatingWindow
        open={subjectsOpen}
        onClose={() => setSubjectsOpen(false)}
        title="Subject columns"
        headerExtra={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedSubjectIds(subjects.map((s) => s.id))}
              className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-50"
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSelectedSubjectIds([])}
              className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-50"
            >
              None
            </button>
          </div>
        }
      >
        <div className="max-h-80 space-y-1 overflow-auto p-4">
          {subjects.map((subject) => (
            <label key={subject.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={selectedSet.has(subject.id)}
                onChange={() => toggleSubject(subject.id)}
                className="h-4 w-4 rounded border-slate-300 text-blue-900 focus:ring-blue-600"
              />
              {subject.name}
            </label>
          ))}
        </div>
      </FloatingWindow>

      <FloatingWindow
        open={progressOpen}
        onClose={() => setProgressOpen(false)}
        title="Marks entry progress"
        width={320}
      >
        <div className="space-y-3 p-4 text-sm">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <dl className="space-y-1">
            <div className="flex justify-between">
              <dt className="text-slate-500">Eligible cells</dt>
              <dd className="font-medium text-slate-800">{progress.eligible}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Entered</dt>
              <dd className="font-medium text-emerald-700">{progress.entered}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Remaining</dt>
              <dd className="font-medium text-amber-700">{progress.remaining}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-1">
              <dt className="text-slate-500">Completion</dt>
              <dd className="font-semibold text-slate-800">{progress.percent}%</dd>
            </div>
          </dl>
        </div>
      </FloatingWindow>
    </div>
  );
}
