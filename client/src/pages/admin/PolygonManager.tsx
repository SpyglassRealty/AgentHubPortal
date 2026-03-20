import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin,
  Pencil,
  Trash2,
  Save,
  Loader2,
  Map,
  Eye,
  EyeOff,
  Search,
} from "lucide-react";

// Fix Leaflet default marker icon issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface CommunityPolygon {
  id: number;
  slug: string;
  name: string;
  locationType: string;
  filterValue: string | null;
  polygon: [number, number][] | null;
  centroid: { lat: number; lng: number } | null;
  published: boolean;
  county: string | null;
  livebyLocationId: number | null;
}

interface LiveByLocation {
  locationId: number;
  name: string;
  type: string;
  subType?: string;
  address?: string;
  map: [number, number][];
  size?: number;
}

function calculateCentroid(polygon: [number, number][]): { lat: number; lng: number } {
  if (!polygon || polygon.length === 0) return { lat: 30.2672, lng: -97.7431 };
  let lngSum = 0;
  let latSum = 0;
  for (const [lng, lat] of polygon) {
    lngSum += lng;
    latSum += lat;
  }
  return {
    lng: lngSum / polygon.length,
    lat: latSum / polygon.length,
  };
}

export default function PolygonManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup>(new L.FeatureGroup());
  const polygonLayersRef = useRef<L.FeatureGroup>(new L.FeatureGroup());
  const [mapReady, setMapReady] = useState(false);
  const [showExistingPolygons, setShowExistingPolygons] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [vertexCount, setVertexCount] = useState(0);
  const activeDrawHandlerRef = useRef<any>(null);

  const [selectedCommunityId, setSelectedCommunityId] = useState<number | null>(null);
  const polygonLayerMapRef = useRef<Record<number, L.Polygon>>({});
  const [editingCommunity, setEditingCommunity] = useState<CommunityPolygon | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CommunityPolygon | null>(null);
  const [drawnPolygon, setDrawnPolygon] = useState<[number, number][] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [livebySearchQuery, setLivebySearchQuery] = useState("");
  const [livebyResults, setLivebyResults] = useState<LiveByLocation[]>([]);
  const [selectedLivebyLocation, setSelectedLivebyLocation] = useState<LiveByLocation | null>(null);

  // Save form state
  const [saveName, setSaveName] = useState("");
  const [saveSlug, setSaveSlug] = useState("");
  const [saveLocationType, setSaveLocationType] = useState<string>("polygon");
  const [saveFilterValue, setSaveFilterValue] = useState("");

  // Fetch communities with polygons
  const { data: communities = [], isLoading } = useQuery<CommunityPolygon[]>({
    queryKey: ["/api/admin/communities/with-polygons"],
    queryFn: async () => {
      const res = await fetch("/api/admin/communities/with-polygons", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch communities");
      return res.json();
    },
  });

  // Save polygon mutation
  const saveMutation = useMutation({
    mutationFn: async (data: {
      id?: number;
      name: string;
      slug: string;
      locationType: string;
      filterValue?: string;
      polygon: [number, number][];
      centroid: { lat: number; lng: number };
      livebyLocationId?: number;
    }) => {
      const url = data.id
        ? `/api/admin/communities/${data.id}/polygon`
        : "/api/admin/communities/polygon";
      const method = data.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save polygon");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/communities/with-polygons"] });
      toast({ title: "Polygon saved successfully" });
      setShowSaveDialog(false);
      resetForm();
      // Clear drawn items from map
      drawnItemsRef.current.clearLayers();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete polygon mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/communities/${id}/polygon`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete polygon");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/communities/with-polygons"] });
      toast({ title: "Polygon deleted" });
      setDeleteTarget(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [30.2672, -97.7431],
      zoom: 10,
      zoomControl: true,
    });

    // OpenStreetMap tiles — free, no API key
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add layers for drawn items and community polygons
    drawnItemsRef.current.addTo(map);
    polygonLayersRef.current.addTo(map);

    // Disable leaflet-draw's "two clicks in same spot = finish" detection.
    // Users finish by clicking the first vertex or the toolbar "Finish" button.
    const origTwoClick = (L.Draw as any).Polyline?.prototype?._isCurrentlyTwoClickDrawing;
    if ((L.Draw as any).Polyline?.prototype) {
      (L.Draw as any).Polyline.prototype._isCurrentlyTwoClickDrawing = function () {
        return false;
      };
    }

    // Set up Leaflet Draw
    const drawControl = new L.Control.Draw({
      position: "topleft",
      draw: {
        polygon: {
          allowIntersection: true,
          showArea: true,
          shapeOptions: {
            color: "#3b82f6",
            weight: 2,
            fillOpacity: 0.2,
          },
          icon: new L.DivIcon({
            iconSize: new L.Point(10, 10),
            className: "leaflet-div-icon leaflet-editing-icon",
          }),
        },
        polyline: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
      },
      edit: {
        featureGroup: drawnItemsRef.current,
        remove: true,
      },
    });

    map.addControl(drawControl);
    drawControlRef.current = drawControl;

    // Track drawing state and disable double-click zoom while drawing
    map.on(L.Draw.Event.DRAWSTART, () => {
      map.doubleClickZoom.disable();
      setIsDrawing(true);
      setVertexCount(0);
      // Grab the active polygon handler from the draw control's internal handlers
      const toolbar = (drawControl as any)._toolbars?.draw;
      if (toolbar) {
        const handlers = toolbar._modes || {};
        for (const key of Object.keys(handlers)) {
          const mode = handlers[key];
          if (mode?.handler?._enabled) {
            activeDrawHandlerRef.current = mode.handler;
            break;
          }
        }
      }
    });
    map.on(L.Draw.Event.DRAWSTOP, () => {
      map.doubleClickZoom.enable();
      setIsDrawing(false);
      setVertexCount(0);
      activeDrawHandlerRef.current = null;
    });
    map.on(L.Draw.Event.DRAWVERTEX, () => {
      setVertexCount((c) => c + 1);
    });

    // Handle draw:created event
    map.on(L.Draw.Event.CREATED, (e: any) => {
      const layer = e.layer as L.Polygon;
      drawnItemsRef.current.clearLayers();
      drawnItemsRef.current.addLayer(layer);

      // Extract coordinates as [lng, lat][] (DB format)
      const latLngs = layer.getLatLngs()[0] as L.LatLng[];
      const polygon: [number, number][] = latLngs.map((ll) => [ll.lng, ll.lat]);
      setDrawnPolygon(polygon);
      setShowSaveDialog(true);
    });

    // Handle draw:edited event
    map.on(L.Draw.Event.EDITED, (e: any) => {
      const layers = e.layers;
      layers.eachLayer((layer: any) => {
        if (layer instanceof L.Polygon) {
          const latLngs = layer.getLatLngs()[0] as L.LatLng[];
          const polygon: [number, number][] = latLngs.map((ll) => [ll.lng, ll.lat]);
          setDrawnPolygon(polygon);
        }
      });
    });

    setMapReady(true);
    mapRef.current = map;

    return () => {
      // Restore original two-click detection if it existed
      if (origTwoClick && (L.Draw as any).Polyline?.prototype) {
        (L.Draw as any).Polyline.prototype._isCurrentlyTwoClickDrawing = origTwoClick;
      }
      map.remove();
      mapRef.current = null;
      drawControlRef.current = null;
    };
  }, []);

  // Toggle existing polygon layer visibility
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;
    if (showExistingPolygons) {
      if (!map.hasLayer(polygonLayersRef.current)) {
        polygonLayersRef.current.addTo(map);
      }
    } else {
      if (map.hasLayer(polygonLayersRef.current)) {
        map.removeLayer(polygonLayersRef.current);
      }
    }
  }, [showExistingPolygons, mapReady]);

  // Render existing polygons on map
  useEffect(() => {
    if (!mapRef.current || !mapReady || !communities.length) return;

    // Clear previous community polygon layers
    polygonLayersRef.current.clearLayers();
    polygonLayerMapRef.current = {};

    communities.forEach((community) => {
      if (!community.polygon || community.polygon.length < 3) return;

      // Convert [lng, lat][] to [lat, lng][] for Leaflet
      const latLngs: L.LatLngExpression[] = community.polygon.map(
        ([lng, lat]) => [lat, lng] as [number, number]
      );

      const color = community.published ? "#3b82f6" : "#8b5cf6";
      const borderColor = community.published ? "#2563eb" : "#7c3aed";

      const poly = L.polygon(latLngs, {
        color: borderColor,
        fillColor: color,
        fillOpacity: community.published ? 0.2 : 0.3,
        weight: 2,
      });

      poly.bindPopup(
        `<div class="p-2"><strong>${community.name}</strong><br/><span style="font-size:12px;color:#666">${community.locationType} · ${community.polygon.length} points</span></div>`
      );

      poly.bindTooltip(community.name, { sticky: true, opacity: 0.8 });

      polygonLayersRef.current.addLayer(poly);
      polygonLayerMapRef.current[community.id] = poly;
    });
  }, [communities, mapReady]);

  const resetForm = () => {
    setSaveName("");
    setSaveSlug("");
    setSaveLocationType("polygon");
    setSaveFilterValue("");
    setDrawnPolygon(null);
    setEditingCommunity(null);
    setSelectedLivebyLocation(null);
    setLivebySearchQuery("");
    setLivebyResults([]);
  };

  // LiveBy search with debouncing
  useEffect(() => {
    if (livebySearchQuery.trim().length < 2) {
      setLivebyResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/liveby/autocomplete?search=${encodeURIComponent(livebySearchQuery)}`, {
          credentials: "include",
        });
        if (res.ok) {
          const results = await res.json();
          setLivebyResults(results);
        }
      } catch (error) {
        console.error("LiveBy search error:", error);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [livebySearchQuery]);

  const handleLiveBySelect = (location: LiveByLocation) => {
    setSelectedLivebyLocation(location);
    setLivebyResults([]);
    setLivebySearchQuery(location.name);
    
    // Auto-populate form with LiveBy data
    setSaveName(location.name);
    setSaveSlug(location.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
    
    // Set polygon from map data
    if (location.map && location.map.length >= 3) {
      setDrawnPolygon(location.map);
      
      // Center map on polygon if we have the map reference
      if (mapRef.current && location.map.length > 0) {
        const bounds = L.latLngBounds(location.map.map(([lng, lat]) => [lat, lng]));
        mapRef.current.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  };

  const handleFinishDrawing = useCallback(() => {
    const handler = activeDrawHandlerRef.current;
    if (handler && typeof handler._finishShape === "function") {
      try {
        handler._finishShape();
      } catch {
        // If _finishShape fails, try completing via completeShape
        if (typeof handler.completeShape === "function") {
          handler.completeShape();
        }
      }
    }
  }, []);

  const handleSave = () => {
    if (!drawnPolygon || drawnPolygon.length < 3) {
      toast({ title: "Error", description: "Draw at least 3 points", variant: "destructive" });
      return;
    }
    if (!saveName.trim()) {
      toast({ title: "Error", description: "Name is required", variant: "destructive" });
      return;
    }

    const slug = (saveSlug.trim() || saveName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const centroid = calculateCentroid(drawnPolygon);

    saveMutation.mutate({
      id: editingCommunity?.id,
      name: saveName.trim(),
      slug,
      locationType: saveLocationType,
      filterValue: saveFilterValue || undefined,
      polygon: drawnPolygon,
      centroid,
      livebyLocationId: selectedLivebyLocation?.locationId,
    });
  };

  const handleEdit = (community: CommunityPolygon) => {
    if (!mapRef.current || !community.polygon) return;

    setEditingCommunity(community);
    setSaveName(community.name);
    setSaveSlug(community.slug);
    setSaveLocationType(community.locationType);
    setSaveFilterValue(community.filterValue || "");

    // Clear previously drawn items and load this polygon for editing
    drawnItemsRef.current.clearLayers();

    // Convert [lng, lat][] to [lat, lng][] for Leaflet
    const latLngs: L.LatLngExpression[] = community.polygon.map(
      ([lng, lat]) => [lat, lng] as [number, number]
    );

    const editPoly = L.polygon(latLngs, {
      color: "#f59e0b",
      fillColor: "#f59e0b",
      fillOpacity: 0.3,
      weight: 3,
    });

    drawnItemsRef.current.addLayer(editPoly);
    setDrawnPolygon(community.polygon);
    setShowSaveDialog(true);

    // Fly to polygon
    if (community.centroid) {
      mapRef.current.flyTo([community.centroid.lat, community.centroid.lng], 13);
    } else {
      mapRef.current.fitBounds(editPoly.getBounds(), { padding: [40, 40] });
    }
  };

  const handleFlyTo = (community: CommunityPolygon) => {
    if (!mapRef.current) return;

    // Reset previous selection
    if (selectedCommunityId !== null) {
      const prevPoly = polygonLayerMapRef.current[selectedCommunityId];
      const prevCommunity = communities.find(c => c.id === selectedCommunityId);
      if (prevPoly && prevCommunity) {
        const color = prevCommunity.published ? "#3b82f6" : "#8b5cf6";
        const borderColor = prevCommunity.published ? "#2563eb" : "#7c3aed";
        prevPoly.setStyle({ color: borderColor, fillColor: color, fillOpacity: prevCommunity.published ? 0.2 : 0.3, weight: 2 });
      }
    }

    // Highlight selected polygon
    const poly = polygonLayerMapRef.current[community.id];
    if (poly) {
      poly.setStyle({ color: "#ea580c", fillColor: "#f97316", fillOpacity: 0.5, weight: 3 });
    }
    setSelectedCommunityId(community.id);

    if (community.centroid) {
      mapRef.current.flyTo([community.centroid.lat, community.centroid.lng], 13);
    } else if (community.polygon && community.polygon.length >= 3) {
      const latLngs: L.LatLngExpression[] = community.polygon.map(
        ([lng, lat]) => [lat, lng] as [number, number]
      );
      mapRef.current.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40] });
    }
  };

  const filteredCommunities = communities.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.county || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex gap-4 h-[calc(100vh-180px)]">
      {/* Sidebar */}
      <div className="w-80 flex flex-col shrink-0">
        <Card className="flex flex-col flex-1 overflow-hidden">
          <CardHeader className="pb-3 shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5" />
                Community Polygons
              </CardTitle>
              <Badge variant="secondary">{communities.length}</Badge>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search communities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredCommunities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm px-4">
                  {searchQuery ? "No matching communities" : "No polygons saved yet. Draw one on the map!"}
                </div>
              ) : (
                <div className="space-y-1 p-3">
                  {filteredCommunities.map((community) => (
                    <div
                      key={community.id}
                      className={`flex items-center gap-2 p-2.5 rounded-lg hover:bg-muted/60 group transition-colors ${selectedCommunityId === community.id ? 'bg-orange-50 ring-1 ring-orange-300' : ''}`}
                    >
                      <div
                        className="flex-1 cursor-pointer min-w-0"
                        onClick={() => handleFlyTo(community)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{community.name}</span>
                          {community.published ? (
                            <Eye className="h-3 w-3 text-green-500 shrink-0" />
                          ) : (
                            <EyeOff className="h-3 w-3 text-muted-foreground shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {community.locationType}
                          </Badge>
                          {community.polygon && (
                            <span className="text-[10px] text-muted-foreground">
                              {community.polygon.length} pts
                            </span>
                          )}
                          {community.county && (
                            <span className="text-[10px] text-muted-foreground">
                              {community.county}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleEdit(community)}
                          title="Edit polygon"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(community)}
                          title="Delete polygon"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <div className="flex-1 rounded-xl overflow-hidden border relative">
        <div ref={mapContainerRef} className="h-full w-full" />

        {/* Map controls overlay */}
        {mapReady && (
          <>
            <div className="absolute top-4 right-4 z-[1000]">
              <Button
                variant={showExistingPolygons ? "default" : "outline"}
                size="sm"
                onClick={() => setShowExistingPolygons(!showExistingPolygons)}
                className="shadow-md bg-white/90 backdrop-blur-sm hover:bg-white text-gray-700 border"
              >
                {showExistingPolygons ? (
                  <Eye className="h-4 w-4 mr-2" />
                ) : (
                  <EyeOff className="h-4 w-4 mr-2" />
                )}
                {showExistingPolygons ? "Hide Polygons" : "Show Polygons"}
              </Button>
            </div>
            {/* Finish Drawing button — shown while actively drawing with 3+ points */}
            {isDrawing && vertexCount >= 3 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
                <Button
                  onClick={handleFinishDrawing}
                  className="shadow-lg bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 text-sm animate-pulse"
                  size="lg"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Finish Drawing ({vertexCount} points)
                </Button>
              </div>
            )}
            {isDrawing && vertexCount < 3 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 shadow-md">
                  <p className="text-sm text-amber-800 font-medium">
                    Click to place points — need {3 - vertexCount} more to finish
                  </p>
                </div>
              </div>
            )}
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-md z-[1000]">
              <p className="text-xs text-gray-600">
                <strong>Draw:</strong> Click the polygon tool ▢ on the left, then click to place points.{" "}
                <strong>Finish:</strong> Click the green button, the first point, or use the toolbar "Finish" link.{" "}
                <strong>Edit:</strong> Click a saved polygon in the sidebar.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={(open) => {
        if (!open) {
          setShowSaveDialog(false);
          if (!editingCommunity) {
            drawnItemsRef.current.clearLayers();
            resetForm();
          }
        }
      }}>
        <DialogContent className="z-[9999]">
          <DialogHeader>
            <DialogTitle>
              {editingCommunity ? `Edit: ${editingCommunity.name}` : "Save Community Polygon"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* LiveBy Search Section */}
            <div>
              <Label>Search LiveBy Boundaries</Label>
              <div className="relative mt-1">
                <Input
                  value={livebySearchQuery}
                  onChange={(e) => setLivebySearchQuery(e.target.value)}
                  placeholder="Search neighborhoods, cities..."
                  className="pr-10"
                />
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                {livebyResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                    {livebyResults.map((result) => (
                      <div
                        key={result.locationId}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                        onClick={() => handleLiveBySelect(result)}
                      >
                        <div className="font-medium">{result.name}</div>
                        <div className="text-sm text-gray-500">
                          {result.type}{result.subType && ` • ${result.subType}`}
                          {result.address && ` • ${result.address}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedLivebyLocation && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="text-sm font-medium text-blue-900">✓ LiveBy Location Selected</div>
                  <div className="text-xs text-blue-700">
                    {selectedLivebyLocation.name} • ID: {selectedLivebyLocation.locationId}
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Search LiveBy to auto-populate polygon data, or draw manually below
              </p>
            </div>

            <div className="border-t pt-4">
              <Label className="text-sm text-gray-500">Manual Entry (fallback)</Label>
            </div>

            <div>
              <Label>Name *</Label>
              <Input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g., Westlake Hills"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                value={saveSlug}
                onChange={(e) => setSaveSlug(e.target.value)}
                placeholder="Auto-generated from name"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave blank to auto-generate from name
              </p>
            </div>
            <div>
              <Label>Location Type</Label>
              <Select value={saveLocationType} onValueChange={setSaveLocationType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="polygon">Polygon</SelectItem>
                  <SelectItem value="zip">ZIP Code</SelectItem>
                  <SelectItem value="city">City</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(saveLocationType === "zip" || saveLocationType === "city") && (
              <div>
                <Label>{saveLocationType === "zip" ? "ZIP Code" : "City Name"}</Label>
                <Input
                  value={saveFilterValue}
                  onChange={(e) => setSaveFilterValue(e.target.value)}
                  placeholder={saveLocationType === "zip" ? "e.g., 78746" : "e.g., Bastrop"}
                  className="mt-1"
                />
              </div>
            )}
            {drawnPolygon && (
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Polygon Data</p>
                <p className="text-xs text-muted-foreground">
                  {drawnPolygon.length} coordinate points
                </p>
                <p className="text-xs text-muted-foreground">
                  Centroid: {calculateCentroid(drawnPolygon).lat.toFixed(4)},{" "}
                  {calculateCentroid(drawnPolygon).lng.toFixed(4)}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSaveDialog(false);
                if (!editingCommunity) {
                  drawnItemsRef.current.clearLayers();
                  resetForm();
                }
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {editingCommunity ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="z-[9999]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Polygon</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the polygon for "{deleteTarget?.name}"? This will only
              clear the polygon data, not delete the community.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
