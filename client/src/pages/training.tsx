import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Play, Clock, Calendar, Search, Heart, BookmarkPlus,
  History, Loader2, CheckCircle, ChevronLeft, ChevronRight,
  GraduationCap, Info, X, Plus
} from 'lucide-react';
import { useTheme } from 'next-themes';
import Layout from '@/components/layout';

interface VimeoVideo {
  id: string;
  name: string;
  description: string;
  duration: number;
  created_time: string;
  link: string;
  player_embed_url: string;
  pictures: {
    sizes: Array<{ link: string; width: number; height: number }>;
  };
}

interface VideoPreference {
  isFavorite: boolean;
  isWatchLater: boolean;
  watchProgress: number;
  watchPercentage: number;
  lastWatchedAt: string | null;
}

interface VideoCardProps {
  video: VimeoVideo;
  preference?: VideoPreference;
  onPlay: (video: VimeoVideo) => void;
  onToggleFavorite: (video: VimeoVideo, e: React.MouseEvent) => void;
  onToggleWatchLater: (video: VimeoVideo, e: React.MouseEvent) => void;
  isDark: boolean;
  isNew?: boolean;
  showProgress?: boolean;
}

function VideoCard({ 
  video, 
  preference, 
  onPlay, 
  onToggleFavorite, 
  onToggleWatchLater,
  isDark,
  isNew = false,
  showProgress = true
}: VideoCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const hasProgress = preference && preference.watchProgress > 0 && preference.watchPercentage < 95;
  const isCompleted = preference && preference.watchPercentage >= 95;

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getThumbnail = () => {
    const sizes = video.pictures?.sizes || [];
    const medium = sizes.find(s => s.width >= 640) || sizes[sizes.length - 1];
    return medium?.link || '';
  };

  return (
    <div
      className="relative flex-shrink-0 w-56 sm:w-64 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`video-card-${video.id}`}
    >
      <div 
        className={`
          relative rounded-lg overflow-hidden cursor-pointer
          transition-all duration-300 ease-out
          ${isHovered ? 'scale-105 z-20 shadow-2xl' : 'scale-100 z-10'}
          ${isDark ? 'bg-gray-800' : 'bg-white shadow-md'}
        `}
        onClick={() => onPlay(video)}
      >
        <div className="relative aspect-video bg-gray-900">
          {getThumbnail() ? (
            <img 
              src={getThumbnail()} 
              alt={video.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="w-12 h-12 text-white/30" />
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
              <Play className="w-6 h-6 text-gray-900 fill-gray-900 ml-1" />
            </div>
          </div>
          
          {showProgress && hasProgress && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
              <div 
                className="h-full bg-orange-500"
                style={{ width: `${preference.watchPercentage}%` }}
              />
            </div>
          )}
          
          {isCompleted && (
            <div className="absolute top-2 right-2">
              <CheckCircle className="w-5 h-5 text-green-500 fill-green-500 drop-shadow-lg" />
            </div>
          )}
          
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white text-xs rounded font-medium">
            {formatDuration(video.duration)}
          </span>
          
          {isNew && !hasProgress && !isCompleted && (
            <span className="absolute top-2 left-2 px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded shadow-lg">
              NEW
            </span>
          )}
          
          {(preference?.isFavorite || preference?.isWatchLater) && !isCompleted && (
            <div className="absolute top-2 right-2 flex gap-1">
              {preference?.isFavorite && (
                <Heart className="w-4 h-4 text-red-500 fill-red-500 drop-shadow-lg" />
              )}
              {preference?.isWatchLater && !preference?.isFavorite && (
                <BookmarkPlus className="w-4 h-4 text-orange-500 fill-orange-500 drop-shadow-lg" />
              )}
            </div>
          )}
        </div>
        
        <div 
          className={`
            transition-all duration-300 overflow-hidden
            ${isHovered ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}
          `}
        >
          <div className={`p-3 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center gap-2 mb-2">
              <button 
                className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors shadow"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay(video);
                }}
                data-testid={`button-play-${video.id}`}
              >
                <Play className="w-4 h-4 text-gray-900 fill-gray-900 ml-0.5" />
              </button>
              <button 
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow ${
                  preference?.isFavorite 
                    ? 'bg-red-500 text-white' 
                    : isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
                onClick={(e) => onToggleFavorite(video, e)}
                data-testid={`button-favorite-${video.id}`}
              >
                <Heart className={`w-4 h-4 ${preference?.isFavorite ? 'fill-white' : ''}`} />
              </button>
              <button 
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow ${
                  preference?.isWatchLater 
                    ? 'bg-orange-500 text-white' 
                    : isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
                onClick={(e) => onToggleWatchLater(video, e)}
                data-testid={`button-watchlater-${video.id}`}
              >
                <Plus className={`w-4 h-4 ${preference?.isWatchLater ? '' : ''}`} />
              </button>
            </div>
            
            <h4 className={`font-medium text-sm line-clamp-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {video.name}
            </h4>
          </div>
        </div>
      </div>
    </div>
  );
}

interface VideoRowProps {
  title: string;
  icon: React.ReactNode;
  videos: VimeoVideo[];
  preferences: Record<string, VideoPreference>;
  onPlay: (video: VimeoVideo) => void;
  onToggleFavorite: (video: VimeoVideo, e: React.MouseEvent) => void;
  onToggleWatchLater: (video: VimeoVideo, e: React.MouseEvent) => void;
  isDark: boolean;
  showProgress?: boolean;
  showNewBadge?: boolean;
  emptyMessage?: string;
}

function VideoRow({
  title,
  icon,
  videos,
  preferences,
  onPlay,
  onToggleFavorite,
  onToggleWatchLater,
  isDark,
  showProgress = false,
  showNewBadge = false,
  emptyMessage
}: VideoRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', checkScroll);
      return () => ref.removeEventListener('scroll', checkScroll);
    }
  }, [checkScroll, videos]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -600 : 600;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const isNew = (video: VimeoVideo) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(video.created_time) >= sevenDaysAgo;
  };

  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';

  if (videos.length === 0 && !emptyMessage) return null;

  return (
    <div className="mb-8" data-testid={`video-row-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center gap-3 mb-4 px-1">
        {icon}
        <h2 className={`text-xl font-bold ${textPrimary}`}>{title}</h2>
        {videos.length > 0 && (
          <span className={`text-sm ${textSecondary}`}>({videos.length})</span>
        )}
      </div>
      
      {videos.length === 0 ? (
        <div className={`text-center py-8 ${textSecondary}`}>
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="relative group/row">
          {showLeftArrow && (
            <button
              onClick={() => scroll('left')}
              className={`absolute left-0 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full flex items-center justify-center transition-opacity shadow-lg ${
                isDark ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-white hover:bg-gray-100 text-gray-900'
              } opacity-0 group-hover/row:opacity-100`}
              data-testid={`button-scroll-left-${title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 px-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {videos.map(video => (
              <VideoCard
                key={video.id}
                video={video}
                preference={preferences[video.id]}
                onPlay={onPlay}
                onToggleFavorite={onToggleFavorite}
                onToggleWatchLater={onToggleWatchLater}
                isDark={isDark}
                isNew={showNewBadge && isNew(video)}
                showProgress={showProgress}
              />
            ))}
          </div>
          
          {showRightArrow && videos.length > 4 && (
            <button
              onClick={() => scroll('right')}
              className={`absolute right-0 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full flex items-center justify-center transition-opacity shadow-lg ${
                isDark ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-white hover:bg-gray-100 text-gray-900'
              } opacity-0 group-hover/row:opacity-100`}
              data-testid={`button-scroll-right-${title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface HeroBannerProps {
  video: VimeoVideo;
  preference?: VideoPreference;
  onPlay: (video: VimeoVideo) => void;
  onToggleWatchLater: (video: VimeoVideo, e: React.MouseEvent) => void;
  isDark: boolean;
}

function HeroBanner({ video, preference, onPlay, onToggleWatchLater, isDark }: HeroBannerProps) {
  const getThumbnail = () => {
    const sizes = video.pictures?.sizes || [];
    const large = sizes.find(s => s.width >= 1280) || sizes[sizes.length - 1];
    return large?.link || '';
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins} min`;
  };

  const isNew = () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(video.created_time) >= sevenDaysAgo;
  };

  return (
    <div className="relative h-[400px] sm:h-[500px] mb-8 rounded-2xl overflow-hidden" data-testid="hero-banner">
      <div className="absolute inset-0 bg-gray-900">
        {getThumbnail() && (
          <img 
            src={getThumbnail()} 
            alt={video.name}
            className="w-full h-full object-cover opacity-60"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      </div>
      
      <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-3">
            {isNew() && (
              <span className="px-3 py-1 bg-orange-500 text-white text-sm font-bold rounded">
                NEW
              </span>
            )}
            <span className="text-white/70 text-sm flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatDuration(video.duration)}
            </span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3" data-testid="hero-video-title">
            {video.name}
          </h1>
          
          {video.description && (
            <p className="text-white/80 text-base sm:text-lg line-clamp-2 mb-6 max-w-xl">
              {video.description}
            </p>
          )}
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => onPlay(video)}
              className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-200 text-gray-900 font-semibold rounded-lg transition-colors shadow-lg"
              data-testid="button-hero-play"
            >
              <Play className="w-5 h-5 fill-gray-900" />
              <span>Play Now</span>
            </button>
            
            <button
              onClick={(e) => onToggleWatchLater(video, e)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors shadow-lg ${
                preference?.isWatchLater
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur'
              }`}
              data-testid="button-hero-watchlater"
            >
              <Plus className="w-5 h-5" />
              <span>{preference?.isWatchLater ? 'In My List' : 'My List'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface VideoPlayerModalProps {
  video: VimeoVideo | null;
  onClose: () => void;
  isDark: boolean;
}

function VideoPlayerModal({ video, onClose, isDark }: VideoPlayerModalProps) {
  if (!video) return null;

  const getEmbedUrl = () => {
    if (video.player_embed_url) {
      const url = new URL(video.player_embed_url);
      url.searchParams.set('autoplay', '1');
      url.searchParams.set('title', '0');
      url.searchParams.set('byline', '0');
      url.searchParams.set('portrait', '0');
      return url.toString();
    }
    return `https://player.vimeo.com/video/${video.id}?autoplay=1&title=0&byline=0&portrait=0`;
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
      data-testid="video-player-modal"
    >
      <div 
        className="relative w-full max-w-5xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
          data-testid="button-close-modal"
        >
          <X className="w-8 h-8" />
        </button>
        
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <iframe
            src={getEmbedUrl()}
            className="w-full h-full"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title={video.name}
          />
        </div>
        
        <h3 className="text-white text-xl font-semibold mt-4" data-testid="modal-video-title">
          {video.name}
        </h3>
      </div>
    </div>
  );
}

export default function TrainingPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  const [videos, setVideos] = useState<VimeoVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [preferences, setPreferences] = useState<Record<string, VideoPreference>>({});
  const [playingVideo, setPlayingVideo] = useState<VimeoVideo | null>(null);

  const pageBg = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';
  const inputBg = isDark ? 'bg-gray-800' : 'bg-white';
  const inputBorder = isDark ? 'border-gray-700' : 'border-gray-200';

  useEffect(() => {
    fetchVideos();
    fetchPreferences();
  }, []);

  const fetchVideos = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/vimeo/training-videos', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch videos');
      
      const data = await response.json();
      const sortedVideos = (data.videos || []).sort((a: VimeoVideo, b: VimeoVideo) => 
        new Date(b.created_time).getTime() - new Date(a.created_time).getTime()
      );
      setVideos(sortedVideos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/videos/preferences', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences || {});
      }
    } catch (err) {
      console.error('Failed to fetch preferences:', err);
    }
  };

  const getThumbnail = (video: VimeoVideo) => {
    const sizes = video.pictures?.sizes || [];
    const medium = sizes.find(s => s.width >= 640) || sizes[sizes.length - 1];
    return medium?.link || '';
  };

  const toggleFavorite = async (video: VimeoVideo, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/videos/${video.id}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          videoName: video.name,
          videoThumbnail: getThumbnail(video),
          videoDuration: video.duration
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setPreferences(prev => ({
          ...prev,
          [video.id]: {
            ...prev[video.id],
            isFavorite: data.isFavorite,
            isWatchLater: prev[video.id]?.isWatchLater || false,
            watchProgress: prev[video.id]?.watchProgress || 0,
            watchPercentage: prev[video.id]?.watchPercentage || 0,
            lastWatchedAt: prev[video.id]?.lastWatchedAt || null
          }
        }));
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const toggleWatchLater = async (video: VimeoVideo, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/videos/${video.id}/watch-later`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          videoName: video.name,
          videoThumbnail: getThumbnail(video),
          videoDuration: video.duration
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setPreferences(prev => ({
          ...prev,
          [video.id]: {
            ...prev[video.id],
            isFavorite: prev[video.id]?.isFavorite || false,
            isWatchLater: data.isWatchLater,
            watchProgress: prev[video.id]?.watchProgress || 0,
            watchPercentage: prev[video.id]?.watchPercentage || 0,
            lastWatchedAt: prev[video.id]?.lastWatchedAt || null
          }
        }));
      }
    } catch (err) {
      console.error('Failed to toggle watch later:', err);
    }
  };

  const isNew = (video: VimeoVideo) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(video.created_time) >= sevenDaysAgo;
  };

  const filteredVideos = useMemo(() => {
    if (!searchQuery) return videos;
    return videos.filter(v => 
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [videos, searchQuery]);

  const continueWatching = useMemo(() => {
    return videos.filter(v => {
      const pref = preferences[v.id];
      return pref && pref.watchProgress > 0 && pref.watchPercentage < 95;
    }).sort((a, b) => {
      const aTime = preferences[a.id]?.lastWatchedAt;
      const bTime = preferences[b.id]?.lastWatchedAt;
      if (!aTime) return 1;
      if (!bTime) return -1;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }, [videos, preferences]);

  const newVideos = useMemo(() => {
    return videos.filter(v => isNew(v));
  }, [videos]);

  const favorites = useMemo(() => {
    return videos.filter(v => preferences[v.id]?.isFavorite);
  }, [videos, preferences]);

  const watchLater = useMemo(() => {
    return videos.filter(v => preferences[v.id]?.isWatchLater);
  }, [videos, preferences]);

  const latestVideo = videos[0];

  if (loading) {
    return (
      <Layout>
        <div className={`min-h-[80vh] ${pageBg} flex items-center justify-center`}>
          <Loader2 className={`w-8 h-8 animate-spin ${textSecondary}`} />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className={`min-h-[80vh] ${pageBg} flex items-center justify-center`}>
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button 
              onClick={fetchVideos}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              data-testid="button-retry"
            >
              Retry
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={`min-h-[80vh] ${pageBg} -m-4 sm:-m-6 p-4 sm:p-6`} data-testid="training-page">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className={`text-xl sm:text-2xl font-bold ${textPrimary}`} data-testid="text-page-title">Training Library</h1>
                <p className={`text-sm ${textSecondary}`} data-testid="text-video-count">{videos.length} videos</p>
              </div>
            </div>
            
            <div className="relative w-full sm:w-80">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
              <input
                type="text"
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 ${inputBg} border ${inputBorder} rounded-full text-sm ${textPrimary} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all`}
                data-testid="input-search"
              />
            </div>
          </div>

          {searchQuery ? (
            <div>
              <h2 className={`text-xl font-bold mb-4 ${textPrimary}`}>
                Search Results for "{searchQuery}" ({filteredVideos.length})
              </h2>
              <div className="flex flex-wrap gap-4">
                {filteredVideos.map(video => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    preference={preferences[video.id]}
                    onPlay={setPlayingVideo}
                    onToggleFavorite={toggleFavorite}
                    onToggleWatchLater={toggleWatchLater}
                    isDark={isDark}
                    isNew={isNew(video)}
                  />
                ))}
              </div>
              {filteredVideos.length === 0 && (
                <p className={`text-center py-8 ${textSecondary}`}>No videos found matching your search.</p>
              )}
            </div>
          ) : (
            <>
              {latestVideo && (
                <HeroBanner
                  video={latestVideo}
                  preference={preferences[latestVideo.id]}
                  onPlay={setPlayingVideo}
                  onToggleWatchLater={toggleWatchLater}
                  isDark={isDark}
                />
              )}

              {continueWatching.length > 0 && (
                <VideoRow
                  title="Continue Watching"
                  icon={<History className="w-6 h-6 text-orange-500" />}
                  videos={continueWatching}
                  preferences={preferences}
                  onPlay={setPlayingVideo}
                  onToggleFavorite={toggleFavorite}
                  onToggleWatchLater={toggleWatchLater}
                  isDark={isDark}
                  showProgress={true}
                />
              )}

              {newVideos.length > 0 && (
                <VideoRow
                  title="New This Week"
                  icon={<span className="text-xl">🆕</span>}
                  videos={newVideos}
                  preferences={preferences}
                  onPlay={setPlayingVideo}
                  onToggleFavorite={toggleFavorite}
                  onToggleWatchLater={toggleWatchLater}
                  isDark={isDark}
                  showNewBadge={true}
                />
              )}

              <VideoRow
                title="My Favorites"
                icon={<Heart className="w-6 h-6 text-red-500" />}
                videos={favorites}
                preferences={preferences}
                onPlay={setPlayingVideo}
                onToggleFavorite={toggleFavorite}
                onToggleWatchLater={toggleWatchLater}
                isDark={isDark}
                emptyMessage="Click the heart icon on any video to add it to your favorites"
              />

              <VideoRow
                title="Watch Later"
                icon={<BookmarkPlus className="w-6 h-6 text-orange-500" />}
                videos={watchLater}
                preferences={preferences}
                onPlay={setPlayingVideo}
                onToggleFavorite={toggleFavorite}
                onToggleWatchLater={toggleWatchLater}
                isDark={isDark}
                emptyMessage="Click the + icon on any video to save it for later"
              />

              <VideoRow
                title="All Training Videos"
                icon={<GraduationCap className="w-6 h-6 text-orange-500" />}
                videos={videos}
                preferences={preferences}
                onPlay={setPlayingVideo}
                onToggleFavorite={toggleFavorite}
                onToggleWatchLater={toggleWatchLater}
                isDark={isDark}
                showNewBadge={true}
              />
            </>
          )}
        </div>

        <VideoPlayerModal
          video={playingVideo}
          onClose={() => setPlayingVideo(null)}
          isDark={isDark}
        />

        <style>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
      </div>
    </Layout>
  );
}
