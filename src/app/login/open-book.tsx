import type { ReactNode } from "react";

export function OpenBook({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="book-perspective relative z-10 w-full max-w-5xl">
      <div className="book-frame book-enter">
        <div className="book">
          <section className="page page-left">{left}</section>
          <section className="page page-right">{right}</section>
          <span className="spine" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
