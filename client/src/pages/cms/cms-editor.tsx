import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CmsPage, PageContent, CmsSection, CmsColumn, CmsBlock, BlockStyle } from "./types";
import { WIDGET_DEFINITIONS, WIDGET_CATEGORIES } from "./types";
import { WidgetSidebar } from "./editor/widget-sidebar";
import { EditorCanvas } from "./editor/editor-canvas";
import { PropertiesPanel } from "./editor/properties-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Save,
  Eye,
  Undo2,
  Redo2,
  Monitor,
  Tablet,
  Smartphone,
  Globe,
  Loader2,
  Settings,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function generateId(): string {
  return crypto.randomUUID();
}

const emptyContent: PageContent = {
  sections: [],
};

export default function CmsPageEditor() {
  const [, setLocation] = useLocation();
  const [matchNew] = useRoute("/admin/cms/editor/new");
  const [matchId, params] = useRoute("/admin/cms/editor/:id");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isNew = matchNew;
  const pageId = matchId ? params?.id : null;

  // Read query params for new page type
  const urlParams = new URLSearchParams(window.location.search);
  const initialType = urlParams.get("type") || "page";

  // Editor state
  const [content, setContent] = useState<PageContent>(emptyContent);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [pageType, setPageType] = useState(initialType);
  const [pageStatus, setPageStatus] = useState("draft");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("");
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");

  // History (undo/redo)
  const [history, setHistory] = useState<PageContent[]>([emptyContent]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const skipHistoryRef = useRef(false);

  // Auto-save timer
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch existing page
  const { data: existingPage, isLoading } = useQuery<CmsPage>({
    queryKey: [`/api/cms/pages/${pageId}`],
    enabled: !!pageId,
  });

  // Load existing page data
  useEffect(() => {
    if (existingPage) {
      setTitle(existingPage.title);
      setSlug(existingPage.slug);
      setPageType(existingPage.type);
      setPageStatus(existingPage.status);
      setMetaTitle(existingPage.metaTitle || "");
      setMetaDescription(existingPage.metaDescription || "");
      setFocusKeyword(existingPage.focusKeyword || "");
      setExcerpt(existingPage.excerpt || "");
      setCategory(existingPage.category || "");
      setFeaturedImageUrl(existingPage.featuredImageUrl || "");
      setTags((existingPage.tags as string[]) || []);

      const pageContent = (existingPage.content as PageContent) || emptyContent;
      setContent(pageContent);
      setHistory([pageContent]);
      setHistoryIndex(0);
    }
  }, [existingPage]);

  // Push to history stack on content change
  const pushHistory = useCallback(
    (newContent: PageContent) => {
      if (skipHistoryRef.current) {
        skipHistoryRef.current = false;
        return;
      }
      setHistory((prev) => {
        const truncated = prev.slice(0, historyIndex + 1);
        return [...truncated, newContent];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
  );

  // Update content with history tracking
  const updateContent = useCallback(
    (newContent: PageContent) => {
      setContent(newContent);
      setIsDirty(true);
      pushHistory(newContent);

      // Auto-save after 3 seconds of inactivity
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        if (pageId) {
          saveMutation.mutate();
        }
      }, 3000);
    },
    [pageId, pushHistory]
  );

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      skipHistoryRef.current = true;
      setContent(history[newIndex]);
      setHistoryIndex(newIndex);
      setIsDirty(true);
    }
  }, [history, historyIndex]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      skipHistoryRef.current = true;
      setContent(history[newIndex]);
      setHistoryIndex(newIndex);
      setIsDirty(true);
    }
  }, [history, historyIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveMutation.mutate();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  // Auto-generate slug from title
  useEffect(() => {
    if (isNew && title && !slug) {
      setSlug(
        title
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/[\s_]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .substring(0, 200)
      );
    }
  }, [title, isNew, slug]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/cms/pages", {
        title: title || "Untitled Page",
        slug: slug || `untitled-${Date.now()}`,
        type: pageType,
        status: pageStatus,
        content,
        excerpt,
        metaTitle,
        metaDescription,
        focusKeyword,
        category,
        featuredImageUrl: featuredImageUrl || undefined,
        tags,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ["/api/cms"] });
      toast({ title: "Page created!" });
      setLocation(`/admin/cms/editor/${data.id}`);
    },
    onError: (err: any) => {
      toast({ title: "Failed to create page", description: err.message, variant: "destructive" });
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isNew) {
        return createMutation.mutateAsync();
      }
      const res = await apiRequest("PUT", `/api/cms/pages/${pageId}`, {
        title,
        slug,
        type: pageType,
        status: pageStatus,
        content,
        excerpt,
        metaTitle,
        metaDescription,
        focusKeyword,
        category,
        featuredImageUrl: featuredImageUrl || null,
        tags,
      });
      return res.json();
    },
    onSuccess: () => {
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ["/api/cms"] });
      toast({ title: "Saved!" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: async () => {
      if (isNew) {
        // Create first, then publish
        const res = await apiRequest("POST", "/api/cms/pages", {
          title: title || "Untitled Page",
          slug: slug || `untitled-${Date.now()}`,
          type: pageType,
          content,
          excerpt,
          metaTitle,
          metaDescription,
          focusKeyword,
          category,
          tags,
        });
        const data = await res.json();
        await apiRequest("POST", `/api/cms/pages/${data.id}/publish`);
        return data;
      }
      await apiRequest("PUT", `/api/cms/pages/${pageId}`, {
        title,
        slug,
        content,
        excerpt,
        metaTitle,
        metaDescription,
        focusKeyword,
        category,
        tags,
      });
      const res = await apiRequest("POST", `/api/cms/pages/${pageId}/publish`);
      return res.json();
    },
    onSuccess: (data) => {
      setPageStatus("published");
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ["/api/cms"] });
      toast({ title: "Published!" });
      if (isNew && data?.id) {
        setLocation(`/admin/cms/editor/${data.id}`);
      }
    },
    onError: (err: any) => {
      toast({ title: "Failed to publish", description: err.message, variant: "destructive" });
    },
  });

  // Find selected block from content tree
  const findSelectedBlock = useCallback((): CmsBlock | null => {
    if (!selectedBlockId) return null;
    for (const section of content.sections) {
      for (const column of section.columns) {
        const block = column.blocks.find((b) => b.id === selectedBlockId);
        if (block) return block;
      }
    }
    return null;
  }, [content, selectedBlockId]);

  // Update a specific block
  const updateBlock = useCallback(
    (blockId: string, updates: Partial<CmsBlock>) => {
      const newContent: PageContent = {
        sections: content.sections.map((section) => ({
          ...section,
          columns: section.columns.map((column) => ({
            ...column,
            blocks: column.blocks.map((block) =>
              block.id === blockId ? { ...block, ...updates } : block
            ),
          })),
        })),
      };
      updateContent(newContent);
    },
    [content, updateContent]
  );

  // Update a section's style
  const updateSectionStyle = useCallback(
    (sectionId: string, style: BlockStyle) => {
      const newContent: PageContent = {
        sections: content.sections.map((section) =>
          section.id === sectionId
            ? { ...section, style: { ...section.style, ...style } }
            : section
        ),
      };
      updateContent(newContent);
    },
    [content, updateContent]
  );

  // Add a new section
  const addSection = useCallback(
    (atIndex?: number) => {
      const newSection: CmsSection = {
        id: generateId(),
        columns: [
          {
            id: generateId(),
            width: 12,
            blocks: [],
          },
        ],
        style: { padding: "40px 20px" },
      };
      const sections = [...content.sections];
      if (atIndex !== undefined) {
        sections.splice(atIndex, 0, newSection);
      } else {
        sections.push(newSection);
      }
      updateContent({ sections });
    },
    [content, updateContent]
  );

  // Delete a section
  const deleteSection = useCallback(
    (sectionId: string) => {
      updateContent({
        sections: content.sections.filter((s) => s.id !== sectionId),
      });
      if (selectedSectionId === sectionId) setSelectedSectionId(null);
      setSelectedBlockId(null);
    },
    [content, updateContent, selectedSectionId]
  );

  // Add a block to a column
  const addBlockToColumn = useCallback(
    (sectionId: string, columnId: string, blockType: string, atIndex?: number) => {
      const widget = WIDGET_DEFINITIONS.find((w) => w.type === blockType);
      if (!widget) return;

      // Special handling for column-type blocks
      if (blockType === "columns-2" || blockType === "columns-3") {
        const numCols = blockType === "columns-2" ? 2 : 3;
        const colWidth = Math.floor(12 / numCols);
        const newSection: CmsSection = {
          id: generateId(),
          columns: Array.from({ length: numCols }, () => ({
            id: generateId(),
            width: colWidth,
            blocks: [],
          })),
          style: { padding: "20px" },
        };

        // Find the section index and insert after it
        const sectionIdx = content.sections.findIndex((s) => s.id === sectionId);
        const sections = [...content.sections];
        sections.splice(sectionIdx + 1, 0, newSection);
        updateContent({ sections });
        return;
      }

      const newBlock: CmsBlock = {
        id: generateId(),
        type: widget.type,
        content: { ...widget.defaultContent },
        style: widget.defaultStyle ? { ...widget.defaultStyle } : {},
      };

      const newContent: PageContent = {
        sections: content.sections.map((section) => {
          if (section.id !== sectionId) return section;
          return {
            ...section,
            columns: section.columns.map((column) => {
              if (column.id !== columnId) return column;
              const blocks = [...column.blocks];
              if (atIndex !== undefined) {
                blocks.splice(atIndex, 0, newBlock);
              } else {
                blocks.push(newBlock);
              }
              return { ...column, blocks };
            }),
          };
        }),
      };
      updateContent(newContent);
      setSelectedBlockId(newBlock.id);
    },
    [content, updateContent]
  );

  // Delete a block
  const deleteBlock = useCallback(
    (blockId: string) => {
      const newContent: PageContent = {
        sections: content.sections.map((section) => ({
          ...section,
          columns: section.columns.map((column) => ({
            ...column,
            blocks: column.blocks.filter((b) => b.id !== blockId),
          })),
        })),
      };
      updateContent(newContent);
      if (selectedBlockId === blockId) setSelectedBlockId(null);
    },
    [content, updateContent, selectedBlockId]
  );

  // Duplicate a block
  const duplicateBlock = useCallback(
    (blockId: string) => {
      const newContent: PageContent = {
        sections: content.sections.map((section) => ({
          ...section,
          columns: section.columns.map((column) => {
            const blockIndex = column.blocks.findIndex((b) => b.id === blockId);
            if (blockIndex === -1) return column;
            const originalBlock = column.blocks[blockIndex];
            const duplicate: CmsBlock = {
              ...JSON.parse(JSON.stringify(originalBlock)),
              id: generateId(),
            };
            const blocks = [...column.blocks];
            blocks.splice(blockIndex + 1, 0, duplicate);
            return { ...column, blocks };
          }),
        })),
      };
      updateContent(newContent);
    },
    [content, updateContent]
  );

  // Move block within column
  const moveBlock = useCallback(
    (
      fromSectionId: string,
      fromColumnId: string,
      fromIndex: number,
      toSectionId: string,
      toColumnId: string,
      toIndex: number
    ) => {
      let movedBlock: CmsBlock | null = null;

      // Remove from source
      let newSections = content.sections.map((section) => {
        if (section.id !== fromSectionId) return section;
        return {
          ...section,
          columns: section.columns.map((column) => {
            if (column.id !== fromColumnId) return column;
            const blocks = [...column.blocks];
            [movedBlock] = blocks.splice(fromIndex, 1);
            return { ...column, blocks };
          }),
        };
      });

      if (!movedBlock) return;

      // Add to target
      newSections = newSections.map((section) => {
        if (section.id !== toSectionId) return section;
        return {
          ...section,
          columns: section.columns.map((column) => {
            if (column.id !== toColumnId) return column;
            const blocks = [...column.blocks];
            blocks.splice(toIndex, 0, movedBlock!);
            return { ...column, blocks };
          }),
        };
      });

      updateContent({ sections: newSections });
    },
    [content, updateContent]
  );

  // Move section
  const moveSection = useCallback(
    (fromIndex: number, toIndex: number) => {
      const sections = [...content.sections];
      const [moved] = sections.splice(fromIndex, 1);
      sections.splice(toIndex, 0, moved);
      updateContent({ sections });
    },
    [content, updateContent]
  );

  const selectedBlock = findSelectedBlock();

  if (!isNew && isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const viewportWidth =
    viewport === "desktop" ? "100%" : viewport === "tablet" ? "768px" : "375px";

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Toolbar */}
      <header className="h-14 border-b bg-background flex items-center justify-between px-4 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/admin/cms/pages")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setIsDirty(true);
            }}
            placeholder="Page title..."
            className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 w-64"
          />
          <Badge variant={pageStatus === "published" ? "default" : "secondary"} className="capitalize">
            {pageStatus}
          </Badge>
          {isDirty && (
            <Badge variant="outline" className="text-yellow-600">
              Unsaved
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Viewport Toggle */}
          <div className="flex items-center border rounded-lg p-0.5 gap-0.5">
            <Button
              variant={viewport === "desktop" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setViewport("desktop")}
            >
              <Monitor className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewport === "tablet" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setViewport("tablet")}
            >
              <Tablet className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewport === "mobile" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setViewport("mobile")}
            >
              <Smartphone className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Undo/Redo */}
          <Button variant="ghost" size="sm" onClick={undo} disabled={historyIndex <= 0}>
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={redo} disabled={historyIndex >= history.length - 1}>
            <Redo2 className="h-4 w-4" />
          </Button>

          {/* Page Settings */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Page Settings</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }} />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input value={slug} onChange={(e) => { setSlug(e.target.value); setIsDirty(true); }} />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={pageType} onValueChange={(v) => { setPageType(v); setIsDirty(true); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="page">Page</SelectItem>
                      <SelectItem value="blog">Blog Post</SelectItem>
                      <SelectItem value="community">Community</SelectItem>
                      <SelectItem value="landing">Landing Page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Input value={category} onChange={(e) => { setCategory(e.target.value); setIsDirty(true); }} placeholder="e.g., Austin Real Estate" />
                </div>
                <div>
                  <Label>Excerpt</Label>
                  <Textarea value={excerpt} onChange={(e) => { setExcerpt(e.target.value); setIsDirty(true); }} placeholder="Brief description..." rows={3} />
                </div>
                <div>
                  <Label>Featured Image URL</Label>
                  <Input value={featuredImageUrl} onChange={(e) => { setFeaturedImageUrl(e.target.value); setIsDirty(true); }} placeholder="https://..." />
                  {featuredImageUrl && (
                    <img src={featuredImageUrl} alt="Featured" className="mt-2 rounded-lg max-h-32 object-cover" />
                  )}
                </div>
                <hr />
                <div>
                  <Label className="font-semibold">SEO Settings</Label>
                </div>
                <div>
                  <Label>Meta Title</Label>
                  <Input value={metaTitle} onChange={(e) => { setMetaTitle(e.target.value); setIsDirty(true); }} placeholder="SEO title (60 chars max)" />
                  <p className="text-xs text-muted-foreground mt-1">{metaTitle.length}/60 characters</p>
                </div>
                <div>
                  <Label>Meta Description</Label>
                  <Textarea value={metaDescription} onChange={(e) => { setMetaDescription(e.target.value); setIsDirty(true); }} placeholder="SEO description (160 chars max)" rows={3} />
                  <p className="text-xs text-muted-foreground mt-1">{metaDescription.length}/160 characters</p>
                </div>
                <div>
                  <Label>Focus Keyword</Label>
                  <Input value={focusKeyword} onChange={(e) => { setFocusKeyword(e.target.value); setIsDirty(true); }} placeholder="Primary keyword" />
                </div>
                <div>
                  <Label>Tags (comma separated)</Label>
                  <Input
                    value={tags.join(", ")}
                    onChange={(e) => {
                      setTags(e.target.value.split(",").map((t) => t.trim()).filter(Boolean));
                      setIsDirty(true);
                    }}
                    placeholder="tag1, tag2, tag3"
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Save */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => (isNew ? createMutation.mutate() : saveMutation.mutate())}
            disabled={saveMutation.isPending || createMutation.isPending}
          >
            {(saveMutation.isPending || createMutation.isPending) ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1 h-4 w-4" />
            )}
            Save
          </Button>

          {/* Publish */}
          <Button
            size="sm"
            onClick={() => publishMutation.mutate()}
            disabled={publishMutation.isPending}
          >
            {publishMutation.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Globe className="mr-1 h-4 w-4" />
            )}
            Publish
          </Button>
        </div>
      </header>

      {/* Main Editor Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Widgets */}
        <WidgetSidebar />

        {/* Center - Canvas */}
        <div className="flex-1 overflow-y-auto bg-muted/30">
          <div
            className="mx-auto transition-all duration-300"
            style={{ maxWidth: viewportWidth, minHeight: "100%" }}
          >
            <EditorCanvas
              content={content}
              selectedBlockId={selectedBlockId}
              selectedSectionId={selectedSectionId}
              onSelectBlock={setSelectedBlockId}
              onSelectSection={setSelectedSectionId}
              onAddSection={addSection}
              onDeleteSection={deleteSection}
              onAddBlock={addBlockToColumn}
              onDeleteBlock={deleteBlock}
              onDuplicateBlock={duplicateBlock}
              onMoveBlock={moveBlock}
              onMoveSection={moveSection}
              onUpdateContent={updateContent}
            />
          </div>
        </div>

        {/* Right Sidebar - Properties */}
        <PropertiesPanel
          selectedBlock={selectedBlock}
          selectedSectionId={selectedSectionId}
          content={content}
          onUpdateBlock={updateBlock}
          onUpdateSectionStyle={updateSectionStyle}
          onDeselect={() => {
            setSelectedBlockId(null);
            setSelectedSectionId(null);
          }}
        />
      </div>
    </div>
  );
}
