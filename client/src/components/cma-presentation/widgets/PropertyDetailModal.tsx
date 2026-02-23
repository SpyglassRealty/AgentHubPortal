import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Bed, Bath, Square, Clock, Calendar, Maximize, Car, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SafeImage } from '@/components/ui/safe-image';
import { extractPrice, extractSqft, calculatePricePerSqft, extractDOM } from '@/lib/cma-data-utils';
import type { CmaProperty } from '../types';

interface PropertyDetailModalProps {
  property: CmaProperty;
  onClose: () => void;
}

function formatCurrency(value: number): string {
  if (!value || isNaN(value)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const getStatusColor = (status: string, isSubject?: boolean) => {
  if (isSubject) return 'bg-blue-500';  // BLUE for Subject
  const s = status?.toLowerCase() || '';
  if (s.includes('closed') || s.includes('sold')) return 'bg-red-500';  // RED for Closed/Sold
  if (s.includes('active under') || s.includes('under contract')) return 'bg-orange-500';  // ORANGE for Under Contract
  if (s.includes('active')) return 'bg-green-500';  // GREEN for Active
  if (s.includes('pending')) return 'bg-gray-500';  // GRAY for Pending
  return 'bg-gray-500';
};

function DetailItem({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div data-testid={`detail-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <p className="text-sm text-gray-600 flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}

export function PropertyDetailModal({ property, onClose }: PropertyDetailModalProps) {
  // Debug logging - log full property object
  console.log('🔍 FULL PROPERTY OBJECT:', property);
  
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [fullscreenPhoto, setFullscreenPhoto] = useState(false);
  const [loadedPhotos, setLoadedPhotos] = useState<string[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);

  useEffect(() => {
    if (property.mlsNumber && (!property.photos || property.photos.length <= 1)) {
      setPhotosLoading(true);
      fetch(`/api/repliers/listing/${property.mlsNumber}/image-insights`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (data.images && data.images.length > 0) {
            const urls = data.images
              .map((img: any) => img.fullUrl || img.image || img.url)
              .filter(Boolean);
            if (urls.length > 0) setLoadedPhotos(urls);
          }
        })
        .catch(err => console.error('Failed to load comp photos:', err))
        .finally(() => setPhotosLoading(false));
    }
  }, [property.mlsNumber]);

  // Fetch Mapbox token
  useEffect(() => {
    fetch('/api/mapbox-token')
      .then(res => res.json())
      .then(data => setMapboxToken(data.token))
      .catch(err => console.error('Failed to fetch Mapbox token:', err));
  }, []);

  const photos = loadedPhotos.length > 0 ? loadedPhotos : (property.photos || []);
  
  const handlePrevPhoto = () => {
    setCurrentPhotoIndex(prev => (prev > 0 ? prev - 1 : photos.length - 1));
  };
  
  const handleNextPhoto = () => {
    setCurrentPhotoIndex(prev => (prev < photos.length - 1 ? prev + 1 : 0));
  };
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (fullscreenPhoto) {
          setFullscreenPhoto(false);
        } else {
          onClose();
        }
      }
      if (e.key === 'ArrowLeft' && photos.length > 1) handlePrevPhoto();
      if (e.key === 'ArrowRight' && photos.length > 1) handleNextPhoto();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photos.length, fullscreenPhoto, onClose]);
  
  // Use robust price extraction that checks multiple field names
  const displayPrice = extractPrice(property) ?? 0;
  const displaySqft = extractSqft(property) ?? property.sqft ?? 0;
  const pricePerSqft = property.pricePerSqft || calculatePricePerSqft(property) || 0;
  
  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 z-[80]"
        onClick={onClose}
        data-testid="modal-backdrop"
      />
      
      <div 
        className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 
                   md:w-[80vw] md:max-w-4xl md:max-h-[90vh] md:rounded-xl
                   bg-white shadow-2xl z-[80] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        data-testid="property-detail-modal"
      >
        <div className="flex items-start justify-between p-4 border-b flex-wrap gap-2">
          <div className="min-w-0 flex-1">
            <h2 id="modal-title" className="text-xl font-bold truncate" data-testid="modal-address">
              {property.address}
            </h2>
            <p className="text-sm text-gray-600" data-testid="modal-mls">
              MLS# {property.mlsNumber || property.id}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="flex-shrink-0 min-w-[44px] min-h-[44px]"
            aria-label="Close modal"
            data-testid="button-close-modal"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="relative w-full aspect-video overflow-hidden">
            {photosLoading ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Loading photos...</p>
                </div>
              </div>
            ) : photos.length > 0 && photos[currentPhotoIndex] ? (
              <>
                <div className="cursor-pointer" onClick={() => setFullscreenPhoto(true)}>
                  <SafeImage 
                    src={photos[currentPhotoIndex]} 
                    alt={`${property.address} - Photo ${currentPhotoIndex + 1}`}
                    className="w-full h-full object-contain"
                    data-testid="modal-main-photo"
                  />
                </div>
                
                <button
                  onClick={() => setFullscreenPhoto(true)}
                  className="absolute top-2 right-2 z-10 min-w-[44px] min-h-[44px] bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
                  aria-label="View fullscreen"
                  data-testid="button-expand-photo"
                >
                  <Maximize className="w-5 h-5" />
                </button>
                
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevPhoto}
                      className="absolute left-2 top-1/2 -translate-y-1/2 z-10 min-w-[44px] min-h-[44px] bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
                      aria-label="Previous photo"
                      data-testid="button-prev-photo"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={handleNextPhoto}
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-10 min-w-[44px] min-h-[44px] bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
                      aria-label="Next photo"
                      data-testid="button-next-photo"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                    <div 
                      className="absolute bottom-2 right-2 z-10 bg-black/60 text-white text-sm px-2 py-1 rounded"
                      data-testid="photo-counter"
                    >
                      {currentPhotoIndex + 1} / {photos.length}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-600">
                <div className="text-center">
                  <p className="text-lg">No photos available</p>
                  <p className="text-sm">MLS# {property.mlsNumber || property.id}</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-4 border-t">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <p className="text-3xl font-bold text-gray-900" data-testid="modal-price">
                  {formatCurrency(displayPrice)}
                </p>
                <p className="text-sm text-gray-600" data-testid="modal-price-per-sqft">
                  ${pricePerSqft}/sqft
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900" data-testid="modal-beds-baths">
                  {property.beds} beds • {property.baths} baths
                </p>
                <p className="text-gray-600" data-testid="modal-sqft">
                  {displaySqft.toLocaleString()} sqft
                </p>
              </div>
            </div>
            
            {(property.listPrice || property.originalPrice || property.listDate || property.soldDate) && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg" data-testid="price-history">
                <p className="text-sm font-medium mb-2">Price History & Dates</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    {/* Always show Original Price */}
                    <div>
                      <span className="text-gray-600">Original Price: </span>
                      <span className={property.originalPrice !== property.listPrice ? "line-through text-gray-900" : "text-gray-900"}>
                        {property.originalPrice ? formatCurrency(property.originalPrice) : 'N/A'}
                      </span>
                    </div>
                    {property.listPrice && (
                      <div>
                        <span className="text-gray-600">List Price: </span>
                        <span className="text-gray-900">{formatCurrency(property.listPrice)}</span>
                      </div>
                    )}
                    {property.soldPrice && (
                      <div>
                        <span className="text-gray-600">Sold Price: </span>
                        <span className="text-green-600 font-medium">{formatCurrency(property.soldPrice)}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {/* Safe Listing Date formatting */}
                    {(() => {
                      const listDate = property.listDate || property.listingDate || property.list_date;
                      console.log(`🔍 MODAL LISTING DATE DEBUG - ${property.address}:`, { 
                        listDate: property.listDate, 
                        listingDate: property.listingDate, 
                        list_date: property.list_date,
                        selected: listDate 
                      });
                      if (!listDate) return (
                        <div>
                          <span className="text-gray-600">Listing Date: </span>
                          <span className="text-gray-900">N/A</span>
                        </div>
                      );
                      const date = new Date(listDate);
                      if (isNaN(date.getTime())) return (
                        <div>
                          <span className="text-gray-600">Listing Date: </span>
                          <span className="text-gray-900">Invalid Date</span>
                        </div>
                      );
                      return (
                        <div>
                          <span className="text-gray-600">Listing Date: </span>
                          <span className="text-gray-900">
                            {date.toLocaleDateString('en-US', { 
                              month: '2-digit', 
                              day: '2-digit', 
                              year: 'numeric' 
                            })}
                          </span>
                        </div>
                      );
                    })()}
                    
                    {/* Safe Sold Date formatting */}
                    {(() => {
                      if (!property.soldDate) return null;
                      const date = new Date(property.soldDate);
                      if (isNaN(date.getTime())) return null;
                      return (
                        <div>
                          <span className="text-gray-600">Sold Date: </span>
                          <span className="text-gray-900">
                            {date.toLocaleDateString('en-US', { 
                              month: '2-digit', 
                              day: '2-digit', 
                              year: 'numeric' 
                            })}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-4 border-t">
            <h3 className="text-sm font-medium mb-3 text-gray-600">Property Details</h3>
            
            {/* Two-column layout: Map on left, Specs on right */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Left Column - Map */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-600">Location</h4>
                {mapboxToken && property.latitude && property.longitude ? (
                  <div className="w-full h-48 bg-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+ef4444(${property.longitude},${property.latitude})/${property.longitude},${property.latitude},15,0/400x300@2x?access_token=${mapboxToken}`}
                      alt={`Map showing ${property.address}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <MapPin className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">Map not available</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Right Column - Property Specs */}
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2">Specifications</h4>
                <div className="grid grid-cols-2 gap-4">
            <DetailItem 
              label="Bedrooms" 
              value={property.beds.toString()} 
              icon={<Bed className="w-3 h-3" />}
            />
            <DetailItem 
              label="Bathrooms" 
              value={property.baths.toString()} 
              icon={<Bath className="w-3 h-3" />}
            />
            <DetailItem 
              label="Square Feet" 
              value={property.sqft.toLocaleString()} 
              icon={<Square className="w-3 h-3" />}
            />
            <DetailItem 
              label="Days on Market" 
              value={extractDOM(property)?.toString() || 'N/A'} 
              icon={<Clock className="w-3 h-3" />}
            />
            
            {/* Listing Date */}
            <div className="flex justify-between py-1">
              <span className="text-gray-500">Listing Date:</span>
              <span className="font-medium">
                {property.listDate ? new Date(property.listDate).toLocaleDateString('en-US') : 'N/A'}
              </span>
            </div>
            
            <div data-testid="detail-status">
              <p className="text-sm text-gray-600">Status</p>
              <Badge className={`${getStatusColor(property.status, property.isSubject)} text-white mt-1`}>
                {property.isSubject ? 'Subject' : property.status}
              </Badge>
            </div>
            {property.yearBuilt && (
              <DetailItem 
                label="Year Built" 
                value={property.yearBuilt.toString()} 
                icon={<Calendar className="w-3 h-3" />}
              />
            )}
            {property.garageSpaces && (
              <DetailItem 
                label="Garage Spaces" 
                value={property.garageSpaces.toString()} 
                icon={<Car className="w-3 h-3" />}
              />
            )}
            {(() => {
              if (!property.soldDate) return null;
              const date = new Date(property.soldDate);
              if (isNaN(date.getTime())) return null;
              return (
                <DetailItem 
                  label="Sold Date" 
                  value={date.toLocaleDateString('en-US', { 
                    month: '2-digit', 
                    day: '2-digit', 
                    year: 'numeric' 
                  })} 
                />
              );
            })()}
            {property.lotSize && (
              <DetailItem 
                label="Lot Size" 
                value={`${property.lotSize.toLocaleString()} sqft`} 
              />
            )}
            {property.acres && (
              <DetailItem 
                label="Acres" 
                value={property.acres.toFixed(2)} 
              />
            )}
                </div>
              </div>
            </div>
          </div>
          
          {/* About This Home - IMPROVED STYLING */}
          <div className="mt-6 pt-4 border-t border-gray-200 px-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-gray-300">
              About This Home
            </h3>
            <div className="text-sm text-gray-600 leading-relaxed text-justify space-y-4">
              {(property.description || 'No description available')
                .split(/\n\n|\r\n\r\n/)
                .filter(paragraph => paragraph.trim())
                .map((paragraph, index) => (
                  <p key={index}>{paragraph.trim()}</p>
                ))}
            </div>
          </div>
        </div>
      </div>
      
      {fullscreenPhoto && photos.length > 0 && (
        <div 
          className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
          onClick={() => setFullscreenPhoto(false)}
          data-testid="fullscreen-photo-overlay"
        >
          <button
            onClick={() => setFullscreenPhoto(false)}
            className="absolute top-4 right-4 min-w-[44px] min-h-[44px] bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors z-10"
            aria-label="Close fullscreen"
            data-testid="button-close-fullscreen"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 text-white text-sm rounded-full" data-testid="fullscreen-photo-counter">
            {currentPhotoIndex + 1} / {photos.length}
          </div>
          
          <div onClick={(e) => e.stopPropagation()}>
            <SafeImage 
              src={photos[currentPhotoIndex]} 
              alt={`${property.address} - Photo ${currentPhotoIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
          </div>
          
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevPhoto();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 min-w-[48px] min-h-[48px] bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors"
                aria-label="Previous photo"
                data-testid="button-fullscreen-prev"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextPhoto();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 min-w-[48px] min-h-[48px] bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors"
                aria-label="Next photo"
                data-testid="button-fullscreen-next"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}