import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout";
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
import { 
  Search, 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  Eye, 
  EyeOff, 
  MessageSquare,
  UserCheck,
  X,
  Loader2,
  Plus,
  ThumbsUp,
  ThumbsDown,
  Award,
  AwardOff,
  Trash2,
  RefreshCw,
} from "lucide-react";

interface Testimonial {
  id: string;
  reviewerName: string;
  reviewerLocation: string | null;
  reviewText: string;
  rating: number;
  source: string;
  sourceUrl: string | null;
  agentId: string | null;
  communitySlug: string | null;
  photoUrl: string | null;
  isApproved: boolean;
  isFeatured: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface TestimonialsResponse {
  testimonials: Testimonial[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function TestimonialList() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const [status, setStatus] = useState("all");
  const [rating, setRating] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedTestimonials, setSelectedTestimonials] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<TestimonialsResponse>({
    queryKey: ["/api/admin/testimonials", { search, source, status, rating, page }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "25",
        ...(search && { search }),
        ...(source !== "all" && { source }),
        ...(status !== "all" && { status }),
        ...(rating !== "all" && { rating }),
      });
      
      const response = await fetch(`/api/admin/testimonials?${params}`, {
        credentials: "include",
      });
      
      if (!response.ok) throw new Error("Failed to fetch testimonials");
      return response.json();
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async ({ ids, approved }: { ids: string[]; approved: boolean }) => {
      const response = await fetch("/api/admin/testimonials/bulk-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids, approved }),
      });
      
      if (!response.ok) throw new Error("Failed to update testimonials");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/testimonials"] });
      setSelectedTestimonials([]);
      toast({ title: "Success", description: "Testimonials updated successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const bulkFeatureMutation = useMutation({
    mutationFn: async ({ ids, featured }: { ids: string[]; featured: boolean }) => {
      const response = await fetch("/api/admin/testimonials/bulk-feature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids, featured }),
      });
      
      if (!response.ok) throw new Error("Failed to update testimonials");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/testimonials"] });
      setSelectedTestimonials([]);
      toast({ title: "Success", description: "Testimonials updated successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const deleteTestimonialMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/testimonials/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (!response.ok) throw new Error("Failed to delete testimonial");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/testimonials"] });
      toast({ title: "Success", description: "Testimonial deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const testimonials = data?.testimonials || [];
  const pagination = data?.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 };

  const handleSelectTestimonial = (id: string, checked: boolean) => {
    setSelectedTestimonials(prev => 
      checked 
        ? [...prev, id]
        : prev.filter(tid => tid !== id)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTestimonials(testimonials.map(t => t.id));
    } else {
      setSelectedTestimonials([]);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? "text-yellow-400 fill-current" : "text-gray-300"
        }`}
      />
    ));
  };

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case "google":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "zillow":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "facebook":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Modern Header */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setLocation("/admin")}
                  className="hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-6 w-6 text-blue-600" />
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Testimonials & Reviews
                    </h1>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Manage customer testimonials and reviews across all platforms
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge 
                  variant="secondary" 
                  className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                >
                  {Number(pagination.total).toLocaleString()} total
                </Badge>
                <Button 
                  onClick={() => setLocation("/admin/testimonials/new")}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Testimonial
                </Button>
              </div>
            </div>
          </div>

          {/* Modern Filters */}
          <Card className="mb-6 border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search testimonials..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="pl-9 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                
                <Select value={source} onValueChange={(v) => { setSource(v); setPage(1); }}>
                  <SelectTrigger className="border-gray-200 focus:border-blue-500">
                    <SelectValue placeholder="All Sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="zillow">Zillow</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                  <SelectTrigger className="border-gray-200 focus:border-blue-500">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={rating} onValueChange={(v) => { setRating(v); setPage(1); }}>
                  <SelectTrigger className="border-gray-200 focus:border-blue-500">
                    <SelectValue placeholder="All Ratings" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="5">5 Stars</SelectItem>
                    <SelectItem value="4">4 Stars</SelectItem>
                    <SelectItem value="3">3 Stars</SelectItem>
                    <SelectItem value="2">2 Stars</SelectItem>
                    <SelectItem value="1">1 Star</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline" 
                  onClick={() => setLocation("/admin/testimonials/sources")}
                  className="justify-center"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Review Sources
                </Button>
              </div>

              {/* Bulk Actions Bar */}
              {selectedTestimonials.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400">
                        {selectedTestimonials.length} selected
                      </Badge>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => bulkApproveMutation.mutate({ 
                            ids: selectedTestimonials, 
                            approved: true 
                          })}
                          className="border-green-300 text-green-700 hover:bg-green-50"
                          disabled={bulkApproveMutation.isPending}
                        >
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => bulkApproveMutation.mutate({ 
                            ids: selectedTestimonials, 
                            approved: false 
                          })}
                          className="border-red-300 text-red-700 hover:bg-red-50"
                          disabled={bulkApproveMutation.isPending}
                        >
                          <ThumbsDown className="h-4 w-4 mr-1" />
                          Unapprove
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => bulkFeatureMutation.mutate({ 
                            ids: selectedTestimonials, 
                            featured: true 
                          })}
                          className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                          disabled={bulkFeatureMutation.isPending}
                        >
                          <Award className="h-4 w-4 mr-1" />
                          Feature
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => bulkFeatureMutation.mutate({ 
                            ids: selectedTestimonials, 
                            featured: false 
                          })}
                          className="border-gray-300 text-gray-700 hover:bg-gray-50"
                          disabled={bulkFeatureMutation.isPending}
                        >
                          <AwardOff className="h-4 w-4 mr-1" />
                          Unfeature
                        </Button>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTestimonials([])}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Modern Table */}
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : testimonials.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                  <MessageSquare className="h-12 w-12 mb-4 opacity-40" />
                  <p className="text-lg font-medium">No testimonials found</p>
                  <p className="text-sm">Try adjusting your search or filters</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-gray-50 dark:bg-gray-800">
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={
                            selectedTestimonials.length === testimonials.length && 
                            testimonials.length > 0
                          }
                          onCheckedChange={(checked) => handleSelectAll(!!checked)}
                        />
                      </TableHead>
                      <TableHead className="font-semibold">Reviewer</TableHead>
                      <TableHead className="font-semibold">Review</TableHead>
                      <TableHead className="font-semibold">Rating</TableHead>
                      <TableHead className="font-semibold">Source</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testimonials.map((testimonial) => (
                      <TableRow 
                        key={testimonial.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedTestimonials.includes(testimonial.id)}
                            onCheckedChange={(checked) => 
                              handleSelectTestimonial(testimonial.id, !!checked)
                            }
                          />
                        </TableCell>
                        <TableCell 
                          className="cursor-pointer"
                          onClick={() => setLocation(`/admin/testimonials/${testimonial.id}`)}
                        >
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {testimonial.reviewerName}
                            </div>
                            {testimonial.reviewerLocation && (
                              <div className="text-sm text-gray-500">
                                {testimonial.reviewerLocation}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell 
                          className="cursor-pointer max-w-md"
                          onClick={() => setLocation(`/admin/testimonials/${testimonial.id}`)}
                        >
                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                            {testimonial.reviewText}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {renderStars(testimonial.rating)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={`capitalize ${getSourceBadgeColor(testimonial.source)}`}
                          >
                            {testimonial.source}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {testimonial.isApproved ? (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 w-fit">
                                <Eye className="h-3 w-3 mr-1" />
                                Approved
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="w-fit">
                                <EyeOff className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                            {testimonial.isFeatured && (
                              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 w-fit">
                                <Star className="h-3 w-3 mr-1" />
                                Featured
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(testimonial.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLocation(`/admin/testimonials/${testimonial.id}`);
                              }}
                              className="h-8 w-8"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Are you sure you want to delete this testimonial?")) {
                                  deleteTestimonialMutation.mutate(testimonial.id);
                                }
                              }}
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Modern Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 px-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Page {pagination.page} of {pagination.totalPages} 
                ({Number(pagination.total).toLocaleString()} total testimonials)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="border-gray-300"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                  className="border-gray-300"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}