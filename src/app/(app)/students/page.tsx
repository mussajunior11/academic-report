import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/layout/app-nav";
import { GENDERS, STUDENT_STATUSES } from "@/lib/constants";
import { listClassLevels, listStreams } from "@/lib/services/academic";
import { listSpecialNeedCategories, listStudents } from "@/lib/services/students";
import { StudentImport } from "./student-import";
import { StudentsTable, type StudentRow } from "./students-table";

export const metadata = { title: "Students" };

const PAGE_SIZE = 25;

type SearchParams = {
  q?: string;
  classLevelId?: string;
  streamId?: string;
  gender?: string;
  status?: string;
  sort?: string;
  dir?: string;
  page?: string;
};

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const [{ items, total, page, pageCount }, levels, streams, categories] = await Promise.all([
    listStudents({
      q: params.q,
      classLevelId: params.classLevelId,
      streamId: params.streamId,
      gender: params.gender,
      status: params.status,
      sort: params.sort,
      dir: params.dir === "asc" ? "asc" : "desc",
      page: Number(params.page) || 1,
      pageSize: PAGE_SIZE,
    }),
    listClassLevels(),
    listStreams(),
    listSpecialNeedCategories(),
  ]);

  const rows: StudentRow[] = items.map((student) => ({
    id: student.id,
    studentNumber: student.studentNumber,
    fullName: student.fullName,
    gender: student.gender,
    status: student.status,
    classLevelName: student.classLevel.name,
    streamName: student.stream.name,
    specialNeeds: student.specialNeeds.map((need) => ({
      categoryId: need.categoryId,
      label: need.category.label,
      note: need.note ?? "",
    })),
  }));

  const buildHref = (overrides: Partial<SearchParams>) => {
    const next = { ...params, ...overrides };
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value) search.set(key, String(value));
    }
    const qs = search.toString();
    return qs ? `/students?${qs}` : "/students";
  };

  const sortLinks: Record<string, string> = {};
  const sortMarks: Record<string, string> = {};
  for (const column of ["studentNumber", "fullName", "status"]) {
    const isActive = (params.sort ?? "createdAt") === column;
    const nextDir = isActive && params.dir !== "asc" ? "asc" : "desc";
    sortLinks[column] = buildHref({ sort: column, dir: nextDir, page: "" });
    sortMarks[column] = isActive ? (params.dir === "asc" ? " ↑" : " ↓") : "";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Register, search, filter and manage student records."
        actions={
          <Link href="/students/new" className={buttonClasses("primary", "md")}>
            Register student
          </Link>
        }
      />

      <Card>
        <CardHeader
          title="Bulk import students (Excel)"
          description="Download the template, fill in students, then choose the file and review the list before importing many students at once."
        />
        <CardBody>
          <StudentImport />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Search & filters" />
        <CardBody>
          <form method="get" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <label htmlFor="q" className="mb-1 block text-xs font-medium text-slate-700">
                Search
              </label>
              <Input id="q" name="q" defaultValue={params.q ?? ""} placeholder="Name, admission or student number" />
            </div>
            <div>
              <label htmlFor="classLevelId" className="mb-1 block text-xs font-medium text-slate-700">
                Class
              </label>
              <Select id="classLevelId" name="classLevelId" defaultValue={params.classLevelId ?? ""}>
                <option value="">All</option>
                {levels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="streamId" className="mb-1 block text-xs font-medium text-slate-700">
                Stream
              </label>
              <Select id="streamId" name="streamId" defaultValue={params.streamId ?? ""}>
                <option value="">All</option>
                {streams.map((stream) => (
                  <option key={stream.id} value={stream.id}>
                    {stream.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="gender" className="mb-1 block text-xs font-medium text-slate-700">
                Gender
              </label>
              <Select id="gender" name="gender" defaultValue={params.gender ?? ""}>
                <option value="">All</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g.charAt(0) + g.slice(1).toLowerCase()}
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
                {STUDENT_STATUSES.map((s) => (
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
              <Link href="/students" className={buttonClasses("secondary", "md")}>
                Reset
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Student records" description={`${total} student${total === 1 ? "" : "s"} found`} />
        <CardBody className={items.length === 0 ? "" : "p-0"}>
          {items.length === 0 ? (
            <EmptyState
              title="No students found"
              description={
                total === 0
                  ? "Register your first student to see records here."
                  : "No students match the current filters."
              }
              action={
                <Link href="/students/new" className={buttonClasses("primary", "sm")}>
                  Register student
                </Link>
              }
            />
          ) : (
            <>
              <StudentsTable
                items={rows}
                categories={categories.map((category) => ({
                  key: category.id,
                  label: category.label,
                  description: category.description,
                }))}
                sortLinks={sortLinks}
                sortMarks={sortMarks}
              />
              {pageCount > 1 ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm">
                  <p className="text-slate-600">
                    Page {page} of {pageCount}
                  </p>
                  <div className="flex items-center gap-2">
                    {page > 1 ? (
                      <Link href={buildHref({ page: String(page - 1) })} className={buttonClasses("secondary", "sm")}>
                        Previous
                      </Link>
                    ) : (
                      <span className={buttonClasses("secondary", "sm", "pointer-events-none opacity-50")}>
                        Previous
                      </span>
                    )}
                    {page < pageCount ? (
                      <Link href={buildHref({ page: String(page + 1) })} className={buttonClasses("secondary", "sm")}>
                        Next
                      </Link>
                    ) : (
                      <span className={buttonClasses("secondary", "sm", "pointer-events-none opacity-50")}>
                        Next
                      </span>
                    )}
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
