import { useState } from 'react';
import { Home, ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}

export function SafeImage({ src, alt, className, fallbackClassName }: SafeImageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  // If there's an error or no src, show fallback immediately
  if (error || !src || src.trim() === '') {
    return (
      <div 
        className={cn(
          "flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg",
          fallbackClassName || className
        )}
      >
        <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 gap-2 p-4">
          <ImageOff className="w-8 h-8" />
          <span className="text-sm font-medium text-center">No photo available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Loading skeleton */}
      {loading && (
        <div className={cn(
          "absolute inset-0 bg-gray-100 dark:bg-gray-700 animate-pulse flex items-center justify-center",
          className
        )}>
          <Home className="w-8 h-8 text-gray-400" />
        </div>
      )}
      
      {/* Main image */}
      <img
        src={src}
        alt={alt}
        className={cn("w-full h-full object-cover", className)}
        onLoad={handleLoad}
        onError={handleError}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        style={{ display: loading ? 'none' : 'block' }}
      />
    </div>
  );
}