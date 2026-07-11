import { type RouteResult } from "@/lib/routing";

const formatDistance = (meters: number) =>
  meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;

interface StatusBoxProps {
  message: string;
  activeRoute: RouteResult | null;
  useServerRouting: boolean;
  serverRouting: boolean;
}

export function StatusBox({ message, activeRoute, useServerRouting, serverRouting }: StatusBoxProps) {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/25 px-3 py-2.5 text-xs">
      {useServerRouting && (
        <p className="mb-1.5 flex items-center gap-1 text-[10px] font-medium text-muted-foreground/70">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-400" />
          {serverRouting ? "Server routing…" : "Server routing"}
        </p>
      )}
      <p className="leading-relaxed text-muted-foreground">{message}</p>
      {activeRoute?.found ? (
        <div className="mt-2 space-y-0.5 font-medium text-foreground">
          <p>Distance: {formatDistance(activeRoute.distanceMeters)}</p>
          <p>PCN share: {(activeRoute.connectorShare * 100).toFixed(1)}%</p>
          {activeRoute.usesFallback && (
            <p className="font-normal text-muted-foreground">Road segments used</p>
          )}
        </div>
      ) : activeRoute?.found === false ? (
        <p className="mt-1 font-medium text-destructive">No route found for selected points.</p>
      ) : null}
    </div>
  );
}
