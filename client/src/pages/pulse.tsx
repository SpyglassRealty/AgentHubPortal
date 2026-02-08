import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Activity, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DataLayerSidebar,
  ZipSummaryPanel,
  HistoricalChart,
  PulseMap,
  HeroStatsBar,
  MarketTrends,
  NeighborhoodExplorer,
} from "@/components/pulse";
import type { OverviewData, ZipHeatmapItem, TrendMonth } from "@/components/pulse";

// ─── Main Pulse V2 Page ──────────────────────────────────────
export default function PulsePage() {
  const [selectedZip, setSelectedZip] = useState<string | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState("home-value");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [period, setPeriod] = useState<"yearly" | "monthly">("yearly");
  const mapSectionRef = useRef<HTMLDivElement>(null);

  const handleZipSelect = useCallback((zip: string) => {
    setSelectedZip(zip);
    setTimeout(() => {
      mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  const handleLayerSelect = useCallback((layerId: string) => {
    setSelectedLayerId(layerId);
  }, []);

  // Fetch overview
  const { data: overview, isLoading: overviewLoading } = useQuery<OverviewData>({
    queryKey: ["/api/pulse/overview"],
    staleTime: 1000 * 60 * 10,
  });

  // Fetch heatmap
  const { data: heatmapData, isLoading: heatmapLoading } = useQuery<{
    zipData: ZipHeatmapItem[];
    total: number;
  }>({
    queryKey: ["/api/pulse/heatmap"],
    staleTime: 1000 * 60 * 10,
  });

  // Fetch trends
  const { data: trendsData, isLoading: trendsLoading } = useQuery<{
    trends: TrendMonth[];
  }>({
    queryKey: ["/api/pulse/trends"],
    staleTime: 1000 * 60 * 10,
  });

  const zipData = heatmapData?.zipData || [];

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* ─── Page Header ──────────────────────────────── */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#EF4923]/8 via-transparent to-transparent rounded-2xl -z-10" />
          <div className="pt-2 pb-1">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EF4923]/10 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-[#EF4923]" />
                  </div>
                  Pulse
                </h1>
                <p className="text-muted-foreground mt-1">
                  Austin Metro market intelligence — 50+ data layers powered by Spyglass
                </p>
              </div>
              {overview?.lastUpdated && (
                <p className="text-xs text-muted-foreground">
                  Updated{" "}
                  {new Date(overview.lastUpdated).toLocaleString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ─── Hero Stats ──────────────────────────────── */}
        <HeroStatsBar data={overview} isLoading={overviewLoading} />

        {/* ─── 3-Panel Layout: Sidebar | Map+CenterPanel | RightChart ── */}
        <div ref={mapSectionRef} className="flex gap-0 rounded-xl border border-border overflow-hidden bg-card shadow-sm" style={{ minHeight: "600px" }}>
          
          {/* Left Sidebar — Data Layer Selector */}
          <div
            className={`transition-all duration-300 ease-in-out flex-shrink-0 ${
              sidebarOpen ? "w-[260px]" : "w-0"
            } overflow-hidden`}
          >
            <DataLayerSidebar
              selectedLayerId={selectedLayerId}
              onLayerSelect={handleLayerSelect}
              className="h-full"
            />
          </div>

          {/* Sidebar toggle */}
          <div className="flex-shrink-0 border-r border-border">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-6 rounded-none text-muted-foreground hover:text-foreground"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Center: Map + Zip Summary overlay */}
          <div className="flex-1 relative min-w-0">
            <PulseMap
              zipData={zipData}
              isLoading={heatmapLoading}
              onZipSelect={handleZipSelect}
              selectedZip={selectedZip}
              selectedLayerId={selectedLayerId}
            />

            {/* Floating Zip Summary Panel — overlays on top of the map */}
            {selectedZip && (
              <div className="absolute top-3 left-3 bottom-3 w-[320px] pointer-events-auto" style={{ zIndex: 50 }}>
                <ZipSummaryPanel
                  zipCode={selectedZip}
                  onClose={() => setSelectedZip(null)}
                  className="h-full shadow-2xl ring-1 ring-black/5"
                />
              </div>
            )}
          </div>

          {/* Right Panel — Historical Chart */}
          <div className="w-[35%] min-w-[420px] max-w-[520px] flex-shrink-0 border-l border-border">
            <HistoricalChart
              selectedLayerId={selectedLayerId}
              selectedZip={selectedZip}
              period={period}
              onPeriodChange={setPeriod}
              className="h-full border-0 rounded-none"
            />
          </div>
        </div>

        {/* ─── Market Trends (below the 3-panel) ───────── */}
        <MarketTrends
          trends={trendsData?.trends}
          isLoading={trendsLoading}
        />

        {/* ─── Neighborhood Explorer ───────────────────── */}
        <NeighborhoodExplorer
          zipData={zipData}
          onZipSelect={handleZipSelect}
        />
      </div>
    </Layout>
  );
}
