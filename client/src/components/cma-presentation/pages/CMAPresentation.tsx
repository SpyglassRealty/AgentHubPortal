import { useState, useEffect, useCallback, useMemo } from 'react';
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
import type { Cma, AgentProfile } from '@shared/schema';

export default function CMAPresentation() {
  const [, params] = useRoute('/cma/:id/cma-presentation');
  const [, navigate] = useLocation();
  const id = params?.id;

  const [currentSlide, setCurrentSlide] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drawingMode, setDrawingMode] = useState(false);
  const drawingCanvasRef = useRef<DrawingCanvasHandle>(null);

  const handleClearDrawing = () => {
    drawingCanvasRef.current?.clear();
  };

  const handleClose = useCallback(() => {
    navigate(`/cma/${id}`);
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

  const { data: cmaData, isLoading: cmaLoading, error: cmaError } = useQuery({
    queryKey: ['/api/cma', id],
    queryFn: async () => {
      if (!id) throw new Error('No CMA ID provided');
      const res = await fetch('/api/cma/' + id, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 404) throw new Error('CMA not found');
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error(`Failed to fetch CMA: ${res.status}`);
      }
      return res.json();
    },
    enabled: !!id,
  });

  // REMOVED: savedCma query - using cmaData instead

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
    // Safely access cmaData with null guards
    if (!cmaData || typeof cmaData !== 'object') {
      console.warn('[CMA Debug] No cmaData or invalid data structure');
      return [];
    }
    
    const cmaPropertiesData = Array.isArray(cmaData?.comparableProperties) ? cmaData.comparableProperties : [];
    const transactionCmaData = Array.isArray(cmaData?.comparableProperties) ? cmaData.comparableProperties : [];
    
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
          
          // PRIMARY: API returns 'photo' field (singular string, full CDN URL)
          // Based on Daryl's live API analysis: comp.photo = "https://cdn.repliers.io/..."
          if (comp.photo && typeof comp.photo === 'string' && comp.photo.trim().length > 0) {
            const result = [comp.photo];
            if (index === 0) console.log('[CMA Debug] Using API comp.photo (actual field):', result);
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
          const otherPhotoFields = ['imageUrl', 'primaryPhoto', 'coverPhoto'];
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
    });
  }, [cmaData?.comparableProperties, normalizeStatusWithLastStatus]);

  const subjectProperty = useMemo(() => {
    if (!cmaData || typeof cmaData !== 'object') {
      return null;
    }
    
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
        listPrice: suggestedListPrice || 0,
        price: suggestedListPrice || 0,
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

  const isLoading = profileLoading || cmaLoading;

  // Error states
  if (cmaError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-6">
          <div className="text-red-500 mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Error Loading CMA</h2>
          <p className="text-muted-foreground mb-4">
            {cmaError?.message || "Failed to load CMA data"}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (profileError) {
    console.warn('Profile error:', profileError);
    // Continue with empty profile rather than failing completely
  }

  // Loading states
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground">Loading CMA presentation...</p>
        </div>
      </div>
    );
  }

  // Check for missing required data
  if (!id) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">No CMA ID provided</p>
        </div>
      </div>
    );
  }

  if (!cmaData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">CMA data not found</p>
        </div>
      </div>
    );
  }

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