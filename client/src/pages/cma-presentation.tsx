import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
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
  Pencil,
  Sparkles,
  Mail,
  Phone,
  ExternalLink,
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
  photos?: string[];
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

interface AgentProfile {
  firstName?: string;
  lastName?: string;
  title?: string;
  phone?: string;
  email?: string;
  headshotUrl?: string;
  bio?: string;
}

// Widget definitions - 33 total widgets as mentioned by Daryl
const CMA_WIDGETS = [
  { id: 'introduction', title: 'Introduction', icon: Home, category: 'Overview' },
  { id: 'agent-resume', title: 'Agent Resume', icon: Users, category: 'Overview' },
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

interface AgentHeaderProps {
  agentProfile?: AgentProfile;
}

function AgentHeader({ agentProfile }: AgentHeaderProps) {
  if (!agentProfile) {
    return (
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-[#EF4923] text-white text-sm">
            ?
          </AvatarFallback>
        </Avatar>
        <div className="hidden sm:block">
          <div className="text-sm font-medium">Loading...</div>
          <div className="text-xs text-muted-foreground">Spyglass Realty</div>
        </div>
      </div>
    );
  }

  const fullName = [agentProfile.firstName, agentProfile.lastName].filter(Boolean).join(' ') || 'Agent';
  const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase();
  const email = agentProfile.email || '';
  const phone = agentProfile.phone || '';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-3 hover:bg-muted/50 rounded-lg p-2 transition-colors">
          <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
            <AvatarImage src={agentProfile.headshotUrl} alt={fullName} />
            <AvatarFallback className="bg-gradient-to-br from-[#EF4923] to-[#EF4923]/80 text-white text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block text-left">
            <div className="text-sm font-medium text-foreground">{fullName}</div>
            <div className="text-xs text-muted-foreground">Spyglass Realty</div>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 space-y-4">
          {/* Agent Info Header */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-muted">
              <AvatarImage src={agentProfile.headshotUrl} alt={fullName} />
              <AvatarFallback className="bg-gradient-to-br from-[#EF4923] to-[#EF4923]/80 text-white text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{fullName}</h3>
              {agentProfile.title && (
                <p className="text-muted-foreground text-sm">{agentProfile.title}</p>
              )}
              <p className="text-muted-foreground text-sm">Spyglass Realty</p>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-3">
            {phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm">{phone}</span>
              </div>
            )}
            {email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm">{email}</span>
              </div>
            )}
          </div>

          {/* Email Report Button */}
          {email && (
            <div className="pt-2">
              <Button
                asChild
                className="w-full bg-[#EF4923] hover:bg-[#EF4923]/90"
                size="sm"
              >
                <a
                  href={`mailto:${email}?subject=CMA Report Request&body=Hi ${agentProfile.firstName || 'there'},%0D%0A%0D%0APlease send me the CMA report.%0D%0A%0D%0AThank you!`}
                  className="flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Email Report
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface BioEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBio: string;
  onSave: (bio: string) => void;
  isSaving: boolean;
}

function BioEditModal({ isOpen, onClose, currentBio, onSave, isSaving }: BioEditModalProps) {
  const [bio, setBio] = useState(currentBio);
  const [charCount, setCharCount] = useState(currentBio.length);
  const [tone, setTone] = useState('professional');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setBio(currentBio);
    setCharCount(currentBio.length);
  }, [currentBio]);

  const handleBioChange = (value: string) => {
    if (value.length <= 500) {
      setBio(value);
      setCharCount(value.length);
    }
  };

  const handleGenerateBio = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/agent-profile/generate-bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate bio');
      }
      
      const data = await response.json();
      setBio(data.bio);
      setCharCount(data.bio.length);
      toast.success("Bio generated successfully!");
    } catch (error) {
      console.error('Error generating bio:', error);
      toast.error("Failed to generate bio. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    onSave(bio);
  };

  const handleCancel = () => {
    setBio(currentBio);
    setCharCount(currentBio.length);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Bio</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* AI Bio Generation Section */}
          <div className="p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-[#EF4923]" />
              <Label className="text-sm font-medium">Generate with AI</Label>
            </div>
            
            <div className="flex gap-2 mb-3">
              <div className="flex-1">
                <Select value={tone} onValueChange={setTone} disabled={isGenerating || isSaving}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="luxury">Luxury</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                onClick={handleGenerateBio}
                disabled={isGenerating || isSaving}
                className="bg-[#EF4923] hover:bg-[#EF4923]/90 h-8 px-3 text-sm"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="h-3 w-3 mr-1 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 mr-1" />
                    Generate
                  </>
                )}
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground">
              AI will create a professional bio using your profile information
            </p>
          </div>

          {/* Bio Text Editor */}
          <div>
            <Label htmlFor="bio">Professional Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => handleBioChange(e.target.value)}
              placeholder="Write a brief professional bio that will appear on your CMA presentations..."
              className="mt-2 min-h-[120px] resize-none"
              disabled={isSaving || isGenerating}
            />
            <div className="flex justify-between items-center mt-2 text-sm text-muted-foreground">
              <span>Character limit: 500</span>
              <span className={charCount > 450 ? 'text-yellow-600' : charCount === 500 ? 'text-red-600' : ''}>
                {charCount}/500
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSaving || isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isGenerating || charCount === 0}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AgentResumeContentProps {
  agentProfile: AgentProfile | undefined;
  onEditBio: () => void;
}

function AgentResumeContent({ agentProfile, onEditBio }: AgentResumeContentProps) {
  if (!agentProfile) {
    return (
      <div className="space-y-6 text-center">
        <h3 className="text-2xl font-semibold mb-4">Agent Resume</h3>
        <p className="text-muted-foreground">Unable to load agent profile</p>
      </div>
    );
  }

  const hasBasicInfo = agentProfile?.firstName || agentProfile?.lastName;
  const fullName = [agentProfile?.firstName, agentProfile?.lastName].filter(Boolean).join(' ') || 'Your Name';
  const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase();
  const email = agentProfile?.email || '';
  const phone = agentProfile?.phone || '';
  const title = agentProfile?.title || '';

  return (
    <div className="space-y-8">
      <h3 className="text-3xl font-bold text-center mb-8">Agent Resume</h3>
      
      {/* Agent Profile Card */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-[#EF4923] to-[#EF4923]/90 p-8 text-white">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Profile Photo */}
              <div className="flex-shrink-0">
                <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
                  <AvatarImage src={agentProfile?.headshotUrl} alt={fullName} />
                  <AvatarFallback className="bg-white/20 text-white text-2xl font-bold backdrop-blur">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              {/* Agent Info */}
              <div className="text-center md:text-left flex-1">
                <h2 className="text-3xl font-bold mb-2">{fullName}</h2>
                {title && (
                  <p className="text-xl text-white/90 mb-1">{title}</p>
                )}
                <p className="text-lg text-white/80 mb-4">Spyglass Realty</p>
                
                {/* Contact Info */}
                <div className="flex flex-col sm:flex-row gap-4 text-white/90">
                  {phone && (
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <Phone className="h-4 w-4" />
                      <span className="text-sm">{phone}</span>
                    </div>
                  )}
                  {email && (
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <Mail className="h-4 w-4" />
                      <span className="text-sm">{email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bio Section */}
          <div className="p-8">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xl font-semibold text-gray-800">About Me</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={onEditBio}
                className="text-[#EF4923] hover:text-[#EF4923]/80 hover:bg-[#EF4923]/10"
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit Bio
              </Button>
            </div>
            
            <div className="prose prose-gray max-w-none">
              {agentProfile?.bio ? (
                <p className="text-gray-700 leading-relaxed text-base whitespace-pre-wrap">
                  {agentProfile.bio}
                </p>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-4">
                    Your professional bio will appear here to help clients get to know you better.
                  </p>
                  <Button 
                    onClick={onEditBio}
                    className="bg-[#EF4923] hover:bg-[#EF4923]/90"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Add Your Bio
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SlideshowPlayerProps {
  widgets: typeof CMA_WIDGETS;
  cma: CmaData;
  agentProfile: AgentProfile | undefined;
  activeWidgetId: string | null;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onEditBio: () => void;
}

function SlideshowPlayer({ widgets, cma, agentProfile, activeWidgetId, onClose, onNext, onPrevious, onEditBio }: SlideshowPlayerProps) {
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
                
                {/* Agent Introduction */}
                {agentProfile && (
                  <div className="mt-8 p-6 bg-muted/50 rounded-lg">
                    <div className="flex flex-col items-center gap-4">
                      <Avatar className="w-16 h-16 border-2 border-[#EF4923]">
                        <AvatarImage src={agentProfile.headshotUrl} alt={`${agentProfile.firstName} ${agentProfile.lastName}`} />
                        <AvatarFallback className="bg-[#EF4923] text-white text-lg font-semibold">
                          {`${agentProfile.firstName?.[0] || ''}${agentProfile.lastName?.[0] || ''}`.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-xl font-semibold">
                          {[agentProfile.firstName, agentProfile.lastName].filter(Boolean).join(' ')}
                        </h3>
                        {agentProfile.title && (
                          <p className="text-muted-foreground">{agentProfile.title}</p>
                        )}
                        <p className="text-muted-foreground">Spyglass Realty</p>
                        {agentProfile.phone && (
                          <p className="text-sm text-muted-foreground mt-1">{agentProfile.phone}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="text-lg">
                  <p>This comprehensive market analysis provides insights into property values and market conditions for your area.</p>
                </div>
              </div>
            )}

            {activeWidget.id === 'agent-resume' && (
              <AgentResumeContent agentProfile={agentProfile} onEditBio={onEditBio} />
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
            {!['introduction', 'agent-resume', 'property-overview', 'comparable-sales'].includes(activeWidget.id) && (
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
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);
  const queryClient = useQueryClient();

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

  // Load agent profile for bio editing
  const { data: agentProfile } = useQuery<AgentProfile>({
    queryKey: ['/api/agent-profile'],
    queryFn: async () => {
      const res = await fetch('/api/agent-profile', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch agent profile');
      return res.json();
    },
  });

  // Mutation for updating bio
  const updateBioMutation = useMutation({
    mutationFn: async (bio: string) => {
      const res = await fetch('/api/agent-profile/bio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to update bio');
      return res.json();
    },
    onSuccess: () => {
      // Invalidate both queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/agent-profile'] });
      setIsBioModalOpen(false);
      toast.success("Bio updated successfully!");
    },
    onError: (error) => {
      console.error('Error updating bio:', error);
      toast.error("Failed to update bio. Please try again.");
    },
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
      <div className="border-b bg-white shadow-sm">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
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
            
            <div className="flex items-center gap-4">
              {/* Agent Header with Popover */}
              <AgentHeader agentProfile={agentProfile} />
              
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
        agentProfile={agentProfile}
        activeWidgetId={activeWidgetId}
        onClose={handleCloseSlideshow}
        onNext={handleNextWidget}
        onPrevious={handlePreviousWidget}
        onEditBio={() => setIsBioModalOpen(true)}
      />

      {/* Bio Edit Modal */}
      <BioEditModal
        isOpen={isBioModalOpen}
        onClose={() => setIsBioModalOpen(false)}
        currentBio={agentProfile?.bio || ''}
        onSave={(bio) => updateBioMutation.mutate(bio)}
        isSaving={updateBioMutation.isPending}
      />
    </div>
  );
}