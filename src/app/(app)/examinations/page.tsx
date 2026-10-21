import Link from "next/link";
import { ActionButton } from "@/components/ui/action-button";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/form";
import { EditIcon, EyeIcon, FilePdfIcon, FileSpreadsheetIcon, PowerIcon, TrashIcon } from "@/components/ui/icons";
import { PageHeader } from "@/components/layout/app-nav";
import { EXAMINATION_STATUSES } from "@/lib/constants";
import { listClassLevels } from "@/lib/services/academic";
import { listExaminationTypes, listExaminations } from "@/lib/services/examinations";
import { listAcademicYears } from "@/lib/services/school";
import { setExaminationStatusAction, deleteExaminationAction } from "./actions";

export const metadata = { title: "Examinations" };

type SearchParams = {
  q?: string;
  typeId?: string;
  academicYearId?: string;
  classLevelId?: string;
  status?: string;
  page?: string;
};

function formatDate(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(value);
}

export default async function ExaminationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;

  const [{ items, total, pageCount }, types, years, classes] = await Promise.all([
    listExaminations({
      q: params.q,
      typeId: params.typeId,
      academicYearId: params.academicYearId,
      classLevelId: params.classLevelId,
      status: params.status,
      page,
      pageSize: 10,
    }),
    listExaminationTypes(),
    listAcademicYears(),
    listClassLevels(),
  ]);

  const buildHref = (overrides: Partial<SearchParams>) => {
    const next = { ...params, ...overrides };
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value) search.set(key, String(value));
    }
    const qs = search.toString();
    return qs ? `/examinations?${qs}` : "/examinations";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Examinations"
        description="Set up examinations per class and academic period. Marks entry and grading arrive in later phases."
        actions={
          <Link href="/examinations/new" className={buttonClasses("primary", "md")}>
            Create examination
          </Link>
        }
      />

      <Card>
        <CardHeader title="Search & filters" />
        <CardBody>
          <form method="get" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <label htmlFor="q" className="mb-1 block text-xs font-medium text-slate-700">
                Search
              </label>
              <Input id="q" name="q" defaultValue={params.q ?? ""} placeholder="Name, type or period" />
            </div>
            <div>
              <label htmlFor="typeId" className="mb-1 block text-xs font-medium text-slate-700">
                Type
              </label>
              <Select id="typeId" name="typeId" defaultValue={params.typeId ?? ""}>
                <option value="">All</option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="classLevelId" className="mb-1 block text-xs font-medium text-slate-700">
                Class
              </label>
              <Select id="classLevelId" name="classLevelId" defaultValue={params.classLevelId ?? ""}>
                <option value="">All</option>
                {classes.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="academicYearId" className="mb-1 block text-xs font-medium text-slate-700">
                Academic year
              </label>
              <Select id="academicYearId" name="academicYearId" defaultValue={params.academicYearId ?? ""}>
                <option value="">All</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="status" className="mb-1 block text-xs font-medium text-slate-700">
                Status
              </label>
              <Select id="status" name="status" defaultValue={params.status ?? ""}>
                <option value="">All</option>
                {EXAMINATION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-6">
              <button type="submit" className={buttonClasses("primary", "md")}>
                Apply filters
              </button>
              <Link href="/examinations" className={buttonClasses("secondary", "md")}>
                Reset
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Examination records" description={`${total} examination${total === 1 ? "" : "s"} found`} />
        <CardBody className={items.length === 0 ? "" : "p-0"}>
          {items.length === 0 ? (
            <EmptyState
              title="No examinations found"
              description={total === 0 ? "Create your first examination." : "No examinations match the current filters."}
              action={
                <Link href="/examinations/new" className={buttonClasses("primary", "sm")}>
                  Create examination
                </Link>
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Examination</th>
                      <th className="px-4 py-2 font-medium">Class</th>
                      <th className="px-4 py-2 font-medium">Period</th>
                      <th className="px-4 py-2 font-medium">Year</th>
                      <th className="px-4 py-2 font-medium">Dates</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((exam) => (
                      <tr key={exam.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2">
                          <p className="font-medium text-slate-800">{exam.type.name}</p>
                          {exam.name ? <p className="text-xs text-slate-500">{exam.name}</p> : null}
                        </td>
                        <td className="px-4 py-2 text-slate-600">{exam.classLevel.name}</td>
                        <td className="px-4 py-2 text-slate-600">{exam.term ?? "—"}</td>
                        <td className="px-4 py-2 text-slate-600">{exam.academicYear.name}</td>
                        <td className="px-4 py-2 text-xs text-slate-500">
                          {formatDate(exam.startDate)} – {formatDate(exam.endDate)}
                        </td>
                        <td className="px-4 py-2">
                          <StatusBadge status={exam.status} />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap items-center gap-1">
                            <Link
                              href={`/examinations/${exam.id}`}
                              title="View examination details"
                              aria-label="View examination details"
                              className={buttonClasses("ghost", "icon")}
                            >
                              <EyeIcon />
                            </Link>
                            <Link
                              href={`/examinations/${exam.id}/edit`}
                              title="Edit"
                              aria-label="Edit"
                              className={buttonClasses("ghost", "icon")}
                            >
                              <EditIcon />
                            </Link>
                            <a
                              href={`/api/marks-entry/template?examinationId=${exam.id}`}
                              title="Download Excel template with marks"
                              aria-label="Download Excel template with marks"
                              className={buttonClasses("ghost", "icon")}
                            >
                              <FileSpreadsheetIcon />
                            </a>
                            <Link
                              href={`/examinations/${exam.id}/results?print=1`}
                              title="Download PDF results"
                              aria-label="Download PDF results"
                              className={buttonClasses("ghost", "icon")}
                            >
                              <FilePdfIcon />
                            </Link>
                            {exam.status !== "OPEN" ? (
                              <ActionButton
                                action={setExaminationStatusAction}
                                arg={{ id: exam.id, status: "OPEN" }}
                                variant="ghost"
                                size="icon"
                                label="Open"
                                successMessage="Examination opened."
                              >
                                <PowerIcon />
                              </ActionButton>
                            ) : (
                              <ActionButton
                                action={setExaminationStatusAction}
                                arg={{ id: exam.id, status: "CLOSED" }}
                                variant="ghost"
                                size="icon"
                                label="Close"
                                confirmMessage="Close this examination? It can be reopened later."
                                successMessage="Examination closed."
                              >
                                <PowerIcon />
                              </ActionButton>
                            )}
                            <ActionButton
                              action={deleteExaminationAction}
                              arg={{ id: exam.id }}
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:bg-red-50"
                              label="Delete"
                              confirmMessage={`Delete ${exam.type.name}${exam.name ? ` (${exam.name})` : ""} for ${exam.classLevel.name}? This cannot be undone.`}
                              successMessage="Examination deleted."
                            >
                              <TrashIcon />
                            </ActionButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pageCount > 1 ? (
                <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
                  <span className="text-slate-500">
                    Page {page} of {pageCount}
                  </span>
                  <div className="flex gap-2">
                    {page > 1 ? (
                      <Link href={buildHref({ page: String(page - 1) })} className={buttonClasses("secondary", "sm")}>
                        Previous
                      </Link>
                    ) : null}
                    {page < pageCount ? (
                      <Link href={buildHref({ page: String(page + 1) })} className={buttonClasses("secondary", "sm")}>
                        Next
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
