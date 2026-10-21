import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/layout/app-nav";
import { listReportExaminations } from "@/lib/services/reports";

export const metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

const STATUS_ORDER: Record<string, number> = { CLOSED: 0, OPEN: 1, DRAFT: 2 };

export default async function ReportsPage() {
  const examinations = await listReportExaminations();
  const ordered = [...examinations].sort(
    (a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Select an examination to generate individual student report forms."
        actions={
          <Link href="/marks-entry" className={buttonClasses("secondary", "md")}>
            Enter marks
          </Link>
        }
      />

      <Card>
        <CardHeader
          title="Examinations"
          description={`${ordered.length} examination${ordered.length === 1 ? "" : "s"} available`}
        />
        <CardBody className={ordered.length === 0 ? "" : "p-0"}>
          {ordered.length === 0 ? (
            <EmptyState
              title="No examinations yet"
              description="Create an examination and enter marks before generating reports."
              action={
                <Link href="/examinations/new" className={buttonClasses("primary", "sm")}>
                  Create examination
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">Examination</th>
                    <th className="px-4 py-2 font-medium">Class</th>
                    <th className="px-4 py-2 font-medium">Period</th>
                    <th className="px-4 py-2 font-medium">Year</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Marks</th>
                    <th className="px-4 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ordered.map((exam) => (
                    <tr key={exam.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2">
                        <p className="font-medium text-slate-800">{exam.typeName}</p>
                        {exam.name && exam.name !== exam.typeName ? (
                          <p className="text-xs text-slate-500">{exam.name}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-2 text-slate-600">{exam.classLevelName}</td>
                      <td className="px-4 py-2 text-slate-600">{exam.term ?? "—"}</td>
                      <td className="px-4 py-2 text-slate-600">{exam.academicYearName}</td>
                      <td className="px-4 py-2">
                        <StatusBadge status={exam.status} />
                      </td>
                      <td className="px-4 py-2 text-slate-600">
                        {exam.markCount}
                        {exam.studentCount ? (
                          <span className="text-xs text-slate-400"> / {exam.studentCount} students</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2">
                        <Link href={`/reports/${exam.id}`} className={buttonClasses("primary", "sm")}>
                          Open reports
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
