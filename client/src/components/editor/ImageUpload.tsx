import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  X,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export function ImageUpload({ 
  value, 
  onChange, 
  label = "Image",
  placeholder = "https://example.com/image.jpg",
  className 
}: ImageUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState("");

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPG, PNG, GIF, WebP)",
        variant: "destructive",
      });
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/admin/uploads', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      onChange(result.url);
      
      toast({
        title: "Image uploaded",
        description: "Your image has been uploaded successfully",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [onChange, toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadFile(file);
    }
  }, [uploadFile]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleUrlSubmit = () => {
    if (urlInputValue.trim()) {
      onChange(urlInputValue.trim());
      setUrlInputValue("");
      setShowUrlInput(false);
      toast({
        title: "Image URL added",
        description: "Image URL has been saved",
      });
    }
  };

  const removeImage = () => {
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <Label>{label}</Label>
      
      {/* Current Image Preview */}
      {value && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <img
                  src={value}
                  alt="Preview"
                  className="w-full max-w-md h-auto rounded-lg border"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik03NS4xIDEwMi4xTDEwMCA4Mi41TDEyNC45IDEwMi4xTDE1MCA4MC4xVjE0MC45SDUwVjgwLjFMNzUuMSAxMDIuMVoiIGZpbGw9IiM5Q0EzQUYiLz4KPGNpcmNsZSBjeD0iODIiIGN5PSI3MiIgcj0iMTIiIGZpbGw9IiM5Q0EzQUYiLz4KPHRleHQgeD0iMTAwIiB5PSIxNzAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlDQTNBRiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SW1hZ2UgTm90IEZvdW5kPC90ZXh0Pgo8L3N2Zz4K";
                  }}
                />
                <p className="text-sm text-muted-foreground mt-2 break-all">
                  {value}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removeImage}
                className="text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Area */}
      <div
        className={cn(
          "border-2 border-dashed border-border rounded-lg p-8 text-center transition-colors",
          dragActive && "border-primary bg-primary/5",
          "hover:border-primary/50"
        )}
        onDrop={handleDrop}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Uploading image...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Upload className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                Drag and drop an image here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports JPG, PNG, GIF, WebP up to 10MB
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Choose File
              </Button>
              <span className="text-xs text-muted-foreground">or</span>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowUrlInput(!showUrlInput)}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Add URL
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* URL Input */}
      {showUrlInput && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <Label htmlFor="imageUrl">Image URL</Label>
              <div className="flex gap-2">
                <Input
                  id="imageUrl"
                  value={urlInputValue}
                  onChange={(e) => setUrlInputValue(e.target.value)}
                  placeholder={placeholder}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleUrlSubmit();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={handleUrlSubmit}
                  disabled={!urlInputValue.trim()}
                >
                  Add
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowUrlInput(false);
                    setUrlInputValue("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}