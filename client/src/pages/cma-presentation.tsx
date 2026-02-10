import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Home,
  MapPin,
  DollarSign,
  TrendingUp,
  BarChart3,
  PieChart,
  Calculator,
  Calendar,
  Camera,
  Map,
  FileText,
  Users,
  Building2,
  Ruler,
  Car,
  Trees,
  Zap,
  Shield,
  GraduationCap,
  Heart,
  ShoppingCart,
  Utensils,
  Plane,
  Train,
  Bus,
  Hospital,
  Church,
  Gamepad2,
  Dumbbell,
  Music,
  Palette,
  Globe,
  ArrowLeft,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface PropertyData {
  mlsNumber: string;
  address: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
  listPrice: number;
  soldPrice?: number | null;
  beds: number;
  baths: number;
  sqft: number;
  lotSizeAcres?: number | null;
  yearBuilt?: number | null;
  propertyType?: string;
  status: string;
  listDate?: string;
  soldDate?: string | null;
  daysOnMarket?: number;
  photo?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface CmaData {
  id?: string;
  name: string;
  subjectProperty: PropertyData | null;
  comparableProperties: PropertyData[];
  notes: string;
  status: string;
}

// Widget definitions - 33 total widgets as mentioned by Daryl
const CMA_WIDGETS = [
  { id: 'introduction', title: 'Introduction', icon: Home, category: 'Overview' },
  { id: 'property-overview', title: 'Property Overview', icon: Building2, category: 'Property' },
  { id: 'location-map', title: 'Location Map', icon: MapPin, category: 'Location' },
  { id: 'property-photos', title: 'Property Photos', icon: Camera, category: 'Property' },
  { id: 'price-analysis', title: 'Price Analysis', icon: DollarSign, category: 'Analysis' },
  { id: 'comparable-sales', title: 'Comparable Sales', icon: BarChart3, category: 'Analysis' },
  { id: 'market-trends', title: 'Market Trends', icon: TrendingUp, category: 'Market' },
  { id: 'price-per-sqft', title: 'Price per Sq Ft', icon: Calculator, category: 'Analysis' },
  { id: 'days-on-market', title: 'Days on Market', icon: Calendar, category: 'Market' },
  { id: 'active-listings', title: 'Active Listings', icon: FileText, category: 'Market' },
  { id: 'sold-listings', title: 'Sold Listings', icon: Users, category: 'Market' },
  { id: 'pending-listings', title: 'Pending Listings', icon: Users, category: 'Market' },
  { id: 'property-details', title: 'Property Details', icon: Home, category: 'Property' },
  { id: 'lot-information', title: 'Lot Information', icon: Trees, category: 'Property' },
  { id: 'square-footage', title: 'Square Footage', icon: Ruler, category: 'Property' },
  { id: 'year-built', title: 'Year Built', icon: Calendar, category: 'Property' },
  { id: 'garage-parking', title: 'Garage & Parking', icon: Car, category: 'Features' },
  { id: 'utilities', title: 'Utilities', icon: Zap, category: 'Features' },
  { id: 'security', title: 'Security Features', icon: Shield, category: 'Features' },
  { id: 'schools', title: 'Schools', icon: GraduationCap, category: 'Neighborhood' },
  { id: 'healthcare', title: 'Healthcare', icon: Heart, category: 'Neighborhood' },
  { id: 'shopping', title: 'Shopping', icon: ShoppingCart, category: 'Neighborhood' },
  { id: 'restaurants', title: 'Restaurants', icon: Utensils, category: 'Neighborhood' },
  { id: 'airports', title: 'Airports', icon: Plane, category: 'Transportation' },
  { id: 'trains', title: 'Trains', icon: Train, category: 'Transportation' },
  { id: 'buses', title: 'Buses', icon: Bus, category: 'Transportation' },
  { id: 'hospitals', title: 'Hospitals', icon: Hospital, category: 'Neighborhood' },
  { id: 'churches', title: 'Places of Worship', icon: Church, category: 'Neighborhood' },
  { id: 'entertainment', title: 'Entertainment', icon: Gamepad2, category: 'Lifestyle' },
  { id: 'fitness', title: 'Fitness & Recreation', icon: Dumbbell, category: 'Lifestyle' },
  { id: 'music-venues', title: 'Music & Arts', icon: Music, category: 'Lifestyle' },
  { id: 'culture', title: 'Culture & Museums', icon: Palette, category: 'Lifestyle' },
  { id: 'demographics', title: 'Demographics', icon: Globe, category: 'Market' },
];

function formatPrice(price: number | null | undefined): string {
  if (!price) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(price);
}

interface SlideshowPlayerProps {
  widgets: typeof CMA_WIDGETS;
  cma: CmaData;
  activeWidgetId: string | null;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

function SlideshowPlayer({ widgets, cma, activeWidgetId, onClose, onNext, onPrevious }: SlideshowPlayerProps) {
  const activeWidget = widgets.find(w => w.id === activeWidgetId);
  const activeIndex = widgets.findIndex(w => w.id === activeWidgetId);

  if (!activeWidget) return null;

  return (
    <Dialog open={!!activeWidgetId} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center gap-3">
            <activeWidget.icon className="h-6 w-6 text-[#EF4923]" />
            <h2 className="text-xl font-semibold">{activeWidget.title}</h2>
            <Badge variant="outline">{activeWidget.category}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {activeIndex + 1} of {widgets.length}
            </span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-auto">
          <div className="max-w-4xl mx-auto">
            {/* Render widget-specific content */}
            {activeWidget.id === 'introduction' && (
              <div className="text-center space-y-6">
                <h1 className="text-3xl font-bold">Comparative Market Analysis</h1>
                {cma.subjectProperty && (
                  <div>
                    <h2 className="text-2xl font-semibold text-[#EF4923]">{cma.subjectProperty.address}</h2>
                    <p className="text-lg text-muted-foreground">MLS# {cma.subjectProperty.mlsNumber}</p>
                  </div>
                )}
                <div className="text-lg">
                  <p>This comprehensive market analysis provides insights into property values and market conditions for your area.</p>
                </div>
              </div>
            )}
            
            {activeWidget.id === 'property-overview' && cma.subjectProperty && (
              <div className="space-y-6">
                <h3 className="text-2xl font-semibold mb-4">Property Overview</h3>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-lg">Address</h4>
                      <p className="text-lg">{cma.subjectProperty.address}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">List Price</h4>
                      <p className="text-2xl font-bold text-[#EF4923]">{formatPrice(cma.subjectProperty.listPrice)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg text-center">
                      <p className="text-2xl font-bold">{cma.subjectProperty.beds}</p>
                      <p className="text-sm text-muted-foreground">Bedrooms</p>
                    </div>
                    <div className="p-4 border rounded-lg text-center">
                      <p className="text-2xl font-bold">{cma.subjectProperty.baths}</p>
                      <p className="text-sm text-muted-foreground">Bathrooms</p>
                    </div>
                    <div className="p-4 border rounded-lg text-center">
                      <p className="text-2xl font-bold">{cma.subjectProperty.sqft.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Sq Ft</p>
                    </div>
                    <div className="p-4 border rounded-lg text-center">
                      <p className="text-2xl font-bold">{cma.subjectProperty.yearBuilt || "—"}</p>
                      <p className="text-sm text-muted-foreground">Year Built</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeWidget.id === 'comparable-sales' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-semibold mb-4">Comparable Sales</h3>
                <div className="space-y-4">
                  {cma.comparableProperties.map((comp, index) => (
                    <div key={index} className="border rounded-lg p-4 flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold">{comp.address}</h4>
                        <p className="text-sm text-muted-foreground">
                          {comp.beds} bd • {comp.baths} ba • {comp.sqft.toLocaleString()} sqft
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{formatPrice(comp.soldPrice || comp.listPrice)}</p>
                        <p className="text-sm text-muted-foreground">{comp.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Default content for other widgets */}
            {!['introduction', 'property-overview', 'comparable-sales'].includes(activeWidget.id) && (
              <div className="text-center py-20">
                <activeWidget.icon className="h-16 w-16 mx-auto mb-4 text-[#EF4923] opacity-50" />
                <h3 className="text-xl font-semibold mb-2">{activeWidget.title}</h3>
                <p className="text-muted-foreground">This widget content is coming soon.</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/50">
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={activeIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={onNext}
            disabled={activeIndex === widgets.length - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CmaPresentationPage() {
  const [, routeParams] = useRoute("/cma/:id/cma-presentation");
  const cmaId = routeParams?.id;
  const [activeWidgetId, setActiveWidgetId] = useState<string | null>(null);

  // Load CMA data
  const { data: cma, isLoading } = useQuery<CmaData>({
    queryKey: ["/api/cma", cmaId],
    queryFn: async () => {
      const res = await fetch(`/api/cma/${cmaId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load CMA");
      return res.json();
    },
    enabled: !!cmaId,
  });

  const handleWidgetClick = (widgetId: string) => {
    setActiveWidgetId(widgetId);
  };

  const handleCloseSlideshow = () => {
    setActiveWidgetId(null);
  };

  const handleNextWidget = () => {
    const currentIndex = CMA_WIDGETS.findIndex(w => w.id === activeWidgetId);
    const nextIndex = Math.min(currentIndex + 1, CMA_WIDGETS.length - 1);
    setActiveWidgetId(CMA_WIDGETS[nextIndex].id);
  };

  const handlePreviousWidget = () => {
    const currentIndex = CMA_WIDGETS.findIndex(w => w.id === activeWidgetId);
    const prevIndex = Math.max(currentIndex - 1, 0);
    setActiveWidgetId(CMA_WIDGETS[prevIndex].id);
  };

  if (!cmaId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Invalid CMA</h1>
          <p className="text-muted-foreground">CMA ID not found.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 33 }, (_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const cmaForDisplay: CmaData = cma || {
    name: "",
    subjectProperty: null,
    comparableProperties: [],
    notes: "",
    status: "draft",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">COMPARATIVE MARKET ANALYSIS</h1>
              {cmaForDisplay.subjectProperty && (
                <div className="mt-2">
                  <p className="text-xl text-[#EF4923] font-semibold">
                    {cmaForDisplay.subjectProperty.address}
                  </p>
                  <p className="text-muted-foreground">
                    MLS# {cmaForDisplay.subjectProperty.mlsNumber}
                  </p>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to CMA
            </Button>
          </div>
        </div>
      </div>

      {/* Widget Grid */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {CMA_WIDGETS.map((widget) => {
            const Icon = widget.icon;
            return (
              <Card
                key={widget.id}
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => handleWidgetClick(widget.id)}
              >
                <CardContent className="p-4 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto bg-[#EF4923]/10 rounded-lg flex items-center justify-center group-hover:bg-[#EF4923]/20 transition-colors">
                    <Icon className="h-6 w-6 text-[#EF4923]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{widget.title}</h3>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {widget.category}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Slideshow Player */}
      <SlideshowPlayer
        widgets={CMA_WIDGETS}
        cma={cmaForDisplay}
        activeWidgetId={activeWidgetId}
        onClose={handleCloseSlideshow}
        onNext={handleNextWidget}
        onPrevious={handlePreviousWidget}
      />
    </div>
  );
}