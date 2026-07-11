# User Flows

## Flow A: Plan a Ride
1. User opens app.
2. User sets start and end by search coordinates or map clicks.
3. User taps Route.
4. App returns connector-preferred path and distance.
5. User reviews connector usage percentage.

## Flow B: No Connector-Only Path
1. User picks disconnected points.
2. App computes fallback mixed path.
3. UI indicates non-connector segments were necessary.

## Flow C: No Path
1. User picks points outside graph bounds.
2. App returns no-route message with suggestion to choose nearby points.
