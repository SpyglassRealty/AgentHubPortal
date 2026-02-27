import { useState, useRef, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Activity, PanelLeftClose, PanelLeftOpen, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DataLayerSidebar,
  ZipSummaryPanel,
  HistoricalChart,
  AffordabilityChart,
  PulseMap,
  PulseSearchBar,
  HeroStatsBar,
  MarketTrends,
  NeighborhoodExplorer,
} from "@/components/pulse";
import type { OverviewData, ZipHeatmapItem, TrendMonth } from "@/components/pulse";

// Map the frontend layer IDs to V2 backend layer IDs
// Frontend uses kebab-case (home-value), backend uses snake_case (home_value)
function toBackendLayerId(frontendId: string): string {
  return frontendId.replace(/-/g, "_");
}

// ─── Main Pulse V2 Page ──────────────────────────────────────
export default function PulsePage() {
  const [selectedZip, setSelectedZip] = useState<string | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState("home-value");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [period, setPeriod] = useState<"yearly" | "monthly">("yearly");
  const [filteredZips, setFilteredZips] = useState<string[] | null>(null);
  const [filterLabel, setFilterLabel] = useState<string | null>(null);
  const mapSectionRef = useRef<HTMLDivElement>(null);

  const handleZipSelect = useCallback((zip: string) => {
    setSelectedZip(zip);
    setTimeout(() => {
      mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  const handleFilterZips = useCallback((zips: string[], label: string) => {
    setFilteredZips(zips);
    setFilterLabel(label);
    setSelectedZip(null);
    setTimeout(() => {
      mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  const handleClearFilter = useCallback(() => {
    setFilteredZips(null);
    setFilterLabel(null);
  }, []);

  const handleLayerSelect = useCallback((layerId: string) => {
    setSelectedLayerId(layerId);
  }, []);

  // Detect if we should show the special AffordabilityChart
  const isAffordabilityLayer = selectedLayerId === "salary-to-afford";

  // Fetch overview
  const { data: overview, isLoading: overviewLoading } = useQuery<OverviewData>({
    queryKey: ["/api/pulse/overview"],
    staleTime: 1000 * 60 * 10,
  });

  // Fetch heatmap (V1 — MLS-powered baseline with zip coordinates)
  const { data: heatmapData, isLoading: heatmapLoading } = useQuery<{
    zipData: ZipHeatmapItem[];
    total: number;
  }>({
    queryKey: ["/api/pulse/heatmap"],
    staleTime: 1000 * 60 * 10,
  });

  // Fetch V2 layer data for the currently selected data layer
  // This provides the actual metric values (Zillow, Census, Redfin, Calculated)
  const backendLayerId = toBackendLayerId(selectedLayerId);
  const { data: v2LayerData, isLoading: v2LayerLoading } = useQuery<{
    layerId: string;
    data: Array<{ zip: string; value: number; label: string }>;
    meta: { min: number; max: number; median: number; unit: string; source: string; description: string; count: number };
  }>({
    queryKey: ["/api/pulse/v2/layer", backendLayerId],
    queryFn: async () => {
      const res = await fetch(`/api/pulse/v2/layer/${backendLayerId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch layer data");
      return res.json();
    },
    staleTime: 1000 * 60 * 10,
  });

  // Fetch trends
  const { data: trendsData, isLoading: trendsLoading } = useQuery<{
    trends: TrendMonth[];
  }>({
    queryKey: ["/api/pulse/trends"],
    staleTime: 1000 * 60 * 10,
  });

  // Look up lat/lng for the selected zip from heatmap data
  const selectedZipCoords = useMemo(() => {
    if (!selectedZip || !heatmapData?.zipData) return null;
    const item = heatmapData.zipData.find(z => z.zip === selectedZip);
    return item ? { lat: item.lat, lng: item.lng } : null;
  }, [selectedZip, heatmapData?.zipData]);

  // Merge V2 layer data into the heatmap items so the map can display
  // the selected metric value instead of just MLS median price
  const allZipData = useMemo(() => {
    const baseZips = heatmapData?.zipData || [];
    if (!v2LayerData?.data?.length) return baseZips;

    // Build lookup of V2 values by zip
    const v2Lookup = new Map<string, { value: number; label: string }>();
    for (const item of v2LayerData.data) {
      v2Lookup.set(item.zip, { value: item.value, label: item.label });
    }

    // Merge: add layerValue + layerLabel to each heatmap item
    return baseZips.map(item => {
      const v2 = v2Lookup.get(item.zip);
      return {
        ...item,
        layerValue: v2?.value ?? null,
        layerLabel: v2?.label ?? null,
      };
    });
  }, [heatmapData?.zipData, v2LayerData?.data]);

  // Apply zip filter (from search bar city/county selection)
  const zipData = useMemo(() => {
    if (!filteredZips) return allZipData;
    const filterSet = new Set(filteredZips);
    return allZipData.filter(item => filterSet.has(item.zip));
  }, [allZipData, filteredZips]);

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
                  {filterLabel ? (
                    <>
                      <span className="text-[#EF4923] font-medium">{filterLabel}</span>
                      {" "}market intelligence — {zipData.length} zip{zipData.length !== 1 ? "s" : ""} · powered by Spyglass
                    </>
                  ) : (
                    "Austin Metro market intelligence — 50+ data layers powered by Spyglass"
                  )}
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

        {/* ─── Search Bar ──────────────────────────────── */}
        <PulseSearchBar
          onZipSelect={handleZipSelect}
          onFilterZips={handleFilterZips}
          onClearFilter={handleClearFilter}
          activeFilter={filterLabel}
        />

        {/* ─── Active Filter Banner ──────────────────────── */}
        {filterLabel && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-[#EF4923]/8 border border-[#EF4923]/20">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-[#EF4923]" />
              <span className="font-medium text-foreground">
                Showing <span className="text-[#EF4923] font-semibold">{filterLabel}</span>
              </span>
              <span className="text-muted-foreground">
                — {zipData.length} of {allZipData.length} zip codes
              </span>
            </div>
            <button
              onClick={handleClearFilter}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-md hover:bg-[#EF4923]/10 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Clear filter
            </button>
          </div>
        )}

        {/* ─── 3-Panel Layout: Sidebar | Center Content | RightChart ── */}
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

          {/* Center: Map (no zip selected) OR Zip Summary + Chart (zip selected) */}
          {selectedZip ? (
            /* When a zip is selected: replace map area with summary + chart side by side */
            <div className="flex-1 flex min-w-0">
              {/* Zip Summary Panel — left half of center */}
              <div className="w-[380px] flex-shrink-0 border-r border-border overflow-auto">
                <ZipSummaryPanel
                  zipCode={selectedZip}
                  lat={selectedZipCoords?.lat}
                  lng={selectedZipCoords?.lng}
                  onClose={() => setSelectedZip(null)}
                  className="h-full border-0 rounded-none"
                />
              </div>

              {/* Historical Chart or Affordability Chart — right half of center */}
              <div className="flex-1 min-w-[400px]">
                {isAffordabilityLayer ? (
                  <AffordabilityChart
                    selectedZip={selectedZip}
                    className="h-full border-0 rounded-none"
                  />
                ) : (
                  <HistoricalChart
                    selectedLayerId={selectedLayerId}
                    selectedZip={selectedZip}
                    filteredZips={filteredZips}
                    filterLabel={filterLabel}
                    period={period}
                    onPeriodChange={setPeriod}
                    className="h-full border-0 rounded-none"
                  />
                )}
              </div>
            </div>
          ) : (
            /* When no zip selected: show map + chart side by side */
            <>
              <div className="flex-1 relative min-w-0">
                <PulseMap
                  zipData={zipData}
                  isLoading={heatmapLoading || v2LayerLoading}
                  onZipSelect={handleZipSelect}
                  selectedZip={selectedZip}
                  selectedLayerId={selectedLayerId}
                />
              </div>

              {/* Right Panel — Historical Chart or Affordability Chart */}
              <div className="w-[35%] min-w-[420px] max-w-[520px] flex-shrink-0 border-l border-border">
                {isAffordabilityLayer ? (
                  <AffordabilityChart
                    selectedZip={selectedZip}
                    className="h-full border-0 rounded-none"
                  />
                ) : (
                  <HistoricalChart
                    selectedLayerId={selectedLayerId}
                    selectedZip={selectedZip}
                    filteredZips={filteredZips}
                    filterLabel={filterLabel}
                    period={period}
                    onPeriodChange={setPeriod}
                    className="h-full border-0 rounded-none"
                  />
                )}
              </div>
            </>
          )}
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
          selectedLayerId={selectedLayerId}
        />
      </div>
    </Layout>
  );
}
