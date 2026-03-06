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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WYSIWYGEditor } from "@/components/ui/WYSIWYGEditor";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Save,
  Globe,
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
  Tag as TagIcon,
  FileText,
  Settings,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

export default function CommunityEditorFixed() {
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
  const [description, setDescription] = useState("");
  const [sections, setSections] = useState<CommunitySection[]>([]);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [bestFor, setBestFor] = useState<string[]>([]);
  const [nearbyLandmarks, setNearbyLandmarks] = useState<string[]>([]);
  const [published, setPublished] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [featuredImage, setFeaturedImage] = useState("");
  const [featuredImageAlt, setFeaturedImageAlt] = useState("");
  const [activeTab, setActiveTab] = useState("status");

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
      setDescription(community.description || "");
      setSections(community.sections || []);
      setHighlights(community.highlights || []);
      setBestFor(community.bestFor || []);
      setNearbyLandmarks(community.nearbyLandmarks || []);
      setPublished(community.published ?? false);
      setFeatured(community.featured ?? false);
      setFeaturedImage(community.featuredImageUrl || "");
      setFeaturedImageAlt(community.featuredImageAlt || `${community.name} featured image`);
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
          description: description || null,
          sections: sections.length > 0 ? sections : null,
          highlights: highlights.length > 0 ? highlights : null,
          bestFor: bestFor.length > 0 ? bestFor : null,
          nearbyLandmarks: nearbyLandmarks.length > 0 ? nearbyLandmarks : null,
          published,
          featured,
          featuredImageUrl: featuredImage || null,
          featuredImageAlt: featuredImageAlt || null,
        } as any,
      });
      toast({ title: "Saved", description: "Community content updated successfully." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  }, [slug, metaTitle, metaDescription, focusKeyword, description, sections, highlights, bestFor, nearbyLandmarks, published, featured, featuredImage, featuredImageAlt, updateMutation, toast]);

  // ── Publish toggle ────────────────────────────────
  const handleTogglePublish = async () => {
    if (!slug) return;
    try {
      await togglePublishMutation.mutateAsync(slug);
      setPublished((p) => !p);
      toast({ 
        title: published ? "Unpublished" : "Published",
        description: published ? 
          "Community is now hidden from public view." : 
          "Community is now live! Footer will appear on the published page."
      });
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

  // ── Publishing validation ─────────────────────────
  const getPublishingRequirements = () => {
    const requirements = [
      {
        id: 'name',
        label: 'Community name is set',
        satisfied: !!(community?.name?.trim())
      },
      {
        id: 'description',
        label: 'Main description is provided',
        satisfied: !!description.trim()
      },
      {
        id: 'seo',
        label: 'SEO title and description are set',
        satisfied: !!(metaTitle.trim() && metaDescription.trim())
      },
      {
        id: 'image',
        label: 'Featured image is uploaded',
        satisfied: !!featuredImage.trim()
      }
    ];

    return {
      requirements,
      canPublish: requirements.every(req => req.satisfied),
      completedCount: requirements.filter(req => req.satisfied).length,
      totalCount: requirements.length
    };
  };

  const publishingStatus = getPublishingRequirements();

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

  const tabs = [
    { id: 'status', label: 'Status', icon: Settings, description: 'Publication status and basic info' },
    { id: 'content', label: 'Main Content', icon: FileText, description: 'Description and content sections' },
    { id: 'tags', label: 'Tags & Attributes', icon: TagIcon, description: 'Community tags and metadata' },
    { id: 'seo', label: 'SEO Settings', icon: SearchIcon, description: 'Search engine optimization' },
    { id: 'featured', label: 'Featured Image', icon: ImageIcon, description: 'Upload and manage featured image' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
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
          <Badge variant={published ? "default" : "secondary"}>
            {published ? "Published" : "Draft"}
          </Badge>
          <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* ── Main Editor Tabs ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Page Builder</CardTitle>
              <CardDescription>
                Complete each section to publish your community page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;
                let isComplete = false;
                
                // Check completion status
                switch (tab.id) {
                  case 'status':
                    isComplete = !!(community?.name && community?.slug);
                    break;
                  case 'content':
                    isComplete = !!description.trim();
                    break;
                  case 'tags':
                    isComplete = highlights.length > 0 || bestFor.length > 0;
                    break;
                  case 'seo':
                    isComplete = !!(metaTitle.trim() && metaDescription.trim());
                    break;
                  case 'featured':
                    isComplete = !!featuredImage.trim();
                    break;
                }

                return (
                  <Button
                    key={tab.id}
                    variant={isActive ? "default" : "ghost"}
                    className={`w-full justify-start p-3 h-auto ${
                      isActive ? "" : "hover:bg-muted"
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4" />
                        {isComplete && <CheckCircle className="h-3 w-3 text-green-500" />}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium">{tab.label}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {tab.description}
                        </div>
                      </div>
                    </div>
                  </Button>
                );
              })}

              {/* Publishing Status */}
              <div className="pt-4 border-t">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Publishing Ready</span>
                    <span className="font-medium">
                      {publishingStatus.completedCount}/{publishingStatus.totalCount}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        publishingStatus.canPublish ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ 
                        width: `${(publishingStatus.completedCount / publishingStatus.totalCount) * 100}%` 
                      }}
                    />
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full mt-3"
                    onClick={handleTogglePublish}
                    disabled={togglePublishMutation.isPending || (!publishingStatus.canPublish && !published)}
                    variant={published ? "outline" : "default"}
                  >
                    {published ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-2" />
                        Unpublish
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        {publishingStatus.canPublish ? "Publish" : "Complete Required Fields"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-6">
              {/* Status Tab */}
              {activeTab === 'status' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Publication Status
                    </h3>
                    
                    <div className="space-y-4">
                      <div className={`p-4 rounded-lg border ${
                        published 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-yellow-50 border-yellow-200'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          {published ? (
                            <Globe className="h-5 w-5 text-green-600" />
                          ) : (
                            <Eye className="h-5 w-5 text-yellow-600" />
                          )}
                          <span className="font-medium">
                            {published ? 'Published' : 'Draft'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {published ? 
                            'This community page is live and visible to the public. The footer will automatically appear on the published page.' :
                            'This community page is saved as a draft and not yet visible to the public.'
                          }
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Community Name</Label>
                          <Input
                            value={community.name}
                            disabled
                            className="bg-gray-50"
                          />
                          <p className="text-xs text-gray-500 mt-1">Set in community configuration</p>
                        </div>
                        
                        <div>
                          <Label>URL Slug</Label>
                          <div className="flex">
                            <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md">
                              /communities/
                            </span>
                            <Input
                              value={community.slug}
                              disabled
                              className="rounded-l-none bg-gray-50"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label className="text-base font-medium">Publishing Requirements</Label>
                        <div className="space-y-2 mt-2">
                          {publishingStatus.requirements.map((req) => (
                            <div key={req.id} className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                req.satisfied ? 'bg-green-100' : 'bg-gray-100'
                              }`}>
                                {req.satisfied ? (
                                  <div className="w-2 h-2 bg-green-600 rounded-full" />
                                ) : (
                                  <div className="w-2 h-2 bg-gray-400 rounded-full" />
                                )}
                              </div>
                              <span className={`text-sm ${
                                req.satisfied ? 'text-green-700' : 'text-gray-600'
                              }`}>
                                {req.label}
                              </span>
                            </div>
                          ))}
                        </div>
                        
                        {!publishingStatus.canPublish && (
                          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-center gap-2 text-yellow-800">
                              <AlertCircle className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                Complete all required fields before publishing
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <Label>Featured Community</Label>
                            <p className="text-sm text-muted-foreground">Show in featured sections</p>
                          </div>
                          <Switch 
                            checked={featured} 
                            onCheckedChange={setFeatured} 
                          />
                        </div>
                        
                        <div className="p-4 border rounded-lg">
                          <Label className="text-sm font-medium">Last Updated</Label>
                          <p className="text-sm text-gray-600 mt-1">
                            {community.updatedAt ? new Date(community.updatedAt).toLocaleDateString() : 'Never'}
                          </p>
                          {community.updatedBy && (
                            <p className="text-xs text-gray-500">by {community.updatedBy}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Content Tab */}
              {activeTab === 'content' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Main Content
                    </h3>
                    
                    <div className="space-y-6">
                      {/* Main Description */}
                      <div>
                        <Label className="text-base font-medium mb-2 block">
                          Community Description
                        </Label>
                        <p className="text-sm text-muted-foreground mb-3">
                          The main overview that appears at the top of the community page
                        </p>
                        <WYSIWYGEditor
                          value={description}
                          onChange={setDescription}
                          placeholder="Write about this community — what makes it special, what the homes are like, the lifestyle..."
                          height="250px"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {description.replace(/<[^>]*>/g, '').length.toLocaleString()} characters
                        </p>
                      </div>

                      {/* Content Sections */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <Label className="text-base font-medium">Content Sections</Label>
                            <p className="text-sm text-muted-foreground">
                              Additional H2 sections with rich content (drag to reorder)
                            </p>
                          </div>
                          <Button onClick={addSection} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Section
                          </Button>
                        </div>

                        {sections.length === 0 ? (
                          <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                            <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p>No content sections yet. Click "Add Section" to get started.</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {sections.map((section, idx) => (
                              <div key={section.id} className="border rounded-lg p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="cursor-grab active:cursor-grabbing opacity-60 hover:opacity-100">
                                      <GripVertical className="h-4 w-4" />
                                    </div>
                                    <Badge variant="secondary" className="text-xs">
                                      Section {idx + 1}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {idx > 0 && (
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => moveSection(idx, idx - 1)}
                                        className="h-7 w-7"
                                      >
                                        ↑
                                      </Button>
                                    )}
                                    {idx < sections.length - 1 && (
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => moveSection(idx, idx + 1)}
                                        className="h-7 w-7"
                                      >
                                        ↓
                                      </Button>
                                    )}
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => removeSection(idx)}
                                      className="h-7 w-7 text-red-500 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                
                                <Input
                                  placeholder="Section heading (H2)"
                                  value={section.heading}
                                  onChange={(e) => updateSection(idx, "heading", e.target.value)}
                                />
                                
                                <WYSIWYGEditor
                                  value={section.content}
                                  onChange={(content) => updateSection(idx, "content", content)}
                                  placeholder="Enter section content with full formatting options..."
                                  height="200px"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tags & Attributes Tab */}
              {activeTab === 'tags' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <TagIcon className="h-5 w-5" />
                      Tags & Attributes
                    </h3>
                    
                    <div className="space-y-6">
                      {/* Highlights */}
                      <div>
                        <Label className="text-base font-medium mb-2 block">Highlights</Label>
                        <p className="text-sm text-muted-foreground mb-3">
                          What makes this community special? Unique features and amenities.
                        </p>
                        <div className="flex gap-2 mb-3">
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
                              <button 
                                onClick={() => removeTag(highlights, setHighlights, i)} 
                                className="ml-1 hover:text-red-500"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                          {highlights.length === 0 && (
                            <span className="text-gray-500 text-sm italic">No highlights added yet</span>
                          )}
                        </div>
                      </div>

                      {/* Best For */}
                      <div>
                        <Label className="text-base font-medium mb-2 block">Best For</Label>
                        <p className="text-sm text-muted-foreground mb-3">
                          Who is this community ideal for? Target demographics and lifestyles.
                        </p>
                        <div className="flex gap-2 mb-3">
                          <Input
                            value={bestForInput}
                            onChange={(e) => setBestForInput(e.target.value)}
                            placeholder="Add a 'best for' tag..."
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addTag(bestFor, setBestFor, bestForInput, setBestForInput);
                              }
                            }}
                          />
                          <Button
                            variant="secondary"
                            onClick={() => addTag(bestFor, setBestFor, bestForInput, setBestForInput)}
                          >
                            Add
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {bestFor.map((tag, i) => (
                            <Badge key={i} variant="outline" className="gap-1 pr-1">
                              {tag}
                              <button 
                                onClick={() => removeTag(bestFor, setBestFor, i)} 
                                className="ml-1 hover:text-red-500"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                          {bestFor.length === 0 && (
                            <span className="text-gray-500 text-sm italic">No 'best for' tags added yet</span>
                          )}
                        </div>
                      </div>

                      {/* Nearby Landmarks */}
                      <div>
                        <Label className="text-base font-medium mb-2 block">Nearby Landmarks</Label>
                        <p className="text-sm text-muted-foreground mb-3">
                          Notable locations, attractions, or amenities close to this community.
                        </p>
                        <div className="flex gap-2 mb-3">
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
                            variant="secondary"
                            onClick={() => addTag(nearbyLandmarks, setNearbyLandmarks, landmarkInput, setLandmarkInput)}
                          >
                            Add
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {nearbyLandmarks.map((tag, i) => (
                            <Badge key={i} variant="outline" className="gap-1 pr-1 border-green-200 text-green-800">
                              {tag}
                              <button 
                                onClick={() => removeTag(nearbyLandmarks, setNearbyLandmarks, i)} 
                                className="ml-1 hover:text-red-500"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                          {nearbyLandmarks.length === 0 && (
                            <span className="text-gray-500 text-sm italic">No landmarks added yet</span>
                          )}
                        </div>
                      </div>

                      {/* Tips */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">Tips for Better Tags</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• <strong>Highlights:</strong> Focus on unique features that differentiate this community</li>
                          <li>• <strong>Best For:</strong> Think about lifestyle, age groups, and buyer preferences</li>
                          <li>• <strong>Landmarks:</strong> Include schools, shopping, entertainment, and transportation hubs</li>
                          <li>• Use specific, descriptive terms that buyers would search for</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SEO Settings Tab */}
              {activeTab === 'seo' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <SearchIcon className="h-5 w-5" />
                      SEO Settings
                    </h3>
                    
                    <div className="space-y-6">
                      {/* SEO Score */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-base font-medium">SEO Optimization Score</Label>
                          <Badge variant={
                            (metaTitle.length >= 30 && metaTitle.length <= 60 && 
                             metaDescription.length >= 120 && metaDescription.length <= 160 &&
                             focusKeyword.trim()) ? "default" : "secondary"
                          }>
                            {(metaTitle.length >= 30 && metaTitle.length <= 60 ? 25 : 0) +
                             (metaDescription.length >= 120 && metaDescription.length <= 160 ? 25 : 0) +
                             (focusKeyword.trim() ? 25 : 0) +
                             (featuredImage ? 25 : 0)}%
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          Optimize your content for better search engine visibility and social sharing.
                        </p>
                      </div>

                      {/* Meta Title */}
                      <div>
                        <Label className="text-base font-medium">Meta Title</Label>
                        <p className="text-sm text-muted-foreground mb-2">
                          The title that appears in search engine results
                        </p>
                        <Input
                          value={metaTitle}
                          onChange={(e) => setMetaTitle(e.target.value)}
                          placeholder={`${community.name} | Homes for Sale | Spyglass Realty`}
                          maxLength={80}
                        />
                        <p className={`text-xs mt-1 ${charCountColor(metaTitle.length, 50, 60)}`}>
                          {metaTitle.length}/60 characters
                        </p>
                        {metaTitle.length > 60 && (
                          <p className="text-xs text-red-600 mt-1">Title may be truncated in search results</p>
                        )}
                      </div>

                      {/* Meta Description */}
                      <div>
                        <Label className="text-base font-medium">Meta Description</Label>
                        <p className="text-sm text-muted-foreground mb-2">
                          The description that appears under your title in search results
                        </p>
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
                        {metaDescription.length > 160 && (
                          <p className="text-xs text-red-600 mt-1">Description may be truncated in search results</p>
                        )}
                      </div>

                      {/* Focus Keyword */}
                      <div>
                        <Label className="text-base font-medium">Focus Keyword</Label>
                        <p className="text-sm text-muted-foreground mb-2">
                          Main keyword you want this page to rank for
                        </p>
                        <Input
                          value={focusKeyword}
                          onChange={(e) => setFocusKeyword(e.target.value)}
                          placeholder="e.g., zilker austin homes"
                        />
                      </div>

                      {/* Google Preview */}
                      <div className="border rounded-lg p-4 bg-white">
                        <Label className="text-sm font-medium text-gray-600 uppercase tracking-wider mb-3 block">
                          Google Search Preview
                        </Label>
                        <div className="space-y-1">
                          <p className="text-blue-600 text-lg truncate">
                            {metaTitle || `${community.name} | Homes for Sale | Spyglass Realty`}
                          </p>
                          <p className="text-green-700 text-sm truncate">
                            spyglassrealty.com/communities/{community.slug}
                          </p>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {metaDescription || `Learn about ${community.name}: homes for sale, neighborhood highlights, schools, and what it's like to live here.`}
                          </p>
                        </div>
                      </div>

                      {/* SEO Best Practices */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">SEO Best Practices</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• Keep meta titles between 30-60 characters for optimal display</li>
                          <li>• Write compelling meta descriptions of 120-160 characters</li>
                          <li>• Include location-based keywords (e.g., "Austin", "Texas")</li>
                          <li>• Make sure your title and description accurately reflect the page content</li>
                          <li>• Use high-quality images with proper alt text for better ranking</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Featured Image Tab */}
              {activeTab === 'featured' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      Featured Image
                    </h3>
                    
                    <div className="space-y-6">
                      <ImageUpload
                        value={featuredImage}
                        onChange={(url, alt, width, height) => {
                          setFeaturedImage(url);
                          if (alt) setFeaturedImageAlt(alt);
                        }}
                        onAltChange={setFeaturedImageAlt}
                        alt={featuredImageAlt}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Save Bar */}
      <div className="sticky bottom-4 z-10">
        <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-3 flex items-center justify-between shadow-lg max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <Badge variant={published ? "default" : "secondary"}>
              {published ? "Published" : "Draft"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {community.name} • {publishingStatus.completedCount}/{publishingStatus.totalCount} requirements met
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant={published ? "outline" : "default"}
              onClick={handleTogglePublish}
              disabled={togglePublishMutation.isPending || (!publishingStatus.canPublish && !published)}
            >
              {togglePublishMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : published ? (
                <EyeOff className="h-4 w-4 mr-2" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              {published ? "Unpublish" : "Publish"}
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
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
    </div>
  );
}