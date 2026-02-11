import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ChevronLeft, ChevronRight, Loader2, Home, Bed, Bath, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhotoGalleryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photos: string[];
  initialIndex?: number;
  propertyAddress?: string;
  propertyPrice?: number;
  propertyDetails?: {
    beds?: number;
    baths?: number;
    sqft?: number;
    status?: string;
  };
}

export function PhotoGalleryModal({
  open,
  onOpenChange,
  photos,
  initialIndex = 0,
  propertyAddress,
  propertyPrice,
  propertyDetails,
}: PhotoGalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Reset index when modal opens or photos change
  useEffect(() => {
    if (open) {
      console.log('[PhotoGallery Debug] Modal opened:', {
        photosCount: photos.length,
        photosPreview: photos.slice(0, 3),
        initialIndex,
        propertyAddress,
        allPhotosValid: photos.every(p => p && p.startsWith('http'))
      });
      
      setCurrentIndex(Math.max(0, Math.min(initialIndex, photos.length - 1)));
      setImageError(false);
    }
  }, [open, initialIndex, photos.length, photos, propertyAddress]);

  // Navigation functions
  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => (prev === 0 ? photos.length - 1 : prev - 1));
    setImageError(false);
    setImageLoading(true);
  }, [photos.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev === photos.length - 1 ? 0 : prev + 1));
    setImageError(false);
    setImageLoading(true);
  }, [photos.length]);

  const goToIndex = useCallback((index: number) => {
    setCurrentIndex(index);
    setImageError(false);
    setImageLoading(true);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
        case 'Escape':
          e.preventDefault();
          onOpenChange(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, goToPrevious, goToNext, onOpenChange]);

  // Touch/swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (!open) return null;

  const currentPhoto = photos.length > 0 ? photos[currentIndex] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm p-0 max-w-none h-full w-full border-0"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="relative h-full w-full flex flex-col">
          {/* Header bar */}
          <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 via-black/50 to-transparent p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {propertyAddress && (
                  <h2 className="text-white text-lg sm:text-xl font-semibold truncate mb-1">
                    {propertyAddress}
                  </h2>
                )}
                <div className="flex items-center gap-3 flex-wrap text-sm text-white/80">
                  {propertyPrice && (
                    <span className="font-medium text-white">
                      {formatCurrency(propertyPrice)}
                    </span>
                  )}
                  {propertyDetails && (
                    <>
                      {propertyDetails.beds && (
                        <span className="flex items-center gap-1">
                          <Bed className="w-3 h-3" /> {propertyDetails.beds}
                        </span>
                      )}
                      {propertyDetails.baths && (
                        <span className="flex items-center gap-1">
                          <Bath className="w-3 h-3" /> {propertyDetails.baths}
                        </span>
                      )}
                      {propertyDetails.sqft && (
                        <span className="flex items-center gap-1">
                          <Square className="w-3 h-3" /> {propertyDetails.sqft.toLocaleString()} sqft
                        </span>
                      )}
                      {propertyDetails.status && (
                        <Badge variant="secondary" className="text-xs">
                          {propertyDetails.status}
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              {/* Photo counter */}
              <div className="text-white/80 text-sm font-medium flex-shrink-0">
                {currentIndex + 1} / {photos.length}
              </div>
              
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="text-white hover:bg-white/10 h-10 w-10 flex-shrink-0"
                data-testid="gallery-close"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Main photo area */}
          <div 
            className="flex-1 relative flex items-center justify-center p-4 sm:p-8 pt-24 pb-20"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {imageLoading && photos.length > 0 && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
            
            {photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-white/60 max-w-sm mx-auto text-center">
                <Home className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No Photos Available</p>
                <p className="text-sm">This property doesn't have any photos available</p>
                <p className="text-xs text-white/40 mt-2">
                  This is normal for older sold listings
                </p>
              </div>
            ) : imageError ? (
              <div className="flex flex-col items-center justify-center text-white/60 max-w-sm mx-auto text-center">
                <Home className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Image unavailable</p>
                <p className="text-sm">This photo could not be loaded</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setImageError(false);
                    setImageLoading(true);
                  }}
                  className="mt-4 text-white border-white/20 hover:bg-white/10"
                >
                  Try again
                </Button>
              </div>
            ) : (
              <img
                src={currentPhoto}
                alt={`${propertyAddress || 'Property'} - Photo ${currentIndex + 1}`}
                className="max-w-full max-h-full object-contain"
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageLoading(false);
                  setImageError(true);
                }}
                style={{
                  maxWidth: '95vw',
                  maxHeight: '70vh',
                }}
              />
            )}

            {/* Navigation arrows */}
            {photos.length > 1 && !imageError && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 h-12 w-12 rounded-full backdrop-blur-sm bg-black/20"
                  data-testid="gallery-prev"
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 h-12 w-12 rounded-full backdrop-blur-sm bg-black/20"
                  data-testid="gallery-next"
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </>
            )}
          </div>

          {/* Thumbnail strip (desktop only) */}
          {photos.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 hidden sm:block bg-gradient-to-t from-black/70 via-black/50 to-transparent p-4">
              <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
                {photos.slice(0, 20).map((photo, index) => (
                  <button
                    key={index}
                    onClick={() => goToIndex(index)}
                    className={cn(
                      "flex-shrink-0 w-16 h-12 rounded overflow-hidden border-2 transition-all",
                      index === currentIndex 
                        ? "border-white shadow-lg scale-110" 
                        : "border-white/20 hover:border-white/40"
                    )}
                    data-testid={`thumbnail-${index}`}
                  >
                    <img
                      src={photo}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                    />
                  </button>
                ))}
                {photos.length > 20 && (
                  <div className="flex-shrink-0 w-16 h-12 rounded bg-black/40 border-2 border-white/20 flex items-center justify-center">
                    <span className="text-white/60 text-xs">
                      +{photos.length - 20}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}