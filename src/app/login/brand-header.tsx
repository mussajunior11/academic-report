import { AcademicLogo } from "./illustrations";

export function AcademicBrandHeader() {
  return (
    <header className="relative z-10 flex w-full max-w-5xl flex-col items-center gap-3 px-1 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
      <div className="flex items-center gap-3">
        <AcademicLogo className="h-11 w-11 shrink-0" />
        <div className="leading-tight">
          <p className="text-lg font-bold tracking-tight text-navy">Academic Report</p>
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-mist">
            Inspiring Every Step of Learning
          </p>
        </div>
      </div>
      <p className="relative hidden text-sm font-medium italic text-navy sm:block">
        Better Data for Clear Progress
        <span
          className="absolute -bottom-1.5 left-0 h-0.5 w-full rounded-full bg-gradient-to-r from-accent to-transparent"
          aria-hidden="true"
        />
      </p>
    </header>
  );
}
