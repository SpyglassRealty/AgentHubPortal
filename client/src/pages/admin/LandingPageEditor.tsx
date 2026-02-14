import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { SeoPanel } from "@/components/seo/SeoPanel";
import {
  ArrowLeft,
  Save,
  FileText,
  Globe,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  GripVertical,
  Loader2,
  Code,
  Layout as LayoutIcon,
  Image as ImageIcon,
  Link as LinkIcon,
} from "lucide-react";
import type { LandingPage } from "@shared/schema";

interface PageFormData {
  title: string;
  slug: string;
  pageType: string;
  content: string;
  sections: Array<{
    id: string;
    heading: string;
    content: string;
    imageUrl?: string;
    ctaText?: string;
    ctaUrl?: string;
    order: number;
  }>;
  metaTitle: string;
  metaDescription: string;
  ogImageUrl: string;
  indexingDirective: string;
  customSchema: object;
  breadcrumbPath: Array<{ name: string; url: string }>;
  customScripts: string;
  isPublished: boolean;
}

const defaultFormData: PageFormData = {
  title: "",
  slug: "",
  pageType: "custom",
  content: "",
  sections: [],
  metaTitle: "",
  metaDescription: "",
  ogImageUrl: "",
  indexingDirective: "index,follow",
  customSchema: {},
  breadcrumbPath: [],
  customScripts: "",
  isPublished: false,
};

const PAGE_TYPES = [
  { value: "buy", label: "Buy" },
  { value: "sell", label: "Sell" },
  { value: "cash-offer", label: "Cash Offer" },
  { value: "trade-in", label: "Trade-In" },
  { value: "relocation", label: "Relocation" },
  { value: "join-team", label: "Join Team" },
  { value: "join-real", label: "Join Real" },
  { value: "about", label: "About" },
  { value: "newsroom", label: "Newsroom" },
  { value: "faq", label: "FAQ" },
  { value: "custom", label: "Custom" },
];

export default function LandingPageEditorPage() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/admin/landing-pages/:id");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const pageId = params?.id;
  const isEditing = pageId && pageId !== "new";
  
  const [formData, setFormData] = useState<PageFormData>(defaultFormData);
  const [previewMode, setPreviewMode] = useState(false);
  const [htmlEditMode, setHtmlEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState("content");

  // Fetch existing page data if editing
  const { data: pageData, isLoading } = useQuery({
    queryKey: ["/api/admin/landing-pages", pageId],
    queryFn: async () => {
      if (!isEditing) return null;
      const res = await fetch(`/api/admin/landing-pages/${pageId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch page");
      return res.json();
    },
    enabled: !!isEditing,
  });

  // Initialize form data when page data is loaded
  useEffect(() => {
    if (pageData?.page) {
      const page: LandingPage = pageData.page;
      setFormData({
        title: page.title || "",
        slug: page.slug || "",
        pageType: page.pageType || "custom",
        content: page.content || "",
        sections: page.sections || [],
        metaTitle: page.metaTitle || "",
        metaDescription: page.metaDescription || "",
        ogImageUrl: page.ogImageUrl || "",
        indexingDirective: page.indexingDirective || "index,follow",
        customSchema: page.customSchema || {},
        breadcrumbPath: page.breadcrumbPath || [],
        customScripts: page.customScripts || "",
        isPublished: page.isPublished ?? false,
      });
    }
  }, [pageData]);

  // Auto-generate slug when title changes (for new pages)
  useEffect(() => {
    if (!isEditing && formData.title && !formData.slug) {
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/--+/g, '-')
        .replace(/^-|-$/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
  }, [formData.title, isEditing, formData.slug]);

  // Auto-generate meta title when title changes
  useEffect(() => {
    if (formData.title && !formData.metaTitle) {
      const metaTitle = `${formData.title} | Spyglass Realty`;
      setFormData(prev => ({ ...prev, metaTitle: metaTitle.slice(0, 60) }));
    }
  }, [formData.title, formData.metaTitle]);

  // Save page mutation
  const savePageMutation = useMutation({
    mutationFn: async (data: PageFormData) => {
      const url = isEditing ? `/api/admin/landing-pages/${pageId}` : "/api/admin/landing-pages";
      const method = isEditing ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save page");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-pages"] });
      toast({
        title: isEditing ? "Page updated" : "Page created",
        description: `"${formData.title}" has been saved.`,
      });
      setLocation("/admin/landing-pages");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.title.trim() || !formData.slug.trim() || !formData.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Title, slug, and content are required.",
        variant: "destructive",
      });
      return;
    }
    
    savePageMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof PageFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addSection = () => {
    const newSection = {
      id: Date.now().toString(),
      heading: "",
      content: "",
      order: formData.sections.length,
    };
    setFormData(prev => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));
  };

  const updateSection = (sectionId: string, updates: Partial<PageFormData['sections'][0]>) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      ),
    }));
  };

  const removeSection = (sectionId: string) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.filter(section => section.id !== sectionId),
    }));
  };

  const getSeoScore = () => {
    let score = 0;
    if (formData.title) score += 10;
    if (formData.content && formData.content.length >= 300) score += 15;
    if (formData.sections && formData.sections.length >= 3) score += 15;
    if (formData.metaTitle && formData.metaTitle.length >= 30 && formData.metaTitle.length <= 60) score += 15;
    if (formData.metaDescription && formData.metaDescription.length >= 120 && formData.metaDescription.length <= 160) score += 15;
    if (formData.ogImageUrl) score += 10;
    if (formData.breadcrumbPath && formData.breadcrumbPath.length > 0) score += 5;
    if (formData.customScripts) score += 5;
    if (formData.isPublished) score += 5;
    if (Object.keys(formData.customSchema).length > 0) score += 5;
    return Math.min(score, 100);
  };

  const getSeoScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-700";
    if (score >= 60) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  const seoScore = getSeoScore();

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <FileText className="h-8 w-8 text-[#EF4923]" />
              {isEditing ? "Edit Landing Page" : "Create Landing Page"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isEditing 
                ? `Update "${formData.title}"`
                : "Create a new landing page for your website"
              }
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setLocation("/admin/landing-pages")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Pages
            </Button>
            <Button
              variant="outline"
              onClick={() => setPreviewMode(!previewMode)}
            >
              {previewMode ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
              {previewMode ? "Edit" : "Preview"}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Status Banner */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className={`${getSeoScoreColor(seoScore)} text-sm font-medium px-3 py-1`}>
                  SEO Score: {seoScore}/100
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {seoScore >= 80 ? "Excellent" : seoScore >= 60 ? "Good" : "Needs improvement"}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.isPublished}
                    onCheckedChange={(checked) => handleInputChange("isPublished", checked)}
                  />
                  <span className="text-sm font-medium">
                    {formData.isPublished ? "Published" : "Draft"}
                  </span>
                </div>
                {formData.isPublished && formData.slug && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`https://spyglassrealty.com/${formData.slug}`, '_blank')}
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    View Live
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview Mode */}
        {previewMode ? (
          <Card>
            <CardHeader>
              <CardTitle>Page Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border p-8 space-y-8">
                {/* Header */}
                <div className="text-center">
                  <h1 className="text-4xl font-bold mb-4">{formData.title}</h1>
                  {formData.metaDescription && (
                    <p className="text-xl text-muted-foreground">{formData.metaDescription}</p>
                  )}
                </div>

                {/* Main Content */}
                <div 
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: formData.content }}
                />

                {/* Sections */}
                {formData.sections.map((section) => (
                  <div key={section.id} className="space-y-4">
                    {section.heading && (
                      <h2 className="text-2xl font-semibold">{section.heading}</h2>
                    )}
                    {section.imageUrl && (
                      <img 
                        src={section.imageUrl} 
                        alt={section.heading}
                        className="w-full h-64 object-cover rounded-lg"
                      />
                    )}
                    <div 
                      className="prose max-w-none"
                      dangerouslySetInnerHTML={{ __html: section.content }}
                    />
                    {section.ctaText && section.ctaUrl && (
                      <div className="text-center">
                        <a 
                          href={section.ctaUrl}
                          className="inline-block bg-[#EF4923] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#EF4923]/90 transition-colors"
                        >
                          {section.ctaText}
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Edit Form */
          <form onSubmit={handleSubmit}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="sections">Sections</TabsTrigger>
                <TabsTrigger value="seo">SEO</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Page Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="title">Page Title *</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => handleInputChange("title", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="pageType">Page Type *</Label>
                        <Select
                          value={formData.pageType}
                          onValueChange={(value) => handleInputChange("pageType", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAGE_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="slug">URL Slug *</Label>
                      <Input
                        id="slug"
                        value={formData.slug}
                        onChange={(e) => handleInputChange("slug", e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Will create: spyglassrealty.com/{formData.slug}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Main Content</CardTitle>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setHtmlEditMode(!htmlEditMode)}
                      >
                        <Code className="h-4 w-4 mr-2" />
                        {htmlEditMode ? "Visual" : "HTML"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={formData.content}
                      onChange={(e) => handleInputChange("content", e.target.value)}
                      rows={htmlEditMode ? 15 : 8}
                      placeholder={htmlEditMode 
                        ? "<h1>Welcome to our page</h1>\n<p>Your content here...</p>"
                        : "Enter your page content here..."
                      }
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {htmlEditMode ? "HTML content" : "Rich text content"} • {formData.content.length} characters
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sections" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Content Sections</CardTitle>
                      <Button type="button" onClick={addSection}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Section
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {formData.sections.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <LayoutIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No sections yet. Add sections to structure your content.</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {formData.sections.map((section, index) => (
                          <Card key={section.id} className="border-l-4 border-[#EF4923]">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">Section {index + 1}</span>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeSection(section.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div>
                                <Label>Section Heading</Label>
                                <Input
                                  value={section.heading}
                                  onChange={(e) => updateSection(section.id, { heading: e.target.value })}
                                  placeholder="Section heading"
                                />
                              </div>
                              
                              <div>
                                <Label>Content</Label>
                                <Textarea
                                  value={section.content}
                                  onChange={(e) => updateSection(section.id, { content: e.target.value })}
                                  rows={4}
                                  placeholder="Section content..."
                                />
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Image URL</Label>
                                  <Input
                                    value={section.imageUrl || ""}
                                    onChange={(e) => updateSection(section.id, { imageUrl: e.target.value })}
                                    placeholder="https://example.com/image.jpg"
                                  />
                                </div>
                                <div>
                                  <Label>CTA Button Text</Label>
                                  <Input
                                    value={section.ctaText || ""}
                                    onChange={(e) => updateSection(section.id, { ctaText: e.target.value })}
                                    placeholder="Learn More"
                                  />
                                </div>
                              </div>
                              
                              <div>
                                <Label>CTA Button URL</Label>
                                <Input
                                  value={section.ctaUrl || ""}
                                  onChange={(e) => updateSection(section.id, { ctaUrl: e.target.value })}
                                  placeholder="/contact"
                                />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="seo" className="space-y-6">
                <SeoPanel
                  data={{
                    metaTitle: formData.metaTitle,
                    metaDescription: formData.metaDescription,
                    indexingDirective: formData.indexingDirective,
                    customSchema: formData.customSchema,
                  }}
                  onChange={(seoData) => {
                    setFormData(prev => ({
                      ...prev,
                      metaTitle: seoData.metaTitle || "",
                      metaDescription: seoData.metaDescription || "",
                      indexingDirective: seoData.indexingDirective || "index,follow",
                      customSchema: seoData.customSchema || {},
                    }));
                  }}
                  focusKeyword={`${formData.title} ${formData.pageType}`}
                  contentPreview={formData.content}
                />

                <Card>
                  <CardHeader>
                    <CardTitle>Social & Media</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="ogImageUrl">Open Graph Image URL</Label>
                      <Input
                        id="ogImageUrl"
                        type="url"
                        value={formData.ogImageUrl}
                        onChange={(e) => handleInputChange("ogImageUrl", e.target.value)}
                        placeholder="https://example.com/og-image.jpg"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Recommended: 1200x630px for social sharing
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Custom Scripts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Label htmlFor="customScripts">Page-specific Scripts</Label>
                    <Textarea
                      id="customScripts"
                      value={formData.customScripts}
                      onChange={(e) => handleInputChange("customScripts", e.target.value)}
                      rows={8}
                      placeholder="<script>&#10;// Your custom JavaScript or schema markup&#10;</script>"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Custom scripts, tracking codes, or structured data for this page
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Save Button */}
            <div className="flex justify-end gap-3 mt-8">
              <Button type="button" variant="outline" onClick={() => setLocation("/admin/landing-pages")}>
                Cancel
              </Button>
              <Button type="submit" disabled={savePageMutation.isPending}>
                {savePageMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? "Update Page" : "Create Page"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
}