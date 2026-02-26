import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search as SearchIcon,
  Eye,
  AlertCircle,
  CheckCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────

export interface SeoData {
  customTitle?: string;
  customDescription?: string;
  customSlug?: string;
  featuredImageUrl?: string;
  ogImageUrl?: string;
  breadcrumbPath?: Array<{ name: string; url: string }>;
  indexingDirective?: string;
  customSchema?: any;
  focusKeyword?: string;
  canonicalUrl?: string;
  seoScore?: number;
  seoIssues?: string[];
}

export interface SeoAnalysis {
  seoScore: number;
  issues: string[];
  schema: any;
  recommendations: string[];
}

interface SeoPanelProps {
  pageType: 'community' | 'blog' | 'agent' | 'landing';
  pageId: string;
  initialData?: SeoData;
  pageData?: {
    title?: string;
    name?: string;
    description?: string;
    slug?: string;
    content?: string;
    heroImage?: string;
  };
  onSave?: (data: SeoData) => void;
  readonly?: boolean;
  className?: string;
}

// ── Hook for SEO analysis ─────────────────────────────

function useSeoAnalysis(pageType: string, combinedData: any) {
  const [analysis, setAnalysis] = useState<SeoAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const runAnalysis = async () => {
    if (!combinedData.title && !combinedData.customTitle) return;
    
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/admin/seo/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pageType, pageData: combinedData }),
      });
      
      if (response.ok) {
        const result = await response.json();
        setAnalysis(result);
      }
    } catch (error) {
      console.error('SEO analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return { analysis, isAnalyzing, runAnalysis };
}

// ── Component ──────────────────────────────────────────

export function SeoPanel({ 
  pageType, 
  pageId, 
  initialData, 
  pageData = {}, 
  onSave, 
  readonly = false,
  className = "" 
}: SeoPanelProps) {
  // ── Local state ────────────────────────────────────
  const [seoData, setSeoData] = useState<SeoData>(initialData || {});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ── Combined data for analysis ─────────────────────
  const combinedData = {
    title: seoData.customTitle || pageData.title || pageData.name,
    description: seoData.customDescription || pageData.description,
    focusKeyword: seoData.focusKeyword,
    content: pageData.content || pageData.description,
    imageUrl: seoData.featuredImageUrl || pageData.heroImage,
    slug: seoData.customSlug || pageData.slug,
  };

  // ── SEO Analysis ───────────────────────────────────
  const { analysis, isAnalyzing, runAnalysis } = useSeoAnalysis(pageType, combinedData);

  // ── Auto-run analysis when key fields change ──────
  useEffect(() => {
    const timeoutId = setTimeout(runAnalysis, 1000);
    return () => clearTimeout(timeoutId);
  }, [combinedData.title, combinedData.description, combinedData.focusKeyword]);

  // ── Character count color ──────────────────────────
  const charCountColor = (len: number, yellowAt: number, redAt: number) => {
    if (len >= redAt) return "text-red-500 font-semibold";
    if (len >= yellowAt) return "text-yellow-600";
    return "text-muted-foreground";
  };

  // ── Save SEO settings ──────────────────────────────
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/seo/page-settings/${pageType}/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(seoData),
      });

      if (response.ok) {
        const updated = await response.json();
        setSeoData(updated);
        onSave?.(updated);
      } else {
        throw new Error('Failed to save SEO settings');
      }
    } catch (error) {
      console.error('Error saving SEO settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Update field ───────────────────────────────────
  const updateField = (field: keyof SeoData, value: any) => {
    setSeoData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SearchIcon className="h-5 w-5" />
          SEO Settings
          {analysis && (
            <Badge
              variant={
                analysis.seoScore >= 80 ? "default" :
                analysis.seoScore >= 60 ? "secondary" : "destructive"
              }
              className="ml-auto"
            >
              {analysis.seoScore}/100
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          {/* ── Basic SEO Tab ────────────────────────── */}
          <TabsContent value="basic" className="space-y-4">
            <div>
              <Label>Page Title</Label>
              <Input
                value={seoData.customTitle || ''}
                onChange={(e) => updateField('customTitle', e.target.value)}
                placeholder={`${pageData.title || pageData.name || 'Untitled'}`}
                maxLength={80}
                disabled={readonly}
              />
              <p className={`text-xs mt-1 ${charCountColor(combinedData.title?.length || 0, 50, 60)}`}>
                {combinedData.title?.length || 0}/60 characters
              </p>
            </div>

            <div>
              <Label>Meta Description</Label>
              <Textarea
                value={seoData.customDescription || ''}
                onChange={(e) => updateField('customDescription', e.target.value)}
                placeholder={pageData.description || 'Enter a compelling description...'}
                rows={3}
                maxLength={200}
                disabled={readonly}
              />
              <p className={`text-xs mt-1 ${charCountColor(combinedData.description?.length || 0, 140, 160)}`}>
                {combinedData.description?.length || 0}/160 characters
              </p>
            </div>

            <div>
              <Label>Focus Keyword</Label>
              <Input
                value={seoData.focusKeyword || ''}
                onChange={(e) => updateField('focusKeyword', e.target.value)}
                placeholder="e.g., austin homes for sale"
                disabled={readonly}
              />
            </div>

            <div>
              <Label>URL Slug</Label>
              <Input
                value={seoData.customSlug || ''}
                onChange={(e) => updateField('customSlug', e.target.value)}
                placeholder={pageData.slug || 'url-slug'}
                disabled={readonly}
              />
            </div>

            <div>
              <Label>Featured Image URL</Label>
              <Input
                value={seoData.featuredImageUrl || ''}
                onChange={(e) => updateField('featuredImageUrl', e.target.value)}
                placeholder={pageData.heroImage || 'https://example.com/image.jpg'}
                disabled={readonly}
              />
            </div>

            {!readonly && (
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save SEO Settings
              </Button>
            )}
          </TabsContent>

          {/* ── Search Preview Tab ───────────────────── */}
          <TabsContent value="preview" className="space-y-4">
            <div className="border rounded-lg p-4 bg-white dark:bg-card">
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
                Google Search Preview
              </p>
              <div className="space-y-1">
                <p className="text-blue-600 dark:text-blue-400 text-lg truncate">
                  {combinedData.title || 'Page Title'}
                </p>
                <p className="text-green-700 dark:text-green-500 text-sm truncate">
                  spyglassrealty.com/{pageType}s/{combinedData.slug || 'page-slug'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {combinedData.description || 'Meta description will appear here...'}
                </p>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-slate-900 text-white">
              <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider">
                Social Media Preview (Facebook/Twitter)
              </p>
              <div className="space-y-2">
                {combinedData.imageUrl && (
                  <div className="w-full h-32 bg-slate-700 rounded overflow-hidden">
                    <img 
                      src={combinedData.imageUrl} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <p className="font-semibold truncate">
                  {combinedData.title || 'Page Title'}
                </p>
                <p className="text-sm text-slate-300 line-clamp-2">
                  {combinedData.description || 'Meta description will appear here...'}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  spyglassrealty.com
                </p>
              </div>
            </div>
          </TabsContent>

          {/* ── Advanced Tab ──────────────────────────── */}
          <TabsContent value="advanced" className="space-y-4">
            <div>
              <Label>Open Graph Image URL</Label>
              <Input
                value={seoData.ogImageUrl || ''}
                onChange={(e) => updateField('ogImageUrl', e.target.value)}
                placeholder="https://example.com/og-image.jpg"
                disabled={readonly}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Separate image for social media sharing (recommended: 1200x630px)
              </p>
            </div>

            <div>
              <Label>Canonical URL</Label>
              <Input
                value={seoData.canonicalUrl || ''}
                onChange={(e) => updateField('canonicalUrl', e.target.value)}
                placeholder="https://spyglassrealty.com/canonical-url"
                disabled={readonly}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Override the canonical URL for this page (optional)
              </p>
            </div>

            <div>
              <Label>Indexing Directive</Label>
              <Select 
                value={seoData.indexingDirective || 'index,follow'} 
                onValueChange={(value) => updateField('indexingDirective', value)}
                disabled={readonly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select indexing directive" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="index,follow">Index, Follow (Default)</SelectItem>
                  <SelectItem value="index,nofollow">Index, No Follow</SelectItem>
                  <SelectItem value="noindex,follow">No Index, Follow</SelectItem>
                  <SelectItem value="noindex,nofollow">No Index, No Follow</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Controls how search engines crawl and index this page
              </p>
            </div>

            {analysis?.schema && (
              <div>
                <Label>JSON-LD Schema</Label>
                <Textarea
                  value={JSON.stringify(analysis.schema, null, 2)}
                  readOnly
                  rows={8}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Auto-generated structured data for search engines
                </p>
              </div>
            )}

            {!readonly && (
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save Advanced Settings
              </Button>
            )}
          </TabsContent>

          {/* ── Analysis Tab ───────────────────────────── */}
          <TabsContent value="analysis" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">SEO Analysis</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={runAnalysis}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Re-analyze
              </Button>
            </div>

            {analysis && (
              <>
                <div className="flex items-center gap-3 p-4 border rounded-lg">
                  {analysis.seoScore >= 80 ? (
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  ) : (
                    <AlertCircle className="h-8 w-8 text-yellow-500" />
                  )}
                  <div>
                    <div className="font-semibold text-lg">
                      SEO Score: {analysis.seoScore}/100
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {analysis.seoScore >= 80 ? 'Excellent' : 
                       analysis.seoScore >= 60 ? 'Good' : 'Needs Improvement'}
                    </div>
                  </div>
                </div>

                {analysis.issues.length > 0 && (
                  <div>
                    <Label className="text-destructive">Issues to Fix</Label>
                    <div className="space-y-2 mt-2">
                      {analysis.issues.map((issue, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                          <span>{issue}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.recommendations.length > 0 && analysis.issues.length === 0 && (
                  <div>
                    <Label className="text-green-600">✓ All Good!</Label>
                    <div className="space-y-2 mt-2">
                      {analysis.recommendations.map((rec, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="pt-4 border-t">
              <Label className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                External Tools
              </Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.open(`https://search.google.com/test/rich-results?url=${encodeURIComponent(window.location.origin + '/' + pageType + 's/' + (combinedData.slug || 'page-slug'))}`, '_blank')}
                >
                  Rich Results Test
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.open(`https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(window.location.origin + '/' + pageType + 's/' + (combinedData.slug || 'page-slug'))}`, '_blank')}
                >
                  Facebook Debugger
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}