"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { graphToAllEdgesGeoJson } from "@/lib/graph-to-geojson";
import { DEFAULT_ROUTE_WEIGHTS } from "@/lib/routing";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { useAdvancedSettings } from "@/hooks/use-advanced-settings";
import { useLocationInput } from "@/hooks/use-location-input";
import { useRouteEngine } from "@/hooks/use-route-engine";
import { DraggableCard } from "@/components/panels/DraggableCard";
import { RoutePanel } from "@/components/panels/RoutePanel";
import { AdvancedPanel } from "@/components/panels/AdvancedPanel";

const RouteMap = dynamic(
  () => import("@/components/map/route-map").then((mod) => mod.RouteMap),
  { ssr: false },
);

export default function Home() {
  const [message, setMessage] = useState("Load the network and set two points to route.");
  const [panelOpen, setPanelOpen] = useState(true);
  const [advOpen, setAdvOpen] = useState(false);
  const [showPcnOverlay, setShowPcnOverlay] = useState(false);

  const { isDark, toggleDark } = useTheme();

  const advSettings = useAdvancedSettings();

  const location = useLocationInput({ onMessage: setMessage });

  const engine = useRouteEngine({
    start: location.start,
    end: location.end,
    routeWeights: advSettings.routeWeights,
    clusterEnabled: advSettings.clusterEnabled,
    clusterThreshold: advSettings.clusterThreshold,
    onMessage: setMessage,
  });

  const displayPcnGeojson = useMemo(() => {
    if (!engine.activeGraph || !showPcnOverlay) return null;
    return graphToAllEdgesGeoJson(engine.activeGraph);
  }, [engine.activeGraph, showPcnOverlay]);

  // Server routing sends a full RouteResult (with coordinates) so activeGraph is not required.
  const activeRoute =
    (engine.useServerRouting || !!engine.activeGraph) && location.start && location.end
      ? engine.route
      : null;

  return (
    <div className="relative h-screen w-screen overflow-hidden">

      {/* Full-screen map */}
      <div
        className={cn(
          "absolute inset-0",
          location.pickMode ? "[&_.leaflet-container]:cursor-crosshair" : "",
        )}
      >
        <RouteMap
          segments={activeRoute?.found ? activeRoute.segments : []}
          start={location.start}
          end={location.end}
          onMapPick={location.onMapPick}
          pcnGeojson={displayPcnGeojson}
          isDark={isDark}
          toggleDark={toggleDark}
        />
      </div>

      {/* Route planner panel */}
      <DraggableCard
        title="Route planner"
        initialPos={{ x: 16, y: 16 }}
        open={panelOpen}
        onToggle={() => setPanelOpen((v) => !v)}
      >
        <RoutePanel
          startInput={location.startInput}
          endInput={location.endInput}
          onStartInputChange={location.setStartInput}
          onEndInputChange={location.setEndInput}
          onStartSelect={location.handleStartSelect}
          onEndSelect={location.handleEndSelect}
          isGeocoding={location.isGeocoding}
          onApplyLocations={location.applyLocations}
          pickMode={location.pickMode}
          onPickModeChange={location.setPickMode}
          onMessage={setMessage}
          message={message}
          activeRoute={activeRoute}
          useServerRouting={engine.useServerRouting}
          serverRouting={engine.serverRouting}
          activeGraph={engine.activeGraph}
        />
      </DraggableCard>

      {/* Advanced panel */}
      <DraggableCard
        title="Advanced"
        initialPos={{ x: 16, y: 490 }}
        open={advOpen}
        onToggle={() => setAdvOpen((v) => !v)}
      >
        <AdvancedPanel
          useServerRouting={engine.useServerRouting}
          onServerRoutingToggle={engine.handleServerRoutingToggle}
          showPcnOverlay={showPcnOverlay}
          onShowPcnOverlayChange={setShowPcnOverlay}
          roadsLoading={engine.roadsLoading}
          graph={engine.graph}
          activeGraph={engine.activeGraph}
          graphBuilding={engine.graphBuilding}
          rawRoadNodeCount={engine.rawRoadNodeCount}
          clusterEnabled={advSettings.clusterEnabled}
          onClusterEnabledChange={advSettings.setClusterEnabled}
          clusterThreshold={advSettings.clusterThreshold}
          onClusterThresholdChange={advSettings.setClusterThreshold}
          routeWeights={advSettings.routeWeights}
          onRouteWeightsChange={(key, value) =>
            advSettings.setRouteWeights((prev) => ({ ...prev, [key]: value }))
          }
          onRouteWeightsReset={() => advSettings.setRouteWeights(DEFAULT_ROUTE_WEIGHTS)}
        />
      </DraggableCard>

    </div>
  );
}
