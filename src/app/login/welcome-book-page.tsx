import { AcademicLogo, BooksIllustration, PageWave } from "./illustrations";

export function WelcomeBookPage() {
  return (
    <div className="flex h-full min-h-[30rem] flex-col items-center overflow-hidden px-7 py-10 text-center md:px-9 md:py-12 lg:px-12">
      <AcademicLogo className="h-24 w-24" />
      <h2 className="mt-5 text-3xl font-bold tracking-tight text-navy">Academic Report</h2>
      <p className="mt-2 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-brand">
        School Academic Reporting System
      </p>
      <p className="mt-5 max-w-xs text-sm leading-relaxed text-mist">
        Efficiently manage student results, generate academic reports, and support academic
        excellence.
      </p>
      <div className="mt-auto w-full pt-10">
        <BooksIllustration className="mx-auto h-auto w-full max-w-sm" />
      </div>
      <PageWave className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full" />
    </div>
  );
}
