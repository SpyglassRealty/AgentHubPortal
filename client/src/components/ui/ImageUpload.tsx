import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Camera, 
  AlertCircle, 
  CheckCircle,
  Loader2 
} from 'lucide-react';

interface ImageUploadProps {
  value: string;
  onChange: (url: string, alt?: string, width?: number, height?: number) => void;
  onAltChange: (alt: string) => void;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
}

interface ImageMetadata {
  width: number;
  height: number;
  size: number;
  type: string;
}

export function ImageUpload({ 
  value, 
  onChange, 
  onAltChange,
  alt = '',
  width,
  height,
  className = '' 
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [imageMetadata, setImageMetadata] = useState<ImageMetadata | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getImageMetadata = (file: File): Promise<ImageMetadata> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
          size: file.size,
          type: file.type
        });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'community-images');

    // Simulate upload progress
    const uploadPromise = fetch('/api/upload/image', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        const next = prev + Math.random() * 15;
        return next > 90 ? 90 : next;
      });
    }, 200);

    try {
      const response = await uploadPromise;
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      return result.url;
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
  };

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Get image metadata
      const metadata = await getImageMetadata(file);
      setImageMetadata(metadata);

      // Upload file
      const uploadedUrl = await uploadFile(file);
      
      // Update with new image data
      onChange(uploadedUrl, alt || `Community featured image`, metadata.width, metadata.height);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [alt, onChange]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const removeImage = () => {
    onChange('', '');
    setImageMetadata(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getOptimizationStatus = () => {
    if (!imageMetadata) return null;

    const { width: w, height: h, size } = imageMetadata;
    const aspectRatio = w / h;
    const isOptimalSize = w >= 1200 && w <= 2400 && h >= 630 && h <= 1260;
    const isOptimalAspectRatio = Math.abs(aspectRatio - (1200/630)) < 0.1; // ~1.9:1
    const isOptimalFileSize = size <= 1024 * 1024; // 1MB

    return {
      size: isOptimalSize,
      aspectRatio: isOptimalAspectRatio,
      fileSize: isOptimalFileSize,
      overall: isOptimalSize && isOptimalAspectRatio && isOptimalFileSize
    };
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const optimizationStatus = getOptimizationStatus();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      {!value ? (
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />
          
          <div className="space-y-4">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
              dragActive ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              {isUploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              ) : (
                <Upload className={`w-8 h-8 ${dragActive ? 'text-blue-600' : 'text-gray-400'}`} />
              )}
            </div>
            
            {isUploading ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Uploading image...</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">{Math.round(uploadProgress)}% complete</p>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    {dragActive ? 'Drop your image here' : 'Upload featured image'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Drag and drop an image, or click to browse
                  </p>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Choose Image
                </Button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Image Preview */}
          <div className="relative">
            <img
              src={value}
              alt={alt}
              className="w-full max-w-md h-48 object-cover rounded-lg shadow-md"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={removeImage}
              className="absolute -top-2 -right-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Replace Button */}
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Replace Image
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
            disabled={isUploading}
          />
        </div>
      )}

      {/* Image Metadata & Optimization */}
      {imageMetadata && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Image Information</h4>
          
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <span className="text-gray-600">Dimensions:</span>
              <span className="ml-2 font-medium">
                {imageMetadata.width} × {imageMetadata.height}px
              </span>
            </div>
            <div>
              <span className="text-gray-600">File Size:</span>
              <span className="ml-2 font-medium">
                {formatFileSize(imageMetadata.size)}
              </span>
            </div>
          </div>

          {optimizationStatus && (
            <div className="space-y-2">
              <h5 className="font-medium text-gray-900">Optimization Status:</h5>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  {optimizationStatus.size ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                  )}
                  <span>Image size (recommended: 1200-2400px width)</span>
                </div>
                <div className="flex items-center gap-2">
                  {optimizationStatus.aspectRatio ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                  )}
                  <span>Aspect ratio (recommended: ~1.9:1 for social sharing)</span>
                </div>
                <div className="flex items-center gap-2">
                  {optimizationStatus.fileSize ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                  )}
                  <span>File size (recommended: under 1MB)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Alt Text */}
      {value && (
        <div>
          <Label htmlFor="alt-text">
            Alt Text
            <span className="text-red-500 ml-1">*</span>
          </Label>
          <Input
            id="alt-text"
            type="text"
            value={alt}
            onChange={(e) => onAltChange(e.target.value)}
            placeholder="Describe this image for accessibility..."
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Alt text is important for accessibility and SEO. Describe what's shown in the image.
          </p>
        </div>
      )}

      {/* Size Recommendations */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Image Size Recommendations</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Optimal size:</strong> 1200×630 pixels (1.9:1 aspect ratio)</li>
          <li>• <strong>Minimum size:</strong> 800×400 pixels</li>
          <li>• <strong>File size:</strong> Keep under 1MB for fast loading</li>
          <li>• <strong>Format:</strong> JPG for photos, PNG for graphics with transparency</li>
          <li>• <strong>Quality:</strong> High quality images improve user experience and SEO</li>
        </ul>
      </div>
    </div>
  );
}