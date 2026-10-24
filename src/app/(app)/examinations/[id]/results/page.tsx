import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { getClassResults } from "@/lib/services/class-results";
import { getExaminationReport, formatReportDate } from "@/lib/services/reports";
import { getSchoolSettings } from "@/lib/services/school";
import { ResultsPrintControls } from "./results-print-controls";

export const metadata = { title: "Examination results" };
export const dynamic = "force-dynamic";

const DIVISION_ORDER = ["I", "II", "III", "IV", "0"];
const GRADE_ORDER = ["A", "B", "C", "D", "F"];
const PAGE_SIZE = 20;

function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  const rounded = Number(value.toFixed(2));
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function formatAverage(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toFixed(2);
}

function buildSummaryStats(students: { average: number | null }[]) {
  const valid = students
    .map((student) => student.average)
    .filter((value): value is number => value !== null && !Number.isNaN(value));

  if (valid.length === 0) {
    return { highest: 0, lowest: 0, sd: 0 };
  }

  const sum = valid.reduce((total, value) => total + value, 0);
  const mean = sum / valid.length;
  const variance = valid.reduce((total, value) => total + (value - mean) ** 2, 0) / valid.length;

  return {
    highest: Math.max(...valid),
    lowest: Math.min(...valid),
    sd: Math.sqrt(variance),
  };
}

export default async function ExaminationResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [report, classResults, schoolSettings] = await Promise.all([
    getExaminationReport(id),
    getClassResults(id),
    getSchoolSettings(),
  ]);

  if (!report) notFound();

  const { examination, students, gradeScale, divisionScale, requiredSubjects } = report;
  const ranked = students.filter((card) => card.gradedSubjects > 0);
  const schoolName = schoolSettings?.settings.schoolName ?? schoolSettings?.school.name ?? "School";
  const logoUrl = schoolSettings?.settings.logoUrl ?? schoolSettings?.school.logoUrl ?? null;

  const divisionSummary = DIVISION_ORDER.map((code) => ({
    code,
    total: classResults?.divisionTotals?.[code] ?? students.filter((student) => student.division === code).length,
  }));
  const totalDivisionCount = divisionSummary.reduce((sum, entry) => sum + entry.total, 0);

  const gradeSummary = Object.fromEntries(GRADE_ORDER.map((code) => [code, 0])) as Record<string, number>;
  for (const student of students) {
    if (student.averageGrade) gradeSummary[student.averageGrade] = (gradeSummary[student.averageGrade] ?? 0) + 1;
  }

  const stats = buildSummaryStats(students);
  const passed = students.filter((student) => student.average !== null && student.average >= (classResults?.passMark ?? 0)).length;
  const failed = students.length - passed;

  const allSubjects = Array.from(
    new Map(
      students
        .flatMap((student) => student.subjects)
        .map((subject) => [subject.subjectId, { ...subject }]),
    ).values(),
  ).sort((left, right) => {
    const leftCode = String(left.code ?? left.name ?? "").trim();
    const rightCode = String(right.code ?? right.name ?? "").trim();
    if (leftCode && rightCode && leftCode !== rightCode) {
      return leftCode.localeCompare(rightCode, undefined, { numeric: true });
    }
    return left.name.localeCompare(right.name);
  });

  const subjectColumns = allSubjects.filter((subject) => subject.code || subject.name);
  const pages = [] as Array<typeof students>;
  for (let index = 0; index < students.length; index += PAGE_SIZE) {
    pages.push(students.slice(index, index + PAGE_SIZE));
  }

  const printHeader = (
    <thead>
      <tr>
        <th style={{ width: "6%" }}>Cand. No</th>
        <th style={{ width: "18%" }}>Student&apos;s Name</th>
        <th style={{ width: "6%" }}>Gender</th>
        <th style={{ width: "6%" }}>Class</th>
        <th style={{ width: "6%" }}>Stream</th>
        {subjectColumns.map((subject) => (
          <th key={subject.subjectId} style={{ width: "5.5%" }} title={subject.name}>
            {subject.code ?? subject.name.slice(0, 4).toUpperCase()}
          </th>
        ))}
        <th style={{ width: "6%" }}>Total Subjects</th>
        <th style={{ width: "7%" }}>Total Marks</th>
        <th style={{ width: "7%" }}>Average</th>
        <th style={{ width: "5%" }}>Grade</th>
        <th style={{ width: "5%" }}>Position</th>
        <th style={{ width: "6%" }}>Points</th>
        <th style={{ width: "5%" }}>Division</th>
      </tr>
    </thead>
  );

  return (
    <>
      <style>{`
        @page {
          size: A4 landscape;
          margin: 8mm 6mm;
        }

        @media print {
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .no-print {
            display: none !important;
          }

          .results-report {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
          }

          .results-page {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            page-break-after: always;
            margin: 0;
            padding: 0;
          }

          .results-page:last-child {
            page-break-after: auto;
          }

          .results-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            background: #ffffff !important;
          }

          .results-table thead {
            display: table-header-group !important;
            background: #f3f4f6 !important;
          }

          .results-table thead th {
            background: #f3f4f6 !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            border: 1px solid #9ca3af !important;
          }

          .results-table td,
          .results-table th,
          .results-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }

        .results-report {
          color: #111827;
          background: #ffffff;
          font-family: Arial, Helvetica, sans-serif;
        }

        .results-header {
          text-align: center;
          padding: 0 0 4px;
          border-bottom: 1px solid #d1d5db;
        }

        .results-school {
          font-size: 14pt;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin: 0;
          color: #000000;
        }

        .results-exam {
          margin-top: 6px;
          font-size: 10pt;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #000000;
        }

        .results-summary {
          margin-top: 10px;
          display: grid;
          grid-template-columns: 1.2fr 1fr 1fr 1fr;
          gap: 10px;
          align-items: start;
        }

        .summary-panel {
          border: 1px solid #d1d5db;
          background: #ffffff;
          padding: 6px;
        }

        .summary-panel h3 {
          margin: 0 0 6px;
          font-size: 8pt;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #000000;
        }

        .summary-panel table {
          width: 100%;
          border-collapse: collapse;
          font-size: 7pt;
        }

        .summary-panel th,
        .summary-panel td {
          border: 1px solid #d1d5db;
          padding: 2px 3px;
          text-align: center;
          font-weight: 700;
        }

        .summary-panel th {
          background: #f3f4f6;
        }

        .exam-type {
          display: flex;
          flex-direction: column;
          gap: 8px;
          justify-content: center;
          min-height: 120px;
          font-size: 8pt;
        }

        .exam-type-label,
        .mini-stat-label {
          font-size: 7pt;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #111827;
        }

        .exam-type-value {
          font-size: 8pt;
          font-weight: 700;
          color: #000000;
          line-height: 1.4;
          text-transform: uppercase;
        }

        .mini-stats {
          display: grid;
          grid-template-columns: 1fr;
          gap: 6px;
          margin-top: 2px;
        }

        .mini-stat {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          font-size: 8pt;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 2px;
        }

        .mini-stat .mini-stat-label {
          text-align: center;
          flex: 1;
        }

        .mini-stat .mini-stat-value {
          min-width: 54px;
          text-align: center;
          font-weight: 700;
        }

        .class-stats-grid {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 4px 8px;
          align-items: center;
          font-size: 7.5pt;
        }

        .class-stats-grid .label {
          font-weight: 700;
          text-transform: uppercase;
          color: #111827;
          text-align: center;
        }

        .class-stats-grid .value {
          font-weight: 700;
          text-align: center;
        }

        .results-table-wrap {
          margin-top: 12px;
          overflow-x: auto;
        }

        .results-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 6.5pt;
          border: 1px solid #374151;
        }

        .results-table thead th {
          background: #f3f4f6;
          color: #111827;
          border: 1px solid #9ca3af;
          padding: 4px 3px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-weight: 700;
          line-height: 1.1;
          vertical-align: middle;
        }

        .results-table tbody td {
          border: 1px solid #d1d5db;
          padding: 3px 2px;
          text-align: center;
          vertical-align: middle;
          line-height: 1.15;
        }

        .results-table .student-name {
          text-align: left;
          padding-left: 6px;
          font-weight: 700;
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .results-table .candidate-number {
          font-weight: 700;
        }

        .results-table .score-cell {
          font-weight: 600;
        }

        .results-table .summary-col {
          font-weight: 700;
          background: #fafafa;
        }

        .results-table-footer {
          margin-top: 8px;
          border-top: 1px solid #d1d5db;
          padding-top: 6px;
          text-align: center;
          font-size: 8pt;
          color: #4b5563;
        }

        @media (max-width: 960px) {
          .results-summary {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>

      <div className="results-report mx-auto w-full max-w-none rounded-none border-0 bg-white p-0 shadow-none">
        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
          <Link href={`/examinations/${id}`} className={buttonClasses("secondary", "md")}>
            Back to examination
          </Link>
          <ResultsPrintControls autoPrint={query.print === "1"} />
        </div>

        <div className="report-sheet">
          {pages.map((pageStudents, pageIndex) => (
            <div key={`page-${pageIndex}`} className="results-page">
              {pageIndex === 0 ? (
                <>
                  <header className="results-header">
                    {logoUrl ? (
                      <div className="mb-2 flex justify-center">
                        <img src={logoUrl} alt={`${schoolName} logo`} className="h-10 w-auto object-contain" />
                      </div>
                    ) : null}
                    <h1 className="results-school">{schoolName}</h1>
                    <h2 className="results-exam">{examination.title}</h2>
                  </header>

                  <section className="results-summary">
                    <div className="summary-panel exam-type">
                      <div className="exam-type-label">EXAM TYPE</div>
                      <div className="exam-type-value">{examination.name}</div>
                    </div>

                    <div className="summary-panel">
                      <h3>Division performance summary</h3>
                      <table>
                        <thead>
                          <tr>
                            {DIVISION_ORDER.map((code) => (
                              <th key={code}>{code}</th>
                            ))}
                            <th>TOTAL</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            {DIVISION_ORDER.map((code) => (
                              <td key={code}>{divisionSummary.find((entry) => entry.code === code)?.total ?? 0}</td>
                            ))}
                            <td>{totalDivisionCount}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="summary-panel">
                      <h3>Grade performance summary</h3>
                      <table>
                        <thead>
                          <tr>
                            {GRADE_ORDER.map((code) => (
                              <th key={code}>{code}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            {GRADE_ORDER.map((code) => (
                              <td key={code}>{gradeSummary[code] ?? 0}</td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="summary-panel">
                      <h3>GPA / Average</h3>
                      <div className="mini-stats">
                        <div className="mini-stat">
                          <span className="mini-stat-label">GPA</span>
                          <span className="mini-stat-value">{classResults?.headline.gpa != null ? formatAverage(classResults.headline.gpa) : "—"}</span>
                        </div>
                        <div className="mini-stat">
                          <span className="mini-stat-label">AVERAGE</span>
                          <span className="mini-stat-value">{classResults?.headline.average != null ? formatAverage(classResults.headline.average) : "—"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="summary-panel" style={{ gridColumn: "span 1" }}>
                      <h3>Class statistics</h3>
                      <div className="class-stats-grid">
                        <span className="label">Highest average</span>
                        <span className="value">{formatAverage(stats.highest)}</span>
                        <span className="label">Lowest average</span>
                        <span className="value">{formatAverage(stats.lowest)}</span>
                        <span className="label">Standard deviation</span>
                        <span className="value">{stats.sd ? Number(stats.sd).toFixed(4) : "0.0000"}</span>
                        <span className="label">Passed</span>
                        <span className="value">{passed}</span>
                        <span className="label">Failed</span>
                        <span className="value">{failed}</span>
                      </div>
                    </div>
                  </section>
                </>
              ) : (
                <header className="results-header" style={{ marginBottom: "8px" }}>
                  <h1 className="results-school">{schoolName}</h1>
                  <h2 className="results-exam">{examination.title}</h2>
                </header>
              )}

              <div className="results-table-wrap">
                <table className="results-table">
                  <colgroup>
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "6%" }} />
                    {subjectColumns.map((subject) => (
                      <col key={`col-${subject.subjectId}`} style={{ width: "5.5%" }} />
                    ))}
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "5%" }} />
                    <col style={{ width: "5%" }} />
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "5%" }} />
                  </colgroup>

                  {printHeader}

                  <tbody>
                    {pageStudents.map((student, index) => {
                      const subjectMap = new Map(student.subjects.map((entry) => [entry.subjectId, entry]));

                      return (
                        <tr key={student.student.id}>
                          <td className="candidate-number">{student.student.studentNumber || String(index + 1)}</td>
                          <td className="student-name">{student.student.fullName}</td>
                          <td>{student.student.gender === "MALE" ? "M" : student.student.gender === "FEMALE" ? "F" : student.student.gender}</td>
                          <td>{examination.classLevelName}</td>
                          <td>{student.student.streamName}</td>
                          {subjectColumns.map((subject) => {
                            const current = subjectMap.get(subject.subjectId);
                            return (
                              <td key={`${student.student.id}-${subject.subjectId}`} className="score-cell">
                                {current && current.score !== null ? formatScore(current.score) : ""}
                              </td>
                            );
                          })}
                          <td className="summary-col">{student.gradedSubjects}</td>
                          <td className="summary-col">{formatScore(student.totalMarks)}</td>
                          <td className="summary-col">{student.average ? formatAverage(student.average) : "—"}</td>
                          <td className="summary-col">{student.averageGrade ?? "—"}</td>
                          <td className="summary-col">{student.position > 0 ? student.position : "—"}</td>
                          <td className="summary-col">{student.totalPoints}</td>
                          <td className="summary-col">{student.division}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {pageIndex === pages.length - 1 ? (
                <div className="results-table-footer">
                  {ranked.length} of {students.length} student{students.length === 1 ? "" : "s"} ranked · Generated by Academic Report — {schoolName} · {formatReportDate(new Date())}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
