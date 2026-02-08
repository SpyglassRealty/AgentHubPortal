import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Home,
  DollarSign,
  Clock,
  BarChart3,
  MapPin,
  Search,
  X,
  ArrowUpRight,
  Layers,
  ChevronRight,
  Building2,
  Calendar,
  Ruler,
  Minus,
} from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useTheme } from "@/contexts/ThemeContext";

// Mapbox token
const MAPBOX_TOKEN =
  "pk.eyJ1Ijoic3B5Z2xhc3NyZWFsdHkiLCJhIjoiY21sYmJjYjR5MG5teDNkb29oYnlldGJ6bCJ9.h6al6oHtIP5YiiIW97zhDw";

// ─── Types ───────────────────────────────────────────────────
interface OverviewData {
  totalActive: number;
  activeUnderContract: number;
  pending: number;
  closedLast30: number;
  newLast7: number;
  medianListPrice: number;
  medianSoldPrice: number;
  avgDom: number;
  avgPricePerSqft: number;
  monthsOfSupply: number;
  lastUpdated: string;
}

interface ZipHeatmapItem {
  zip: string;
  count: number;
  medianPrice: number;
  avgDom: number;
  lat: number;
  lng: number;
}

interface ZipDetailData {
  zipCode: string;
  activeCount: number;
  closedCount: number;
  medianPrice: number;
  avgSqft: number;
  avgDom: number;
  avgPricePerSqft: number;
  topSubdivisions: { name: string; count: number }[];
  recentSales: {
    address: string;
    soldPrice: number;
    listPrice: number;
    beds: number;
    baths: number;
    sqft: number;
    daysOnMarket: number;
    closeDate: string;
    mlsNumber: string;
  }[];
}

interface TrendMonth {
  month: string;
  closedCount: number;
  medianPrice: number;
  avgDom: number;
  activeInventory: number | null;
}

// ─── Formatters ──────────────────────────────────────────────
function formatPrice(n: number): string {
  if (!n) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function formatFullPrice(n: number): string {
  if (!n) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatNumber(n: number): string {
  if (!n) return "0";
  return n.toLocaleString();
}

// ─── Animated Counter ────────────────────────────────────────
function AnimatedNumber({
  value,
  formatter,
  duration = 1200,
}: {
  value: number;
  formatter: (n: number) => string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    const start = prevValue.current;
    const end = value;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
    prevValue.current = end;
  }, [value, duration]);

  return <>{formatter(display)}</>;
}

// ─── Color Scales ────────────────────────────────────────────
function priceColor(price: number): string {
  if (price <= 300_000) return "#22c55e";
  if (price <= 500_000) return "#84cc16";
  if (price <= 700_000) return "#eab308";
  if (price <= 1_000_000) return "#f97316";
  return "#ef4444";
}

function countColor(count: number): string {
  if (count <= 20) return "#22c55e";
  if (count <= 50) return "#84cc16";
  if (count <= 100) return "#eab308";
  if (count <= 200) return "#f97316";
  return "#ef4444";
}

function domColor(dom: number): string {
  if (dom <= 15) return "#22c55e";
  if (dom <= 30) return "#84cc16";
  if (dom <= 60) return "#eab308";
  if (dom <= 90) return "#f97316";
  return "#ef4444";
}

// ─── Hero Stats Bar ──────────────────────────────────────────
function HeroStatsBar({ data, isLoading }: { data?: OverviewData; isLoading: boolean }) {
  const stats = [
    {
      label: "Active Listings",
      value: data?.totalActive || 0,
      formatter: formatNumber,
      icon: Home,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Median List Price",
      value: data?.medianListPrice || 0,
      formatter: formatPrice,
      icon: DollarSign,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Avg Days on Market",
      value: data?.avgDom || 0,
      formatter: (n: number) => `${n}`,
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      label: "New This Week",
      value: data?.newLast7 || 0,
      formatter: formatNumber,
      icon: Activity,
      color: "text-[#EF4923]",
      bgColor: "bg-[#EF4923]/10",
    },
    {
      label: "Months of Supply",
      value: data?.monthsOfSupply || 0,
      formatter: (n: number) => n.toFixed(1),
      icon: BarChart3,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Price / Sq Ft",
      value: data?.avgPricePerSqft || 0,
      formatter: (n: number) => `$${n}`,
      icon: Ruler,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((stat, i) => (
        <Card
          key={i}
          className="group relative overflow-hidden border-border hover:border-[#EF4923]/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
        >
          <CardContent className="p-4">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-8 h-8 rounded-lg ${stat.bgColor} flex items-center justify-center`}
                  >
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-xs font-medium text-muted-foreground truncate">
                  {stat.label}
                </p>
                <p className="text-xl font-bold font-display mt-0.5">
                  <AnimatedNumber value={stat.value} formatter={stat.formatter} />
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Map Layer Selector ──────────────────────────────────────
type MapLayer = "price" | "count" | "dom";

// ─── Interactive Heatmap Map ─────────────────────────────────
function PulseMap({
  zipData,
  isLoading,
  onZipSelect,
  selectedZip,
}: {
  zipData: ZipHeatmapItem[];
  isLoading: boolean;
  onZipSelect: (zip: string) => void;
  selectedZip: string | null;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const [mapLayer, setMapLayer] = useState<MapLayer>("price");
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const getColor = useCallback(
    (item: ZipHeatmapItem) => {
      switch (mapLayer) {
        case "price":
          return priceColor(item.medianPrice);
        case "count":
          return countColor(item.count);
        case "dom":
          return domColor(item.avgDom);
      }
    },
    [mapLayer]
  );

  const getSize = useCallback(
    (item: ZipHeatmapItem) => {
      switch (mapLayer) {
        case "count":
          return Math.max(18, Math.min(50, 18 + item.count * 0.15));
        case "price":
          return Math.max(18, Math.min(50, 18 + (item.medianPrice / 1_000_000) * 30));
        case "dom":
          return Math.max(18, Math.min(50, 18 + item.avgDom * 0.25));
      }
    },
    [mapLayer]
  );

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: isDark
        ? "mapbox://styles/mapbox/dark-v11"
        : "mapbox://styles/mapbox/light-v11",
      center: [-97.7431, 30.2672],
      zoom: 10,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
    };
  }, [isDark]);

  // Update markers when data or layer changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !zipData.length) return;

    // Wait for map to load
    const updateMarkers = () => {
      // Clear old markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      zipData.forEach((item) => {
        if (!item.lat || !item.lng) return;

        const color = getColor(item);
        const size = getSize(item);
        const isSelected = selectedZip === item.zip;

        const el = document.createElement("div");
        el.style.cssText = `
          width: ${size}px;
          height: ${size}px;
          background: ${color};
          border: ${isSelected ? "3px solid #fff" : "2px solid rgba(255,255,255,0.7)"};
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${Math.max(9, size * 0.28)}px;
          font-weight: 700;
          color: #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
          ${isSelected ? "transform: scale(1.2); box-shadow: 0 4px 16px rgba(239,73,35,0.4);" : ""}
        `;

        // Show count or abbreviated value in marker
        let labelText = "";
        if (mapLayer === "count") {
          labelText = item.count.toString();
        } else if (mapLayer === "price" && item.medianPrice > 0) {
          labelText =
            item.medianPrice >= 1_000_000
              ? `${(item.medianPrice / 1_000_000).toFixed(1)}M`
              : `${Math.round(item.medianPrice / 1_000)}K`;
        } else if (mapLayer === "dom") {
          labelText = `${item.avgDom}d`;
        }
        el.textContent = labelText;

        el.addEventListener("mouseenter", () => {
          if (selectedZip !== item.zip) {
            el.style.transform = "scale(1.15)";
            el.style.boxShadow = "0 4px 12px rgba(0,0,0,0.4)";
          }
        });
        el.addEventListener("mouseleave", () => {
          if (selectedZip !== item.zip) {
            el.style.transform = "scale(1)";
            el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
          }
        });

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onZipSelect(item.zip);

          // Show popup
          if (popupRef.current) popupRef.current.remove();
          const popup = new mapboxgl.Popup({
            closeOnClick: true,
            maxWidth: "240px",
            offset: size / 2 + 5,
          })
            .setLngLat([item.lng, item.lat])
            .setHTML(
              `<div style="font-family: system-ui, sans-serif; padding: 4px 0;">
                <div style="font-weight: 700; font-size: 15px; margin-bottom: 4px;">ZIP ${item.zip}</div>
                <div style="font-size: 12px; color: #666; line-height: 1.6;">
                  <div><strong>${item.count}</strong> active listings</div>
                  <div>Median: <strong>${formatFullPrice(item.medianPrice)}</strong></div>
                  <div>Avg DOM: <strong>${item.avgDom} days</strong></div>
                </div>
                <div style="margin-top: 6px; font-size: 11px; color: #EF4923; font-weight: 600; cursor: pointer;">
                  Click for details →
                </div>
              </div>`
            )
            .addTo(map);
          popupRef.current = popup;
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([item.lng, item.lat])
          .addTo(map);
        markersRef.current.push(marker);
      });
    };

    if (map.loaded()) {
      updateMarkers();
    } else {
      map.on("load", updateMarkers);
    }
  }, [zipData, mapLayer, getColor, getSize, selectedZip, onZipSelect]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Layers className="h-5 w-5 text-[#EF4923]" />
            Austin Metro Heatmap
          </CardTitle>
          <Select
            value={mapLayer}
            onValueChange={(v) => setMapLayer(v as MapLayer)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price">Median Price</SelectItem>
              <SelectItem value="count">Listing Count</SelectItem>
              <SelectItem value="dom">Avg Days on Market</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0 relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 border-3 border-[#EF4923] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Loading map data...</p>
            </div>
          </div>
        )}
        <div ref={mapContainerRef} className="w-full h-[500px]" />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-md rounded-lg p-3 border border-border shadow-lg text-xs">
          <p className="font-semibold mb-1.5 text-muted-foreground">
            {mapLayer === "price"
              ? "Median Price"
              : mapLayer === "count"
              ? "Listing Count"
              : "Avg DOM"}
          </p>
          <div className="flex items-center gap-1.5">
            {mapLayer === "price" ? (
              <>
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: "#22c55e" }}
                />
                <span>&lt;$300K</span>
                <span
                  className="w-3 h-3 rounded-full ml-1"
                  style={{ background: "#eab308" }}
                />
                <span>$500K</span>
                <span
                  className="w-3 h-3 rounded-full ml-1"
                  style={{ background: "#ef4444" }}
                />
                <span>&gt;$1M</span>
              </>
            ) : mapLayer === "count" ? (
              <>
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: "#22c55e" }}
                />
                <span>Low</span>
                <span
                  className="w-3 h-3 rounded-full ml-1"
                  style={{ background: "#eab308" }}
                />
                <span>Med</span>
                <span
                  className="w-3 h-3 rounded-full ml-1"
                  style={{ background: "#ef4444" }}
                />
                <span>High</span>
              </>
            ) : (
              <>
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: "#22c55e" }}
                />
                <span>&lt;15d</span>
                <span
                  className="w-3 h-3 rounded-full ml-1"
                  style={{ background: "#eab308" }}
                />
                <span>30-60d</span>
                <span
                  className="w-3 h-3 rounded-full ml-1"
                  style={{ background: "#ef4444" }}
                />
                <span>&gt;90d</span>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Market Trends Charts ────────────────────────────────────
function MarketTrends({
  trends,
  isLoading,
}: {
  trends?: TrendMonth[];
  isLoading: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const textColor = isDark ? "#999" : "#666";

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[250px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!trends?.length) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-display font-semibold flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-[#EF4923]" />
        Market Trends — Last 6 Months
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Median Sale Price */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-muted-foreground">
              Median Sale Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4923" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EF4923" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 12 }} />
                <YAxis
                  tick={{ fill: textColor, fontSize: 12 }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  contentStyle={{
                    background: isDark ? "#2a2a2a" : "#fff",
                    border: "1px solid",
                    borderColor: isDark ? "#444" : "#ddd",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [formatFullPrice(value), "Median Price"]}
                />
                <Area
                  type="monotone"
                  dataKey="medianPrice"
                  stroke="#EF4923"
                  strokeWidth={2.5}
                  fill="url(#priceGrad)"
                  dot={{ r: 4, fill: "#EF4923", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#EF4923" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Closed Sales Volume */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-muted-foreground">
              Closed Sales (Monthly)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={trends}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4923" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#EF4923" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 12 }} />
                <YAxis tick={{ fill: textColor, fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: isDark ? "#2a2a2a" : "#fff",
                    border: "1px solid",
                    borderColor: isDark ? "#444" : "#ddd",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [formatNumber(value), "Sales"]}
                />
                <Bar dataKey="closedCount" fill="url(#barGrad)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Average DOM */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-muted-foreground">
              Average Days on Market
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="domGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 12 }} />
                <YAxis tick={{ fill: textColor, fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: isDark ? "#2a2a2a" : "#fff",
                    border: "1px solid",
                    borderColor: isDark ? "#444" : "#ddd",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [`${value} days`, "Avg DOM"]}
                />
                <Area
                  type="monotone"
                  dataKey="avgDom"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  fill="url(#domGrad)"
                  dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#8b5cf6" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Zip Detail Panel ────────────────────────────────────────
function ZipDetailPanel({
  zipCode,
  overviewData,
  onClose,
}: {
  zipCode: string;
  overviewData?: OverviewData;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery<ZipDetailData>({
    queryKey: ["/api/pulse/zip", zipCode],
    queryFn: async () => {
      const res = await fetch(`/api/pulse/zip/${zipCode}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch zip data");
      return res.json();
    },
    enabled: !!zipCode,
  });

  return (
    <Card className="border-[#EF4923]/20 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <MapPin className="h-5 w-5 text-[#EF4923]" />
            ZIP Code {zipCode}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
            <Skeleton className="h-32" />
          </div>
        ) : data ? (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border bg-card">
                <p className="text-xs font-medium text-muted-foreground">Active</p>
                <p className="text-lg font-bold">{data.activeCount}</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <p className="text-xs font-medium text-muted-foreground">Median Price</p>
                <p className="text-lg font-bold">{formatFullPrice(data.medianPrice)}</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <p className="text-xs font-medium text-muted-foreground">Avg DOM</p>
                <p className="text-lg font-bold">{data.avgDom} days</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <p className="text-xs font-medium text-muted-foreground">$/Sq Ft</p>
                <p className="text-lg font-bold">${data.avgPricePerSqft}</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <p className="text-xs font-medium text-muted-foreground">Avg Sq Ft</p>
                <p className="text-lg font-bold">{formatNumber(data.avgSqft)}</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <p className="text-xs font-medium text-muted-foreground">Sold (30d)</p>
                <p className="text-lg font-bold">{data.closedCount}</p>
              </div>
            </div>

            {/* Comparison to metro */}
            {overviewData && data.medianPrice > 0 && overviewData.medianListPrice > 0 && (
              <div className="p-3 rounded-lg bg-[#EF4923]/5 border border-[#EF4923]/15">
                <p className="text-xs font-medium text-[#EF4923] mb-1">
                  vs. Metro Average
                </p>
                <div className="flex items-center gap-2">
                  {data.medianPrice > overviewData.medianListPrice ? (
                    <TrendingUp className="h-4 w-4 text-red-500" />
                  ) : data.medianPrice < overviewData.medianListPrice ? (
                    <TrendingDown className="h-4 w-4 text-green-500" />
                  ) : (
                    <Minus className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-semibold">
                    {(
                      ((data.medianPrice - overviewData.medianListPrice) /
                        overviewData.medianListPrice) *
                      100
                    ).toFixed(1)}
                    % {data.medianPrice > overviewData.medianListPrice ? "above" : "below"} metro median
                  </span>
                </div>
              </div>
            )}

            {/* Top Subdivisions */}
            {data.topSubdivisions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Top Subdivisions
                </h4>
                <div className="flex flex-wrap gap-2">
                  {data.topSubdivisions.map((sub) => (
                    <Badge
                      key={sub.name}
                      variant="secondary"
                      className="text-xs"
                    >
                      {sub.name}{" "}
                      <span className="ml-1 text-muted-foreground">
                        ({sub.count})
                      </span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Sales */}
            {data.recentSales.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Recent Sales
                </h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {data.recentSales.map((sale, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate flex-1">
                          {sale.address}
                        </p>
                        <span className="text-sm font-bold text-[#EF4923] ml-2">
                          {formatFullPrice(sale.soldPrice)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span>{sale.beds}bd / {sale.baths}ba</span>
                        <span>{formatNumber(sale.sqft)} sqft</span>
                        <span>{sale.daysOnMarket}d DOM</span>
                        {sale.mlsNumber && (
                          <span className="text-muted-foreground/60">
                            #{sale.mlsNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No data available for this zip code.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Neighborhood Explorer ───────────────────────────────────
function NeighborhoodExplorer({
  zipData,
  onZipSelect,
}: {
  zipData: ZipHeatmapItem[];
  onZipSelect: (zip: string) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) {
      return [...zipData]
        .sort((a, b) => b.count - a.count)
        .slice(0, 12);
    }
    return zipData.filter((z) => z.zip.includes(search.trim()));
  }, [zipData, search]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-display flex items-center gap-2">
          <Search className="h-5 w-5 text-[#EF4923]" />
          Neighborhood Explorer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by zip code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">
            No zip codes found matching "{search}"
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((z) => (
              <button
                key={z.zip}
                onClick={() => onZipSelect(z.zip)}
                className="text-left p-3 rounded-lg border bg-card hover:border-[#EF4923]/40 hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-base">{z.zip}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Active Listings</span>
                    <span className="font-semibold text-foreground">{z.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Median Price</span>
                    <span className="font-semibold text-foreground">
                      {z.medianPrice > 0 ? formatPrice(z.medianPrice) : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg DOM</span>
                    <span className="font-semibold text-foreground">
                      {z.avgDom > 0 ? `${z.avgDom}d` : "—"}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Pulse Page ─────────────────────────────────────────
export default function PulsePage() {
  const [selectedZip, setSelectedZip] = useState<string | null>(null);
  const mapSectionRef = useRef<HTMLDivElement>(null);

  const handleZipSelect = useCallback((zip: string) => {
    setSelectedZip(zip);
    // Scroll to map/detail panel so user sees the result
    setTimeout(() => {
      mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  // Fetch overview
  const { data: overview, isLoading: overviewLoading } = useQuery<OverviewData>({
    queryKey: ["/api/pulse/overview"],
    staleTime: 1000 * 60 * 10, // 10 min
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
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
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
                  Austin Metro market intelligence — real-time data from the MLS
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

        {/* Hero Stats */}
        <HeroStatsBar data={overview} isLoading={overviewLoading} />

        {/* Map + Detail Panel */}
        <div ref={mapSectionRef} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={selectedZip ? "lg:col-span-2" : "lg:col-span-3"}>
            <PulseMap
              zipData={zipData}
              isLoading={heatmapLoading}
              onZipSelect={handleZipSelect}
              selectedZip={selectedZip}
            />
          </div>
          {selectedZip && (
            <div className="lg:col-span-1">
              <ZipDetailPanel
                zipCode={selectedZip}
                overviewData={overview}
                onClose={() => setSelectedZip(null)}
              />
            </div>
          )}
        </div>

        {/* Market Trends */}
        <MarketTrends
          trends={trendsData?.trends}
          isLoading={trendsLoading}
        />

        {/* Neighborhood Explorer */}
        <NeighborhoodExplorer
          zipData={zipData}
          onZipSelect={handleZipSelect}
        />
      </div>
    </Layout>
  );
}
