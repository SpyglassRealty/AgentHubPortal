import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Save,
  Search,
  Plus,
  X,
  Home,
  Building2,
  DollarSign,
  BedDouble,
  Bath,
  Ruler,
  MapPin,
  FileBarChart,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Loader2,
  ImageIcon,
  ChevronDown,
  ChevronUp,
  Map,
  FileText,
  Pencil,
  MousePointer2,
  Trash2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Types
interface PropertyData {
  mlsNumber: string;
  address: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  listPrice: number;
  soldPrice?: number | null;
  beds: number;
  baths: number;
  sqft: number;
  lotSizeAcres?: number | null;
  yearBuilt?: number | null;
  propertyType: string;
  status: string;
  listDate?: string;
  soldDate?: string | null;
  daysOnMarket?: number;
  photo?: string | null;
  stories?: number | null;
  subdivision?: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface CmaData {
  id?: string;
  name: string;
  subjectProperty: PropertyData | null;
  comparableProperties: PropertyData[];
  notes: string;
  status: string;
}

interface SearchFilters {
  city: string;
  subdivision: string;
  zip: string;
  schoolDistrict: string;
  elementarySchool: string;
  middleSchool: string;
  highSchool: string;
  minBeds: string;
  minBaths: string;
  minPrice: string;
  maxPrice: string;
  propertyType: string;
  statuses: string[];
  minSqft: string;
  maxSqft: string;
  minLotAcres: string;
  maxLotAcres: string;
  stories: string;
  minYearBuilt: string;
  maxYearBuilt: string;
  search: string;
  dateSoldDays: string;
}

const defaultFilters: SearchFilters = {
  city: "",
  subdivision: "",
  zip: "",
  schoolDistrict: "",
  elementarySchool: "",
  middleSchool: "",
  highSchool: "",
  minBeds: "",
  minBaths: "",
  minPrice: "",
  maxPrice: "",
  propertyType: "",
  statuses: ["Active"],
  minSqft: "",
  maxSqft: "",
  minLotAcres: "",
  maxLotAcres: "",
  stories: "",
  minYearBuilt: "",
  maxYearBuilt: "",
  search: "",
  dateSoldDays: "180",
};

// RESO Standard Property Types
const RESO_PROPERTY_TYPES = [
  "Single Family Residence",
  "Condominium",
  "Townhouse",
  "Multi-Family",
  "Ranch",
  "Manufactured Home",
  "Unimproved Land",
  "Multiple Lots",
];

// Bed/Bath dropdown options
const BED_BATH_OPTIONS = [
  { label: "Any", value: "" },
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
  { label: "4", value: "4" },
  { label: "5", value: "5" },
  { label: "6+", value: "6" },
];

// Date Sold dropdown options
const DATE_SOLD_OPTIONS = [
  { label: "Last 90 Days", value: "90" },
  { label: "Last 120 Days", value: "120" },
  { label: "Last 150 Days", value: "150" },
  { label: "Last 180 Days", value: "180" },
  { label: "Last 360 Days", value: "360" },
];

function formatPrice(price: number | null | undefined): string {
  if (!price) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(price);
}

function formatNumber(num: number | null | undefined): string {
  if (!num) return "—";
  return new Intl.NumberFormat("en-US").format(num);
}

// Subject Property Panel
function SubjectPropertyPanel({
  subject,
  onSet,
  onClear,
}: {
  subject: PropertyData | null;
  onSet: (p: PropertyData) => void;
  onClear: () => void;
}) {
  const [mode, setMode] = useState<"search" | "manual">("search");
  const [addressSearch, setAddressSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PropertyData[]>([]);
  const [manualEntry, setManualEntry] = useState({
    streetAddress: "",
    city: "",
    state: "TX",
    zip: "",
    listPrice: "",
    beds: "",
    baths: "",
    sqft: "",
  });

  const handleAddressSearch = async () => {
    if (!addressSearch.trim()) return;
    setSearching(true);
    try {
      const res = await apiRequest("POST", "/api/cma/search-properties", {
        search: addressSearch,
        limit: 10,
      });
      const data = await res.json();
      setSearchResults(data.listings || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleManualSave = () => {
    const prop: PropertyData = {
      mlsNumber: "",
      address: `${manualEntry.streetAddress}, ${manualEntry.city}, ${manualEntry.state} ${manualEntry.zip}`,
      streetAddress: manualEntry.streetAddress,
      city: manualEntry.city,
      state: manualEntry.state,
      zip: manualEntry.zip,
      listPrice: parseInt(manualEntry.listPrice) || 0,
      beds: parseInt(manualEntry.beds) || 0,
      baths: parseInt(manualEntry.baths) || 0,
      sqft: parseInt(manualEntry.sqft) || 0,
      propertyType: "Residential",
      status: "Manual Entry",
    };
    onSet(prop);
  };

  if (subject) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Home className="h-5 w-5 text-[#EF4923]" />
              Subject Property
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClear}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {subject.photo ? (
              <img
                src={subject.photo}
                alt="Property"
                className="w-28 h-20 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-28 h-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{subject.address}</p>
              {subject.mlsNumber && (
                <p className="text-xs text-muted-foreground">MLS# {subject.mlsNumber}</p>
              )}
              <p className="text-lg font-bold text-[#EF4923] mt-1">
                {formatPrice(subject.listPrice)}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <BedDouble className="h-3 w-3" /> {subject.beds} bd
                </span>
                <span className="flex items-center gap-1">
                  <Bath className="h-3 w-3" /> {subject.baths} ba
                </span>
                <span className="flex items-center gap-1">
                  <Ruler className="h-3 w-3" /> {formatNumber(subject.sqft)} sqft
                </span>
                {subject.lotSizeAcres && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {subject.lotSizeAcres.toFixed(2)} ac
                  </span>
                )}
                {subject.yearBuilt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {subject.yearBuilt}
                  </span>
                )}
                {subject.propertyType && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> {subject.propertyType}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Home className="h-5 w-5 text-[#EF4923]" />
          Subject Property
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={mode} onValueChange={(v) => setMode(v as "search" | "manual")}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="search" className="flex-1">
              <Search className="h-4 w-4 mr-2" />
              Search by Address
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex-1">
              <Plus className="h-4 w-4 mr-2" />
              Manual Entry
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Enter property address or MLS#..."
                value={addressSearch}
                onChange={(e) => setAddressSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddressSearch()}
              />
              <Button
                onClick={handleAddressSearch}
                disabled={searching}
                className="bg-[#EF4923] hover:bg-[#d4401f] text-white"
              >
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            {searchResults.length > 0 && (
              <div className="border rounded-lg max-h-48 overflow-y-auto divide-y">
                {searchResults.map((prop, i) => (
                  <div
                    key={i}
                    className="p-2 hover:bg-muted cursor-pointer flex items-center justify-between text-sm"
                    onClick={() => {
                      onSet(prop);
                      setSearchResults([]);
                      setAddressSearch("");
                    }}
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{prop.address}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(prop.listPrice)} · {prop.beds}bd/{prop.baths}ba · {formatNumber(prop.sqft)} sqft
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" className="flex-shrink-0">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-3">
            <Input
              placeholder="Street Address"
              value={manualEntry.streetAddress}
              onChange={(e) => setManualEntry({ ...manualEntry, streetAddress: e.target.value })}
            />
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="City"
                value={manualEntry.city}
                onChange={(e) => setManualEntry({ ...manualEntry, city: e.target.value })}
              />
              <Input
                placeholder="State"
                value={manualEntry.state}
                onChange={(e) => setManualEntry({ ...manualEntry, state: e.target.value })}
              />
              <Input
                placeholder="Zip"
                value={manualEntry.zip}
                onChange={(e) => setManualEntry({ ...manualEntry, zip: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Input
                placeholder="List Price"
                type="number"
                value={manualEntry.listPrice}
                onChange={(e) => setManualEntry({ ...manualEntry, listPrice: e.target.value })}
              />
              <Input
                placeholder="Beds"
                type="number"
                value={manualEntry.beds}
                onChange={(e) => setManualEntry({ ...manualEntry, beds: e.target.value })}
              />
              <Input
                placeholder="Baths"
                type="number"
                value={manualEntry.baths}
                onChange={(e) => setManualEntry({ ...manualEntry, baths: e.target.value })}
              />
              <Input
                placeholder="Sq Ft"
                type="number"
                value={manualEntry.sqft}
                onChange={(e) => setManualEntry({ ...manualEntry, sqft: e.target.value })}
              />
            </div>
            <Button
              className="w-full bg-[#EF4923] hover:bg-[#d4401f] text-white"
              onClick={handleManualSave}
              disabled={!manualEntry.streetAddress || !manualEntry.city}
            >
              Set as Subject Property
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Comparable Properties Panel
function ComparablePropertiesPanel({
  comps,
  onRemove,
}: {
  comps: PropertyData[];
  onRemove: (index: number) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-5 w-5 text-[#EF4923]" />
          Comparable Properties
          {comps.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {comps.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {comps.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No comparables added yet.</p>
            <p className="text-xs mt-1">Search for properties below and add them here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {comps.map((comp, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                {comp.photo ? (
                  <img
                    src={comp.photo}
                    alt=""
                    className="w-16 h-12 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{comp.address}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatPrice(comp.soldPrice || comp.listPrice)}</span>
                    <span>·</span>
                    <span>{comp.beds}bd/{comp.baths}ba</span>
                    <span>·</span>
                    <span>{formatNumber(comp.sqft)} sqft</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  {comp.status}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(i)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Analysis Panel
function AnalysisPanel({
  subject,
  comps,
}: {
  subject: PropertyData | null;
  comps: PropertyData[];
}) {
  const analysis = useMemo(() => {
    if (comps.length === 0) return null;

    const prices = comps.map((c) => c.soldPrice || c.listPrice).filter(Boolean) as number[];
    const sqfts = comps.map((c) => c.sqft).filter(Boolean) as number[];
    const pricePerSqfts = comps
      .map((c) => {
        const price = c.soldPrice || c.listPrice;
        return price && c.sqft ? price / c.sqft : 0;
      })
      .filter(Boolean);
    const doms = comps.map((c) => c.daysOnMarket).filter((d) => d !== undefined && d !== null) as number[];

    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    const med = (arr: number[]) => {
      if (!arr.length) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };

    return {
      avgPrice: avg(prices),
      medPrice: med(prices),
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      avgPricePerSqft: avg(pricePerSqfts),
      medPricePerSqft: med(pricePerSqfts),
      avgSqft: avg(sqfts),
      avgDom: avg(doms),
      count: comps.length,
    };
  }, [comps]);

  if (!analysis) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#EF4923]" />
            Price Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground text-sm">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>Add comparable properties to see analysis.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const subjectPrice = subject?.listPrice || 0;
  const priceDiff = subjectPrice ? subjectPrice - analysis.avgPrice : 0;
  const priceDiffPct = subjectPrice ? ((priceDiff / analysis.avgPrice) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[#EF4923]" />
          Price Analysis
          <Badge variant="secondary" className="ml-2">
            {analysis.count} comp{analysis.count !== 1 ? "s" : ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Price comparison to subject */}
        {subject && subjectPrice > 0 && (
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-xs font-medium text-muted-foreground mb-1">Subject vs. Avg Comp Price</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{formatPrice(subjectPrice)}</span>
              <span className="text-muted-foreground">vs</span>
              <span className="text-lg font-bold">{formatPrice(analysis.avgPrice)}</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              {priceDiff > 0 ? (
                <TrendingUp className="h-4 w-4 text-red-500" />
              ) : priceDiff < 0 ? (
                <TrendingDown className="h-4 w-4 text-green-500" />
              ) : (
                <Minus className="h-4 w-4 text-gray-500" />
              )}
              <span
                className={`text-sm font-medium ${
                  priceDiff > 0 ? "text-red-500" : priceDiff < 0 ? "text-green-500" : "text-gray-500"
                }`}
              >
                {priceDiff > 0 ? "+" : ""}{formatPrice(priceDiff)} ({priceDiffPct > 0 ? "+" : ""}{priceDiffPct.toFixed(1)}%)
              </span>
              <span className="text-xs text-muted-foreground ml-1">
                {priceDiff > 0 ? "above" : priceDiff < 0 ? "below" : "at"} average
              </span>
            </div>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border">
            <p className="text-xs font-medium text-muted-foreground">Avg Price</p>
            <p className="text-base font-bold">{formatPrice(analysis.avgPrice)}</p>
          </div>
          <div className="p-3 rounded-lg border">
            <p className="text-xs font-medium text-muted-foreground">Median Price</p>
            <p className="text-base font-bold">{formatPrice(analysis.medPrice)}</p>
          </div>
          <div className="p-3 rounded-lg border">
            <p className="text-xs font-medium text-muted-foreground">Price Range</p>
            <p className="text-sm font-semibold">
              {formatPrice(analysis.minPrice)} – {formatPrice(analysis.maxPrice)}
            </p>
          </div>
          <div className="p-3 rounded-lg border">
            <p className="text-xs font-medium text-muted-foreground">Avg $/SqFt</p>
            <p className="text-base font-bold">
              ${analysis.avgPricePerSqft.toFixed(0)}
            </p>
          </div>
          <div className="p-3 rounded-lg border">
            <p className="text-xs font-medium text-muted-foreground">Median $/SqFt</p>
            <p className="text-base font-bold">
              ${analysis.medPricePerSqft.toFixed(0)}
            </p>
          </div>
          <div className="p-3 rounded-lg border">
            <p className="text-xs font-medium text-muted-foreground">Avg DOM</p>
            <p className="text-base font-bold">{analysis.avgDom.toFixed(0)} days</p>
          </div>
        </div>

        {/* Suggested value */}
        {subject && subject.sqft > 0 && (
          <div className="p-3 rounded-lg bg-[#EF4923]/5 border border-[#EF4923]/20">
            <p className="text-xs font-medium text-[#EF4923] mb-1">Suggested Value (based on $/sqft)</p>
            <p className="text-xl font-bold text-[#EF4923]">
              {formatPrice(analysis.avgPricePerSqft * subject.sqft)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ${analysis.avgPricePerSqft.toFixed(0)}/sqft × {formatNumber(subject.sqft)} sqft
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Mapbox access token
const MAPBOX_TOKEN = 'pk.eyJ1Ijoic3B5Z2xhc3NyZWFsdHkiLCJhIjoiY21sYmJjYjR5MG5teDNkb29oYnlldGJ6bCJ9.h6al6oHtIP5YiiIW97zhDw';

// Search Properties Section
function SearchPropertiesSection({
  onAddComp,
  existingMlsNumbers,
}: {
  onAddComp: (prop: PropertyData) => void;
  existingMlsNumbers: Set<string>;
}) {
  const { toast } = useToast();
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [searchResults, setSearchResults] = useState<PropertyData[]>([]);
  const [searching, setSearching] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState("criteria");
  const [showMlsPaste, setShowMlsPaste] = useState(false);
  const [mlsPasteText, setMlsPasteText] = useState("");
  const [mlsLookupLoading, setMlsLookupLoading] = useState(false);

  // Map state
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const [mapSearching, setMapSearching] = useState(false);
  const [mapResults, setMapResults] = useState<PropertyData[]>([]);
  const [mapTotalResults, setMapTotalResults] = useState(0);
  const [showSearchButton, setShowSearchButton] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [mapMode, setMapMode] = useState<'pan' | 'draw'>('pan');
  const [drawnPolygon, setDrawnPolygon] = useState<number[][] | null>(null);
  const [drawingInProgress, setDrawingInProgress] = useState(false);

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleStatus = (status: string) => {
    setFilters((prev) => {
      const current = prev.statuses;
      if (current.includes(status)) {
        const newStatuses = current.filter((s) => s !== status);
        // If removing Closed, clear dateSoldDays
        if (status === "Closed") {
          return { ...prev, statuses: newStatuses, dateSoldDays: "180" };
        }
        return { ...prev, statuses: newStatuses };
      }
      const newStatuses = [...current, status];
      // If adding Closed, default dateSoldDays to 180
      if (status === "Closed") {
        return { ...prev, statuses: newStatuses, dateSoldDays: "180" };
      }
      return { ...prev, statuses: newStatuses };
    });
  };

  const handleSearch = async (pageNum = 1) => {
    // Validate required fields (only when not doing a free-text search)
    if (!filters.search) {
      if (!filters.propertyType) {
        toast({ title: "Property Type is required", description: "Please select a property type before searching.", variant: "destructive" });
        return;
      }
      if (!filters.minBeds) {
        toast({ title: "Min Beds is required", description: "Please select minimum bedrooms.", variant: "destructive" });
        return;
      }
      if (!filters.minBaths) {
        toast({ title: "Min Baths is required", description: "Please select minimum bathrooms.", variant: "destructive" });
        return;
      }
    }

    setSearching(true);
    try {
      const body: any = {
        page: pageNum,
        limit: 25,
        statuses: filters.statuses,
      };
      // Only include non-empty filters
      if (filters.city) body.city = filters.city;
      if (filters.subdivision) body.subdivision = filters.subdivision;
      if (filters.zip) body.zip = filters.zip;
      if (filters.schoolDistrict) body.schoolDistrict = filters.schoolDistrict;
      if (filters.elementarySchool) body.elementarySchool = filters.elementarySchool;
      if (filters.middleSchool) body.middleSchool = filters.middleSchool;
      if (filters.highSchool) body.highSchool = filters.highSchool;
      if (filters.minBeds) body.minBeds = parseInt(filters.minBeds);
      if (filters.minBaths) body.minBaths = parseInt(filters.minBaths);
      if (filters.minPrice) body.minPrice = parseInt(filters.minPrice);
      if (filters.maxPrice) body.maxPrice = parseInt(filters.maxPrice);
      if (filters.propertyType) body.propertyType = filters.propertyType;
      if (filters.minSqft) body.minSqft = parseInt(filters.minSqft);
      if (filters.maxSqft) body.maxSqft = parseInt(filters.maxSqft);
      if (filters.minLotAcres) body.minLotAcres = parseFloat(filters.minLotAcres);
      if (filters.maxLotAcres) body.maxLotAcres = parseFloat(filters.maxLotAcres);
      if (filters.stories) body.stories = parseInt(filters.stories);
      if (filters.minYearBuilt) body.minYearBuilt = parseInt(filters.minYearBuilt);
      if (filters.maxYearBuilt) body.maxYearBuilt = parseInt(filters.maxYearBuilt);
      if (filters.search) body.search = filters.search;
      // Include dateSoldDays when Closed is selected
      if (filters.statuses.includes("Closed") && filters.dateSoldDays) {
        body.dateSoldDays = parseInt(filters.dateSoldDays);
      }

      const res = await apiRequest("POST", "/api/cma/search-properties", body);
      const data = await res.json();
      setSearchResults(data.listings || []);
      setTotalResults(data.total || 0);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      console.error("Search failed:", err);
      toast({
        title: "Search failed",
        description: err?.message || "An error occurred while searching properties. Please try again.",
        variant: "destructive",
      });
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // MLS bulk lookup handler
  const handleMlsLookup = async () => {
    if (!mlsPasteText.trim()) {
      toast({ title: "No MLS numbers entered", description: "Please paste MLS numbers to look up.", variant: "destructive" });
      return;
    }

    // Parse MLS numbers (comma, newline, or space separated)
    const mlsNumbers = mlsPasteText
      .split(/[,\n\r\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (mlsNumbers.length === 0) {
      toast({ title: "No valid MLS numbers found", variant: "destructive" });
      return;
    }

    setMlsLookupLoading(true);
    try {
      const res = await apiRequest("POST", "/api/cma/search-properties", {
        mlsNumbers,
      });
      const data = await res.json();
      const listings: PropertyData[] = data.listings || [];
      const mlsLookup = data.mlsLookup || { found: [], notFound: [] };

      // Add each found listing as a comp (skip duplicates)
      let addedCount = 0;
      for (const listing of listings) {
        if (!existingMlsNumbers.has(listing.mlsNumber)) {
          onAddComp(listing);
          addedCount++;
        }
      }

      const notFoundCount = mlsLookup.notFound?.length || 0;
      const alreadyExisting = listings.length - addedCount;

      let description = `${addedCount} comp${addedCount !== 1 ? "s" : ""} added.`;
      if (alreadyExisting > 0) description += ` ${alreadyExisting} already existed.`;
      if (notFoundCount > 0) description += ` ${notFoundCount} not found: ${mlsLookup.notFound.join(", ")}`;

      toast({
        title: `MLS Lookup Complete`,
        description,
        variant: notFoundCount > 0 ? "destructive" : "default",
      });

      // Clear the paste field
      setMlsPasteText("");
      setShowMlsPaste(false);
    } catch (err: any) {
      console.error("MLS lookup failed:", err);
      toast({
        title: "MLS lookup failed",
        description: err?.message || "An error occurred during the MLS lookup.",
        variant: "destructive",
      });
    } finally {
      setMlsLookupLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
    setSearchResults([]);
    setTotalResults(0);
  };

  // Map search by viewport bounds or drawn polygon
  const handleMapSearch = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    setMapSearching(true);
    setShowSearchButton(false);
    try {
      const body: any = {
        page: 1,
        limit: 50,
        statuses: ['Active', 'Active Under Contract'],
      };

      if (drawnPolygon && drawnPolygon.length >= 3) {
        // Use drawn polygon coordinates (already [lng, lat] format)
        body.polygon = drawnPolygon;
      } else {
        // Fall back to viewport bounds
        const bounds = map.getBounds();
        if (!bounds) return;
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        body.mapBounds = {
          sw: { lat: sw.lat, lng: sw.lng },
          ne: { lat: ne.lat, lng: ne.lng },
        };
      }

      const res = await apiRequest("POST", "/api/cma/search-properties", body);
      const data = await res.json();
      const listings: PropertyData[] = data.listings || [];
      setMapResults(listings);
      setMapTotalResults(data.total || 0);

      // Clear existing markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      // Add markers for each result
      listings.forEach((prop) => {
        if (!prop.latitude || !prop.longitude) return;

        // Create custom marker element
        const el = document.createElement('div');
        el.className = 'cma-map-marker';
        el.style.cssText = `
          width: 28px; height: 28px;
          background: #EF4923;
          border: 2px solid white;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          transition: transform 0.15s ease;
        `;
        el.addEventListener('mouseenter', () => {
          el.style.transform = 'scale(1.2)';
        });
        el.addEventListener('mouseleave', () => {
          el.style.transform = 'scale(1)';
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([prop.longitude!, prop.latitude!])
          .addTo(map);

        // Popup on click
        el.addEventListener('click', () => {
          // Close existing popup
          if (popupRef.current) {
            popupRef.current.remove();
          }

          const isAlreadyAdded = existingMlsNumbers.has(prop.mlsNumber);
          const popupHtml = `
            <div style="min-width: 220px; font-family: system-ui, sans-serif;">
              ${prop.photo ? `<img src="${prop.photo}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 6px 6px 0 0; margin: -10px -10px 8px -10px; width: calc(100% + 20px);" />` : ''}
              <div style="font-weight: 600; font-size: 13px; margin-bottom: 2px;">${prop.address}</div>
              ${prop.mlsNumber ? `<div style="font-size: 11px; color: #888; margin-bottom: 4px;">MLS# ${prop.mlsNumber}</div>` : ''}
              <div style="font-size: 16px; font-weight: 700; color: #EF4923; margin-bottom: 4px;">
                ${formatPrice(prop.listPrice)}
                ${prop.soldPrice ? `<span style="font-size: 12px; color: #666; font-weight: 400; margin-left: 4px;">Sold: ${formatPrice(prop.soldPrice)}</span>` : ''}
              </div>
              <div style="font-size: 12px; color: #555; margin-bottom: 8px;">
                ${prop.beds} bd · ${prop.baths} ba · ${formatNumber(prop.sqft)} sqft
                ${prop.yearBuilt ? ` · Built ${prop.yearBuilt}` : ''}
              </div>
              <button id="add-comp-${prop.mlsNumber}" style="
                width: 100%;
                padding: 6px 12px;
                background: ${isAlreadyAdded ? '#22c55e' : '#EF4923'};
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                cursor: ${isAlreadyAdded ? 'default' : 'pointer'};
                opacity: ${isAlreadyAdded ? '0.7' : '1'};
              ">
                ${isAlreadyAdded ? '✓ Already Added' : '+ Add as Comp'}
              </button>
            </div>
          `;

          const popup = new mapboxgl.Popup({
            closeOnClick: true,
            maxWidth: '280px',
            offset: 15,
          })
            .setLngLat([prop.longitude!, prop.latitude!])
            .setHTML(popupHtml)
            .addTo(map);

          popupRef.current = popup;

          // Attach click handler after popup is added to DOM
          popup.on('open', () => {
            setTimeout(() => {
              const btn = document.getElementById(`add-comp-${prop.mlsNumber}`);
              if (btn && !isAlreadyAdded) {
                btn.addEventListener('click', () => {
                  onAddComp(prop);
                  popup.remove();
                });
              }
            }, 50);
          });
        });

        markersRef.current.push(marker);
      });
    } catch (err) {
      console.error("Map search failed:", err);
      setMapResults([]);
    } finally {
      setMapSearching(false);
    }
  }, [existingMlsNumbers, onAddComp, drawnPolygon]);

  // Handle mode switching for draw control
  const handleModeSwitch = useCallback((mode: 'pan' | 'draw') => {
    setMapMode(mode);
    const draw = drawRef.current;
    if (!draw) return;

    if (mode === 'draw') {
      // If no polygon exists, start drawing
      if (!drawnPolygon) {
        draw.changeMode('draw_polygon');
        setDrawingInProgress(true);
      }
    } else {
      // Switch to simple_select (pan mode)
      draw.changeMode('simple_select');
      setDrawingInProgress(false);
    }
  }, [drawnPolygon]);

  // Clear drawn polygon
  const handleClearDrawing = useCallback(() => {
    const draw = drawRef.current;
    if (draw) {
      draw.deleteAll();
      draw.changeMode('simple_select');
    }
    setDrawnPolygon(null);
    setDrawingInProgress(false);
    setMapMode('pan');
    setShowSearchButton(true);
  }, []);

  // Initialize map when tab switches to "map"
  useEffect(() => {
    if (activeTab !== 'map') return;

    // Small delay to ensure container is visible and has dimensions
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      // If map already exists, just resize it
      if (mapRef.current) {
        mapRef.current.resize();
        return;
      }

      mapboxgl.accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-97.7431, 30.2672], // Austin, TX
        zoom: 10,
      });

      map.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Initialize MapboxDraw
      const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {},
        defaultMode: 'simple_select',
        styles: [
          // Polygon fill
          {
            id: 'gl-draw-polygon-fill',
            type: 'fill',
            filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
            paint: {
              'fill-color': '#EF4923',
              'fill-outline-color': '#EF4923',
              'fill-opacity': 0.15,
            },
          },
          // Polygon outline
          {
            id: 'gl-draw-polygon-stroke-active',
            type: 'line',
            filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
            layout: {
              'line-cap': 'round',
              'line-join': 'round',
            },
            paint: {
              'line-color': '#EF4923',
              'line-dasharray': [0.2, 2],
              'line-width': 2,
            },
          },
          // Vertex point halos
          {
            id: 'gl-draw-polygon-and-line-vertex-halo-active',
            type: 'circle',
            filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
            paint: {
              'circle-radius': 7,
              'circle-color': '#FFF',
            },
          },
          // Vertex points
          {
            id: 'gl-draw-polygon-and-line-vertex-active',
            type: 'circle',
            filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
            paint: {
              'circle-radius': 5,
              'circle-color': '#EF4923',
            },
          },
          // Midpoint
          {
            id: 'gl-draw-polygon-midpoint',
            type: 'circle',
            filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
            paint: {
              'circle-radius': 3,
              'circle-color': '#EF4923',
            },
          },
          // Line while drawing
          {
            id: 'gl-draw-line',
            type: 'line',
            filter: ['all', ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
            layout: {
              'line-cap': 'round',
              'line-join': 'round',
            },
            paint: {
              'line-color': '#EF4923',
              'line-dasharray': [0.2, 2],
              'line-width': 2,
            },
          },
          // Static polygon fill
          {
            id: 'gl-draw-polygon-fill-static',
            type: 'fill',
            filter: ['all', ['==', '$type', 'Polygon'], ['==', 'mode', 'static']],
            paint: {
              'fill-color': '#EF4923',
              'fill-outline-color': '#EF4923',
              'fill-opacity': 0.15,
            },
          },
          // Static polygon outline
          {
            id: 'gl-draw-polygon-stroke-static',
            type: 'line',
            filter: ['all', ['==', '$type', 'Polygon'], ['==', 'mode', 'static']],
            layout: {
              'line-cap': 'round',
              'line-join': 'round',
            },
            paint: {
              'line-color': '#EF4923',
              'line-width': 2,
            },
          },
        ],
      });

      map.addControl(draw as any);
      drawRef.current = draw;

      // Listen for draw events
      map.on('draw.create', (e: any) => {
        const features = e.features;
        if (features.length > 0 && features[0].geometry.type === 'Polygon') {
          const coords = features[0].geometry.coordinates[0]; // [lng, lat] pairs
          setDrawnPolygon(coords);
          setDrawingInProgress(false);
          setShowSearchButton(true);
        }
      });

      map.on('draw.update', (e: any) => {
        const features = e.features;
        if (features.length > 0 && features[0].geometry.type === 'Polygon') {
          const coords = features[0].geometry.coordinates[0];
          setDrawnPolygon(coords);
          setShowSearchButton(true);
        }
      });

      map.on('draw.delete', () => {
        setDrawnPolygon(null);
        setDrawingInProgress(false);
        setShowSearchButton(true);
      });

      map.on('load', () => {
        setMapReady(true);
      });

      map.on('moveend', () => {
        // Only show search button in pan mode when no polygon exists
        if (!drawRef.current?.getAll().features.length) {
          setShowSearchButton(true);
        }
      });

      mapRef.current = map;
    }, 100);

    return () => clearTimeout(timer);
  }, [activeTab]);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => m.remove());
      drawRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-5 w-5 text-[#EF4923]" />
              Search Properties
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFiltersExpanded(!filtersExpanded)}
            >
              {filtersExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full mb-4">
              <TabsTrigger value="criteria" className="flex-1">
                <Search className="h-4 w-4 mr-2" />
                Search by Criteria
              </TabsTrigger>
              <TabsTrigger value="map" className="flex-1">
                <Map className="h-4 w-4 mr-2" />
                Search by Map
              </TabsTrigger>
            </TabsList>

            <TabsContent value="criteria">
              {filtersExpanded && (
                <div className="space-y-4">
                  {/* Address search */}
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Address / MLS# Search</Label>
                    <Input
                      placeholder="Enter address or MLS number..."
                      value={filters.search}
                      onChange={(e) => updateFilter("search", e.target.value)}
                    />
                  </div>

                  {/* Location filters */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">City</Label>
                      <Input
                        placeholder="City"
                        value={filters.city}
                        onChange={(e) => updateFilter("city", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Subdivision</Label>
                      <Input
                        placeholder="Subdivision"
                        value={filters.subdivision}
                        onChange={(e) => updateFilter("subdivision", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Zip Code</Label>
                      <Input
                        placeholder="Zip"
                        value={filters.zip}
                        onChange={(e) => updateFilter("zip", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">School District</Label>
                      <Input
                        placeholder="District"
                        value={filters.schoolDistrict}
                        onChange={(e) => updateFilter("schoolDistrict", e.target.value)}
                      />
                    </div>
                  </div>

                  {/* School filters */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Elementary School</Label>
                      <Input
                        placeholder="Elementary"
                        value={filters.elementarySchool}
                        onChange={(e) => updateFilter("elementarySchool", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Middle School</Label>
                      <Input
                        placeholder="Middle"
                        value={filters.middleSchool}
                        onChange={(e) => updateFilter("middleSchool", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">High School</Label>
                      <Input
                        placeholder="High"
                        value={filters.highSchool}
                        onChange={(e) => updateFilter("highSchool", e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Property details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">
                        Min Beds <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={filters.minBeds || "any"}
                        onValueChange={(v) => updateFilter("minBeds", v === "any" ? "" : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          {BED_BATH_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value || "any"} value={opt.value || "any"}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">
                        Min Baths <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={filters.minBaths || "any"}
                        onValueChange={(v) => updateFilter("minBaths", v === "any" ? "" : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          {BED_BATH_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value || "any"} value={opt.value || "any"}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Min Price</Label>
                      <Input
                        type="number"
                        placeholder="Min $"
                        value={filters.minPrice}
                        onChange={(e) => updateFilter("minPrice", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Max Price</Label>
                      <Input
                        type="number"
                        placeholder="Max $"
                        value={filters.maxPrice}
                        onChange={(e) => updateFilter("maxPrice", e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Property type and status */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">
                        Property Type <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={filters.propertyType || "all"}
                        onValueChange={(v) => updateFilter("propertyType", v === "all" ? "" : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Property Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any</SelectItem>
                          {RESO_PROPERTY_TYPES.map((pt) => (
                            <SelectItem key={pt} value={pt}>{pt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {["Active", "Active Under Contract", "Closed"].map((s) => (
                          <label key={s} className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={filters.statuses.includes(s)}
                              onChange={() => toggleStatus(s)}
                              className="rounded border-gray-300 text-[#EF4923] focus:ring-[#EF4923]"
                            />
                            {s}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Date Sold dropdown - only visible when Closed is selected */}
                  {filters.statuses.includes("Closed") && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Date Sold</Label>
                        <Select
                          value={filters.dateSoldDays || "180"}
                          onValueChange={(v) => updateFilter("dateSoldDays", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select date range" />
                          </SelectTrigger>
                          <SelectContent>
                            {DATE_SOLD_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Size, lot, stories, year */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Min Sq Ft</Label>
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.minSqft}
                        onChange={(e) => updateFilter("minSqft", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Max Sq Ft</Label>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.maxSqft}
                        onChange={(e) => updateFilter("maxSqft", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Min Lot (Acres)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Min"
                        value={filters.minLotAcres}
                        onChange={(e) => updateFilter("minLotAcres", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Max Lot (Acres)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Max"
                        value={filters.maxLotAcres}
                        onChange={(e) => updateFilter("maxLotAcres", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Stories</Label>
                      <Input
                        type="number"
                        placeholder="Stories"
                        value={filters.stories}
                        onChange={(e) => updateFilter("stories", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Min Year Built</Label>
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.minYearBuilt}
                        onChange={(e) => updateFilter("minYearBuilt", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Max Year Built</Label>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.maxYearBuilt}
                        onChange={(e) => updateFilter("maxYearBuilt", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Search / Clear buttons */}
              <div className="flex gap-2 mt-4">
                <Button
                  className="flex-1 bg-[#EF4923] hover:bg-[#d4401f] text-white"
                  onClick={() => handleSearch(1)}
                  disabled={searching}
                >
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Search Properties
                </Button>
                <Button variant="outline" onClick={clearFilters}>
                  Clear
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="map">
              {/* Mode toolbar */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center border rounded-lg overflow-hidden">
                  <Button
                    variant={mapMode === 'pan' ? 'default' : 'ghost'}
                    size="sm"
                    className={`rounded-none ${mapMode === 'pan' ? 'bg-[#EF4923] hover:bg-[#d4401f] text-white' : ''}`}
                    onClick={() => handleModeSwitch('pan')}
                  >
                    <MousePointer2 className="h-4 w-4 mr-1.5" />
                    Pan
                  </Button>
                  <Button
                    variant={mapMode === 'draw' ? 'default' : 'ghost'}
                    size="sm"
                    className={`rounded-none ${mapMode === 'draw' ? 'bg-[#EF4923] hover:bg-[#d4401f] text-white' : ''}`}
                    onClick={() => handleModeSwitch('draw')}
                  >
                    <Pencil className="h-4 w-4 mr-1.5" />
                    Draw
                  </Button>
                </div>

                {drawnPolygon && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearDrawing}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Clear Drawing
                  </Button>
                )}

                {drawingInProgress && (
                  <span className="text-xs text-muted-foreground ml-2 animate-pulse">
                    Click to add points. Double-click to complete the shape.
                  </span>
                )}
              </div>

              <div className="relative">
                {/* Map container */}
                <div
                  ref={mapContainerRef}
                  className="w-full h-[500px] rounded-lg overflow-hidden border"
                />

                {/* Search This Area button */}
                {showSearchButton && !mapSearching && !drawingInProgress && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
                    <Button
                      size="sm"
                      className="bg-[#EF4923] hover:bg-[#d4401f] text-white shadow-lg"
                      onClick={handleMapSearch}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      {drawnPolygon ? 'Search This Polygon' : 'Search This Area'}
                    </Button>
                  </div>
                )}

                {/* Loading overlay */}
                {mapSearching && (
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                    <div className="flex items-center gap-2 bg-background px-4 py-2 rounded-full shadow-lg border">
                      <Loader2 className="h-4 w-4 animate-spin text-[#EF4923]" />
                      <span className="text-sm font-medium">Searching properties...</span>
                    </div>
                  </div>
                )}

                {/* Results count badge */}
                {mapResults.length > 0 && !mapSearching && (
                  <div className="absolute bottom-3 left-3 z-10">
                    <Badge className="bg-[#EF4923] text-white shadow-lg px-3 py-1">
                      {mapResults.length} of {formatNumber(mapTotalResults)} properties shown
                    </Badge>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground mt-2 text-center">
                {mapMode === 'draw'
                  ? drawnPolygon
                    ? 'Polygon drawn. Click "Search This Polygon" to find properties, or drag vertices to adjust.'
                    : 'Click on the map to add polygon points. Double-click to complete the shape.'
                  : 'Pan and zoom the map, then click "Search This Area" to find properties. Use Draw mode to search a custom area.'}
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add by MLS# Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-5 w-5 text-[#EF4923]" />
              Add by MLS#
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMlsPaste(!showMlsPaste)}
            >
              {showMlsPaste ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {showMlsPaste && (
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Paste multiple MLS numbers below (comma, space, or newline separated) to bulk-add comparable properties.
            </p>
            <textarea
              className="w-full min-h-[80px] p-3 border rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#EF4923]/50 bg-background"
              placeholder={"MLS12345, MLS67890\nMLS11111\nMLS22222"}
              value={mlsPasteText}
              onChange={(e) => setMlsPasteText(e.target.value)}
            />
            <Button
              className="w-full bg-[#EF4923] hover:bg-[#d4401f] text-white"
              onClick={handleMlsLookup}
              disabled={mlsLookupLoading || !mlsPasteText.trim()}
            >
              {mlsLookupLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Lookup MLS Numbers
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Search Results */}
      {(searchResults.length > 0 || searching) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Search Results
                {totalResults > 0 && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({formatNumber(totalResults)} found)
                  </span>
                )}
              </CardTitle>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || searching}
                    onClick={() => handleSearch(page - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || searching}
                    onClick={() => handleSearch(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {searching ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Skeleton className="w-20 h-14 rounded" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2 mt-2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {searchResults.map((prop, i) => {
                  const isAdded = existingMlsNumbers.has(prop.mlsNumber);
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        isAdded ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800" : "hover:bg-muted/50"
                      }`}
                    >
                      {prop.photo ? (
                        <img
                          src={prop.photo}
                          alt=""
                          className="w-20 h-14 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-20 h-14 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{prop.address}</p>
                        {prop.mlsNumber && (
                          <p className="text-xs text-muted-foreground">MLS# {prop.mlsNumber}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="font-semibold text-foreground">
                            {formatPrice(prop.soldPrice || prop.listPrice)}
                          </span>
                          <span>{prop.beds}bd / {prop.baths}ba</span>
                          <span>{formatNumber(prop.sqft)} sqft</span>
                          {prop.yearBuilt && <span>Built {prop.yearBuilt}</span>}
                          {prop.daysOnMarket !== undefined && prop.daysOnMarket > 0 && (
                            <span>{prop.daysOnMarket} DOM</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className="text-xs">
                          {prop.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant={isAdded ? "secondary" : "default"}
                          className={isAdded ? "" : "bg-[#EF4923] hover:bg-[#d4401f] text-white"}
                          disabled={isAdded}
                          onClick={() => onAddComp(prop)}
                        >
                          {isAdded ? "Added" : (
                            <>
                              <Plus className="h-4 w-4 mr-1" />
                              Add
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Main CMA Builder Page
export default function CmaBuilderPage() {
  const [, setLocation] = useLocation();
  const [, routeParams] = useRoute("/cma/:id");
  const cmaId = routeParams?.id || "new";
  const isNew = cmaId === "new";
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [cma, setCma] = useState<CmaData>({
    name: "",
    subjectProperty: null,
    comparableProperties: [],
    notes: "",
    status: "draft",
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load existing CMA
  const { data: existingCma, isLoading: loadingCma } = useQuery({
    queryKey: ["/api/cma", cmaId],
    queryFn: async () => {
      if (isNew) return null;
      const res = await fetch(`/api/cma/${cmaId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load CMA");
      return res.json();
    },
    enabled: !isNew,
  });

  useEffect(() => {
    if (existingCma) {
      setCma({
        name: existingCma.name || "",
        subjectProperty: existingCma.subjectProperty || null,
        comparableProperties: existingCma.comparableProperties || [],
        notes: existingCma.notes || "",
        status: existingCma.status || "draft",
      });
    }
  }, [existingCma]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: CmaData) => {
      if (isNew) {
        return apiRequest("POST", "/api/cma", data);
      } else {
        return apiRequest("PUT", `/api/cma/${cmaId}`, data);
      }
    },
    onSuccess: async (res) => {
      const saved = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/cma"] });
      setHasUnsavedChanges(false);
      toast({ title: "CMA saved successfully" });
      if (isNew && saved.id) {
        setLocation(`/cma/${saved.id}`);
      }
    },
    onError: () => {
      toast({ title: "Failed to save CMA", variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!cma.name.trim()) {
      toast({ title: "CMA Name is required", description: "Please enter a name for this CMA before saving.", variant: "destructive" });
      return;
    }
    if (!cma.subjectProperty) {
      toast({ title: "Subject Property is required", description: "Please set a subject property before saving.", variant: "destructive" });
      return;
    }
    saveMutation.mutate(cma);
  };

  const updateCma = (updates: Partial<CmaData>) => {
    setCma((prev) => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  };

  const addComp = (prop: PropertyData) => {
    setCma((prev) => ({
      ...prev,
      comparableProperties: [...prev.comparableProperties, prop],
    }));
    setHasUnsavedChanges(true);
  };

  const removeComp = (index: number) => {
    setCma((prev) => ({
      ...prev,
      comparableProperties: prev.comparableProperties.filter((_, i) => i !== index),
    }));
    setHasUnsavedChanges(true);
  };

  const existingMlsNumbers = useMemo(
    () => new Set(cma.comparableProperties.map((c) => c.mlsNumber).filter(Boolean)),
    [cma.comparableProperties]
  );

  if (!isNew && loadingCma) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/cma")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <FileBarChart className="h-7 w-7 text-[#EF4923]" />
                {isNew ? "New CMA" : "Edit CMA"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                Unsaved changes
              </Badge>
            )}
            {!isNew && (
              <Button
                variant="outline"
                onClick={() => setLocation(`/cma/${cmaId}/presentation`)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Presentation
              </Button>
            )}
            <Button
              className="bg-[#EF4923] hover:bg-[#d4401f] text-white"
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save CMA
            </Button>
          </div>
        </div>

        {/* CMA Name */}
        <div>
          <Label className="text-sm font-medium">CMA Name</Label>
          <Input
            placeholder="Enter a name for this CMA (e.g., 'Smith Family - 123 Main St')"
            value={cma.name}
            onChange={(e) => updateCma({ name: e.target.value })}
            className="mt-1 text-lg"
          />
        </div>

        {/* Top panels: Subject + Comps + Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SubjectPropertyPanel
            subject={cma.subjectProperty}
            onSet={(p) => updateCma({ subjectProperty: p })}
            onClear={() => updateCma({ subjectProperty: null })}
          />
          <ComparablePropertiesPanel
            comps={cma.comparableProperties}
            onRemove={removeComp}
          />
          <AnalysisPanel
            subject={cma.subjectProperty}
            comps={cma.comparableProperties}
          />
        </div>

        {/* Search Properties (includes MLS paste) */}
        <SearchPropertiesSection
          onAddComp={addComp}
          existingMlsNumbers={existingMlsNumbers}
        />
      </div>
    </Layout>
  );
}
