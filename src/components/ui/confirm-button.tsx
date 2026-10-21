"use client";

import { buttonClasses, type ButtonSize, type ButtonVariant } from "@/components/ui/button";

export function ConfirmSubmitButton({
  children,
  message,
  variant = "danger",
  size = "sm",
  className,
  name,
  value,
}: {
  children: React.ReactNode;
  message: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  name?: string;
  value?: string;
}) {
  return (
    <button
      type="submit"
      name={name}
      value={value}
      className={buttonClasses(variant, size, className)}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
