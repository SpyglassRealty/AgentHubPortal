import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
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
  Plus,
  Save,
  Loader2,
  Map,
  Eye,
  EyeOff,
  Search,
} from "lucide-react";

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
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const [mapboxToken, setMapboxToken] = useState("");
  const [mapReady, setMapReady] = useState(false);

  const [editingCommunity, setEditingCommunity] = useState<CommunityPolygon | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CommunityPolygon | null>(null);
  const [drawnPolygon, setDrawnPolygon] = useState<[number, number][] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Save form state
  const [saveName, setSaveName] = useState("");
  const [saveSlug, setSaveSlug] = useState("");
  const [saveLocationType, setSaveLocationType] = useState<string>("polygon");
  const [saveFilterValue, setSaveFilterValue] = useState("");

  // Fetch mapbox token
  useEffect(() => {
    fetch("/api/mapbox-token")
      .then((res) => res.json())
      .then((data) => setMapboxToken(data.token))
      .catch(() => console.warn("Failed to load Mapbox token"));
  }, []);

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
      // Clear drawn polygon from map
      if (drawRef.current) {
        drawRef.current.deleteAll();
      }
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
    if (!mapContainerRef.current || mapRef.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [-97.7431, 30.2672],
      zoom: 10,
    });

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      defaultMode: "simple_select",
    });

    map.addControl(draw);
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("draw.create", (e: any) => {
      const coords = e.features[0]?.geometry?.coordinates?.[0];
      if (coords) {
        // Convert to [lng, lat][] format (remove closing duplicate point)
        const polygon: [number, number][] = coords.slice(0, -1).map((c: number[]) => [c[0], c[1]]);
        setDrawnPolygon(polygon);
        setShowSaveDialog(true);
      }
    });

    map.on("draw.update", (e: any) => {
      const coords = e.features[0]?.geometry?.coordinates?.[0];
      if (coords) {
        const polygon: [number, number][] = coords.slice(0, -1).map((c: number[]) => [c[0], c[1]]);
        setDrawnPolygon(polygon);
      }
    });

    map.on("load", () => {
      setMapReady(true);
    });

    mapRef.current = map;
    drawRef.current = draw;

    return () => {
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
    };
  }, [mapboxToken]);

  // Render existing polygons on map
  useEffect(() => {
    if (!mapRef.current || !mapReady || !communities.length) return;

    const map = mapRef.current;

    // Remove previous polygon layers/sources
    communities.forEach((_, i) => {
      const layerId = `community-polygon-${i}`;
      const outlineId = `community-polygon-outline-${i}`;
      const sourceId = `community-polygon-source-${i}`;
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getLayer(outlineId)) map.removeLayer(outlineId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    });

    // Also remove any stale layers from previous renders
    const style = map.getStyle();
    if (style?.layers) {
      style.layers.forEach((layer) => {
        if (layer.id.startsWith("community-polygon-")) {
          map.removeLayer(layer.id);
        }
      });
    }
    if (style?.sources) {
      Object.keys(style.sources).forEach((sourceId) => {
        if (sourceId.startsWith("community-polygon-source-")) {
          map.removeSource(sourceId);
        }
      });
    }

    communities.forEach((community, i) => {
      if (!community.polygon || community.polygon.length < 3) return;

      const sourceId = `community-polygon-source-${i}`;
      const layerId = `community-polygon-${i}`;
      const outlineId = `community-polygon-outline-${i}`;

      // Close the polygon ring
      const coords = [...community.polygon, community.polygon[0]];

      map.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: { name: community.name, id: community.id },
          geometry: {
            type: "Polygon",
            coordinates: [coords],
          },
        },
      });

      map.addLayer({
        id: layerId,
        type: "fill",
        source: sourceId,
        paint: {
          "fill-color": community.published ? "#3b82f6" : "#9ca3af",
          "fill-opacity": 0.2,
        },
      });

      map.addLayer({
        id: outlineId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": community.published ? "#2563eb" : "#6b7280",
          "line-width": 2,
        },
      });

      // Add popup on click
      map.on("click", layerId, (e: any) => {
        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(
            `<div class="p-2"><strong>${community.name}</strong><br/><span class="text-xs text-gray-500">${community.locationType} · ${community.polygon?.length || 0} points</span></div>`
          )
          .addTo(map);
      });

      map.on("mouseenter", layerId, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", layerId, () => {
        map.getCanvas().style.cursor = "";
      });
    });
  }, [communities, mapReady]);

  const resetForm = () => {
    setSaveName("");
    setSaveSlug("");
    setSaveLocationType("polygon");
    setSaveFilterValue("");
    setDrawnPolygon(null);
    setEditingCommunity(null);
  };

  const handleSave = () => {
    if (!drawnPolygon || drawnPolygon.length < 3) {
      toast({ title: "Error", description: "Draw at least 3 points", variant: "destructive" });
      return;
    }
    if (!saveName.trim()) {
      toast({ title: "Error", description: "Name is required", variant: "destructive" });
      return;
    }

    const slug = saveSlug.trim() || saveName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const centroid = calculateCentroid(drawnPolygon);

    saveMutation.mutate({
      id: editingCommunity?.id,
      name: saveName.trim(),
      slug,
      locationType: saveLocationType,
      filterValue: saveFilterValue || undefined,
      polygon: drawnPolygon,
      centroid,
    });
  };

  const handleEdit = (community: CommunityPolygon) => {
    if (!drawRef.current || !community.polygon) return;

    setEditingCommunity(community);
    setSaveName(community.name);
    setSaveSlug(community.slug);
    setSaveLocationType(community.locationType);
    setSaveFilterValue(community.filterValue || "");

    // Load polygon into draw
    drawRef.current.deleteAll();
    const coords = [...community.polygon, community.polygon[0]];
    const featureId = drawRef.current.add({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [coords],
      },
    });

    setDrawnPolygon(community.polygon);
    setShowSaveDialog(true);

    // Fly to polygon
    if (community.centroid) {
      mapRef.current?.flyTo({
        center: [community.centroid.lng, community.centroid.lat],
        zoom: 13,
      });
    }

    // Switch to edit mode
    if (featureId[0]) {
      drawRef.current.changeMode("direct_select", { featureId: featureId[0] });
    }
  };

  const handleFlyTo = (community: CommunityPolygon) => {
    if (!community.centroid || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [community.centroid.lng, community.centroid.lat],
      zoom: 13,
    });
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
                      className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-muted/60 group transition-colors"
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
        {!mapboxToken ? (
          <div className="h-full flex items-center justify-center bg-muted">
            <div className="text-center text-muted-foreground">
              <Map className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">Loading map...</p>
              <p className="text-sm">Fetching Mapbox token</p>
            </div>
          </div>
        ) : (
          <div ref={mapContainerRef} className="h-full w-full" />
        )}

        {/* Map instructions overlay */}
        {mapReady && (
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-md">
            <p className="text-xs text-gray-600">
              <strong>Draw:</strong> Click the polygon tool ▢ to draw a community boundary.{" "}
              <strong>Edit:</strong> Click a saved polygon in the sidebar.
            </p>
          </div>
        )}
      </div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={(open) => {
        if (!open) {
          setShowSaveDialog(false);
          if (!editingCommunity) {
            drawRef.current?.deleteAll();
            resetForm();
          }
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCommunity ? `Edit: ${editingCommunity.name}` : "Save Community Polygon"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
                  drawRef.current?.deleteAll();
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
        <AlertDialogContent>
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
