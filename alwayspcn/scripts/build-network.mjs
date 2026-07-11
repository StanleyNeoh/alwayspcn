import { XMLParser } from "fast-xml-parser";
import fs from "node:fs";
import path from "node:path";

const srcKml = path.resolve(process.cwd(), "..", "data", "doc.kml");
const outDir = path.resolve(process.cwd(), "public", "data");
const outFile = path.resolve(outDir, "network.json");

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: false,
});

const FACTOR = {
  park_connector: 0.72,
  park_path: 0.82,
  rail_corridor: 0.9,
  cycling_path: 1,
  other: 1.08,
};

function toArray(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function haversineMeters(a, b) {
  const toRad = Math.PI / 180;
  const lat1 = a[1] * toRad;
  const lat2 = b[1] * toRad;
  const dLat = (b[1] - a[1]) * toRad;
  const dLng = (b[0] - a[0]) * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371000 * (2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

function quantize(point) {
  const lng = Number(point[0].toFixed(5));
  const lat = Number(point[1].toFixed(5));
  return `${lng},${lat}`;
}

function parseCoordinates(raw) {
  if (!raw || typeof raw !== "string") {
    return [];
  }
  return raw
    .trim()
    .split(/\s+/)
    .map((line) => {
      const [lngStr, latStr] = line.split(",");
      const lng = Number.parseFloat(lngStr);
      const lat = Number.parseFloat(latStr);
      if (Number.isNaN(lng) || Number.isNaN(lat)) {
        return null;
      }
      return [lng, lat];
    })
    .filter(Boolean);
}

function classifySegment(layerName, placemarkName, styleUrl) {
  const layer = (layerName || "").toLowerCase();
  const name = (placemarkName || "").toLowerCase();
  const style = (styleUrl || "").toLowerCase();

  if (layer.includes("cycling")) {
    return "cycling_path";
  }
  if (
    style.includes("0288d1") ||
    name.includes(" pc") ||
    name.includes("park connector") ||
    style.includes("3949ab") ||
    style.includes("01579b")
  ) {
    return "park_connector";
  }
  if (style.includes("7cb342") || name.includes("park path")) {
    return "park_path";
  }
  if (style.includes("f9a825") || name.includes("rail corridor")) {
    return "rail_corridor";
  }
  if (style.includes("a52714") || name.includes("cycling path")) {
    return "cycling_path";
  }
  return "other";
}

const xml = fs.readFileSync(srcKml, "utf8");
const doc = parser.parse(xml);
const folders = toArray(doc?.kml?.Document?.Folder);

const layerWhitelist = new Set(["Park Connector Network", "Cycling Path Network"]);

const nodes = [];
const nodeIndexByKey = new Map();
const edgeMaps = [];
let segmentCount = 0;

function getNodeIndex(point) {
  const key = quantize(point);
  const existing = nodeIndexByKey.get(key);
  if (existing !== undefined) {
    return existing;
  }
  const [lng, lat] = key.split(",").map(Number);
  const index = nodes.length;
  nodes.push([lng, lat]);
  nodeIndexByKey.set(key, index);
  edgeMaps.push(new Map());
  return index;
}

function addEdge(from, to, distance, kind, name) {
  const existing = edgeMaps[from].get(to);
  const weighted = distance * FACTOR[kind];
  if (!existing || weighted < existing.weighted) {
    edgeMaps[from].set(to, { distance, kind, name, weighted });
  }
}

for (const folder of folders) {
  const layerName = folder?.name || "";
  if (!layerWhitelist.has(layerName)) {
    continue;
  }
  const placemarks = toArray(folder?.Placemark);
  for (const placemark of placemarks) {
    const rawCoords = placemark?.LineString?.coordinates;
    const points = parseCoordinates(rawCoords);
    if (points.length < 2) {
      continue;
    }
    const segmentName = placemark?.name || "Unnamed";
    const kind = classifySegment(layerName, segmentName, placemark?.styleUrl);

    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1];
      const b = points[i];
      const from = getNodeIndex(a);
      const to = getNodeIndex(b);
      const distance = haversineMeters(a, b);
      addEdge(from, to, distance, kind, segmentName);
      addEdge(to, from, distance, kind, segmentName);
      segmentCount += 1;
    }
  }
}

const adj = edgeMaps.map((map) =>
  Array.from(map.entries()).map(([to, edge]) => [
    to,
    Number(edge.distance.toFixed(2)),
    edge.kind,
    edge.name,
  ])
);

fs.mkdirSync(outDir, { recursive: true });
const payload = {
  meta: {
    source: "data/doc.kml",
    generatedAt: new Date().toISOString(),
    nodes: nodes.length,
    segments: segmentCount,
  },
  nodes,
  adj,
};
fs.writeFileSync(outFile, JSON.stringify(payload));

console.log(`Wrote ${outFile}`);
console.log(`Nodes: ${nodes.length}`);
console.log(`Segments: ${segmentCount}`);
