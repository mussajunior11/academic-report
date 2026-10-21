import { cn } from "@/lib/utils/cn";

export function Alert({
  tone = "info",
  children,
  className,
}: {
  tone?: "success" | "error" | "info" | "warning";
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-red-200 bg-red-50 text-red-800",
    info: "border-royal/20 bg-royal-soft text-royal-dark",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
  } as const;
  return (
    <div
      role="status"
      className={cn("rounded-xl border px-3 py-2 text-sm", tones[tone], className)}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-10 text-center">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description ? <p className="max-w-md text-xs text-slate-500">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
