import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout";
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
  GripVertical,
  Shield,
  Star,
  Home,
  Users,
  BarChart3,
  Award,
  MessageSquare,
  Quote,
  HelpCircle,
  ListChecks,
  FileText,
  Youtube,
  Megaphone,
  Footprints,
  CheckCircle2,
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
  { key: "hero", label: "Hero Section", icon: Home, description: "Main headline, background, CTA" },
  { key: "stats", label: "Stats Bar", icon: BarChart3, description: "3 stat items below hero" },
  { key: "awards", label: "Awards Section", icon: Award, description: "Award badges and review platforms" },
  { key: "seller", label: "Seller Section", icon: Users, description: "Seller-focused content block" },
  { key: "buyer", label: "Buyer Section", icon: Users, description: "Buyer-focused content block" },
  { key: "testimonials", label: "Testimonials", icon: Quote, description: "Customer testimonial carousel" },
  { key: "reviews", label: "Reviews Section", icon: Star, description: "5-star reviews feature" },
  { key: "whyChoose", label: "Why Choose Section", icon: HelpCircle, description: "Why Choose Spyglass" },
  { key: "threeReasons", label: "Three Reasons", icon: ListChecks, description: "3 reason cards" },
  { key: "newForm", label: "New Form Section", icon: FileText, description: "New Form of Realty" },
  { key: "youtube", label: "YouTube Section", icon: Youtube, description: "YouTube video showcase" },
  { key: "cta", label: "CTA Bar", icon: Megaphone, description: "Call-to-action banner" },
  { key: "footer", label: "Footer", icon: Footprints, description: "Site footer content" },
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

function ParagraphsEditor({
  paragraphs,
  onChange,
  label = "Body Paragraphs",
}: {
  paragraphs: string[];
  onChange: (paragraphs: string[]) => void;
  label?: string;
}) {
  return (
    <ArrayEditor
      items={paragraphs}
      onUpdate={onChange}
      newItem={() => ""}
      label={label}
      renderItem={(item, index, onFieldChange) => (
        <Textarea
          value={item}
          onChange={(e) => {
            const updated = [...paragraphs];
            updated[index] = e.target.value;
            onChange(updated);
          }}
          rows={3}
          placeholder={`Paragraph ${index + 1}`}
        />
      )}
    />
  );
}

// ── Section Editors ────────────────────────────────

function HeroEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  return (
    <div className="space-y-4">
      <FieldGroup label="Welcome Label">
        <Input value={data.welcomeLabel || ""} onChange={(e) => onChange({ ...data, welcomeLabel: e.target.value })} />
      </FieldGroup>
      <FieldGroup label="Headline">
        <Input value={data.headline || ""} onChange={(e) => onChange({ ...data, headline: e.target.value })} />
      </FieldGroup>
      <FieldGroup label="Headline Highlight (orange text)">
        <Input value={data.headlineHighlight || ""} onChange={(e) => onChange({ ...data, headlineHighlight: e.target.value })} />
      </FieldGroup>
      <FieldGroup label="Headline Suffix">
        <Input value={data.headlineSuffix || ""} onChange={(e) => onChange({ ...data, headlineSuffix: e.target.value })} />
      </FieldGroup>
      <FieldGroup label="Background Image URL">
        <Input value={data.backgroundImage || ""} onChange={(e) => onChange({ ...data, backgroundImage: e.target.value })} placeholder="/images/austin-skyline-hero.jpg" />
      </FieldGroup>
      <FieldGroup label="Background Image Fallback URL">
        <Input value={data.backgroundImageFallback || ""} onChange={(e) => onChange({ ...data, backgroundImageFallback: e.target.value })} />
      </FieldGroup>
      <div className="grid grid-cols-2 gap-4">
        <FieldGroup label="CTA Button Text">
          <Input value={data.ctaText || ""} onChange={(e) => onChange({ ...data, ctaText: e.target.value })} />
        </FieldGroup>
        <FieldGroup label="CTA Link">
          <Input value={data.ctaLink || ""} onChange={(e) => onChange({ ...data, ctaLink: e.target.value })} />
        </FieldGroup>
      </div>
      <FieldGroup label="Search Placeholder">
        <Input value={data.searchPlaceholder || ""} onChange={(e) => onChange({ ...data, searchPlaceholder: e.target.value })} />
      </FieldGroup>
    </div>
  );
}

function StatsEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  const items = data.items || [];
  return (
    <ArrayEditor
      items={items}
      onUpdate={(items) => onChange({ ...data, items })}
      newItem={() => ({ value: "", description: "", subtext: "" })}
      label="Stat Items"
      maxItems={4}
      renderItem={(item, index, onFieldChange) => (
        <div className="grid grid-cols-1 gap-2">
          <Input value={item.value || ""} onChange={(e) => onFieldChange("value", e.target.value)} placeholder="e.g. 6x Times" />
          <Input value={item.description || ""} onChange={(e) => onFieldChange("description", e.target.value)} placeholder="Description" />
          <Input value={item.subtext || ""} onChange={(e) => onFieldChange("subtext", e.target.value)} placeholder="Subtext" />
        </div>
      )}
    />
  );
}

function AwardsEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  return (
    <div className="space-y-6">
      <FieldGroup label="Section Heading">
        <Input value={data.heading || ""} onChange={(e) => onChange({ ...data, heading: e.target.value })} />
      </FieldGroup>

      <ArrayEditor
        items={data.badges || []}
        onUpdate={(badges) => onChange({ ...data, badges })}
        newItem={() => ({ title: "", subtitle: "", label: "", imageUrl: "" })}
        label="Award Badges"
        renderItem={(item, index, onFieldChange) => (
          <div className="grid grid-cols-1 gap-2">
            <Input value={item.title || ""} onChange={(e) => onFieldChange("title", e.target.value)} placeholder="Title (e.g. LEADING)" />
            <Input value={item.subtitle || ""} onChange={(e) => onFieldChange("subtitle", e.target.value)} placeholder="Subtitle (e.g. 5000)" />
            <Input value={item.label || ""} onChange={(e) => onFieldChange("label", e.target.value)} placeholder="Label below badge" />
            <Input value={item.imageUrl || ""} onChange={(e) => onFieldChange("imageUrl", e.target.value)} placeholder="Image URL (optional)" />
          </div>
        )}
      />

      <Separator />

      <ArrayEditor
        items={data.reviews || []}
        onUpdate={(reviews) => onChange({ ...data, reviews })}
        newItem={() => ({ rating: 5.0, platform: "", subtitle: "" })}
        label="Review Platforms"
        renderItem={(item, index, onFieldChange) => (
          <div className="grid grid-cols-3 gap-2">
            <Input type="number" step="0.1" min="0" max="5" value={item.rating ?? 5} onChange={(e) => onFieldChange("rating", parseFloat(e.target.value))} placeholder="Rating" />
            <Input value={item.platform || ""} onChange={(e) => onFieldChange("platform", e.target.value)} placeholder="Platform name" />
            <Input value={item.subtitle || ""} onChange={(e) => onFieldChange("subtitle", e.target.value)} placeholder="Subtitle" />
          </div>
        )}
      />
    </div>
  );
}

function ContentBlockEditor({
  data,
  onChange,
  sectionName,
}: {
  data: any;
  onChange: (data: any) => void;
  sectionName: string;
}) {
  return (
    <div className="space-y-4">
      <FieldGroup label="Label Tag">
        <Input value={data.label || ""} onChange={(e) => onChange({ ...data, label: e.target.value })} />
      </FieldGroup>
      <FieldGroup label="Heading">
        <Input value={data.heading || ""} onChange={(e) => onChange({ ...data, heading: e.target.value })} />
      </FieldGroup>
      <ParagraphsEditor
        paragraphs={data.paragraphs || []}
        onChange={(paragraphs) => onChange({ ...data, paragraphs })}
      />
      <FieldGroup label="Image URL">
        <Input value={data.imageUrl || ""} onChange={(e) => onChange({ ...data, imageUrl: e.target.value })} />
      </FieldGroup>
      <FieldGroup label="Image Alt Text">
        <Input value={data.imageAlt || ""} onChange={(e) => onChange({ ...data, imageAlt: e.target.value })} />
      </FieldGroup>
      <div className="grid grid-cols-2 gap-4">
        <FieldGroup label="Primary Button Text">
          <Input value={data.primaryButtonText || ""} onChange={(e) => onChange({ ...data, primaryButtonText: e.target.value })} />
        </FieldGroup>
        <FieldGroup label="Primary Button Link">
          <Input value={data.primaryButtonLink || ""} onChange={(e) => onChange({ ...data, primaryButtonLink: e.target.value })} />
        </FieldGroup>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FieldGroup label="Secondary Button Text">
          <Input value={data.secondaryButtonText || ""} onChange={(e) => onChange({ ...data, secondaryButtonText: e.target.value })} />
        </FieldGroup>
        <FieldGroup label="Secondary Button Link">
          <Input value={data.secondaryButtonLink || ""} onChange={(e) => onChange({ ...data, secondaryButtonLink: e.target.value })} />
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
        newItem={() => ({ quote: "", author: "", rating: 5 })}
        label="Testimonials"
        renderItem={(item, index, onFieldChange) => (
          <div className="grid grid-cols-1 gap-2">
            <Textarea value={item.quote || ""} onChange={(e) => onFieldChange("quote", e.target.value)} placeholder="Quote text" rows={3} />
            <div className="grid grid-cols-2 gap-2">
              <Input value={item.author || ""} onChange={(e) => onFieldChange("author", e.target.value)} placeholder="Author name" />
              <Input type="number" min="1" max="5" value={item.rating ?? 5} onChange={(e) => onFieldChange("rating", parseInt(e.target.value))} placeholder="Rating (1-5)" />
            </div>
          </div>
        )}
      />
    </div>
  );
}

function ReviewsEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  return (
    <div className="space-y-4">
      <FieldGroup label="Star Count">
        <Input type="number" min="1" max="5" value={data.starCount ?? 5} onChange={(e) => onChange({ ...data, starCount: parseInt(e.target.value) })} />
      </FieldGroup>
      <FieldGroup label="Heading">
        <Input value={data.heading || ""} onChange={(e) => onChange({ ...data, heading: e.target.value })} />
      </FieldGroup>
      <ParagraphsEditor
        paragraphs={data.paragraphs || []}
        onChange={(paragraphs) => onChange({ ...data, paragraphs })}
      />
      <FieldGroup label="Image URL">
        <Input value={data.imageUrl || ""} onChange={(e) => onChange({ ...data, imageUrl: e.target.value })} />
      </FieldGroup>
      <FieldGroup label="Image Alt Text">
        <Input value={data.imageAlt || ""} onChange={(e) => onChange({ ...data, imageAlt: e.target.value })} />
      </FieldGroup>
      <Separator />
      <p className="text-sm font-medium">Floating Review Card</p>
      <div className="grid grid-cols-2 gap-4">
        <FieldGroup label="Review Text">
          <Input value={data.floatingReview?.text || ""} onChange={(e) => onChange({ ...data, floatingReview: { ...data.floatingReview, text: e.target.value } })} />
        </FieldGroup>
        <FieldGroup label="Review Author">
          <Input value={data.floatingReview?.author || ""} onChange={(e) => onChange({ ...data, floatingReview: { ...data.floatingReview, author: e.target.value } })} />
        </FieldGroup>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FieldGroup label="Button Text">
          <Input value={data.buttonText || ""} onChange={(e) => onChange({ ...data, buttonText: e.target.value })} />
        </FieldGroup>
        <FieldGroup label="Button Link">
          <Input value={data.buttonLink || ""} onChange={(e) => onChange({ ...data, buttonLink: e.target.value })} />
        </FieldGroup>
      </div>
    </div>
  );
}

function WhyChooseEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  return (
    <div className="space-y-4">
      <FieldGroup label="Label">
        <Input value={data.label || ""} onChange={(e) => onChange({ ...data, label: e.target.value })} />
      </FieldGroup>
      <FieldGroup label="Heading">
        <Input value={data.heading || ""} onChange={(e) => onChange({ ...data, heading: e.target.value })} />
      </FieldGroup>
      <ParagraphsEditor
        paragraphs={data.paragraphs || []}
        onChange={(paragraphs) => onChange({ ...data, paragraphs })}
      />
      <div className="grid grid-cols-2 gap-4">
        <FieldGroup label="Button Text">
          <Input value={data.buttonText || ""} onChange={(e) => onChange({ ...data, buttonText: e.target.value })} />
        </FieldGroup>
        <FieldGroup label="Button Link">
          <Input value={data.buttonLink || ""} onChange={(e) => onChange({ ...data, buttonLink: e.target.value })} />
        </FieldGroup>
      </div>
    </div>
  );
}

function ThreeReasonsEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  return (
    <div className="space-y-4">
      <FieldGroup label="Heading">
        <Input value={data.heading || ""} onChange={(e) => onChange({ ...data, heading: e.target.value })} />
      </FieldGroup>
      <FieldGroup label="Subtext">
        <Input value={data.subtext || ""} onChange={(e) => onChange({ ...data, subtext: e.target.value })} />
      </FieldGroup>
      <ArrayEditor
        items={data.cards || []}
        onUpdate={(cards) => onChange({ ...data, cards })}
        newItem={() => ({ iconName: "HomeIcon", title: "", description: "" })}
        label="Reason Cards"
        maxItems={4}
        renderItem={(item, index, onFieldChange) => (
          <div className="grid grid-cols-1 gap-2">
            <Input value={item.iconName || ""} onChange={(e) => onFieldChange("iconName", e.target.value)} placeholder="Icon name (ChartBarIcon, UsersIcon, HomeIcon)" />
            <Input value={item.title || ""} onChange={(e) => onFieldChange("title", e.target.value)} placeholder="Card title" />
            <Textarea value={item.description || ""} onChange={(e) => onFieldChange("description", e.target.value)} placeholder="Description" rows={2} />
          </div>
        )}
      />
    </div>
  );
}

function NewFormEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  return (
    <div className="space-y-4">
      <FieldGroup label="Heading">
        <Input value={data.heading || ""} onChange={(e) => onChange({ ...data, heading: e.target.value })} />
      </FieldGroup>
      <ParagraphsEditor
        paragraphs={data.paragraphs || []}
        onChange={(paragraphs) => onChange({ ...data, paragraphs })}
      />
      <div className="grid grid-cols-2 gap-4">
        <FieldGroup label="Button Text">
          <Input value={data.buttonText || ""} onChange={(e) => onChange({ ...data, buttonText: e.target.value })} />
        </FieldGroup>
        <FieldGroup label="Button Link">
          <Input value={data.buttonLink || ""} onChange={(e) => onChange({ ...data, buttonLink: e.target.value })} />
        </FieldGroup>
      </div>
    </div>
  );
}

function YouTubeEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  return (
    <div className="space-y-4">
      <FieldGroup label="Heading">
        <Input value={data.heading || ""} onChange={(e) => onChange({ ...data, heading: e.target.value })} />
      </FieldGroup>
      <FieldGroup label="Subtext">
        <Input value={data.subtext || ""} onChange={(e) => onChange({ ...data, subtext: e.target.value })} />
      </FieldGroup>
      <FieldGroup label="Channel URL">
        <Input value={data.channelUrl || ""} onChange={(e) => onChange({ ...data, channelUrl: e.target.value })} />
      </FieldGroup>
      <FieldGroup label="Button Text">
        <Input value={data.buttonText || ""} onChange={(e) => onChange({ ...data, buttonText: e.target.value })} />
      </FieldGroup>
      <Separator />
      <ArrayEditor
        items={data.videos || []}
        onUpdate={(videos) => onChange({ ...data, videos })}
        newItem={() => ({ title: "", description: "", thumbnailUrl: "", videoUrl: "", featured: false })}
        label="Videos"
        renderItem={(item, index, onFieldChange) => (
          <div className="grid grid-cols-1 gap-2">
            <Input value={item.title || ""} onChange={(e) => onFieldChange("title", e.target.value)} placeholder="Video title" />
            <Input value={item.description || ""} onChange={(e) => onFieldChange("description", e.target.value)} placeholder="Description" />
            <Input value={item.thumbnailUrl || ""} onChange={(e) => onFieldChange("thumbnailUrl", e.target.value)} placeholder="Thumbnail URL" />
            <Input value={item.videoUrl || ""} onChange={(e) => onFieldChange("videoUrl", e.target.value)} placeholder="Video URL (YouTube embed)" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={item.featured || false} onChange={(e) => onFieldChange("featured", e.target.checked)} />
              Featured (large display)
            </label>
          </div>
        )}
      />
    </div>
  );
}

function CTAEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  return (
    <div className="space-y-4">
      <FieldGroup label="Heading">
        <Input value={data.heading || ""} onChange={(e) => onChange({ ...data, heading: e.target.value })} />
      </FieldGroup>
      <FieldGroup label="Subtext">
        <Textarea value={data.subtext || ""} onChange={(e) => onChange({ ...data, subtext: e.target.value })} rows={2} />
      </FieldGroup>
      <div className="grid grid-cols-2 gap-4">
        <FieldGroup label="Button Text">
          <Input value={data.buttonText || ""} onChange={(e) => onChange({ ...data, buttonText: e.target.value })} />
        </FieldGroup>
        <FieldGroup label="Button Link">
          <Input value={data.buttonLink || ""} onChange={(e) => onChange({ ...data, buttonLink: e.target.value })} />
        </FieldGroup>
      </div>
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
    case "awards": return <AwardsEditor data={data} onChange={onChange} />;
    case "seller": return <ContentBlockEditor data={data} onChange={onChange} sectionName="seller" />;
    case "buyer": return <ContentBlockEditor data={data} onChange={onChange} sectionName="buyer" />;
    case "testimonials": return <TestimonialsEditor data={data} onChange={onChange} />;
    case "reviews": return <ReviewsEditor data={data} onChange={onChange} />;
    case "whyChoose": return <WhyChooseEditor data={data} onChange={onChange} />;
    case "threeReasons": return <ThreeReasonsEditor data={data} onChange={onChange} />;
    case "newForm": return <NewFormEditor data={data} onChange={onChange} />;
    case "youtube": return <YouTubeEditor data={data} onChange={onChange} />;
    case "cta": return <CTAEditor data={data} onChange={onChange} />;
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
      <Layout>
        <div className="max-w-2xl mx-auto py-12 text-center">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You need administrator privileges to access this page.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
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
    </Layout>
  );
}
