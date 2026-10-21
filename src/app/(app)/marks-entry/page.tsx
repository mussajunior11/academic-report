import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/layout/app-nav";
import { listMarksEntryExaminations } from "@/lib/services/marks";

export const metadata = { title: "Marks Entry" };
export const dynamic = "force-dynamic";

const STATUS_ORDER: Record<string, number> = { OPEN: 0, DRAFT: 1, CLOSED: 2 };

export default async function MarksEntryPage() {
  const examinations = await listMarksEntryExaminations();
  const ordered = [...examinations].sort(
    (a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marks Entry"
        description="Select an examination to enter subject scores for the students in its class."
        actions={
          <Link href="/examinations" className={buttonClasses("secondary", "md")}>
            Manage examinations
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
              description="Create an examination first, then return here to enter marks."
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
                        <p className="font-medium text-slate-800">{exam.type.name}</p>
                        {exam.name ? <p className="text-xs text-slate-500">{exam.name}</p> : null}
                      </td>
                      <td className="px-4 py-2 text-slate-600">{exam.classLevel.name}</td>
                      <td className="px-4 py-2 text-slate-600">{exam.term ?? "—"}</td>
                      <td className="px-4 py-2 text-slate-600">{exam.academicYear.name}</td>
                      <td className="px-4 py-2">
                        <StatusBadge status={exam.status} />
                      </td>
                      <td className="px-4 py-2 text-slate-600">{exam._count.marks}</td>
                      <td className="px-4 py-2">
                        <Link
                          href={`/marks-entry/${exam.id}`}
                          className={buttonClasses(exam.status === "CLOSED" ? "secondary" : "primary", "sm")}
                        >
                          {exam.status === "CLOSED" ? "View marks" : "Enter marks"}
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
