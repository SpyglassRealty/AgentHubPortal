import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import Layout from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  FileText,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Copy,
  ExternalLink,
  ArrowLeft,
  Filter,
  PenTool,
  Building2,
  Layout,
  Upload,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Page {
  id: string;
  title: string;
  slug: string;
  pageType: string;
  isPublished: boolean;
  seoScore: number | null;
  updatedAt: string;
  createdAt: string;
}

const PAGE_TYPE_LABELS: Record<string, string> = {
  blog: 'Blog',
  community: 'Community',
  core: 'Core Page',
  landing: 'Landing',
  buy: 'Buy',
  sell: 'Sell',
  'cash-offer': 'Cash Offer',
  'trade-in': 'Trade-In',
  relocation: 'Relocation',
  'join-team': 'Join Team',
  'join-real': 'Join Real',
  about: 'About',
  newsroom: 'Newsroom',
  faq: 'FAQ',
  custom: 'Custom',
};

function SeoScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) return <Badge variant="outline">—</Badge>;
  if (score >= 80) return <Badge className="bg-green-100 text-green-700">{score}</Badge>;
  if (score >= 60) return <Badge className="bg-yellow-100 text-yellow-700">{score}</Badge>;
  return <Badge className="bg-red-100 text-red-700">{score}</Badge>;
}

export default function PagesListPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isNewPageDialogOpen, setIsNewPageDialogOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['/api/admin/pages', { search, type: typeFilter, status: statusFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (typeFilter !== 'all') params.append('pageType', typeFilter);
      if (statusFilter !== 'all') params.append('published', statusFilter);
      const res = await fetch(`/api/admin/pages?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch pages');
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/pages/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to delete page');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Page deleted' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pages'] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete page', variant: 'destructive' });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/pages/${id}/duplicate`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to duplicate page');
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: 'Page duplicated', description: `"${data.page.title}" created` });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pages'] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to duplicate page', variant: 'destructive' });
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      const res = await fetch(`/api/admin/pages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isPublished }),
      });
      if (!res.ok) throw new Error('Failed to update page');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pages'] });
    },
  });

  const pages: Page[] = data?.pages || [];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation('/admin')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FileText className="h-6 w-6 text-[#EF4923]" />
                Pages
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage landing pages, service pages, and custom content
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setLocation('/admin/blog/import')}
            >
              <Upload className="h-4 w-4 mr-1" />
              Import Blogs
            </Button>
            <Button
              className="bg-[#EF4923] hover:bg-[#d63d1c]"
              onClick={() => setIsNewPageDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              New Page
            </Button>
          </div>
        </div>

        {/* New Page Type Selection Dialog */}
        <Dialog open={isNewPageDialogOpen} onOpenChange={setIsNewPageDialogOpen}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#EF4923]" />
                Choose Page Type
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 pt-2">
              <button
                className="flex items-start gap-4 p-4 rounded-lg border-2 border-transparent hover:border-[#EF4923] hover:bg-orange-50 transition-all text-left group"
                onClick={() => { setIsNewPageDialogOpen(false); setLocation('/admin/pages/blog/new'); }}
              >
                <div className="p-2.5 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors flex-shrink-0">
                  <PenTool className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">New Blog</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Create a blog article or news post with rich content blocks.
                  </p>
                </div>
              </button>

              <button
                className="flex items-start gap-4 p-4 rounded-lg border-2 border-transparent hover:border-[#EF4923] hover:bg-orange-50 transition-all text-left group"
                onClick={() => { setIsNewPageDialogOpen(false); setLocation('/admin/pages/community/new'); }}
              >
                <div className="p-2.5 rounded-lg bg-green-100 group-hover:bg-green-200 transition-colors flex-shrink-0">
                  <Building2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">New Community</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Build a neighborhood or community page with local content.
                  </p>
                </div>
              </button>

              <button
                className="flex items-start gap-4 p-4 rounded-lg border-2 border-transparent hover:border-[#EF4923] hover:bg-orange-50 transition-all text-left group"
                onClick={() => { setIsNewPageDialogOpen(false); setLocation('/admin/pages/core/new'); }}
              >
                <div className="p-2.5 rounded-lg bg-orange-100 group-hover:bg-orange-200 transition-colors flex-shrink-0">
                  <Layout className="h-5 w-5 text-[#EF4923]" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">New Core Page</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Design a service page, landing page, or any general site page.
                  </p>
                </div>
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pages..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-1" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(PAGE_TYPE_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-[#EF4923]" />
              </div>
            ) : pages.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-600 mb-1">No pages found</h3>
                <p className="text-sm text-gray-400 mb-4">
                  {search ? 'Try adjusting your search.' : 'Create your first page to get started.'}
                </p>
                <Button onClick={() => setIsNewPageDialogOpen(true)} className="bg-[#EF4923] hover:bg-[#d63d1c]">
                  <Plus className="h-4 w-4 mr-1" />
                  Create Page
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>SEO</TableHead>
                    <TableHead>Modified</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pages.map(page => (
                    <TableRow
                      key={page.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setLocation(`/admin/pages/${page.id}/edit`)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{page.title || 'Untitled'}</p>
                          <p className="text-xs text-muted-foreground">/p/{page.slug}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {PAGE_TYPE_LABELS[page.pageType] || page.pageType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {page.isPublished ? (
                          <Badge className="bg-green-100 text-green-700">
                            <Globe className="h-3 w-3 mr-1" />
                            Published
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <EyeOff className="h-3 w-3 mr-1" />
                            Draft
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <SeoScoreBadge score={page.seoScore} />
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {page.updatedAt ? formatDistanceToNow(new Date(page.updatedAt), { addSuffix: true }) : '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setLocation(`/admin/pages/${page.id}/edit`);
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {page.isPublished && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                window.open(`https://spyglass-idx.vercel.app${page.pageType === 'blog' ? '/blog' : ''}/${page.slug}`, '_blank');
                              }}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View Live
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              togglePublishMutation.mutate({ id: page.id, isPublished: !page.isPublished });
                            }}>
                              {page.isPublished ? (
                                <>
                                  <EyeOff className="h-4 w-4 mr-2" />
                                  Unpublish
                                </>
                              ) : (
                                <>
                                  <Globe className="h-4 w-4 mr-2" />
                                  Publish
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              duplicateMutation.mutate(page.id);
                            }}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete "${page.title}"? This cannot be undone.`)) {
                                  deleteMutation.mutate(page.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
