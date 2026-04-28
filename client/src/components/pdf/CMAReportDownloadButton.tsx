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

      const reportData: CMAReportData = { subjectProperty, comparables, agent, analysis, metadata };

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
