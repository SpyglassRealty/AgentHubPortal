import { useState, useEffect, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

import {
  useAdminCommunity,
  useUpdateCommunity,
  useTogglePublish,
  type Community,
  type CommunitySection,
} from "@/lib/community-editor";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { ImageUpload } from "@/components/editor/ImageUpload";
import { ContentBlocksEditor } from "@/components/community/ContentBlocksEditor";
import {
  ArrowLeft,
  Save,
  Globe,
  GlobeIcon,
  Search as SearchIcon,
  Plus,
  Trash2,
  X,
  Loader2,
  Star,
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
} from "lucide-react";

export default function CommunityEditor() {
  const [, params] = useRoute("/admin/communities/:slug");
  const [, setLocation] = useLocation();
  const slug = params?.slug;
  const queryClient = useQueryClient();

  const { data: community, isLoading } = useAdminCommunity(slug);
  const updateMutation = useUpdateCommunity();
  const togglePublishMutation = useTogglePublish();
  const { toast } = useToast();

  // ── Local form state ──────────────────────────────
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [urlSlug, setUrlSlug] = useState("");
  const [originalSlug, setOriginalSlug] = useState("");
  const [showSlugWarning, setShowSlugWarning] = useState(false);
  const [pageTitle, setPageTitle] = useState("");
  const [aboutHeadingLevel, setAboutHeadingLevel] = useState("h2");
  const [description, setDescription] = useState("");
  const [sections, setSections] = useState<CommunitySection[]>([]);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [bestFor, setBestFor] = useState<string[]>([]);
  const [nearbyLandmarks, setNearbyLandmarks] = useState<string[]>([]);
  const [published, setPublished] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");

  // Tag input states
  const [highlightInput, setHighlightInput] = useState("");
  const [bestForInput, setBestForInput] = useState("");
  const [landmarkInput, setLandmarkInput] = useState("");

  // Initialize form when data loads
  useEffect(() => {
    if (community) {
      setMetaTitle(community.metaTitle || "");
      setMetaDescription(community.metaDescription || "");
      setFocusKeyword(community.focusKeyword || "");
      setUrlSlug(community.customSlug || community.slug || "");
      setOriginalSlug(community.customSlug || community.slug || "");
      setPageTitle(community.pageTitle || "");
      setAboutHeadingLevel(community.aboutHeadingLevel || "h2");
      setDescription(community.description || "");
      setSections(community.sections || []);
      setHighlights(community.highlights || []);
      setBestFor(community.bestFor || []);
      setNearbyLandmarks(community.nearbyLandmarks || []);
      setPublished(community.published ?? false);
      setFeatured(community.featured ?? false);
      setFeaturedImageUrl(community.featuredImageUrl || "");
    }
  }, [community]);

  // ── Save handler ──────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!slug) return;
    try {
      await updateMutation.mutateAsync({
        slug,
        data: {
          metaTitle: metaTitle || null,
          metaDescription: metaDescription || null,
          focusKeyword: focusKeyword || null,
          customSlug: urlSlug !== community?.slug ? urlSlug : null,
          pageTitle: pageTitle || null,
          aboutHeadingLevel: aboutHeadingLevel || 'h2',
          description: description || null,
          sections: sections.length > 0 ? sections : null,
          highlights: highlights.length > 0 ? highlights : null,
          bestFor: bestFor.length > 0 ? bestFor : null,
          nearbyLandmarks: nearbyLandmarks.length > 0 ? nearbyLandmarks : null,
          featuredImageUrl: featuredImageUrl || null,
          published,
          featured,
        } as any,
      });
      setOriginalSlug(urlSlug);
      toast({ title: "Saved", description: "Community content updated." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  }, [slug, metaTitle, metaDescription, focusKeyword, urlSlug, pageTitle, aboutHeadingLevel, description, sections, highlights, bestFor, nearbyLandmarks, featuredImageUrl, published, featured, updateMutation, toast, community]);

  const handleSaveClick = useCallback(() => {
    if (urlSlug && urlSlug !== originalSlug) {
      setShowSlugWarning(true);
    } else {
      handleSave();
    }
  }, [urlSlug, originalSlug, handleSave]);

  // ── Publish toggle ────────────────────────────────
  const handleTogglePublish = async () => {
    if (!slug) return;
    try {
      await togglePublishMutation.mutateAsync(slug);
      setPublished((p) => !p);
      toast({ title: published ? "Unpublished" : "Published" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  // ── Section management ────────────────────────────
  const addSection = () => {
    setSections((prev) => [
      ...prev,
      {
        id: `section-${Date.now()}`,
        heading: "",
        content: "",
        order: prev.length + 1,
      },
    ]);
  };

  const updateSection = (idx: number, field: "heading" | "content", value: string) => {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const removeSection = (idx: number) => {
    setSections((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })));
  };

  const moveSection = (fromIndex: number, toIndex: number) => {
    setSections((prev) => {
      const newSections = [...prev];
      const [movedSection] = newSections.splice(fromIndex, 1);
      newSections.splice(toIndex, 0, movedSection);
      // Update order property based on new positions
      return newSections.map((section, index) => ({ ...section, order: index + 1 }));
    });
  };

  // ── Tag helpers ───────────────────────────────────
  const addTag = (list: string[], setList: (v: string[]) => void, input: string, setInput: (v: string) => void) => {
    const trimmed = input.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
    }
    setInput("");
  };

  const removeTag = (list: string[], setList: (v: string[]) => void, index: number) => {
    setList(list.filter((_, i) => i !== index));
  };

  // ── Character count color ─────────────────────────
  const charCountColor = (len: number, yellowAt: number, redAt: number) => {
    if (len >= redAt) return "text-red-500 font-semibold";
    if (len >= yellowAt) return "text-yellow-600";
    return "text-muted-foreground";
  };

  if (isLoading) {
    return (
    <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
  );
  }

  if (!community) {
    return (
    <div className="max-w-4xl mx-auto px-4 py-10 text-center">
          <p className="text-lg text-muted-foreground">Community not found</p>
          <Button variant="link" onClick={() => setLocation("/admin/communities")}>
            Back to list
          </Button>
        </div>
  );
  }

  return (
    <>
    <AlertDialog open={showSlugWarning} onOpenChange={setShowSlugWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>URL slug change detected</AlertDialogTitle>
          <AlertDialogDescription>
            You are changing this community's URL from <strong>/{originalSlug}</strong> to <strong>/{urlSlug}</strong>.
            The old URL will stop working and return a 404. This change requires a Vercel rebuild to take effect.
            Are you sure you want to proceed?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => { setShowSlugWarning(false); handleSave(); }}>
            Yes, change URL
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ── Header ──────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/communities")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{community.name}</h1>
              <p className="text-sm text-muted-foreground">/{community.slug} • {community.county}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`https://spyglass-idx.vercel.app/communities/${community.slug}`, '_blank')}
            >
              <Globe className="h-4 w-4 mr-1" />
              View on Site
            </Button>
            <Button
              variant={published ? "outline" : "default"}
              size="sm"
              onClick={handleTogglePublish}
              disabled={togglePublishMutation.isPending}
            >
              {published ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {published ? "Unpublish" : "Publish"}
            </Button>
            <Button size="sm" onClick={handleSaveClick} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save
            </Button>
          </div>
        </div>

        {/* ── SEO Panel ──────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SearchIcon className="h-5 w-5" /> SEO
            </CardTitle>
            <CardDescription>Search engine optimization settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Meta Title</Label>
              <Input
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder={`${community.name} – Homes for Sale & Community Guide`}
                maxLength={80}
              />
              <p className={`text-xs mt-1 ${charCountColor(metaTitle.length, 50, 60)}`}>
                {metaTitle.length}/60 characters
              </p>
            </div>
            <div>
              <Label>Meta Description</Label>
              <Textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Discover homes for sale, market trends, and what it's like to live in..."
                rows={3}
                maxLength={200}
              />
              <p className={`text-xs mt-1 ${charCountColor(metaDescription.length, 140, 160)}`}>
                {metaDescription.length}/160 characters
              </p>
            </div>
            <div>
              <Label>Focus Keyword</Label>
              <Input
                value={focusKeyword}
                onChange={(e) => setFocusKeyword(e.target.value)}
                placeholder="e.g., zilker austin homes"
              />
            </div>

            <div>
              <Label>URL Slug</Label>
              <Input
                value={urlSlug}
                onChange={(e) => setUrlSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder={community.slug}
              />
              <p className="text-xs text-muted-foreground mt-1">
                The URL path for this community page. Changes require a Vercel rebuild to take effect.
              </p>
            </div>

            {/* Google Preview */}
            <div className="border rounded-lg p-4 bg-white dark:bg-card">
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Google Preview</p>
              <div className="space-y-1">
                <p className="text-blue-600 dark:text-blue-400 text-lg truncate">
                  {metaTitle || `${community.name} – Homes for Sale & Community Guide`}
                </p>
                <p className="text-green-700 dark:text-green-500 text-sm truncate">
                  spyglassrealty.com/{urlSlug || community.slug}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {metaDescription || `Learn about ${community.name}: homes for sale, neighborhood highlights, schools, and what it's like to live here.`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── About Section ──────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>About Section</CardTitle>
            <CardDescription>Community overview that appears as the intro on the page</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label>About Title</Label>
                <Input
                  value={pageTitle}
                  onChange={(e) => setPageTitle(e.target.value)}
                  placeholder={`About ${community?.name || 'Community'}`}
                  maxLength={80}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Appears as the About section heading on the page. Leave blank to use "About {community?.name || 'Community Name'}".
                </p>
              </div>
              <div>
                <Label>Heading Level</Label>
                <Select value={aboutHeadingLevel} onValueChange={setAboutHeadingLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="h1">H1</SelectItem>
                    <SelectItem value="h2">H2</SelectItem>
                    <SelectItem value="h3">H3</SelectItem>
                    <SelectItem value="h4">H4</SelectItem>
                    <SelectItem value="h5">H5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>About Description</Label>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="Write about this community — what makes it special, what the homes are like, the lifestyle..."
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Content Blocks Editor ─────────────────────────── */}
        {community?.id && (
          <ContentBlocksEditor 
            communityId={community.id} 
            onSave={() => {
              // Optional callback when blocks are saved
            }}
          />
        )}

        {/* ── Tags Panel ─────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Tags & Attributes</CardTitle>
            <CardDescription>Quick-reference details shown on the community page</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Highlights */}
            <div>
              <Label className="mb-2 block">Highlights</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={highlightInput}
                  onChange={(e) => setHighlightInput(e.target.value)}
                  placeholder="Add a highlight..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag(highlights, setHighlights, highlightInput, setHighlightInput);
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => addTag(highlights, setHighlights, highlightInput, setHighlightInput)}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {highlights.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 pr-1">
                    {tag}
                    <button onClick={() => removeTag(highlights, setHighlights, i)} className="ml-1 hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Best For */}
            <div>
              <Label className="mb-2 block">Best For</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={bestForInput}
                  onChange={(e) => setBestForInput(e.target.value)}
                  placeholder="Add a best-for tag..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag(bestFor, setBestFor, bestForInput, setBestForInput);
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => addTag(bestFor, setBestFor, bestForInput, setBestForInput)}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {bestFor.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 pr-1">
                    {tag}
                    <button onClick={() => removeTag(bestFor, setBestFor, i)} className="ml-1 hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Nearby Landmarks */}
            <div>
              <Label className="mb-2 block">Nearby Landmarks</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={landmarkInput}
                  onChange={(e) => setLandmarkInput(e.target.value)}
                  placeholder="Add a landmark..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag(nearbyLandmarks, setNearbyLandmarks, landmarkInput, setLandmarkInput);
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => addTag(nearbyLandmarks, setNearbyLandmarks, landmarkInput, setLandmarkInput)}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {nearbyLandmarks.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 pr-1">
                    {tag}
                    <button onClick={() => removeTag(nearbyLandmarks, setNearbyLandmarks, i)} className="ml-1 hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Featured Image ───────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" /> Featured Image
            </CardTitle>
            <CardDescription>
              Hero image for this community page. Recommended size: 1200×630px for optimal display and social sharing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImageUpload
              value={featuredImageUrl}
              onChange={setFeaturedImageUrl}
              label="Featured Image"
              placeholder="https://example.com/community-hero.jpg"
            />
          </CardContent>
        </Card>

        {/* ── Status Panel ───────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Published</Label>
                <p className="text-sm text-muted-foreground">Make this community visible on the website</p>
              </div>
              <Switch checked={published} onCheckedChange={setPublished} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Featured</Label>
                <p className="text-sm text-muted-foreground">Show in featured community sections</p>
              </div>
              <Switch checked={featured} onCheckedChange={setFeatured} />
            </div>
            {community.updatedAt && (
              <p className="text-xs text-muted-foreground pt-2 border-t">
                Last updated: {new Date(community.updatedAt).toLocaleString()}
                {community.updatedBy && ` by ${community.updatedBy}`}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Bottom save bar */}
        <div className="sticky bottom-4 z-10">
          <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-3 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              {published ? (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  Published
                </Badge>
              ) : (
                <Badge variant="secondary">Draft</Badge>
              )}
              <span className="text-sm text-muted-foreground">{community.name}</span>
            </div>
            <Button onClick={handleSaveClick} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
