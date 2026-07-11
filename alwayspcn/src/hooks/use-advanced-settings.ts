import { useEffect, useState } from "react";
import { DEFAULT_ROUTE_WEIGHTS, type RouteWeights } from "@/lib/routing";

export function useAdvancedSettings() {
  const [clusterEnabled, setClusterEnabled] = useState(false);
  const [clusterThreshold, setClusterThreshold] = useState(10);
  const [routeWeights, setRouteWeights] = useState<RouteWeights>(DEFAULT_ROUTE_WEIGHTS);
  /** null = disabled; 0-359 = override heading used to test map rotation without real GPS. */
  const [testHeading, setTestHeading] = useState<number | null>(null);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("alwayspcn_adv");
      if (stored) {
        const parsed = JSON.parse(stored) as {
          clusterEnabled?: boolean;
          clusterThreshold?: number;
          weights?: RouteWeights;
        };
        if (typeof parsed.clusterEnabled === "boolean") setClusterEnabled(parsed.clusterEnabled);
        if (typeof parsed.clusterThreshold === "number") setClusterThreshold(parsed.clusterThreshold);
        if (parsed.weights) setRouteWeights({ ...DEFAULT_ROUTE_WEIGHTS, ...parsed.weights });
      }
    } catch {
      // ignore malformed storage
    }
  }, []);

  // Persist on change (testHeading is intentionally not persisted – it's transient)
  useEffect(() => {
    localStorage.setItem(
      "alwayspcn_adv",
      JSON.stringify({ clusterEnabled, clusterThreshold, weights: routeWeights }),
    );
  }, [clusterEnabled, clusterThreshold, routeWeights]);

  return {
    clusterEnabled,
    setClusterEnabled,
    clusterThreshold,
    setClusterThreshold,
    routeWeights,
    setRouteWeights,
    testHeading,
    setTestHeading,
  };
}
