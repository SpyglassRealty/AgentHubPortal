import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, MapPin, Building2, Map, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult {
  zips: { zip: string; city: string; county: string; neighborhood: string | null }[];
  cities: { city: string; county: string; zips: string[] }[];
  counties: { county: string; zips: string[] }[];
  neighborhoods: { neighborhood: string; zip: string; city: string; county: string }[];
}

interface PulseSearchBarProps {
  onZipSelect: (zip: string) => void;
  onFilterZips: (zips: string[], label: string) => void;
  onClearFilter: () => void;
  activeFilter: string | null;
  className?: string;
}

export default function PulseSearchBar({
  onZipSelect,
  onFilterZips,
  onClearFilter,
  activeFilter,
  className,
}: PulseSearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setResults(null);
    setHighlightedIndex(-1);
  }, []);

  // Build flat list of all selectable items for keyboard navigation
  const flatItems = useCallback((): { type: string; label: string; sublabel: string; action: () => void }[] => {
    if (!results) return [];
    const items: { type: string; label: string; sublabel: string; action: () => void }[] = [];

    for (const z of results.zips) {
      items.push({
        type: "zip",
        label: z.zip,
        sublabel: z.neighborhood ? `${z.neighborhood} · ${z.city}, ${z.county} County` : `${z.city}, ${z.county} County`,
        action: () => {
          onZipSelect(z.zip);
          closeDropdown();
        },
      });
    }
    for (const n of results.neighborhoods) {
      items.push({
        type: "neighborhood",
        label: n.neighborhood,
        sublabel: `${n.zip} · ${n.city}, ${n.county} County`,
        action: () => {
          onZipSelect(n.zip);
          closeDropdown();
        },
      });
    }
    for (const c of results.cities) {
      items.push({
        type: "city",
        label: c.city,
        sublabel: `${c.county} County · ${c.zips.length} zip codes`,
        action: () => {
          onFilterZips(c.zips, c.city);
          closeDropdown();
        },
      });
    }
    for (const c of results.counties) {
      items.push({
        type: "county",
        label: `${c.county} County`,
        sublabel: `${c.zips.length} zip codes`,
        action: () => {
          onFilterZips(c.zips, `${c.county} County`);
          closeDropdown();
        },
      });
    }
    return items;
  }, [results, onZipSelect, onFilterZips, closeDropdown]);

  // Fetch search results with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setIsOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/pulse/v2/search?q=${encodeURIComponent(query.trim())}`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setResults(data.results);
          setIsOpen(true);
          setHighlightedIndex(-1);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const items = flatItems();
      if (!isOpen || items.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && highlightedIndex >= 0) {
        e.preventDefault();
        items[highlightedIndex].action();
      } else if (e.key === "Escape") {
        closeDropdown();
        inputRef.current?.blur();
      }
    },
    [isOpen, highlightedIndex, flatItems, closeDropdown]
  );

  const hasResults =
    results &&
    (results.zips.length > 0 ||
      results.cities.length > 0 ||
      results.counties.length > 0 ||
      results.neighborhoods.length > 0);

  const items = flatItems();
  let itemIndex = -1;

  const getIcon = (type: string) => {
    switch (type) {
      case "zip":
        return <MapPin className="h-3.5 w-3.5 text-[#EF4923] flex-shrink-0" />;
      case "neighborhood":
        return <Navigation className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />;
      case "city":
        return <Building2 className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />;
      case "county":
        return <Map className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />;
      default:
        return <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />;
    }
  };

  return (
    <div className={cn("relative", className)}>
      {/* Search input */}
      <div className="relative flex items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (results && query.trim()) setIsOpen(true);
            }}
            placeholder="Search by zip code, city, county, or neighborhood..."
            role="combobox"
            aria-expanded={isOpen && !!hasResults}
            aria-controls="pulse-search-listbox"
            aria-activedescendant={highlightedIndex >= 0 ? `pulse-search-option-${highlightedIndex}` : undefined}
            aria-autocomplete="list"
            aria-label="Search Austin metro zip codes, cities, counties, or neighborhoods"
            className={cn(
              "w-full h-10 pl-9 pr-10 rounded-lg border bg-background text-sm",
              "placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-[#EF4923]/30 focus:border-[#EF4923]/50",
              "transition-all duration-200",
              isOpen && hasResults ? "rounded-b-none border-b-0" : ""
            )}
          />
          {(query || isLoading) && (
            <button
              onClick={() => {
                setQuery("");
                setResults(null);
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" aria-label="Loading results" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* Active filter badge */}
        {activeFilter && (
          <div className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EF4923]/10 border border-[#EF4923]/20 text-sm font-medium text-[#EF4923] whitespace-nowrap">
            <MapPin className="h-3.5 w-3.5" />
            {activeFilter}
            <button
              onClick={onClearFilter}
              aria-label={`Clear ${activeFilter} filter`}
              className="ml-1 hover:bg-[#EF4923]/20 rounded p-0.5 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Dropdown results */}
      {isOpen && (
        <div
          ref={dropdownRef}
          id="pulse-search-listbox"
          role="listbox"
          aria-label="Search results"
          className="absolute z-50 w-full bg-popover border border-t-0 border-border rounded-b-lg shadow-lg max-h-[360px] overflow-y-auto"
          style={{ width: inputRef.current?.offsetWidth }}
        >
          {!hasResults && query.trim().length > 0 && !isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No results found for "{query}"
            </div>
          ) : (
            <>
              {/* Zip Codes */}
              {results?.zips && results.zips.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50">
                    Zip Codes
                  </div>
                  {results.zips.map((z) => {
                    itemIndex++;
                    const idx = itemIndex;
                    return (
                      <button
                        key={z.zip}
                        id={`pulse-search-option-${idx}`}
                        role="option"
                        aria-selected={highlightedIndex === idx}
                        onClick={() => items[idx]?.action()}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors",
                          highlightedIndex === idx
                            ? "bg-[#EF4923]/8 text-foreground"
                            : "hover:bg-accent/50 text-foreground"
                        )}
                      >
                        {getIcon("zip")}
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold">{z.zip}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {z.neighborhood ? `${z.neighborhood} · ${z.city}` : z.city}, {z.county} Co.
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Neighborhoods */}
              {results?.neighborhoods && results.neighborhoods.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50">
                    Neighborhoods
                  </div>
                  {results.neighborhoods.map((n) => {
                    itemIndex++;
                    const idx = itemIndex;
                    return (
                      <button
                        key={`${n.zip}-${n.neighborhood}`}
                        id={`pulse-search-option-${idx}`}
                        role="option"
                        aria-selected={highlightedIndex === idx}
                        onClick={() => items[idx]?.action()}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors",
                          highlightedIndex === idx
                            ? "bg-[#EF4923]/8 text-foreground"
                            : "hover:bg-accent/50 text-foreground"
                        )}
                      >
                        {getIcon("neighborhood")}
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold">{n.neighborhood}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {n.zip} · {n.city}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Cities */}
              {results?.cities && results.cities.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50">
                    Cities
                  </div>
                  {results.cities.map((c) => {
                    itemIndex++;
                    const idx = itemIndex;
                    return (
                      <button
                        key={c.city}
                        id={`pulse-search-option-${idx}`}
                        role="option"
                        aria-selected={highlightedIndex === idx}
                        onClick={() => items[idx]?.action()}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors",
                          highlightedIndex === idx
                            ? "bg-[#EF4923]/8 text-foreground"
                            : "hover:bg-accent/50 text-foreground"
                        )}
                      >
                        {getIcon("city")}
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold">{c.city}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {c.county} County · {c.zips.length} zip{c.zips.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Counties */}
              {results?.counties && results.counties.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50">
                    Counties
                  </div>
                  {results.counties.map((c) => {
                    itemIndex++;
                    const idx = itemIndex;
                    return (
                      <button
                        key={c.county}
                        id={`pulse-search-option-${idx}`}
                        role="option"
                        aria-selected={highlightedIndex === idx}
                        onClick={() => items[idx]?.action()}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors",
                          highlightedIndex === idx
                            ? "bg-[#EF4923]/8 text-foreground"
                            : "hover:bg-accent/50 text-foreground"
                        )}
                      >
                        {getIcon("county")}
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold">{c.county} County</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {c.zips.length} zip{c.zips.length !== 1 ? "s" : ""} in metro area
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
