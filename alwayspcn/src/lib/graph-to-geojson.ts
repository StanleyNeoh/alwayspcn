import type { GraphData } from "./routing";

export type GeoJsonLineFeature = {
  type: "Feature";
  properties: { kind: string };
  geometry: { type: "LineString"; coordinates: [number, number][] };
};

export type GeoJsonCollection = {
  type: "FeatureCollection";
  features: GeoJsonLineFeature[];
};

// Kinds that belong to the park connector / active mobility network
const PCN_KINDS = new Set([
  "park_connector",
  "park_path",
  "rail_corridor",
  "cycling_path",
]);

/**
 * Extract PCN and cycling edges from the graph and return them as a
 * GeoJSON FeatureCollection. Each undirected edge appears once.
 */
export function graphToPcnGeoJson(graph: GraphData): GeoJsonCollection {
  const features: GeoJsonLineFeature[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < graph.adj.length; i++) {
    for (const [j, , kind] of graph.adj[i]) {
      if (!PCN_KINDS.has(kind)) continue;
      // Deduplicate bidirectional edges
      const lo = i < j ? i : j;
      const hi = i < j ? j : i;
      const key = `${lo}-${hi}`;
      if (seen.has(key)) continue;
      seen.add(key);

      features.push({
        type: "Feature",
        properties: { kind },
        geometry: {
          type: "LineString",
          coordinates: [graph.nodes[i], graph.nodes[j]],
        },
      });
    }
  }

  return { type: "FeatureCollection", features };
}

/**
 * Return ALL non-bridge edges from a graph as a GeoJSON FeatureCollection.
 * Used for the merged PCN+roads overlay so both kinds share one layer.
 */
export function graphToAllEdgesGeoJson(graph: GraphData): GeoJsonCollection {
  const features: GeoJsonLineFeature[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < graph.adj.length; i++) {
    for (const [j, , kind] of graph.adj[i]) {
      if (kind === "bridge") continue;
      const lo = i < j ? i : j;
      const hi = i < j ? j : i;
      const key = `${lo}-${hi}`;
      if (seen.has(key)) continue;
      seen.add(key);

      features.push({
        type: "Feature",
        properties: { kind },
        geometry: {
          type: "LineString",
          coordinates: [graph.nodes[i], graph.nodes[j]],
        },
      });
    }
  }

  return { type: "FeatureCollection", features };
}
