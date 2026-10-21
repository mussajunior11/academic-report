"use client";

import { useEffect } from "react";
import { buttonClasses } from "@/components/ui/button";

export function SubjectPerformancePrintControls({ autoPrint }: { autoPrint: boolean }) {
  useEffect(() => {
    if (autoPrint) window.print();
  }, [autoPrint]);

  return (
    <button type="button" onClick={() => window.print()} className={buttonClasses("primary", "md")}>
      Print / Save as PDF
    </button>
  );
}
