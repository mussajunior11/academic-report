import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "icon";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-royal text-white hover:bg-royal-dark border border-transparent shadow-sm",
  secondary:
    "bg-white text-royal border border-slate-300 hover:bg-royal-soft",
  danger:
    "bg-red-600 text-white hover:bg-red-700 border border-transparent shadow-sm",
  ghost:
    "bg-transparent text-slate-700 border border-transparent hover:bg-slate-100",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  icon: "h-8 w-8 p-0",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-60",
    variants[variant],
    sizes[size],
    className,
  );
}
