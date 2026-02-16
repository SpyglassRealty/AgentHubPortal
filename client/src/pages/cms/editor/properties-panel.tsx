import { useState } from "react";
import type { CmsBlock, BlockStyle, PageContent } from "../types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Plus, Trash2 } from "lucide-react";

interface PropertiesPanelProps {
  selectedBlock: CmsBlock | null;
  selectedSectionId: string | null;
  content: PageContent;
  onUpdateBlock: (blockId: string, updates: Partial<CmsBlock>) => void;
  onUpdateSectionStyle: (sectionId: string, style: BlockStyle) => void;
  onDeselect: () => void;
}

export function PropertiesPanel({
  selectedBlock,
  selectedSectionId,
  content,
  onUpdateBlock,
  onUpdateSectionStyle,
  onDeselect,
}: PropertiesPanelProps) {
  const selectedSection = selectedSectionId
    ? content.sections.find((s) => s.id === selectedSectionId)
    : null;

  if (!selectedBlock && !selectedSection) {
    return (
      <div className="w-72 border-l bg-background flex items-center justify-center p-6 shrink-0">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">Select a block or section to edit its properties</p>
        </div>
      </div>
    );
  }

  // If only a section is selected (no block)
  if (!selectedBlock && selectedSection) {
    return (
      <div className="w-72 border-l bg-background flex flex-col shrink-0">
        <div className="p-3 border-b flex items-center justify-between">
          <h3 className="font-semibold text-sm">Section Properties</h3>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onDeselect}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            <StyleEditor
              style={selectedSection.style || {}}
              onChange={(style) => onUpdateSectionStyle(selectedSectionId!, style)}
            />
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (!selectedBlock) return null;

  return (
    <div className="w-72 border-l bg-background flex flex-col shrink-0">
      <div className="p-3 border-b flex items-center justify-between">
        <h3 className="font-semibold text-sm capitalize">{selectedBlock.type} Properties</h3>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onDeselect}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <Tabs defaultValue="content" className="flex-1 flex flex-col">
        <TabsList className="mx-3 mt-2 grid grid-cols-3">
          <TabsTrigger value="content" className="text-xs">Content</TabsTrigger>
          <TabsTrigger value="style" className="text-xs">Style</TabsTrigger>
          <TabsTrigger value="advanced" className="text-xs">Advanced</TabsTrigger>
        </TabsList>
        <ScrollArea className="flex-1">
          <TabsContent value="content" className="p-3 m-0 space-y-3">
            <ContentEditor
              block={selectedBlock}
              onUpdate={(updates) => onUpdateBlock(selectedBlock.id, updates)}
            />
          </TabsContent>
          <TabsContent value="style" className="p-3 m-0 space-y-3">
            <StyleEditor
              style={selectedBlock.style || {}}
              onChange={(style) =>
                onUpdateBlock(selectedBlock.id, { style: { ...selectedBlock.style, ...style } })
              }
            />
          </TabsContent>
          <TabsContent value="advanced" className="p-3 m-0 space-y-3">
            <AdvancedEditor
              block={selectedBlock}
              onUpdate={(updates) => onUpdateBlock(selectedBlock.id, updates)}
            />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

// ============================================================
// Content Editor — type-specific content fields
// ============================================================
function ContentEditor({
  block,
  onUpdate,
}: {
  block: CmsBlock;
  onUpdate: (updates: Partial<CmsBlock>) => void;
}) {
  const updateContent = (key: string, value: any) => {
    onUpdate({ content: { ...block.content, [key]: value } });
  };

  switch (block.type) {
    case "heading":
      return (
        <>
          <Field label="Text">
            <Input
              value={block.content.text || ""}
              onChange={(e) => updateContent("text", e.target.value)}
            />
          </Field>
          <Field label="Level">
            <Select
              value={block.content.level || "h2"}
              onValueChange={(v) => updateContent("level", v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="h1">H1 — Page Title</SelectItem>
                <SelectItem value="h2">H2 — Section Title</SelectItem>
                <SelectItem value="h3">H3 — Subsection</SelectItem>
                <SelectItem value="h4">H4 — Small Heading</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </>
      );

    case "text":
      return (
        <Field label="Text">
          <Textarea
            value={block.content.text || ""}
            onChange={(e) => updateContent("text", e.target.value)}
            rows={6}
          />
        </Field>
      );

    case "image":
      return (
        <>
          <Field label="Image URL">
            <Input
              value={block.content.src || ""}
              onChange={(e) => updateContent("src", e.target.value)}
              placeholder="https://..."
            />
          </Field>
          {block.content.src && (
            <img
              src={block.content.src}
              alt=""
              className="rounded-md max-h-24 object-cover w-full"
            />
          )}
          <Field label="Alt Text">
            <Input
              value={block.content.alt || ""}
              onChange={(e) => updateContent("alt", e.target.value)}
            />
          </Field>
          <Field label="Caption">
            <Input
              value={block.content.caption || ""}
              onChange={(e) => updateContent("caption", e.target.value)}
            />
          </Field>
        </>
      );

    case "button":
      return (
        <>
          <Field label="Text">
            <Input
              value={block.content.text || ""}
              onChange={(e) => updateContent("text", e.target.value)}
            />
          </Field>
          <Field label="URL">
            <Input
              value={block.content.url || ""}
              onChange={(e) => updateContent("url", e.target.value)}
            />
          </Field>
          <Field label="Variant">
            <Select
              value={block.content.variant || "primary"}
              onValueChange={(v) => updateContent("variant", v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">Primary</SelectItem>
                <SelectItem value="secondary">Secondary</SelectItem>
                <SelectItem value="outline">Outline</SelectItem>
                <SelectItem value="ghost">Ghost</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </>
      );

    case "link":
      return (
        <>
          <Field label="Text">
            <Input
              value={block.content.text || ""}
              onChange={(e) => updateContent("text", e.target.value)}
            />
          </Field>
          <Field label="URL">
            <Input
              value={block.content.url || ""}
              onChange={(e) => updateContent("url", e.target.value)}
            />
          </Field>
          <Field label="Target">
            <Select
              value={block.content.target || "_self"}
              onValueChange={(v) => updateContent("target", v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_self">Same Window</SelectItem>
                <SelectItem value="_blank">New Tab</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </>
      );

    case "spacer":
      return (
        <Field label="Height">
          <Input
            value={block.content.height || "40px"}
            onChange={(e) => updateContent("height", e.target.value)}
            placeholder="e.g., 40px, 2rem"
          />
        </Field>
      );

    case "divider":
      return (
        <>
          <Field label="Style">
            <Select
              value={block.content.style || "solid"}
              onValueChange={(v) => updateContent("style", v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="dashed">Dashed</SelectItem>
                <SelectItem value="dotted">Dotted</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Width">
            <Input
              value={block.content.width || "100%"}
              onChange={(e) => updateContent("width", e.target.value)}
            />
          </Field>
        </>
      );

    case "video":
      return (
        <Field label="Video URL">
          <Input
            value={block.content.url || ""}
            onChange={(e) => updateContent("url", e.target.value)}
            placeholder="YouTube or Vimeo URL"
          />
        </Field>
      );

    case "gallery":
      return (
        <>
          <Field label="Columns">
            <Select
              value={String(block.content.columns || 3)}
              onValueChange={(v) => updateContent("columns", parseInt(v))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 Columns</SelectItem>
                <SelectItem value="3">3 Columns</SelectItem>
                <SelectItem value="4">4 Columns</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Images">
            <div className="space-y-2">
              {(block.content.images || []).map((url: string, i: number) => (
                <div key={i} className="flex gap-1">
                  <Input
                    value={url}
                    onChange={(e) => {
                      const images = [...(block.content.images || [])];
                      images[i] = e.target.value;
                      updateContent("images", images);
                    }}
                    placeholder="Image URL"
                    className="text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 shrink-0"
                    onClick={() => {
                      const images = [...(block.content.images || [])];
                      images.splice(i, 1);
                      updateContent("images", images);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() =>
                  updateContent("images", [...(block.content.images || []), ""])
                }
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Image
              </Button>
            </div>
          </Field>
        </>
      );

    case "testimonial":
      return (
        <>
          <Field label="Quote">
            <Textarea
              value={block.content.quote || ""}
              onChange={(e) => updateContent("quote", e.target.value)}
              rows={3}
            />
          </Field>
          <Field label="Author">
            <Input
              value={block.content.author || ""}
              onChange={(e) => updateContent("author", e.target.value)}
            />
          </Field>
          <Field label="Role/Title">
            <Input
              value={block.content.role || ""}
              onChange={(e) => updateContent("role", e.target.value)}
            />
          </Field>
          <Field label="Avatar URL">
            <Input
              value={block.content.avatar || ""}
              onChange={(e) => updateContent("avatar", e.target.value)}
            />
          </Field>
        </>
      );

    case "faq":
      return (
        <FaqEditor
          items={block.content.items || []}
          onChange={(items) => updateContent("items", items)}
        />
      );

    case "iconbox":
      return (
        <>
          <Field label="Icon (emoji)">
            <Input
              value={block.content.icon || ""}
              onChange={(e) => updateContent("icon", e.target.value)}
            />
          </Field>
          <Field label="Title">
            <Input
              value={block.content.title || ""}
              onChange={(e) => updateContent("title", e.target.value)}
            />
          </Field>
          <Field label="Description">
            <Textarea
              value={block.content.description || ""}
              onChange={(e) => updateContent("description", e.target.value)}
              rows={3}
            />
          </Field>
        </>
      );

    case "listing-card":
      return (
        <>
          <Field label="Address">
            <Input
              value={block.content.address || ""}
              onChange={(e) => updateContent("address", e.target.value)}
            />
          </Field>
          <Field label="Price">
            <Input
              value={block.content.price || ""}
              onChange={(e) => updateContent("price", e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Beds">
              <Input
                type="number"
                value={block.content.beds || ""}
                onChange={(e) => updateContent("beds", parseInt(e.target.value) || 0)}
              />
            </Field>
            <Field label="Baths">
              <Input
                type="number"
                value={block.content.baths || ""}
                onChange={(e) => updateContent("baths", parseInt(e.target.value) || 0)}
              />
            </Field>
            <Field label="Sqft">
              <Input
                value={block.content.sqft || ""}
                onChange={(e) => updateContent("sqft", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Image URL">
            <Input
              value={block.content.image || ""}
              onChange={(e) => updateContent("image", e.target.value)}
            />
          </Field>
        </>
      );

    case "agent-card":
      return (
        <>
          <Field label="Name">
            <Input
              value={block.content.name || ""}
              onChange={(e) => updateContent("name", e.target.value)}
            />
          </Field>
          <Field label="Title">
            <Input
              value={block.content.title || ""}
              onChange={(e) => updateContent("title", e.target.value)}
            />
          </Field>
          <Field label="Phone">
            <Input
              value={block.content.phone || ""}
              onChange={(e) => updateContent("phone", e.target.value)}
            />
          </Field>
          <Field label="Email">
            <Input
              value={block.content.email || ""}
              onChange={(e) => updateContent("email", e.target.value)}
            />
          </Field>
          <Field label="Photo URL">
            <Input
              value={block.content.photo || ""}
              onChange={(e) => updateContent("photo", e.target.value)}
            />
          </Field>
        </>
      );

    case "community-map":
      return (
        <>
          <Field label="Title">
            <Input
              value={block.content.title || ""}
              onChange={(e) => updateContent("title", e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Latitude">
              <Input
                type="number"
                step="0.0001"
                value={block.content.lat || ""}
                onChange={(e) => updateContent("lat", parseFloat(e.target.value) || 0)}
              />
            </Field>
            <Field label="Longitude">
              <Input
                type="number"
                step="0.0001"
                value={block.content.lng || ""}
                onChange={(e) => updateContent("lng", parseFloat(e.target.value) || 0)}
              />
            </Field>
          </div>
          <Field label="Zoom">
            <Input
              type="number"
              min={1}
              max={20}
              value={block.content.zoom || 12}
              onChange={(e) => updateContent("zoom", parseInt(e.target.value) || 12)}
            />
          </Field>
        </>
      );

    case "contact-form":
      return (
        <Field label="Title">
          <Input
            value={block.content.title || ""}
            onChange={(e) => updateContent("title", e.target.value)}
          />
        </Field>
      );

    case "cta-banner":
      return (
        <>
          <Field label="Headline">
            <Input
              value={block.content.headline || ""}
              onChange={(e) => updateContent("headline", e.target.value)}
            />
          </Field>
          <Field label="Subtext">
            <Textarea
              value={block.content.subtext || ""}
              onChange={(e) => updateContent("subtext", e.target.value)}
              rows={2}
            />
          </Field>
          <Field label="Button Text">
            <Input
              value={block.content.buttonText || ""}
              onChange={(e) => updateContent("buttonText", e.target.value)}
            />
          </Field>
          <Field label="Button URL">
            <Input
              value={block.content.buttonUrl || ""}
              onChange={(e) => updateContent("buttonUrl", e.target.value)}
            />
          </Field>
        </>
      );

    case "html":
      return (
        <Field label="HTML Code">
          <Textarea
            value={block.content.html || ""}
            onChange={(e) => updateContent("html", e.target.value)}
            rows={8}
            className="font-mono text-xs"
          />
        </Field>
      );

    case "embed":
      return (
        <Field label="Embed Code">
          <Textarea
            value={block.content.code || ""}
            onChange={(e) => updateContent("code", e.target.value)}
            rows={8}
            className="font-mono text-xs"
            placeholder="Paste embed code here..."
          />
        </Field>
      );

    default:
      return (
        <p className="text-sm text-muted-foreground">
          No properties available for this block type.
        </p>
      );
  }
}

// ============================================================
// Style Editor — shared for blocks and sections
// ============================================================
function StyleEditor({
  style,
  onChange,
}: {
  style: BlockStyle;
  onChange: (style: BlockStyle) => void;
}) {
  const update = (key: keyof BlockStyle, value: string) => {
    onChange({ ...style, [key]: value });
  };

  return (
    <>
      <Field label="Padding">
        <Input
          value={style.padding || ""}
          onChange={(e) => update("padding", e.target.value)}
          placeholder="e.g., 20px, 10px 20px"
        />
      </Field>
      <Field label="Margin">
        <Input
          value={style.margin || ""}
          onChange={(e) => update("margin", e.target.value)}
          placeholder="e.g., 0 auto, 10px 0"
        />
      </Field>
      <Field label="Background Color">
        <div className="flex gap-2">
          <input
            type="color"
            value={style.backgroundColor || "#ffffff"}
            onChange={(e) => update("backgroundColor", e.target.value)}
            className="h-9 w-9 rounded border cursor-pointer"
          />
          <Input
            value={style.backgroundColor || ""}
            onChange={(e) => update("backgroundColor", e.target.value)}
            placeholder="#ffffff or transparent"
          />
        </div>
      </Field>
      <Field label="Text Color">
        <div className="flex gap-2">
          <input
            type="color"
            value={style.textColor || "#000000"}
            onChange={(e) => update("textColor", e.target.value)}
            className="h-9 w-9 rounded border cursor-pointer"
          />
          <Input
            value={style.textColor || ""}
            onChange={(e) => update("textColor", e.target.value)}
            placeholder="#000000"
          />
        </div>
      </Field>
      <Field label="Font Size">
        <Input
          value={style.fontSize || ""}
          onChange={(e) => update("fontSize", e.target.value)}
          placeholder="e.g., 16px, 1.2rem"
        />
      </Field>
      <Field label="Text Align">
        <Select
          value={style.textAlign || ""}
          onValueChange={(v) => update("textAlign", v)}
        >
          <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Left</SelectItem>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="right">Right</SelectItem>
            <SelectItem value="justify">Justify</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </>
  );
}

// ============================================================
// Advanced Editor
// ============================================================
function AdvancedEditor({
  block,
  onUpdate,
}: {
  block: CmsBlock;
  onUpdate: (updates: Partial<CmsBlock>) => void;
}) {
  return (
    <>
      <Field label="Custom CSS Class">
        <Input
          value={block.style?.customClass || ""}
          onChange={(e) =>
            onUpdate({
              style: { ...block.style, customClass: e.target.value },
            })
          }
          placeholder="e.g., my-custom-class"
        />
      </Field>
      <div className="text-xs text-muted-foreground mt-2">
        <p>Block ID: <code className="bg-muted px-1 rounded">{block.id.substring(0, 8)}</code></p>
        <p className="mt-1">Type: <code className="bg-muted px-1 rounded">{block.type}</code></p>
      </div>
    </>
  );
}

// ============================================================
// Helpers
// ============================================================
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function FaqEditor({
  items,
  onChange,
}: {
  items: Array<{ question: string; answer: string }>;
  onChange: (items: Array<{ question: string; answer: string }>) => void;
}) {
  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium text-muted-foreground">FAQ Items</Label>
      {items.map((item, i) => (
        <div key={i} className="border rounded-lg p-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-medium">Item {i + 1}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={() => {
                const next = [...items];
                next.splice(i, 1);
                onChange(next);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <Input
            value={item.question}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...next[i], question: e.target.value };
              onChange(next);
            }}
            placeholder="Question"
            className="text-xs"
          />
          <Textarea
            value={item.answer}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...next[i], answer: e.target.value };
              onChange(next);
            }}
            placeholder="Answer"
            rows={2}
            className="text-xs"
          />
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => onChange([...items, { question: "", answer: "" }])}
      >
        <Plus className="mr-1 h-3 w-3" />
        Add FAQ Item
      </Button>
    </div>
  );
}
