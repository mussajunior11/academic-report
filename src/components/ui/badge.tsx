import { cn } from "@/lib/utils/cn";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  className?: string;
}) {
  const tones = {
    neutral: "bg-slate-100 text-slate-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
    info: "bg-royal-soft text-royal-dark",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, "success" | "neutral" | "warning" | "danger" | "info"> = {
    ACTIVE: "success",
    INACTIVE: "neutral",
    OPEN: "info",
    DRAFT: "warning",
    CLOSED: "neutral",
  };
  return <Badge tone={map[status] ?? "neutral"}>{status.charAt(0) + status.slice(1).toLowerCase()}</Badge>;
}
