import type { GraphData } from "@/lib/routing";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function validateGraphData(payload: unknown): {
  valid: true;
  data: GraphData;
} | {
  valid: false;
  error: string;
} {
  if (!payload || typeof payload !== "object") {
    return { valid: false, error: "Graph payload must be an object." };
  }

  const graph = payload as Partial<GraphData>;

  if (!graph.meta || typeof graph.meta !== "object") {
    return { valid: false, error: "Graph payload must include meta object." };
  }

  const meta = graph.meta as GraphData["meta"];
  if (
    typeof meta.source !== "string" ||
    typeof meta.generatedAt !== "string" ||
    !isFiniteNumber(meta.nodes) ||
    !isFiniteNumber(meta.segments)
  ) {
    return { valid: false, error: "Graph meta fields are invalid." };
  }

  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.adj)) {
    return { valid: false, error: "Graph payload must include nodes and adj arrays." };
  }

  if (graph.nodes.length !== graph.adj.length) {
    return { valid: false, error: "nodes and adj lengths do not match." };
  }

  if (Math.floor(meta.nodes) !== graph.nodes.length) {
    return { valid: false, error: "meta.nodes does not match nodes length." };
  }

  for (let i = 0; i < graph.nodes.length; i += 1) {
    const node = graph.nodes[i];
    if (!Array.isArray(node) || node.length !== 2) {
      return { valid: false, error: `Invalid node shape at index ${i}.` };
    }
    if (!isFiniteNumber(node[0]) || !isFiniteNumber(node[1])) {
      return { valid: false, error: `Invalid node coordinates at index ${i}.` };
    }
  }

  for (let from = 0; from < graph.adj.length; from += 1) {
    const edges = graph.adj[from];
    if (!Array.isArray(edges)) {
      return { valid: false, error: `Invalid adjacency list at index ${from}.` };
    }
    for (let e = 0; e < edges.length; e += 1) {
      const edge = edges[e];
      if (!Array.isArray(edge) || edge.length < 4) {
        return { valid: false, error: `Invalid edge shape at ${from}:${e}.` };
      }
      const [to, distance, kind, name] = edge;
      if (!Number.isInteger(to) || to < 0 || to >= graph.nodes.length) {
        return { valid: false, error: `Invalid edge target at ${from}:${e}.` };
      }
      if (!isFiniteNumber(distance) || distance < 0) {
        return { valid: false, error: `Invalid edge distance at ${from}:${e}.` };
      }
      if (typeof kind !== "string" || typeof name !== "string") {
        return { valid: false, error: `Invalid edge metadata at ${from}:${e}.` };
      }
    }
  }

  return { valid: true, data: graph as GraphData };
}
