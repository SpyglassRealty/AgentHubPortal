import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Globe,
  Save,
  Loader2,
  RotateCcw,
  ExternalLink,
  Plus,
  Trash2,
  Shield,
  Star,
  Home,
  BarChart3,
  Quote,
  Footprints,
  CheckCircle2,
  SplitSquareHorizontal,
  TrendingUp,
  Building2,
  MapPin,
  Mail,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// ── Types ─────────────────────────────────────────

interface SiteContentResponse {
  sections: Record<string, any>;
  savedSections: string[];
}

// ── Section metadata for display ─────────────────

const SECTION_META: { key: string; label: string; icon: any; description: string }[] = [
  { key: "hero", label: "Hero Section", icon: Home, description: "Main headline, background image, dual CTAs, search bar, trust bar" },
  { key: "stats", label: "Stats Bar", icon: BarChart3, description: "4 stat items with icons below the hero" },
  { key: "whatBringsYou", label: "What Brings You", icon: SplitSquareHorizontal, description: "Buy/Sell cards with images and links" },
  { key: "spyglassDifference", label: "Spyglass Difference", icon: TrendingUp, description: "3 stat blocks showing competitive advantages" },
  { key: "featuredListings", label: "Featured Listings", icon: Building2, description: "Heading and view-all link (listings are dynamic)" },
  { key: "testimonials", label: "Testimonials", icon: Quote, description: "Customer testimonial carousel" },
  { key: "neighborhoods", label: "Neighborhoods", icon: MapPin, description: "Neighborhood cards linking to community pages" },
  { key: "newForm", label: "Contact Form", icon: Mail, description: "CTA heading and contact form section" },
  { key: "footer", label: "Footer", icon: Footprints, description: "Site footer content, social links, columns" },
];

// ── Helpers ────────────────────────────────────────

function ArrayEditor({
  items,
  onUpdate,
  renderItem,
  newItem,
  label,
  maxItems,
}: {
  items: any[];
  onUpdate: (items: any[]) => void;
  renderItem: (item: any, index: number, onChange: (field: string, value: any) => void) => React.ReactNode;
  newItem: () => any;
  label: string;
  maxItems?: number;
}) {
  const addItem = () => {
    if (maxItems && items.length >= maxItems) return;
    onUpdate([...items, newItem()]);
  };
  const removeItem = (index: number) => {
    onUpdate(items.filter((_, i) => i !== index));
  };
  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onUpdate(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          disabled={maxItems !== undefined && items.length >= maxItems}
        >
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>
      {items.map((item, index) => (
        <Card key={index} className="relative">
          <CardContent className="pt-4 pb-3 pr-10">
            {renderItem(item, index, (field, value) => updateItem(index, field, value))}
          </CardContent>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => removeItem(index)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </Card>
      ))}
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground italic text-center py-2">No items yet. Click Add to create one.</p>
      )}
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

// ── Section Editors ────────────────────────────────

function HeroEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  return (
    <div className="space-y-4">
      <FieldGroup label="Headline">
        <Input value={data.headline || ""} onChange={(e) => onChange({ ...data, headline: e.target.value })} placeholder="Your Home. Our Obsession." />
      </FieldGroup>
      <FieldGroup label="Subtitle Stats Line">
        <Input value={data.subtitleStats || ""} onChange={(e) => onChange({ ...data, subtitleStats: e.target.value })} placeholder="1,200+ 5-star reviews  |  2,500+ Homes Sold  |  ..." />
      </FieldGroup>
      <FieldGroup label="Subtitle Tagline">
        <Input value={data.subtitleTagline || ""} onChange={(e) => onChange({ ...data, subtitleTagline: e.target.value })} placeholder="Austin's premier real estate brokerage" />
      </FieldGroup>
      <FieldGroup label="Background Image URL">
        <Input value={data.backgroundImage || ""} onChange={(e) => onChange({ ...data, backgroundImage: e.target.value })} placeholder="/images/austin-skyline-hero.jpg" />
      </FieldGroup>
      <FieldGroup label="Background Image Fallback URL">
        <Input value={data.backgroundImageFallback || ""} onChange={(e) => onChange({ ...data, backgroundImageFallback: e.target.value })} />
      </FieldGroup>
      <Separator />
      <p className="text-sm font-medium">Call-to-Action Buttons</p>
      <div className="grid grid-cols-2 gap-4">
        <FieldGroup label="Primary CTA Text">
          <Input value={data.primaryCtaText || ""} onChange={(e) => onChange({ ...data, primaryCtaText: e.target.value })} placeholder="Search Homes" />
        </FieldGroup>
        <FieldGroup label="Primary CTA Link">
          <Input value={data.primaryCtaLink || ""} onChange={(e) => onChange({ ...data, primaryCtaLink: e.target.value })} placeholder="/search" />
        </FieldGroup>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FieldGroup label="Secondary CTA Text">
          <Input value={data.secondaryCtaText || ""} onChange={(e) => onChange({ ...data, secondaryCtaText: e.target.value })} placeholder="What's My Home Worth?" />
        </FieldGroup>
        <FieldGroup label="Secondary CTA Link">
          <Input value={data.secondaryCtaLink || ""} onChange={(e) => onChange({ ...data, secondaryCtaLink: e.target.value })} placeholder="/sell" />
        </FieldGroup>
      </div>
      <FieldGroup label="Search Placeholder">
        <Input value={data.searchPlaceholder || ""} onChange={(e) => onChange({ ...data, searchPlaceholder: e.target.value })} />
      </FieldGroup>
      <Separator />
      <ArrayEditor
        items={data.trustBarItems || []}
        onUpdate={(trustBarItems) => onChange({ ...data, trustBarItems })}
        newItem={() => ""}
        label="Trust Bar Items"
        maxItems={6}
        renderItem={(item, index, _onFieldChange) => (
          <Input
            value={item}
            onChange={(e) => {
              const updated = [...(data.trustBarItems || [])];
              updated[index] = e.target.value;
              onChange({ ...data, trustBarItems: updated });
            }}
            placeholder="e.g. 1,200+ Reviews"
          />
        )}
      />
    </div>
  );
}

function StatsEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  const items = data.items || [];
  return (
    <ArrayEditor
      items={items}
      onUpdate={(items) => onChange({ ...data, items })}
      newItem={() => ({ iconName: "HomeIcon", value: "", label: "" })}
      label="Stat Items"
      maxItems={6}
      renderItem={(item, index, onFieldChange) => (
        <div className="grid grid-cols-1 gap-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Icon</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={item.iconName || "HomeIcon"}
                onChange={(e) => onFieldChange("iconName", e.target.value)}
              >
                <option value="HomeIcon">Home</option>
                <option value="UserGroupIcon">Users</option>
                <option value="MapPinIcon">Map Pin</option>
                <option value="CurrencyDollarIcon">Dollar</option>
                <option value="ChartBarIcon">Chart</option>
                <option value="StarIcon">Star</option>
              </select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Value</Label>
              <Input value={item.value || ""} onChange={(e) => onFieldChange("value", e.target.value)} placeholder="3,400+" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Label</Label>
              <Input value={item.label || ""} onChange={(e) => onFieldChange("label", e.target.value)} placeholder="For Sale" />
            </div>
          </div>
        </div>
      )}
    />
  );
}

function WhatBringsYouEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  const cards = data.cards || [];

  const updateCard = (index: number, field: string, value: string) => {
    const updated = [...cards];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...data, cards: updated });
  };

  return (
    <div className="space-y-4">
      <FieldGroup label="Section Heading">
        <Input value={data.heading || ""} onChange={(e) => onChange({ ...data, heading: e.target.value })} placeholder="What brings you here?" />
      </FieldGroup>
      <Separator />
      {cards.map((card: any, index: number) => (
        <Card key={index}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{index === 0 ? "Buy Card" : "Sell Card"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FieldGroup label="Title">
              <Input value={card.title || ""} onChange={(e) => updateCard(index, "title", e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Description">
              <Textarea value={card.description || ""} onChange={(e) => updateCard(index, "description", e.target.value)} rows={2} />
            </FieldGroup>
            <FieldGroup label="Image URL">
              <Input value={card.imageUrl || ""} onChange={(e) => updateCard(index, "imageUrl", e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Image Alt Text">
              <Input value={card.imageAlt || ""} onChange={(e) => updateCard(index, "imageAlt", e.target.value)} />
            </FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <FieldGroup label="Link Text">
                <Input value={card.linkText || ""} onChange={(e) => updateCard(index, "linkText", e.target.value)} />
              </FieldGroup>
              <FieldGroup label="Link URL">
                <Input value={card.linkHref || ""} onChange={(e) => updateCard(index, "linkHref", e.target.value)} />
              </FieldGroup>
            </div>
          </CardContent>
        </Card>
      ))}
      {cards.length < 2 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange({ ...data, cards: [...cards, { title: "", description: "", imageUrl: "", imageAlt: "", linkText: "", linkHref: "" }] })}
        >
          <Plus className="h-3 w-3 mr-1" /> Add Card
        </Button>
      )}
    </div>
  );
}

function SpyglassDifferenceEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  return (
    <div className="space-y-4">
      <FieldGroup label="Section Heading">
        <Input value={data.heading || ""} onChange={(e) => onChange({ ...data, heading: e.target.value })} placeholder="The Spyglass Difference" />
      </FieldGroup>
      <FieldGroup label="Subtitle">
        <Input value={data.subtitle || ""} onChange={(e) => onChange({ ...data, subtitle: e.target.value })} placeholder="What sets us apart..." />
      </FieldGroup>
      <Separator />
      <ArrayEditor
        items={data.items || []}
        onUpdate={(items) => onChange({ ...data, items })}
        newItem={() => ({ stat: "", statLabel: "", title: "", description: "" })}
        label="Difference Items"
        maxItems={4}
        renderItem={(item, index, onFieldChange) => (
          <div className="grid grid-cols-1 gap-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Stat Value</Label>
                <Input value={item.stat || ""} onChange={(e) => onFieldChange("stat", e.target.value)} placeholder="$50K+" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Stat Label</Label>
                <Input value={item.statLabel || ""} onChange={(e) => onFieldChange("statLabel", e.target.value)} placeholder="More per sale on average" />
              </div>
            </div>
            <FieldGroup label="Title">
              <Input value={item.title || ""} onChange={(e) => onFieldChange("title", e.target.value)} placeholder="We don't just list it. We launch it." />
            </FieldGroup>
            <FieldGroup label="Description">
              <Textarea value={item.description || ""} onChange={(e) => onFieldChange("description", e.target.value)} rows={2} />
            </FieldGroup>
          </div>
        )}
      />
    </div>
  );
}

function FeaturedListingsEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2 text-sm text-blue-800 dark:text-blue-200">
        Listings are fetched dynamically from the MLS API. You can customize the heading and "view all" link below.
      </div>
      <FieldGroup label="Section Heading">
        <Input value={data.heading || ""} onChange={(e) => onChange({ ...data, heading: e.target.value })} placeholder="Featured Listings" />
      </FieldGroup>
      <div className="grid grid-cols-2 gap-4">
        <FieldGroup label="View All Link Text">
          <Input value={data.viewAllText || ""} onChange={(e) => onChange({ ...data, viewAllText: e.target.value })} placeholder="View All Listings →" />
        </FieldGroup>
        <FieldGroup label="View All Link URL">
          <Input value={data.viewAllLink || ""} onChange={(e) => onChange({ ...data, viewAllLink: e.target.value })} placeholder="/featured-listings" />
        </FieldGroup>
      </div>
    </div>
  );
}

function TestimonialsEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  return (
    <div className="space-y-4">
      <FieldGroup label="Label">
        <Input value={data.label || ""} onChange={(e) => onChange({ ...data, label: e.target.value })} />
      </FieldGroup>
      <FieldGroup label="Heading">
        <Input value={data.heading || ""} onChange={(e) => onChange({ ...data, heading: e.target.value })} />
      </FieldGroup>
      <ArrayEditor
        items={data.items || []}
        onUpdate={(items) => onChange({ ...data, items })}
        newItem={() => ({ quote: "", agent: "", rating: 5 })}
        label="Testimonials"
        renderItem={(item, index, onFieldChange) => (
          <div className="grid grid-cols-1 gap-2">
            <Textarea value={item.quote || ""} onChange={(e) => onFieldChange("quote", e.target.value)} placeholder="Quote text" rows={3} />
            <div className="grid grid-cols-2 gap-2">
              <Input value={item.agent || ""} onChange={(e) => onFieldChange("agent", e.target.value)} placeholder="Agent name" />
              <Input type="number" min="1" max="5" value={item.rating ?? 5} onChange={(e) => onFieldChange("rating", parseInt(e.target.value))} placeholder="Rating (1-5)" />
            </div>
          </div>
        )}
      />
    </div>
  );
}

function NeighborhoodsEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  return (
    <div className="space-y-4">
      <FieldGroup label="Section Heading">
        <Input value={data.heading || ""} onChange={(e) => onChange({ ...data, heading: e.target.value })} placeholder="Austin Neighborhoods" />
      </FieldGroup>
      <FieldGroup label="Subtitle">
        <Input value={data.subtitle || ""} onChange={(e) => onChange({ ...data, subtitle: e.target.value })} placeholder="Explore the communities..." />
      </FieldGroup>
      <Separator />
      <ArrayEditor
        items={data.items || []}
        onUpdate={(items) => onChange({ ...data, items })}
        newItem={() => ({ name: "", slug: "", image: "" })}
        label="Neighborhood Cards"
        renderItem={(item, index, onFieldChange) => (
          <div className="grid grid-cols-1 gap-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Name</Label>
                <Input value={item.name || ""} onChange={(e) => onFieldChange("name", e.target.value)} placeholder="South Congress" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Slug</Label>
                <Input value={item.slug || ""} onChange={(e) => onFieldChange("slug", e.target.value)} placeholder="south-congress" />
              </div>
            </div>
            <FieldGroup label="Image URL">
              <Input value={item.image || ""} onChange={(e) => onFieldChange("image", e.target.value)} placeholder="https://..." />
            </FieldGroup>
          </div>
        )}
      />
      <Separator />
      <div className="grid grid-cols-2 gap-4">
        <FieldGroup label="Explore All Button Text">
          <Input value={data.exploreAllText || ""} onChange={(e) => onChange({ ...data, exploreAllText: e.target.value })} placeholder="Explore All Neighborhoods" />
        </FieldGroup>
        <FieldGroup label="Explore All Link">
          <Input value={data.exploreAllLink || ""} onChange={(e) => onChange({ ...data, exploreAllLink: e.target.value })} placeholder="/communities" />
        </FieldGroup>
      </div>
    </div>
  );
}

function NewFormEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  return (
    <div className="space-y-4">
      <FieldGroup label="Heading">
        <Input value={data.heading || ""} onChange={(e) => onChange({ ...data, heading: e.target.value })} placeholder="Ready to make your move?" />
      </FieldGroup>
      <FieldGroup label="Description">
        <Textarea value={data.description || ""} onChange={(e) => onChange({ ...data, description: e.target.value })} rows={3} placeholder="Connect with Austin's most trusted real estate experts..." />
      </FieldGroup>
      <FieldGroup label="Button Text">
        <Input value={data.buttonText || ""} onChange={(e) => onChange({ ...data, buttonText: e.target.value })} placeholder="Get Started" />
      </FieldGroup>
    </div>
  );
}

function FooterEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  return (
    <div className="space-y-4">
      <FieldGroup label="Address">
        <Input value={data.address || ""} onChange={(e) => onChange({ ...data, address: e.target.value })} />
      </FieldGroup>
      <FieldGroup label="City / State / Zip">
        <Input value={data.city || ""} onChange={(e) => onChange({ ...data, city: e.target.value })} />
      </FieldGroup>
      <FieldGroup label="Phone">
        <Input value={data.phone || ""} onChange={(e) => onChange({ ...data, phone: e.target.value })} />
      </FieldGroup>
      <Separator />
      <p className="text-sm font-medium">Social Links</p>
      {["facebook", "twitter", "instagram", "linkedin", "youtube"].map((platform) => (
        <FieldGroup key={platform} label={platform.charAt(0).toUpperCase() + platform.slice(1)}>
          <Input
            value={data.socialLinks?.[platform] || ""}
            onChange={(e) =>
              onChange({ ...data, socialLinks: { ...data.socialLinks, [platform]: e.target.value } })
            }
            placeholder={`https://${platform}.com/...`}
          />
        </FieldGroup>
      ))}
      <Separator />
      <ArrayEditor
        items={data.columns || []}
        onUpdate={(columns) => onChange({ ...data, columns })}
        newItem={() => ({ title: "", links: [] })}
        label="Footer Columns"
        maxItems={4}
        renderItem={(item, index, onFieldChange) => (
          <div className="space-y-2">
            <Input
              value={item.title || ""}
              onChange={(e) => onFieldChange("title", e.target.value)}
              placeholder="Column title"
              className="font-medium"
            />
            <ArrayEditor
              items={item.links || []}
              onUpdate={(links) => onFieldChange("links", links)}
              newItem={() => ({ label: "", href: "" })}
              label="Links"
              renderItem={(link: any, linkIndex: number, onLinkChange: (field: string, value: any) => void) => (
                <div className="grid grid-cols-2 gap-2">
                  <Input value={link.label || ""} onChange={(e) => onLinkChange("label", e.target.value)} placeholder="Link text" />
                  <Input value={link.href || ""} onChange={(e) => onLinkChange("href", e.target.value)} placeholder="/path" />
                </div>
              )}
            />
          </div>
        )}
      />
    </div>
  );
}

// ── Section editor router ─────────────────────────

function SectionEditor({ sectionKey, data, onChange }: { sectionKey: string; data: any; onChange: (data: any) => void }) {
  switch (sectionKey) {
    case "hero": return <HeroEditor data={data} onChange={onChange} />;
    case "stats": return <StatsEditor data={data} onChange={onChange} />;
    case "whatBringsYou": return <WhatBringsYouEditor data={data} onChange={onChange} />;
    case "spyglassDifference": return <SpyglassDifferenceEditor data={data} onChange={onChange} />;
    case "featuredListings": return <FeaturedListingsEditor data={data} onChange={onChange} />;
    case "testimonials": return <TestimonialsEditor data={data} onChange={onChange} />;
    case "neighborhoods": return <NeighborhoodsEditor data={data} onChange={onChange} />;
    case "newForm": return <NewFormEditor data={data} onChange={onChange} />;
    case "footer": return <FooterEditor data={data} onChange={onChange} />;
    default: return <p className="text-muted-foreground">No editor for this section.</p>;
  }
}

// ── Main Page Component ───────────────────────────

export default function AdminSiteEditorPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Local state for each section's edited content
  const [editedSections, setEditedSections] = useState<Record<string, any>>({});
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());

  // Fetch all site content
  const { data: contentData, isLoading } = useQuery<SiteContentResponse>({
    queryKey: ["/api/admin/site-content"],
    queryFn: async () => {
      const res = await fetch("/api/admin/site-content", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch site content");
      return res.json();
    },
  });

  // Initialize local state from server data
  useEffect(() => {
    if (contentData?.sections) {
      setEditedSections((prev) => {
        const next: Record<string, any> = {};
        for (const key of Object.keys(contentData.sections)) {
          next[key] = prev[key] && dirtyKeys.has(key) ? prev[key] : contentData.sections[key];
        }
        return next;
      });
    }
  }, [contentData]);

  const handleSectionChange = useCallback((key: string, data: any) => {
    setEditedSections((prev) => ({ ...prev, [key]: data }));
    setDirtyKeys((prev) => new Set(prev).add(key));
  }, []);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async ({ section, content }: { section: string; content: any }) => {
      const res = await fetch(`/api/admin/site-content/${section}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      setDirtyKeys((prev) => {
        const next = new Set(prev);
        next.delete(variables.section);
        return next;
      });
      setSavingKeys((prev) => {
        const next = new Set(prev);
        next.delete(variables.section);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/site-content"] });
      toast({ title: "Saved!", description: `${variables.section} section updated successfully.` });
    },
    onError: (error: Error, variables) => {
      setSavingKeys((prev) => {
        const next = new Set(prev);
        next.delete(variables.section);
        return next;
      });
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Reset mutation
  const resetMutation = useMutation({
    mutationFn: async (section: string) => {
      const res = await fetch(`/api/admin/site-content/${section}/reset`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to reset");
      return res.json();
    },
    onSuccess: (data, section) => {
      setEditedSections((prev) => ({ ...prev, [section]: data.content }));
      setDirtyKeys((prev) => {
        const next = new Set(prev);
        next.delete(section);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/site-content"] });
      toast({ title: "Reset", description: `${section} section restored to defaults.` });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = (sectionKey: string) => {
    setSavingKeys((prev) => new Set(prev).add(sectionKey));
    saveMutation.mutate({ section: sectionKey, content: editedSections[sectionKey] });
  };

  const handleReset = (sectionKey: string) => {
    if (confirm(`Reset "${sectionKey}" to default values? Your customizations will be lost.`)) {
      resetMutation.mutate(sectionKey);
    }
  };

  // Guard: admin only
  if (!user?.isSuperAdmin) {
    return (
      <AdminLayout>
        <div className="max-w-2xl mx-auto py-12 text-center">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You need administrator privileges to access this page.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <Globe className="h-8 w-8 text-[#EF4923]" />
              Homepage Editor
            </h1>
            <p className="text-muted-foreground mt-2">
              Edit every section of the Spyglass IDX homepage. Changes are saved per-section.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("https://spyglass-idx.vercel.app", "_blank")}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Live Site
          </Button>
        </div>

        {/* Dirty indicator */}
        {dirtyKeys.size > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-4 py-2 text-sm text-yellow-800 dark:text-yellow-200">
            You have unsaved changes in: {Array.from(dirtyKeys).join(", ")}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {SECTION_META.map((meta) => {
              const isSaved = contentData?.savedSections?.includes(meta.key);
              const isDirty = dirtyKeys.has(meta.key);
              const isSaving = savingKeys.has(meta.key);
              const Icon = meta.icon;

              return (
                <AccordionItem key={meta.key} value={meta.key} className="border rounded-lg px-0">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]]:border-b">
                    <div className="flex items-center gap-3 text-left flex-1">
                      <div className="p-1.5 rounded-md bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{meta.label}</span>
                          {isSaved && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                              <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Customized
                            </Badge>
                          )}
                          {isDirty && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-yellow-500 text-yellow-600">
                              Unsaved
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{meta.description}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pt-4 pb-4">
                    <SectionEditor
                      sectionKey={meta.key}
                      data={editedSections[meta.key] || {}}
                      onChange={(data) => handleSectionChange(meta.key, data)}
                    />
                    <div className="flex items-center justify-between mt-6 pt-4 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReset(meta.key)}
                        disabled={resetMutation.isPending}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Reset to Defaults
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSave(meta.key)}
                        disabled={!isDirty || isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5 mr-1" />
                        )}
                        Save {meta.label}
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
    </AdminLayout>
  );
}
