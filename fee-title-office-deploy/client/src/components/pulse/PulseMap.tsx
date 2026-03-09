import { useState, useEffect, useRef, useCallback } from "react";
import { Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "@/contexts/ThemeContext";
import { getLayerById, formatLayerValue } from "./data-layers";
import type { ZipHeatmapItem, DataLayer } from "./types";

// Mapbox access token will be fetched from API

interface PulseMapProps {
  zipData: ZipHeatmapItem[];
  isLoading: boolean;
  onZipSelect: (zip: string) => void;
  selectedZip: string | null;
  selectedLayerId: string;
}

// Color scale that adapts to data layer
function getMarkerColor(value: number, layer: DataLayer): string {
  switch (layer.unit) {
    case "currency":
      if (value <= 300_000) return "#22c55e";
      if (value <= 500_000) return "#84cc16";
      if (value <= 700_000) return "#eab308";
      if (value <= 1_000_000) return "#f97316";
      return "#ef4444";
    case "percent":
      // Negative = cold/blue, positive = hot/red
      if (value <= -10) return "#3b82f6";
      if (value <= -3) return "#06b6d4";
      if (value <= 3) return "#22c55e";
      if (value <= 10) return "#f97316";
      return "#ef4444";
    case "days":
      if (value <= 15) return "#22c55e";
      if (value <= 30) return "#84cc16";
      if (value <= 60) return "#eab308";
      if (value <= 90) return "#f97316";
      return "#ef4444";
    case "score":
      if (value >= 80) return "#22c55e";
      if (value >= 60) return "#84cc16";
      if (value >= 40) return "#eab308";
      if (value >= 20) return "#f97316";
      return "#ef4444";
    case "number":
      // Population, inventory, housing units — wide range
      if (value <= 10000) return "#22c55e";
      if (value <= 25000) return "#84cc16";
      if (value <= 40000) return "#eab308";
      if (value <= 60000) return "#f97316";
      return "#ef4444";
    case "ratio":
      // Value-to-income ratio, sale-to-list
      if (value <= 3) return "#22c55e";
      if (value <= 5) return "#84cc16";
      if (value <= 7) return "#eab308";
      if (value <= 10) return "#f97316";
      return "#ef4444";
    case "temperature":
      if (value <= 60) return "#3b82f6";
      if (value <= 68) return "#22c55e";
      if (value <= 75) return "#eab308";
      return "#ef4444";
    default:
      // Generic gradient
      if (value <= 20) return "#22c55e";
      if (value <= 50) return "#84cc16";
      if (value <= 100) return "#eab308";
      if (value <= 200) return "#f97316";
      return "#ef4444";
  }
}

export default function PulseMap({
  zipData,
  isLoading,
  onZipSelect,
  selectedZip,
  selectedLayerId,
}: PulseMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Mapbox token state
  const [mapboxToken, setMapboxToken] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const prevZipCountRef = useRef<number>(0);

  const layer = getLayerById(selectedLayerId);

  // Fetch Mapbox token on component mount
  useEffect(() => {
    fetch('/api/mapbox-token')
      .then(res => res.json())
      .then(data => setMapboxToken(data.token))
      .catch(() => console.warn('Failed to load Mapbox token'));
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
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

    map.on("load", () => {
      setMapReady(true);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [isDark, mapboxToken]);

  // Auto-zoom map when zipData changes (filter applied/cleared)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !zipData.length) return;

    const prevCount = prevZipCountRef.current;
    prevZipCountRef.current = zipData.length;

    // Skip on first render (initial load) — only react to changes
    if (prevCount === 0) return;

    // If we have a filtered subset, fit bounds to show just those zips
    if (zipData.length < 20) {
      const bounds = new mapboxgl.LngLatBounds();
      zipData.forEach(item => {
        if (item.lat && item.lng) bounds.extend([item.lng, item.lat]);
      });
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 80, maxZoom: 13, duration: 800 });
      }
    } else {
      // Reset to default Austin metro view
      map.flyTo({ center: [-97.7431, 30.2672], zoom: 10, duration: 800 });
    }
  }, [zipData, mapReady]);

  // Update markers when data changes or map becomes ready
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !zipData.length || !layer) return;

    const updateMarkers = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      zipData.forEach((item) => {
        if (!item.lat || !item.lng) return;

        // Use V2 layerValue when available, fall back to medianPrice
        const hasLayerValue = item.layerValue != null && item.layerValue !== 0;
        const value = hasLayerValue ? item.layerValue! : item.medianPrice;
        const hasPrice = value > 0 || hasLayerValue;
        const displayValue = hasPrice ? value : item.count;
        const color = hasPrice ? getMarkerColor(value, layer) : "#6b7280";
        // Size: adapt based on the unit type
        let size: number;
        if (!hasPrice) {
          size = Math.max(22, Math.min(36, 22 + item.count * 0.5));
        } else if (layer.unit === "currency") {
          size = Math.max(24, Math.min(48, 24 + (value / 1_000_000) * 25));
        } else {
          // Non-currency layers: uniform bubble size
          size = 32;
        }
        const isSelected = selectedZip === item.zip;

        const el = document.createElement("div");
        el.style.cssText = `
          width: ${size}px;
          height: ${size}px;
          background: ${color};
          border: ${isSelected ? "3px solid #EF4923" : "2px solid rgba(255,255,255,0.7)"};
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${Math.max(8, size * 0.26)}px;
          font-weight: 700;
          color: #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
          ${isSelected ? "scale: 1.25; box-shadow: 0 4px 16px rgba(239,73,35,0.5); z-index: 10;" : ""}
        `;

        // Label: prefer V2 label (pre-formatted by backend), fall back to local formatting
        if (hasLayerValue && item.layerLabel) {
          el.textContent = item.layerLabel;
        } else if (hasPrice && layer) {
          el.textContent = formatLayerValue(value, layer);
        } else if (hasPrice) {
          el.textContent = `$${Math.round(value / 1000)}K`;
        } else {
          el.textContent = `${item.count}`;
        }

        el.addEventListener("mouseenter", () => {
          if (selectedZip !== item.zip) {
            el.style.scale = "1.15";
            el.style.boxShadow = "0 4px 12px rgba(0,0,0,0.4)";
          }
        });
        el.addEventListener("mouseleave", () => {
          if (selectedZip !== item.zip) {
            el.style.scale = "1";
            el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
          }
        });

        // Use pointerup instead of click — Mapbox Marker can swallow click events
        el.addEventListener("pointerup", (e) => {
          e.stopPropagation();
          onZipSelect(item.zip);
        });
        el.style.pointerEvents = "auto";
        el.style.cursor = "pointer";

        const marker = new mapboxgl.Marker({ element: el, draggable: false, anchor: "center" })
          .setLngLat([item.lng, item.lat])
          .addTo(map);
        markersRef.current.push(marker);
      });
    };

    updateMarkers();
  }, [zipData, selectedLayerId, selectedZip, onZipSelect, layer, mapReady]);

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border border-border">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-3 border-[#EF4923] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading map data...</p>
          </div>
        </div>
      )}

      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Dynamic Legend */}
      <div className="absolute bottom-3 left-3 bg-card/90 backdrop-blur-md rounded-lg p-2.5 border border-border shadow-lg text-[10px]">
        <p className="font-semibold mb-1.5 text-muted-foreground flex items-center gap-1">
          <Layers className="h-3 w-3" />
          {layer?.label || "Data Layer"}
        </p>
        <div className="flex items-center gap-1.5">
          <LegendDots layerUnit={layer?.unit || "currency"} />
        </div>
      </div>
    </div>
  );
}

function LegendDots({ layerUnit }: { layerUnit: string }) {
  switch (layerUnit) {
    case "currency":
      return (
        <>
          <Dot color="#22c55e" label="<$300K" />
          <Dot color="#eab308" label="$500K" />
          <Dot color="#ef4444" label=">$1M" />
        </>
      );
    case "percent":
      return (
        <>
          <Dot color="#3b82f6" label="<-10%" />
          <Dot color="#22c55e" label="~0%" />
          <Dot color="#ef4444" label=">10%" />
        </>
      );
    case "days":
      return (
        <>
          <Dot color="#22c55e" label="<15d" />
          <Dot color="#eab308" label="30-60d" />
          <Dot color="#ef4444" label=">90d" />
        </>
      );
    case "score":
      return (
        <>
          <Dot color="#ef4444" label="0-20" />
          <Dot color="#eab308" label="40-60" />
          <Dot color="#22c55e" label="80-100" />
        </>
      );
    case "number":
      return (
        <>
          <Dot color="#22c55e" label="Low" />
          <Dot color="#84cc16" label="" />
          <Dot color="#eab308" label="Med" />
          <Dot color="#f97316" label="" />
          <Dot color="#ef4444" label="High" />
        </>
      );
    case "ratio":
      return (
        <>
          <Dot color="#22c55e" label="Low" />
          <Dot color="#eab308" label="Mid" />
          <Dot color="#ef4444" label="High" />
        </>
      );
    case "temperature":
      return (
        <>
          <Dot color="#3b82f6" label="Cold" />
          <Dot color="#22c55e" label="Mild" />
          <Dot color="#ef4444" label="Hot" />
        </>
      );
    default:
      return (
        <>
          <Dot color="#22c55e" label="Low" />
          <Dot color="#eab308" label="Med" />
          <Dot color="#ef4444" label="High" />
        </>
      );
  }
}

function Dot({ color, label }: { color: string; label: string }) {
  return (
    <>
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      <span>{label}</span>
    </>
  );
}
