import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { pdf } from '@react-pdf/renderer';
import { useAuth } from '@/hooks/useAuth';
import { CMAPdfDocument } from './CMAPdfDocument';
import { CMA_REPORT_SECTIONS } from '@shared/cma-sections';
import type { CMAReportData } from '@shared/cma-sections';
import type { CoverPageConfig } from '@shared/schema';

interface CMAReportDownloadButtonProps {
  cma: {
    name?: string;
    subjectProperty: any;
    comparableProperties: any[];
    notes?: string;
  };
  disabled?: boolean;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function CMAReportDownloadButton({ cma, disabled = false }: CMAReportDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: agentProfile } = useQuery<{ phone?: string; title?: string; bio?: string }>({
    queryKey: ['/api/agent-profile'],
    queryFn: async () => {
      const res = await fetch('/api/agent-profile', { credentials: 'include' });
      if (!res.ok) return {};
      return res.json();
    },
  });

  const isDisabled = disabled || !cma.comparableProperties?.length || isGenerating;

  const handleDownload = async () => {
    if (!cma.subjectProperty) {
      toast({ title: 'No subject property', description: 'Set a subject property first.', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    try {
      toast({ title: 'Generating PDF', description: 'Building your CMA report...' });

      const sub = cma.subjectProperty;
      const comps = cma.comparableProperties;

      // Map subject property
      const subjectProperty: CMAReportData['subjectProperty'] = {
        address: sub.address || sub.streetAddress || '',
        city: sub.city || '',
        state: sub.state || '',
        zip: sub.zip || '',
        mlsNumber: sub.mlsNumber || '',
        listPrice: sub.listPrice || 0,
        bedrooms: sub.beds || sub.bedrooms || 0,
        bathrooms: sub.baths || sub.bathrooms || 0,
        sqft: sub.sqft || 0,
        lotSize: sub.lotSizeAcres ? Math.round(sub.lotSizeAcres * 43560) : 0,
        yearBuilt: sub.yearBuilt || 0,
        propertyType: sub.propertyType || 'Residential',
        description: sub.description || '',
        photos: sub.photos || (sub.photo ? [sub.photo] : []),
        listDate: sub.listDate || '',
        status: sub.status || '',
        latitude: sub.latitude || undefined,
        longitude: sub.longitude || undefined,
      };

      // Map comparables
      const comparables: CMAReportData['comparables'] = comps.map((c: any) => {
        const price = c.soldPrice || c.listPrice || 0;
        const sqft = c.sqft || 0;
        return {
          address: c.address || c.streetAddress || '',
          mlsNumber: c.mlsNumber || '',
          listPrice: c.listPrice || 0,
          soldPrice: c.soldPrice || undefined,
          originalPrice: c.originalPrice || undefined,
          bedrooms: c.beds || c.bedrooms || 0,
          bathrooms: c.baths || c.bathrooms || 0,
          sqft,
          lotSize: c.lotSizeAcres ? Math.round(c.lotSizeAcres * 43560) : (c.lotSize || 0),
          yearBuilt: c.yearBuilt || 0,
          daysOnMarket: c.daysOnMarket || 0,
          distance: 0,
          status: c.status || '',
          photos: c.photos || (c.photo ? [c.photo] : []),
          pricePerSqft: sqft > 0 ? Math.round(price / sqft) : 0,
          description: c.description || undefined,
          listDate: c.listDate || undefined,
          soldDate: c.soldDate || undefined,
          garageSpaces: (c as any).garageSpaces || undefined,
          subdivision: (c as any).subdivision || undefined,
          stories: (c as any).stories || undefined,
          county: (c as any).county || undefined,
          area: (c as any).area || undefined,
          originalListPrice: (c as any).originalPrice || c.listPrice || undefined,
          taxes: (c as any).taxes || undefined,
          offMarketDate: (c as any).offMarketDate || undefined,
          schoolDistrict: (c as any).schoolDistrict || undefined,
          schoolHigh: (c as any).schoolHigh || undefined,
          schoolMiddle: (c as any).schoolMiddle || undefined,
          schoolElementary: (c as any).schoolElementary || undefined,
          cooling: (c as any).cooling || undefined,
          heating: (c as any).heating || undefined,
          appliances: (c as any).appliances || undefined,
          fireplace: (c as any).fireplace || undefined,
          fireplaceCount: (c as any).fireplaceCount || undefined,
          flooring: (c as any).flooring || undefined,
          foundation: (c as any).foundation || undefined,
          roof: (c as any).roof || undefined,
          pool: (c as any).pool || undefined,
          parkingSpaces: (c as any).parkingSpaces || undefined,
          parkingFeatures: (c as any).parkingFeatures || undefined,
          lotFeatures: (c as any).lotFeatures || undefined,
          exteriorFeatures: (c as any).exteriorFeatures || undefined,
          interiorFeatures: (c as any).interiorFeatures || undefined,
          laundry: (c as any).laundry || undefined,
          sewer: (c as any).sewer || undefined,
          utilities: (c as any).utilities || undefined,
          constructionMaterials: (c as any).constructionMaterials || undefined,
          fencing: (c as any).fencing || undefined,
          patioFeatures: (c as any).patioFeatures || undefined,
          levels: (c as any).levels || undefined,
          waterSource: (c as any).waterSource || undefined,
          windowFeatures: (c as any).windowFeatures || undefined,
          securityFeatures: (c as any).securityFeatures || undefined,
          ownership: (c as any).ownership || undefined,
          propertyCondition: (c as any).propertyCondition || undefined,
          directionFaces: (c as any).directionFaces || undefined,
          coveredSpaces: (c as any).coveredSpaces || undefined,
          otherStructures: (c as any).otherStructures || undefined,
          disclosures: (c as any).disclosures || undefined,
          greenEnergy: (c as any).greenEnergy || undefined,
          communityFeatures: (c as any).communityFeatures || undefined,
          accessibilityFeatures: (c as any).accessibilityFeatures || undefined,
          latitude: (c as any).latitude || undefined,
          longitude: (c as any).longitude || undefined,
        };
      });

      // Compute analysis
      const prices = comparables.map(c => c.soldPrice || c.listPrice).filter(p => p > 0);
      const ppsfs = comparables.map(c => c.pricePerSqft).filter(p => p > 0);
      const doms = comparables.map(c => c.daysOnMarket).filter(d => d >= 0);
      const averagePrice = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
      const averagePricePerSqft = ppsfs.length ? Math.round(ppsfs.reduce((a, b) => a + b, 0) / ppsfs.length) : 0;
      const averageDaysOnMarket = doms.length ? Math.round(doms.reduce((a, b) => a + b, 0) / doms.length) : 0;

      const analysis: CMAReportData['analysis'] = {
        averagePrice,
        averagePricePerSqft,
        medianPrice: Math.round(median(prices)),
        priceRange: { min: prices.length ? Math.min(...prices) : 0, max: prices.length ? Math.max(...prices) : 0 },
        averageDaysOnMarket,
      };

      // Build agent
      const agent: CMAReportData['agent'] = {
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        title: agentProfile?.title || '',
        email: user?.email || '',
        phone: agentProfile?.phone || '',
        photo: user?.profileImageUrl || (user as any)?.fubAvatarUrl || '',
        company: 'Spyglass Realty',
        bio: agentProfile?.bio || undefined,
      };

      const metadata: CMAReportData['metadata'] = {
        preparedFor: '',
        preparedDate: new Date().toLocaleDateString('en-US'),
        reportTitle: cma.name || 'Comparative Market Analysis',
      };

      // Build Mapbox static map image
      const mapTokenRes = await fetch('/api/mapbox-token');
      const mapTokenData = await mapTokenRes.json();
      const mapboxToken = mapTokenData.token;

      let markerStr = '';
      if (subjectProperty.latitude && subjectProperty.longitude) {
        markerStr += `pin-l-home+ef4923(${subjectProperty.longitude},${subjectProperty.latitude}),`;
      }
      comparables.forEach((c, i) => {
        if (c.latitude && c.longitude) {
          markerStr += `pin-s-${i + 1}+cc0000(${c.longitude},${c.latitude}),`;
        }
      });
      markerStr = markerStr.replace(/,$/, '');

      let mapImageUrl = '';
      if (markerStr && mapboxToken) {
        const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${markerStr}/auto/800x400?padding=60&access_token=${mapboxToken}`;
        try {
          const mapRes = await fetch(mapUrl);
          const mapBlob = await mapRes.blob();
          mapImageUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(mapBlob);
          });
        } catch (e) {
          console.warn('Map image fetch failed:', e);
        }
      }

      const reportData: CMAReportData = { subjectProperty, comparables, agent, analysis, metadata, mapImageUrl: mapImageUrl || undefined };

      const coverPageConfig: CoverPageConfig = {
        title: 'Comparative Market Analysis',
        subtitle: subjectProperty.address,
        showDate: true,
        showAgentPhoto: true,
        background: 'gradient',
      };

      const defaultSections = CMA_REPORT_SECTIONS.filter(s => s.defaultEnabled).map(s => s.id);

      const doc = (
        <CMAPdfDocument
          data={reportData}
          includedSections={defaultSections}
          sectionOrder={defaultSections}
          coverPageConfig={coverPageConfig}
        />
      );

      const blob = await pdf(doc).toBlob();
      const filename = `CMA-${(subjectProperty.address || 'report').replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({ title: 'PDF Downloaded', description: 'CMA report exported successfully.' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      toast({ title: 'Download Failed', description: msg.slice(0, 100), variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleDownload}
      disabled={isDisabled}
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <FileDown className="h-4 w-4 mr-2" />
      )}
      Download PDF
    </Button>
  );
}
