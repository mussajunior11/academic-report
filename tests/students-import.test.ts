import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildStudentTemplate, parseStudentsWorkbook } from "@/lib/excel/students-workbook";

describe("student import workbook", () => {
  it("builds a template with the expected headers and instructions", async () => {
    const buffer = await buildStudentTemplate({ classes: ["FORM 1", "FORM 2"], streams: ["A", "B"] });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

    const sheet = workbook.getWorksheet("Students");
    expect(sheet).toBeTruthy();
    expect(sheet?.getCell("A1").value).toBe("Full Name");
    expect(sheet?.getCell("B1").value).toBe("Gender");
    expect(sheet?.getCell("C1").value).toBe("Class");
    expect(sheet?.getCell("D1").value).toBe("Stream");
    expect(workbook.getWorksheet("Instructions")).toBeTruthy();
  });

  it("round-trips filled rows", async () => {
    const template = await buildStudentTemplate({ classes: ["FORM 1", "FORM 2"], streams: ["A", "B"] });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(template as unknown as ArrayBuffer);
    const sheet = workbook.worksheets[0];
    const typed: string[][] = [
      ["Jane Doe", "FEMALE", "FORM 1", "A"],
      ["John Smith", "Male", "FORM 2", "B"],
    ];
    typed.forEach((values, index) => {
      values.forEach((value, col) => {
        sheet.getCell(index + 2, col + 1).value = value;
      });
    });

    const rows = await parseStudentsWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()));

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      rowNumber: 2,
      fullName: "Jane Doe",
      gender: "FEMALE",
      className: "FORM 1",
      streamName: "A",
    });
    expect(rows[1].fullName).toBe("John Smith");
  });

  it("skips completely blank rows", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Students");
    sheet.addRow(["Full Name", "Gender", "Class", "Stream"]);
    sheet.addRow(["Jane Doe", "FEMALE", "FORM 1", "A"]);
    sheet.addRow([]);
    sheet.addRow(["", "", "", ""]);
    sheet.addRow(["John Smith", "MALE", "FORM 1", "A"]);

    const rows = await parseStudentsWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()));
    expect(rows.map((row) => row.fullName)).toEqual(["Jane Doe", "John Smith"]);
  });

  it("rejects a workbook missing required columns", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Students");
    sheet.addRow(["Full Name", "Gender"]);
    sheet.addRow(["Jane Doe", "FEMALE"]);

    await expect(parseStudentsWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()))).rejects.toThrow(
      /missing required column/i,
    );
  });
});
