import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { PeriodProgress } from "@/components/ui/period-progress";
import { buttonClasses } from "@/components/ui/button";
import { getDashboardData } from "@/lib/services/dashboard";
import { getTermSchedule } from "@/lib/services/terms";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function StatIcon({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

function StatCard({
  label,
  value,
  href,
  icon,
}: {
  label: string;
  value: number;
  href: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-royal/30 hover:shadow-md"
    >
      <span
        className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-royal-soft/70 transition group-hover:bg-royal-soft"
        aria-hidden="true"
      />
      <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-royal-soft text-royal">
        <StatIcon path={icon} />
      </span>
      <p className="relative mt-3 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="relative mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
    </Link>
  );
}

export default async function DashboardPage() {
  const [data, schedule] = await Promise.all([
    getDashboardData(),
    getTermSchedule(undefined, { ensureDefaults: false }),
  ]);
  const { counts } = data;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-royal to-royal-dark p-6 text-white shadow-sm sm:p-8">
        <span
          className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-white/5"
          aria-hidden="true"
        />
        <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
          Academic Report
        </p>
        <h1 className="relative mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Dashboard</h1>
        <p className="relative mt-1.5 max-w-xl text-sm text-white/80">
          Inspiring every step of learning — a snapshot of your school&apos;s academic records.
        </p>
      </div>

      {!data.configured ? (
        <EmptyState
          title="No school configured yet"
          description="The database is empty. Run `npm run setup` (or `npm run db:seed`) to create the school, classes, streams, subjects and examination types, then reload this page."
        />
      ) : null}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Total students"
          value={counts.students}
          href="/students"
          icon="M16 20v-2a4 4 0 0 0-8 0v2M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
        />
        <StatCard
          label="Active students"
          value={counts.activeStudents}
          href="/students?status=ACTIVE"
          icon="M9 12l2 2 4-4M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"
        />
        <StatCard
          label="Classes"
          value={counts.classes}
          href="/classes"
          icon="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"
        />
        <StatCard
          label="Streams"
          value={counts.streams}
          href="/classes"
          icon="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5"
        />
        <StatCard
          label="Subjects"
          value={counts.subjects}
          href="/subjects"
          icon="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"
        />
        <StatCard
          label="Examinations"
          value={counts.examinations}
          href="/examinations"
          icon="M9 5h6M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1zM6 5h12v16H6zM9 11h6M9 15h4"
        />
      </div>

      <Card>
        <CardHeader
          title="Term & quarter progress"
          description={
            schedule
              ? `Days passed and remaining for ${schedule.academicYear.name}`
              : "Days passed and remaining for the current academic year"
          }
          actions={
            <Link href="/terms" className={buttonClasses("ghost", "sm")}>
              Manage terms
            </Link>
          }
        />
        <CardBody className="space-y-5">
          {!schedule || schedule.terms.length === 0 ? (
            <EmptyState
              title="No term schedule yet"
              description="Set the start and end dates for the two terms and their quarters to track days passed and remaining."
              action={
                <Link href="/terms" className={buttonClasses("primary", "sm")}>
                  Set up terms
                </Link>
              }
            />
          ) : (
            schedule.terms.map((term) => (
              <div key={term.id} className="space-y-3">
                <PeriodProgress title={term.name} startDate={term.startDate} endDate={term.endDate} />
                {term.quarters.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {term.quarters.map((quarter) => (
                      <div key={quarter.id} className="rounded-xl border border-slate-200 p-3">
                        <PeriodProgress title={quarter.name} startDate={quarter.startDate} endDate={quarter.endDate} compact />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Quick actions"
          description="Common academic administration tasks"
        />
        <CardBody className="flex flex-wrap gap-2">
          <Link href="/students/new" className={buttonClasses("primary", "md")}>
            Register a student
          </Link>
          <Link href="/classes" className={buttonClasses("secondary", "md")}>
            Manage classes
          </Link>
          <Link href="/subjects" className={buttonClasses("secondary", "md")}>
            Manage subjects
          </Link>
          <Link href="/examinations/new" className={buttonClasses("secondary", "md")}>
            Create an examination
          </Link>
        </CardBody>
      </Card>

      {data.configured ? (
        <p className="flex items-center justify-center gap-2 text-center text-xs text-slate-400">
          <Badge tone="info">Phase 1</Badge>
          Marks entry, grading and report cards arrive in later phases.
        </p>
      ) : null}
    </div>
  );
}
