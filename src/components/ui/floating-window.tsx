"use client";

import { useRef, useState } from "react";
import { GripIcon } from "@/components/ui/icons";

function initialPosition(width: number) {
  return {
    x: Math.max(16, (window.innerWidth - width) / 2),
    y: Math.min(120, Math.max(24, window.innerHeight - 460)),
  };
}

/**
 * A movable floating dialog triggered from a button. The panel is centered when
 * it opens and can be dragged anywhere within the viewport by its header.
 */
export function FloatingWindow({
  open,
  onClose,
  title,
  headerExtra,
  children,
  width = 384,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  width?: number;
}) {
  if (!open) return null;
  // Re-mount the panel on every open so its position resets to centre.
  return (
    <FloatingPanel
      onClose={onClose}
      title={title}
      headerExtra={headerExtra}
      width={width}
    >
      {children}
    </FloatingPanel>
  );
}

function FloatingPanel({
  onClose,
  title,
  headerExtra,
  width,
  children,
}: {
  onClose: () => void;
  title: string;
  headerExtra?: React.ReactNode;
  width: number;
  children: React.ReactNode;
}) {
  const [position, setPosition] = useState(() => initialPosition(width));
  const drag = useRef<{ x: number; y: number } | null>(null);

  const onHandlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    drag.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onHandlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    drag.current = { x: event.clientX, y: event.clientY };
    setPosition((prev) => ({
      x: Math.min(Math.max(prev.x + dx, 8), Math.max(8, window.innerWidth - width - 16)),
      y: Math.min(Math.max(prev.y + dy, 8), Math.max(8, window.innerHeight - 200)),
    }));
  };

  const onHandlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/30" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ left: position.x, top: position.y, width }}
        className="fixed max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <div
            className="flex cursor-move select-none items-center gap-2"
            title="Drag to move"
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
          >
            <GripIcon className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {headerExtra}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}