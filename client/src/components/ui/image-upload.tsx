import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  X,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  category?: "images" | "agents" | "blogs" | "pages" | "communities";
  label?: string;
  hint?: string;
  className?: string;
  /** Show image preview */
  showPreview?: boolean;
  /** Aspect ratio for preview (e.g., "16/9", "1/1") */
  aspectRatio?: string;
}

export function ImageUpload({
  value,
  onChange,
  category = "images",
  label,
  hint,
  className,
  showPreview = true,
  aspectRatio,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [recentFiles, setRecentFiles] = useState<Array<{ url: string; filename: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (JPEG, PNG, GIF, WebP, SVG)",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 10MB",
          variant: "destructive",
        });
        return;
      }

      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`/api/admin/upload?category=${category}`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!res.ok) {
          const error = await res.json().catch(() => null);
          throw new Error(error?.error || "Upload failed");
        }

        const data = await res.json();
        onChange(data.url);
        setDialogOpen(false);

        toast({
          title: "Image uploaded",
          description: `${file.name} uploaded successfully`,
        });
      } catch (err: any) {
        toast({
          title: "Upload failed",
          description: err.message || "Failed to upload image",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    },
    [category, onChange, toast]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files?.[0]) {
        handleFileUpload(e.dataTransfer.files[0]);
      }
    },
    [handleFileUpload]
  );

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setUrlInput("");
      setDialogOpen(false);
    }
  };

  const loadRecentFiles = async () => {
    try {
      const res = await fetch(`/api/admin/upload/list?category=${category}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setRecentFiles(data.files?.slice(0, 20) || []);
      }
    } catch {
      // Silently fail
    }
  };

  const handleClear = () => {
    onChange("");
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}

      {/* Current image preview */}
      {value && showPreview && (
        <div className="relative group">
          <div
            className="rounded-lg border overflow-hidden bg-muted"
            style={{ aspectRatio: aspectRatio }}
          >
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='120'%3E%3Crect width='200' height='120' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%2394a3b8' font-size='14'%3EImage not found%3C/text%3E%3C/svg%3E";
              }}
            />
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* URL display if no preview */}
      {value && !showPreview && (
        <div className="flex items-center gap-2">
          <Input value={value} readOnly className="text-sm" />
          <Button variant="ghost" size="icon" onClick={handleClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Upload / URL input trigger */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant={value ? "outline" : "default"}
            size="sm"
            className="w-full"
          >
            {value ? (
              <>
                <ImageIcon className="h-4 w-4 mr-2" />
                Change Image
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Image
              </>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Image</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="upload" onValueChange={(v) => v === "library" && loadRecentFiles()}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload">
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="url">
                <LinkIcon className="h-4 w-4 mr-2" />
                URL
              </TabsTrigger>
              <TabsTrigger value="library">
                <FolderOpen className="h-4 w-4 mr-2" />
                Library
              </TabsTrigger>
            </TabsList>

            {/* Upload Tab */}
            <TabsContent value="upload" className="space-y-4">
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50",
                  isUploading && "pointer-events-none opacity-50"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />

                {isUploading ? (
                  <div className="space-y-2">
                    <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Uploading...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm font-medium">
                      Drop an image here or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      JPEG, PNG, GIF, WebP, SVG, AVIF • Max 10MB
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* URL Tab */}
            <TabsContent value="url" className="space-y-4">
              <div className="space-y-2">
                <Label>Image URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleUrlSubmit();
                      }
                    }}
                  />
                  <Button onClick={handleUrlSubmit} disabled={!urlInput.trim()}>
                    Add
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste the full URL of an existing image
                </p>
              </div>

              {/* URL preview */}
              {urlInput && (
                <div className="rounded-lg border overflow-hidden bg-muted h-32">
                  <img
                    src={urlInput}
                    alt="Preview"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </TabsContent>

            {/* Library Tab */}
            <TabsContent value="library" className="space-y-4">
              {recentFiles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No previously uploaded images
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-[300px] overflow-y-auto">
                  {recentFiles.map((file) => (
                    <button
                      key={file.url}
                      type="button"
                      className="rounded-lg border overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all aspect-square"
                      onClick={() => {
                        onChange(file.url);
                        setDialogOpen(false);
                      }}
                    >
                      <img
                        src={file.url}
                        alt={file.filename}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default ImageUpload;
