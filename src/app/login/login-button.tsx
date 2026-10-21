"use client";

import { Spinner } from "@/components/ui/submit-button";
import { LoginIcon } from "./login-icons";

export function LoginButton({ loading, disabled }: { loading: boolean; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      aria-busy={loading}
      className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-navy px-4 text-sm font-semibold text-white shadow-lg shadow-brand/25 outline-none transition hover:from-accent hover:to-brand focus-visible:ring-4 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading ? (
        <Spinner className="h-4 w-4" />
      ) : (
        <LoginIcon className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
      )}
      <span>{loading ? "Logging in..." : "Login"}</span>
    </button>
  );
}
