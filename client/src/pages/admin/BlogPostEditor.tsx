import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin-layout";
import { SeoPanel } from "@/components/seo/SeoPanel";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ImageUpload } from "@/components/ui/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Save,
  ArrowLeft,
  Eye,
  Calendar,
  FileText,
  User,
  Tag,
  Image as ImageIcon,
  Link as LinkIcon,
  CheckCircle,
  AlertCircle,
  Clock,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buildPreviewUrl, PREVIEW_BASE_URL } from "@/lib/preview";

// ── Types ──────────────────────────────────────────────────────────────

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImageUrl?: string;
  ogImageUrl?: string;
  authorId: string;
  status: 'draft' | 'published' | 'scheduled';
  publishedAt?: string;
  categoryIds: string[];
  tags: string[];
  metaTitle?: string;
  metaDescription?: string;
  indexingDirective?: string;
  canonicalUrl?: string;
  ctaConfig?: {
    enabled: boolean;
    title?: string;
    description?: string;
    buttonText?: string;
    buttonUrl?: string;
  };
  readingTime?: number;
  viewCount: number;
  author?: {
    id: string;
    name: string;
    email?: string;
    bio?: string;
    avatarUrl?: string;
  };
  categories?: {
    id: string;
    name: string;
    slug: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

interface BlogAuthor {
  id: string;
  name: string;
  email?: string;
  bio?: string;
  avatarUrl?: string;
}

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  postCount: number;
}

interface BlogPostResponse {
  post: BlogPost;
}

interface BlogAuthorsResponse {
  authors: BlogAuthor[];
}

interface BlogCategoriesResponse {
  categories: BlogCategory[];
}

// ── Component ──────────────────────────────────────────────────────────

export default function BlogPostEditor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/admin/blog/posts/:slug");
  
  const isNewPost = !params?.slug || params.slug === 'new';
  const postSlug = params?.slug;
  
  // ── Form State ─────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    featuredImageUrl: "",
    ogImageUrl: "",
    authorId: "",
    status: "draft" as 'draft' | 'published' | 'scheduled',
    publishedAt: "",
    categoryIds: [] as string[],
    tags: [] as string[],
    ctaConfig: {
      enabled: false,
      title: "",
      description: "",
      buttonText: "",
      buttonUrl: "",
    },
  });
  
  const [newTag, setNewTag] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // ── Data Queries ───────────────────────────────────────────────────
  const { data: postData, isLoading: postLoading } = useQuery<BlogPostResponse>({
    queryKey: ["/api/admin/blog/posts", postSlug],
    queryFn: async () => {
      const res = await fetch(`/api/admin/blog/posts/${postSlug}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch blog post");
      return res.json();
    },
    enabled: !isNewPost && !!postSlug,
  });

  const { data: authorsData } = useQuery<BlogAuthorsResponse>({
    queryKey: ["/api/admin/blog/authors"],
    queryFn: async () => {
      const res = await fetch("/api/admin/blog/authors", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch authors");
      return res.json();
    },
  });

  const { data: categoriesData } = useQuery<BlogCategoriesResponse>({
    queryKey: ["/api/admin/blog/categories"],
    queryFn: async () => {
      const res = await fetch("/api/admin/blog/categories", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  // ── Effects ────────────────────────────────────────────────────────
  useEffect(() => {
    if (postData?.post) {
      const post = postData.post;
      setFormData({
        title: post.title,
        slug: post.slug,
        content: post.content,
        excerpt: post.excerpt || "",
        featuredImageUrl: post.featuredImageUrl || "",
        ogImageUrl: post.ogImageUrl || "",
        authorId: post.authorId,
        status: post.status,
        publishedAt: post.publishedAt ? new Date(post.publishedAt).toISOString().slice(0, 16) : "",
        categoryIds: post.categoryIds || [],
        tags: post.tags || [],
        ctaConfig: post.ctaConfig || {
          enabled: false,
          title: "",
          description: "",
          buttonText: "",
          buttonUrl: "",
        },
      });
      setIsDirty(false);
    }
  }, [postData]);

  // Auto-generate slug from title
  useEffect(() => {
    if (isNewPost && formData.title && !isDirty) {
      const generatedSlug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
        .slice(0, 50);
      
      setFormData(prev => ({ ...prev, slug: generatedSlug }));
    }
  }, [formData.title, isNewPost, isDirty]);

  // ── Mutations ──────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const endpoint = isNewPost 
        ? "/api/admin/blog/posts" 
        : `/api/admin/blog/posts/${postSlug}`;
      
      const method = isNewPost ? "POST" : "PUT";
      
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          publishedAt: data.publishedAt ? new Date(data.publishedAt).toISOString() : null,
        }),
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => null);
        const fieldErrors = Array.isArray(error?.details)
          ? error.details
              .map((detail: any) => {
                const path = Array.isArray(detail.path) ? detail.path.join(".") : "";
                return path ? `${path}: ${detail.message}` : detail.message;
              })
              .filter(Boolean)
              .join(", ")
          : "";
        throw new Error(fieldErrors || error?.error || "Failed to save blog post");
      }
      return res.json();
    },
    onSuccess: (response) => {
      const savedPost = response.post;
      toast({ title: `Blog post ${isNewPost ? 'created' : 'updated'} successfully` });
      setIsDirty(false);
      
      if (isNewPost) {
        setLocation(`/admin/blog/posts/${savedPost.slug}`);
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/posts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // ── Event Handlers ─────────────────────────────────────────────────
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleCtaConfigChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      ctaConfig: { ...prev.ctaConfig, [field]: value }
    }));
    setIsDirty(true);
  };

  const handleCategoryToggle = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(categoryId)
        ? prev.categoryIds.filter(id => id !== categoryId)
        : [...prev.categoryIds, categoryId]
    }));
    setIsDirty(true);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag("");
      setIsDirty(true);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
    setIsDirty(true);
  };

  const handleSave = () => {
    if (!formData.title.trim()) {
      toast({ title: "Error", description: "Title is required", variant: "destructive" });
      return;
    }
    if (!formData.slug.trim()) {
      toast({ title: "Error", description: "URL slug is required", variant: "destructive" });
      return;
    }
    if (!formData.content.trim()) {
      toast({ title: "Error", description: "Content is required", variant: "destructive" });
      return;
    }
    if (!formData.authorId) {
      toast({ title: "Error", description: "Author is required", variant: "destructive" });
      return;
    }
    
    saveMutation.mutate(formData);
  };

  const handleSeoSave = (seoData: any) => {
    // SEO data is handled by the SeoPanel component
    console.log("SEO data saved:", seoData);
  };

  // ── Computed Values ────────────────────────────────────────────────
  const authors = authorsData?.authors || [];
  const categories = categoriesData?.categories || [];
  const post = postData?.post;
  
  const statusConfig = {
    draft: { label: 'Draft', icon: FileText, variant: 'secondary' as const },
    published: { label: 'Published', icon: CheckCircle, variant: 'default' as const },
    scheduled: { label: 'Scheduled', icon: Clock, variant: 'outline' as const },
  };

  if (postLoading && !isNewPost) {
    return (
      <AdminLayout>
        <div className="max-w-4xl mx-auto py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading blog post...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/admin/blog/posts")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Posts
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold">
                {isNewPost ? "Create New Post" : `Edit: ${post?.title || formData.title}`}
              </h1>
              <p className="text-muted-foreground text-sm">
                {isNewPost ? "Write and publish a new blog post" : "Edit your blog post content and settings"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isDirty && (
              <div className="flex items-center gap-2 text-yellow-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Unsaved changes</span>
              </div>
            )}
            
            {!isNewPost && post?.status === 'published' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(buildPreviewUrl(`/blog/${post.slug}`), '_blank')}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Live
              </Button>
            )}
            
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Saving..." : isNewPost ? "Create Post" : "Save Changes"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Content
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="Enter post title..."
                    className="text-lg"
                  />
                </div>
                
                <div>
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => handleInputChange("slug", e.target.value)}
                    placeholder="url-friendly-slug"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {PREVIEW_BASE_URL.replace("https://", "")}/blog/{formData.slug || 'your-post-url'}
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="excerpt">Excerpt (Optional)</Label>
                  <Textarea
                    id="excerpt"
                    value={formData.excerpt}
                    onChange={(e) => handleInputChange("excerpt", e.target.value)}
                    placeholder="Brief description for previews and SEO..."
                    rows={3}
                    maxLength={200}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.excerpt.length}/200 characters
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="content">Content</Label>
                  <RichTextEditor
                    content={formData.content}
                    onChange={(html) => handleInputChange("content", html)}
                    placeholder="Write your blog post content here..."
                    minHeight="400px"
                    imageCategory="blogs"
                    showSourceToggle={true}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use the toolbar for formatting. Toggle HTML source with the code icon.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Images */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Images
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ImageUpload
                  value={formData.featuredImageUrl}
                  onChange={(url) => handleInputChange("featuredImageUrl", url)}
                  category="blogs"
                  label="Featured Image"
                  hint="Main image shown in blog lists and at the top of the post"
                  aspectRatio="16/9"
                />
                
                <ImageUpload
                  value={formData.ogImageUrl}
                  onChange={(url) => handleInputChange("ogImageUrl", url)}
                  category="blogs"
                  label="Social Media Image (Optional)"
                  hint="Separate image for social media sharing (1200×630px recommended)"
                  aspectRatio="1200/630"
                />
              </CardContent>
            </Card>

            {/* Call to Action */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5" />
                  Call to Action Section
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="ctaEnabled"
                    checked={formData.ctaConfig.enabled}
                    onCheckedChange={(checked) => handleCtaConfigChange("enabled", checked)}
                  />
                  <Label htmlFor="ctaEnabled">Show CTA section at bottom of post</Label>
                </div>
                
                {formData.ctaConfig.enabled && (
                  <div className="space-y-4 pt-4 border-t">
                    <div>
                      <Label htmlFor="ctaTitle">CTA Title</Label>
                      <Input
                        id="ctaTitle"
                        value={formData.ctaConfig.title}
                        onChange={(e) => handleCtaConfigChange("title", e.target.value)}
                        placeholder="Ready to Buy or Sell?"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="ctaDescription">CTA Description</Label>
                      <Textarea
                        id="ctaDescription"
                        value={formData.ctaConfig.description}
                        onChange={(e) => handleCtaConfigChange("description", e.target.value)}
                        placeholder="Contact us today for expert real estate guidance..."
                        rows={2}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="ctaButtonText">Button Text</Label>
                        <Input
                          id="ctaButtonText"
                          value={formData.ctaConfig.buttonText}
                          onChange={(e) => handleCtaConfigChange("buttonText", e.target.value)}
                          placeholder="Contact Us"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="ctaButtonUrl">Button URL</Label>
                        <Input
                          id="ctaButtonUrl"
                          value={formData.ctaConfig.buttonUrl}
                          onChange={(e) => handleCtaConfigChange("buttonUrl", e.target.value)}
                          placeholder="/contact"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SEO Panel Integration */}
            <SeoPanel
              pageType="blog"
              pageId={post?.id || 'new'}
              pageData={{
                title: formData.title,
                description: formData.excerpt,
                slug: formData.slug,
                content: formData.content,
                heroImage: formData.featuredImageUrl,
              }}
              onSave={handleSeoSave}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Publish Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Publish Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value: any) => handleInputChange("status", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([status, config]) => {
                        const Icon = config.icon;
                        return (
                          <SelectItem key={status} value={status}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {config.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="author">Author</Label>
                  <Select value={formData.authorId} onValueChange={(value) => handleInputChange("authorId", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select author..." />
                    </SelectTrigger>
                    <SelectContent>
                      {authors.map((author) => (
                        <SelectItem key={author.id} value={author.id}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {author.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {formData.status === 'scheduled' && (
                  <div>
                    <Label htmlFor="publishDate">Publish Date & Time</Label>
                    <Input
                      id="publishDate"
                      type="datetime-local"
                      value={formData.publishedAt}
                      onChange={(e) => handleInputChange("publishedAt", e.target.value)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`category-${category.id}`}
                        checked={formData.categoryIds.includes(category.id)}
                        onChange={() => handleCategoryToggle(category.id)}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor={`category-${category.id}`} className="text-sm">
                        {category.name}
                        <span className="text-muted-foreground ml-1">({category.postCount})</span>
                      </Label>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <p className="text-sm text-muted-foreground">No categories available</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add tag..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button onClick={handleAddTag} size="sm" disabled={!newTag.trim()}>
                    Add
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                
                {formData.tags.length === 0 && (
                  <p className="text-sm text-muted-foreground">No tags yet</p>
                )}
              </CardContent>
            </Card>

            {/* Post Stats (for existing posts) */}
            {!isNewPost && post && (
              <Card>
                <CardHeader>
                  <CardTitle>Post Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Views:</span>
                    <span className="font-medium">{post.viewCount || 0}</span>
                  </div>
                  
                  {post.readingTime && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Reading time:</span>
                      <span className="font-medium">{post.readingTime} min</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-medium">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last updated:</span>
                    <span className="font-medium">
                      {new Date(post.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
