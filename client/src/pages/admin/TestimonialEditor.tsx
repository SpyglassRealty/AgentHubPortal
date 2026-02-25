import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Star, 
  Loader2,
  Save,
  MessageSquare,
  User,
  MapPin,
  Link,
  Image,
  Award,
  Eye,
  AlertCircle,
} from "lucide-react";

// Form validation schema
const testimonialSchema = z.object({
  reviewerName: z.string().min(1, "Reviewer name is required"),
  reviewerLocation: z.string().optional(),
  reviewText: z.string().min(10, "Review text must be at least 10 characters"),
  rating: z.number().int().min(1).max(5),
  source: z.enum(['google', 'zillow', 'facebook', 'manual']),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  agentId: z.string().optional().or(z.literal("")),
  communitySlug: z.string().optional().or(z.literal("")),
  photoUrl: z.string().url().optional().or(z.literal("")),
  isApproved: z.boolean(),
  isFeatured: z.boolean(),
  displayOrder: z.number().int(),
});

type TestimonialFormData = z.infer<typeof testimonialSchema>;

interface Agent {
  id: string;
  name: string;
}

interface Community {
  slug: string;
  name: string;
}

interface OptionsResponse {
  agents: Agent[];
  communities: Community[];
}

interface Testimonial extends TestimonialFormData {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export default function TestimonialEditor({ params }: { params: { id: string } }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isNew = params.id === "new";
  
  const [formData, setFormData] = useState<TestimonialFormData>({
    reviewerName: "",
    reviewerLocation: "",
    reviewText: "",
    rating: 5,
    source: "manual",
    sourceUrl: "",
    agentId: "none",
    communitySlug: "none",
    photoUrl: "",
    isApproved: false,
    isFeatured: false,
    displayOrder: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch existing testimonial if editing
  const { data: testimonial, isLoading: testimonialLoading } = useQuery<Testimonial>({
    queryKey: ["/api/admin/testimonials", params.id],
    queryFn: async () => {
      const response = await fetch(`/api/admin/testimonials/${params.id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch testimonial");
      return response.json();
    },
    enabled: !isNew,
  });

  // Fetch dropdown options
  const { data: options } = useQuery<OptionsResponse>({
    queryKey: ["/api/admin/testimonials/options"],
    queryFn: async () => {
      const response = await fetch("/api/admin/testimonials/options", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch options");
      return response.json();
    },
  });

  // Initialize form data when testimonial is loaded
  useEffect(() => {
    if (testimonial && !isNew) {
      setFormData({
        reviewerName: testimonial.reviewerName,
        reviewerLocation: testimonial.reviewerLocation || "",
        reviewText: testimonial.reviewText,
        rating: testimonial.rating,
        source: testimonial.source,
        sourceUrl: testimonial.sourceUrl || "",
        agentId: testimonial.agentId || "none",
        communitySlug: testimonial.communitySlug || "none",
        photoUrl: testimonial.photoUrl || "",
        isApproved: testimonial.isApproved,
        isFeatured: testimonial.isFeatured,
        displayOrder: testimonial.displayOrder,
      });
    }
  }, [testimonial, isNew]);

  const saveMutation = useMutation({
    mutationFn: async (data: TestimonialFormData) => {
      const url = isNew 
        ? "/api/admin/testimonials"
        : `/api/admin/testimonials/${params.id}`;
      
      // Transform "none" values back to empty strings for API
      const apiData = {
        ...data,
        agentId: data.agentId === "none" ? "" : data.agentId,
        communitySlug: data.communitySlug === "none" ? "" : data.communitySlug,
      };
      
      const response = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(apiData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save testimonial");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/testimonials"] });
      toast({ 
        title: "Success", 
        description: `Testimonial ${isNew ? "created" : "updated"} successfully` 
      });
      setLocation("/admin/testimonials");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const validateForm = (): boolean => {
    try {
      testimonialSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      saveMutation.mutate(formData);
    }
  };

  const updateFormData = (field: keyof TestimonialFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const renderStarSelector = () => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => updateFormData("rating", star)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <Star
              className={`h-6 w-6 transition-colors ${
                star <= formData.rating
                  ? "text-yellow-400 fill-current"
                  : "text-gray-300 hover:text-yellow-200"
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (!isNew && testimonialLoading) {
    return (
      
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      
    );
  }

  return (
    
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Modern Header */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setLocation("/admin/testimonials")}
                  className="hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-6 w-6 text-blue-600" />
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {isNew ? "Add New Testimonial" : "Edit Testimonial"}
                    </h1>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {isNew 
                      ? "Create a new customer testimonial or review"
                      : "Update testimonial information and settings"
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Reviewer Information */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="h-5 w-5 text-blue-600" />
                      Reviewer Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="reviewerName" className="text-sm font-medium">
                        Reviewer Name *
                      </Label>
                      <Input
                        id="reviewerName"
                        value={formData.reviewerName}
                        onChange={(e) => updateFormData("reviewerName", e.target.value)}
                        className={`mt-1 ${errors.reviewerName ? "border-red-500" : "border-gray-200"}`}
                        placeholder="Enter reviewer's full name"
                      />
                      {errors.reviewerName && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.reviewerName}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="reviewerLocation" className="text-sm font-medium">
                        Location
                      </Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="reviewerLocation"
                          value={formData.reviewerLocation}
                          onChange={(e) => updateFormData("reviewerLocation", e.target.value)}
                          className="pl-9 mt-1 border-gray-200"
                          placeholder="Austin, TX"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="photoUrl" className="text-sm font-medium">
                        Photo URL
                      </Label>
                      <div className="relative">
                        <Image className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="photoUrl"
                          value={formData.photoUrl}
                          onChange={(e) => updateFormData("photoUrl", e.target.value)}
                          className="pl-9 mt-1 border-gray-200"
                          placeholder="https://example.com/photo.jpg"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Review Content */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <MessageSquare className="h-5 w-5 text-blue-600" />
                      Review Content
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="reviewText" className="text-sm font-medium">
                        Review Text *
                      </Label>
                      <Textarea
                        id="reviewText"
                        value={formData.reviewText}
                        onChange={(e) => updateFormData("reviewText", e.target.value)}
                        className={`mt-1 min-h-[120px] ${errors.reviewText ? "border-red-500" : "border-gray-200"}`}
                        placeholder="Enter the full review text..."
                      />
                      {errors.reviewText && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.reviewText}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Rating *</Label>
                      <div className="mt-2">
                        {renderStarSelector()}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Source Information */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Link className="h-5 w-5 text-blue-600" />
                      Source Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="source" className="text-sm font-medium">
                        Review Source *
                      </Label>
                      <Select
                        value={formData.source}
                        onValueChange={(value) => updateFormData("source", value)}
                      >
                        <SelectTrigger className="mt-1 border-gray-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="google">Google Reviews</SelectItem>
                          <SelectItem value="zillow">Zillow</SelectItem>
                          <SelectItem value="facebook">Facebook</SelectItem>
                          <SelectItem value="manual">Manual Entry</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="sourceUrl" className="text-sm font-medium">
                        Source URL
                      </Label>
                      <Input
                        id="sourceUrl"
                        value={formData.sourceUrl}
                        onChange={(e) => updateFormData("sourceUrl", e.target.value)}
                        className="mt-1 border-gray-200"
                        placeholder="https://..."
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Actions */}
                <Card className="border-0 shadow-sm">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={saveMutation.isPending}
                      >
                        {saveMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        {isNew ? "Create Testimonial" : "Update Testimonial"}
                      </Button>
                      
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => setLocation("/admin/testimonials")}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Status Settings */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Eye className="h-5 w-5 text-blue-600" />
                      Visibility
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="isApproved" className="text-sm font-medium">
                        Approved
                      </Label>
                      <Switch
                        id="isApproved"
                        checked={formData.isApproved}
                        onCheckedChange={(checked) => updateFormData("isApproved", checked)}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Approved testimonials appear on the public website
                    </p>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <Label htmlFor="isFeatured" className="text-sm font-medium">
                        Featured
                      </Label>
                      <Switch
                        id="isFeatured"
                        checked={formData.isFeatured}
                        onCheckedChange={(checked) => updateFormData("isFeatured", checked)}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Featured testimonials appear at the top of listings
                    </p>

                    <Separator />

                    <div>
                      <Label htmlFor="displayOrder" className="text-sm font-medium">
                        Display Order
                      </Label>
                      <Input
                        id="displayOrder"
                        type="number"
                        value={formData.displayOrder}
                        onChange={(e) => updateFormData("displayOrder", parseInt(e.target.value) || 0)}
                        className="mt-1 border-gray-200"
                        placeholder="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Lower numbers appear first
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Associations */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Award className="h-5 w-5 text-blue-600" />
                      Associations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="agentId" className="text-sm font-medium">
                        Linked Agent
                      </Label>
                      <Select
                        value={formData.agentId}
                        onValueChange={(value) => updateFormData("agentId", value)}
                      >
                        <SelectTrigger className="mt-1 border-gray-200">
                          <SelectValue placeholder="Select an agent..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No agent</SelectItem>
                          {options?.agents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="communitySlug" className="text-sm font-medium">
                        Linked Community
                      </Label>
                      <Select
                        value={formData.communitySlug}
                        onValueChange={(value) => updateFormData("communitySlug", value)}
                      >
                        <SelectTrigger className="mt-1 border-gray-200">
                          <SelectValue placeholder="Select a community..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No community</SelectItem>
                          {options?.communities.map((community) => (
                            <SelectItem key={community.slug} value={community.slug}>
                              {community.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </div>
      </div>
    
  );
}