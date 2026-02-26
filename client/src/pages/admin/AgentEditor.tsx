import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { SeoPanel } from "@/components/seo/SeoPanel";
import { ImageUpload } from "@/components/editor/ImageUpload";
import {
  ArrowLeft,
  Save,
  User,
  Mail,
  Phone,
  Building2,
  Globe,
  Camera,
  Video,
  Eye,
  EyeOff,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  Heart,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import type { AgentDirectoryProfile } from "@shared/schema";

interface AgentFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  fubEmail: string;
  officeLocation: string; // Will store comma-separated values like "Austin,Houston"
  bio: string;
  professionalTitle: string;
  licenseNumber: string;
  websiteUrl: string;
  headshotUrl: string;
  socialLinks: {
    facebook: string;
    instagram: string;
    linkedin: string;
    twitter: string;
    youtube: string;
    tiktok: string;
  };
  subdomain: string;
  isVisible: boolean;
  sortOrder: number;
  metaTitle: string;
  metaDescription: string;
  indexingDirective: string;
  customSchema: object;
  videoUrl: string;
}

const defaultFormData: AgentFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  fubEmail: "",
  officeLocation: "Austin",
  bio: "",
  professionalTitle: "",
  licenseNumber: "",
  websiteUrl: "",
  headshotUrl: "",
  socialLinks: {
    facebook: "",
    instagram: "",
    linkedin: "",
    twitter: "",
    youtube: "",
    tiktok: "",
  },
  subdomain: "",
  isVisible: true,
  sortOrder: 0,
  metaTitle: "",
  metaDescription: "",
  indexingDirective: "index,follow",
  customSchema: {},
  videoUrl: "",
};

export default function AgentEditorPage() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/admin/agents/:id");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const agentId = params?.id;
  const isEditing = agentId && agentId !== "new";
  
  const [formData, setFormData] = useState<AgentFormData>(defaultFormData);
  const [previewMode, setPreviewMode] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

  // Fetch existing agent data if editing
  const { data: agentData, isLoading } = useQuery({
    queryKey: ["/api/admin/agents", agentId],
    queryFn: async () => {
      if (!isEditing) return null;
      const res = await fetch(`/api/admin/agents/${agentId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch agent");
      return res.json();
    },
    enabled: !!isEditing,
  });

  // Initialize form data when agent data is loaded
  useEffect(() => {
    if (agentData?.agent) {
      const agent: AgentDirectoryProfile = agentData.agent;
      setFormData({
        firstName: agent.firstName || "",
        lastName: agent.lastName || "",
        email: agent.email || "",
        phone: agent.phone || "",
        fubEmail: agent.fubEmail || "",
        officeLocation: agent.officeLocation || "Austin",
        bio: agent.bio || "",
        professionalTitle: agent.professionalTitle || "",
        licenseNumber: agent.licenseNumber || "",
        websiteUrl: agent.websiteUrl || "",
        headshotUrl: agent.headshotUrl || "",
        socialLinks: agent.socialLinks || defaultFormData.socialLinks,
        subdomain: agent.subdomain || "",
        isVisible: agent.isVisible ?? true,
        sortOrder: agent.sortOrder || 0,
        metaTitle: agent.metaTitle || "",
        metaDescription: agent.metaDescription || "",
        indexingDirective: agent.indexingDirective || "index,follow",
        customSchema: agent.customSchema || {},
        videoUrl: agent.videoUrl || "",
      });
    }
  }, [agentData]);

  // Auto-generate subdomain when name changes
  useEffect(() => {
    if (!isEditing && formData.firstName && formData.lastName) {
      const subdomain = `${formData.firstName}-${formData.lastName}`
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/--+/g, '-');
      setFormData(prev => ({ ...prev, subdomain }));
    }
  }, [formData.firstName, formData.lastName, isEditing]);

  // Auto-generate meta title when name changes
  useEffect(() => {
    if (formData.firstName && formData.lastName && !formData.metaTitle) {
      const metaTitle = `${formData.firstName} ${formData.lastName} - ${formData.professionalTitle || 'Real Estate Agent'} | Spyglass Realty`;
      setFormData(prev => ({ ...prev, metaTitle: metaTitle.slice(0, 60) }));
    }
  }, [formData.firstName, formData.lastName, formData.professionalTitle, formData.metaTitle]);

  // Save agent mutation
  const saveAgentMutation = useMutation({
    mutationFn: async (data: AgentFormData) => {
      const url = isEditing ? `/api/admin/agents/${agentId}` : "/api/admin/agents";
      const method = isEditing ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save agent");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agents"] });
      toast({
        title: isEditing ? "Agent updated" : "Agent created",
        description: `${formData.firstName} ${formData.lastName} has been saved.`,
      });
      setLocation("/admin/agents");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      toast({
        title: "Validation Error",
        description: "First name, last name, and email are required.",
        variant: "destructive",
      });
      return;
    }
    
    saveAgentMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof AgentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSocialLinkChange = (platform: keyof AgentFormData['socialLinks'], value: string) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value,
      },
    }));
  };

  const getSeoScore = () => {
    let score = 0;
    if (formData.firstName) score += 5;
    if (formData.lastName) score += 5;
    if (formData.bio && formData.bio.length >= 100) score += 15;
    if (formData.professionalTitle) score += 5;
    if (formData.headshotUrl) score += 10;
    if (formData.metaTitle) score += 15;
    if (formData.metaDescription && formData.metaDescription.length >= 120) score += 15;
    if (Object.values(formData.socialLinks).filter(Boolean).length >= 3) score += 15;
    if (formData.videoUrl) score += 5;
    if (formData.websiteUrl) score += 5;
    return Math.min(score, 100);
  };

  const getSeoScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-700";
    if (score >= 60) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  // Office location multi-select helpers
  const officeOptions = ["Austin", "Houston", "Corpus Christi"];
  
  const getSelectedOffices = (): string[] => {
    if (!formData.officeLocation) return [];
    return formData.officeLocation.split(',').filter(Boolean);
  };
  
  const handleOfficeToggle = (office: string, checked: boolean) => {
    const currentOffices = getSelectedOffices();
    let newOffices: string[];
    
    if (checked) {
      newOffices = [...currentOffices, office];
    } else {
      newOffices = currentOffices.filter(o => o !== office);
    }
    
    // Ensure at least one office is selected
    if (newOffices.length === 0) {
      toast({
        title: "Validation Error", 
        description: "At least one office location must be selected.",
        variant: "destructive",
      });
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      officeLocation: newOffices.join(',')
    }));
  };

  if (isLoading) {
    return (
    <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
  );
  }

  const seoScore = getSeoScore();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <User className="h-8 w-8 text-[#EF4923]" />
              {isEditing ? "Edit Agent" : "Add New Agent"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isEditing 
                ? `Update ${formData.firstName} ${formData.lastName}'s profile`
                : "Create a new agent profile for the directory"
              }
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setLocation("/admin/agents")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Agents
            </Button>
            {isEditing && formData.subdomain && (
              <Button
                variant="outline"
                onClick={() => window.open(`https://spyglass-idx.vercel.app/agents/${formData.subdomain}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Preview on Site
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setPreviewMode(!previewMode)}
            >
              {previewMode ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
              {previewMode ? "Edit" : "Preview"}
            </Button>
          </div>
        </div>

        <Separator />

        {/* SEO Score Banner */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className={`${getSeoScoreColor(seoScore)} text-sm font-medium px-3 py-1`}>
                  SEO Score: {seoScore}/100
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {seoScore >= 80 ? "Excellent" : seoScore >= 60 ? "Good" : "Needs improvement"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isVisible}
                  onCheckedChange={(checked) => handleInputChange("isVisible", checked)}
                />
                <span className="text-sm font-medium">
                  {formData.isVisible ? "Visible" : "Hidden"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview Mode */}
        {previewMode ? (
          <Card>
            <CardHeader>
              <CardTitle>Agent Profile Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm border p-8">
                <div className="flex items-start gap-6">
                  {formData.headshotUrl ? (
                    <img
                      src={formData.headshotUrl}
                      alt={`${formData.firstName} ${formData.lastName}`}
                      className="w-32 h-32 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-lg bg-muted flex items-center justify-center">
                      <User className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold">
                      {formData.firstName} {formData.lastName}
                    </h2>
                    {formData.professionalTitle && (
                      <p className="text-lg text-muted-foreground mt-1">
                        {formData.professionalTitle}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{formData.officeLocation} Office</span>
                    </div>
                    <div className="flex items-center gap-4 mt-4">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{formData.email}</span>
                      </div>
                      {formData.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{formData.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {formData.bio && (
                  <div className="mt-6">
                    <h3 className="font-semibold mb-2">About</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {formData.bio}
                    </p>
                  </div>
                )}
                
                {/* Social Links */}
                <div className="flex gap-4 mt-6">
                  {formData.socialLinks.facebook && (
                    <Facebook className="h-5 w-5 text-blue-600" />
                  )}
                  {formData.socialLinks.instagram && (
                    <Instagram className="h-5 w-5 text-pink-600" />
                  )}
                  {formData.socialLinks.linkedin && (
                    <Linkedin className="h-5 w-5 text-blue-700" />
                  )}
                  {formData.socialLinks.twitter && (
                    <Twitter className="h-5 w-5 text-blue-500" />
                  )}
                  {formData.socialLinks.youtube && (
                    <Youtube className="h-5 w-5 text-red-600" />
                  )}
                  {formData.socialLinks.tiktok && (
                    <Heart className="h-5 w-5 text-black" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Edit Form */
          <form onSubmit={handleSubmit}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="contact">Contact & Social</TabsTrigger>
                <TabsTrigger value="content">Content & Media</TabsTrigger>
                <TabsTrigger value="seo">SEO & Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => handleInputChange("firstName", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => handleInputChange("lastName", e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="professionalTitle">Professional Title</Label>
                        <Input
                          id="professionalTitle"
                          value={formData.professionalTitle}
                          onChange={(e) => handleInputChange("professionalTitle", e.target.value)}
                          placeholder="e.g., Senior Real Estate Advisor"
                        />
                      </div>
                      <div>
                        <Label>Office Locations *</Label>
                        <div className="space-y-3 mt-2">
                          {officeOptions.map((office) => {
                            const selectedOffices = getSelectedOffices();
                            const isChecked = selectedOffices.includes(office);
                            return (
                              <div key={office} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`office-${office}`}
                                  checked={isChecked}
                                  onCheckedChange={(checked) => handleOfficeToggle(office, !!checked)}
                                />
                                <Label 
                                  htmlFor={`office-${office}`} 
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {office}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Select all locations where this agent works
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="licenseNumber">License Number</Label>
                      <Input
                        id="licenseNumber"
                        value={formData.licenseNumber}
                        onChange={(e) => handleInputChange("licenseNumber", e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="contact" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => handleInputChange("phone", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="fubEmail">Follow Up Boss Email</Label>
                        <Input
                          id="fubEmail"
                          type="email"
                          value={formData.fubEmail}
                          onChange={(e) => handleInputChange("fubEmail", e.target.value)}
                          placeholder="For lead routing"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="websiteUrl">Personal Website</Label>
                      <Input
                        id="websiteUrl"
                        type="url"
                        value={formData.websiteUrl}
                        onChange={(e) => handleInputChange("websiteUrl", e.target.value)}
                        placeholder="https://yourwebsite.com"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Social Media Links</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="facebook">Facebook</Label>
                        <Input
                          id="facebook"
                          value={formData.socialLinks.facebook}
                          onChange={(e) => handleSocialLinkChange("facebook", e.target.value)}
                          placeholder="facebook.com/yourprofile"
                        />
                      </div>
                      <div>
                        <Label htmlFor="instagram">Instagram</Label>
                        <Input
                          id="instagram"
                          value={formData.socialLinks.instagram}
                          onChange={(e) => handleSocialLinkChange("instagram", e.target.value)}
                          placeholder="instagram.com/yourprofile"
                        />
                      </div>
                      <div>
                        <Label htmlFor="linkedin">LinkedIn</Label>
                        <Input
                          id="linkedin"
                          value={formData.socialLinks.linkedin}
                          onChange={(e) => handleSocialLinkChange("linkedin", e.target.value)}
                          placeholder="linkedin.com/in/yourprofile"
                        />
                      </div>
                      <div>
                        <Label htmlFor="twitter">Twitter/X</Label>
                        <Input
                          id="twitter"
                          value={formData.socialLinks.twitter}
                          onChange={(e) => handleSocialLinkChange("twitter", e.target.value)}
                          placeholder="x.com/yourprofile"
                        />
                      </div>
                      <div>
                        <Label htmlFor="youtube">YouTube</Label>
                        <Input
                          id="youtube"
                          value={formData.socialLinks.youtube}
                          onChange={(e) => handleSocialLinkChange("youtube", e.target.value)}
                          placeholder="youtube.com/@yourhandle"
                        />
                      </div>
                      <div>
                        <Label htmlFor="tiktok">TikTok</Label>
                        <Input
                          id="tiktok"
                          value={formData.socialLinks.tiktok}
                          onChange={(e) => handleSocialLinkChange("tiktok", e.target.value)}
                          placeholder="tiktok.com/@yourhandle"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="content" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Content</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="bio">Biography</Label>
                      <Textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) => handleInputChange("bio", e.target.value)}
                        rows={6}
                        placeholder="Tell us about yourself, your experience, and what makes you unique..."
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {formData.bio.length} characters (recommended: 300+)
                      </p>
                    </div>
                    
                    <ImageUpload
                      label="Headshot Image"
                      value={formData.headshotUrl}
                      onChange={(url) => handleInputChange("headshotUrl", url)}
                      placeholder="https://example.com/headshot.jpg"
                    />
                    <p className="text-xs text-muted-foreground">
                      Professional headshot recommended (square format works best)
                    </p>
                    
                    <div>
                      <Label htmlFor="videoUrl">Introduction Video URL</Label>
                      <Input
                        id="videoUrl"
                        type="url"
                        value={formData.videoUrl}
                        onChange={(e) => handleInputChange("videoUrl", e.target.value)}
                        placeholder="https://youtube.com/watch?v=..."
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        YouTube, Vimeo, or other video platform URL
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="seo" className="space-y-6">
                <SeoPanel
                  data={{
                    metaTitle: formData.metaTitle,
                    metaDescription: formData.metaDescription,
                    indexingDirective: formData.indexingDirective,
                    customSchema: formData.customSchema,
                  }}
                  onChange={(seoData) => {
                    setFormData(prev => ({
                      ...prev,
                      metaTitle: seoData.metaTitle || "",
                      metaDescription: seoData.metaDescription || "",
                      indexingDirective: seoData.indexingDirective || "index,follow",
                      customSchema: seoData.customSchema || {},
                    }));
                  }}
                  focusKeyword={`${formData.firstName} ${formData.lastName} ${formData.officeLocation} real estate agent`}
                  contentPreview={formData.bio}
                />

                <Card>
                  <CardHeader>
                    <CardTitle>Advanced Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="subdomain">Custom Subdomain</Label>
                      <Input
                        id="subdomain"
                        value={formData.subdomain}
                        onChange={(e) => handleInputChange("subdomain", e.target.value)}
                        placeholder="john-smith"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Will create: {formData.subdomain}.spyglassrealty.com
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="sortOrder">Sort Order</Label>
                      <Input
                        id="sortOrder"
                        type="number"
                        value={formData.sortOrder}
                        onChange={(e) => handleInputChange("sortOrder", parseInt(e.target.value) || 0)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Lower numbers appear first (0 = highest priority)
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Save Button */}
            <div className="flex justify-end gap-3 mt-8">
              <Button type="button" variant="outline" onClick={() => setLocation("/admin/agents")}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveAgentMutation.isPending}>
                {saveAgentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? "Update Agent" : "Create Agent"}
              </Button>
            </div>
          </form>
        )}
      </div>
  );
}