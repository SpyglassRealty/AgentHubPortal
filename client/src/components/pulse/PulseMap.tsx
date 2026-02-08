import { useState, useEffect, useRef, useCallback } from "react";
import { Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "@/contexts/ThemeContext";
import { getLayerById, formatLayerValue } from "./data-layers";
import type { ZipHeatmapItem, DataLayer } from "./types";

const MAPBOX_TOKEN =
  "pk.eyJ1Ijoic3B5Z2xhc3NyZWFsdHkiLCJhIjoiY21sYmJjYjR5MG5teDNkb29oYnlldGJ6bCJ9.h6al6oHtIP5YiiIW97zhDw";

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

  const layer = getLayerById(selectedLayerId);

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

  // Update markers when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !zipData.length || !layer) return;

    const updateMarkers = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      zipData.forEach((item) => {
        if (!item.lat || !item.lng) return;

        // Use medianPrice as the default value for now; the real API would
        // provide per-layer values
        const value = item.medianPrice;
        const color = getMarkerColor(value, layer);
        const size = Math.max(20, Math.min(48, 20 + (value / 1_000_000) * 25));
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
          ${isSelected ? "transform: scale(1.25); box-shadow: 0 4px 16px rgba(239,73,35,0.5); z-index: 10;" : ""}
        `;

        // Label: show the formatted layer value
        el.textContent = layer ? formatLayerValue(value, layer) : "";

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
                  <div>Median: <strong>$${item.medianPrice.toLocaleString()}</strong></div>
                  <div>Avg DOM: <strong>${item.avgDom} days</strong></div>
                </div>
                <div style="margin-top: 6px; font-size: 11px; color: #EF4923; font-weight: 600;">
                  View details →
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
  }, [zipData, selectedLayerId, selectedZip, onZipSelect, layer]);

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
