import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import Layout from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { TrendingUp, Link2, Link2Off, Unlink, Check, AlertCircle, Bell, Users, Calendar, Home, CheckSquare, Megaphone, Moon, Mail, Loader2, User, ExternalLink, Camera, Upload, ZoomIn, ZoomOut, Move } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  rezenYentaId?: string | null;
  fubUserId?: number | null;
}

interface AgentProfile {
  firstName?: string;
  lastName?: string;
  title?: string;
  phone?: string;
  email?: string;
  headshotUrl?: string;
  bio?: string;
}

interface NotificationSettings {
  id: string;
  userId: string;
  notificationsEnabled: boolean;
  leadAssignedEnabled: boolean;
  appointmentReminderEnabled: boolean;
  dealUpdateEnabled: boolean;
  taskDueEnabled: boolean;
  systemEnabled: boolean;
  appointmentReminderTimes: number[];
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  emailNotificationsEnabled: boolean;
  notificationEmail: string | null;
}

const defaultNotificationSettings: Partial<NotificationSettings> = {
  notificationsEnabled: false,
  leadAssignedEnabled: true,
  appointmentReminderEnabled: true,
  dealUpdateEnabled: true,
  taskDueEnabled: true,
  systemEnabled: true,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
  emailNotificationsEnabled: false,
  notificationEmail: null,
};

interface PhotoCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageFile: File | null;
  onCrop: (croppedImageData: string) => void;
  isUploading: boolean;
}

function PhotoCropModal({ isOpen, onClose, imageFile, onCrop, isUploading }: PhotoCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [imageLoaded, setImageLoaded] = useState(false);
  const [zoom, setZoom] = useState([1.0]);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  const cropSize = 200; // Size of the crop circle

  useEffect(() => {
    if (imageFile && isOpen) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (imageRef.current && e.target?.result) {
          imageRef.current.src = e.target.result as string;
        }
      };
      reader.readAsDataURL(imageFile);
    }
  }, [imageFile, isOpen]);

  const handleImageLoad = () => {
    if (imageRef.current) {
      const img = imageRef.current;
      const containerSize = cropSize * 1.5; // Make container slightly larger than crop
      
      // Calculate scale to fit image in container
      const scale = Math.min(containerSize / img.naturalWidth, containerSize / img.naturalHeight);
      const scaledWidth = img.naturalWidth * scale;
      const scaledHeight = img.naturalHeight * scale;
      
      setImageDimensions({ width: scaledWidth, height: scaledHeight });
      setPosition({ x: 0, y: 0 }); // Center the image
      setZoom([1.0]);
      setImageLoaded(true);
      drawCanvas();
    }
  };

  const drawCanvas = useCallback(() => {
    if (!canvasRef.current || !imageRef.current || !imageLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentZoom = zoom[0];
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate image dimensions
    const imgWidth = imageDimensions.width * currentZoom;
    const imgHeight = imageDimensions.height * currentZoom;
    
    // Calculate position (center crop circle)
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const imgX = centerX - imgWidth / 2 + position.x;
    const imgY = centerY - imgHeight / 2 + position.y;
    
    // Draw image
    ctx.drawImage(imageRef.current, imgX, imgY, imgWidth, imgHeight);
    
    // Draw crop overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Clear circular crop area
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(centerX, centerY, cropSize / 2, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw crop circle border
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#EF4923';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, cropSize / 2, 0, 2 * Math.PI);
    ctx.stroke();
    
  }, [zoom, position, imageDimensions, imageLoaded]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Limit drag to keep image visible in crop area
    const maxDrag = 100;
    setPosition({
      x: Math.max(-maxDrag, Math.min(maxDrag, newX)),
      y: Math.max(-maxDrag, Math.min(maxDrag, newY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomChange = (newZoom: number[]) => {
    setZoom(newZoom);
  };

  const handleApplyCrop = () => {
    console.log('[Crop Modal] Apply crop clicked');
    
    if (!canvasRef.current || !imageRef.current) {
      console.log('[Crop Modal] Missing canvas or image ref');
      return;
    }

    // Create a new canvas for the cropped result
    const cropCanvas = document.createElement('canvas');
    const cropCtx = cropCanvas.getContext('2d');
    if (!cropCtx) {
      console.log('[Crop Modal] Could not get canvas context');
      return;
    }

    const cropDiameter = 400; // High resolution output
    cropCanvas.width = cropDiameter;
    cropCanvas.height = cropDiameter;

    const currentZoom = zoom[0];
    const canvas = canvasRef.current;
    
    console.log('[Crop Modal] Crop settings:', { zoom: currentZoom, position, cropDiameter });
    
    // Calculate source crop area
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = cropSize / 2;
    
    // Calculate image position and size
    const imgWidth = imageDimensions.width * currentZoom;
    const imgHeight = imageDimensions.height * currentZoom;
    const imgX = centerX - imgWidth / 2 + position.x;
    const imgY = centerY - imgHeight / 2 + position.y;
    
    // Create clipping path for perfect circle
    cropCtx.beginPath();
    cropCtx.arc(cropDiameter / 2, cropDiameter / 2, cropDiameter / 2, 0, 2 * Math.PI);
    cropCtx.clip();
    
    // Scale factor for high-res output
    const scale = cropDiameter / (radius * 2);
    
    // Draw the cropped portion
    cropCtx.drawImage(
      imageRef.current,
      (imgX - centerX + radius) / scale * -1,
      (imgY - centerY + radius) / scale * -1,
      imgWidth / scale,
      imgHeight / scale
    );

    // Convert to base64
    const croppedImageData = cropCanvas.toDataURL('image/jpeg', 0.8);
    console.log('[Crop Modal] Cropped image data length:', croppedImageData.length);
    console.log('[Crop Modal] Cropped image data prefix:', croppedImageData.substring(0, 50));
    
    onCrop(croppedImageData);
  };

  const handleCancel = () => {
    setImageLoaded(false);
    setZoom([1.0]);
    setPosition({ x: 0, y: 0 });
    onClose();
  };

  if (!imageFile) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Adjust Profile Photo</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Image Canvas Container */}
          <div className="flex justify-center">
            <div 
              ref={containerRef}
              className="relative bg-gray-100 rounded-lg overflow-hidden"
              style={{ width: cropSize * 1.5, height: cropSize * 1.5 }}
            >
              <canvas
                ref={canvasRef}
                width={cropSize * 1.5}
                height={cropSize * 1.5}
                className="cursor-move"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
            </div>
          </div>

          {/* Hidden image for loading */}
          <img
            ref={imageRef}
            style={{ display: 'none' }}
            onLoad={handleImageLoad}
            alt="Crop preview"
          />

          {/* Zoom Controls */}
          {imageLoaded && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <ZoomOut className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <Slider
                    value={zoom}
                    onValueChange={handleZoomChange}
                    min={0.5}
                    max={3.0}
                    step={0.1}
                    className="w-full"
                  />
                </div>
                <ZoomIn className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground w-12">
                  {zoom[0].toFixed(1)}x
                </span>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Move className="h-4 w-4" />
                <span>Drag to reposition</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isUploading}>
            Cancel
          </Button>
          <Button 
            onClick={handleApplyCrop} 
            disabled={!imageLoaded || isUploading}
            className="bg-[#EF4923] hover:bg-[#EF4923]/90"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Apply Crop"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SettingsPage() {
  const [yentaIdInput, setYentaIdInput] = useState("");
  const [localNotifSettings, setLocalNotifSettings] = useState<Partial<NotificationSettings> | null>(null);
  const [profileForm, setProfileForm] = useState({ phone: "", title: "" });
  const [profileChanges, setProfileChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const sectionParam = searchParams.get("section");
  const [activeTab, setActiveTab] = useState(sectionParam === "preferences" ? "preferences" : "profile");

  const { data: notifData } = useQuery<{ settings: NotificationSettings }>({
    queryKey: ["/api/notifications/settings"],
  });

  const notifSettings = localNotifSettings || notifData?.settings || defaultNotificationSettings;

  const updateNotifMutation = useMutation({
    mutationFn: async (newSettings: Partial<NotificationSettings>) => {
      const res = await fetch("/api/notifications/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newSettings),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/settings"] });
      toast({ title: "Settings saved", description: "Your notification preferences have been updated." });
      setLocalNotifSettings(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save settings. Please try again.", variant: "destructive" });
    },
  });

  const updateNotifSetting = <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => {
    setLocalNotifSettings((prev) => ({ ...prev, ...notifSettings, [key]: value }));
  };

  const handleSaveNotifSettings = () => {
    if (localNotifSettings) {
      updateNotifMutation.mutate(localNotifSettings);
    }
  };

  const hasNotifChanges = localNotifSettings !== null;

  const { data: userProfile, isLoading } = useQuery<UserProfile>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
  });

  const { data: agentProfile, isLoading: isAgentProfileLoading } = useQuery<AgentProfile>({
    queryKey: ["/api/agent-profile"],
    queryFn: async () => {
      const res = await fetch("/api/agent-profile", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch agent profile");
      return res.json();
    },
  });

  // Set form values when agent profile loads
  useEffect(() => {
    if (agentProfile) {
      setProfileForm({
        phone: agentProfile.phone || "",
        title: agentProfile.title || "",
      });
      setProfileChanges(false);
    }
  }, [agentProfile]);

  const linkMutation = useMutation({
    mutationFn: async (yentaId: string) => {
      const res = await fetch("/api/rezen/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ yentaId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to link account");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rezen/performance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setYentaIdInput("");
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/rezen/unlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to disconnect");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rezen/performance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { phone?: string; title?: string }) => {
      const res = await fetch("/api/agent-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-profile"] });
      toast({ title: "Profile updated", description: "Your profile information has been saved." });
      setProfileChanges(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update profile. Please try again.", variant: "destructive" });
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async (imageData: string) => {
      const res = await fetch("/api/agent-profile/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ imageData }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to upload photo");
      }
      return res.json();
    },
    onSuccess: (data) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["/api/agent-profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Also refetch immediately to ensure fresh data
      queryClient.refetchQueries({ queryKey: ["/api/agent-profile"] });
      
      toast({ title: "Photo updated", description: "Your profile photo has been updated." });
      handleCloseCropModal();
    },
    onError: (error) => {
      toast({ 
        title: "Upload failed", 
        description: error.message || "Failed to upload photo. Please try again.", 
        variant: "destructive" 
      });
    },
  });

  const isRezenLinked = !!userProfile?.rezenYentaId;
  const isFubLinked = !!userProfile?.fubUserId;

  const handleProfileFormChange = (field: keyof typeof profileForm, value: string) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
    setProfileChanges(true);
  };

  const handleSaveProfile = () => {
    const changes: { phone?: string; title?: string } = {};
    if (profileForm.phone !== (agentProfile?.phone || "")) {
      changes.phone = profileForm.phone;
    }
    if (profileForm.title !== (agentProfile?.title || "")) {
      changes.title = profileForm.title;
    }
    
    if (Object.keys(changes).length > 0) {
      updateProfileMutation.mutate(changes);
    }
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({ 
        title: "Invalid file type", 
        description: "Please select an image file (JPG, PNG, WEBP).", 
        variant: "destructive" 
      });
      return;
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({ 
        title: "File too large", 
        description: "Please select an image under 5MB.", 
        variant: "destructive" 
      });
      return;
    }

    // Show crop modal instead of directly uploading
    setSelectedImageFile(file);
    setIsCropModalOpen(true);
    
    // Clear the input so the same file can be selected again
    if (event.target) {
      event.target.value = '';
    }
  };

  const triggerPhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const handleCropComplete = (croppedImageData: string) => {
    uploadPhotoMutation.mutate(croppedImageData);
  };

  const handleCloseCropModal = () => {
    setIsCropModalOpen(false);
    setSelectedImageFile(null);
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your account and preferences</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="flex items-center gap-2" data-testid="tab-profile">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2" data-testid="tab-preferences">
              <Bell className="h-4 w-4" />
              Preferences
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6 mt-6">
            <Card data-testid="card-profile-info">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-[#EF4923]" />
                  Account Information
                </CardTitle>
                <CardDescription>Manage your profile information and photo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Photo Section */}
                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <Avatar className="h-20 w-20 cursor-pointer" onClick={triggerPhotoUpload}>
                      <AvatarImage src={agentProfile?.headshotUrl || userProfile?.profileImageUrl} className="object-contain bg-gray-50 dark:bg-gray-800" />
                      <AvatarFallback className="text-xl bg-[#EF4923] text-white">
                        {userProfile?.firstName?.charAt(0) || userProfile?.email?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                        <Camera className="h-6 w-6 text-white" />
                      </div>
                    </Avatar>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">
                      {userProfile?.firstName} {userProfile?.lastName}
                    </h3>
                    <p className="text-muted-foreground mb-2">{userProfile?.email}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={triggerPhotoUpload}
                      disabled={uploadPhotoMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      {uploadPhotoMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Upload Photo
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG, PNG, or WEBP. Max 5MB.
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Profile Form Fields */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={userProfile?.firstName || ""}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Managed by your login provider
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={userProfile?.lastName || ""}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Managed by your login provider
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={userProfile?.email || ""}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Managed by your login provider
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="(512) 555-1234"
                        value={profileForm.phone}
                        onChange={(e) => handleProfileFormChange('phone', e.target.value)}
                        disabled={isAgentProfileLoading || updateProfileMutation.isPending}
                      />
                    </div>
                    <div>
                      <Label htmlFor="title">Position / Title</Label>
                      <Input
                        id="title"
                        placeholder="Licensed Real Estate Agent"
                        value={profileForm.title}
                        onChange={(e) => handleProfileFormChange('title', e.target.value)}
                        disabled={isAgentProfileLoading || updateProfileMutation.isPending}
                      />
                    </div>
                  </div>

                  {/* Save Button */}
                  {profileChanges && (
                    <div className="flex justify-end pt-4">
                      <Button
                        onClick={handleSaveProfile}
                        disabled={updateProfileMutation.isPending}
                        className="bg-[#EF4923] hover:bg-[#EF4923]/90"
                      >
                        {updateProfileMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-connected-accounts">
              <CardHeader>
                <CardTitle>Connected Accounts</CardTitle>
                <CardDescription>Manage your connected services and integrations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <TooltipProvider>
                  {/* Google Account */}
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium">Google Account</p>
                        <p className="text-sm text-muted-foreground">{userProfile?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="p-1.5 rounded-full cursor-pointer bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                            <Link2 className="w-4 h-4" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Google Account is connected and syncing</p>
                        </TooltipContent>
                      </Tooltip>
                      <span className="text-sm text-green-600 font-medium">Connected</span>
                    </div>
                  </div>

                  {/* ReZen Account */}
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                        R
                      </div>
                      <div>
                        <p className="font-medium">ReZen Account</p>
                        <p className="text-sm text-muted-foreground">
                          {isRezenLinked ? `ID: ${userProfile?.rezenYentaId?.slice(0, 8)}...` : "Transaction management"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={`p-1.5 rounded-full cursor-pointer ${
                            isRezenLinked 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                              : 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400'
                          }`}>
                            {isRezenLinked ? (
                              <Link2 className="w-4 h-4" />
                            ) : (
                              <Link2Off className="w-4 h-4" />
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isRezenLinked 
                            ? 'ReZen is connected - Transaction data syncing' 
                            : 'ReZen is not connected. Go to Preferences to link your account.'
                          }</p>
                        </TooltipContent>
                      </Tooltip>
                      {isRezenLinked ? (
                        <span className="text-sm text-green-600 font-medium">Connected</span>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => setActiveTab("preferences")}>
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Follow Up Boss Account */}
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg" data-testid="fub-connection-card">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">FUB</span>
                      </div>
                      <div>
                        <p className="font-medium">Follow Up Boss</p>
                        <p className="text-sm text-muted-foreground">
                          {isFubLinked 
                            ? `User ID: ${userProfile?.fubUserId}` 
                            : 'CRM for leads and tasks'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={`p-1.5 rounded-full cursor-pointer ${
                            isFubLinked 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                              : 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400'
                          }`}>
                            {isFubLinked ? (
                              <Link2 className="w-4 h-4" />
                            ) : (
                              <Link2Off className="w-4 h-4" />
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isFubLinked 
                            ? 'Follow Up Boss is connected - Leads and tasks syncing' 
                            : 'Follow Up Boss is not connected. Your account is automatically linked by email.'
                          }</p>
                        </TooltipContent>
                      </Tooltip>
                      {isFubLinked ? (
                        <span className="text-sm text-green-600 font-medium">Connected</span>
                      ) : (
                        <a
                          href="https://www.followupboss.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-[#EF4923] transition-colors"
                        >
                          What is FUB?
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </TooltipProvider>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6 mt-6">
            <Card data-testid="card-rezen-settings">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#EF4923]" />
              ReZen Integration
            </CardTitle>
            <CardDescription>
              Connect your ReZen account to view your GCI, deals, and performance metrics on the My Performance page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isRezenLinked ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <Check className="h-5 w-5 text-emerald-600" />
                  <div className="flex-1">
                    <p className="font-medium text-emerald-900">Account Connected</p>
                    <p className="text-sm text-emerald-700">
                      Yenta ID: <code className="bg-emerald-100 px-1 rounded">{userProfile?.rezenYentaId}</code>
                    </p>
                  </div>
                </div>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" data-testid="button-disconnect-rezen">
                      <Unlink className="h-4 w-4 mr-2" />
                      Disconnect ReZen
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disconnect ReZen Account?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove your ReZen integration. You won't be able to see your performance data until you reconnect.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => unlinkMutation.mutate()}
                        className="bg-red-600 hover:bg-red-700"
                        data-testid="button-confirm-disconnect"
                      >
                        Disconnect
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <div className="flex-1">
                    <p className="font-medium text-amber-900">Not Connected</p>
                    <p className="text-sm text-amber-700">
                      Enter your Yenta ID below to connect your ReZen account.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="yentaId">Yenta ID</Label>
                  <Input
                    id="yentaId"
                    placeholder="e.g., xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={yentaIdInput}
                    onChange={(e) => setYentaIdInput(e.target.value)}
                    data-testid="input-settings-yenta-id"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Yenta ID can be found in your ReZen profile URL or ask your team leader.
                  </p>
                </div>

                <Button
                  onClick={() => linkMutation.mutate(yentaIdInput)}
                  disabled={!yentaIdInput || linkMutation.isPending}
                  data-testid="button-connect-rezen"
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  {linkMutation.isPending ? "Connecting..." : "Connect ReZen Account"}
                </Button>

                {linkMutation.isError && (
                  <p className="text-sm text-red-600" data-testid="error-link">
                    {linkMutation.error?.message || "Failed to link account"}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        <Card data-testid="card-notification-settings">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-[#EF4923]" />
              <div>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Control how you receive notifications</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications-enabled" className="text-base font-medium">Enable Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive notifications for important updates</p>
              </div>
              <Switch
                id="notifications-enabled"
                checked={notifSettings.notificationsEnabled}
                onCheckedChange={(checked) => updateNotifSetting("notificationsEnabled", checked)}
                data-testid="switch-notifications-enabled"
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Notification Types</h3>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-blue-500" />
                  <div>
                    <Label htmlFor="lead-assigned" className="text-sm font-medium">New Lead Assigned</Label>
                    <p className="text-xs text-muted-foreground">When a new lead is assigned to you</p>
                  </div>
                </div>
                <Switch
                  id="lead-assigned"
                  checked={notifSettings.leadAssignedEnabled}
                  onCheckedChange={(checked) => updateNotifSetting("leadAssignedEnabled", checked)}
                  disabled={!notifSettings.notificationsEnabled}
                  data-testid="switch-lead-assigned"
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-green-500" />
                  <div>
                    <Label htmlFor="appointment-reminder" className="text-sm font-medium">Appointment Reminders</Label>
                    <p className="text-xs text-muted-foreground">Reminders before scheduled appointments</p>
                  </div>
                </div>
                <Switch
                  id="appointment-reminder"
                  checked={notifSettings.appointmentReminderEnabled}
                  onCheckedChange={(checked) => updateNotifSetting("appointmentReminderEnabled", checked)}
                  disabled={!notifSettings.notificationsEnabled}
                  data-testid="switch-appointment-reminder"
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Home className="h-5 w-5 text-[#EF4923]" />
                  <div>
                    <Label htmlFor="deal-update" className="text-sm font-medium">Deal Updates</Label>
                    <p className="text-xs text-muted-foreground">When deal status changes</p>
                  </div>
                </div>
                <Switch
                  id="deal-update"
                  checked={notifSettings.dealUpdateEnabled}
                  onCheckedChange={(checked) => updateNotifSetting("dealUpdateEnabled", checked)}
                  disabled={!notifSettings.notificationsEnabled}
                  data-testid="switch-deal-update"
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <CheckSquare className="h-5 w-5 text-purple-500" />
                  <div>
                    <Label htmlFor="task-due" className="text-sm font-medium">Task Due</Label>
                    <p className="text-xs text-muted-foreground">When tasks are due or overdue</p>
                  </div>
                </div>
                <Switch
                  id="task-due"
                  checked={notifSettings.taskDueEnabled}
                  onCheckedChange={(checked) => updateNotifSetting("taskDueEnabled", checked)}
                  disabled={!notifSettings.notificationsEnabled}
                  data-testid="switch-task-due"
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Megaphone className="h-5 w-5 text-red-500" />
                  <div>
                    <Label htmlFor="system" className="text-sm font-medium">System Announcements</Label>
                    <p className="text-xs text-muted-foreground">Important system updates and news</p>
                  </div>
                </div>
                <Switch
                  id="system"
                  checked={notifSettings.systemEnabled}
                  onCheckedChange={(checked) => updateNotifSetting("systemEnabled", checked)}
                  disabled={!notifSettings.notificationsEnabled}
                  data-testid="switch-system"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Moon className="h-5 w-5 text-indigo-500" />
                  <div>
                    <Label htmlFor="quiet-hours" className="text-sm font-medium">Quiet Hours</Label>
                    <p className="text-xs text-muted-foreground">Don't send notifications during these times</p>
                  </div>
                </div>
                <Switch
                  id="quiet-hours"
                  checked={notifSettings.quietHoursEnabled}
                  onCheckedChange={(checked) => updateNotifSetting("quietHoursEnabled", checked)}
                  disabled={!notifSettings.notificationsEnabled}
                  data-testid="switch-quiet-hours"
                />
              </div>

              {notifSettings.quietHoursEnabled && (
                <div className="ml-8 flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">From:</Label>
                    <Select
                      value={notifSettings.quietHoursStart}
                      onValueChange={(value) => updateNotifSetting("quietHoursStart", value)}
                    >
                      <SelectTrigger className="w-28" data-testid="select-quiet-start">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["20:00", "21:00", "22:00", "23:00", "00:00"].map((time) => (
                          <SelectItem key={time} value={time}>
                            {time === "00:00" ? "12:00 AM" : `${parseInt(time) > 12 ? parseInt(time) - 12 : parseInt(time)}:00 ${parseInt(time) >= 12 ? "PM" : "AM"}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">To:</Label>
                    <Select
                      value={notifSettings.quietHoursEnd}
                      onValueChange={(value) => updateNotifSetting("quietHoursEnd", value)}
                    >
                      <SelectTrigger className="w-28" data-testid="select-quiet-end">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["05:00", "06:00", "07:00", "08:00", "09:00"].map((time) => (
                          <SelectItem key={time} value={time}>
                            {`${parseInt(time)}:00 AM`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Email Notifications</h3>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-amber-500" />
                  <div>
                    <Label htmlFor="email-toggle" className="text-sm font-medium">Enable Email Notifications</Label>
                    <p className="text-xs text-muted-foreground">Receive notifications via email</p>
                  </div>
                </div>
                <Switch
                  id="email-toggle"
                  checked={notifSettings.emailNotificationsEnabled}
                  onCheckedChange={(checked) => updateNotifSetting("emailNotificationsEnabled", checked)}
                  disabled={!notifSettings.notificationsEnabled}
                  data-testid="switch-email"
                />
              </div>

              {notifSettings.emailNotificationsEnabled && (
                <div className="ml-8 space-y-2">
                  <Label htmlFor="notification-email" className="text-sm">Notification Email Address</Label>
                  <Input
                    id="notification-email"
                    type="email"
                    placeholder={userProfile?.email || "Enter email address"}
                    value={notifSettings.notificationEmail || ""}
                    onChange={(e) => updateNotifSetting("notificationEmail", e.target.value || null)}
                    disabled={!notifSettings.notificationsEnabled}
                    data-testid="input-notification-email"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank to use your account email ({userProfile?.email || "your email"})
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4">
              <Button 
                onClick={handleSaveNotifSettings} 
                disabled={!hasNotifChanges || updateNotifMutation.isPending}
                className="w-full sm:w-auto"
                data-testid="button-save-notification-settings"
              >
                {updateNotifMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Preferences
              </Button>
            </div>
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Photo Crop Modal */}
      <PhotoCropModal
        isOpen={isCropModalOpen}
        onClose={handleCloseCropModal}
        imageFile={selectedImageFile}
        onCrop={handleCropComplete}
        isUploading={uploadPhotoMutation.isPending}
      />
    </Layout>
  );
}
