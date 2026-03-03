import React from "react";
import { useLocation } from "wouter";
import { navItems, apps } from "@/lib/apps";
import { Search, ArrowRight } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface SearchPaletteProps {
  /** Controls visibility of the dropdown results */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Additional className for the root container */
  className?: string;
  /** data-testid for the input */
  testId?: string;
  /** Auto-focus the input on mount */
  autoFocus?: boolean;
}

// Build a unified searchable list from navItems + visible apps
interface SearchableItem {
  id: string;
  label: string;
  description?: string;
  icon: any;
  href: string;
  keywords: string; // lowercased searchable text
  group: "page" | "app";
  external?: boolean;
}

function buildSearchItems(): SearchableItem[] {
  const items: SearchableItem[] = [];
  const seenHrefs = new Set<string>();

  // Nav items (pages)
  for (const item of navItems) {
    const href = item.href;
    if (seenHrefs.has(href)) continue;
    seenHrefs.add(href);
    items.push({
      id: `nav-${href}`,
      label: item.label,
      icon: item.icon,
      href,
      keywords: item.label.toLowerCase(),
      group: "page",
    });
  }

  // Apps (external tools) — skip hidden, skip duplicates by href
  for (const app of apps) {
    if (app.hidden) continue;
    const href = app.url || `/apps/${app.id}`;
    if (seenHrefs.has(href)) continue;
    seenHrefs.add(href);
    const isExternal = app.connectionType === "external" || app.connectionType === "redirect";
    items.push({
      id: `app-${app.id}`,
      label: app.name,
      description: app.description,
      icon: app.icon,
      href,
      keywords: `${app.name} ${app.description} ${app.categories.join(" ")}`.toLowerCase(),
      group: "app",
      external: isExternal,
    });
  }

  return items;
}

const searchItems = buildSearchItems();

export default function SearchPalette({
  open,
  onOpenChange,
  placeholder = "Search apps, tools, resources...",
  className,
  testId,
  autoFocus,
}: SearchPaletteProps) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onOpenChange]);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onOpenChange]);

  const handleSelect = React.useCallback(
    (item: SearchableItem) => {
      onOpenChange(false);
      setQuery("");
      if (item.external) {
        window.open(item.href, "_blank", "noopener,noreferrer");
      } else {
        setLocation(item.href);
      }
    },
    [onOpenChange, setLocation]
  );

  const pages = searchItems.filter((i) => i.group === "page");
  const appItems = searchItems.filter((i) => i.group === "app");

  return (
    <div ref={containerRef} className={`relative ${className || ""}`}>
      <Command shouldFilter={true} className="bg-transparent">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
          <CommandInput
            placeholder={placeholder}
            value={query}
            onValueChange={(val) => {
              setQuery(val);
              if (val.length > 0 && !open) onOpenChange(true);
              if (val.length === 0) onOpenChange(false);
            }}
            onFocus={() => {
              if (query.length > 0) onOpenChange(true);
            }}
            className="pl-6 bg-secondary/50 border-transparent focus-visible:bg-background focus-visible:border-input transition-all"
            data-testid={testId}
            autoFocus={autoFocus}
          />
        </div>

        {open && query.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border bg-popover shadow-lg overflow-hidden">
            <CommandList>
              <CommandEmpty>No results found</CommandEmpty>
              <CommandGroup heading="Pages">
                {pages.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.keywords}
                    onSelect={() => handleSelect(item)}
                    className="cursor-pointer"
                  >
                    <item.icon className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{item.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading="Apps & Tools">
                {appItems.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.keywords}
                    onSelect={() => handleSelect(item)}
                    className="cursor-pointer"
                  >
                    <item.icon className="h-4 w-4 mr-2 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <span>{item.label}</span>
                      {item.description && (
                        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                      )}
                    </div>
                    {item.external && (
                      <ArrowRight className="h-3 w-3 text-muted-foreground ml-2 flex-shrink-0" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </div>
        )}
      </Command>
    </div>
  );
}
