import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import Cropper from 'react-easy-crop';
import Layout from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { TrendingUp, Link2, Link2Off, Unlink, Check, AlertCircle, Bell, Users, Calendar, Home, CheckSquare, Megaphone, Moon, Mail, Loader2, User, ExternalLink, Camera, Upload, ZoomIn, ZoomOut, Move, Sparkles, FileText, File, Image as ImageIcon, Trash2, GripVertical, Plus, Download } from "lucide-react";
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

interface AgentResource {
  id: string;
  userId: string;
  title: string;
  type: 'pdf' | 'doc' | 'image' | 'link';
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  redirectUrl?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
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
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.2);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && imageFile) {
      setIsLoading(true);
      setImageError(null);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          const url = e.target.result as string;
          setImageUrl(url);
          
          // Test if image loads properly
          const img = new Image();
          img.onload = () => {
            setIsLoading(false);
            setImageError(null);
          };
          img.onerror = () => {
            setIsLoading(false);
            setImageError('Could not load image. Please try uploading a different photo.');
          };
          img.src = url;
        }
      };
      reader.readAsDataURL(imageFile);
    }
  }, [isOpen, imageFile]);

  const onCropChange = useCallback((location: any) => {
    setCrop(location);
  }, []);

  const onZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  const onCropComplete = useCallback(
    (_croppedArea: any, croppedAreaPixels: any) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleSave = async () => {
    if (!croppedAreaPixels) return;

    try {
      const croppedImage = await getCroppedImg(imageUrl, croppedAreaPixels);
      onCrop(croppedImage);
      resetAndClose();
    } catch (error) {
      console.error('Error cropping image:', error);
      setImageError('Failed to crop image');
    }
  };

  const resetAndClose = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1.2);
    setCroppedAreaPixels(null);
    setIsLoading(true);
    setImageError(null);
    setImageUrl("");
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetAndClose();
    }
  };

  if (!imageFile) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adjust Profile Photo</DialogTitle>
        </DialogHeader>

        <div className="relative w-full h-80 bg-gray-900 dark:bg-gray-800 rounded-lg overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
          {imageError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white p-4">
              <AlertCircle className="w-10 h-10 mb-2 text-destructive" />
              <p className="text-sm text-center">{imageError}</p>
            </div>
          )}
          {!imageError && imageUrl && (
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Move className="w-4 h-4" />
          <span>Drag to reposition</span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Zoom</Label>
            <span className="text-sm text-muted-foreground">{zoom.toFixed(1)}x</span>
          </div>
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[zoom]}
              onValueChange={([value]) => setZoom(value)}
              min={1}
              max={3}
              step={0.1}
              className="flex-1"
              disabled={!!imageError}
            />
            <ZoomIn className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!!imageError || isLoading || isUploading}
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

// Utility functions for cropping
async function getCroppedImg(imageSrc: string, pixelCrop: any): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Could not get canvas context');

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return canvas.toDataURL('image/jpeg', 0.9);
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.crossOrigin = 'anonymous';
    image.src = url;
  });
}
export default function SettingsPage() {
  const [yentaIdInput, setYentaIdInput] = useState("");
  const [localNotifSettings, setLocalNotifSettings] = useState<Partial<NotificationSettings> | null>(null);
  const [profileForm, setProfileForm] = useState({ phone: "", title: "", bio: "" });
  const [profileChanges, setProfileChanges] = useState(false);
  const [bioChanges, setBioChanges] = useState(false);
  const [selectedBioTone, setSelectedBioTone] = useState<"professional" | "friendly" | "luxury">("professional");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  
  // Resources & Links state
  const resourcesFileInputRef = useRef<HTMLInputElement>(null);
  const [showAddLinkForm, setShowAddLinkForm] = useState(false);
  const [linkForm, setLinkForm] = useState({ title: "", url: "" });
  
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
      const data = await res.json();
      // Server returns { profile: {...}, user: {...} }, but we need the profile data directly
      return data.profile;
    },
  });

  const { data: resourcesData } = useQuery<{ resources: AgentResource[] }>({
    queryKey: ["/api/settings/resources"],
    queryFn: async () => {
      const res = await fetch("/api/settings/resources", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch resources");
      return res.json();
    },
  });

  const resources = resourcesData?.resources || [];

  // Set form values when agent profile loads
  useEffect(() => {
    // Guard against race conditions during refetch - only update if we have actual profile data
    if (agentProfile && (agentProfile.phone !== undefined || agentProfile.title !== undefined || agentProfile.bio !== undefined)) {
      setProfileForm({
        phone: agentProfile.phone || "",
        title: agentProfile.title || "",
        bio: agentProfile.bio || "",
      });
      setProfileChanges(false);
      setBioChanges(false);
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
    mutationFn: async (data: { phone?: string; title?: string; bio?: string }) => {
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
      // Update the query cache immediately with the new photo
      queryClient.setQueryData(["/api/agent-profile"], (oldData: any) => {
        if (oldData) {
          return {
            ...oldData,
            headshotUrl: data.headshotUrl || data.profile?.headshotUrl
          };
        }
        return oldData;
      });
      
      // Invalidate and refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["/api/agent-profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
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

  const updateBioMutation = useMutation({
    mutationFn: async (bio: string) => {
      const res = await fetch("/api/agent-profile/bio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bio }),
      });
      if (!res.ok) throw new Error("Failed to update bio");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-profile"] });
      toast({ title: "Bio updated", description: "Your professional bio has been saved." });
      setBioChanges(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update bio. Please try again.", variant: "destructive" });
    },
  });

  const generateBioMutation = useMutation({
    mutationFn: async (tone: string) => {
      const res = await fetch("/api/agent-profile/generate-bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tone }),
      });
      if (!res.ok) throw new Error("Failed to generate bio");
      const data = await res.json();
      return data.bio;
    },
    onSuccess: (generatedBio) => {
      setProfileForm(prev => ({ ...prev, bio: generatedBio }));
      setBioChanges(true);
      toast({ title: "Bio generated", description: "AI generated bio is ready for editing." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate bio. Please try again.", variant: "destructive" });
    },
  });

  // Resources & Links mutations
  const uploadResourceMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch("/api/settings/resources/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to upload file");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/resources"] });
      toast({ title: "File uploaded", description: "Your resource has been uploaded successfully." });
    },
    onError: (error) => {
      toast({ 
        title: "Upload failed", 
        description: error.message || "Failed to upload file. Please try again.", 
        variant: "destructive" 
      });
    },
  });

  const addLinkMutation = useMutation({
    mutationFn: async (linkData: { title: string; url: string }) => {
      const res = await fetch("/api/settings/resources/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(linkData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to add link");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/resources"] });
      setLinkForm({ title: "", url: "" });
      setShowAddLinkForm(false);
      toast({ title: "Link added", description: "Your link has been added successfully." });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to add link", 
        description: error.message || "Please try again.", 
        variant: "destructive" 
      });
    },
  });

  const deleteResourceMutation = useMutation({
    mutationFn: async (resourceId: string) => {
      const res = await fetch(`/api/settings/resources/${resourceId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete resource");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/resources"] });
      toast({ title: "Resource deleted", description: "The resource has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete resource. Please try again.", variant: "destructive" });
    },
  });

  const reorderResourceMutation = useMutation({
    mutationFn: async ({ resourceId, sortOrder }: { resourceId: string; sortOrder: number }) => {
      const res = await fetch(`/api/settings/resources/${resourceId}/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sort_order: sortOrder }),
      });
      if (!res.ok) throw new Error("Failed to reorder resource");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/resources"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reorder resource. Please try again.", variant: "destructive" });
    },
  });

  const isRezenLinked = !!userProfile?.rezenYentaId;
  const isFubLinked = !!userProfile?.fubUserId;

  // Phone number formatting function
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Apply formatting based on length
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  };

  const handleProfileFormChange = (field: keyof typeof profileForm, value: string) => {
    let processedValue = value;
    
    // Apply phone formatting if this is the phone field
    if (field === 'phone') {
      processedValue = formatPhoneNumber(value);
    }
    
    setProfileForm(prev => ({ ...prev, [field]: processedValue }));
    
    if (field === 'bio') {
      setBioChanges(true);
    } else {
      setProfileChanges(true);
    }
  };

  const handleSaveProfile = () => {
    const changes: { phone?: string; title?: string; bio?: string } = {};
    if (profileForm.phone !== (agentProfile?.phone || "")) {
      changes.phone = profileForm.phone;
    }
    if (profileForm.title !== (agentProfile?.title || "")) {
      changes.title = profileForm.title;
    }
    if (profileForm.bio !== (agentProfile?.bio || "")) {
      changes.bio = profileForm.bio;
    }
    
    if (Object.keys(changes).length > 0) {
      updateProfileMutation.mutate(changes);
    }
  };

  const handleSaveBio = () => {
    if (profileForm.bio !== (agentProfile?.bio || "")) {
      updateBioMutation.mutate(profileForm.bio);
    }
  };

  const handleGenerateBio = () => {
    generateBioMutation.mutate(selectedBioTone);
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

  // Resources & Links handlers
  const handleResourceUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/webp'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast({ 
        title: "Invalid file type", 
        description: "Please upload PDF, DOC, DOCX, JPG, PNG, or WEBP files only.", 
        variant: "destructive" 
      });
      return;
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({ 
        title: "File too large", 
        description: "Please select a file under 5MB.", 
        variant: "destructive" 
      });
      return;
    }

    // Check resource count
    if (resources.length >= 10) {
      toast({ 
        title: "Maximum resources reached", 
        description: "You can only upload up to 10 resources.", 
        variant: "destructive" 
      });
      return;
    }

    uploadResourceMutation.mutate(file);
    
    // Clear the input
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleAddLink = () => {
    if (!linkForm.title.trim() || !linkForm.url.trim()) {
      toast({ 
        title: "Missing information", 
        description: "Please provide both title and URL.", 
        variant: "destructive" 
      });
      return;
    }

    // Basic URL validation
    try {
      new URL(linkForm.url);
    } catch {
      toast({ 
        title: "Invalid URL", 
        description: "Please enter a valid URL (e.g., https://example.com).", 
        variant: "destructive" 
      });
      return;
    }

    // Check resource count
    if (resources.length >= 10) {
      toast({ 
        title: "Maximum resources reached", 
        description: "You can only have up to 10 resources.", 
        variant: "destructive" 
      });
      return;
    }

    addLinkMutation.mutate(linkForm);
  };

  const triggerResourceUpload = () => {
    resourcesFileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getResourceIcon = (resource: AgentResource) => {
    if (resource.type === 'link') {
      return <Link2 className="w-5 h-5 text-blue-500" />;
    }
    if (resource.type === 'pdf') {
      return <FileText className="w-5 h-5 text-red-500" />;
    }
    if (resource.type === 'doc') {
      return <File className="w-5 h-5 text-blue-600" />;
    }
    if (resource.type === 'image') {
      return <ImageIcon className="w-5 h-5 text-green-500" />;
    }
    return <File className="w-5 h-5 text-gray-500" />;
  };

  const moveResource = (resourceId: string, direction: 'up' | 'down') => {
    const currentIndex = resources.findIndex(r => r.id === resourceId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= resources.length) return;
    
    const newSortOrder = resources[newIndex].sortOrder;
    reorderResourceMutation.mutate({ resourceId, sortOrder: newSortOrder });
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
                    <Avatar className="h-24 w-24 border-2 border-muted cursor-pointer" onClick={triggerPhotoUpload}>
                      {agentProfile?.headshotUrl ? (
                        <AvatarImage src={agentProfile.headshotUrl} alt="Agent headshot" />
                      ) : null}
                      <AvatarFallback className="text-xl bg-[#EF4923] text-white">
                        <User className="h-10 w-10 text-white" />
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

                  {/* Professional Bio Section */}
                  <div className="space-y-4 pt-6 border-t">
                    <div>
                      <Label htmlFor="bio" className="text-lg font-semibold">Professional Bio</Label>
                      <p className="text-sm text-muted-foreground">This bio appears on your CMA Presentation Agent Resume</p>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <Textarea
                          id="bio"
                          placeholder="Write about your experience, specialties, and what makes you unique as a real estate professional..."
                          value={profileForm.bio}
                          onChange={(e) => handleProfileFormChange('bio', e.target.value)}
                          disabled={isAgentProfileLoading || updateBioMutation.isPending}
                          className="min-h-[120px] resize-none"
                          maxLength={500}
                        />
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-muted-foreground">
                            {profileForm.bio.length}/500 characters
                          </span>
                          {bioChanges && (
                            <Button
                              size="sm"
                              onClick={handleSaveBio}
                              disabled={updateBioMutation.isPending}
                              className="bg-[#EF4923] hover:bg-[#EF4923]/90"
                            >
                              {updateBioMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                "Save Bio"
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* AI Bio Generator */}
                      <div className="bg-muted/30 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles className="h-4 w-4 text-[#EF4923]" />
                          <Label className="font-medium">AI Bio Generator</Label>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex gap-2 flex-wrap">
                            {[
                              { value: "professional", label: "Professional" },
                              { value: "friendly", label: "Friendly" },
                              { value: "luxury", label: "Luxury" }
                            ].map((tone) => (
                              <Button
                                key={tone.value}
                                type="button"
                                variant={selectedBioTone === tone.value ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedBioTone(tone.value as typeof selectedBioTone)}
                                disabled={generateBioMutation.isPending}
                                className={selectedBioTone === tone.value ? "bg-[#EF4923] hover:bg-[#EF4923]/90" : ""}
                              >
                                {tone.label}
                              </Button>
                            ))}
                          </div>
                          
                          <Button
                            type="button"
                            onClick={handleGenerateBio}
                            disabled={generateBioMutation.isPending}
                            className="w-full bg-[#EF4923] hover:bg-[#EF4923]/90"
                          >
                            {generateBioMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Generate Bio
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
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

            {/* Resources & Links Section */}
            <Card data-testid="card-resources-links">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#EF4923]" />
                  Resources & Links
                </CardTitle>
                <CardDescription>Upload documents and add links that appear on your CMA presentation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Upload and Add Link buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    onClick={triggerResourceUpload}
                    disabled={uploadResourceMutation.isPending || resources.length >= 10}
                    className="flex items-center gap-2"
                  >
                    {uploadResourceMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Upload File
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddLinkForm(!showAddLinkForm)}
                    disabled={resources.length >= 10}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Link
                  </Button>
                  <input
                    ref={resourcesFileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                    onChange={handleResourceUpload}
                    className="hidden"
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Accepts PDF, DOC, DOCX, JPG, PNG, WEBP files. Max 5MB per file.
                </p>

                {/* Add Link Form */}
                {showAddLinkForm && (
                  <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <Label htmlFor="link-title">Title</Label>
                        <Input
                          id="link-title"
                          placeholder="e.g., Market Report 2024"
                          value={linkForm.title}
                          onChange={(e) => setLinkForm(prev => ({ ...prev, title: e.target.value }))}
                          disabled={addLinkMutation.isPending}
                        />
                      </div>
                      <div>
                        <Label htmlFor="link-url">URL</Label>
                        <Input
                          id="link-url"
                          placeholder="https://example.com"
                          value={linkForm.url}
                          onChange={(e) => setLinkForm(prev => ({ ...prev, url: e.target.value }))}
                          disabled={addLinkMutation.isPending}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleAddLink}
                        disabled={addLinkMutation.isPending}
                        className="bg-[#EF4923] hover:bg-[#EF4923]/90"
                      >
                        {addLinkMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          "Add Link"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowAddLinkForm(false);
                          setLinkForm({ title: "", url: "" });
                        }}
                        disabled={addLinkMutation.isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Resources List */}
                <div className="space-y-3">
                  {resources.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No resources added yet</p>
                      <p className="text-sm">Upload files or add links to get started</p>
                    </div>
                  ) : (
                    resources
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((resource, index) => (
                        <div
                          key={resource.id}
                          className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg group hover:bg-muted/50 transition-colors"
                        >
                          {/* Resource Icon */}
                          <div className="flex-shrink-0">
                            {getResourceIcon(resource)}
                          </div>

                          {/* Resource Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {resource.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {resource.type === 'link' 
                                ? 'Link' 
                                : resource.fileSize 
                                  ? formatFileSize(resource.fileSize)
                                  : 'File'
                              }
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Move Up */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => moveResource(resource.id, 'up')}
                              disabled={index === 0 || reorderResourceMutation.isPending}
                              className="h-8 w-8 p-0"
                            >
                              <GripVertical className="h-3 w-3 rotate-90" />
                            </Button>

                            {/* Move Down */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => moveResource(resource.id, 'down')}
                              disabled={index === resources.length - 1 || reorderResourceMutation.isPending}
                              className="h-8 w-8 p-0"
                            >
                              <GripVertical className="h-3 w-3 -rotate-90" />
                            </Button>

                            {/* Delete */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                                  disabled={deleteResourceMutation.isPending}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Resource?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently remove "{resource.title}" from your resources. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteResourceMutation.mutate(resource.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))
                  )}
                </div>

                {/* Resource Counter */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-sm text-muted-foreground">
                    {resources.length} / 10 resources
                  </span>
                  {resources.length >= 10 && (
                    <span className="text-xs text-red-600">
                      Maximum resources reached
                    </span>
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
