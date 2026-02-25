import { useState } from "react";
import { useLocation } from "wouter";

import { useAdminCommunities } from "@/lib/community-editor";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Search, ArrowLeft, ChevronLeft, ChevronRight, MapPin, Loader2, AlertTriangle, CheckCircle, Eye, EyeOff, Star, X } from "lucide-react";

export default function CommunityList() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [county, setCounty] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("name");
  const [selectedCommunities, setSelectedCommunities] = useState<string[]>([]);
  const { toast } = useToast();

  const { data, isLoading } = useAdminCommunities(search, filter, page, county);

  const communities = data?.communities || [];
  const pagination = data?.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 };
  const counties = data?.counties || [];

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // ── SEO Status Checker ────────────────────────────
  const getSeoStatus = (community: any) => {
    const issues: string[] = [];
    
    if (!community.metaTitle) issues.push("Missing title");
    else if (community.metaTitle.length > 60) issues.push("Title too long");
    
    if (!community.metaDescription) issues.push("Missing description");
    else if (community.metaDescription.length > 160) issues.push("Description too long");
    
    if (!community.focusKeyword) issues.push("Missing focus keyword");
    if (!community.description || community.description.length < 100) issues.push("Content too short");
    
    return {
      score: issues.length === 0 ? 100 : Math.max(0, 100 - (issues.length * 25)),
      issues,
      status: issues.length === 0 ? 'good' : issues.length <= 2 ? 'warning' : 'poor'
    };
  };

  // ── Bulk Actions ──────────────────────────────────
  const handleSelectCommunity = (slug: string, checked: boolean) => {
    setSelectedCommunities(prev => 
      checked 
        ? [...prev, slug]
        : prev.filter(s => s !== slug)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCommunities(communities.map(c => c.slug));
    } else {
      setSelectedCommunities([]);
    }
  };

  const handleBulkPublish = async (publish: boolean) => {
    if (selectedCommunities.length === 0) return;
    
    try {
      const action = publish ? 'publish' : 'unpublish';
      const promises = selectedCommunities.map(slug => 
        fetch(`/api/admin/communities/${slug}/publish`, {
          method: 'POST',
          credentials: 'include',
        })
      );
      
      await Promise.all(promises);
      
      toast({
        title: `Communities ${action}ed`,
        description: `${selectedCommunities.length} communities ${action}ed successfully`,
      });
      
      setSelectedCommunities([]);
      // Refetch data would be nice here, but we don't have access to refetch
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update communities',
        variant: 'destructive',
      });
    }
  };

  return (
    
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Communities</h1>
            <p className="text-sm text-muted-foreground">
              Manage community page content for the website
            </p>
          </div>
          {pagination.total > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {Number(pagination.total).toLocaleString()} communities
            </Badge>
          )}
        </div>

        {/* Filters & Bulk Actions */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, slug, or county..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
              <Select
                value={filter}
                onValueChange={(v) => {
                  setFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={county || "all"}
                onValueChange={(v) => {
                  setCounty(v === "all" ? "" : v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="County" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Counties</SelectItem>
                  {counties.map((c) => (
                    <SelectItem key={c} value={c!}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={sortBy}
                onValueChange={setSortBy}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name A-Z</SelectItem>
                  <SelectItem value="updated">Last Updated</SelectItem>
                  <SelectItem value="seo_score">SEO Score</SelectItem>
                  <SelectItem value="published">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bulk Actions Bar */}
            {selectedCommunities.length > 0 && (
              <div className="border rounded-lg p-3 bg-blue-50 dark:bg-blue-950/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">
                      {selectedCommunities.length} selected
                    </Badge>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkPublish(true)}
                        className="text-green-600 border-green-600 hover:bg-green-50"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Publish All
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkPublish(false)}
                        className="text-gray-600 border-gray-600 hover:bg-gray-50"
                      >
                        <EyeOff className="h-4 w-4 mr-1" />
                        Unpublish All
                      </Button>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCommunities([])}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : communities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <MapPin className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-lg font-medium">No communities found</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedCommunities.length === communities.length && communities.length > 0}
                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                      />
                    </TableHead>
                    <TableHead className="w-[35%]">Name</TableHead>
                    <TableHead>County</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>SEO</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {communities.map((c) => {
                    const seoStatus = getSeoStatus(c);
                    return (
                      <TableRow key={c.slug}>
                        <TableCell 
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={selectedCommunities.includes(c.slug)}
                            onCheckedChange={(checked) => handleSelectCommunity(c.slug, !!checked)}
                          />
                        </TableCell>
                        <TableCell
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setLocation(`/admin/communities/${c.slug}`)}
                        >
                          <div className="flex items-center gap-3">
                            <div>
                              <span className="font-medium">{c.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">/{c.slug}</span>
                              {c.featured && (
                                <Star className="inline h-3 w-3 text-yellow-500 ml-2" />
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell 
                          className="text-muted-foreground cursor-pointer hover:bg-muted/50"
                          onClick={() => setLocation(`/admin/communities/${c.slug}`)}
                        >
                          {c.county || "—"}
                        </TableCell>
                        <TableCell 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setLocation(`/admin/communities/${c.slug}`)}
                        >
                          {c.published ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              <Eye className="h-3 w-3 mr-1" />
                              Published
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <EyeOff className="h-3 w-3 mr-1" />
                              Draft
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setLocation(`/admin/communities/${c.slug}`)}
                        >
                          <div className="flex items-center gap-2">
                            {seoStatus.status === 'good' ? (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Good ({seoStatus.score})
                              </Badge>
                            ) : seoStatus.status === 'warning' ? (
                              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Needs Work ({seoStatus.score})
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Poor ({seoStatus.score})
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell 
                          className="text-muted-foreground text-sm cursor-pointer hover:bg-muted/50"
                          onClick={() => setLocation(`/admin/communities/${c.slug}`)}
                        >
                          {formatDate(c.updatedAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages} ({Number(pagination.total).toLocaleString()} total)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    
  );
}
