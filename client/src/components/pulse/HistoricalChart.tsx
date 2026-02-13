import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Download,
  LineChart as LineChartIcon,
  ScatterChart as ScatterIcon,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  Label,
  ReferenceArea,
} from "recharts";
import { useTheme } from "@/contexts/ThemeContext";
import { getLayerById, formatLayerValue, LAYER_CATEGORIES } from "./data-layers";
import type { TimeseriesData, TimeseriesPoint, DataLayer } from "./types";

// ─── Mock timeseries data ─────────────────────────────────────
// Seeded random for deterministic mock data per zip+layer
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return h / 0x7fffffff;
  };
}

// Realistic Austin ZHVI values for client-side fallback (matches server)
const CLIENT_HOME_VALUES: Record<string, number> = {
  "78701": 550000, "78702": 600000, "78703": 950000, "78704": 700000,
  "78705": 500000, "78712": 480000, "78717": 520000, "78721": 400000,
  "78722": 520000, "78723": 450000, "78724": 320000, "78725": 310000,
  "78726": 580000, "78727": 470000, "78728": 420000, "78729": 480000,
  "78730": 850000, "78731": 700000, "78732": 750000, "78733": 900000,
  "78734": 650000, "78735": 620000, "78736": 500000, "78737": 520000,
  "78738": 680000, "78739": 530000, "78741": 380000, "78742": 300000,
  "78744": 340000, "78745": 450000, "78746": 1200000, "78747": 380000,
  "78748": 430000, "78749": 520000, "78750": 550000, "78751": 530000,
  "78752": 400000, "78753": 360000, "78754": 350000, "78756": 600000,
  "78757": 520000, "78758": 370000, "78759": 560000,
  "78610": 360000, "78613": 430000, "78617": 310000, "78620": 600000,
  "78628": 400000, "78634": 330000, "78640": 300000, "78641": 380000,
  "78653": 340000, "78660": 350000, "78664": 360000, "78665": 400000,
  "78681": 420000, "78669": 600000, "78719": 340000,
};

// Austin growth trajectory multipliers
const YEARLY_MULTS: Record<number, number> = {
  2015: 0.50, 2016: 0.53, 2017: 0.57, 2018: 0.62, 2019: 0.65,
  2020: 0.68, 2021: 0.85, 2022: 1.08, 2023: 0.97, 2024: 0.98, 2025: 1.00,
};

function generateMockTimeseries(layerId: string, period: "yearly" | "monthly", zip?: string | null): TimeseriesData {
  const layer = getLayerById(layerId);
  const points: TimeseriesPoint[] = [];
  const isCurrency = layer?.unit === "currency";
  const isPercent = layer?.unit === "percent";
  const isScore = layer?.unit === "score";
  const isHomeValue = isCurrency && (layerId.includes("home-value") || layerId === "home-value" || layerId.includes("sf-value") || layerId.includes("condo-value"));

  const rng = seededRandom(`ts-${layerId}-${zip || "metro"}-${period}`);
  const baseValue = isHomeValue
    ? (CLIENT_HOME_VALUES[zip || "78704"] || 450000)
    : isCurrency
    ? 80000 + rng() * 40000
    : isPercent
    ? -3 + rng() * 8
    : isScore
    ? 40 + rng() * 30
    : 30 + rng() * 60;

  if (period === "yearly") {
    for (let y = 2015; y <= 2025; y++) {
      const noise = 1 + (rng() - 0.5) * 0.03;
      let value: number;
      if (isHomeValue) {
        value = baseValue * (YEARLY_MULTS[y] || 1.0) * noise;
      } else if (isCurrency) {
        value = baseValue * (0.7 + (y - 2015) * 0.03) * noise;
      } else {
        const drift = 1 + (rng() - 0.45) * 0.06;
        value = baseValue * drift * (1 + (y - 2020) * 0.015);
      }
      points.push({ date: `${y}`, value: Math.round(value * 100) / 100 });
    }
  } else {
    for (let y = 2023; y <= 2025; y++) {
      for (let m = 1; m <= (y === 2025 ? 6 : 12); m++) {
        const yearMult = YEARLY_MULTS[y] || 1.0;
        const nextMult = YEARLY_MULTS[y + 1] || yearMult;
        const interp = yearMult + (nextMult - yearMult) * ((m - 1) / 12);
        const seasonal = 1 + Math.sin(((m - 3) / 12) * Math.PI * 2) * 0.015;
        const noise = 1 + (rng() - 0.5) * 0.01;
        let value: number;
        if (isHomeValue) {
          value = baseValue * interp * seasonal * noise;
        } else if (isCurrency) {
          const trend = 0.9 + ((y - 2023) * 12 + m) / 36 * 0.1;
          value = baseValue * trend * seasonal * noise;
        } else {
          const drift = 1 + (rng() - 0.45) * 0.03;
          value = baseValue * drift * seasonal;
        }
        points.push({
          date: `${y}-${String(m).padStart(2, "0")}`,
          value: Math.round(value * 100) / 100,
        });
      }
    }
  }

  const avg = points.reduce((sum, p) => sum + p.value, 0) / points.length;

  return {
    layerId,
    zip: zip || "metro",
    period,
    data: points,
    average: Math.round(avg * 100) / 100,
    unit: layer?.unit || "number",
  };
}

interface HistoricalChartProps {
  selectedLayerId: string;
  selectedZip: string | null;
  period: "yearly" | "monthly";
  onPeriodChange: (period: "yearly" | "monthly") => void;
  className?: string;
}

export default function HistoricalChart({
  selectedLayerId,
  selectedZip,
  period,
  onPeriodChange,
  className = "",
}: HistoricalChartProps) {
  const [chartType, setChartType] = useState<"line" | "scatter">("line");
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const layer = getLayerById(selectedLayerId);
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const textColor = isDark ? "#999" : "#666";

  // Fetch timeseries — falls back to mock
  const { data: timeseries, isLoading } = useQuery<TimeseriesData>({
    queryKey: ["/api/pulse/v2/layer", selectedLayerId, "timeseries", selectedZip, period],
    queryFn: async () => {
      // Convert frontend layer ID (kebab-case) to backend (snake_case) 
      const backendLayerId = selectedLayerId.replace(/-/g, "_");
      const zip = selectedZip || "78704";
      try {
        const res = await fetch(
          `/api/pulse/v2/layer/${backendLayerId}/timeseries?zip=${zip}&period=${period}`,
          { credentials: "include" }
        );
        if (!res.ok) throw new Error("API not ready");
        const raw = await res.json();
        // Map V2 response to TimeseriesData shape
        const data = raw.data || [];
        const avg = data.length > 0
          ? data.reduce((sum: number, p: any) => sum + p.value, 0) / data.length
          : 0;
        return {
          layerId: selectedLayerId,
          zip,
          period,
          data,
          average: Math.round(avg * 100) / 100,
          unit: raw.meta?.unit || layer?.unit || "number",
        } as TimeseriesData;
      } catch {
        return generateMockTimeseries(selectedLayerId, period, selectedZip);
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  // Find related layers in same category for the dropdown
  const relatedLayers = useMemo(() => {
    if (!layer) return [];
    const cat = LAYER_CATEGORIES.find((c) =>
      c.layers.some((l) => l.id === selectedLayerId)
    );
    return cat?.layers || [];
  }, [selectedLayerId, layer]);

  // Determine special overlays
  const showOvervalued = selectedLayerId.includes("overvalued");
  const showForecast = selectedLayerId.includes("forecast");
  const showAffordability = selectedLayerId.includes("salary-to-afford");

  // Download handler
  const handleDownload = () => {
    if (!selectedLayerId) return;
    
    // Convert frontend kebab-case to backend snake_case
    const backendLayerId = selectedLayerId.replace(/-/g, "_");
    
    // Build download URL - include zip parameter if specific zip is selected
    const baseUrl = `/api/pulse/v2/export/${backendLayerId}`;
    const downloadUrl = selectedZip ? `${baseUrl}?zip=${selectedZip}` : baseUrl;
    
    // Trigger file download by creating a temporary link
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = ""; // Browser will use filename from Content-Disposition header
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format tick values
  const formatValue = (val: number) => {
    if (!layer) return `${val}`;
    return formatLayerValue(val, layer);
  };

  return (
    <div className={`bg-card border border-border rounded-lg overflow-hidden flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-display font-bold text-foreground truncate">
              {layer?.label || "Select a Data Layer"}
            </h3>
            {selectedZip && (
              <p className="text-xs text-muted-foreground mt-0.5">
                ZIP {selectedZip} • {period === "yearly" ? "Yearly" : "Monthly"} Data
              </p>
            )}
          </div>
          <Button
            size="sm"
            onClick={handleDownload}
            disabled={!selectedLayerId}
            className="bg-[#EF4923] hover:bg-[#d4411f] text-white text-xs h-7 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-3 w-3 mr-1" />
            Download Data
          </Button>
        </div>

        {/* Description */}
        {layer && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {layer.description}
          </p>
        )}

        {/* Controls row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sub-metric dropdown */}
          {relatedLayers.length > 1 && (
            <Select value={selectedLayerId} disabled>
              <SelectTrigger className="h-7 text-xs w-auto min-w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {relatedLayers.map((l) => (
                  <SelectItem key={l.id} value={l.id} className="text-xs">
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Period toggle */}
          <div className="flex bg-muted rounded-md p-0.5 text-[11px]">
            <button
              onClick={() => onPeriodChange("yearly")}
              className={`px-2.5 py-1 rounded transition-colors ${
                period === "yearly"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly
            </button>
            <button
              onClick={() => onPeriodChange("monthly")}
              className={`px-2.5 py-1 rounded transition-colors ${
                period === "monthly"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
          </div>

          {/* Chart type toggle */}
          <div className="flex bg-muted rounded-md p-0.5 ml-auto">
            <button
              onClick={() => setChartType("line")}
              className={`p-1.5 rounded transition-colors ${
                chartType === "line"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LineChartIcon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setChartType("scatter")}
              className={`p-1.5 rounded transition-colors ${
                chartType === "scatter"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ScatterIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4 flex-1 min-h-[300px]">
        {isLoading ? (
          <Skeleton className="h-full w-full min-h-[280px]" />
        ) : !timeseries || timeseries.data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground min-h-[280px]">
            {!selectedZip
              ? "Click a zip code on the map to see historical data"
              : `No historical data available for ZIP ${selectedZip}`}
          </div>
        ) : chartType === "line" ? (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={timeseries.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="chartFillGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="chartFillOrange" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4923" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#EF4923" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fill: textColor, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: gridColor }}
              />
              <YAxis
                tick={{ fill: textColor, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: gridColor }}
                tickFormatter={formatValue}
                width={65}
              />
              <RechartsTooltip
                contentStyle={{
                  background: isDark ? "#2a2a2a" : "#fff",
                  border: "1px solid",
                  borderColor: isDark ? "#444" : "#ddd",
                  borderRadius: 8,
                  fontSize: 12,
                  padding: "8px 12px",
                }}
                formatter={(value: number) => [
                  layer ? formatLayerValue(value, layer) : value,
                  layer?.label || "Value",
                ]}
              />

              {/* Historical average reference line */}
              <ReferenceLine
                y={timeseries.average}
                stroke={isDark ? "#666" : "#aaa"}
                strokeDasharray="6 4"
                strokeWidth={1.5}
              >
                <Label
                  value={`Avg: ${formatValue(timeseries.average)}`}
                  position="insideTopRight"
                  fill={textColor}
                  fontSize={10}
                />
              </ReferenceLine>

              {/* Zero line for percent metrics */}
              {layer?.unit === "percent" && (
                <ReferenceLine
                  y={0}
                  stroke={isDark ? "#555" : "#ccc"}
                  strokeWidth={1}
                />
              )}

              {/* Special overlay labels */}
              {showOvervalued && timeseries.data.length > 2 && (
                <>
                  <ReferenceArea
                    y1={0}
                    y2={Math.max(...timeseries.data.map((d) => d.value))}
                    fill="#ef4444"
                    fillOpacity={0.05}
                    label={{ value: "Overvalued", fill: "#ef4444", fontSize: 11, position: "insideTopLeft" }}
                  />
                  <ReferenceArea
                    y1={Math.min(...timeseries.data.map((d) => d.value))}
                    y2={0}
                    fill="#22c55e"
                    fillOpacity={0.05}
                    label={{ value: "Undervalued", fill: "#22c55e", fontSize: 11, position: "insideBottomLeft" }}
                  />
                </>
              )}

              {showForecast && (
                <>
                  <ReferenceArea
                    y1={0}
                    y2={Math.max(...timeseries.data.map((d) => d.value))}
                    fill="#ef4444"
                    fillOpacity={0.04}
                    label={{ value: "Sellers Market", fill: "#ef4444", fontSize: 10, position: "insideTopRight" }}
                  />
                  <ReferenceArea
                    y1={Math.min(...timeseries.data.map((d) => d.value))}
                    y2={0}
                    fill="#3b82f6"
                    fillOpacity={0.04}
                    label={{ value: "Buyers Market", fill: "#3b82f6", fontSize: 10, position: "insideBottomRight" }}
                  />
                </>
              )}

              <Area
                type="monotone"
                dataKey="value"
                stroke="#22c55e"
                strokeWidth={2.5}
                fill="url(#chartFillGreen)"
                dot={{ r: 3, fill: "#22c55e", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#22c55e", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          /* Scatter plot mode */
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fill: textColor, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: gridColor }}
                type="category"
                allowDuplicatedCategory={false}
              />
              <YAxis
                dataKey="value"
                tick={{ fill: textColor, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: gridColor }}
                tickFormatter={formatValue}
                width={65}
              />
              <RechartsTooltip
                contentStyle={{
                  background: isDark ? "#2a2a2a" : "#fff",
                  border: "1px solid",
                  borderColor: isDark ? "#444" : "#ddd",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number) => [
                  layer ? formatLayerValue(value, layer) : value,
                  layer?.label || "Value",
                ]}
              />
              <ReferenceLine
                y={timeseries.average}
                stroke={isDark ? "#666" : "#aaa"}
                strokeDasharray="6 4"
                strokeWidth={1.5}
              />
              <Scatter
                data={timeseries.data}
                fill="#EF4923"
                shape="circle"
              />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
