import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, useLocation } from 'wouter';
import { PageBuilder } from '@/components/page-builder';
import { SeoPanel } from '@/components/seo/SeoPanel';
import type { BlockData } from '@/components/page-builder/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Save,
  Globe,
  Eye,
  Loader2,
  Settings,
  Search,
  FileText,
} from 'lucide-react';

const PAGE_TYPES = [
  { value: 'core', label: 'Core Page' },
  { value: 'blog', label: 'Blog' },
  { value: 'community', label: 'Community' },
  { value: 'landing', label: 'Landing Page' },
  { value: 'buy', label: 'Buy' },
  { value: 'sell', label: 'Sell' },
  { value: 'cash-offer', label: 'Cash Offer' },
  { value: 'trade-in', label: 'Trade-In' },
  { value: 'relocation', label: 'Relocation' },
  { value: 'join-team', label: 'Join Team' },
  { value: 'join-real', label: 'Join Real' },
  { value: 'about', label: 'About' },
  { value: 'newsroom', label: 'Newsroom' },
  { value: 'faq', label: 'FAQ' },
  { value: 'custom', label: 'Custom' },
];

interface PageData {
  id?: string;
  title: string;
  slug: string;
  pageType: string;
  content: string;
  sections: BlockData[];
  metaTitle: string;
  metaDescription: string;
  ogImageUrl: string;
  indexingDirective: string;
  customSchema: any;
  breadcrumbPath: Array<{ name: string; url: string }>;
  customScripts: string;
  isPublished: boolean;
  seoScore?: number;
}

const defaultPage: PageData = {
  title: '',
  slug: '',
  pageType: 'core',
  content: '',
  sections: [],
  metaTitle: '',
  metaDescription: '',
  ogImageUrl: '',
  indexingDirective: 'index,follow',
  customSchema: {},
  breadcrumbPath: [],
  customScripts: '',
  isPublished: false,
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function CorePageEditorPage() {
  const [, routeParams] = useRoute('/admin/pages/core/:id/edit');
  const [, newParams] = useRoute('/admin/pages/core/new');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const pageId = routeParams?.id;
  const isNew = !pageId || newParams !== null;

  const [page, setPage] = useState<PageData>(defaultPage);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSeoOpen, setIsSeoOpen] = useState(false);
  const [autoSlug, setAutoSlug] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ['/api/admin/pages', pageId],
    queryFn: async () => {
      if (!pageId) return null;
      const res = await fetch(`/api/admin/pages/${pageId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch page');
      return res.json();
    },
    enabled: !!pageId,
  });

  useEffect(() => {
    if (data?.page) {
      const p = data.page;
      setPage({
        id: p.id,
        title: p.title || '',
        slug: p.slug || '',
        pageType: p.pageType || 'core',
        content: p.content || '',
        sections: p.sections || [],
        metaTitle: p.metaTitle || '',
        metaDescription: p.metaDescription || '',
        ogImageUrl: p.ogImageUrl || '',
        indexingDirective: p.indexingDirective || 'index,follow',
        customSchema: p.customSchema || {},
        breadcrumbPath: p.breadcrumbPath || [],
        customScripts: p.customScripts || '',
        isPublished: p.isPublished || false,
        seoScore: p.seoScore,
      });
      setAutoSlug(false);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: PageData & { publish?: boolean }) => {
      const isPublished = payload.publish !== undefined ? payload.publish : payload.isPublished;
      const body = {
        ...payload,
        isPublished,
        content: payload.content || ' ',
      };
      delete (body as any).publish;

      const url = pageId ? `/api/admin/pages/${pageId}` : '/api/admin/pages';
      const method = pageId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save page');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      const savedPage = data.page;
      toast({
        title: variables.publish ? 'Page Published!' : 'Page Saved!',
        description: `"${savedPage.title}" has been ${variables.publish ? 'published' : 'saved'}.`,
      });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pages'] });
      if (isNew && savedPage.id) {
        setLocation(`/admin/pages/core/${savedPage.id}/edit`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleTitleChange = (title: string) => {
    setPage(prev => ({
      ...prev,
      title,
      slug: autoSlug ? slugify(title) : prev.slug,
    }));
    setHasChanges(true);
  };

  const handleBlocksChange = useCallback((blocks: BlockData[]) => {
    setPage(prev => ({ ...prev, sections: blocks }));
    setHasChanges(true);
  }, []);

  const handleSave = (publish?: boolean) => {
    if (!page.title) {
      toast({ title: 'Error', description: 'Page title is required', variant: 'destructive' });
      return;
    }
    if (!page.slug) {
      toast({ title: 'Error', description: 'Page slug is required', variant: 'destructive' });
      return;
    }
    saveMutation.mutate({ ...page, publish });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-[#EF4923]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[600px] h-[calc(100vh-160px)]">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white dark:bg-card gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/admin/pages')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <Input
            value={page.title}
            onChange={e => handleTitleChange(e.target.value)}
            placeholder="Core Page Title"
            className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 px-0 max-w-md"
          />

          <Badge className="bg-orange-100 text-orange-700">Core</Badge>

          {page.isPublished ? (
            <Badge className="bg-green-100 text-green-700">Published</Badge>
          ) : (
            <Badge variant="secondary">Draft</Badge>
          )}

          {hasChanges && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-300">
              Unsaved changes
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Page Settings */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-1" />
                Settings
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle>Page Settings</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input value={page.title} onChange={e => handleTitleChange(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Slug</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      value={page.slug}
                      onChange={e => {
                        setAutoSlug(false);
                        setPage(prev => ({ ...prev, slug: e.target.value }));
                        setHasChanges(true);
                      }}
                      placeholder="page-url-slug"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    URL: /p/{page.slug || 'page-slug'}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Page Type</Label>
                  <Select
                    value={page.pageType}
                    onValueChange={v => {
                      setPage(prev => ({ ...prev, pageType: v }));
                      setHasChanges(true);
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAGE_TYPES.map(pt => (
                        <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Published</Label>
                  <Switch
                    checked={page.isPublished}
                    onCheckedChange={v => {
                      setPage(prev => ({ ...prev, isPublished: v }));
                      setHasChanges(true);
                    }}
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* SEO Panel */}
          <Sheet open={isSeoOpen} onOpenChange={setIsSeoOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Search className="h-4 w-4 mr-1" />
                SEO
                {page.seoScore !== undefined && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {page.seoScore}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>SEO Settings</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <SeoPanel
                  pageType="landing"
                  pageId={pageId || 'new'}
                  initialData={{
                    customTitle: page.metaTitle,
                    customDescription: page.metaDescription,
                    customSlug: page.slug,
                    ogImageUrl: page.ogImageUrl,
                    indexingDirective: page.indexingDirective,
                  }}
                  pageData={{
                    title: page.title,
                    slug: page.slug,
                    content: page.content,
                  }}
                  onSave={(seoData) => {
                    setPage(prev => ({
                      ...prev,
                      metaTitle: seoData.customTitle || prev.metaTitle,
                      metaDescription: seoData.customDescription || prev.metaDescription,
                      ogImageUrl: seoData.ogImageUrl || prev.ogImageUrl,
                      indexingDirective: seoData.indexingDirective || prev.indexingDirective,
                    }));
                    setHasChanges(true);
                  }}
                  className="border-0 shadow-none"
                />
              </div>
            </SheetContent>
          </Sheet>

          {/* Save buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave(false)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Save Draft
          </Button>
          <Button
            size="sm"
            className="bg-[#EF4923] hover:bg-[#d63d1c]"
            onClick={() => handleSave(true)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Globe className="h-4 w-4 mr-1" />
            )}
            Publish
          </Button>
        </div>
      </div>

      {/* Page Builder */}
      <div className="flex-1 overflow-hidden">
        <PageBuilder blocks={page.sections} onChange={handleBlocksChange} />
      </div>
    </div>
  );
}
