"use client";

import { useState } from "react";

const PCN_LINES = [
  { color: "#00b09b", label: "Park Connector Network" },
  { color: "#a855f7", label: "Future Network" },
  { color: "#4a90d9", label: "Cycling Path Network" },
] as const;

const ROAD_LINES = [
  { color: "#dc2626", label: "Major Roads", sub: "motorway · trunk · primary" },
  { color: "#ea580c", label: "Secondary Roads", sub: "secondary · tertiary" },
  { color: "#ca8a04", label: "Local Roads", sub: "residential · unclassified" },
  { color: "#94a3b8", label: "Bridge Connections", sub: "PCN–road link edges" },
] as const;

export function RouteLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <span>Legend</span>
        <span className="text-[9px] opacity-60">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-1 flex flex-col gap-y-1.5 rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5 text-[10px] text-muted-foreground">
          {PCN_LINES.map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span
                className="inline-block h-[3px] w-5 rounded-full"
                style={{ backgroundColor: color }}
              />
              {label}
            </span>
          ))}

          <div className="my-0.5 h-px bg-border/30" />

          {ROAD_LINES.map(({ color, label, sub }) => (
            <span key={label} className="flex items-center gap-1.5">
              <svg width="20" height="6" className="shrink-0">
                <line
                  x1="0"
                  y1="3"
                  x2="20"
                  y2="3"
                  stroke={color}
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                />
              </svg>
              <span className="flex flex-col gap-0">
                <span>{label}</span>
                <span className="text-[9px] text-muted-foreground/50">{sub}</span>
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
