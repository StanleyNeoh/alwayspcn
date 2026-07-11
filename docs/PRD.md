# PRD: AlwaysPCN

## Problem
Generic route planners optimize for shortest travel time and often ignore park connector preference.

## Users
- Cyclists who prefer safer scenic paths.
- Runners and walkers planning connector-first routes.

## Goals
- Accept start and end points on map.
- Route through park connectors whenever feasible.
- Fall back to mixed network when connector-only path is impossible.

## Non-Goals
- Turn-by-turn voice navigation.
- Real-time traffic and closures integration in v1.

## Functional Requirements
- FR-1: Load KML-derived network graph.
- FR-2: Snap arbitrary start/end points to nearest routable nodes.
- FR-3: Compute weighted shortest path favoring Park Connector segments.
- FR-4: Render route polyline and distance summary.
- FR-5: Surface message when fallback non-connector segments are used.

## Acceptance Criteria
- AC-1: User can place start/end and receive route under 2 seconds on typical desktop.
- AC-2: With multiple alternatives of similar length, route uses higher proportion of connector segments.
- AC-3: If no path exists, app displays a clear failure message.

## Risks
- Large KML size and parsing cost.
- Segment discontinuities causing disconnected graph.

## Mitigations
- Preprocess KML into compact JSON graph.
- Use nearest-node snapping threshold and fallback behavior.
