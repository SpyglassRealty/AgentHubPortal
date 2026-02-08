import { useState, useMemo } from "react";
import { Search, Info, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LAYER_CATEGORIES } from "./data-layers";
import type { DataLayer } from "./types";

interface DataLayerSidebarProps {
  selectedLayerId: string;
  onLayerSelect: (layerId: string) => void;
  className?: string;
}

export default function DataLayerSidebar({
  selectedLayerId,
  onLayerSelect,
  className = "",
}: DataLayerSidebarProps) {
  const [search, setSearch] = useState("");

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return LAYER_CATEGORIES;
    const q = search.toLowerCase().trim();
    return LAYER_CATEGORIES.map((cat) => ({
      ...cat,
      layers: cat.layers.filter(
        (l) =>
          l.label.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.layers.length > 0);
  }, [search]);

  // When searching, expand all categories
  const defaultExpanded = search.trim()
    ? filteredCategories.map((c) => c.id)
    : ["popular"];

  return (
    <div className={`flex flex-col h-full bg-card border-r border-border ${className}`}>
      {/* Header */}
      <div className="p-3 border-b border-border">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Search Data Points
        </h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Filter layers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Layer List */}
      <ScrollArea className="flex-1">
        <TooltipProvider delayDuration={300}>
          <Accordion
            type="multiple"
            defaultValue={defaultExpanded}
            key={search.trim() ? "search" : "default"}
            className="px-1"
          >
            {filteredCategories.map((category) => (
              <AccordionItem
                key={category.id}
                value={category.id}
                className="border-b-0"
              >
                <AccordionTrigger className="py-2.5 px-2 text-xs font-semibold uppercase tracking-wide hover:no-underline hover:bg-muted/50 rounded-md">
                  <span className="flex items-center gap-2">
                    <CategoryIcon categoryId={category.id} />
                    {category.label}
                    <span className="text-[10px] font-normal text-muted-foreground">
                      ({category.layers.length})
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-1 pt-0">
                  <div className="space-y-0.5">
                    {category.layers.map((layer) => (
                      <LayerItem
                        key={layer.id}
                        layer={layer}
                        isSelected={selectedLayerId === layer.id}
                        onSelect={() => onLayerSelect(layer.id)}
                      />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TooltipProvider>

        {filteredCategories.length === 0 && (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No data layers match "{search}"
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function LayerItem({
  layer,
  isSelected,
  onSelect,
}: {
  layer: DataLayer;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`
        w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-xs transition-all
        ${
          isSelected
            ? "bg-[#EF4923]/10 text-[#EF4923] font-semibold border border-[#EF4923]/20"
            : "hover:bg-muted/50 text-foreground/80 border border-transparent"
        }
      `}
    >
      {/* Radio indicator */}
      <div
        className={`
          w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center
          ${isSelected ? "border-[#EF4923]" : "border-muted-foreground/40"}
        `}
      >
        {isSelected && (
          <div className="w-1.5 h-1.5 rounded-full bg-[#EF4923]" />
        )}
      </div>

      {/* Label */}
      <span className="flex-1 truncate">{layer.label}</span>

      {/* Info icon with tooltip */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="flex-shrink-0 text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <Info className="h-3 w-3" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[250px] text-xs">
          <p className="font-semibold mb-1">{layer.label}</p>
          <p className="text-primary-foreground/80">{layer.description}</p>
        </TooltipContent>
      </Tooltip>
    </button>
  );
}

function CategoryIcon({ categoryId }: { categoryId: string }) {
  const iconClass = "h-3 w-3";
  switch (categoryId) {
    case "popular":
      return <span className={iconClass}>🔥</span>;
    case "home-price":
      return <span className={iconClass}>🏠</span>;
    case "market-trends":
      return <span className={iconClass}>📈</span>;
    case "demographic":
      return <span className={iconClass}>👥</span>;
    case "investor":
      return <span className={iconClass}>💰</span>;
    case "spyglass":
      return <span className={iconClass}>🔍</span>;
    default:
      return null;
  }
}
