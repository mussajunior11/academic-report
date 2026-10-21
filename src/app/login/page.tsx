import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD } from "@/lib/constants";
import { AcademicBrandHeader } from "./brand-header";
import { BackgroundDecor } from "./illustrations";
import { LoginBookPage } from "./login-book-page";
import { OpenBook } from "./open-book";
import { WelcomeBookPage } from "./welcome-book-page";

export const metadata = { title: "Sign in" };

function safeNext(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  const { next } = await searchParams;
  const destination = safeNext(next);

  if (user) redirect(destination);

  const showDevHint = process.env.NODE_ENV !== "production";
  const demoEmail = process.env.SEED_ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL;
  const demoPassword = process.env.SEED_ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;

  return (
    <main className="login-stage flex flex-col items-center justify-center px-4 py-8 sm:px-6 lg:py-12">
      <BackgroundDecor />

      <AcademicBrandHeader />

      <div className="mt-6 flex w-full justify-center sm:mt-8">
        <OpenBook left={<WelcomeBookPage />} right={<LoginBookPage next={destination} />} />
      </div>

      {showDevHint ? (
        <div className="relative z-10 mt-6 w-full max-w-md rounded-2xl border border-dashed border-blue-200 bg-white/70 px-4 py-3 text-center text-xs text-mist backdrop-blur">
          <span className="font-semibold text-ink">Development administrator</span>
          <span className="mx-1.5">·</span>
          <span className="font-mono text-ink">{demoEmail}</span>
          <span className="mx-1">/</span>
          <span className="font-mono text-ink">{demoPassword}</span>
        </div>
      ) : null}

      <p className="relative z-10 mt-6 text-center text-xs text-mist">
        &copy; {new Date().getFullYear()} Academic Report
      </p>
    </main>
  );
}
