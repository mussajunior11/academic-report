import Link from "next/link";
import { PageHeader } from "@/components/layout/app-nav";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { listAcademicYears } from "@/lib/services/school";
import { getTermSchedule } from "@/lib/services/terms";
import { ScheduleForm, type ScheduleGroup } from "../schedule-form";
import { YearSelect } from "../year-select";

export const metadata = { title: "Quarter" };
export const dynamic = "force-dynamic";

const isoDate = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : "");

export default async function QuartersPage({
  searchParams,
}: {
  searchParams: Promise<{ yearId?: string }>;
}) {
  const { yearId } = await searchParams;
  const [schedule, years] = await Promise.all([getTermSchedule(yearId), listAcademicYears()]);

  if (!schedule) {
    return (
      <div className="space-y-6">
        <PageHeader title="Quarter" description="Set the start and end dates for each quarter." />
        <Alert tone="warning">
          No academic year is available yet. Run <code>npm run db:seed</code> to create the school and its first
          academic year.
        </Alert>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  let index = 0;
  const groups: ScheduleGroup[] = schedule.terms.map((term) => ({
    heading: term.name,
    rows: term.quarters.map((quarter) => ({
      index: index++,
      id: quarter.id,
      name: quarter.name,
      startDate: isoDate(quarter.startDate),
      endDate: isoDate(quarter.endDate),
    })),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quarter"
        description="Four quarters per academic year — two in each term. Set the dates and the system tracks days passed and days remaining."
        actions={
          <>
            {years.length > 1 ? (
              <YearSelect
                baseHref="/terms/quarters"
                years={years.map((year) => ({ id: year.id, name: year.name }))}
                value={schedule.academicYear.id}
              />
            ) : null}
            <Link href="/terms" className={buttonClasses("secondary", "md")}>
              Back to terms
            </Link>
          </>
        }
      />

      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
          <span>
            Academic year:{" "}
            <span className="font-medium text-slate-800">{schedule.academicYear.name}</span>
          </span>
          <span className="text-xs text-slate-400">2 terms · 2 quarters per term</span>
        </CardBody>
      </Card>

      <ScheduleForm
        academicYearId={schedule.academicYear.id}
        fieldName="quarters"
        groups={groups}
        today={today}
        submitLabel="Save quarter dates"
      />
    </div>
  );
}
