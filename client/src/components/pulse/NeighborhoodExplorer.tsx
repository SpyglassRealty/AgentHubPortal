import { useState, useMemo } from "react";
import { Search, X, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ZipHeatmapItem } from "./types";

function formatPrice(n: number): string {
  if (!n) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

interface NeighborhoodExplorerProps {
  zipData: ZipHeatmapItem[];
  onZipSelect: (zip: string) => void;
}

export default function NeighborhoodExplorer({
  zipData,
  onZipSelect,
}: NeighborhoodExplorerProps) {
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
