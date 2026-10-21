"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Spinner } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";
import {
  DEFAULT_SIDEBAR_THEME,
  hexToRgba,
  isDarkColor,
  normalizeHex,
  type SidebarThemeValues,
} from "@/lib/utils/color";
import type { ActionState } from "@/lib/validation/helpers";

const SWATCHES: { label: string; color: string }[] = [
  { label: "White", color: "#ffffff" },
  { label: "Cream", color: "#f8f3f0" },
  { label: "Cloud", color: "#f1f5f9" },
  { label: "Sky", color: "#e0f2fe" },
  { label: "Mint", color: "#d1fae5" },
  { label: "Sand", color: "#fef3c7" },
  { label: "Blush", color: "#ffe4e6" },
  { label: "Lilac", color: "#ede9fe" },
  { label: "Ocean", color: "#0ea5e9" },
  { label: "Royal", color: "#014baa" },
  { label: "Navy", color: "#1e3a8a" },
  { label: "Charcoal", color: "#1e293b" },
  { label: "Black", color: "#000000" },
];

const PREVIEW_ITEMS = ["Dashboard", "Students", "Marks Entry", "Settings"];

function clamp(value: number): number {
  if (Number.isNaN(value)) return DEFAULT_SIDEBAR_THEME.opacity;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function SidebarThemePicker({
  action,
  defaultValues,
}: {
  action: (input: unknown) => Promise<ActionState>;
  defaultValues: SidebarThemeValues;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [color, setColor] = useState(normalizeHex(defaultValues.color) ?? DEFAULT_SIDEBAR_THEME.color);
  const [opacity, setOpacity] = useState(clamp(defaultValues.opacity));
  const [hexDraft, setHexDraft] = useState(() => normalizeHex(defaultValues.color) ?? DEFAULT_SIDEBAR_THEME.color);

  const dark = isDarkColor(color);
  const background = hexToRgba(color, opacity);

  const chooseColor = (value: string) => {
    setColor(value);
    setHexDraft(value);
  };

  const applyHex = (value: string) => {
    setHexDraft(value);
    const normalized = normalizeHex(value);
    if (normalized) setColor(normalized);
  };

  const save = () => {
    startTransition(async () => {
      const result = await action({ sidebarColor: color, sidebarOpacity: opacity });
      if (result?.ok) {
        toast.show(result.message ?? "Sidebar appearance saved.", "success");
        router.refresh();
      } else {
        toast.show(result?.message ?? "Could not save the sidebar appearance.", "error");
      }
    });
  };

  const reset = () => {
    chooseColor(DEFAULT_SIDEBAR_THEME.color);
    setOpacity(DEFAULT_SIDEBAR_THEME.opacity);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-5">
        <div>
          <span className="block text-xs font-medium uppercase tracking-wide text-slate-500">Background colour</span>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Sidebar background colour">
            {SWATCHES.map((swatch) => {
              const selected = swatch.color.toLowerCase() === color;
              return (
                <button
                  key={swatch.color}
                  type="button"
                  onClick={() => chooseColor(swatch.color)}
                  title={swatch.label}
                  aria-label={swatch.label}
                  aria-pressed={selected}
                  style={{ backgroundColor: swatch.color }}
                  className={cn(
                    "h-8 w-8 rounded-full border transition",
                    selected
                      ? "border-royal ring-2 ring-royal ring-offset-2"
                      : "border-slate-300 hover:scale-105",
                  )}
                />
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="color"
                value={color}
                onChange={(event) => chooseColor(event.target.value)}
                aria-label="Pick a custom sidebar colour"
                className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
              />
              Custom
            </label>
            <input
              type="text"
              value={hexDraft}
              onChange={(event) => applyHex(event.target.value)}
              onBlur={() => setHexDraft(color)}
              spellCheck={false}
              aria-label="Sidebar colour hex value"
              className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 font-mono text-sm text-slate-700 focus:border-royal focus:outline-none focus:ring-1 focus:ring-royal"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="sidebar-opacity" className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Transparency
            </label>
            <span className="text-sm font-semibold tabular-nums text-slate-700">{opacity}%</span>
          </div>
          <input
            id="sidebar-opacity"
            type="range"
            min={0}
            max={100}
            step={5}
            value={opacity}
            onChange={(event) => setOpacity(clamp(Number(event.target.value)))}
              className="mt-2 w-full accent-royal"
          />
          <p className="mt-1 text-xs text-slate-500">
            0% is fully transparent (only the blur shows); 100% is a solid background.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={save} disabled={pending} className={buttonClasses("primary", "sm")}>
            {pending ? <Spinner className="h-4 w-4" /> : null}
            Save appearance
          </button>
          <button type="button" onClick={reset} disabled={pending} className={buttonClasses("secondary", "sm")}>
            Reset to default
          </button>
        </div>
      </div>

      <div>
        <span className="block text-xs font-medium uppercase tracking-wide text-slate-500">Live preview</span>
        <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300 p-4">
          <div
            className="w-56 rounded-lg border border-white/20 p-3 shadow-lg"
            style={{ backgroundColor: background, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-royal text-xs font-bold text-white">
                AR
              </span>
              <span className={cn("text-sm font-semibold", dark ? "text-white" : "text-slate-900")}>
                Academic Report
              </span>
            </div>
            <div className="space-y-1">
              {PREVIEW_ITEMS.map((item, index) => (
                <div
                  key={item}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm",
                    index === 0
                      ? dark
                        ? "bg-white/15 font-medium text-white"
                        : "bg-royal-soft font-medium text-royal"
                      : dark
                        ? "text-white/75"
                        : "text-slate-600",
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" aria-hidden="true" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
