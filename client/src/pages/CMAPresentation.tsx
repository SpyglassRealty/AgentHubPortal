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
  const [, params] = useRoute('/transactions/:transactionId/cma-presentation');
  const [, navigate] = useLocation();
  const transactionId = params?.transactionId;

  const [currentSlide, setCurrentSlide] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drawingMode, setDrawingMode] = useState(false);
  const drawingCanvasRef = useRef<DrawingCanvasHandle>(null);

  const handleClearDrawing = () => {
    drawingCanvasRef.current?.clear();
  };

  const handleClose = useCallback(() => {
    navigate(`/transactions/${transactionId}?tab=cma`);
  }, [navigate, transactionId]);

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

  const { data: transaction, isLoading: transactionLoading } = useQuery<any>({
    queryKey: ['/api/transactions', transactionId],
    enabled: !!transactionId,
  });

  const { data: savedCma, isLoading: cmaLoading } = useQuery<Cma>({
    queryKey: ['/api/transactions', transactionId, 'cma'],
    enabled: !!transactionId,
  });

  const { data: agentProfileData, isLoading: profileLoading, error: profileError } = useQuery<{
    profile: {
      headshotUrl?: string;
      title?: string;
      bio?: string;
      phone?: string;
      facebookUrl?: string | null;
      instagramUrl?: string | null;
    } | null;
    user: { 
      firstName?: string; 
      lastName?: string;
      email?: string;
      profileImageUrl?: string;
    } | null;
  }>({
    queryKey: ['/api/agent-profile'],
    staleTime: 0,               // Always consider stale - refetch on mount
    refetchOnMount: true,       // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
    retry: (failureCount, error: any) => {
      // Don't retry on authentication errors
      if (error?.response?.status === 401) {
        console.log('[Agent Profile] 401 - redirecting to login');
        window.location.href = '/api/login';
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: 1000,           // Delay between retries
  });

  // Debug logging for agent profile data
  console.log('[CMA Debug] Agent profile API response:', {
    data: agentProfileData,
    loading: profileLoading,
    error: profileError,
    hasProfile: !!agentProfileData?.profile,
    hasUser: !!agentProfileData?.user,
  });

  const agentProfile = useMemo(() => {
    console.log('[CMA Debug] Building agentProfile from data:', agentProfileData);
    
    if (!agentProfileData) {
      console.log('[CMA Debug] No agentProfileData, returning defaults');
      return { name: '', company: 'Spyglass Realty', phone: '', email: '', photo: '', bio: '', title: '' };
    }
    
    const { profile, user } = agentProfileData;
    const displayName = user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 
       (user?.firstName || 'Agent');
    
    const result = {
      name: displayName,
      company: 'Spyglass Realty',
      phone: profile?.phone || '',
      email: user?.email || '',
      photo: profile?.headshotUrl || user?.profileImageUrl || '',
      title: profile?.title || '',
      bio: profile?.bio || '',
    };
    
    console.log('[CMA Debug] Final agentProfile result:', result);
    return result;
  }, [agentProfileData]);

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
    const cmaPropertiesData = (savedCma?.propertiesData || []) as any[];
    const transactionCmaData = (transaction?.cmaData || []) as any[];
    
    // Create lookup maps from transaction.cmaData by mlsNumber for coordinates and status
    // This ensures we always use the LATEST status from MLS sync, even if savedCma has stale data
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
      
      // Always store the latest status from transaction.cmaData
      statusLookup.set(comp.mlsNumber, {
        status: comp.status || comp.standardStatus || '',
        lastStatus: comp.lastStatus || ''
      });
    });
    
    // Prefer CMA propertiesData if available, otherwise use transaction.cmaData
    const rawComparables = cmaPropertiesData.length > 0 ? cmaPropertiesData : transactionCmaData;
    
    return (rawComparables as any[]).map((comp: any, index: number) => {
      const resolvedAddress = comp.unparsedAddress || comp.streetAddress || comp.address || 
        comp.fullAddress || comp.addressLine1 || comp.location?.address || '';
      
      const parsedSqft = typeof comp.sqft === 'string' ? parseFloat(comp.sqft) : (comp.sqft || comp.livingArea || 0);
      const parsedBeds = typeof comp.bedrooms === 'string' ? parseInt(comp.bedrooms) : (comp.bedrooms || comp.beds || comp.bedroomsTotal || 0);
      const parsedBaths = typeof comp.bathrooms === 'string' ? parseFloat(comp.bathrooms) : (comp.bathrooms || comp.baths || comp.bathroomsTotal || 0);
      const parsedPrice = comp.listPrice || comp.price || comp.closePrice || 0;

      // Debug logging for photo fields
      if (index === 0) {
        console.log('[CMA Debug] First comp photo fields:', {
          photos: comp.photos,
          images: comp.images,
          photo: comp.photo,
          imageUrl: comp.imageUrl,
          allFields: Object.keys(comp),
        });
      }
      
      // First try to get coordinates from the comp itself
      let lat = comp.latitude || comp.lat || comp.map?.latitude || comp.map?.lat || 
        comp.coordinates?.latitude || comp.coordinates?.lat || comp.geo?.lat;
      let lng = comp.longitude || comp.lng || comp.map?.longitude || comp.map?.lng || 
        comp.coordinates?.longitude || comp.coordinates?.lng || comp.geo?.lng;
      
      // If no coordinates and we have mlsNumber, try to get from transaction.cmaData
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
      
      // Get status from the latest transaction.cmaData if available (via lookup), 
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
          // Handle multiple Repliers photo field formats
          if (comp.photos && Array.isArray(comp.photos) && comp.photos.length > 0) {
            const result = comp.photos;
            if (index === 0) console.log('[CMA Debug] Using comp.photos:', result);
            return result;
          }
          // Handle Repliers images array with CDN prefix
          if (comp.images && Array.isArray(comp.images) && comp.images.length > 0) {
            const result = comp.images.map((img: string) => 
              img.startsWith('http') ? img : `https://cdn.repliers.io/${img}`
            );
            if (index === 0) console.log('[CMA Debug] Using comp.images with CDN:', result);
            return result;
          }
          // Handle singular photo field from current API
          if (comp.photo && typeof comp.photo === 'string') {
            const result = [comp.photo];
            if (index === 0) console.log('[CMA Debug] Using comp.photo (singular):', result);
            return result;
          }
          // Handle imageUrl fallback
          if (comp.imageUrl && typeof comp.imageUrl === 'string') {
            const result = [comp.imageUrl];
            if (index === 0) console.log('[CMA Debug] Using comp.imageUrl:', result);
            return result;
          }
          if (index === 0) console.log('[CMA Debug] No photos found, returning empty array');
          return [];
        })(),
        map: lat && lng ? { latitude: lat, longitude: lng } : null,
        latitude: lat,
        longitude: lng,
      };
    });
  }, [savedCma?.propertiesData, transaction?.cmaData, normalizeStatusWithLastStatus]);

  const subjectProperty = useMemo(() => {
    const rawSubject = transaction?.mlsData as any;
    if (!rawSubject) return undefined;
    
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
  }, [transaction?.mlsData, normalizeStatusWithLastStatus]);

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

  const isLoading = transactionLoading || cmaLoading || profileLoading;

  // Debug: Add direct API test and auth check on component mount
  useEffect(() => {
    const testAuthAndAPI = async () => {
      try {
        // First check authentication status
        console.log('[CMA Debug] Checking authentication status...');
        const authResponse = await fetch('/api/debug/auth-status');
        const authData = await authResponse.json();
        console.log('[CMA Debug] Auth status:', authData);
        
        // Then test the agent profile API
        console.log('[CMA Debug] Testing direct fetch to /api/agent-profile...');
        const response = await fetch('/api/agent-profile');
        const data = await response.json();
        console.log('[CMA Debug] Direct fetch result:', { 
          url: '/api/agent-profile',
          status: response.status, 
          statusText: response.statusText,
          data 
        });
        
        if (!response.ok) {
          console.error('[CMA Debug] API returned error:', response.status, data);
          if (response.status === 401) {
            console.log('[CMA Debug] Authentication required - user needs to login');
          }
        }
      } catch (error) {
        console.error('[CMA Debug] Test failed:', error);
      }
    };
    
    // Test auth and API on mount
    testAuthAndAPI();
  }, []);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground">Loading presentation...</p>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Transaction not found</p>
        </div>
      </div>
    );
  }

  // Debug: Display agent profile error if any
  if (profileError) {
    console.error('[CMA Debug] Agent profile error:', profileError);
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
        propertyAddress={transaction.propertyAddress || 'Property Address'}
        mlsNumber={transaction.mlsNumber || ''}
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
