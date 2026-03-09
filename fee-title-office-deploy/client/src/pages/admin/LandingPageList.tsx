import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  FileText,
  Eye,
  EyeOff,
  Filter,
  Globe,
  Loader2,
  ExternalLink,
} from "lucide-react";
import type { LandingPage } from "@shared/schema";

interface LandingPagesResponse {
  pages: LandingPage[];
}

const PAGE_TYPE_LABELS: Record<string, string> = {
  buy: "Buy",
  sell: "Sell", 
  "cash-offer": "Cash Offer",
  "trade-in": "Trade-In",
  relocation: "Relocation",
  "join-team": "Join Team",
  "join-real": "Join Real",
  about: "About",
  newsroom: "Newsroom",
  faq: "FAQ",
  custom: "Custom",
};

export default function LandingPageListPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for filters and search
  const [search, setSearch] = useState("");
  const [pageTypeFilter, setPageTypeFilter] = useState("all");
  const [publishedFilter, setPublishedFilter] = useState("all");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // Fetch landing pages
  const { data: pagesData, isLoading } = useQuery<LandingPagesResponse>({
    queryKey: ["/api/admin/landing-pages", { search, pageType: pageTypeFilter, published: publishedFilter, sortBy, order: sortOrder }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (pageTypeFilter !== "all") params.append("pageType", pageTypeFilter);
      if (publishedFilter !== "all") params.append("published", publishedFilter);
      params.append("sortBy", sortBy);
      params.append("order", sortOrder);
      
      const res = await fetch(`/api/admin/landing-pages?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch landing pages");
      return res.json();
    },
  });

  // Toggle published status mutation
  const togglePublishedMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      const res = await fetch(`/api/admin/landing-pages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isPublished }),
      });
      if (!res.ok) throw new Error("Failed to update page status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-pages"] });
      toast({ title: "Page status updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update page status", variant: "destructive" });
    },
  });

  // Delete page mutation
  const deletePageMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/landing-pages/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete page");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-pages"] });
      toast({ title: "Page deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete page", variant: "destructive" });
    },
  });

  const pages = pagesData?.pages || [];

  const getSeoScoreColor = (score?: number | null) => {
    if (!score) return "bg-gray-100 text-gray-600";
    if (score >= 80) return "bg-green-100 text-green-700";
    if (score >= 60) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  const getPageTypeColor = (pageType: string) => {
    const colors: Record<string, string> = {
      buy: "bg-blue-100 text-blue-700",
      sell: "bg-green-100 text-green-700",
      "cash-offer": "bg-orange-100 text-orange-700",
      "trade-in": "bg-purple-100 text-purple-700",
      relocation: "bg-pink-100 text-pink-700",
      "join-team": "bg-indigo-100 text-indigo-700",
      "join-real": "bg-cyan-100 text-cyan-700",
      about: "bg-gray-100 text-gray-700",
      newsroom: "bg-yellow-100 text-yellow-700",
      faq: "bg-red-100 text-red-700",
      custom: "bg-slate-100 text-slate-700",
    };
    return colors[pageType] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <FileText className="h-8 w-8 text-[#EF4923]" />
              Landing Pages
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage core website pages and landing pages for campaigns.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin">
              <Button variant="outline">← Back to Admin</Button>
            </Link>
            <Link href="/admin/landing-pages/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Page
              </Button>
            </Link>
          </div>
        </div>

        <Separator />

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Search & Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search pages..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={pageTypeFilter} onValueChange={setPageTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(PAGE_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={publishedFilter} onValueChange={setPublishedFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pages</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>

              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [field, order] = value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="title-asc">Title A-Z</SelectItem>
                  <SelectItem value="title-desc">Title Z-A</SelectItem>
                  <SelectItem value="pageType-asc">Type A-Z</SelectItem>
                  <SelectItem value="updatedAt-desc">Recently Updated</SelectItem>
                  <SelectItem value="seoScore-desc">SEO Score High-Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Pages Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : pages.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No pages found</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first landing page to get started.
                </p>
                <Link href="/admin/landing-pages/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Page
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Page</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>SEO Score</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pages.map((page) => (
                      <TableRow key={page.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{page.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                /{page.slug}
                              </code>
                              {page.isPublished && (
                                <a 
                                  href={`https://spyglass-idx.vercel.app${page.pageType === 'blog' ? '/blog' : ''}/${page.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  View Live
                                </a>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getPageTypeColor(page.pageType)} text-xs`}>
                            {PAGE_TYPE_LABELS[page.pageType] || page.pageType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={page.isPublished}
                              onCheckedChange={(checked) =>
                                togglePublishedMutation.mutate({ id: page.id, isPublished: checked })
                              }
                              disabled={togglePublishedMutation.isPending}
                            />
                            <span className="text-sm text-muted-foreground">
                              {page.isPublished ? "Published" : "Draft"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${getSeoScoreColor(page.seoScore)} text-xs font-medium`}
                          >
                            {page.seoScore || 0}/100
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(page.updatedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => setLocation(`/admin/landing-pages/${page.id}`)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              {page.isPublished && (
                                <DropdownMenuItem
                                  onClick={() => window.open(`https://spyglass-idx.vercel.app${page.pageType === 'blog' ? '/blog' : ''}/${page.slug}`, '_blank')}
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  View Live
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this page?")) {
                                    deletePageMutation.mutate(page.id);
                                  }
                                }}
                                className="text-red-600"
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        {pages.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-[#EF4923]">{pages.length}</p>
                  <p className="text-sm text-muted-foreground">Total Pages</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {pages.filter(p => p.isPublished).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Published</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">
                    {pages.filter(p => !p.isPublished).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Drafts</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {Math.round(pages.reduce((sum, p) => sum + (p.seoScore || 0), 0) / pages.length) || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Avg SEO Score</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
  );
}