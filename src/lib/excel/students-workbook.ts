import "server-only";

import ExcelJS from "exceljs";
import { AppError } from "@/lib/errors";

export const TEMPLATE_FILENAME = "students-import-template.xlsx";

/** A single student row read from an uploaded workbook. */
export type BulkStudentRow = {
  /** 1-based spreadsheet row number (the header is row 1). */
  rowNumber: number;
  fullName: string;
  gender: string;
  className: string;
  streamName: string;
};

const FIELD_LABELS: Record<keyof Omit<BulkStudentRow, "rowNumber">, string> = {
  fullName: "Full Name",
  gender: "Gender",
  className: "Class",
  streamName: "Stream",
};

// Accepted header spellings (lower-cased) mapped to the internal field.
const HEADER_ALIASES: Record<string, keyof Omit<BulkStudentRow, "rowNumber">> = {
  "full name": "fullName",
  name: "fullName",
  "student name": "fullName",
  "student's name": "fullName",
  studentsname: "fullName",
  gender: "gender",
  sex: "gender",
  class: "className",
  "class level": "className",
  form: "className",
  stream: "streamName",
};

const GENDERS = ["MALE", "FEMALE"];

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

/** Builds a quoted, comma-separated data-validation list, or null if too long. */
function validationList(values: string[]): string | null {
  const joined = values.join(",");
  if (values.length === 0 || joined.length > 255) return null;
  return `"${joined}"`;
}

/**
 * Generates the import template. The first sheet contains the column headers
 * (with dropdowns for gender/class/stream); a second sheet documents the rules.
 */
export async function buildStudentTemplate(options: {
  classes: string[];
  streams: string[];
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Academic Report";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Students", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = [
    { header: FIELD_LABELS.fullName, key: "fullName", width: 34 },
    { header: FIELD_LABELS.gender, key: "gender", width: 14 },
    { header: FIELD_LABELS.className, key: "className", width: 16 },
    { header: FIELD_LABELS.streamName, key: "streamName", width: 14 },
  ];
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  header.alignment = { vertical: "middle" };
  header.height = 20;

  const genderList = validationList(GENDERS);
  const classList = validationList(options.classes);
  const streamList = validationList(options.streams);
  const MAX_ROWS = 500;

  for (let r = 2; r <= MAX_ROWS; r += 1) {
    if (genderList) {
      sheet.getCell(`B${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [genderList],
      };
    }
    if (classList) {
      sheet.getCell(`C${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [classList],
      };
    }
    if (streamList) {
      sheet.getCell(`D${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [streamList],
      };
    }
  }

  const info = workbook.addWorksheet("Instructions");
  info.columns = [{ width: 110 }];
  const lines: [string, boolean][] = [
    ["Academic Report — Students import template", true],
    ["", false],
    ["Fill in the 'Students' sheet with one student per row.", false],
    ["Columns: Full Name, Gender, Class, Stream.", false],
    ["", false],
    ["Gender must be MALE or FEMALE.", false],
    [`Allowed classes: ${options.classes.join(", ") || "(none configured)"}`, false],
    [`Allowed streams: ${options.streams.join(", ") || "(none configured)"}`, false],
    ["", false],
    ["Class and Stream must match the names above exactly.", false],
    ["Only active class-stream combinations are accepted.", false],
    ["Leave row 1 (the header) unchanged and delete the instructions before uploading.", false],
  ];
  for (const [text, bold] of lines) {
    const row = info.addRow([text]);
    if (bold) row.font = { bold: true, size: 13 };
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/** Reads and validates the structure of an uploaded workbook. */
export async function parseStudentsWorkbook(buffer: Buffer): Promise<BulkStudentRow[]> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw new AppError("The file could not be read. Please upload the .xlsx template.");
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new AppError("The workbook has no worksheets.");

  const columnMap = new Map<number, keyof Omit<BulkStudentRow, "rowNumber">>();
  sheet.getRow(1).eachCell((cell, colNumber) => {
    const key = HEADER_ALIASES[cellText(cell.value).toLowerCase()];
    if (key && !Array.from(columnMap.values()).includes(key)) columnMap.set(colNumber, key);
  });

  const required: (keyof Omit<BulkStudentRow, "rowNumber">)[] = [
    "fullName",
    "gender",
    "className",
    "streamName",
  ];
  const present = new Set(columnMap.values());
  const missing = required.filter((field) => !present.has(field));
  if (missing.length > 0) {
    throw new AppError(
      `The template is missing required column(s): ${missing.map((f) => FIELD_LABELS[f]).join(", ")}.`,
    );
  }

  const rows: BulkStudentRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record: Partial<BulkStudentRow> = { rowNumber };
    for (const [col, key] of columnMap) {
      record[key] = cellText(row.getCell(col).value);
    }
    const filled = Boolean(record.fullName || record.gender || record.className || record.streamName);
    if (!filled) return;
    rows.push({
      rowNumber,
      fullName: record.fullName ?? "",
      gender: record.gender ?? "",
      className: record.className ?? "",
      streamName: record.streamName ?? "",
    });
  });

  return rows;
}
