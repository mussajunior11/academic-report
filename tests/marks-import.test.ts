import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { previewMarksAction } from "@/app/(app)/marks-entry/actions";
import { buildMarksTemplate, parseMarksWorkbook } from "@/lib/excel/marks-workbook";

const subjects = [
  { id: "sub-1", name: "MATHEMATICS", code: "MATH" },
  { id: "sub-2", name: "ENGLISH", code: "ENG" },
];

const students = [
  { id: "stu-1", fullName: "Jane Doe", gender: "FEMALE", className: "FORM 1", streamName: "A" },
  { id: "stu-2", fullName: "John Smith", gender: "MALE", className: "FORM 1", streamName: "A" },
];

function buildOptions(marks: Map<string, number> = new Map()) {
  return {
    school: { name: "Test School", logo: null },
    examination: {
      name: "Annual 2026",
      typeName: "ANNUAL",
      className: "FORM 1",
      term: "TERM 2",
      academicYearName: "2026",
    },
    subjects,
    students,
    marks,
  };
}

describe("marks import workbook", () => {
  it("builds a template with fixed and subject headers plus prefilled marks", async () => {
    const buffer = await buildMarksTemplate(buildOptions(new Map([["stu-1:sub-1", 85.5]])));

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const sheet = workbook.getWorksheet("Marks");
    expect(sheet).toBeDefined();

    expect(sheet!.getCell(5, 1).value).toBe("S/N");
    expect(sheet!.getCell(5, 2).value).toBe("Student's Name");
    expect(sheet!.getCell(5, 3).value).toBe("Gender");
    expect(sheet!.getCell(5, 4).value).toBe("Class");
    expect(sheet!.getCell(5, 5).value).toBe("Stream");
    expect(sheet!.getCell(5, 6).value).toBe("MATHEMATICS");
    expect(sheet!.getCell(5, 7).value).toBe("ENGLISH");

    expect(sheet!.getCell(6, 2).value).toBe("Jane Doe");
    expect(sheet!.getCell(6, 6).value).toBe(85.5);
    expect(sheet!.getCell(7, 6).value ?? "").toBe("");
    expect(workbook.getWorksheet("Instructions")).toBeDefined();
  });

  it("locks score cells for subjects a student is not registered for", async () => {
    const buffer = await buildMarksTemplate({
      ...buildOptions(),
      students: [
        { ...students[0], subjectIds: ["sub-1"] },
        { ...students[1], subjectIds: ["sub-1", "sub-2"] },
      ],
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const sheet = workbook.getWorksheet("Marks")!;

    // Registered cell: editable with a 0–100 validation rule.
    expect(sheet.getCell(6, 6).protection?.locked).toBe(false);
    expect(sheet.getCell(6, 6).dataValidation).toBeDefined();

    // Unregistered cell: locked, no validation rule, left blank.
    expect(sheet.getCell(6, 7).protection?.locked).not.toBe(false);
    expect(sheet.getCell(6, 7).dataValidation).toBeUndefined();
    expect(sheet.getCell(6, 7).value ?? "").toBe("");

    // The second student is registered for both subjects.
    expect(sheet.getCell(7, 7).protection?.locked).toBe(false);

    const protection = (sheet as unknown as { sheetProtection?: { sheet?: boolean } })
      .sheetProtection;
    expect(protection?.sheet).toBe(true);
  });

  it("round-trips an edited sheet", async () => {
    const buffer = await buildMarksTemplate(buildOptions());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const sheet = workbook.getWorksheet("Marks")!;
    sheet.getCell(6, 6).value = 90;
    sheet.getCell(6, 7).value = 72.5;
    sheet.getCell(7, 6).value = 60;

    const parsed = await parseMarksWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()));

    expect(parsed.headerRowNumber).toBe(5);
    expect(parsed.subjectHeaders).toEqual(["MATHEMATICS", "ENGLISH"]);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toMatchObject({
      rowNumber: 6,
      fullName: "Jane Doe",
      gender: "FEMALE",
      className: "FORM 1",
      streamName: "A",
    });
    expect(parsed.rows[0].scores).toEqual({ MATHEMATICS: "90", ENGLISH: "72.5" });
    expect(parsed.rows[1].scores.MATHEMATICS).toBe("60");
  });

  it("finds the header row after a title block", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Marks");
    sheet.addRow(["Test School"]);
    sheet.addRow([]);
    sheet.addRow(["S/N", "Student's Name", "Gender", "Class", "Stream", "BIOLOGY"]);
    sheet.addRow([1, "Jane Doe", "FEMALE", "FORM 1", "A", 80]);

    const parsed = await parseMarksWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()));
    expect(parsed.headerRowNumber).toBe(3);
    expect(parsed.subjectHeaders).toEqual(["BIOLOGY"]);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].scores.BIOLOGY).toBe("80");
  });

  it("rejects a workbook without a name column", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Marks");
    sheet.addRow(["S/N", "Gender"]);
    sheet.addRow([1, "FEMALE"]);

    await expect(
      parseMarksWorkbook(Buffer.from(await workbook.xlsx.writeBuffer())),
    ).rejects.toThrow();
  });
});

describe("preview marks action", () => {
  it("returns the parsed scores without writing any data", async () => {
    const buffer = await buildMarksTemplate(buildOptions());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const sheet = workbook.getWorksheet("Marks")!;
    sheet.getCell(6, 6).value = 90;
    sheet.getCell(6, 7).value = 72.5;

    const form = new FormData();
    form.append(
      "file",
      new File([Buffer.from(await workbook.xlsx.writeBuffer())], "marks.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );

    const result = await previewMarksAction(form);

    expect(result.ok).toBe(true);
    expect(result.subjectHeaders).toEqual(["MATHEMATICS", "ENGLISH"]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].fullName).toBe("Jane Doe");
    expect(result.rows[0].scores.MATHEMATICS).toBe("90");
    expect(result.rows[0].scores.ENGLISH).toBe("72.5");
  });

  it("rejects a file that is not an .xlsx template", async () => {
    const form = new FormData();
    form.append("file", new File([Buffer.from("not a workbook")], "marks.txt", { type: "text/plain" }));

    const result = await previewMarksAction(form);

    expect(result.ok).toBe(false);
    expect(result.rows).toHaveLength(0);
  });
});
