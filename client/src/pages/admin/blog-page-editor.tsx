import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, useLocation } from 'wouter';
import { PageBuilder } from '@/components/page-builder';
import { SeoPanel } from '@/components/seo/SeoPanel';
import type { BlockData } from '@/components/page-builder/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  Download,
  Link2,
  AlertTriangle,
  Clock,
  ChevronDown,
  ListOrdered,
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

function countWords(blocks: BlockData[]): number {
  let words = 0;
  for (const b of blocks) {
    if (b.type === 'text') {
      const text = (b.props.content || '').replace(/<[^>]+>/g, ' ');
      words += text.split(/\s+/).filter(Boolean).length;
    } else if (b.type === 'heading') {
      words += (b.props.text || '').split(/\s+/).filter(Boolean).length;
    }
  }
  return words;
}

function processLinksInHtml(html: string, isInternal: (url: string) => boolean): string {
  // Process <a> tags: internal links get tracking param, external get rel/target
  return html.replace(
    /<a\s([^>]*)href="([^"]*)"([^>]*)>/gi,
    (_match: string, pre: string, href: string, post: string) => {
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return `<a ${pre}href="${href}"${post}>`;
      }
      if (isInternal(href)) {
        // Convert to relative path and add tracking
        let rel = href;
        try {
          const u = new URL(href);
          rel = u.pathname + u.search + u.hash;
        } catch {
          // already relative
        }
        if (!rel.includes('itm_source=')) {
          rel += (rel.includes('?') ? '&' : '?') + 'itm_source=blog';
        }
        return `<a ${pre}href="${rel}"${post}>`;
      } else {
        // External: ensure rel and target
        const attrs = `${pre}${post}`;
        const hasRel = /rel=/i.test(attrs);
        const hasTarget = /target=/i.test(attrs);
        let out = `<a ${pre}href="${href}"${post}`;
        if (!hasRel) out = out.trimEnd() + ' rel="noopener noreferrer"';
        if (!hasTarget) out = out.trimEnd() + ' target="_blank"';
        return out + '>';
      }
    }
  );
}

// ── Types ──────────────────────────────────────────────────────────

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
  // Blog-specific
  author: string;
  publishDate: string;
  modifiedDate: string;
  canonicalUrl: string;
}

const defaultPage: PageData = {
  title: '',
  slug: '',
  pageType: 'blog',
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
  author: 'Spyglass Realty',
  publishDate: new Date().toISOString().slice(0, 16),
  modifiedDate: new Date().toISOString().slice(0, 16),
  canonicalUrl: '',
};

// ── Heading hierarchy analysis ──────────────────────────────────────

interface HeadingInfo {
  level: number;
  text: string;
  anchorId: string;
}

function analyzeHeadings(blocks: BlockData[]): {
  headings: HeadingInfo[];
  h1Count: number;
  hierarchyWarning: string | null;
} {
  const headings: HeadingInfo[] = [];
  let h1Count = 0;
  let hierarchyWarning: string | null = null;
  let lastLevel = 1;

  for (const b of blocks) {
    if (b.type === 'heading') {
      const level = b.props.level || 2;
      if (level === 1) h1Count++;
      const anchorId = b.props.anchorId || slugify(b.props.text || '');
      headings.push({ level, text: b.props.text || '', anchorId });
      if (headings.length > 1 && level > lastLevel + 1) {
        hierarchyWarning = `Heading hierarchy skipped from H${lastLevel} to H${level}`;
      }
      lastLevel = level;
    }
  }

  return { headings, h1Count, hierarchyWarning };
}

// ── JSON-LD generation ──────────────────────────────────────────────

function generateBlogSchema(page: PageData): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: page.title,
    description: page.metaDescription,
    image: page.ogImageUrl || undefined,
    author: {
      '@type': 'Person',
      name: page.author || 'Spyglass Realty',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Spyglass Realty',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.spyglassrealty.com/uploads/logo.png',
      },
    },
    datePublished: page.publishDate ? new Date(page.publishDate).toISOString() : new Date().toISOString(),
    dateModified: page.modifiedDate ? new Date(page.modifiedDate).toISOString() : new Date().toISOString(),
    url: page.canonicalUrl || `https://www.spyglassrealty.com/blog/${page.slug}.html`,
  };
}

function generateBreadcrumb(page: PageData): Array<{ name: string; url: string }> {
  return [
    { name: 'Home', url: 'https://www.spyglassrealty.com/' },
    { name: 'Blog', url: 'https://www.spyglassrealty.com/blog/' },
    { name: page.title, url: page.canonicalUrl || `https://www.spyglassrealty.com/blog/${page.slug}.html` },
  ];
}

// ── Link processing ──────────────────────────────────────────────────

function processBlockLinks(blocks: BlockData[]): { blocks: BlockData[]; summary: { internal: number; external: number } } {
  const isInternal = (url: string) => {
    try {
      const u = new URL(url);
      return u.hostname.includes('spyglassrealty.com');
    } catch {
      return true; // relative URLs are internal
    }
  };

  let internal = 0;
  let external = 0;

  const processed = blocks.map(b => {
    if (b.type === 'text') {
      const original = b.props.content || '';
      const internalMatches = (original.match(/href="([^"]*)"/gi) || [])
        .filter((m: string) => {
          const url = m.replace(/href="|"/gi, '');
          return isInternal(url) && !url.startsWith('#');
        });
      const externalMatches = (original.match(/href="([^"]*)"/gi) || [])
        .filter((m: string) => {
          const url = m.replace(/href="|"/gi, '');
          return !isInternal(url) && !url.startsWith('#') && !url.startsWith('mailto:');
        });
      internal += internalMatches.length;
      external += externalMatches.length;
      const newContent = processLinksInHtml(original, isInternal);
      return { ...b, props: { ...b.props, content: newContent } };
    }
    return b;
  });

  return { blocks: processed, summary: { internal, external } };
}

// ── TOC update helper ────────────────────────────────────────────────

function syncTocAndAnchors(blocks: BlockData[]): BlockData[] {
  // First pass: ensure all H2/H3 have anchorId
  const withAnchors = blocks.map(b => {
    if (b.type === 'heading' && (b.props.level === 2 || b.props.level === 3)) {
      const anchorId = b.props.anchorId || slugify(b.props.text || '');
      return { ...b, props: { ...b.props, anchorId } };
    }
    return b;
  });

  // Build TOC headings list
  const tocHeadings = withAnchors
    .filter(b => b.type === 'heading' && (b.props.level === 2 || b.props.level === 3))
    .map(b => ({
      text: b.props.text || '',
      level: b.props.level,
      anchorId: b.props.anchorId || slugify(b.props.text || ''),
    }));

  // Second pass: update any TOC blocks
  return withAnchors.map(b => {
    if (b.type === 'toc') {
      return { ...b, props: { ...b.props, headings: tocHeadings } };
    }
    return b;
  });
}

function autoInsertToc(blocks: BlockData[]): BlockData[] {
  const headingCount = blocks.filter(
    b => b.type === 'heading' && (b.props.level === 2 || b.props.level === 3)
  ).length;
  if (headingCount < 3) return blocks;

  // Don't insert if TOC already exists
  if (blocks.some(b => b.type === 'toc')) return blocks;

  // Find the first heading's index
  const firstHeadingIdx = blocks.findIndex(b => b.type === 'heading');
  if (firstHeadingIdx < 0) return blocks;

  const tocBlock: BlockData = {
    id: generateId(),
    type: 'toc',
    props: { headings: [] },
  };

  const result = [...blocks];
  result.splice(firstHeadingIdx + 1, 0, tocBlock);
  return result;
}

// ── Component ────────────────────────────────────────────────────────

export default function BlogPageEditorPage() {
  const [, routeParams] = useRoute('/admin/pages/blog/:id/edit');
  const [, newParams] = useRoute('/admin/pages/blog/new');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const pageId = routeParams?.id;
  const isNew = !pageId || newParams !== null;

  const [page, setPage] = useState<PageData>(defaultPage);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSeoOpen, setIsSeoOpen] = useState(false);
  const [autoSlug, setAutoSlug] = useState(true);

  // URL import state
  const [importUrls, setImportUrls] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Link processing result
  const [linkSummary, setLinkSummary] = useState<{ internal: number; external: number } | null>(null);

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
        pageType: p.pageType || 'blog',
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
        author: p.author || 'Spyglass Realty',
        publishDate: p.publishDate ? new Date(p.publishDate).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
        modifiedDate: p.modifiedDate ? new Date(p.modifiedDate).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
        canonicalUrl: p.canonicalUrl || '',
      });
      setAutoSlug(false);
    }
  }, [data]);

  // Computed values
  const readingTime = useMemo(() => {
    const words = countWords(page.sections);
    return Math.max(1, Math.ceil(words / 200));
  }, [page.sections]);

  const { headings, h1Count, hierarchyWarning } = useMemo(
    () => analyzeHeadings(page.sections),
    [page.sections]
  );

  const imagesWithoutAlt = useMemo(
    () => page.sections.filter(b => b.type === 'image' && !b.props.alt).length,
    [page.sections]
  );

  // Auto-update canonical URL when slug changes
  useEffect(() => {
    if (page.slug && !page.canonicalUrl) {
      setPage(prev => ({
        ...prev,
        canonicalUrl: `https://www.spyglassrealty.com/blog/${prev.slug}.html`,
      }));
    }
  }, [page.slug]);

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
        setLocation(`/admin/pages/blog/${savedPage.id}/edit`);
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
    const slug = autoSlug ? slugify(title) : page.slug;
    const canonicalUrl = autoSlug
      ? `https://www.spyglassrealty.com/blog/${slugify(title)}.html`
      : page.canonicalUrl;
    setPage(prev => ({ ...prev, title, slug, canonicalUrl }));
    setHasChanges(true);
  };

  const handleBlocksChange = useCallback((blocks: BlockData[]) => {
    const synced = syncTocAndAnchors(blocks);
    setPage(prev => ({ ...prev, sections: synced }));
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

    // Heading warnings (non-blocking)
    if (h1Count > 1) {
      toast({
        title: 'Heading Warning',
        description: `This page has ${h1Count} H1 elements. Best practice is exactly one H1.`,
        variant: 'destructive',
      });
    }
    if (hierarchyWarning) {
      toast({
        title: 'Heading Hierarchy',
        description: hierarchyWarning,
      });
    }

    // Process links
    const { blocks: processedBlocks, summary } = processBlockLinks(page.sections);
    setLinkSummary(summary);

    // Generate JSON-LD schema
    const blogSchema = generateBlogSchema({ ...page });
    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: generateBreadcrumb(page).map((crumb, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: crumb.name,
        item: crumb.url,
      })),
    };

    const combinedSchema = [blogSchema, breadcrumbSchema];
    const breadcrumbPath = generateBreadcrumb(page);

    // Auto-update modifiedDate on save
    const modifiedDate = new Date().toISOString().slice(0, 16);

    saveMutation.mutate({
      ...page,
      sections: processedBlocks,
      customSchema: combinedSchema,
      breadcrumbPath,
      modifiedDate,
      publish,
    });
  };

  // URL Import handler
  const handleImport = async () => {
    const urls = importUrls.split('\n').map(u => u.trim()).filter(Boolean);
    if (urls.length === 0) {
      toast({ title: 'Error', description: 'Please enter at least one URL', variant: 'destructive' });
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: urls.length });

    try {
      const res = await fetch('/api/admin/pages/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ urls }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Import failed');

      const results: any[] = data.results;
      const succeeded = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      if (failed.length > 0) {
        toast({
          title: `${failed.length} URL(s) failed`,
          description: failed.map((f: any) => `${f.url}: ${f.error}`).join('\n'),
          variant: 'destructive',
        });
      }

      if (succeeded.length > 0) {
        // Use the first successful result to populate the editor
        const first = succeeded[0].data;
        const sections = autoInsertToc(first.sections || []);
        const synced = syncTocAndAnchors(sections);
        const canonicalUrl = first.canonicalUrl || `https://www.spyglassrealty.com/blog/${first.slug}.html`;

        setPage(prev => ({
          ...prev,
          title: first.title || prev.title,
          slug: first.slug || prev.slug,
          metaTitle: first.metaTitle || first.title || prev.metaTitle,
          metaDescription: first.metaDescription || prev.metaDescription,
          ogImageUrl: first.ogImageUrl || prev.ogImageUrl,
          canonicalUrl,
          author: first.author || prev.author,
          publishDate: first.publishDate ? new Date(first.publishDate).toISOString().slice(0, 16) : prev.publishDate,
          sections: synced,
        }));
        setAutoSlug(false);
        setHasChanges(true);
        setIsImportOpen(false);
        setImportUrls('');

        toast({
          title: 'Import successful!',
          description: `Imported "${first.title}" with ${synced.length} blocks.`,
        });
      }
    } catch (err: any) {
      toast({ title: 'Import failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-[#EF4923]" />
      </div>
    );
  }

  const titleOverLimit = page.title.length > 65;
  const metaDescOver = page.metaDescription.length > 160;

  return (
    <div className="flex flex-col min-h-[600px] h-[calc(100vh-160px)]">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white dark:bg-card gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/admin/pages')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <Input
                value={page.title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="Blog Page Title"
                className={`text-lg font-semibold border-none shadow-none focus-visible:ring-0 px-0 max-w-md ${titleOverLimit ? 'text-red-600' : ''}`}
              />
              <span className={`text-xs whitespace-nowrap ${titleOverLimit ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
                {page.title.length}/65
              </span>
            </div>
          </div>

          <Badge className="bg-blue-100 text-blue-700 shrink-0">Blog</Badge>

          {page.isPublished ? (
            <Badge className="bg-green-100 text-green-700 shrink-0">Published</Badge>
          ) : (
            <Badge variant="secondary" className="shrink-0">Draft</Badge>
          )}

          <Badge variant="outline" className="shrink-0 text-gray-500">
            <Clock className="h-3 w-3 mr-1" />
            {readingTime} min read
          </Badge>

          {h1Count > 1 && (
            <Badge variant="destructive" className="shrink-0">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {h1Count} H1s
            </Badge>
          )}

          {hierarchyWarning && (
            <Badge className="bg-yellow-100 text-yellow-700 shrink-0">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Heading gap
            </Badge>
          )}

          {imagesWithoutAlt > 0 && (
            <Badge className="bg-orange-100 text-orange-700 shrink-0">
              {imagesWithoutAlt} img missing alt
            </Badge>
          )}

          {hasChanges && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-300 shrink-0">
              Unsaved
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Page Settings */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-1" />
                Settings
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[420px] sm:w-[540px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Blog Page Settings</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                {/* Title with counter */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Title</Label>
                    <span className={`text-xs ${titleOverLimit ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
                      {page.title.length}/65
                    </span>
                  </div>
                  <Input
                    value={page.title}
                    onChange={e => handleTitleChange(e.target.value)}
                    className={titleOverLimit ? 'border-red-400' : ''}
                  />
                </div>

                {/* Slug */}
                <div className="space-y-1.5">
                  <Label>Slug</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      value={page.slug}
                      onChange={e => {
                        setAutoSlug(false);
                        setPage(prev => ({
                          ...prev,
                          slug: e.target.value,
                          canonicalUrl: `https://www.spyglassrealty.com/blog/${e.target.value}.html`,
                        }));
                        setHasChanges(true);
                      }}
                      placeholder="page-url-slug"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">URL: /p/{page.slug || 'page-slug'}</p>
                </div>

                {/* Canonical URL */}
                <div className="space-y-1.5">
                  <Label>Canonical URL</Label>
                  <Input
                    value={page.canonicalUrl}
                    onChange={e => {
                      setPage(prev => ({ ...prev, canonicalUrl: e.target.value }));
                      setHasChanges(true);
                    }}
                    placeholder="https://www.spyglassrealty.com/blog/..."
                  />
                </div>

                {/* Meta Description with counter */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Meta Description</Label>
                    <span className={`text-xs ${metaDescOver ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
                      {page.metaDescription.length}/160
                    </span>
                  </div>
                  <Textarea
                    value={page.metaDescription}
                    onChange={e => {
                      setPage(prev => ({ ...prev, metaDescription: e.target.value }));
                      setHasChanges(true);
                    }}
                    rows={3}
                    className={metaDescOver ? 'border-red-400' : ''}
                  />
                </div>

                {/* Author */}
                <div className="space-y-1.5">
                  <Label>Author</Label>
                  <Input
                    value={page.author}
                    onChange={e => {
                      setPage(prev => ({ ...prev, author: e.target.value }));
                      setHasChanges(true);
                    }}
                    placeholder="Spyglass Realty"
                  />
                </div>

                {/* Publish Date */}
                <div className="space-y-1.5">
                  <Label>Publish Date</Label>
                  <Input
                    type="datetime-local"
                    value={page.publishDate}
                    onChange={e => {
                      setPage(prev => ({ ...prev, publishDate: e.target.value }));
                      setHasChanges(true);
                    }}
                  />
                </div>

                {/* Modified Date */}
                <div className="space-y-1.5">
                  <Label>Modified Date</Label>
                  <Input
                    type="datetime-local"
                    value={page.modifiedDate}
                    onChange={e => {
                      setPage(prev => ({ ...prev, modifiedDate: e.target.value }));
                      setHasChanges(true);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">Auto-updated on every save.</p>
                </div>

                {/* OG Image */}
                <div className="space-y-1.5">
                  <Label>OG Image URL</Label>
                  <Input
                    value={page.ogImageUrl}
                    onChange={e => {
                      setPage(prev => ({ ...prev, ogImageUrl: e.target.value }));
                      setHasChanges(true);
                    }}
                    placeholder="https://..."
                  />
                </div>

                {/* Reading time */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <Label className="text-sm text-gray-600">Reading Time</Label>
                  <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />{readingTime} min</Badge>
                </div>

                {/* Heading hierarchy info */}
                {headings.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>Heading Hierarchy</Label>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
                      {headings.map((h, i) => (
                        <div
                          key={i}
                          style={{ paddingLeft: `${(h.level - 1) * 0.75}rem` }}
                          className="text-xs text-gray-600 flex items-center gap-1"
                        >
                          <span className={`font-bold ${h.level === 1 ? 'text-blue-600' : h.level === 2 ? 'text-gray-800' : 'text-gray-500'}`}>
                            H{h.level}
                          </span>
                          <span className="truncate">{h.text}</span>
                        </div>
                      ))}
                    </div>
                    {h1Count > 1 && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Multiple H1 tags ({h1Count})
                      </p>
                    )}
                    {hierarchyWarning && (
                      <p className="text-xs text-yellow-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> {hierarchyWarning}
                      </p>
                    )}
                  </div>
                )}

                {/* Link summary */}
                {linkSummary && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <Link2 className="h-4 w-4 text-blue-600" />
                    <div className="text-sm text-blue-700">
                      <span className="font-medium">Links processed:</span>{' '}
                      {linkSummary.internal} internal · {linkSummary.external} external
                    </div>
                  </div>
                )}

                {/* Published toggle */}
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

      {/* URL Import Panel */}
      <Collapsible open={isImportOpen} onOpenChange={setIsImportOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-2 px-4 py-2 border-b bg-orange-50 hover:bg-orange-100 cursor-pointer transition-colors">
            <Download className="h-4 w-4 text-[#EF4923]" />
            <span className="text-sm font-medium text-[#EF4923]">Import from URL</span>
            <span className="text-xs text-gray-500 ml-1">— paste Spyglass blog URLs to import content</span>
            <ChevronDown className={`h-4 w-4 text-gray-400 ml-auto transition-transform ${isImportOpen ? 'rotate-180' : ''}`} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 py-3 border-b bg-orange-50/50 space-y-3">
            <Textarea
              value={importUrls}
              onChange={e => setImportUrls(e.target.value)}
              placeholder="https://www.spyglassrealty.com/blog/example-post.html&#10;https://www.spyglassrealty.com/blog/another-post.html"
              rows={3}
              className="text-sm bg-white"
              disabled={isImporting}
            />
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                className="bg-[#EF4923] hover:bg-[#d63d1c]"
                onClick={handleImport}
                disabled={isImporting || !importUrls.trim()}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    {importProgress
                      ? `Importing ${importProgress.current}/${importProgress.total}...`
                      : 'Importing...'}
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-1" />
                    Import
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500">
                One URL per line. Content will replace current blocks.
              </p>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Page Builder */}
      <div className="flex-1 overflow-hidden">
        <PageBuilder blocks={page.sections} onChange={handleBlocksChange} />
      </div>
    </div>
  );
}
