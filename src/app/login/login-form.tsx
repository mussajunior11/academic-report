"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { loginSchema } from "@/lib/validation/schemas";
import { loginAction } from "./actions";
import { LoginButton } from "./login-button";
import { AlertIcon, UserIcon } from "./login-icons";
import { PasswordInput } from "./password-input";

const inputBase =
  "h-12 w-full rounded-xl border bg-white pl-11 pr-4 text-sm text-ink shadow-sm outline-none transition placeholder:text-mist/70 focus:ring-4";
const inputNormal = "border-blue-100 focus:border-accent focus:ring-accent/15";
const inputInvalid = "border-red-300 focus:border-red-500 focus:ring-red-500/15";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await loginAction(values);
    if (!result || !result.ok) {
      setError("root", { message: result?.message ?? "Unable to sign in. Please try again." });
      return;
    }
    router.replace(next);
    router.refresh();
  });

  const errorFor = (field: "email" | "password") =>
    typeof errors[field]?.message === "string" ? errors[field]?.message : undefined;

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-ink">
          Username
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-mist" aria-hidden="true">
            <UserIcon className="h-5 w-5" />
          </span>
          <input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="Username"
            aria-invalid={errorFor("email") ? true : undefined}
            aria-describedby={errorFor("email") ? "email-error" : undefined}
            className={[inputBase, errorFor("email") ? inputInvalid : inputNormal].join(" ")}
            {...register("email")}
          />
        </div>
        {errorFor("email") ? (
          <p id="email-error" role="alert" className="text-xs font-medium text-red-600">
            {errorFor("email")}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-ink">
          Password
        </label>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          placeholder="••••••••"
          invalid={Boolean(errorFor("password"))}
          aria-invalid={errorFor("password") ? true : undefined}
          aria-describedby={errorFor("password") ? "password-error" : undefined}
          {...register("password")}
        />
        {errorFor("password") ? (
          <p id="password-error" role="alert" className="text-xs font-medium text-red-600">
            {errorFor("password")}
          </p>
        ) : null}
      </div>

      <div aria-live="polite">
        {errors.root?.message ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
          >
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            {errors.root.message}
          </p>
        ) : null}
      </div>

      <LoginButton loading={isSubmitting} />
    </form>
  );
}
