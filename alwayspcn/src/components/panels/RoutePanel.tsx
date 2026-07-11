"use client";

import { Compass, Loader2, LocateFixed, MapPin, Navigation, Search } from "lucide-react";
import { LocationCombobox } from "@/components/ui/location-combobox";
import { type Coordinate, type GraphData, type RouteResult } from "@/lib/routing";
import { cn } from "@/lib/utils";
import { StatusBox } from "./StatusBox";
import { RouteLegend } from "./RouteLegend";

interface RoutePanelProps {
  // Location inputs
  startInput: string;
  endInput: string;
  onStartInputChange: (v: string) => void;
  onEndInputChange: (v: string) => void;
  onStartSelect: (coord: Coordinate, label: string) => void;
  onEndSelect: (coord: Coordinate, label: string) => void;
  isGeocoding: boolean;
  onApplyLocations: () => void;

  // Pick mode
  pickMode: "start" | "end" | null;
  onPickModeChange: (mode: "start" | "end" | null) => void;
  onMessage: (msg: string) => void;

  // Locate me
  isLocating: boolean;
  onLocateMe: () => void;

  // Navigation mode
  navMode: boolean;
  onNavModeToggle: () => void;

  // Status / route
  message: string;
  activeRoute: RouteResult | null;
  useServerRouting: boolean;
  serverRouting: boolean;

  // Legend visibility guard
  activeGraph: GraphData | null;
}

export function RoutePanel({
  startInput,
  endInput,
  onStartInputChange,
  onEndInputChange,
  onStartSelect,
  onEndSelect,
  isGeocoding,
  onApplyLocations,
  pickMode,
  onPickModeChange,
  onMessage,
  isLocating,
  onLocateMe,
  navMode,
  onNavModeToggle,
  message,
  activeRoute,
  useServerRouting,
  serverRouting,
  activeGraph,
}: RoutePanelProps) {
  return (
    <div className="space-y-3 p-4">
      {/* Location inputs */}
      <div className="space-y-2">
        <LocationCombobox
          id="start"
          label="Start"
          placeholder="Place name or lat,lng"
          value={startInput}
          onChange={onStartInputChange}
          onSelect={onStartSelect}
        />
        <LocationCombobox
          id="end"
          label="End"
          placeholder="Place name or lat,lng"
          value={endInput}
          onChange={onEndInputChange}
          onSelect={onEndSelect}
        />
      </div>

      {/* Action row: search + map pick mode + locate + nav */}
      <div className="flex items-center gap-2">
        <button
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          type="button"
          onClick={onApplyLocations}
          disabled={isGeocoding}
        >
          {isGeocoding ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
          {isGeocoding ? "Resolving…" : "Search"}
        </button>

        <div
          className="flex shrink-0 overflow-hidden rounded-xl border border-border/70 text-xs"
          role="group"
          aria-label="Map click mode"
        >
          {/* Locate current position → set as start */}
          <button
            type="button"
            title="Use current location as start"
            onClick={onLocateMe}
            disabled={isLocating}
            className={cn(
              "flex items-center gap-1 px-2.5 py-2 transition-colors",
              isLocating
                ? "bg-blue-500 text-white"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {isLocating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <LocateFixed className="h-3 w-3" />
            )}
          </button>
          <div className="w-px bg-border/60" />
          <button
            type="button"
            title={
              pickMode === "start"
                ? "Cancel — click to deactivate"
                : "Click to pick start on map"
            }
            onClick={() => {
              const next = pickMode === "start" ? null : "start";
              onPickModeChange(next);
              if (next === "start") onMessage("Click on the map to set the start point.");
            }}
            className={cn(
              "flex items-center gap-1 px-2.5 py-2 transition-colors",
              pickMode === "start"
                ? "bg-teal-500 text-white"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            <MapPin className="h-3 w-3" />S
          </button>
          <div className="w-px bg-border/60" />
          <button
            type="button"
            title={
              pickMode === "end"
                ? "Cancel — click to deactivate"
                : "Click to pick end on map"
            }
            onClick={() => {
              const next = pickMode === "end" ? null : "end";
              onPickModeChange(next);
              if (next === "end") onMessage("Click on the map to set the end point.");
            }}
            className={cn(
              "flex items-center gap-1 px-2.5 py-2 transition-colors",
              pickMode === "end"
                ? "bg-rose-500 text-white"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Navigation className="h-3 w-3" />E
          </button>
        </div>

        {/* Navigation mode toggle */}
        <button
          type="button"
          title={navMode ? "Exit navigation mode" : "Start navigation mode (heading-up, centres on you)"}
          onClick={onNavModeToggle}
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-xl border px-2.5 py-2 text-xs font-medium transition-colors",
            navMode
              ? "border-blue-500 bg-blue-500 text-white"
              : "border-border/70 text-muted-foreground hover:bg-muted",
          )}
        >
          <Compass className="h-3 w-3" />
          <span className="hidden sm:inline">{navMode ? "Nav" : "Nav"}</span>
        </button>
      </div>

      {/* Status + route stats */}
      <StatusBox
        message={message}
        activeRoute={activeRoute}
        useServerRouting={useServerRouting}
        serverRouting={serverRouting}
      />

      {/* Legend (shown only when graph is loaded) */}
      {activeGraph && <RouteLegend />}
    </div>
  );
}
