"use client";

import { forwardRef, useState } from "react";
import { EyeIcon, EyeOffIcon, LockIcon } from "./login-icons";

type PasswordInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ invalid, className, ...props }, ref) {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-mist" aria-hidden="true">
          <LockIcon className="h-5 w-5" />
        </span>
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          className={[
            "h-12 w-full rounded-xl border bg-white pl-11 pr-11 text-sm text-ink shadow-sm outline-none transition placeholder:text-mist/70 focus:ring-4",
            invalid
              ? "border-red-300 focus:border-red-500 focus:ring-red-500/15"
              : "border-blue-100 focus:border-accent focus:ring-accent/15",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex items-center rounded-r-xl pl-2 pr-3.5 text-mist outline-none transition hover:text-ink focus-visible:text-accent"
        >
          {visible ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
        </button>
      </div>
    );
  },
);
