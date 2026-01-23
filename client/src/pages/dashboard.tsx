import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { apps } from "@/lib/apps";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowRight, Plus, ExternalLink, Sparkles, ChevronDown, ChevronUp, Plug, Link2, PlayCircle, Play } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { OnboardingModal } from "@/components/onboarding-modal";
import { SuggestionCard } from "@/components/suggestion-card";
import MarketPulse from "@/components/market-pulse";
import { GoogleDocModal } from "@/components/google-doc-modal";
import { TrainingVideosModal } from "@/components/training-videos-modal";
import { DOCUMENTS } from "@/lib/documents";
import { useTheme } from "@/contexts/ThemeContext";
import type { ContextSuggestion, AgentProfile } from "@shared/schema";

interface ProfileResponse {
  profile: AgentProfile | null;
  needsOnboarding: boolean;
}

interface SuggestionsResponse {
  suggestions: ContextSuggestion[];
}

interface LatestTrainingVideo {
  title: string;
  description: string | null;
  duration: number;
  durationFormatted: string;
  createdAt: string;
  link: string;
  thumbnail: string | null;
}

interface VimeoResponse {
  video: LatestTrainingVideo | null;
  message?: string;
}

// Helper functions for bottom Company Updates section
const formatDuration = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const isNewVideo = (dateString: string) => {
  const date = new Date(dateString);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return date >= sevenDaysAgo;
};

const getRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getThumbnail = (video: any) => {
  const sizes = video.pictures?.sizes || [];
  const medium = sizes.find((s: any) => s.width >= 640) || sizes[sizes.length - 1];
  return medium?.link?.replace(/&amp;/g, '&') || '';
};

interface BottomVideoData {
  id: string;
  name: string;
  duration: number;
  created_time: string;
  player_embed_url: string;
  thumbnail: string;
  pictures: any;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [showAllApps, setShowAllApps] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [showHandbook, setShowHandbook] = useState(false);
  const [showTrainingVideos, setShowTrainingVideos] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [bottomLatestVideo, setBottomLatestVideo] = useState<BottomVideoData | null>(null);

  // Fetch latest video with thumbnail for bottom section (with credentials)
  useEffect(() => {
    const fetchLatestVideo = async () => {
      try {
        const response = await fetch('/api/vimeo/training-videos?limit=1', { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          if (data.videos && data.videos.length > 0) {
            const video = data.videos[0];
            setBottomLatestVideo({
              ...video,
              thumbnail: getThumbnail(video)
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch latest video:', err);
      }
    };
    
    fetchLatestVideo();
  }, []);

  const handleBottomVideoClick = () => {
    if (bottomLatestVideo) {
      setSelectedVideoId(bottomLatestVideo.id);
      setShowTrainingVideos(true);
    }
  };

  const { data: profileData, isLoading: profileLoading } = useQuery<ProfileResponse>({
    queryKey: ["/api/context/profile"],
    queryFn: async () => {
      const res = await fetch("/api/context/profile", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
  });

  const { data: suggestionsData, isLoading: suggestionsLoading } = useQuery<SuggestionsResponse>({
    queryKey: ["/api/context/suggestions"],
    queryFn: async () => {
      const res = await fetch("/api/context/suggestions", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch suggestions");
      return res.json();
    },
    enabled: !profileData?.needsOnboarding || onboardingComplete,
  });

  const { data: vimeoData } = useQuery<VimeoResponse>({
    queryKey: ["/api/vimeo/latest-video"],
    queryFn: async () => {
      const res = await fetch("/api/vimeo/latest-video", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch latest video");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  const showOnboarding = profileData?.needsOnboarding && !onboardingComplete;
  const suggestions = suggestionsData?.suggestions || [];
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const firstName = user?.firstName || user?.email?.split('@')[0] || "Agent";

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        
        <OnboardingModal 
          open={showOnboarding || false} 
          onComplete={() => setOnboardingComplete(true)} 
        />

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              {getGreeting()}, {firstName}
            </h1>
            <p className="text-muted-foreground mt-1">
              {suggestions.length > 0 
                ? "Here's what you should focus on right now."
                : "Welcome to Mission Control. What would you like to work on today?"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MarketPulse />
          
          {/* Action Items Card - Right of Market Pulse */}
          {suggestionsLoading ? (
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#EF4923]" />
                  <CardTitle className="text-lg font-display">Action Items</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ) : suggestions.length > 0 ? (
            <Card className="h-full" data-testid="card-action-items">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[#EF4923]" />
                    <CardTitle className="text-lg font-display">Action Items</CardTitle>
                  </div>
                  <Badge className="bg-[#EF4923] text-white">{suggestions.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {suggestions.slice(0, 3).map((suggestion) => (
                  <SuggestionCard key={suggestion.id} suggestion={suggestion} />
                ))}
                {suggestions.length > 3 && (
                  <p className="text-sm text-center text-muted-foreground pt-2">
                    +{suggestions.length - 3} more action items
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full" data-testid="card-action-items-empty">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#EF4923]" />
                  <CardTitle className="text-lg font-display">Action Items</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-muted-foreground opacity-50" />
                </div>
                <p className="text-foreground font-medium" data-testid="text-no-action-items">No action items right now</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Check back later for personalized suggestions
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6">
          {[
            { label: "Action Items", value: suggestions.length.toString(), sublabel: "To Review" },
            { label: "Apps", value: apps.filter(a => a.id !== 'contract-conduit-marketing').length.toString(), sublabel: `${apps.filter(a => a.id !== 'contract-conduit-marketing' && a.connectionType === 'embedded').length} Int.` },
            { label: "Resources", value: "24/7", sublabel: "Available" },
          ].map((stat, i) => (
            <Card key={i} className="bg-card border-border shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-3 sm:p-4 md:p-6">
                <p className="text-[10px] sm:text-xs md:text-sm font-medium text-muted-foreground truncate">{stat.label}</p>
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mt-1 sm:mt-2 gap-1">
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold font-display">{stat.value}</h3>
                  <Badge variant="secondary" className="bg-[#EF4923]/10 text-[#EF4923] hover:bg-[#EF4923]/20 border-0 text-[9px] sm:text-xs w-fit">
                    {stat.sublabel}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-semibold tracking-tight">Your Applications</h2>
          </div>
          
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6"
          >
            {apps
              .filter(app => app.id !== 'contract-conduit-marketing')
              .sort((a, b) => {
                // Sort by: Integrated first, then Core, Sales, Marketing
                const categoryPriority: Record<string, number> = { 'Core': 1, 'Sales': 2, 'Marketing': 3, 'Admin': 4 };
                
                // Integrated apps first
                if (a.connectionType === 'embedded' && b.connectionType !== 'embedded') return -1;
                if (b.connectionType === 'embedded' && a.connectionType !== 'embedded') return 1;
                
                // Then by category (use first category for sorting)
                const aPriority = categoryPriority[a.categories[0]] ?? 99;
                const bPriority = categoryPriority[b.categories[0]] ?? 99;
                return aPriority - bPriority;
              })
              .map((app) => {
              const handleAppClick = () => {
                if (app.noIframe && app.url) {
                  window.open(app.url, '_blank', 'noopener,noreferrer');
                }
              };
              
              const cardContent = (
                <Card className="group relative overflow-hidden border-border hover:border-[#EF4923]/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer bg-card h-full" data-testid={`card-app-${app.id}`}>
                  <div className={`absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity`}>
                    {app.url ? <ExternalLink className="h-5 w-5 text-muted-foreground" /> : <ArrowUpRight className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <CardHeader className="pb-4">
                    <div className={`w-12 h-12 rounded-xl ${app.color} flex items-center justify-center mb-4`}>
                      <app.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="font-display text-lg">{app.name}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-1.5">
                      {app.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 flex-wrap">
                      {app.categories.map((category) => (
                        <Badge key={category} variant="secondary" className="text-xs font-normal bg-secondary/80">
                          {category}
                        </Badge>
                      ))}
                      {app.connectionType === 'embedded' && (
                        <Badge variant="outline" className="text-xs font-normal border-emerald-500/30 text-emerald-600 bg-emerald-500/10 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Integrated
                        </Badge>
                      )}
                      {app.connectionType === 'external' && (
                        <Badge variant="outline" className="text-xs font-normal border-blue-500/30 text-blue-600 bg-blue-500/10 flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />
                          External
                        </Badge>
                      )}
                      {app.connectionType === 'redirect' && (
                        <Badge variant="outline" className="text-xs font-normal border-muted-foreground/30 text-muted-foreground flex items-center gap-1">
                          <Link2 className="w-3 h-3" />
                          Link
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
              
              return (
                <motion.div key={app.id} variants={item}>
                  {app.noIframe && app.url ? (
                    <div onClick={handleAppClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && handleAppClick()}>
                      {cardContent}
                    </div>
                  ) : (
                    <Link href={`/app/${app.id}`}>
                      {cardContent}
                    </Link>
                  )}
                </motion.div>
              );
            })}
            
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-2">
            <Card className={`${isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'} overflow-hidden`}>
              {/* Header */}
              <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Company Updates</h2>
                <Link 
                  href="/training"
                  className="text-sm text-[#EF4923] hover:text-[#D4401F] flex items-center gap-1 transition-colors"
                  data-testid="link-view-training-bottom"
                >
                  View Training
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <CardContent className="p-4 space-y-4">
                {/* Latest Training Video with Thumbnail */}
                {bottomLatestVideo ? (
                  <button
                    onClick={handleBottomVideoClick}
                    className={`w-full flex gap-4 p-2 -m-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'} text-left group`}
                    data-testid="button-open-training-videos"
                  >
                    {/* Thumbnail */}
                    <div className="relative flex-shrink-0 w-40 h-24 rounded-lg overflow-hidden bg-gray-900" data-testid="thumbnail-video-bottom">
                      {bottomLatestVideo.thumbnail ? (
                        <img 
                          src={bottomLatestVideo.thumbnail} 
                          alt={bottomLatestVideo.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800">
                          <Play className="w-8 h-8 text-white/30" />
                        </div>
                      )}
                      
                      {/* Play Button Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" data-testid="overlay-play-bottom">
                        <div className="w-12 h-12 bg-[#EF4923] rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                          <Play className="w-6 h-6 text-white fill-white ml-1" />
                        </div>
                      </div>
                      
                      {/* NEW Badge */}
                      {isNewVideo(bottomLatestVideo.created_time) && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 bg-[#EF4923] text-white text-xs font-bold rounded" data-testid="badge-new-bottom">
                          NEW
                        </span>
                      )}
                      
                      {/* Duration Badge */}
                      <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white text-xs rounded font-medium" data-testid="badge-duration-bottom">
                        {formatDuration(bottomLatestVideo.duration)}
                      </span>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-[#EF4923]/10 text-[#EF4923] text-xs font-medium rounded" data-testid="badge-new-training-bottom">
                          New Training
                        </span>
                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`} data-testid="text-relative-time-bottom">
                          {getRelativeTime(bottomLatestVideo.created_time)}
                        </span>
                      </div>
                      
                      <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'} line-clamp-2 group-hover:text-[#EF4923] transition-colors`} data-testid="text-video-title">
                        {bottomLatestVideo.name}
                      </h3>
                      
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1 line-clamp-1`} data-testid="text-video-description-bottom">
                        Watch the latest training module from Spyglass Realty.
                      </p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs font-medium text-[#EF4923] flex items-center gap-1" data-testid="text-watch-now-bottom">
                          <Play className="w-3 h-3" />
                          Watch Now
                        </span>
                      </div>
                    </div>
                  </button>
                ) : (
                  <div className="animate-pulse flex gap-4">
                    <div className={`w-40 h-24 ${isDark ? 'bg-gray-700' : 'bg-gray-300'} rounded-lg`}></div>
                    <div className="flex-1 space-y-2">
                      <div className={`h-4 ${isDark ? 'bg-gray-700' : 'bg-gray-300'} rounded w-1/4`}></div>
                      <div className={`h-5 ${isDark ? 'bg-gray-700' : 'bg-gray-300'} rounded w-3/4`}></div>
                      <div className={`h-4 ${isDark ? 'bg-gray-700' : 'bg-gray-300'} rounded w-1/2`}></div>
                    </div>
                  </div>
                )}

                {/* Divider */}
                <div className={`border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}></div>

                {/* Q4 Goals & Incentives */}
                <div className={`flex gap-3 p-2 -m-2 rounded-lg ${isDark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'} cursor-pointer transition-colors`} data-testid="row-announcement-q4">
                  <div className={`w-10 h-10 rounded-lg ${isDark ? 'bg-[#EF4923]/20' : 'bg-orange-100'} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-lg text-[#EF4923] font-bold">S</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`px-2 py-0.5 ${isDark ? 'bg-[#EF4923]/10 text-orange-400' : 'bg-orange-100 text-[#D4401F]'} text-xs font-medium rounded`} data-testid="badge-announcement">
                        Announcement
                      </span>
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Yesterday</span>
                    </div>
                    <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'} line-clamp-1`} data-testid="text-announcement-title">
                      Q4 Goals & Incentives
                    </h3>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-0.5 line-clamp-1`} data-testid="text-announcement-description">
                      Review the updated commission structure and bonus opportunities for top performers.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <h2 className="text-xl font-display font-semibold tracking-tight mb-4">Quick Links</h2>
            <Card>
              <CardContent className="p-6 space-y-3">
                <button
                  onClick={() => setShowHandbook(true)}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group text-left"
                  data-testid="button-company-handbook"
                >
                  <span className="text-sm font-medium">Company Handbook</span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-[#EF4923] transition-colors" />
                </button>
                <a 
                  href="https://app.rechat.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <span className="text-sm font-medium">Marketing Resources</span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-[#EF4923] transition-colors" />
                </a>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>

      <GoogleDocModal
        isOpen={showHandbook}
        onClose={() => setShowHandbook(false)}
        title={DOCUMENTS.companyHandbook.title}
        docId={DOCUMENTS.companyHandbook.docId}
        externalUrl={DOCUMENTS.companyHandbook.externalUrl}
      />

      <TrainingVideosModal
        isOpen={showTrainingVideos}
        onClose={() => {
          setShowTrainingVideos(false);
          setSelectedVideoId(null);
        }}
        initialVideoId={selectedVideoId || undefined}
      />
    </Layout>
  );
}
