import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  RefreshCw,
  Plus,
  Settings,
  Loader2,
  Clock,
  Check,
  X,
  AlertCircle,
  ExternalLink,
  Trash2,
  RefreshCw as Sync,
} from "lucide-react";

interface ReviewSource {
  id: string;
  platform: string;
  placeId: string | null;
  apiKey: string | null;
  lastSyncedAt: string | null;
  isActive: boolean;
  createdAt: string;
}

interface ReviewSourcesResponse {
  sources: ReviewSource[];
}

export default function ReviewSourceManager() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<ReviewSource | null>(null);
  const [formData, setFormData] = useState({
    platform: "",
    placeId: "",
    apiKey: "",
    isActive: true,
  });

  const { data: sourcesData, isLoading } = useQuery<ReviewSourcesResponse>({
    queryKey: ["/api/admin/review-sources"],
    queryFn: async () => {
      const response = await fetch("/api/admin/review-sources", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch review sources");
      return response.json();
    },
  });

  const createSourceMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/admin/review-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          placeId: data.placeId || undefined,
          apiKey: data.apiKey || undefined,
        }),
      });
      if (!response.ok) throw new Error("Failed to create review source");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/review-sources"] });
      toast({ title: "Success", description: "Review source created successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const updateSourceMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<typeof formData> }) => {
      const response = await fetch(`/api/admin/review-sources/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...data.updates,
          placeId: data.updates.placeId || undefined,
          apiKey: data.updates.apiKey || undefined,
        }),
      });
      if (!response.ok) throw new Error("Failed to update review source");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/review-sources"] });
      toast({ title: "Success", description: "Review source updated successfully" });
      setIsDialogOpen(false);
      setEditingSource(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const deleteSourceMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/review-sources/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete review source");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/review-sources"] });
      toast({ title: "Success", description: "Review source deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const syncSourceMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/review-sources/${id}/sync`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to sync review source");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/review-sources"] });
      toast({ 
        title: "Sync Initiated", 
        description: `Review sync started for ${data.platform}` 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const sources = sourcesData?.sources || [];

  const resetForm = () => {
    setFormData({
      platform: "",
      placeId: "",
      apiKey: "",
      isActive: true,
    });
    setEditingSource(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (source: ReviewSource) => {
    setFormData({
      platform: source.platform,
      placeId: source.placeId || "",
      apiKey: source.apiKey || "",
      isActive: source.isActive,
    });
    setEditingSource(source);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingSource) {
      updateSourceMutation.mutate({ 
        id: editingSource.id, 
        updates: formData 
      });
    } else {
      createSourceMutation.mutate(formData);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "google":
        return "🔍";
      case "zillow":
        return "🏠";
      case "facebook":
        return "📘";
      default:
        return "⭐";
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-6 py-8">
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
                    <RefreshCw className="h-6 w-6 text-blue-600" />
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Review Sources
                    </h1>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Configure and manage external review source integrations
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge 
                  variant="secondary" 
                  className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                >
                  {sources.length} sources
                </Badge>
                <Button 
                  onClick={openCreateDialog}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Source
                </Button>
              </div>
            </div>
          </div>

          {/* Sources Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {sources.map((source) => (
              <Card key={source.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getPlatformIcon(source.platform)}</span>
                      <div>
                        <CardTitle className="text-lg capitalize">
                          {source.platform} Reviews
                        </CardTitle>
                        <Badge className={`mt-1 capitalize ${getPlatformColor(source.platform)}`}>
                          {source.platform}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {source.isActive ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          <Check className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <X className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {source.placeId && (
                    <div>
                      <Label className="text-xs text-gray-500">Place ID</Label>
                      <p className="text-sm font-mono bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs">
                        {source.placeId}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <Label className="text-xs text-gray-500">Last Synced</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="text-sm">
                        {source.lastSyncedAt 
                          ? new Date(source.lastSyncedAt).toLocaleString()
                          : "Never"
                        }
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => syncSourceMutation.mutate(source.id)}
                      disabled={!source.isActive || syncSourceMutation.isPending}
                      className="flex-1"
                    >
                      {syncSourceMutation.isPending ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Sync className="h-3 w-3 mr-1" />
                      )}
                      Sync
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(source)}
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this review source?")) {
                          deleteSourceMutation.mutate(source.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Setup Instructions */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                Setup Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    🔍 Google Reviews
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Requires Google Places API key and Place ID from Google My Business.
                  </p>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="p-0 h-auto text-blue-600"
                    onClick={() => window.open("https://developers.google.com/places/web-service/get-api-key", "_blank")}
                  >
                    Get API Key <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    🏠 Zillow Reviews  
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Zillow reviews are typically imported manually or via web scraping.
                  </p>
                  <p className="text-xs text-gray-500">
                    No API key required for manual import
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    📘 Facebook Reviews
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Requires Facebook Page Access Token from Facebook Developers.
                  </p>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="p-0 h-auto text-blue-600"
                    onClick={() => window.open("https://developers.facebook.com/tools/explorer/", "_blank")}
                  >
                    Get Access Token <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Create/Edit Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingSource ? "Edit Review Source" : "Add Review Source"}
                </DialogTitle>
                <DialogDescription>
                  Configure a new review source integration to automatically sync reviews.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="platform">Platform *</Label>
                  <Select
                    value={formData.platform}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, platform: value }))}
                    disabled={!!editingSource}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a platform..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google">Google Reviews</SelectItem>
                      <SelectItem value="zillow">Zillow</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.platform === "google" && (
                  <div>
                    <Label htmlFor="placeId">Google Place ID</Label>
                    <Input
                      id="placeId"
                      value={formData.placeId}
                      onChange={(e) => setFormData(prev => ({ ...prev, placeId: e.target.value }))}
                      className="mt-1"
                      placeholder="ChIJ..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Find your Place ID in Google My Business or using the Place ID Finder
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={formData.apiKey}
                    onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                    className="mt-1"
                    placeholder="Enter API key..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.platform === "google" && "Google Places API key"}
                    {formData.platform === "facebook" && "Facebook Page Access Token"}
                    {formData.platform === "zillow" && "Optional: Not typically required"}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="isActive">Active</Label>
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    type="submit" 
                    className="flex-1"
                    disabled={createSourceMutation.isPending || updateSourceMutation.isPending}
                  >
                    {(createSourceMutation.isPending || updateSourceMutation.isPending) ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    {editingSource ? "Update Source" : "Create Source"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
  );
}