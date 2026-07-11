import { DEFAULT_ROUTE_WEIGHTS, type RouteWeights } from "@/lib/routing";

const WEIGHT_KEYS = [
  "pcn",
  "future_network",
  "cycling_path",
  "road_bridge",
  "road_local",
  "road_secondary",
  "road_major",
] as const satisfies readonly (keyof RouteWeights)[];

const LABELS: Record<keyof RouteWeights, string> = {
  pcn: "Park Connector Network",
  future_network: "Future Network",
  cycling_path: "Cycling Path Network",
  road_major: "Major Roads",
  road_secondary: "Secondary Roads",
  road_local: "Local Roads",
  road_bridge: "Bridge Connections",
};

const SUBLABELS: Partial<Record<keyof RouteWeights, string>> = {
  road_major: "motorway · trunk · primary",
  road_secondary: "secondary · tertiary",
  road_local: "residential · unclassified",
  road_bridge: "PCN–road link edges",
};

const COLORS: Record<keyof RouteWeights, string> = {
  pcn: "#00b09b",
  future_network: "#a855f7",
  cycling_path: "#4a90d9",
  road_major: "#ef4444",
  road_secondary: "#f97316",
  road_local: "#eab308",
  road_bridge: "#94a3b8",
};

interface RouteWeightsEditorProps {
  routeWeights: RouteWeights;
  onChange: (key: keyof RouteWeights, value: number) => void;
  onReset: () => void;
}

export function RouteWeightsEditor({ routeWeights, onChange, onReset }: RouteWeightsEditorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
          Route Weights
        </p>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg px-2 py-0.5 text-[10px] font-medium border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Reset
        </button>
      </div>

      <p className="text-[10px] leading-relaxed text-muted-foreground/60">
        Lower = more preferred. All path types share the same scale.
      </p>

      {WEIGHT_KEYS.map((key) => {
        const sub = SUBLABELS[key];
        return (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex flex-col gap-0">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span
                    className="inline-block h-1.5 w-3 rounded-full"
                    style={{ backgroundColor: COLORS[key] }}
                  />
                  {LABELS[key]}
                </span>
                {sub && (
                  <span className="pl-[18px] text-[9px] text-muted-foreground/50">{sub}</span>
                )}
              </span>
              <span className="font-medium tabular-nums">{routeWeights[key].toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={5.0}
              step={0.05}
              value={routeWeights[key]}
              onChange={(e) => onChange(key, Number(e.target.value))}
              className="w-full"
              style={{ accentColor: COLORS[key] }}
            />
            <div className="flex justify-between text-[9px] text-muted-foreground/50">
              <span>Prefer</span>
              <span>Avoid</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { DEFAULT_ROUTE_WEIGHTS };
