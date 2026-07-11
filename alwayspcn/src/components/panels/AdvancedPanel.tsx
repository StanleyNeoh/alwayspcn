"use client";

import { Layers, Loader2 } from "lucide-react";
import { type GraphData, type RouteWeights } from "@/lib/routing";
import { cn } from "@/lib/utils";
import { NetworkStats } from "./NetworkStats";
import { RouteWeightsEditor } from "./RouteWeightsEditor";

interface AdvancedPanelProps {
  // Routing mode
  useServerRouting: boolean;
  onServerRoutingToggle: () => void;

  // Overlays
  showPcnOverlay: boolean;
  onShowPcnOverlayChange: (v: boolean) => void;
  roadsLoading: boolean;

  // Network stats
  graph: GraphData | null;
  activeGraph: GraphData | null;
  graphBuilding: boolean;
  rawRoadNodeCount: number;

  // Clustering
  clusterEnabled: boolean;
  onClusterEnabledChange: (v: boolean) => void;
  clusterThreshold: number;
  onClusterThresholdChange: (v: number) => void;

  // Route weights
  routeWeights: RouteWeights;
  onRouteWeightsChange: (key: keyof RouteWeights, value: number) => void;
  onRouteWeightsReset: () => void;

  // Testing
  testHeading: number | null;
  onTestHeadingChange: (v: number | null) => void;
}

export function AdvancedPanel({
  useServerRouting,
  onServerRoutingToggle,
  showPcnOverlay,
  onShowPcnOverlayChange,
  roadsLoading,
  graph,
  activeGraph,
  graphBuilding,
  rawRoadNodeCount,
  clusterEnabled,
  onClusterEnabledChange,
  clusterThreshold,
  onClusterThresholdChange,
  routeWeights,
  onRouteWeightsChange,
  onRouteWeightsReset,
  testHeading,
  onTestHeadingChange,
}: AdvancedPanelProps) {
  return (
    <div className="space-y-4 p-4">

      {/* Routing Mode */}
      <div className="space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
          Routing Mode
        </p>
        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border/40 bg-muted/20 px-3 py-2 text-xs select-none">
          <span className="text-muted-foreground">Server routing</span>
          <input
            type="checkbox"
            checked={useServerRouting}
            onChange={onServerRoutingToggle}
            className="h-3.5 w-3.5 accent-primary"
          />
        </label>
        <p className="text-[10px] leading-relaxed text-muted-foreground/60">
          {useServerRouting
            ? "Route is computed on the server. Recommended for mobile or low-memory devices."
            : "Route is computed locally in the browser using the loaded graph."}
        </p>
      </div>

      <div className="h-px bg-border/40" />

      {/* Overlays */}
      <div className="space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
          Overlays
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onShowPcnOverlayChange(!showPcnOverlay)}
            disabled={!activeGraph}
            aria-pressed={showPcnOverlay}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-40",
              showPcnOverlay
                ? "bg-primary text-primary-foreground"
                : "border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Layers className="h-3 w-3" />Network
          </button>
          {roadsLoading && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />Roads…
            </span>
          )}
        </div>
      </div>

      <div className="h-px bg-border/40" />

      {/* Network stats */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
          Network
        </p>
        <NetworkStats
          graph={graph}
          activeGraph={activeGraph}
          graphBuilding={graphBuilding}
          rawRoadNodeCount={rawRoadNodeCount}
        />
      </div>

      <div className="h-px bg-border/40" />

      {/* Clustering */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
            Vertex Clustering
          </p>
          <button
            type="button"
            onClick={() => onClusterEnabledChange(!clusterEnabled)}
            aria-pressed={clusterEnabled}
            className={cn(
              "rounded-lg px-2 py-0.5 text-[10px] font-medium transition-colors",
              clusterEnabled
                ? "bg-primary text-primary-foreground"
                : "border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {clusterEnabled ? "On" : "Off"}
          </button>
        </div>

        {clusterEnabled && (
          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Threshold</span>
              <span className="font-medium tabular-nums">{clusterThreshold} m</span>
            </div>
            <input
              type="range"
              min={1}
              max={200}
              step={1}
              value={clusterThreshold}
              onChange={(e) => onClusterThresholdChange(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[9px] text-muted-foreground/50">
              <span>1 m</span>
              <span>200 m</span>
            </div>
            <p className="text-[10px] leading-relaxed text-muted-foreground/70">
              Vertices within {clusterThreshold} m of the same drifting centroid are merged. PCN
              edges take priority over road edges. Applied to both routing and display.
            </p>
          </div>
        )}
      </div>

      <div className="h-px bg-border/40" />

      {/* Route Weights */}
      <RouteWeightsEditor
        routeWeights={routeWeights}
        onChange={onRouteWeightsChange}
        onReset={onRouteWeightsReset}
      />

      <div className="h-px bg-border/40" />

      {/* Testing */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
            Testing
          </p>
          {testHeading !== null && (
            <button
              type="button"
              onClick={() => onTestHeadingChange(null)}
              className="rounded-lg px-2 py-0.5 text-[10px] font-medium border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Map orientation</span>
            <span className="font-medium tabular-nums">
              {testHeading !== null ? `${Math.round(testHeading)}°` : "off"}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={359}
            step={1}
            value={testHeading ?? 0}
            onChange={(e) => onTestHeadingChange(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[9px] text-muted-foreground/50">
            <span>N 0°</span>
            <span>E 90°</span>
            <span>S 180°</span>
            <span>W 270°</span>
          </div>
          <p className="text-[10px] leading-relaxed text-muted-foreground/60">
            Simulates device compass heading to test map rotation and drag without real GPS.
            Overrides navigation heading when set.
          </p>
        </div>
      </div>

    </div>
  );
}
