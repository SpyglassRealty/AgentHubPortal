import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Building2,
  BarChart3,
} from "lucide-react";

export interface PresentationSection {
  id: string;
  label: string;
  category: "introduction" | "listings" | "analysis";
  enabled: boolean;
  order: number;
  customizable?: boolean;
  content?: string;
}

export interface PresentationConfig {
  sections: PresentationSection[];
  layout?: {
    theme?: string;
    primaryColor?: string;
  };
}

export const DEFAULT_SECTIONS: PresentationSection[] = [
  // Introduction
  { id: "cover-page", label: "Cover Page", category: "introduction", enabled: true, order: 0 },
  { id: "listing-brochure", label: "Listing Brochure", category: "introduction", enabled: false, order: 1 },
  { id: "cover-letter", label: "Cover Letter", category: "introduction", enabled: true, order: 2, customizable: true, content: "" },
  { id: "agent-resume", label: "Agent Resume", category: "introduction", enabled: false, order: 3, customizable: true, content: "" },
  { id: "our-company", label: "Our Company", category: "introduction", enabled: false, order: 4 },
  { id: "what-is-cma", label: "What is a CMA?", category: "introduction", enabled: false, order: 5 },
  { id: "contact-me", label: "Contact Me", category: "introduction", enabled: true, order: 6 },
  // Listings
  { id: "map-all-listings", label: "Map of All Listings", category: "listings", enabled: true, order: 7 },
  { id: "summary-comps", label: "Summary of Comparable Properties", category: "listings", enabled: true, order: 8 },
  { id: "listings-chapter-header", label: "Listings Chapter Header", category: "listings", enabled: false, order: 9 },
  { id: "property-details", label: "Property Details", category: "listings", enabled: true, order: 10 },
  { id: "property-photos", label: "Property Photos", category: "listings", enabled: true, order: 11 },
  { id: "adjustments", label: "Adjustments", category: "listings", enabled: false, order: 12 },
  // Analysis
  { id: "analysis-chapter-header", label: "Analysis Chapter Header", category: "analysis", enabled: false, order: 13 },
  { id: "online-valuation", label: "Online Valuation Analysis", category: "analysis", enabled: false, order: 14 },
  { id: "avg-price-sqft", label: "Average Price Per Sq. Ft.", category: "analysis", enabled: true, order: 15 },
  { id: "comp-statistics", label: "Comparable Property Statistics", category: "analysis", enabled: true, order: 16 },
];

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode }> = {
  introduction: { label: "Introduction", icon: <BookOpen className="h-4 w-4" /> },
  listings: { label: "Listings", icon: <Building2 className="h-4 w-4" /> },
  analysis: { label: "Analysis", icon: <BarChart3 className="h-4 w-4" /> },
};

interface SectionsPanelProps {
  sections: PresentationSection[];
  onSectionsChange: (sections: PresentationSection[]) => void;
}

export function SectionsPanel({ sections, onSectionsChange }: SectionsPanelProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const toggleSection = (id: string) => {
    onSectionsChange(
      sections.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const moveSection = (id: string, direction: "up" | "down") => {
    const sorted = [...sections].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((s) => s.id === id);
    if (idx < 0) return;

    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;

    // Only allow moving within same category
    if (sorted[idx].category !== sorted[targetIdx].category) return;

    // Swap orders
    const temp = sorted[idx].order;
    sorted[idx] = { ...sorted[idx], order: sorted[targetIdx].order };
    sorted[targetIdx] = { ...sorted[targetIdx], order: temp };
    onSectionsChange(sorted);
  };

  const categories: Array<"introduction" | "listings" | "analysis"> = ["introduction", "listings", "analysis"];
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-2">
      {categories.map((cat) => {
        const catSections = sortedSections.filter((s) => s.category === cat);
        const enabledCount = catSections.filter((s) => s.enabled).length;
        const meta = CATEGORY_META[cat];
        const isCollapsed = collapsedCategories.has(cat);

        return (
          <Card key={cat} className="overflow-hidden">
            <button
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
              onClick={() => toggleCategory(cat)}
            >
              <span className="text-[#EF4923]">{meta.icon}</span>
              <span className="font-semibold text-sm flex-1">{meta.label}</span>
              <Badge variant="secondary" className="text-xs">
                {enabledCount}/{catSections.length}
              </Badge>
              <ChevronRight
                className={`h-4 w-4 text-muted-foreground transition-transform ${
                  isCollapsed ? "" : "rotate-90"
                }`}
              />
            </button>
            {!isCollapsed && (
              <CardContent className="px-2 pb-2 pt-0">
                <div className="divide-y">
                  {catSections.map((section) => (
                    <div
                      key={section.id}
                      className="flex items-center gap-2 px-2 py-2.5 group"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 cursor-grab" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{section.label}</p>
                        {section.customizable && (
                          <p className="text-xs text-muted-foreground">Customizable content</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveSection(section.id, "up")}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveSection(section.id, "down")}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                      <Switch
                        checked={section.enabled}
                        onCheckedChange={() => toggleSection(section.id)}
                        className="data-[state=checked]:bg-[#EF4923]"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

interface ContentPanelProps {
  sections: PresentationSection[];
  onSectionsChange: (sections: PresentationSection[]) => void;
}

export function ContentPanel({ sections, onSectionsChange }: ContentPanelProps) {
  const customizableSections = sections.filter((s) => s.customizable);

  const updateContent = (id: string, content: string) => {
    onSectionsChange(
      sections.map((s) => (s.id === id ? { ...s, content } : s))
    );
  };

  if (customizableSections.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">No customizable sections available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {customizableSections.map((section) => (
        <Card key={section.id}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">{section.label}</Label>
              <Badge variant={section.enabled ? "default" : "secondary"} className={section.enabled ? "bg-[#EF4923]" : ""}>
                {section.enabled ? "Visible" : "Hidden"}
              </Badge>
            </div>
            <Textarea
              placeholder={`Enter content for ${section.label}...`}
              value={section.content || ""}
              onChange={(e) => updateContent(section.id, e.target.value)}
              className="min-h-[120px] resize-y"
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface LayoutPanelProps {}

export function LayoutPanel(_props: LayoutPanelProps) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40" />
      <p className="text-sm font-medium">Layout Settings</p>
      <p className="text-xs mt-1">Theme and layout customization coming soon.</p>
    </div>
  );
}
