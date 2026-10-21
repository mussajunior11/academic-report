import "server-only";

import ExcelJS from "exceljs";
import { AppError } from "@/lib/errors";

/** Fixed columns shown before the per-subject score columns. */
const FIXED_HEADERS = ["S/N", "Student's Name", "Gender", "Class", "Stream"] as const;
const FIXED_WIDTHS = [6, 34, 12, 10, 10];
const HEADER_ROW = 5;
const FIRST_DATA_ROW = HEADER_ROW + 1;

/** Only these image types can be embedded in a worksheet. */
export type MarksLogoExtension = "png" | "jpeg" | "gif";

export type MarksTemplateSubject = { id: string; name: string; code: string | null };

export type MarksTemplateStudent = {
  id: string;
  fullName: string;
  gender: string;
  className: string;
  streamName: string;
  /**
   * Subjects the student is registered for. Cells for any subject missing from
   * this list are locked so marks cannot be entered against them. When omitted
   * every subject column stays editable (used by callers without registration data).
   */
  subjectIds?: string[];
};

export type BuildMarksTemplateOptions = {
  school: { name: string; logo: { buffer: Buffer; extension: MarksLogoExtension } | null };
  examination: {
    name: string;
    typeName: string;
    className: string;
    term: string | null;
    academicYearName: string;
  };
  subjects: MarksTemplateSubject[];
  students: MarksTemplateStudent[];
  /** Existing scores keyed by `${studentId}:${subjectId}`. */
  marks: Map<string, number>;
};

/** A single student row read from an uploaded marks workbook. */
export type ParsedMarksRow = {
  /** 1-based spreadsheet row number. */
  rowNumber: number;
  fullName: string;
  gender: string;
  className: string;
  streamName: string;
  /** Subject column label (as written in the header) mapped to the raw cell text. */
  scores: Record<string, string>;
};

export type ParsedMarksWorkbook = {
  headerRowNumber: number;
  /** Subject column labels in sheet order. */
  subjectHeaders: string[];
  rows: ParsedMarksRow[];
};

// Accepted header spellings (lower-cased) for the fixed columns.
const NAME_ALIASES = new Set([
  "full name",
  "name",
  "student name",
  "student's name",
  "students name",
  "studentsname",
]);
const GENDER_ALIASES = new Set(["gender", "sex"]);
const CLASS_ALIASES = new Set(["class", "class level", "form"]);
const STREAM_ALIASES = new Set(["stream"]);
const IGNORE_ALIASES = new Set(["s/n", "sn", "no", "no.", "#", "sr", "s. no", "s.no", "sr. no"]);

const GENDER_FILL = "FF1E3A8A";
const TITLE_FILL = "FFE2E8F0";
const LOCKED_FILL = "FFF1F5F9";

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFCBD5E1" } },
  left: { style: "thin", color: { argb: "FFCBD5E1" } },
  bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
  right: { style: "thin", color: { argb: "FFCBD5E1" } },
};

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value).trim();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const record = value as unknown as Record<string, unknown>;
    if (Array.isArray(record.richText)) {
      return (record.richText as { text: string }[]).map((part) => part.text).join("").trim();
    }
    if (typeof record.text === "string") return record.text.trim();
    if (record.result != null) return cellText(record.result as ExcelJS.CellValue);
  }
  return "";
}

function marksKey(studentId: string, subjectId: string): string {
  return `${studentId}:${subjectId}`;
}

/**
 * Builds the marks-entry workbook for one examination. The first sheet lists the
 * selected class streams' students with a column per selected subject, prefilled
 * with any marks already entered; a second sheet documents the rules.
 */
export async function buildMarksTemplate(options: BuildMarksTemplateOptions): Promise<Buffer> {
  const { school, examination, subjects, students, marks } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = school.name;
  workbook.created = new Date();

  const lastCol = FIXED_HEADERS.length + subjects.length;

  const sheet = workbook.addWorksheet("Marks", {
    views: [{ state: "frozen", ySplit: HEADER_ROW, xSplit: FIXED_HEADERS.length }],
  });

  FIXED_WIDTHS.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  subjects.forEach((subject, index) => {
    sheet.getColumn(FIXED_HEADERS.length + index + 1).width = Math.max(
      14,
      Math.min(28, subject.name.length + 2),
    );
  });

  // Logo panel (column A) — blank when no embeddable logo is available.
  sheet.mergeCells(1, 1, 3, 1);
  for (let r = 1; r < HEADER_ROW; r += 1) sheet.getRow(r).height = 22;

  sheet.mergeCells(1, 2, 1, lastCol);
  sheet.mergeCells(2, 2, 2, lastCol);
  sheet.mergeCells(3, 2, 3, lastCol);
  sheet.getCell(1, 2).value = school.name.toUpperCase();
  sheet.getCell(1, 2).font = { bold: true, size: 16 };
  sheet.getCell(2, 2).value = examination.name;
  sheet.getCell(2, 2).font = { bold: true, size: 12 };
  sheet.getCell(3, 2).value = [examination.typeName, examination.className, examination.term, examination.academicYearName]
    .filter(Boolean)
    .join(" · ");
  sheet.getCell(3, 2).font = { size: 10, color: { argb: "FF475569" } };
  for (let r = 1; r < HEADER_ROW; r += 1) {
    sheet.getCell(r, 2).alignment = { vertical: "middle" };
  }

  sheet.mergeCells(4, 1, 4, lastCol);
  sheet.getCell(4, 1).value = "MARKS ENTRY SHEET";
  sheet.getCell(4, 1).font = { bold: true, size: 10, color: { argb: "FF1E293B" } };
  sheet.getCell(4, 1).alignment = { vertical: "middle", horizontal: "center" };
  sheet.getCell(4, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: TITLE_FILL } };
  sheet.getRow(4).height = 20;

  const headerRow = sheet.getRow(HEADER_ROW);
  FIXED_HEADERS.forEach((label, index) => {
    headerRow.getCell(index + 1).value = label;
  });
  subjects.forEach((subject, index) => {
    headerRow.getCell(FIXED_HEADERS.length + index + 1).value = subject.name;
  });
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  headerRow.height = 30;
  for (let col = 1; col <= lastCol; col += 1) {
    headerRow.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: GENDER_FILL } };
    headerRow.getCell(col).border = thinBorder;
  }

  students.forEach((student, index) => {
    const row = sheet.getRow(FIRST_DATA_ROW + index);
    row.getCell(1).value = index + 1;
    row.getCell(2).value = student.fullName;
    row.getCell(3).value = student.gender;
    row.getCell(4).value = student.className;
    row.getCell(5).value = student.streamName;

    const registered = student.subjectIds ? new Set(student.subjectIds) : null;
    subjects.forEach((subject, subjectIndex) => {
      const cell = row.getCell(FIXED_HEADERS.length + subjectIndex + 1);
      if (registered && !registered.has(subject.id)) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LOCKED_FILL } };
        cell.note = "Not registered for this subject — leave blank.";
        return;
      }
      const score = marks.get(marksKey(student.id, subject.id));
      if (score !== undefined) cell.value = score;
      cell.numFmt = "0.0";
      cell.protection = { locked: false };
    });

    for (let col = 1; col <= lastCol; col += 1) {
      const cell = row.getCell(col);
      cell.border = thinBorder;
      if (col !== 2) cell.alignment = { horizontal: "center" };
    }
  });

  const validation: ExcelJS.DataValidation = {
    type: "decimal",
    operator: "between",
    allowBlank: true,
    formulae: ["0", "100"],
    showErrorMessage: true,
    errorTitle: "Invalid score",
    error: "Enter a number between 0 and 100 with at most one decimal place.",
  };
  const lastDataRow = FIRST_DATA_ROW + Math.max(students.length, 1) - 1;
  for (let col = FIXED_HEADERS.length + 1; col <= lastCol; col += 1) {
    const subject = subjects[col - FIXED_HEADERS.length - 1];
    for (let r = FIRST_DATA_ROW; r <= lastDataRow; r += 1) {
      const student = students[r - FIRST_DATA_ROW];
      if (student?.subjectIds && !student.subjectIds.includes(subject.id)) continue;
      const cell = sheet.getCell(r, col);
      cell.dataValidation = { ...validation };
      cell.protection = { locked: false };
    }
  }

  await sheet.protect("", {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: true,
    formatColumns: true,
    formatRows: true,
    insertRows: true,
    deleteRows: true,
    sort: true,
    autoFilter: true,
  });

  if (school.logo) {
    const imageId = workbook.addImage({
      buffer: school.logo.buffer as unknown as ExcelJS.Buffer,
      extension: school.logo.extension,
    });
    sheet.addImage(imageId, { tl: { col: 0.12, row: 0.12 }, ext: { width: 68, height: 68 } });
  }

  const info = workbook.addWorksheet("Instructions");
  info.columns = [{ width: 16 }, { width: 90 }];
  const titleRow = info.addRow(["Subject", school.name]);
  titleRow.font = { bold: true, size: 13 };
  const lines: [string, string][] = [
    ["Exam", examination.name],
    ["Class", examination.className],
    ["Subject columns", subjects.map((s) => s.name).join(", ") || "(none)"],
    ["", ""],
    ["Scores", "Enter a mark from 0 to 100 (at most one decimal place)."],
    [
      "Locked cells",
      "Greyed-out cells are subjects the student is not registered for; they cannot be edited.",
    ],
    ["Blank cells", "A blank cell clears any mark currently stored for that student and subject."],
    ["Students", "Delete rows for students you do not want to touch."],
    ["Names", "Do not rename or reorder the header row or the student names."],
    ["Uploading", "Save as .xlsx, then upload it on the marks entry page."],
  ];
  for (const [term, detail] of lines) {
    const row = info.addRow([term, detail]);
    row.getCell(1).font = { bold: true };
    row.getCell(2).alignment = { wrapText: true, vertical: "top" };
  }
  info.eachRow((row) => {
    row.getCell(2).alignment = { wrapText: true, vertical: "top" };
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/** Reads and validates the structure of an uploaded marks workbook. */
export async function parseMarksWorkbook(buffer: Buffer): Promise<ParsedMarksWorkbook> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw new AppError("The file could not be read. Please upload the .xlsx template.");
  }

  const sheet =
    workbook.worksheets.find((candidate) => candidate.name.toLowerCase() === "marks") ??
    workbook.worksheets[0];
  if (!sheet) throw new AppError("The workbook has no worksheets.");

  let headerRowNumber = 0;
  let nameCol = 0;
  let genderCol = 0;
  let classCol = 0;
  let streamCol = 0;
  const subjectColumns: { col: number; label: string }[] = [];

  const maxScan = Math.min(sheet.rowCount, 30);
  for (let r = 1; r <= maxScan; r += 1) {
    const row = sheet.getRow(r);
    let name = 0;
    let gender = 0;
    let className = 0;
    let stream = 0;
    const subjects: { col: number; label: string }[] = [];

    row.eachCell({ includeEmpty: false }, (cell, col) => {
      const text = cellText(cell.value);
      const lower = text.toLowerCase();
      if (!text) return;
      if (NAME_ALIASES.has(lower)) name ||= col;
      else if (GENDER_ALIASES.has(lower)) gender ||= col;
      else if (CLASS_ALIASES.has(lower)) className ||= col;
      else if (STREAM_ALIASES.has(lower)) stream ||= col;
      else if (!IGNORE_ALIASES.has(lower)) subjects.push({ col, label: text });
    });

    if (name) {
      headerRowNumber = r;
      nameCol = name;
      genderCol = gender;
      classCol = className;
      streamCol = stream;
      subjectColumns.push(...subjects);
      break;
    }
  }

  if (!headerRowNumber || !nameCol) {
    throw new AppError(
      "The header row could not be found. Download the marks template and use it unchanged.",
    );
  }

  const rows: ParsedMarksRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowNumber) return;
    const fullName = cellText(row.getCell(nameCol).value);
    const scores: Record<string, string> = {};
    for (const { col, label } of subjectColumns) {
      scores[label] = cellText(row.getCell(col).value);
    }
    const filled = Boolean(fullName) || Object.values(scores).some((value) => value !== "");
    if (!filled) return;
    rows.push({
      rowNumber,
      fullName,
      gender: genderCol ? cellText(row.getCell(genderCol).value) : "",
      className: classCol ? cellText(row.getCell(classCol).value) : "",
      streamName: streamCol ? cellText(row.getCell(streamCol).value) : "",
      scores,
    });
  });

  return {
    headerRowNumber,
    subjectHeaders: subjectColumns.map((column) => column.label),
    rows,
  };
}
