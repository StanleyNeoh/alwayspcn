"use client";

import { ChevronDown, ChevronUp, GripHorizontal } from "lucide-react";
import { useDraggable } from "@/hooks/use-draggable";
import { cn } from "@/lib/utils";

interface DraggableCardProps {
  title: string;
  initialPos?: { x: number; y: number };
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  /** When true, disables dragging and renders as a block element inside its container. */
  locked?: boolean;
}

export function DraggableCard({
  title,
  initialPos = { x: 16, y: 16 },
  open,
  onToggle,
  children,
  locked = false,
}: DraggableCardProps) {
  const { pos, dragHandleProps } = useDraggable(locked ? { x: 0, y: 0 } : initialPos);

  const inner = (
    <div className="rounded-2xl border border-zinc-200/70 bg-white/95 shadow-xl backdrop-blur-xl dark:border-zinc-700/70 dark:bg-zinc-950/95">
      {/* Title bar (draggable when not locked) */}
      <div
        {...(locked ? {} : dragHandleProps)}
        className={cn(
          "flex items-center justify-between gap-2 border-b border-border/40 bg-muted/20 px-4 py-2",
          locked ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
          open ? "rounded-t-2xl" : "rounded-2xl border-b-0",
        )}
        onClick={locked ? onToggle : undefined}
      >
        <div className="flex items-center gap-1.5">
          {!locked && <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground/50" />}
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
            {title}
          </span>
        </div>
        <button
          type="button"
          aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Scrollable content area */}
      {open && (
        <div className={locked ? "max-h-[calc(100svh-148px)] overflow-y-auto overflow-x-hidden" : "max-h-[calc(100svh-120px)] overflow-y-auto"}>
          {children}
        </div>
      )}
    </div>
  );

  if (locked) {
    return <div className="w-full select-none">{inner}</div>;
  }

  return (
    <div
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
      className="absolute left-0 top-0 z-[1000] w-[min(310px,calc(100vw-32px))] select-none"
    >
      {inner}
    </div>
  );
}
