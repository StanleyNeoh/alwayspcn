import { Loader2 } from "lucide-react";
import { type GraphData } from "@/lib/routing";

interface NetworkStatsProps {
  graph: GraphData | null;
  activeGraph: GraphData | null;
  graphBuilding: boolean;
  rawRoadNodeCount: number;
}

export function NetworkStats({
  graph,
  activeGraph,
  graphBuilding,
  rawRoadNodeCount,
}: NetworkStatsProps) {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2 space-y-1 text-xs">
      <div className="flex justify-between">
        <span className="text-muted-foreground">PCN vertices</span>
        <span className="tabular-nums">{graph?.meta.nodes.toLocaleString() ?? "–"}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Road vertices</span>
        <span className="tabular-nums">
          {rawRoadNodeCount > 0 ? rawRoadNodeCount.toLocaleString() : "–"}
        </span>
      </div>
      {graphBuilding ? (
        <div className="flex items-center gap-1.5 pt-0.5 text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Building…</span>
        </div>
      ) : activeGraph ? (
        <>
          <div className="h-px bg-border/30 my-0.5" />
          <div className="flex justify-between font-medium">
            <span>Active vertices</span>
            <span className="tabular-nums">{activeGraph.meta.nodes.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Active edges</span>
            <span className="tabular-nums">{activeGraph.meta.segments.toLocaleString()}</span>
          </div>
        </>
      ) : null}
    </div>
  );
}
