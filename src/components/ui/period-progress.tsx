import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { computeDayCounts, progressPercent, type PeriodState } from "@/lib/utils/term-days";

const STATE_TONE: Record<PeriodState, "neutral" | "success" | "warning" | "danger" | "info"> = {
  UNSCHEDULED: "neutral",
  UPCOMING: "info",
  ONGOING: "success",
  COMPLETED: "neutral",
};

const STATE_LABEL: Record<PeriodState, string> = {
  UNSCHEDULED: "Not scheduled",
  UPCOMING: "Upcoming",
  ONGOING: "In progress",
  COMPLETED: "Completed",
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function PeriodProgress({
  title,
  startDate,
  endDate,
  today,
  compact,
}: {
  title?: string;
  startDate: Date | string | null;
  endDate: Date | string | null;
  today?: Date | string;
  compact?: boolean;
}) {
  const counts = computeDayCounts(startDate, endDate, today);
  const percent = progressPercent(counts);
  const scheduled = counts.state !== "UNSCHEDULED";

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          {title ? <p className="text-sm font-medium text-slate-800">{title}</p> : null}
          <p className="text-xs text-slate-500">
            {formatDate(startDate)} – {formatDate(endDate)}
          </p>
        </div>
        <Badge tone={STATE_TONE[counts.state]}>{STATE_LABEL[counts.state]}</Badge>
      </div>

      {scheduled ? (
        <>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn("h-full rounded-full", counts.state === "COMPLETED" ? "bg-slate-400" : "bg-royal")}
              style={{ width: `${percent}%` }}
            />
          </div>
          <div
            className={cn(
              "flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500",
              compact && "text-[11px]",
            )}
          >
            <span>
              <span className="font-medium text-slate-700">{counts.daysPassed}</span> day
              {counts.daysPassed === 1 ? "" : "s"} passed
            </span>
            <span>
              <span className="font-medium text-slate-700">{counts.daysRemaining}</span> day
              {counts.daysRemaining === 1 ? "" : "s"} remaining
            </span>
            <span>
              of <span className="font-medium text-slate-700">{counts.totalDays}</span> day
              {counts.totalDays === 1 ? "" : "s"}
            </span>
          </div>
        </>
      ) : (
        <p className="text-xs text-slate-400">Set a start and end date to track days passed and remaining.</p>
      )}
    </div>
  );
}
