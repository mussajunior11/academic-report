"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { EditIcon, EyeIcon, PowerIcon, TrashIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { SupportNeedsPopover, type SupportNeedOption } from "./support-needs-popover";
import { deleteStudentAction, toggleStudentStatusAction } from "./actions";

export type StudentRow = {
  id: string;
  studentNumber: string;
  fullName: string;
  gender: string;
  status: string;
  classLevelName: string;
  streamName: string;
  specialNeeds: { categoryId: string; label: string; note: string }[];
};

type OptimisticAction =
  | { type: "status"; id: string; status: string }
  | { type: "delete"; id: string };

function reduce(rows: StudentRow[], action: OptimisticAction): StudentRow[] {
  if (action.type === "status") {
    return rows.map((row) => (row.id === action.id ? { ...row, status: action.status } : row));
  }
  return rows.filter((row) => row.id !== action.id);
}

export function StudentsTable({
  items,
  categories,
  sortLinks,
  sortMarks,
}: {
  items: StudentRow[];
  categories: SupportNeedOption[];
  sortLinks: Record<string, string>;
  sortMarks: Record<string, string>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [rows, applyOptimistic] = useOptimistic(items, reduce);

  const toggleStatus = (row: StudentRow) => {
    const next = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    if (
      next === "INACTIVE" &&
      !window.confirm(`Deactivate ${row.fullName}? The record is kept for historical data.`)
    ) {
      return;
    }
    startTransition(async () => {
      applyOptimistic({ type: "status", id: row.id, status: next });
      const result = await toggleStudentStatusAction({ id: row.id, status: next });
      if (!result?.ok) {
        toast.show(result?.message ?? "Could not update the student.", "error");
        return;
      }
      router.refresh();
    });
  };

  const remove = (row: StudentRow) => {
    if (
      !window.confirm(
        `Delete ${row.fullName} permanently? This also removes their subject registrations, support needs and marks, and cannot be undone.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      applyOptimistic({ type: "delete", id: row.id });
      const result = await deleteStudentAction({ id: row.id });
      if (!result?.ok) {
        toast.show(result?.message ?? "Could not delete the student.", "error");
        return;
      }
      toast.show("Student deleted.", "success");
      router.refresh();
    });
  };

  const sortableHeader = (column: string, label: string) => (
    <th className="px-4 py-2 font-medium">
      <Link href={sortLinks[column] ?? "/students"} className="hover:text-royal">
        {label}
        {sortMarks[column] ?? ""}
      </Link>
    </th>
  );

  return (
    <div className="max-h-[70vh] overflow-auto">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            {sortableHeader("studentNumber", "Student No.")}
            {sortableHeader("fullName", "Full name")}
            <th className="px-4 py-2 font-medium">Gender</th>
            <th className="px-4 py-2 font-medium">Class</th>
            <th className="px-4 py-2 font-medium">Stream</th>
            {sortableHeader("status", "Status")}
            <th className="px-4 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((student) => (
            <tr key={student.id} className="hover:bg-slate-50">
              <td className="px-4 py-2 font-mono text-xs text-slate-600">{student.studentNumber}</td>
              <td className="px-4 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/students/${student.id}`} className="font-medium text-royal hover:underline">
                    {student.fullName}
                  </Link>
                  {student.specialNeeds.slice(0, 2).map((need) => (
                    <Badge key={need.categoryId} tone="warning">
                      {need.label}
                    </Badge>
                  ))}
                  {student.specialNeeds.length > 2 ? (
                    <Badge tone="warning">+{student.specialNeeds.length - 2}</Badge>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-2 text-slate-600">
                {student.gender.charAt(0) + student.gender.slice(1).toLowerCase()}
              </td>
              <td className="px-4 py-2 text-slate-600">{student.classLevelName}</td>
              <td className="px-4 py-2 text-slate-600">{student.streamName}</td>
              <td className="px-4 py-2">
                <StatusBadge status={student.status} />
              </td>
              <td className="px-4 py-2">
                <div className="flex flex-wrap items-center gap-1">
                  <Link
                    href={`/students/${student.id}`}
                    title="View"
                    aria-label="View"
                    className={buttonClasses("ghost", "icon")}
                  >
                    <EyeIcon />
                  </Link>
                  <Link
                    href={`/students/${student.id}/edit`}
                    title="Edit"
                    aria-label="Edit"
                    className={buttonClasses("ghost", "icon")}
                  >
                    <EditIcon />
                  </Link>
                  <SupportNeedsPopover
                    studentId={student.id}
                    studentName={student.fullName}
                    categories={categories}
                    selected={student.specialNeeds.map((need) => ({
                      key: need.categoryId,
                      note: need.note,
                    }))}
                  />
                  <button
                    type="button"
                    onClick={() => toggleStatus(student)}
                    disabled={pending}
                    title={student.status === "ACTIVE" ? "Deactivate" : "Activate"}
                    aria-label={student.status === "ACTIVE" ? "Deactivate" : "Activate"}
                    className={buttonClasses("ghost", "icon")}
                  >
                    <PowerIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(student)}
                    disabled={pending}
                    title="Delete"
                    aria-label="Delete"
                    className={buttonClasses("ghost", "icon", "text-red-600 hover:bg-red-50")}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
