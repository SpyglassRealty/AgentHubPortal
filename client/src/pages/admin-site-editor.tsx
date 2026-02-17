import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  Eye,
  EyeOff,
  Type,
  Image as ImageIcon,
  MousePointerClick,
  Minus,
  Code,
  Columns,
  Undo2,
  Redo2,
  ChevronLeft,
  ChevronRight,
  X,
  Copy,
  TableOfContents,
  AlignJustify,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────

interface SiteContentResponse {
  sections: Record<string, any>;
  savedSections: string[];
}

interface Block {
  id: string;
  type: string;
  sectionKey?: string; // links to existing homepage section data
  data: Record<string, any>;
  children?: Block[]; // for column blocks
}

// ── Block Type Registry ────────────────────────────

interface BlockTypeDef {
  type: string;
  label: string;
  icon: any;
  description: string;
  category: "homepage" | "generic";
  defaultData: () => Record<string, any>;
}

const BLOCK_TYPES: BlockTypeDef[] = [
  // Homepage sections (map to existing API)
  { type: "hero", label: "Hero", icon: Home, description: "Headline, CTA, search bar", category: "homepage", defaultData: () => ({}) },
  { type: "stats", label: "Stats Bar", icon: BarChart3, description: "Stat items row", category: "homepage", defaultData: () => ({ items: [] }) },
  { type: "awards", label: "Awards", icon: Award, description: "Award badges & reviews", category: "homepage", defaultData: () => ({}) },
  { type: "seller", label: "Seller", icon: Users, description: "Seller content block", category: "homepage", defaultData: () => ({}) },
  { type: "buyer", label: "Buyer", icon: Users, description: "Buyer content block", category: "homepage", defaultData: () => ({}) },
  { type: "testimonials", label: "Testimonials", icon: Quote, description: "Customer testimonial carousel", category: "homepage", defaultData: () => ({ items: [] }) },
  { type: "reviews", label: "Reviews", icon: Star, description: "5-star review feature", category: "homepage", defaultData: () => ({}) },
  { type: "whyChoose", label: "Why Choose", icon: HelpCircle, description: "Why Choose Spyglass", category: "homepage", defaultData: () => ({}) },
  { type: "threeReasons", label: "Three Reasons", icon: ListChecks, description: "Reason cards", category: "homepage", defaultData: () => ({ cards: [] }) },
  { type: "newForm", label: "New Form", icon: FileText, description: "New Form of Realty", category: "homepage", defaultData: () => ({}) },
  { type: "youtube", label: "YouTube", icon: Youtube, description: "Video showcase", category: "homepage", defaultData: () => ({ videos: [] }) },
  { type: "cta", label: "CTA Bar", icon: Megaphone, description: "Call-to-action banner", category: "homepage", defaultData: () => ({}) },
  { type: "footer", label: "Footer", icon: Footprints, description: "Site footer", category: "homepage", defaultData: () => ({ columns: [] }) },
  // Generic blocks
  { type: "text", label: "Text", icon: Type, description: "Rich text content", category: "generic", defaultData: () => ({ content: "" }) },
  { type: "image", label: "Image", icon: ImageIcon, description: "Image with alt text", category: "generic", defaultData: () => ({ src: "", alt: "", caption: "" }) },
  { type: "button", label: "Button", icon: MousePointerClick, description: "CTA button", category: "generic", defaultData: () => ({ text: "Click Here", link: "/", style: "primary", showButton: true }) },
  { type: "spacer", label: "Spacer", icon: Minus, description: "Vertical space", category: "generic", defaultData: () => ({ height: 48 }) },
  { type: "divider", label: "Divider", icon: AlignJustify, description: "Horizontal line", category: "generic", defaultData: () => ({}) },
  { type: "html", label: "HTML", icon: Code, description: "Raw HTML embed", category: "generic", defaultData: () => ({ code: "" }) },
  { type: "columns", label: "Columns", icon: Columns, description: "Multi-column layout", category: "generic", defaultData: () => ({ columnCount: 2, columns: [[], []] }) },
  { type: "tableOfContents", label: "Table of Contents", icon: TableOfContents, description: "Auto-generated TOC", category: "generic", defaultData: () => ({ title: "TABLE OF CONTENTS", autoGenerate: true, items: [] }) },
];

const BLOCK_TYPE_MAP = Object.fromEntries(BLOCK_TYPES.map((bt) => [bt.type, bt]));

function generateId() {
  return `block_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Undo/Redo Hook ─────────────────────────────────

function useUndoRedo<T>(initial: T) {
  const [history, setHistory] = useState<T[]>([initial]);
  const [index, setIndex] = useState(0);

  const current = history[index];

  const push = useCallback(
    (value: T) => {
      setHistory((prev) => {
        const newHistory = prev.slice(0, index + 1);
        newHistory.push(value);
        // Keep last 50 states
        if (newHistory.length > 50) newHistory.shift();
        return newHistory;
      });
      setIndex((prev) => Math.min(prev + 1, 49));
    },
    [index]
  );

  const undo = useCallback(() => {
    setIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const redo = useCallback(() => {
    setIndex((prev) => Math.min(history.length - 1, prev + 1));
  }, [history.length]);

  const canUndo = index > 0;
  const canRedo = index < history.length - 1;

  return { current, push, undo, redo, canUndo, canRedo };
}

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
        <p className="text-sm text-muted-foreground italic text-center py-2">No items yet.</p>
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

// ── CTA Toggle Wrapper ─────────────────────────────

function CTAToggle({
  showCta,
  onToggle,
  children,
  label = "Show CTA Button",
}: {
  showCta: boolean;
  onToggle: (show: boolean) => void;
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md">
        <Label className="text-sm font-medium cursor-pointer" htmlFor="cta-toggle">
          {label}
        </Label>
        <Switch
          id="cta-toggle"
          checked={showCta}
          onCheckedChange={onToggle}
        />
      </div>
      {showCta && <div className="space-y-3 pl-2 border-l-2 border-[#EF4923]/30">{children}</div>}
    </div>
  );
}

// ── Section Editors (reused from before, now with RichTextEditor) ─────

function HeroEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  const showCta = data.showCtaButton !== false;
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
      <CTAToggle showCta={showCta} onToggle={(v) => onChange({ ...data, showCtaButton: v })}>
        <div className="grid grid-cols-2 gap-4">
          <FieldGroup label="CTA Button Text">
            <Input value={data.ctaText || ""} onChange={(e) => onChange({ ...data, ctaText: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="CTA Link">
            <Input value={data.ctaLink || ""} onChange={(e) => onChange({ ...data, ctaLink: e.target.value })} />
          </FieldGroup>
        </div>
      </CTAToggle>
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
      renderItem={(item, _index, onFieldChange) => (
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
        renderItem={(item, _index, onFieldChange) => (
          <div className="grid grid-cols-1 gap-2">
            <Input value={item.title || ""} onChange={(e) => onFieldChange("title", e.target.value)} placeholder="Title" />
            <Input value={item.subtitle || ""} onChange={(e) => onFieldChange("subtitle", e.target.value)} placeholder="Subtitle" />
            <Input value={item.label || ""} onChange={(e) => onFieldChange("label", e.target.value)} placeholder="Label" />
            <Input value={item.imageUrl || ""} onChange={(e) => onFieldChange("imageUrl", e.target.value)} placeholder="Image URL" />
          </div>
        )}
      />
      <Separator />
      <ArrayEditor
        items={data.reviews || []}
        onUpdate={(reviews) => onChange({ ...data, reviews })}
        newItem={() => ({ rating: 5.0, platform: "", subtitle: "" })}
        label="Review Platforms"
        renderItem={(item, _index, onFieldChange) => (
          <div className="grid grid-cols-3 gap-2">
            <Input type="number" step="0.1" min="0" max="5" value={item.rating ?? 5} onChange={(e) => onFieldChange("rating", parseFloat(e.target.value))} placeholder="Rating" />
            <Input value={item.platform || ""} onChange={(e) => onFieldChange("platform", e.target.value)} placeholder="Platform" />
            <Input value={item.subtitle || ""} onChange={(e) => onFieldChange("subtitle", e.target.value)} placeholder="Subtitle" />
          </div>
        )}
      />
    </div>
  );
}

function ContentBlockEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  const showCta = data.showCtaButton !== false;
  return (
    <div className="space-y-4">
      <FieldGroup label="Label Tag">
        <Input value={data.label || ""} onChange={(e) => onChange({ ...data, label: e.target.value })} />
      </FieldGroup>
      <FieldGroup label="Heading">
        <Input value={data.heading || ""} onChange={(e) => onChange({ ...data, heading: e.target.value })} />
      </FieldGroup>
      <FieldGroup label="Body Content">
        <RichTextEditor
          content={(data.paragraphs || []).join("")}
          onChange={(html) => onChange({ ...data, paragraphs: [html] })}
          placeholder="Write your content here... Use the link button to add internal links for SEO."
        />
      </FieldGroup>
      <FieldGroup label="Image URL">
        <Input value={data.imageUrl || ""} onChange={(e) => onChange({ ...data, imageUrl: e.target.value })} />
      </FieldGroup>
      <FieldGroup label="Image Alt Text">
        <Input value={data.imageAlt || ""} onChange={(e) => onChange({ ...data, imageAlt: e.target.value })} />
      </FieldGroup>
      <CTAToggle showCta={showCta} onToggle={(v) => onChange({ ...data, showCtaButton: v })}>
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
      </CTAToggle>
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
        renderItem={(item, _index, onFieldChange) => (
          <div className="grid grid-cols-1 gap-2">
            <RichTextEditor
              content={item.quote || ""}
              onChange={(html) => onFieldChange("quote", html)}
              placeholder="Testimonial quote..."
              minHeight="80px"
            />
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
  const showCta = data.showCtaButton !== false;
  return (
    <div className="space-y-4">
      <FieldGroup label="Star Count">
        <Input type="number" min="1" max="5" value={data.starCount ?? 5} onChange={(e) => onChange({ ...data, starCount: parseInt(e.target.value) })} />
      </FieldGroup>
      <FieldGroup label="Heading">
        <Input value={data.heading || ""} onChange={(e) => onChange({ ...data, heading: e.target.value })} />
      </FieldGroup>
      <FieldGroup label="Body Content">
        <RichTextEditor
          content={(data.paragraphs || []).join("")}
          onChange={(html) => onChange({ ...data, paragraphs: [html] })}
          placeholder="Review section body content..."
        />
      </FieldGroup>
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
      <CTAToggle showCta={showCta} onToggle={(v) => onChange({ ...data, showCtaButton: v })}>
        <div className="grid grid-cols-2 gap-4">
          <FieldGroup label="Button Text">
            <Input value={data.buttonText || ""} onChange={(e) => onChange({ ...data, buttonText: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Button Link">
            <Input value={data.buttonLink || ""} onChange={(e) => onChange({ ...data, buttonLink: e.target.value })} />
          </FieldGroup>
        </div>
      </CTAToggle>
    </div>
  );
}

function WhyChooseEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  const showCta = data.showCtaButton !== false;
  return (
    <div className="space-y-4">
      <FieldGroup label="Label">
        <Input value={data.label || ""} onChange={(e) => onChange({ ...data, label: e.target.value })} />
      </FieldGroup>
      <FieldGroup label="Heading">
        <Input value={data.heading || ""} onChange={(e) => onChange({ ...data, heading: e.target.value })} />
      </FieldGroup>
      <FieldGroup label="Body Content">
        <RichTextEditor
          content={(data.paragraphs || []).join("")}
          onChange={(html) => onChange({ ...data, paragraphs: [html] })}
          placeholder="Why choose us content..."
        />
      </FieldGroup>
      <CTAToggle showCta={showCta} onToggle={(v) => onChange({ ...data, showCtaButton: v })}>
        <div className="grid grid-cols-2 gap-4">
          <FieldGroup label="Button Text">
            <Input value={data.buttonText || ""} onChange={(e) => onChange({ ...data, buttonText: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Button Link">
            <Input value={data.buttonLink || ""} onChange={(e) => onChange({ ...data, buttonLink: e.target.value })} />
          </FieldGroup>
        </div>
      </CTAToggle>
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
        renderItem={(item, _index, onFieldChange) => (
          <div className="grid grid-cols-1 gap-2">
            <Input value={item.iconName || ""} onChange={(e) => onFieldChange("iconName", e.target.value)} placeholder="Icon name" />
            <Input value={item.title || ""} onChange={(e) => onFieldChange("title", e.target.value)} placeholder="Card title" />
            <RichTextEditor
              content={item.description || ""}
              onChange={(html) => onFieldChange("description", html)}
              placeholder="Card description..."
              minHeight="60px"
            />
          </div>
        )}
      />
    </div>
  );
}

function NewFormEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  const showCta = data.showCtaButton !== false;
  return (
    <div className="space-y-4">
      <FieldGroup label="Heading">
        <Input value={data.heading || ""} onChange={(e) => onChange({ ...data, heading: e.target.value })} />
      </FieldGroup>
      <FieldGroup label="Body Content">
        <RichTextEditor
          content={(data.paragraphs || []).join("")}
          onChange={(html) => onChange({ ...data, paragraphs: [html] })}
          placeholder="New form of realty content..."
        />
      </FieldGroup>
      <CTAToggle showCta={showCta} onToggle={(v) => onChange({ ...data, showCtaButton: v })}>
        <div className="grid grid-cols-2 gap-4">
          <FieldGroup label="Button Text">
            <Input value={data.buttonText || ""} onChange={(e) => onChange({ ...data, buttonText: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Button Link">
            <Input value={data.buttonLink || ""} onChange={(e) => onChange({ ...data, buttonLink: e.target.value })} />
          </FieldGroup>
        </div>
      </CTAToggle>
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
        renderItem={(item, _index, onFieldChange) => (
          <div className="grid grid-cols-1 gap-2">
            <Input value={item.title || ""} onChange={(e) => onFieldChange("title", e.target.value)} placeholder="Video title" />
            <Input value={item.description || ""} onChange={(e) => onFieldChange("description", e.target.value)} placeholder="Description" />
            <Input value={item.thumbnailUrl || ""} onChange={(e) => onFieldChange("thumbnailUrl", e.target.value)} placeholder="Thumbnail URL" />
            <Input value={item.videoUrl || ""} onChange={(e) => onFieldChange("videoUrl", e.target.value)} placeholder="Video URL" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={item.featured || false} onChange={(e) => onFieldChange("featured", e.target.checked)} />
              Featured
            </label>
          </div>
        )}
      />
    </div>
  );
}

function CTAEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  const showCta = data.showCtaButton !== false;
  return (
    <div className="space-y-4">
      <FieldGroup label="Heading">
        <Input value={data.heading || ""} onChange={(e) => onChange({ ...data, heading: e.target.value })} />
      </FieldGroup>
      <FieldGroup label="Subtext">
        <RichTextEditor
          content={data.subtext || ""}
          onChange={(html) => onChange({ ...data, subtext: html })}
          placeholder="CTA subtext..."
          minHeight="60px"
        />
      </FieldGroup>
      <CTAToggle showCta={showCta} onToggle={(v) => onChange({ ...data, showCtaButton: v })}>
        <div className="grid grid-cols-2 gap-4">
          <FieldGroup label="Button Text">
            <Input value={data.buttonText || ""} onChange={(e) => onChange({ ...data, buttonText: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Button Link">
            <Input value={data.buttonLink || ""} onChange={(e) => onChange({ ...data, buttonLink: e.target.value })} />
          </FieldGroup>
        </div>
      </CTAToggle>
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
        renderItem={(item, _index, onFieldChange) => (
          <div className="space-y-2">
            <Input value={item.title || ""} onChange={(e) => onFieldChange("title", e.target.value)} placeholder="Column title" className="font-medium" />
            <ArrayEditor
              items={item.links || []}
              onUpdate={(links) => onFieldChange("links", links)}
              newItem={() => ({ label: "", href: "" })}
              label="Links"
              renderItem={(link: any, _li: number, onLinkChange: any) => (
                <div className="grid grid-cols-2 gap-2">
                  <Input value={link.label || ""} onChange={(e: any) => onLinkChange("label", e.target.value)} placeholder="Link text" />
                  <Input value={link.href || ""} onChange={(e: any) => onLinkChange("href", e.target.value)} placeholder="/path" />
                </div>
              )}
            />
          </div>
        )}
      />
    </div>
  );
}

// ── Generic Block Editors ──────────────────────────

function TextBlockEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  return (
    <FieldGroup label="Content">
      <RichTextEditor
        content={data.content || ""}
        onChange={(html) => onChange({ ...data, content: html })}
        placeholder="Type your content... Add links for SEO!"
        minHeight="150px"
      />
    </FieldGroup>
  );
}

function ImageBlockEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  return (
    <div className="space-y-4">
      <FieldGroup label="Image URL">
        <Input value={data.src || ""} onChange={(e) => onChange({ ...data, src: e.target.value })} placeholder="https://..." />
      </FieldGroup>
      <FieldGroup label="Alt Text (SEO)">
        <Input value={data.alt || ""} onChange={(e) => onChange({ ...data, alt: e.target.value })} placeholder="Describe the image for accessibility" />
      </FieldGroup>
      <FieldGroup label="Caption">
        <Input value={data.caption || ""} onChange={(e) => onChange({ ...data, caption: e.target.value })} />
      </FieldGroup>
    </div>
  );
}

function ButtonBlockEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  return (
    <div className="space-y-4">
      <CTAToggle showCta={data.showButton !== false} onToggle={(v) => onChange({ ...data, showButton: v })}>
        <div className="grid grid-cols-2 gap-4">
          <FieldGroup label="Button Text">
            <Input value={data.text || ""} onChange={(e) => onChange({ ...data, text: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Link URL">
            <Input value={data.link || ""} onChange={(e) => onChange({ ...data, link: e.target.value })} />
          </FieldGroup>
        </div>
        <FieldGroup label="Style">
          <select
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            value={data.style || "primary"}
            onChange={(e) => onChange({ ...data, style: e.target.value })}
          >
            <option value="primary">Primary (Orange)</option>
            <option value="secondary">Secondary (Outline)</option>
            <option value="ghost">Ghost</option>
          </select>
        </FieldGroup>
      </CTAToggle>
    </div>
  );
}

function SpacerBlockEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  return (
    <FieldGroup label="Height (px)">
      <Input type="number" min="8" max="200" value={data.height || 48} onChange={(e) => onChange({ ...data, height: parseInt(e.target.value) })} />
    </FieldGroup>
  );
}

function HtmlBlockEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  return (
    <FieldGroup label="HTML Code">
      <Textarea
        value={data.code || ""}
        onChange={(e) => onChange({ ...data, code: e.target.value })}
        rows={8}
        className="font-mono text-sm"
        placeholder="<div>Your HTML here</div>"
      />
    </FieldGroup>
  );
}

// ── Table of Contents Block Editor ──────────────────

function TOCBlockEditor({
  data,
  onChange,
  allBlocks,
}: {
  data: any;
  onChange: (data: any) => void;
  allBlocks: Block[];
}) {
  const autoGenerate = useCallback(() => {
    // Scan all blocks for headings in rich text content
    const items: { text: string; anchorId: string; level: number }[] = [];

    function extractHeadings(html: string) {
      const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gi;
      const h3Regex = /<h3[^>]*>(.*?)<\/h3>/gi;
      let match;
      while ((match = h2Regex.exec(html)) !== null) {
        const text = match[1].replace(/<[^>]*>/g, "").trim();
        if (text) items.push({ text, anchorId: slugify(text), level: 2 });
      }
      while ((match = h3Regex.exec(html)) !== null) {
        const text = match[1].replace(/<[^>]*>/g, "").trim();
        if (text) items.push({ text, anchorId: slugify(text), level: 3 });
      }
    }

    for (const block of allBlocks) {
      if (block.type === "text" && block.data.content) {
        extractHeadings(block.data.content);
      }
      // Also scan homepage section data that might have heading fields
      if (block.data.heading) {
        items.push({ text: block.data.heading, anchorId: slugify(block.data.heading), level: 2 });
      }
      // Check paragraphs content for headings
      if (block.data.paragraphs) {
        for (const p of block.data.paragraphs) {
          if (typeof p === "string") extractHeadings(p);
        }
      }
      // Columns children
      if (block.type === "columns" && block.children) {
        for (const child of block.children) {
          if (child.data.content) extractHeadings(child.data.content);
          if (child.data.heading) {
            items.push({ text: child.data.heading, anchorId: slugify(child.data.heading), level: 2 });
          }
        }
      }
    }

    onChange({ ...data, items, autoGenerate: true });
  }, [allBlocks, data, onChange]);

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...(data.items || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange({ ...data, items: newItems });
  };

  const removeItem = (index: number) => {
    onChange({ ...data, items: (data.items || []).filter((_: any, i: number) => i !== index) });
  };

  const addItem = () => {
    onChange({
      ...data,
      items: [...(data.items || []), { text: "New Section", anchorId: "new-section", level: 2 }],
    });
  };

  return (
    <div className="space-y-4">
      <FieldGroup label="Title">
        <Input value={data.title || "TABLE OF CONTENTS"} onChange={(e) => onChange({ ...data, title: e.target.value })} />
      </FieldGroup>

      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={autoGenerate}>
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          Auto-generate from headings
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add item
        </Button>
      </div>

      {/* Preview */}
      <div className="rounded-lg border-l-4 border-[#EF4923] bg-[#f0f7f0] p-4 space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-800">{data.title || "TABLE OF CONTENTS"}</p>
        <ul className="space-y-1.5">
          {(data.items || []).map((item: any, i: number) => (
            <li key={i} className={cn("flex items-start gap-2", item.level === 3 && "ml-4")}>
              <span className="text-[#EF4923] mt-1">•</span>
              <div className="flex-1 flex items-center gap-2">
                <Input
                  value={item.text}
                  onChange={(e) => updateItem(i, "text", e.target.value)}
                  className="h-7 text-sm border-0 bg-transparent px-0 focus-visible:ring-0 text-[#EF4923] font-medium"
                />
                <select
                  className="h-7 text-xs border rounded px-1"
                  value={item.level}
                  onChange={(e) => updateItem(i, "level", parseInt(e.target.value))}
                >
                  <option value={2}>H2</option>
                  <option value={3}>H3</option>
                </select>
                <button type="button" onClick={() => removeItem(i)} className="text-muted-foreground hover:text-destructive">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
        {(!data.items || data.items.length === 0) && (
          <p className="text-sm text-muted-foreground italic">No items. Click auto-generate or add manually.</p>
        )}
      </div>
    </div>
  );
}

// ── Column Block Editor ─────────────────────────────

function ColumnBlockEditor({
  block,
  onBlockChange,
  selectedBlockId,
  onSelectBlock,
}: {
  block: Block;
  onBlockChange: (block: Block) => void;
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
}) {
  const columnCount = block.data.columnCount || 2;
  const columns: Block[][] = block.data.columns || Array.from({ length: columnCount }, () => []);

  const setColumnCount = (count: number) => {
    const newColumns = [...columns];
    while (newColumns.length < count) newColumns.push([]);
    while (newColumns.length > count) newColumns.pop();
    onBlockChange({
      ...block,
      data: { ...block.data, columnCount: count, columns: newColumns },
    });
  };

  const updateColumnBlocks = (colIndex: number, blocks: Block[]) => {
    const newColumns = [...columns];
    newColumns[colIndex] = blocks;
    onBlockChange({
      ...block,
      data: { ...block.data, columns: newColumns },
    });
  };

  const addBlockToColumn = (colIndex: number, type: string) => {
    const typeDef = BLOCK_TYPE_MAP[type];
    if (!typeDef || type === "columns") return; // no nested columns
    const newBlock: Block = {
      id: generateId(),
      type,
      data: typeDef.defaultData(),
    };
    updateColumnBlocks(colIndex, [...(columns[colIndex] || []), newBlock]);
    onSelectBlock(newBlock.id);
  };

  const removeBlockFromColumn = (colIndex: number, blockId: string) => {
    updateColumnBlocks(
      colIndex,
      (columns[colIndex] || []).filter((b) => b.id !== blockId)
    );
    if (selectedBlockId === blockId) onSelectBlock(null);
  };

  const updateBlockInColumn = (colIndex: number, blockId: string, newData: any) => {
    updateColumnBlocks(
      colIndex,
      (columns[colIndex] || []).map((b) => (b.id === blockId ? { ...b, data: newData } : b))
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">Columns:</Label>
        {[1, 2, 3, 4].map((n) => (
          <Button
            key={n}
            type="button"
            variant={columnCount === n ? "default" : "outline"}
            size="sm"
            className="w-8 h-8 p-0"
            onClick={() => setColumnCount(n)}
          >
            {n}
          </Button>
        ))}
      </div>

      <div className={cn("grid gap-3", `grid-cols-${Math.min(columnCount, 4)}`)}>
        {Array.from({ length: columnCount }).map((_, colIndex) => (
          <ColumnDropZone
            key={colIndex}
            colIndex={colIndex}
            blocks={columns[colIndex] || []}
            onAddBlock={(type) => addBlockToColumn(colIndex, type)}
            onRemoveBlock={(id) => removeBlockFromColumn(colIndex, id)}
            onUpdateBlock={(id, data) => updateBlockInColumn(colIndex, id, data)}
            selectedBlockId={selectedBlockId}
            onSelectBlock={onSelectBlock}
          />
        ))}
      </div>
    </div>
  );
}

function ColumnDropZone({
  colIndex,
  blocks,
  onAddBlock,
  onRemoveBlock,
  onUpdateBlock,
  selectedBlockId,
  onSelectBlock,
}: {
  colIndex: number;
  blocks: Block[];
  onAddBlock: (type: string) => void;
  onRemoveBlock: (id: string) => void;
  onUpdateBlock: (id: string, data: any) => void;
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${colIndex}`,
    data: { type: "column", colIndex },
  });

  const allowedTypes = BLOCK_TYPES.filter(
    (bt) => bt.category === "generic" && bt.type !== "columns" && bt.type !== "tableOfContents"
  );

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "border-2 border-dashed rounded-lg p-2 min-h-[120px] transition-colors",
        isOver ? "border-[#EF4923] bg-[#EF4923]/5" : "border-muted-foreground/20"
      )}
    >
      <p className="text-xs font-medium text-muted-foreground mb-2">Column {colIndex + 1}</p>
      <div className="space-y-2">
        {blocks.map((block) => {
          const typeDef = BLOCK_TYPE_MAP[block.type];
          const Icon = typeDef?.icon || Type;
          return (
            <div
              key={block.id}
              className={cn(
                "border rounded p-2 cursor-pointer transition-all",
                selectedBlockId === block.id ? "ring-2 ring-[#EF4923] border-[#EF4923]" : "hover:border-foreground/30"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onSelectBlock(block.id);
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium">{typeDef?.label || block.type}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveBlock(block.id);
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              {/* Inline mini editor for column children */}
              {selectedBlockId === block.id && (
                <div className="mt-2 pt-2 border-t">
                  <BlockSettingsEditor
                    block={block}
                    onChange={(newData) => onUpdateBlock(block.id, newData)}
                    allBlocks={[]}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Add block menu */}
      <div className="mt-2">
        <select
          className="w-full h-7 text-xs border rounded px-1 text-muted-foreground"
          value=""
          onChange={(e) => {
            if (e.target.value) onAddBlock(e.target.value);
            e.target.value = "";
          }}
        >
          <option value="">+ Add block...</option>
          {allowedTypes.map((bt) => (
            <option key={bt.type} value={bt.type}>
              {bt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ── Block Settings Router ──────────────────────────

function BlockSettingsEditor({
  block,
  onChange,
  allBlocks,
}: {
  block: Block;
  onChange: (data: any) => void;
  allBlocks: Block[];
}) {
  const data = block.data;
  switch (block.type) {
    // Homepage sections
    case "hero": return <HeroEditor data={data} onChange={onChange} />;
    case "stats": return <StatsEditor data={data} onChange={onChange} />;
    case "awards": return <AwardsEditor data={data} onChange={onChange} />;
    case "seller": return <ContentBlockEditor data={data} onChange={onChange} />;
    case "buyer": return <ContentBlockEditor data={data} onChange={onChange} />;
    case "testimonials": return <TestimonialsEditor data={data} onChange={onChange} />;
    case "reviews": return <ReviewsEditor data={data} onChange={onChange} />;
    case "whyChoose": return <WhyChooseEditor data={data} onChange={onChange} />;
    case "threeReasons": return <ThreeReasonsEditor data={data} onChange={onChange} />;
    case "newForm": return <NewFormEditor data={data} onChange={onChange} />;
    case "youtube": return <YouTubeEditor data={data} onChange={onChange} />;
    case "cta": return <CTAEditor data={data} onChange={onChange} />;
    case "footer": return <FooterEditor data={data} onChange={onChange} />;
    // Generic blocks
    case "text": return <TextBlockEditor data={data} onChange={onChange} />;
    case "image": return <ImageBlockEditor data={data} onChange={onChange} />;
    case "button": return <ButtonBlockEditor data={data} onChange={onChange} />;
    case "spacer": return <SpacerBlockEditor data={data} onChange={onChange} />;
    case "divider": return <p className="text-sm text-muted-foreground">Horizontal divider — no settings needed.</p>;
    case "html": return <HtmlBlockEditor data={data} onChange={onChange} />;
    case "tableOfContents": return <TOCBlockEditor data={data} onChange={onChange} allBlocks={allBlocks} />;
    default: return <p className="text-muted-foreground">No editor for this block type.</p>;
  }
}

// ── Sortable Block Item (Canvas) ───────────────────

function SortableBlockItem({
  block,
  isSelected,
  onClick,
  onRemove,
  onDuplicate,
}: {
  block: Block;
  isSelected: boolean;
  onClick: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const typeDef = BLOCK_TYPE_MAP[block.type];
  const Icon = typeDef?.icon || Type;
  const isHomepage = typeDef?.category === "homepage";

  // Generate preview text
  const getPreview = () => {
    const d = block.data;
    if (block.type === "hero") return d.headline || "Hero Section";
    if (block.type === "text") {
      const stripped = (d.content || "").replace(/<[^>]*>/g, "");
      return stripped.slice(0, 80) || "Empty text block";
    }
    if (block.type === "tableOfContents") return `${(d.items || []).length} items`;
    if (block.type === "columns") return `${d.columnCount || 2} columns`;
    if (block.type === "image") return d.alt || d.src || "No image set";
    if (block.type === "button") return d.text || "Button";
    if (block.type === "spacer") return `${d.height || 48}px`;
    if (d.heading) return d.heading;
    if (d.label) return d.label;
    return typeDef?.description || block.type;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative border rounded-lg transition-all cursor-pointer",
        isSelected
          ? "ring-2 ring-[#EF4923] border-[#EF4923] shadow-md"
          : "hover:border-foreground/30 hover:shadow-sm",
        isDragging && "shadow-lg z-50"
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Drag handle */}
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Icon & Label */}
        <div className={cn("p-1.5 rounded-md", isHomepage ? "bg-[#EF4923]/10" : "bg-muted")}>
          <Icon className={cn("h-4 w-4", isHomepage ? "text-[#EF4923]" : "text-muted-foreground")} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{typeDef?.label || block.type}</span>
            {isHomepage && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                Section
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{getPreview()}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Duplicate"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            title="Remove"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Drag Overlay Item ──────────────────────────────

function DragOverlayItem({ block }: { block: Block | null }) {
  if (!block) return null;
  const typeDef = BLOCK_TYPE_MAP[block.type];
  const Icon = typeDef?.icon || Type;
  return (
    <div className="border rounded-lg bg-background shadow-xl px-3 py-2.5 flex items-center gap-3 opacity-90">
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <div className="p-1.5 rounded-md bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <span className="font-medium text-sm">{typeDef?.label || block.type}</span>
    </div>
  );
}

// ── Palette Item (left sidebar, draggable source) ──

function PaletteItem({ typeDef, onAdd }: { typeDef: BlockTypeDef; onAdd: () => void }) {
  const Icon = typeDef.icon;
  return (
    <button
      type="button"
      onClick={onAdd}
      className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-left hover:bg-muted transition-colors group"
    >
      <div className={cn("p-1.5 rounded-md", typeDef.category === "homepage" ? "bg-[#EF4923]/10" : "bg-muted group-hover:bg-background")}>
        <Icon className={cn("h-3.5 w-3.5", typeDef.category === "homepage" ? "text-[#EF4923]" : "text-muted-foreground")} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight">{typeDef.label}</p>
        <p className="text-[11px] text-muted-foreground truncate">{typeDef.description}</p>
      </div>
    </button>
  );
}

// ── Main Page Component ───────────────────────────

export default function AdminSiteEditorPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [blocks, setBlocks] = useState<Block[]>([]);
  const { current: undoBlocks, push: pushUndo, undo, redo, canUndo, canRedo } = useUndoRedo<Block[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());
  const [savingAll, setSavingAll] = useState(false);
  const [activeBlock, setActiveBlock] = useState<Block | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Fetch all site content
  const { data: contentData, isLoading } = useQuery<SiteContentResponse>({
    queryKey: ["/api/admin/site-content"],
    queryFn: async () => {
      const res = await fetch("/api/admin/site-content", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch site content");
      return res.json();
    },
  });

  // Initialize blocks from server data
  useEffect(() => {
    if (contentData?.sections && blocks.length === 0) {
      // Check for saved block order
      const savedOrder = contentData.sections._blockOrder;
      const savedGenericBlocks = contentData.sections._genericBlocks;

      if (savedOrder && Array.isArray(savedOrder)) {
        // Restore saved layout
        const restoredBlocks: Block[] = [];
        for (const entry of savedOrder) {
          if (entry.type && entry.id) {
            const typeDef = BLOCK_TYPE_MAP[entry.type];
            if (!typeDef) continue;

            if (typeDef.category === "homepage") {
              restoredBlocks.push({
                id: entry.id,
                type: entry.type,
                sectionKey: entry.type,
                data: contentData.sections[entry.type] || typeDef.defaultData(),
              });
            } else if (savedGenericBlocks?.[entry.id]) {
              restoredBlocks.push({
                id: entry.id,
                type: entry.type,
                data: savedGenericBlocks[entry.id],
              });
            }
          }
        }
        if (restoredBlocks.length > 0) {
          setBlocks(restoredBlocks);
          pushUndo(restoredBlocks);
          return;
        }
      }

      // Default: create blocks for each existing homepage section
      const defaultSectionOrder = [
        "hero", "stats", "awards", "seller", "buyer", "testimonials",
        "reviews", "whyChoose", "threeReasons", "newForm", "youtube", "cta", "footer",
      ];
      const initialBlocks: Block[] = defaultSectionOrder
        .filter((key) => contentData.sections[key])
        .map((key) => ({
          id: `section_${key}`,
          type: key,
          sectionKey: key,
          data: contentData.sections[key],
        }));
      setBlocks(initialBlocks);
      pushUndo(initialBlocks);
    }
  }, [contentData]);

  // Sync undo state
  useEffect(() => {
    if (undoBlocks.length > 0 && undoBlocks !== blocks) {
      setBlocks(undoBlocks);
    }
  }, [undoBlocks]);

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.id === selectedBlockId) || null,
    [blocks, selectedBlockId]
  );

  // ── Block Operations ─────────────────────────────

  const addBlock = useCallback(
    (type: string) => {
      const typeDef = BLOCK_TYPE_MAP[type];
      if (!typeDef) return;
      const newBlock: Block = {
        id: generateId(),
        type,
        sectionKey: typeDef.category === "homepage" ? type : undefined,
        data: typeDef.category === "homepage" && contentData?.sections[type]
          ? { ...contentData.sections[type] }
          : typeDef.defaultData(),
      };
      const newBlocks = [...blocks, newBlock];
      setBlocks(newBlocks);
      pushUndo(newBlocks);
      setSelectedBlockId(newBlock.id);
      setDirtyKeys((prev) => new Set(prev).add("_layout"));
    },
    [blocks, contentData, pushUndo]
  );

  const removeBlock = useCallback(
    (id: string) => {
      const newBlocks = blocks.filter((b) => b.id !== id);
      setBlocks(newBlocks);
      pushUndo(newBlocks);
      if (selectedBlockId === id) setSelectedBlockId(null);
      setDirtyKeys((prev) => new Set(prev).add("_layout"));
    },
    [blocks, selectedBlockId, pushUndo]
  );

  const duplicateBlock = useCallback(
    (id: string) => {
      const block = blocks.find((b) => b.id === id);
      if (!block) return;
      const newBlock: Block = {
        ...block,
        id: generateId(),
        data: JSON.parse(JSON.stringify(block.data)),
      };
      const idx = blocks.findIndex((b) => b.id === id);
      const newBlocks = [...blocks];
      newBlocks.splice(idx + 1, 0, newBlock);
      setBlocks(newBlocks);
      pushUndo(newBlocks);
      setSelectedBlockId(newBlock.id);
      setDirtyKeys((prev) => new Set(prev).add("_layout"));
    },
    [blocks, pushUndo]
  );

  const updateBlockData = useCallback(
    (id: string, data: any) => {
      const newBlocks = blocks.map((b) => (b.id === id ? { ...b, data } : b));
      setBlocks(newBlocks);
      // Find the block to mark dirty
      const block = blocks.find((b) => b.id === id);
      if (block?.sectionKey) {
        setDirtyKeys((prev) => new Set(prev).add(block.sectionKey!));
      } else {
        setDirtyKeys((prev) => new Set(prev).add("_layout"));
      }
    },
    [blocks]
  );

  const updateBlockFull = useCallback(
    (id: string, updatedBlock: Block) => {
      const newBlocks = blocks.map((b) => (b.id === id ? updatedBlock : b));
      setBlocks(newBlocks);
      setDirtyKeys((prev) => new Set(prev).add("_layout"));
    },
    [blocks]
  );

  const commitUndo = useCallback(() => {
    pushUndo(blocks);
  }, [blocks, pushUndo]);

  // ── Drag & Drop ──────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    const block = blocks.find((b) => b.id === event.active.id);
    setActiveBlock(block || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveBlock(null);

    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newBlocks = arrayMove(blocks, oldIndex, newIndex);
      setBlocks(newBlocks);
      pushUndo(newBlocks);
      setDirtyKeys((prev) => new Set(prev).add("_layout"));
    }
  };

  // ── Save All ─────────────────────────────────────

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
  });

  const handleSaveAll = async () => {
    setSavingAll(true);
    try {
      // Save each dirty homepage section
      const homepageBlocks = blocks.filter((b) => b.sectionKey);
      const dirtyHomepageSections = homepageBlocks.filter((b) => dirtyKeys.has(b.sectionKey!));

      for (const block of dirtyHomepageSections) {
        await saveMutation.mutateAsync({ section: block.sectionKey!, content: block.data });
      }

      // Save the block order and generic blocks layout
      const blockOrder = blocks.map((b) => ({ id: b.id, type: b.type }));
      const genericBlocks: Record<string, any> = {};
      for (const b of blocks) {
        if (!b.sectionKey) {
          genericBlocks[b.id] = b.data;
        }
      }

      await saveMutation.mutateAsync({
        section: "_blockOrder",
        content: blockOrder,
      });
      await saveMutation.mutateAsync({
        section: "_genericBlocks",
        content: genericBlocks,
      });

      setDirtyKeys(new Set());
      queryClient.invalidateQueries({ queryKey: ["/api/admin/site-content"] });
      toast({ title: "Saved!", description: "All changes published successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSavingAll(false);
    }
  };

  // ── Reset Section ────────────────────────────────

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
      const newBlocks = blocks.map((b) =>
        b.sectionKey === section ? { ...b, data: data.content } : b
      );
      setBlocks(newBlocks);
      pushUndo(newBlocks);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/site-content"] });
      toast({ title: "Reset", description: `${section} restored to defaults.` });
    },
  });

  // Guard: admin only
  if (!user?.isSuperAdmin) {
    return (
      <AdminLayout>
        <div className="max-w-2xl mx-auto py-12 text-center">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">Administrator privileges required.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-64px)] flex flex-col">
        {/* Top Toolbar */}
        <div className="flex items-center justify-between border-b px-4 py-2 bg-background shrink-0">
          <div className="flex items-center gap-3">
            <Globe className="h-6 w-6 text-[#EF4923]" />
            <div>
              <h1 className="text-lg font-bold leading-tight">Homepage Builder</h1>
              <p className="text-xs text-muted-foreground">Visual page editor</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Undo/Redo */}
            <Button variant="ghost" size="icon" onClick={() => { undo(); }} disabled={!canUndo} title="Undo">
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => { redo(); }} disabled={!canRedo} title="Redo">
              <Redo2 className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6" />

            {/* Preview toggle */}
            <Button variant="ghost" size="sm" onClick={() => setPreviewMode(!previewMode)}>
              {previewMode ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
              {previewMode ? "Editing" : "Preview"}
            </Button>

            {/* View live */}
            <Button variant="ghost" size="sm" onClick={() => window.open("https://spyglass-idx.vercel.app", "_blank")}>
              <ExternalLink className="h-4 w-4 mr-1" />
              Live
            </Button>

            <Separator orientation="vertical" className="h-6" />

            {/* Dirty indicator */}
            {dirtyKeys.size > 0 && (
              <Badge variant="outline" className="border-yellow-500 text-yellow-600 text-xs">
                {dirtyKeys.size} unsaved
              </Badge>
            )}

            {/* Save */}
            <Button size="sm" onClick={handleSaveAll} disabled={dirtyKeys.size === 0 || savingAll}>
              {savingAll ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Save All
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* ── Left Sidebar: Block Palette ── */}
            <div
              className={cn(
                "border-r bg-muted/30 transition-all duration-200 shrink-0",
                leftPanelOpen ? "w-64" : "w-0"
              )}
            >
              {leftPanelOpen && (
                <ScrollArea className="h-full">
                  <div className="p-3 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Blocks</p>
                      <button type="button" onClick={() => setLeftPanelOpen(false)} className="text-muted-foreground hover:text-foreground">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Homepage Sections */}
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Homepage Sections
                      </p>
                      <div className="space-y-0.5">
                        {BLOCK_TYPES.filter((bt) => bt.category === "homepage").map((bt) => (
                          <PaletteItem key={bt.type} typeDef={bt} onAdd={() => addBlock(bt.type)} />
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Generic Blocks */}
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Content Blocks
                      </p>
                      <div className="space-y-0.5">
                        {BLOCK_TYPES.filter((bt) => bt.category === "generic").map((bt) => (
                          <PaletteItem key={bt.type} typeDef={bt} onAdd={() => addBlock(bt.type)} />
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Toggle left panel */}
            {!leftPanelOpen && (
              <button
                type="button"
                className="shrink-0 w-8 flex items-center justify-center border-r hover:bg-muted transition-colors"
                onClick={() => setLeftPanelOpen(true)}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}

            {/* ── Center: Canvas ── */}
            <div className="flex-1 overflow-y-auto bg-muted/10 p-6">
              {previewMode ? (
                <PreviewCanvas blocks={blocks} />
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <div className="max-w-3xl mx-auto space-y-2">
                    {blocks.length === 0 ? (
                      <div className="border-2 border-dashed rounded-xl p-12 text-center">
                        <Plus className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                        <h3 className="text-lg font-semibold text-muted-foreground">
                          Start building your page
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Click blocks in the left panel to add them here
                        </p>
                      </div>
                    ) : (
                      <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                        {blocks.map((block) => (
                          <SortableBlockItem
                            key={block.id}
                            block={block}
                            isSelected={selectedBlockId === block.id}
                            onClick={() => {
                              setSelectedBlockId(block.id);
                              setRightPanelOpen(true);
                            }}
                            onRemove={() => removeBlock(block.id)}
                            onDuplicate={() => duplicateBlock(block.id)}
                          />
                        ))}
                      </SortableContext>
                    )}
                  </div>

                  <DragOverlay>
                    <DragOverlayItem block={activeBlock} />
                  </DragOverlay>
                </DndContext>
              )}
            </div>

            {/* Toggle right panel */}
            {!rightPanelOpen && (
              <button
                type="button"
                className="shrink-0 w-8 flex items-center justify-center border-l hover:bg-muted transition-colors"
                onClick={() => setRightPanelOpen(true)}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}

            {/* ── Right Sidebar: Settings Panel ── */}
            <div
              className={cn(
                "border-l bg-background transition-all duration-200 shrink-0",
                rightPanelOpen ? "w-96" : "w-0"
              )}
            >
              {rightPanelOpen && (
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {selectedBlock ? "Block Settings" : "Settings"}
                      </p>
                      <button type="button" onClick={() => setRightPanelOpen(false)} className="text-muted-foreground hover:text-foreground">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                    {selectedBlock ? (
                      <div className="space-y-4">
                        {/* Block header */}
                        <div className="flex items-center gap-2 pb-3 border-b">
                          {(() => {
                            const typeDef = BLOCK_TYPE_MAP[selectedBlock.type];
                            const Icon = typeDef?.icon || Type;
                            return (
                              <>
                                <div className="p-2 rounded-md bg-muted">
                                  <Icon className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div>
                                  <p className="font-semibold text-sm">{typeDef?.label || selectedBlock.type}</p>
                                  <p className="text-xs text-muted-foreground">{typeDef?.description}</p>
                                </div>
                              </>
                            );
                          })()}
                        </div>

                        {/* Column block needs special handling */}
                        {selectedBlock.type === "columns" ? (
                          <ColumnBlockEditor
                            block={selectedBlock}
                            onBlockChange={(updatedBlock) => {
                              updateBlockFull(selectedBlock.id, updatedBlock);
                            }}
                            selectedBlockId={selectedBlockId}
                            onSelectBlock={setSelectedBlockId}
                          />
                        ) : (
                          <BlockSettingsEditor
                            block={selectedBlock}
                            onChange={(newData) => {
                              updateBlockData(selectedBlock.id, newData);
                            }}
                            allBlocks={blocks}
                          />
                        )}

                        {/* Reset button for homepage sections */}
                        {selectedBlock.sectionKey && (
                          <div className="pt-4 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground"
                              onClick={() => {
                                if (confirm(`Reset "${selectedBlock.sectionKey}" to defaults?`)) {
                                  resetMutation.mutate(selectedBlock.sectionKey!);
                                }
                              }}
                            >
                              <RotateCcw className="h-3.5 w-3.5 mr-1" />
                              Reset to Defaults
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <MousePointerClick className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Select a block to edit its settings</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

// ── Preview Canvas ─────────────────────────────────

function PreviewCanvas({ blocks }: { blocks: Block[] }) {
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border overflow-hidden">
      {blocks.map((block) => (
        <PreviewBlock key={block.id} block={block} />
      ))}
      {blocks.length === 0 && (
        <div className="p-12 text-center text-muted-foreground">
          <p>No blocks to preview.</p>
        </div>
      )}
    </div>
  );
}

function PreviewBlock({ block }: { block: Block }) {
  const d = block.data;

  switch (block.type) {
    case "hero":
      return (
        <div className="relative bg-gradient-to-b from-gray-900 to-gray-800 text-white px-8 py-16 text-center">
          {d.welcomeLabel && <p className="text-sm uppercase tracking-wider mb-2 text-gray-300">{d.welcomeLabel}</p>}
          <h1 className="text-4xl font-bold mb-4">
            {d.headline} {d.headlineHighlight && <span className="text-[#EF4923]">{d.headlineHighlight}</span>} {d.headlineSuffix}
          </h1>
          {d.showCtaButton !== false && d.ctaText && (
            <span className="inline-block bg-[#EF4923] text-white px-6 py-2.5 rounded-lg font-semibold mt-4">
              {d.ctaText}
            </span>
          )}
        </div>
      );
    case "stats":
      return (
        <div className="flex justify-center gap-8 py-6 bg-gray-50 border-y">
          {(d.items || []).map((item: any, i: number) => (
            <div key={i} className="text-center">
              <p className="text-2xl font-bold text-[#EF4923]">{item.value}</p>
              <p className="text-sm text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>
      );
    case "text":
      return (
        <div className="px-8 py-6">
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: d.content || "" }} />
        </div>
      );
    case "image":
      return (
        <div className="px-8 py-4">
          {d.src ? (
            <img src={d.src} alt={d.alt || ""} className="w-full rounded-lg" />
          ) : (
            <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center text-gray-400">
              <ImageIcon className="h-12 w-12" />
            </div>
          )}
          {d.caption && <p className="text-sm text-gray-500 text-center mt-2">{d.caption}</p>}
        </div>
      );
    case "button":
      if (d.showButton === false) return null;
      return (
        <div className="px-8 py-4 text-center">
          <span className={cn(
            "inline-block px-6 py-2.5 rounded-lg font-semibold",
            d.style === "secondary" ? "border-2 border-[#EF4923] text-[#EF4923]" :
            d.style === "ghost" ? "text-[#EF4923] underline" :
            "bg-[#EF4923] text-white"
          )}>
            {d.text || "Button"}
          </span>
        </div>
      );
    case "spacer":
      return <div style={{ height: d.height || 48 }} />;
    case "divider":
      return <hr className="mx-8 border-gray-200" />;
    case "html":
      return <div className="px-8 py-4" dangerouslySetInnerHTML={{ __html: d.code || "" }} />;
    case "tableOfContents":
      return (
        <div className="mx-8 my-6 rounded-lg border-l-4 border-[#EF4923] bg-[#f0f7f0] p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-800 mb-3">{d.title || "TABLE OF CONTENTS"}</p>
          <ul className="space-y-1.5">
            {(d.items || []).map((item: any, i: number) => (
              <li key={i} className={cn("flex items-center gap-2", item.level === 3 && "ml-4")}>
                <span className="text-[#EF4923]">•</span>
                <a href={`#${item.anchorId}`} className="text-[#EF4923] hover:underline text-sm font-medium">
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        </div>
      );
    case "columns":
      const cols = d.columns || [];
      return (
        <div className={cn("px-8 py-4 grid gap-4", `grid-cols-${d.columnCount || 2}`)}>
          {cols.map((col: Block[], i: number) => (
            <div key={i} className="space-y-2">
              {col.map((childBlock: any) => (
                <PreviewBlock key={childBlock.id} block={childBlock} />
              ))}
            </div>
          ))}
        </div>
      );
    default:
      // Generic homepage section preview
      return (
        <div className="px-8 py-8">
          {d.label && <p className="text-xs uppercase tracking-wider text-[#EF4923] font-semibold mb-1">{d.label}</p>}
          {d.heading && <h2 className="text-2xl font-bold mb-3">{d.heading}</h2>}
          {d.paragraphs && (
            <div className="prose max-w-none text-gray-600">
              {d.paragraphs.map((p: string, i: number) => (
                <div key={i} dangerouslySetInnerHTML={{ __html: p }} />
              ))}
            </div>
          )}
          {d.showCtaButton !== false && d.buttonText && (
            <span className="inline-block bg-[#EF4923] text-white px-5 py-2 rounded-lg font-semibold mt-4">
              {d.buttonText}
            </span>
          )}
          {d.showCtaButton !== false && d.primaryButtonText && (
            <span className="inline-block bg-[#EF4923] text-white px-5 py-2 rounded-lg font-semibold mt-4">
              {d.primaryButtonText}
            </span>
          )}
        </div>
      );
  }
}
