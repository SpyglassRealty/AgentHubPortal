import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/cma-presentation/components/Header';
import { Sidebar } from '@/components/cma-presentation/components/Sidebar';
import { SectionGrid } from '@/components/cma-presentation/components/SectionGrid';
import { SlideViewer } from '@/components/cma-presentation/components/SlideViewer';
import { BottomNavigation } from '@/components/cma-presentation/components/BottomNavigation';
import { DrawingCanvas, type DrawingCanvasHandle } from '@/components/cma-presentation/components/DrawingCanvas';
import { WIDGETS } from '@/components/cma-presentation/constants/widgets';
import { Loader2 } from 'lucide-react';
import { useRef } from 'react';
import type { Transaction, Cma, AgentProfile } from '@shared/schema';

// Error Boundary Component
class CMAErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[CMA Presentation] Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center max-w-md p-8">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-4">
              The CMA presentation encountered an error and couldn't load properly.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Error: {this.state.error?.message || 'Unknown error'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-[#EF4923] text-white rounded-lg hover:bg-[#d94420] transition-colors mr-4"
            >
              Reload Page
            </button>
            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// WRAPPER - handles data fetching and guards
function CmaPresentationPage() {
  const [, params] = useRoute('/cma/:id/cma-presentation');
  const id = params?.id;

  const { data: cmaData, isLoading, error } = useQuery({
    queryKey: ['cma-presentation', id],
    queryFn: async () => {
      const res = await fetch(`/api/cma/${id}`);
      if (!res.ok) throw new Error('Failed to load CMA');
      return res.json();
    },
    enabled: !!id,
  });

  // SAFE to early return here - no hooks below
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-3">Loading presentation...</span>
      </div>
    );
  }

  if (error || !cmaData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <h2 className="text-xl font-semibold text-red-600">CMA Not Found</h2>
        <p>Could not load presentation data.</p>
        <button 
          onClick={() => window.location.href = '/cma'}
          className="px-4 py-2 bg-[#EF4923] text-white rounded hover:bg-[#d94420]"
        >
          Back to CMA
        </button>
      </div>
    );
  }

  // Only render inner component AFTER data is confirmed available
  return <CmaPresentationInner cmaData={cmaData} id={id} />;
}

// INNER - has all the useMemo, useState, useEffect hooks
// cmaData is GUARANTEED to exist here
function CmaPresentationInner({ cmaData, id }: { cmaData: any; id: string }) {
  const [, navigate] = useLocation();

  // Now it's safe to use other hooks since we have guaranteed data
  const [currentSlide, setCurrentSlide] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drawingMode, setDrawingMode] = useState(false);
  const drawingCanvasRef = useRef<DrawingCanvasHandle>(null);

  const handleClearDrawing = () => {
    drawingCanvasRef.current?.clear();
  };

  const handleClose = useCallback(() => {
    // If user navigated directly to this URL, there might not be a history stack
    // Try to go back first, then fallback to CMA dashboard
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate(`/cma/${id}`);
    }
  }, [navigate, id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (drawingMode) {
          setDrawingMode(false);
        } else if (currentSlide !== null) {
          setCurrentSlide(null);
        } else if (sidebarOpen) {
          setSidebarOpen(false);
        } else {
          handleClose();
        }
      } else if (currentSlide !== null && !drawingMode) {
        if (e.key === 'ArrowLeft' && currentSlide > 0) {
          setCurrentSlide(currentSlide - 1);
        } else if (e.key === 'ArrowRight' && currentSlide < WIDGETS.length - 1) {
          setCurrentSlide(currentSlide + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, sidebarOpen, drawingMode, handleClose]);

  // Agent profile query
  const { data: agentProfileData, isLoading: profileLoading, error: profileError } = useQuery<{
    profile: {
      id?: string;
      userId?: string;
      title?: string;
      headshotUrl?: string;
      bio?: string;
      defaultCoverLetter?: string;
      marketingCompany?: string;
      marketingTitle?: string;
      marketingPhone?: string;
      marketingEmail?: string;
      phone?: string;
    } | null;
    user: { 
      id: string;
      firstName?: string; 
      lastName?: string;
      profileImageUrl?: string;
      email?: string;
    } | null;
  }>({
    queryKey: ['/api/agent-profile'],
    queryFn: async () => {
      console.log('[CMA Debug] Fetching agent profile from /api/agent-profile...');
      const res = await fetch('/api/agent-profile', { credentials: 'include' });
      console.log('[CMA Debug] Agent profile response:', res.status, res.statusText);
      if (!res.ok) throw new Error('Failed to fetch agent profile');
      const data = await res.json();
      console.log('[CMA Debug] Agent profile data received:', data);
      return data;
    },
    staleTime: 0,               // Always consider stale - refetch on mount
    refetchOnMount: true,       // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
    retry: (failureCount, error: any) => {
      console.log('[CMA Debug] Agent profile query failed:', error);
      return failureCount < 3;
    },
  });

  // Debug logging for agent profile data
  console.log('[CMA Debug] Agent profile state:', {
    data: agentProfileData,
    loading: profileLoading,
    error: profileError,
    hasProfile: !!agentProfileData?.profile,
    hasUser: !!agentProfileData?.user,
  });

  const agentProfile = useMemo(() => {
    console.log('[CMA Debug] Building agent profile from data:', agentProfileData);
    
    if (!agentProfileData) {
      console.log('[CMA Debug] No agent profile data, using defaults');
      return { 
        name: 'Agent Name', 
        company: 'Spyglass Realty', 
        phone: '', 
        email: '', 
        photo: '', 
        bio: 'Professional bio will be displayed here once you complete your agent profile.',
        title: 'Licensed Real Estate Agent'
      };
    }
    
    const { profile, user } = agentProfileData;
    console.log('[CMA Debug] Raw profile object:', profile);
    console.log('[CMA Debug] Raw user object:', user);
    console.log('[CMA Debug] Profile fields available:', profile ? Object.keys(profile) : []);
    console.log('[CMA Debug] User fields available:', user ? Object.keys(user) : []);
    
    // Build display name with multiple fallbacks
    const displayName = (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 
       user?.firstName || 
       user?.email?.split('@')[0] || 
       'Agent');
    
    // Build phone with fallbacks
    const phone = profile?.marketingPhone || profile?.phone || '';
    
    // Build email with fallbacks  
    const email = profile?.marketingEmail || user?.email || '';
    
    // Build photo URL with fallbacks
    const photo = profile?.headshotUrl || user?.profileImageUrl || '';
    
    // Build title with fallbacks
    const title = profile?.marketingTitle || profile?.title || 'Licensed Real Estate Agent';
    
    // Build company name
    const company = profile?.marketingCompany || 'Spyglass Realty';
    
    // Build bio (placeholder for Stage 2)
    const bio = profile?.bio || profile?.defaultCoverLetter || 'Experienced real estate professional dedicated to helping clients buy and sell properties in the Austin area.';
    
    const result = {
      name: displayName,
      company,
      phone,
      email,
      photo,
      title,
      bio,
    };
    
    console.log('[CMA Debug] Final agent profile result:', {
      name: result.name,
      hasPhoto: !!result.photo,
      photoLength: result.photo?.length || 0,
      email: result.email,
      title: result.title,
      hasBio: !!result.bio,
      bioLength: result.bio?.length || 0,
      phone: result.phone,
      company: result.company
    });
    return result;
  }, [agentProfileData]);

  // Debug: Direct API test on component mount
  useEffect(() => {
    const testAPI = async () => {
      try {
        console.log('[CMA Debug] Testing direct API calls...');
        
        // Test agent profile API
        const agentResponse = await fetch('/api/agent-profile');
        const agentData = await agentResponse.json();
        console.log('[CMA Debug] Direct agent profile API test:', {
          status: agentResponse.status,
          statusText: agentResponse.statusText,
          data: agentData
        });
        
        // Test auth status
        const authResponse = await fetch('/api/debug/auth-status');
        if (authResponse.ok) {
          const authData = await authResponse.json();
          console.log('[CMA Debug] Auth status:', authData);
        }
      } catch (error) {
        console.error('[CMA Debug] API tests failed:', error);
      }
    };
    
    testAPI();
  }, []);

  // Normalize status checking both status and lastStatus fields
  // Per RESO Standard: Sale statuses (Active/Pending/Closed) vs Rental statuses (Leasing)
  // lastStatus="Sld" indicates a sold property, "Lsd" indicates leased (rental)
  const normalizeStatusWithLastStatus = useCallback((status: string | undefined | null, lastStatus: string | undefined | null): string => {
    // First check lastStatus for leasing vs sold distinction
    if (lastStatus) {
      const ls = lastStatus.toLowerCase();
      // Lsd = Leased (rental property completed) - distinct from sale "Closed"
      if (ls === 'lsd' || ls === 'leased' || ls.includes('leased') || ls.includes('lease')) {
        return 'Leasing';
      }
      // Sld = Sold (sale completed) - this is "Closed"
      if (ls === 'sld' || ls === 'sold' || ls === 's' || ls.includes('sold') || ls.includes('closed')) {
        return 'Closed';
      }
    }
    
    // Then check the primary status field
    if (!status) return 'Active';
    const s = status.toLowerCase();
    
    // Check for leasing/rental statuses first
    if (s.includes('leasing') || s.includes('for rent') || s.includes('rental') || s === 'lease') {
      return 'Leasing';
    }
    if (s === 'u' || s === 'sc' || s.includes('pending') || s.includes('contract')) return 'Pending';
    if (s === 'a' || s.includes('active')) return 'Active';
    if (s === 'c' || s === 's' || s.includes('sold') || s.includes('closed')) return 'Closed';
    if (s.includes('expired') || s.includes('withdrawn') || s.includes('cancel')) return 'Off Market';
    return status;
  }, []);

  const presentationComparables = useMemo(() => {
    const cmaPropertiesData = (cmaData?.comparableProperties || []) as any[];
    const transactionCmaData = (cmaData?.comparableProperties || []) as any[];
    
    // Create lookup maps from cmaData.comparableProperties by mlsNumber for coordinates and status
    // This ensures we always use the LATEST status from MLS sync
    const coordinateLookup = new Map<string, { lat: number; lng: number }>();
    const statusLookup = new Map<string, { status: string; lastStatus: string }>();
    
    transactionCmaData.forEach((comp: any) => {
      if (!comp.mlsNumber) return;
      
      const lat = comp.latitude || comp.lat || comp.map?.latitude || comp.map?.lat || 
        comp.coordinates?.latitude || comp.coordinates?.lat || comp.geo?.lat;
      const lng = comp.longitude || comp.lng || comp.map?.longitude || comp.map?.lng || 
        comp.coordinates?.longitude || comp.coordinates?.lng || comp.geo?.lng;
      if (lat && lng) {
        coordinateLookup.set(comp.mlsNumber, { lat, lng });
      }
      
      // Always store the latest status from cmaData.comparableProperties
      statusLookup.set(comp.mlsNumber, {
        status: comp.status || comp.standardStatus || '',
        lastStatus: comp.lastStatus || ''
      });
    });
    
    // Prefer CMA propertiesData if available, otherwise use comparableProperties
    const rawComparables = cmaPropertiesData.length > 0 ? cmaPropertiesData : transactionCmaData;
    
    return (rawComparables as any[]).map((comp: any, index: number) => {
      const resolvedAddress = comp.unparsedAddress || comp.streetAddress || comp.address || 
        comp.fullAddress || comp.addressLine1 || comp.location?.address || '';
      
      const parsedSqft = typeof comp.sqft === 'string' ? parseFloat(comp.sqft) : (comp.sqft || comp.livingArea || 0);
      const parsedBeds = typeof comp.bedrooms === 'string' ? parseInt(comp.bedrooms) : (comp.bedrooms || comp.beds || comp.bedroomsTotal || 0);
      const parsedBaths = typeof comp.bathrooms === 'string' ? parseFloat(comp.bathrooms) : (comp.bathrooms || comp.baths || comp.bathroomsTotal || 0);
      const parsedPrice = comp.listPrice || comp.price || comp.closePrice || 0;
      
      // First try to get coordinates from the comp itself
      let lat = comp.latitude || comp.lat || comp.map?.latitude || comp.map?.lat || 
        comp.coordinates?.latitude || comp.coordinates?.lat || comp.geo?.lat;
      let lng = comp.longitude || comp.lng || comp.map?.longitude || comp.map?.lng || 
        comp.coordinates?.longitude || comp.coordinates?.lng || comp.geo?.lng;
      
      // If no coordinates and we have mlsNumber, try to get from comparableProperties
      if ((!lat || !lng) && comp.mlsNumber) {
        const fallbackCoords = coordinateLookup.get(comp.mlsNumber);
        if (fallbackCoords) {
          lat = fallbackCoords.lat;
          lng = fallbackCoords.lng;
        }
      }
      
      const lotAcres = comp.lotSizeAcres ?? comp.lot?.acres ?? 
        (comp.lotSizeSquareFeet ? comp.lotSizeSquareFeet / 43560 : null) ??
        (comp.lotSize && comp.lotSize > 100 ? comp.lotSize / 43560 : comp.lotSize) ?? null;
      
      // Get status from the latest comparableProperties if available (via lookup), 
      // otherwise fall back to the comp's own status fields
      const freshStatus = comp.mlsNumber ? statusLookup.get(comp.mlsNumber) : null;
      const statusToUse = freshStatus?.status || comp.status || comp.standardStatus || '';
      const lastStatusToUse = freshStatus?.lastStatus || comp.lastStatus || '';
      
      // Get normalized status using both status and lastStatus fields
      const normalizedStatus = normalizeStatusWithLastStatus(statusToUse, lastStatusToUse);
      
      return {
        id: comp.mlsNumber || `comp-${index}`,
        mlsNumber: comp.mlsNumber || '',
        unparsedAddress: resolvedAddress,
        streetAddress: resolvedAddress,
        address: resolvedAddress,
        city: comp.city || comp.location?.city || '',
        listPrice: parsedPrice,
        closePrice: comp.closePrice || comp.soldPrice,
        standardStatus: normalizedStatus,
        status: normalizedStatus,
        bedroomsTotal: parsedBeds,
        beds: parsedBeds,
        bathroomsTotal: parsedBaths,
        baths: parsedBaths,
        livingArea: parsedSqft,
        sqft: parsedSqft,
        lotSizeAcres: lotAcres,
        daysOnMarket: comp.daysOnMarket || comp.dom || 0,
        
        // CRITICAL: Add missing fields that were being dropped during transformation
        description: comp.description || comp.remarks || comp.publicRemarks || null,
        listDate: comp.listDate || null,
        soldDate: comp.soldDate || null, 
        originalPrice: comp.originalPrice || null,
        
        photos: (() => {
          // Based on official Repliers API reference:
          // 1. Photos come from 'images' field as fully qualified URLs
          // 2. Order matters (first = cover photo)  
          // 3. Sold listings may have reduced photo count
          // 4. Handle empty arrays gracefully (MLS compliance)
          
          // Debug first comp
          if (index === 0) {
            console.log('[CMA Debug] First comp photo fields analysis:', {
              hasImages: !!comp.images,
              imagesCount: Array.isArray(comp.images) ? comp.images.length : 0,
              imagesPreview: Array.isArray(comp.images) ? comp.images.slice(0, 2) : null,
              hasPhotos: !!comp.photos,
              photosCount: Array.isArray(comp.photos) ? comp.photos.length : 0,
              hasSinglePhoto: !!comp.photo,
              hasImageUrl: !!comp.imageUrl,
              mlsNumber: comp.mlsNumber,
              status: comp.status || comp.standardStatus,
              allPhotoFields: Object.keys(comp).filter(k => 
                k.toLowerCase().includes('image') || 
                k.toLowerCase().includes('photo')
              ),
              firstFewFields: Object.keys(comp).slice(0, 10)
            });
          }
          
          // PRIMARY: Database 'imageUrl' field (every property has one!)
          if (comp.imageUrl && typeof comp.imageUrl === 'string' && comp.imageUrl.trim().length > 0) {
            const result = [comp.imageUrl];
            if (index === 0) console.log('[CMA Debug] Using DB imageUrl (primary):', result);
            return result;
          }
          
          // SECONDARY: API returns 'photo' field (singular string, full CDN URL)
          if (comp.photo && typeof comp.photo === 'string' && comp.photo.trim().length > 0) {
            const result = [comp.photo];
            if (index === 0) console.log('[CMA Debug] Using API comp.photo (secondary):', result);
            return result;
          }
          
          // FALLBACK: Repliers 'images' field (if exists)
          if (comp.images && Array.isArray(comp.images) && comp.images.length > 0) {
            const validImages = comp.images.filter((url: string) => 
              url && typeof url === 'string' && url.trim().length > 0
            );
            if (index === 0) console.log('[CMA Debug] Using comp.images fallback:', validImages);
            return validImages;
          }
          
          // FALLBACK: Legacy 'photos' field (if exists)
          if (comp.photos && Array.isArray(comp.photos) && comp.photos.length > 0) {
            const validPhotos = comp.photos.filter((url: string) => 
              url && typeof url === 'string' && url.trim().length > 0
            );
            if (index === 0) console.log('[CMA Debug] Using legacy comp.photos:', validPhotos);
            return validPhotos;
          }
          
          // FALLBACK: Other single photo fields
          const otherPhotoFields = ['primaryPhoto', 'coverPhoto'];
          for (const field of otherPhotoFields) {
            if (comp[field] && typeof comp[field] === 'string' && comp[field].trim().length > 0) {
              const result = [comp[field]];
              if (index === 0) console.log(`[CMA Debug] Using fallback ${field}:`, result);
              return result;
            }
          }
          
          // No photos found - this is normal for some sold listings per Repliers reference
          if (index === 0) console.log('[CMA Debug] No photos found (normal for some sold listings)');
          return [];
        })(),
        map: lat && lng ? { latitude: lat, longitude: lng } : null,
        latitude: lat,
        longitude: lng,
      };
    }).map((transformedComp, index) => {
      // DEBUG: Log first comp to verify fields are preserved
      if (index === 0) {
        console.log('🔍 FRONTEND TRANSFORMATION DEBUG - First comp after transformation:', {
          mlsNumber: transformedComp.mlsNumber,
          originalPrice: transformedComp.originalPrice,
          listDate: transformedComp.listDate, 
          description: transformedComp.description,
          hasFields: {
            originalPrice: !!transformedComp.originalPrice,
            listDate: !!transformedComp.listDate,
            description: !!transformedComp.description,
          }
        });
      }
      return transformedComp;
    });
  }, [cmaData?.comparableProperties, normalizeStatusWithLastStatus]);

  const subjectProperty = useMemo(() => {
    const rawSubject = cmaData?.subjectProperty as any;
    if (!rawSubject) {
      // Construct minimal subject from CMA name when subjectProperty is null in DB
      return {
        address: cmaData?.name || 'Subject Property',
        unparsedAddress: cmaData?.name || 'Subject Property',
        streetAddress: cmaData?.name || 'Subject Property',
        beds: 0,
        bedroomsTotal: 0,
        baths: 0,
        bathroomsTotal: 0,
        sqft: 0,
        livingArea: 0,
        standardStatus: 'Active',
        mlsNumber: '',
        listPrice: 0, // Remove circular dependency - will be set later
        price: 0, // Remove circular dependency - will be set later
      } as any;
    }
    
    return {
      ...rawSubject,
      unparsedAddress: rawSubject.address || rawSubject.unparsedAddress || rawSubject.streetAddress || '',
      streetAddress: rawSubject.address || rawSubject.streetAddress || rawSubject.unparsedAddress || '',
      address: rawSubject.address || rawSubject.unparsedAddress || rawSubject.streetAddress || '',
      bedroomsTotal: rawSubject.bedroomsTotal || rawSubject.bedrooms || 0,
      beds: rawSubject.bedroomsTotal || rawSubject.bedrooms || 0,
      bathroomsTotal: rawSubject.bathroomsTotal || rawSubject.bathrooms || 0,
      baths: rawSubject.bathroomsTotal || rawSubject.bathrooms || 0,
      livingArea: typeof rawSubject.sqft === 'string' ? parseFloat(rawSubject.sqft) : (rawSubject.sqft || rawSubject.livingArea || 0),
      sqft: typeof rawSubject.sqft === 'string' ? parseFloat(rawSubject.sqft) : (rawSubject.sqft || rawSubject.livingArea || 0),
      standardStatus: normalizeStatusWithLastStatus(rawSubject.standardStatus || rawSubject.status, rawSubject.lastStatus),
      latitude: rawSubject.latitude || rawSubject.coordinates?.latitude,
      longitude: rawSubject.longitude || rawSubject.coordinates?.longitude,
      map: rawSubject.map || (rawSubject.coordinates?.latitude && rawSubject.coordinates?.longitude ? 
        { latitude: rawSubject.coordinates.latitude, longitude: rawSubject.coordinates.longitude } : null),
    };
  }, [cmaData?.subjectProperty, normalizeStatusWithLastStatus]);

  const averageDaysOnMarket = useMemo(() => {
    if (!presentationComparables.length) return 30;
    const total = presentationComparables.reduce((sum: number, c: any) => sum + (c.daysOnMarket || 0), 0);
    return Math.round(total / presentationComparables.length);
  }, [presentationComparables]);

  const suggestedListPrice = useMemo(() => {
    if (!presentationComparables.length) return null;
    const prices = presentationComparables.map((c: any) => c.listPrice || c.closePrice || 0).filter(Boolean);
    if (!prices.length) return null;
    return Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length);
  }, [presentationComparables]);

  const avgPricePerAcre = useMemo(() => {
    const compsWithAcres = presentationComparables.filter((c: any) => c.lotSizeAcres && c.lotSizeAcres > 0);
    if (!compsWithAcres.length) return null;
    const total = compsWithAcres.reduce((sum: number, c: any) => {
      const price = c.closePrice || c.listPrice || 0;
      return sum + (price / c.lotSizeAcres);
    }, 0);
    return Math.round(total / compsWithAcres.length);
  }, [presentationComparables]);

  // Agent profile loading is handled separately - we can show the CMA even if profile is still loading

  if (currentSlide !== null) {
    const prevTitle = currentSlide > 0 ? WIDGETS[currentSlide - 1].title : null;
    const nextTitle = currentSlide < WIDGETS.length - 1 ? WIDGETS[currentSlide + 1].title : null;

    return (
      <>
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          widgets={WIDGETS}
          onSelectWidget={(index) => {
            setCurrentSlide(index);
            setSidebarOpen(false);
          }}
          currentWidget={currentSlide}
          compsCount={presentationComparables.length}
        />
        <SlideViewer
          currentIndex={currentSlide}
          onClose={() => setCurrentSlide(null)}
          onPrev={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
          onNext={() => setCurrentSlide(Math.min(WIDGETS.length - 1, currentSlide + 1))}
          onHome={() => setCurrentSlide(null)}
          onMenuClick={() => setSidebarOpen(true)}
          agent={agentProfile}
          comparables={presentationComparables as any}
          subjectProperty={subjectProperty as any}
          averageDaysOnMarket={averageDaysOnMarket}
          suggestedListPrice={suggestedListPrice}
        />
        <BottomNavigation
          mode="slide"
          currentSlide={currentSlide}
          totalSlides={WIDGETS.length}
          prevSlideTitle={prevTitle}
          nextSlideTitle={nextTitle}
          onPrevious={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
          onNext={() => setCurrentSlide(Math.min(WIDGETS.length - 1, currentSlide + 1))}
          onHome={() => setCurrentSlide(null)}
          onToggleDrawing={() => setDrawingMode(!drawingMode)}
          onClearDrawing={handleClearDrawing}
          isDrawingMode={drawingMode}
        />
        <DrawingCanvas ref={drawingCanvasRef} isActive={drawingMode} onClose={() => setDrawingMode(false)} />
      </>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col bg-background touch-manipulation"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
      data-testid="cma-presentation-page"
    >
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        widgets={WIDGETS}
        onSelectWidget={(index) => {
          setCurrentSlide(index);
          setSidebarOpen(false);
        }}
        currentWidget={currentSlide ?? undefined}
        compsCount={presentationComparables.length}
        daysOnMarket={averageDaysOnMarket}
        suggestedListPrice={suggestedListPrice}
        avgPricePerAcre={avgPricePerAcre}
      />

      <Header
        propertyAddress={cmaData?.subjectProperty?.address || cmaData?.name || 'Property Address'}
        mlsNumber={cmaData?.subjectProperty?.mlsNumber || ''}
        agent={agentProfile}
        onMenuClick={() => setSidebarOpen(true)}
        onClose={handleClose}
        latitude={subjectProperty?.latitude}
        longitude={subjectProperty?.longitude}
        comparables={presentationComparables as any}
        subjectProperty={subjectProperty as any}
        averageDaysOnMarket={averageDaysOnMarket}
        suggestedListPrice={suggestedListPrice}
        avgPricePerAcre={avgPricePerAcre}
      />

      <div className="flex-1 overflow-auto bg-muted/30 pb-16">
        <SectionGrid
          widgets={WIDGETS}
          onSelectWidget={setCurrentSlide}
          compsCount={presentationComparables.length}
          daysOnMarket={averageDaysOnMarket}
          suggestedListPrice={suggestedListPrice}
          avgPricePerAcre={avgPricePerAcre}
          agent={agentProfile}
        />
      </div>

      <BottomNavigation
        mode="home"
        onStartPresentation={() => setCurrentSlide(0)}
        onToggleDrawing={() => setDrawingMode(!drawingMode)}
        onClearDrawing={handleClearDrawing}
        isDrawingMode={drawingMode}
      />
      
      <DrawingCanvas ref={drawingCanvasRef} isActive={drawingMode} onClose={() => setDrawingMode(false)} />
    </div>
  );
}

// Export wrapped with ErrorBoundary
export default function CMAPresentationWithErrorBoundary() {
  return (
    <CMAErrorBoundary>
      <CmaPresentationPage />
    </CMAErrorBoundary>
  );
}