# Data Model

## Source
- `data/doc.kml` layer: `Park Connector Network` plus optional fallback cycling paths.

## Graph JSON Shape
```json
{
  "nodes": [[103.8,1.3], [103.81,1.31]],
  "adj": [[[1, 120.2, "park_connector", "Alexandra Canal PC"]]],
  "meta": { "version": 1 }
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
