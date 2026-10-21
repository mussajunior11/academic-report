"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction } from "@/lib/actions/run-action";
import { AppError, toFriendlyError } from "@/lib/errors";
import { parseMarksWorkbook } from "@/lib/excel/marks-workbook";
import { importMarks, clearMarks, registerCompulsorySubjectsForExamination, saveMark } from "@/lib/services/marks";
import { saveMarkSchema } from "@/lib/validation/schemas";
import { zodToFieldErrors, type ActionState } from "@/lib/validation/helpers";

/**
 * Saves or clears a single mark from the marks grid. No path revalidation is
 * performed so the auto-saving grid keeps its local state; the page re-reads
 * data on the next navigation.
 */
export async function saveMarkAction(input: unknown): Promise<ActionState> {
  const parsed = saveMarkSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Enter a score between 0 and 100 with at most one decimal place.",
      fieldErrors: zodToFieldErrors(parsed.error),
    };
  }

  return runAction(() => saveMark(parsed.data).then(() => undefined), {
    revalidate: [],
    successMessage: "Mark saved.",
  });
}

/**
 * Registers the examination's class compulsory subjects for all of its active
 * students, so the marks grid has subject columns to fill in.
 */
export async function registerClassSubjectsAction(input: unknown): Promise<ActionState> {
  const parsed = z.object({ examinationId: z.string().min(1) }).safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Invalid request.", fieldErrors: zodToFieldErrors(parsed.error) };
  }

  return runAction(
    () => registerCompulsorySubjectsForExamination(parsed.data.examinationId).then(() => undefined),
    {
      revalidate: [`/marks-entry/${parsed.data.examinationId}`],
      successMessage: "Subjects registered for the class. You can enter marks now.",
    },
  );
}

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export type ImportMarksResult = {
  ok: boolean;
  message: string;
  created: number;
  updated: number;
  cleared: number;
  unchanged: number;
  failed: number;
  issues: { row: number; name: string; error: string }[];
};

const emptyImport: Omit<ImportMarksResult, "ok" | "message"> = {
  created: 0,
  updated: 0,
  cleared: 0,
  unchanged: 0,
  failed: 0,
  issues: [],
};

export type PreviewMarksRow = {
  rowNumber: number;
  fullName: string;
  gender: string;
  className: string;
  streamName: string;
  scores: Record<string, string>;
};

export type PreviewMarksResult = {
  ok: boolean;
  message: string;
  subjectHeaders: string[];
  rows: PreviewMarksRow[];
};

function validateMarksFile(file: FormDataEntryValue | null): { file: File } | { error: string } {
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose the filled .xlsx template first." };
  }
  if (file.size > MAX_UPLOAD_BYTES) return { error: "The file is too large (maximum 5 MB)." };
  if (!file.name.toLowerCase().endsWith(".xlsx")) return { error: "Only .xlsx files are accepted." };
  return { file };
}

/**
 * Reads a filled marks template and returns its rows so the user can review the
 * scores before committing the import. No data is written.
 */
export async function previewMarksAction(formData: FormData): Promise<PreviewMarksResult> {
  const checked = validateMarksFile(formData.get("file"));
  if ("error" in checked) {
    return { ok: false, message: checked.error, subjectHeaders: [], rows: [] };
  }

  try {
    const buffer = Buffer.from(await checked.file.arrayBuffer());
    const parsed = await parseMarksWorkbook(buffer);
    if (parsed.rows.length === 0) {
      return { ok: false, message: "No student rows were found in the file.", subjectHeaders: [], rows: [] };
    }
    return {
      ok: true,
      message: `${parsed.rows.length} student row${parsed.rows.length === 1 ? "" : "s"} found.`,
      subjectHeaders: parsed.subjectHeaders,
      rows: parsed.rows,
    };
  } catch (error) {
    const message = error instanceof AppError ? error.message : toFriendlyError(error).message;
    return { ok: false, message, subjectHeaders: [], rows: [] };
  }
}

/**
 * Imports marks from a filled marks-entry template. A blank cell clears the
 * stored mark; rows that cannot be matched or hold invalid scores are reported
 * back without aborting the whole upload.
 */
export async function importMarksAction(formData: FormData): Promise<ImportMarksResult> {
  try {
    const examinationId = String(formData.get("examinationId") ?? "").trim();
    if (!examinationId) return { ok: false, message: "Missing examination.", ...emptyImport };

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, message: "Choose the filled .xlsx template to upload.", ...emptyImport };
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return { ok: false, message: "The file is too large (maximum 5 MB).", ...emptyImport };
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return { ok: false, message: "Only .xlsx files are accepted.", ...emptyImport };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseMarksWorkbook(buffer);
    if (parsed.rows.length === 0) {
      return { ok: false, message: "No student rows were found in the file.", ...emptyImport };
    }

    const summary = await importMarks(examinationId, parsed);
    revalidatePath(`/marks-entry/${examinationId}`);
    revalidatePath("/marks-entry");

    const parts = [
      `${summary.created} added`,
      `${summary.updated} updated`,
      `${summary.cleared} cleared`,
    ];
    const message =
      summary.failed === 0
        ? `Marks uploaded: ${parts.join(", ")}.`
        : `Marks uploaded with ${summary.failed} row${summary.failed === 1 ? "" : "s"} skipped: ${parts.join(", ")}.`;

    return { ok: summary.failed === 0, message, ...summary };
  } catch (error) {
    if (error instanceof AppError) return { ok: false, message: error.message, ...emptyImport };
    return { ok: false, message: toFriendlyError(error).message, ...emptyImport };
  }
}

const clearMarksSchema = z.object({
  examinationId: z.string().min(1),
  subjectIds: z.array(z.string().min(1)).min(1),
  streamIds: z.array(z.string().min(1)).default([]),
});

export type ClearMarksResult = {
  ok: boolean;
  message: string;
  cleared: number;
};

/**
 * Deletes the stored marks for the selected subjects and streams of an
 * examination. Other subjects/streams and other examinations are untouched.
 */
export async function clearMarksAction(input: unknown): Promise<ClearMarksResult> {
  const parsed = clearMarksSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Select at least one subject.", cleared: 0 };
  }

  try {
    const summary = await clearMarks(parsed.data);
    revalidatePath(`/marks-entry/${parsed.data.examinationId}`);
    revalidatePath("/marks-entry");
    return {
      ok: true,
      message: summary.cleared === 1 ? "Cleared 1 score." : `Cleared ${summary.cleared} scores.`,
      cleared: summary.cleared,
    };
  } catch (error) {
    if (error instanceof AppError) return { ok: false, message: error.message, cleared: 0 };
    return { ok: false, message: toFriendlyError(error).message, cleared: 0 };
  }
}
