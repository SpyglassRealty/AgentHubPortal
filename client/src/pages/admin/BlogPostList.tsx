import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Calendar,
  User,
  BarChart,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  status: 'draft' | 'published' | 'scheduled';
  publishedAt?: string;
  authorId: string;
  authorName: string;
  categoryIds: string[];
  tags: string[];
  viewCount: number;
  readingTime?: number;
  seoScore?: number;
  seoIssues?: string[];
  createdAt: string;
  updatedAt: string;
}

interface BlogAuthor {
  id: string;
  name: string;
  email?: string;
}

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  postCount: number;
}

interface BlogPostsResponse {
  posts: BlogPost[];
}

interface BlogAuthorsResponse {
  authors: BlogAuthor[];
}

interface BlogCategoriesResponse {
  categories: BlogCategory[];
}

// ── Utility Functions ──────────────────────────────────────────────────

function getSeoStatus(post: BlogPost): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  const score = post.seoScore || 0;
  const issues = post.seoIssues || [];
  
  if (score >= 80 && issues.length === 0) {
    return { label: 'Excellent', variant: 'default' };
  } else if (score >= 60) {
    return { label: 'Good', variant: 'secondary' };
  } else if (score > 0) {
    return { label: 'Needs Work', variant: 'outline' };
  } else {
    return { label: 'Not Analyzed', variant: 'destructive' };
  }
}

function getStatusConfig(status: BlogPost['status']): { 
  label: string; 
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: React.ComponentType<{ className?: string }>;
} {
  switch (status) {
    case 'published':
      return { label: 'Published', variant: 'default', icon: CheckCircle };
    case 'draft':
      return { label: 'Draft', variant: 'secondary', icon: FileText };
    case 'scheduled':
      return { label: 'Scheduled', variant: 'outline', icon: Clock };
    default:
      return { label: 'Unknown', variant: 'destructive', icon: AlertTriangle };
  }
}

// ── Component ──────────────────────────────────────────────────────────

export default function BlogPostList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // ── Local State ────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [authorFilter, setAuthorFilter] = useState("all");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);
  
  // ── Data Queries ───────────────────────────────────────────────────
  const { data: postsData, isLoading: postsLoading } = useQuery<BlogPostsResponse>({
    queryKey: ["/api/admin/blog/posts", search, statusFilter, categoryFilter, authorFilter, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (authorFilter !== 'all') params.append('author', authorFilter);
      params.append('sortBy', sortBy);
      params.append('order', sortOrder);
      
      const res = await fetch(`/api/admin/blog/posts?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch blog posts");
      return res.json();
    },
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

  // ── Mutations ──────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (slug: string) => {
      const res = await fetch(`/api/admin/blog/posts/${slug}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete blog post");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/posts"] });
      toast({ title: "Blog post deleted successfully" });
      setDeleteDialogOpen(false);
      setPostToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // ── Event Handlers ─────────────────────────────────────────────────
  const handleDelete = (post: BlogPost) => {
    setPostToDelete(post);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (postToDelete) {
      deleteMutation.mutate(postToDelete.slug);
    }
  };

  // ── Computed Values ────────────────────────────────────────────────
  const posts = postsData?.posts || [];
  const authors = authorsData?.authors || [];
  const categories = categoriesData?.categories || [];

  // Stats calculations
  const totalPosts = posts.length;
  const publishedPosts = posts.filter(p => p.status === 'published').length;
  const draftPosts = posts.filter(p => p.status === 'draft').length;
  const totalViews = posts.reduce((sum, p) => sum + (p.viewCount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Blog Posts</h1>
            <p className="text-muted-foreground mt-1">
              Manage your blog content and SEO optimization
            </p>
          </div>
          <Link href="/admin/blog/posts/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Post
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalPosts}</p>
                  <p className="text-xs text-muted-foreground">Total Posts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{publishedPosts}</p>
                  <p className="text-xs text-muted-foreground">Published</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                  <FileText className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{draftPosts}</p>
                  <p className="text-xs text-muted-foreground">Drafts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalViews.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Views</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search posts..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={authorFilter} onValueChange={setAuthorFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Author" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Authors</SelectItem>
                    {authors.map((author) => (
                      <SelectItem key={author.id} value={author.id}>
                        {author.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updatedAt">Updated</SelectItem>
                    <SelectItem value="publishedAt">Published</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="viewCount">Views</SelectItem>
                    <SelectItem value="seoScore">SEO Score</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Posts Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>SEO</TableHead>
                    <TableHead className="text-center">Views</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {postsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : posts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="text-muted-foreground">
                          {search || statusFilter !== 'all' || categoryFilter !== 'all' || authorFilter !== 'all'
                            ? "No posts match your filters"
                            : "No blog posts yet"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    posts.map((post) => {
                      const statusConfig = getStatusConfig(post.status);
                      const seoStatus = getSeoStatus(post);
                      const StatusIcon = statusConfig.icon;
                      
                      return (
    <TableRow key={post.id}>
                          <TableCell>
                            <div>
                              <Link href={`/admin/blog/posts/${post.slug}`}>
                                <p className="font-medium text-foreground hover:text-primary cursor-pointer">
                                  {post.title}
                                </p>
                              </Link>
                              {post.excerpt && (
                                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                  {post.excerpt}
                                </p>
                              )}
                              {post.tags.length > 0 && (
                                <div className="flex gap-1 mt-1">
                                  {post.tags.slice(0, 3).map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {post.tags.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{post.tags.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <Badge variant={statusConfig.variant} className="gap-1">
                              <StatusIcon className="h-3 w-3" />
                              {statusConfig.label}
                            </Badge>
                            {post.publishedAt && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(post.publishedAt).toLocaleDateString()}
                              </p>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{post.authorName}</span>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <Badge variant={seoStatus.variant}>
                              {seoStatus.label}
                            </Badge>
                            {post.seoScore && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Score: {post.seoScore}/100
                              </p>
                            )}
                          </TableCell>
                          
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Eye className="h-4 w-4 text-muted-foreground" />
                              <span>{post.viewCount || 0}</span>
                            </div>
                            {post.readingTime && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {post.readingTime} min read
                              </p>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            <p className="text-sm">
                              {new Date(post.updatedAt).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(post.updatedAt).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </TableCell>
                          
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <Link href={`/admin/blog/posts/${post.slug}`}>
                                  <DropdownMenuItem>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Post
                                  </DropdownMenuItem>
                                </Link>
                                {post.status === 'published' && (
                                  <DropdownMenuItem
                                    onClick={() => window.open(`/blog/${post.slug}`, '_blank')}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Live
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(post)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
  );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Blog Post</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{postToDelete?.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  );
}