"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction } from "@/lib/actions/run-action";
import { AppError, toFriendlyError } from "@/lib/errors";
import { parseStudentsWorkbook } from "@/lib/excel/students-workbook";
import {
  bulkCreateStudents,
  createStudent,
  deleteStudent,
  previewBulkStudents,
  setStudentSpecialNeeds,
  setStudentStatus,
  setStudentSubjectRegistrations,
  updateStudent,
  type BulkStudentPreviewRow,
} from "@/lib/services/students";
import {
  studentSchema,
  studentSpecialNeedsSchema,
  subjectRegistrationSchema,
} from "@/lib/validation/schemas";
import { zodToFieldErrors, type ActionState } from "@/lib/validation/helpers";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export type ImportStudentsResult = {
  ok: boolean;
  message: string;
  created: number;
  failed: number;
  issues: { row: number; name: string; error: string }[];
};

const statusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

function invalid(error: z.ZodError): ActionState {
  return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: zodToFieldErrors(error) };
}

export async function createStudentAction(input: unknown): Promise<ActionState> {
  const parsed = studentSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return runAction(() => createStudent(parsed.data).then(() => undefined), {
    revalidate: ["/students", "/"],
    successMessage: "Student registered.",
  });
}

export async function updateStudentAction(input: unknown): Promise<ActionState> {
  const schema = studentSchema.extend({ id: z.string().min(1) });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...data } = parsed.data;
  return runAction(() => updateStudent(id, data).then(() => undefined), {
    revalidate: ["/students", `/students/${id}`, "/"],
    successMessage: "Student updated.",
  });
}

export async function toggleStudentStatusAction(input: unknown): Promise<ActionState> {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return runAction(() => setStudentStatus(parsed.data.id, parsed.data.status).then(() => undefined), {
    revalidate: ["/students", `/students/${parsed.data.id}`, "/"],
    successMessage: "Student status updated.",
  });
}

export async function deleteStudentAction(input: unknown): Promise<ActionState> {
  const parsed = z.object({ id: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return runAction(() => deleteStudent(parsed.data.id).then(() => undefined), {
    revalidate: ["/students", "/"],
    successMessage: "Student deleted.",
  });
}

export async function setStudentSpecialNeedsAction(input: unknown): Promise<ActionState> {
  const parsed = studentSpecialNeedsSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { id, categories } = parsed.data;
  return runAction(() => setStudentSpecialNeeds(id, categories).then(() => undefined), {
    revalidate: ["/students", `/students/${id}`, "/"],
    successMessage: "Support needs saved.",
  });
}

async function readUploadedWorkbook(formData: FormData): Promise<Buffer> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new AppError("Choose an .xlsx file to upload.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new AppError("The file is too large (maximum 5 MB).");
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new AppError("Only .xlsx files are supported. Download the template and use it.");
  }
  return Buffer.from(await file.arrayBuffer());
}

export async function importStudentsAction(formData: FormData): Promise<ImportStudentsResult> {
  const empty = { created: 0, failed: 0, issues: [] as ImportStudentsResult["issues"] };
  try {
    const buffer = await readUploadedWorkbook(formData);
    const rows = await parseStudentsWorkbook(buffer);
    if (rows.length === 0) {
      return { ok: false, message: "No student rows were found in the uploaded file.", ...empty };
    }

    const summary = await bulkCreateStudents(rows);
    revalidatePath("/students");
    revalidatePath("/");

    const ok = summary.failed === 0;
    const message = ok
      ? `Imported ${summary.created} student${summary.created === 1 ? "" : "s"}.`
      : `Imported ${summary.created} student${summary.created === 1 ? "" : "s"}; ${summary.failed} row${summary.failed === 1 ? "" : "s"} could not be imported.`;

    return { ok, message, created: summary.created, failed: summary.failed, issues: summary.issues };
  } catch (error) {
    return { ok: false, message: toFriendlyError(error).message, ...empty };
  }
}

export type ImportPreviewResult = {
  ok: boolean;
  message: string;
  rows: BulkStudentPreviewRow[];
  valid: number;
  invalid: number;
};

export async function previewStudentsAction(formData: FormData): Promise<ImportPreviewResult> {
  const empty = { rows: [] as BulkStudentPreviewRow[], valid: 0, invalid: 0 };
  try {
    const buffer = await readUploadedWorkbook(formData);
    const rows = await parseStudentsWorkbook(buffer);
    if (rows.length === 0) {
      return { ok: false, message: "No student rows were found in the uploaded file.", ...empty };
    }

    const preview = await previewBulkStudents(rows);
    const valid = preview.filter((row) => row.status === "ok").length;
    const invalid = preview.length - valid;
    const message =
      invalid === 0
        ? `All ${preview.length} row${preview.length === 1 ? "" : "s"} are ready to import.`
        : `${preview.length} row${preview.length === 1 ? "" : "s"} found: ${valid} ready to import, ${invalid} need attention.`;

    return { ok: true, message, rows: preview, valid, invalid };
  } catch (error) {
    return { ok: false, message: toFriendlyError(error).message, ...empty };
  }
}

export async function saveStudentSubjectsAction(input: unknown): Promise<ActionState> {
  const parsed = subjectRegistrationSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { studentId, academicYearId, subjectIds } = parsed.data;
  return runAction(
    () => setStudentSubjectRegistrations(studentId, academicYearId, subjectIds).then(() => undefined),
    {
      revalidate: ["/students", `/students/${studentId}`, "/"],
      successMessage: "Subject registrations saved.",
    },
  );
}
