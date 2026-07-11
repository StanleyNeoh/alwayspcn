# Data Model

## Sources
- `data/doc.kml` — KML layers: `Park Connector Network`, `Cycling Path Network`.
- Overpass API (`overpass-api.de`) — Singapore road network (motorway → unclassified).

## Graph JSON Shape (`public/data/network.json`)
```json
{
  "meta": { "source": "data/doc.kml", "generatedAt": "...", "nodes": 39407, "segments": 39606 },
  "nodes": [[103.8, 1.3], [103.81, 1.31]],
  "adj": [[[1, 120.2, "park_connector", "Alexandra Canal PC"]]]
}
```

## Roads GeoJSON Shape (`public/data/roads.json`)
```json
{
  "type": "FeatureCollection",
  "generatedAt": "...",
  "source": "OpenStreetMap contributors via Overpass API",
  "features": [
    {
      "type": "Feature",
      "properties": { "highway": "residential", "name": "Adam Road" },
      "geometry": { "type": "LineString", "coordinates": [[103.8, 1.3], [103.81, 1.31]] }
    }
  ]
}
```

## Edge Kind
- `park_connector`
- `park_path`
- `cycling_path`
- `rail_corridor`
- `other`

## Derived Metrics
- Route distance meters
- Connector segment share percentage
