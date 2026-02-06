import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
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
};

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
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <BedDouble className="h-3 w-3" /> {subject.beds} bd
                </span>
                <span className="flex items-center gap-1">
                  <Bath className="h-3 w-3" /> {subject.baths} ba
                </span>
                <span className="flex items-center gap-1">
                  <Ruler className="h-3 w-3" /> {formatNumber(subject.sqft)} sqft
                </span>
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

// Search Properties Section
function SearchPropertiesSection({
  onAddComp,
  existingMlsNumbers,
}: {
  onAddComp: (prop: PropertyData) => void;
  existingMlsNumbers: Set<string>;
}) {
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [searchResults, setSearchResults] = useState<PropertyData[]>([]);
  const [searching, setSearching] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleStatus = (status: string) => {
    setFilters((prev) => {
      const current = prev.statuses;
      if (current.includes(status)) {
        return { ...prev, statuses: current.filter((s) => s !== status) };
      }
      return { ...prev, statuses: [...current, status] };
    });
  };

  const handleSearch = async (pageNum = 1) => {
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

      const res = await apiRequest("POST", "/api/cma/search-properties", body);
      const data = await res.json();
      setSearchResults(data.listings || []);
      setTotalResults(data.total || 0);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error("Search failed:", err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
    setSearchResults([]);
    setTotalResults(0);
  };

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
          <Tabs defaultValue="criteria">
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
                      <Label className="text-xs font-medium text-muted-foreground">Min Beds</Label>
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.minBeds}
                        onChange={(e) => updateFilter("minBeds", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Min Baths</Label>
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.minBaths}
                        onChange={(e) => updateFilter("minBaths", e.target.value)}
                      />
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
                      <Label className="text-xs font-medium text-muted-foreground">Property Type</Label>
                      <Select
                        value={filters.propertyType || "all"}
                        onValueChange={(v) => updateFilter("propertyType", v === "all" ? "" : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any</SelectItem>
                          <SelectItem value="Detached">Detached</SelectItem>
                          <SelectItem value="Att/Row/Twnhouse">Townhouse</SelectItem>
                          <SelectItem value="Semi-Detached">Semi-Detached</SelectItem>
                          <SelectItem value="Condo Apt">Condo</SelectItem>
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
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Map className="h-12 w-12 mb-3 opacity-40" />
                <p className="text-sm font-medium">Map Search Coming Soon</p>
                <p className="text-xs mt-1">Use the criteria tab to search for properties.</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
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
      toast({ title: "Please enter a CMA name", variant: "destructive" });
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

        {/* Search Properties */}
        <SearchPropertiesSection
          onAddComp={addComp}
          existingMlsNumbers={existingMlsNumbers}
        />
      </div>
    </Layout>
  );
}
