"use client";

import { useState } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

export function CollapsibleCard({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span>
          <span className="block text-sm font-semibold text-slate-800">{title}</span>
          {description ? <span className="mt-0.5 block text-xs text-slate-500">{description}</span> : null}
        </span>
        <svg
          viewBox="0 0 24 24"
          className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-90")}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
      {open ? (
        <CardBody className="border-t border-slate-200">{children}</CardBody>
      ) : null}
    </Card>
  );
}
