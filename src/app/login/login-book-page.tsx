import { LoginForm } from "./login-form";
import { LoginHelp } from "./login-help";

export function LoginBookPage({ next }: { next: string }) {
  return (
    <div className="flex h-full min-h-[30rem] flex-col justify-center px-7 py-10 sm:px-9 md:py-12 lg:px-12">
      <div className="mx-auto w-full max-w-sm">
        <h2 className="text-2xl font-bold tracking-tight text-navy">Welcome back</h2>
        <p className="mt-1 text-sm text-mist">Sign in to your Academic Report account.</p>

        <LoginForm next={next} />

        <div className="mt-6 flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-blue-100" />
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-mist">or</span>
          <span className="h-px flex-1 bg-blue-100" />
        </div>

        <LoginHelp />
      </div>
    </div>
  );
}
