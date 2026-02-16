import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  PenTool,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  ArrowUpDown,
  ChevronLeft,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import type { CmsPage } from "./types";

export default function CmsContentList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const queryParams = new URLSearchParams();
  if (typeFilter !== "all") queryParams.set("type", typeFilter);
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  if (search) queryParams.set("search", search);
  queryParams.set("sort", sortField);
  queryParams.set("order", sortOrder);

  const { data: pages, isLoading } = useQuery<CmsPage[]>({
    queryKey: [`/api/cms/pages?${queryParams.toString()}`],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/cms/pages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/pages"] });
      toast({ title: "Page deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete page", variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/cms/pages/${id}/publish`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/pages"] });
      toast({ title: "Page published" });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/cms/pages/${id}/unpublish`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/pages"] });
      toast({ title: "Page unpublished" });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: async ({ ids, action }: { ids: string[]; action: string }) => {
      await apiRequest("POST", "/api/cms/pages/bulk", { ids, action });
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/pages"] });
      setSelectedIds(new Set());
      toast({ title: `Bulk ${action} completed` });
    },
  });

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (pages && selectedIds.size === pages.length) {
      setSelectedIds(new Set());
    } else if (pages) {
      setSelectedIds(new Set(pages.map((p) => p.id)));
    }
  };

  const handleDelete = (id: string) => {
    setDeleteTarget(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget);
    }
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case "published":
        return "default" as const;
      case "draft":
        return "secondary" as const;
      case "unlisted":
        return "outline" as const;
      default:
        return "secondary" as const;
    }
  };

  const typeBadgeColor = (type: string) => {
    switch (type) {
      case "blog":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "community":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "landing":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  // Calculate simple SEO score
  const getSeoScore = (page: CmsPage): { score: number; color: string } => {
    let score = 0;
    if (page.metaTitle) score += 25;
    if (page.metaDescription) score += 25;
    if (page.focusKeyword) score += 25;
    if (page.excerpt) score += 15;
    if (page.featuredImageUrl) score += 10;
    
    const color = score >= 75 ? "text-green-500" : score >= 50 ? "text-yellow-500" : "text-red-500";
    return { score, color };
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/admin/cms")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">All Content</h1>
            <p className="text-sm text-muted-foreground">
              {pages?.length ?? 0} items
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setLocation("/admin/cms/editor/new?type=blog")}
          >
            <PenTool className="mr-2 h-4 w-4" />
            New Blog Post
          </Button>
          <Button onClick={() => setLocation("/admin/cms/editor/new?type=page")}>
            <Plus className="mr-2 h-4 w-4" />
            New Page
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="page">Page</SelectItem>
                <SelectItem value="blog">Blog</SelectItem>
                <SelectItem value="community">Community</SelectItem>
                <SelectItem value="landing">Landing</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="unlisted">Unlisted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t">
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} selected
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  bulkMutation.mutate({
                    ids: Array.from(selectedIds),
                    action: "publish",
                  })
                }
              >
                <Eye className="mr-1 h-3 w-3" />
                Publish
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  bulkMutation.mutate({
                    ids: Array.from(selectedIds),
                    action: "unpublish",
                  })
                }
              >
                <EyeOff className="mr-1 h-3 w-3" />
                Unpublish
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() =>
                  bulkMutation.mutate({
                    ids: Array.from(selectedIds),
                    action: "delete",
                  })
                }
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Delete
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={pages ? selectedIds.size === pages.length && pages.length > 0 : false}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort("title")}
                >
                  <span className="flex items-center gap-1">
                    Title
                    <ArrowUpDown className="h-3 w-3" />
                  </span>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort("type")}
                >
                  <span className="flex items-center gap-1">
                    Type
                    <ArrowUpDown className="h-3 w-3" />
                  </span>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>SEO</TableHead>
                <TableHead
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort("updatedAt")}
                >
                  <span className="flex items-center gap-1">
                    Last Modified
                    <ArrowUpDown className="h-3 w-3" />
                  </span>
                </TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-48" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-8" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-6" />
                    </TableCell>
                  </TableRow>
                ))
              ) : pages && pages.length > 0 ? (
                pages.map((page) => {
                  const seo = getSeoScore(page);
                  return (
                    <TableRow
                      key={page.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setLocation(`/admin/cms/editor/${page.id}`)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(page.id)}
                          onCheckedChange={() => toggleSelect(page.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{page.title}</p>
                          <p className="text-xs text-muted-foreground">/{page.slug}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs capitalize ${typeBadgeColor(page.type)}`}
                        >
                          {page.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(page.status)} className="text-xs capitalize">
                          {page.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm font-medium ${seo.color}`}>
                          {seo.score}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {page.updatedAt
                            ? formatDistanceToNow(new Date(page.updatedAt), { addSuffix: true })
                            : "—"}
                        </span>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setLocation(`/admin/cms/editor/${page.id}`)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            {page.status === "published" ? (
                              <DropdownMenuItem
                                onClick={() => unpublishMutation.mutate(page.id)}
                              >
                                <EyeOff className="mr-2 h-4 w-4" />
                                Unpublish
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => publishMutation.mutate(page.id)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Publish
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(page.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="text-muted-foreground">
                      <p className="text-lg font-medium">No content found</p>
                      <p className="text-sm">
                        {search || typeFilter !== "all" || statusFilter !== "all"
                          ? "Try adjusting your filters"
                          : "Create your first page to get started"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete page?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The page and all its content will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
