"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Spinner } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import type { ActionState } from "@/lib/validation/helpers";

type ActionFn<T> = (arg: T) => Promise<ActionState>;

export function ActionButton<T>({
  action,
  arg,
  children,
  confirmMessage,
  variant = "secondary",
  size = "sm",
  className,
  successMessage,
  label,
}: {
  action: ActionFn<T>;
  arg: T;
  children: React.ReactNode;
  confirmMessage?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  successMessage?: string;
  label?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  const onClick = () => {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setBusy(true);
    startTransition(async () => {
      try {
        const result = await action(arg);
        if (result && !result.ok) {
          toast.show(result.message ?? "Operation failed.", "error");
        } else {
          toast.show(successMessage ?? result?.message ?? "Saved.", "success");
          router.refresh();
        }
      } catch {
        toast.show("Something went wrong. Please try again.", "error");
      } finally {
        setBusy(false);
      }
    });
  };

  const disabled = pending || busy;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={buttonClasses(variant, size, className)}
    >
      {disabled && size !== "icon" ? <Spinner className="h-3.5 w-3.5" /> : null}
      {disabled && size === "icon" ? <Spinner className="h-3.5 w-3.5" /> : children}
    </button>
  );
}
