import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Play, Clock, Calendar, Search, Heart, BookmarkPlus,
  History, Loader2, CheckCircle, ChevronLeft, ChevronRight,
  GraduationCap, List, X
} from 'lucide-react';
import { useTheme } from 'next-themes';
import Layout from '@/components/layout';
import Player from '@vimeo/player';
import { useIsMobile } from '@/hooks/use-mobile';

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

export default function TrainingPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const isMobile = useIsMobile();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<Player | null>(null);
  const lastProgressSaveRef = useRef<number>(0);
  const currentProgressRef = useRef<{ seconds: number; percent: number }>({ seconds: 0, percent: 0 });
  const selectedVideoRef = useRef<VimeoVideo | null>(null);
  
  const [videos, setVideos] = useState<VimeoVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VimeoVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [preferences, setPreferences] = useState<Record<string, VideoPreference>>({});
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const [showMobileList, setShowMobileList] = useState(false);

  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';
  const textMuted = isDark ? 'text-gray-500' : 'text-gray-400';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
  const hoverBg = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100';
  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
  const inputText = isDark ? 'text-white' : 'text-gray-900';
  const inputPlaceholder = isDark ? 'placeholder-gray-400' : 'placeholder-gray-500';
  const buttonBg = isDark ? 'bg-gray-700' : 'bg-gray-100';
  const buttonHover = isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-200';
  const buttonText = isDark ? 'text-gray-300' : 'text-gray-700';
  const cardHover = isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100';
  const cardActive = isDark ? 'bg-orange-500/20' : 'bg-orange-50';
  const activeText = isDark ? 'text-orange-400' : 'text-orange-600';
  const activeBorder = 'border-orange-500';
  const sidebarBg = isDark ? 'bg-gray-800' : 'bg-gray-50';

  useEffect(() => {
    selectedVideoRef.current = selectedVideo;
  }, [selectedVideo]);

  useEffect(() => {
    fetchVideos();
    fetchPreferences();
  }, []);

  useEffect(() => {
    if (videos.length > 0 && !selectedVideo && preferencesLoaded) {
      setSelectedVideo(videos[0]);
    }
  }, [videos, preferencesLoaded]);

  useEffect(() => {
    if (selectedVideo && iframeReady && iframeRef.current) {
      initializePlayer();
    }
    
    return () => {
      if (playerRef.current) {
        saveProgress(true);
        playerRef.current.off('timeupdate');
        playerRef.current.off('pause');
        playerRef.current.off('ended');
        playerRef.current = null;
      }
    };
  }, [selectedVideo, iframeReady]);

  const initializePlayer = async () => {
    if (!iframeRef.current || !selectedVideo) return;
    
    try {
      const player = new Player(iframeRef.current);
      playerRef.current = player;
      
      await player.ready();
      
      const pref = preferences[selectedVideo.id];
      if (pref && pref.watchProgress > 0 && pref.watchPercentage < 95) {
        await player.setCurrentTime(pref.watchProgress);
      }
      
      player.on('timeupdate', (data: { seconds: number; percent: number }) => {
        currentProgressRef.current = { seconds: data.seconds, percent: data.percent * 100 };
        
        const now = Date.now();
        if (now - lastProgressSaveRef.current > 10000) {
          saveProgress(false);
          lastProgressSaveRef.current = now;
        }
      });
      
      player.on('pause', () => saveProgress(true));
      player.on('ended', () => saveProgress(true));
      
    } catch (err) {
      console.error('Failed to initialize player:', err);
    }
  };

  const saveProgress = async (immediate: boolean = false) => {
    const video = selectedVideoRef.current;
    if (!video) return;
    
    const { seconds, percent } = currentProgressRef.current;
    if (percent < 5 || percent > 95) return;
    
    const payload = {
      videoId: video.id,
      progress: seconds,
      percentage: percent,
      videoName: video.name,
      videoThumbnail: getThumbnail(video),
      videoDuration: video.duration
    };
    
    try {
      if (immediate && 'sendBeacon' in navigator) {
        navigator.sendBeacon('/api/videos/progress', JSON.stringify(payload));
      } else {
        await fetch('/api/videos/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true
        });
      }
      
      setPreferences(prev => ({
        ...prev,
        [video.id]: {
          ...prev[video.id],
          isFavorite: prev[video.id]?.isFavorite || false,
          isWatchLater: prev[video.id]?.isWatchLater || false,
          watchProgress: seconds,
          watchPercentage: percent,
          lastWatchedAt: new Date().toISOString()
        }
      }));
    } catch (err) {
      console.error('Failed to save progress:', err);
    }
  };

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
    } finally {
      setPreferencesLoaded(true);
    }
  };

  const toggleFavorite = async (video: VimeoVideo, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
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

  const toggleWatchLater = async (video: VimeoVideo, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
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

  const filteredVideos = useMemo(() => {
    let result = [...videos];
    
    if (searchQuery) {
      result = result.filter(v => 
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (filter === 'new') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      result = result.filter(v => new Date(v.created_time) >= sevenDaysAgo);
    } else if (filter === 'favorites') {
      result = result.filter(v => preferences[v.id]?.isFavorite);
    } else if (filter === 'watchLater') {
      result = result.filter(v => preferences[v.id]?.isWatchLater);
    } else if (filter === 'continue') {
      result = result.filter(v => {
        const pref = preferences[v.id];
        return pref && pref.watchProgress > 0 && pref.watchPercentage < 95;
      });
      result.sort((a, b) => {
        const aTime = preferences[a.id]?.lastWatchedAt;
        const bTime = preferences[b.id]?.lastWatchedAt;
        if (!aTime) return 1;
        if (!bTime) return -1;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
      return result;
    }
    
    if (sortOrder === 'oldest') {
      result.sort((a, b) => new Date(a.created_time).getTime() - new Date(b.created_time).getTime());
    } else if (sortOrder === 'duration') {
      result.sort((a, b) => b.duration - a.duration);
    } else {
      result.sort((a, b) => new Date(b.created_time).getTime() - new Date(a.created_time).getTime());
    }
    
    return result;
  }, [videos, searchQuery, filter, sortOrder, preferences]);

  const currentIndex = filteredVideos.findIndex(v => v.id === selectedVideo?.id);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isNew = (video: VimeoVideo) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(video.created_time) >= sevenDaysAgo;
  };

  const getThumbnail = (video: VimeoVideo) => {
    const sizes = video.pictures?.sizes || [];
    const medium = sizes.find(s => s.width >= 640) || sizes[sizes.length - 1];
    return medium?.link || '';
  };

  const getEmbedUrl = (video: VimeoVideo) => {
    const baseUrl = video.player_embed_url || `https://player.vimeo.com/video/${video.id}`;
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}autoplay=0&title=0&byline=0&portrait=0`;
  };

  const playNext = () => {
    if (currentIndex < filteredVideos.length - 1) {
      saveProgress(true);
      setIframeReady(false);
      setSelectedVideo(filteredVideos[currentIndex + 1]);
    }
  };

  const playPrevious = () => {
    if (currentIndex > 0) {
      saveProgress(true);
      setIframeReady(false);
      setSelectedVideo(filteredVideos[currentIndex - 1]);
    }
  };

  const filterTabs = [
    { key: 'all', label: 'All Videos', icon: null },
    { key: 'new', label: 'New', icon: null },
    { key: 'favorites', label: 'Favorites', icon: Heart },
    { key: 'watchLater', label: 'Watch Later', icon: BookmarkPlus },
    { key: 'continue', label: 'Continue', icon: History },
  ];

  return (
    <Layout>
      <div className="p-4 sm:p-6" data-testid="page-training">
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className={`text-xl sm:text-2xl font-bold ${textPrimary}`} data-testid="text-page-title">Training Library</h1>
                <p className={`${textSecondary} text-sm`} data-testid="text-video-count">
                  {videos.length} training videos available
                </p>
              </div>
            </div>
            {isMobile && (
              <button
                onClick={() => setShowMobileList(!showMobileList)}
                className={`p-2 rounded-lg ${hoverBg} transition-colors ${showMobileList ? activeText : textSecondary} touch-target flex items-center justify-center`}
                data-testid="button-toggle-mobile-list"
              >
                <List className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className={`w-8 h-8 animate-spin ${textSecondary}`} />
          </div>
        )}

        {error && !loading && (
          <div className={`${cardBg} rounded-xl p-8 text-center border ${borderColor}`}>
            <p className="text-red-500 mb-4">{error}</p>
            <button 
              onClick={fetchVideos}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors touch-target"
              data-testid="button-retry"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 relative">
            <div className="flex-1 min-w-0">
              <div className={`${cardBg} rounded-xl overflow-hidden border ${borderColor}`}>
                <div className="aspect-video bg-black relative">
                  {selectedVideo ? (
                    <>
                      <iframe
                        ref={iframeRef}
                        src={getEmbedUrl(selectedVideo)}
                        className="w-full h-full"
                        frameBorder="0"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                        title={selectedVideo.name}
                        onLoad={() => setIframeReady(true)}
                        data-testid="video-player-iframe"
                      />
                      
                      <div className="absolute top-4 right-4 flex flex-col gap-2">
                        <button
                          onClick={(e) => toggleFavorite(selectedVideo, e)}
                          className={`p-2 rounded-full transition-all touch-target ${
                            preferences[selectedVideo.id]?.isFavorite 
                              ? 'bg-red-500 text-white' 
                              : 'bg-black/50 text-white hover:bg-black/70'
                          }`}
                          title={preferences[selectedVideo.id]?.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                          data-testid="button-favorite-player"
                        >
                          <Heart className={`w-5 h-5 ${preferences[selectedVideo.id]?.isFavorite ? 'fill-white' : ''}`} />
                        </button>
                        <button
                          onClick={(e) => toggleWatchLater(selectedVideo, e)}
                          className={`p-2 rounded-full transition-all touch-target ${
                            preferences[selectedVideo.id]?.isWatchLater 
                              ? 'bg-orange-500 text-white' 
                              : 'bg-black/50 text-white hover:bg-black/70'
                          }`}
                          title={preferences[selectedVideo.id]?.isWatchLater ? 'Remove from watch later' : 'Add to watch later'}
                          data-testid="button-watchlater-player"
                        >
                          <BookmarkPlus className={`w-5 h-5 ${preferences[selectedVideo.id]?.isWatchLater ? 'fill-white' : ''}`} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/50">
                      Select a video to play
                    </div>
                  )}
                </div>
                
                {selectedVideo && (
                  <div className={`p-3 sm:p-4 border-t ${borderColor}`}>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={playPrevious}
                        disabled={currentIndex === 0}
                        className={`flex items-center gap-2 px-2 sm:px-3 py-2 text-sm rounded-lg transition-colors touch-target
                          ${currentIndex === 0 
                            ? `${textMuted} cursor-not-allowed` 
                            : `${textSecondary} ${hoverBg}`
                          }`}
                        data-testid="button-previous-video"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Previous</span>
                      </button>
                      
                      <div className="text-center flex-1 min-w-0 px-2 sm:px-4">
                        <h2 className={`font-semibold ${textPrimary} truncate text-sm sm:text-base`} data-testid="text-current-video-title">{selectedVideo.name}</h2>
                        <div className={`flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm ${textSecondary} mt-1`}>
                          <span className="flex items-center gap-1" data-testid="text-current-video-duration">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                            {formatDuration(selectedVideo.duration)}
                          </span>
                          <span className="flex items-center gap-1 hidden sm:flex" data-testid="text-current-video-date">
                            <Calendar className="w-4 h-4" />
                            {formatDate(selectedVideo.created_time)}
                          </span>
                          <span className={`text-xs ${textMuted}`} data-testid="text-video-position">
                            {currentIndex + 1} of {filteredVideos.length}
                          </span>
                        </div>
                      </div>
                      
                      <button
                        onClick={playNext}
                        disabled={currentIndex === filteredVideos.length - 1}
                        className={`flex items-center gap-2 px-2 sm:px-3 py-2 text-sm rounded-lg transition-colors touch-target
                          ${currentIndex === filteredVideos.length - 1 
                            ? `${textMuted} cursor-not-allowed` 
                            : `${textSecondary} ${hoverBg}`
                          }`}
                        data-testid="button-next-video"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {(isMobile ? showMobileList : true) && (
              <div className={`
                ${isMobile 
                  ? 'fixed inset-0 z-50 bg-black/50' 
                  : 'w-96'
                }
              `}>
                <div className={`
                  ${isMobile 
                    ? 'absolute right-0 top-0 bottom-0 w-full max-w-sm' 
                    : ''
                  }
                  ${sidebarBg} ${isMobile ? '' : 'rounded-xl'} border ${borderColor} flex flex-col ${isMobile ? 'h-full' : 'max-h-[calc(100vh-220px)] sticky top-6'}
                `}>
                  {isMobile && (
                    <div className={`flex items-center justify-between px-4 py-3 border-b ${borderColor}`}>
                      <h3 className={`font-semibold ${textPrimary}`}>Video List</h3>
                      <button
                        onClick={() => setShowMobileList(false)}
                        className={`p-2 rounded-lg ${hoverBg} ${textSecondary} touch-target flex items-center justify-center`}
                        data-testid="button-close-mobile-list"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                  
                  <div className={`p-3 border-b ${borderColor}`}>
                    <div className="relative">
                      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted}`} />
                      <input
                        type="text"
                        placeholder="Search videos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full pl-9 pr-3 py-2.5 ${inputBg} border ${inputBorder} rounded-lg text-sm ${inputText} ${inputPlaceholder} focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors`}
                        data-testid="input-search-videos"
                      />
                    </div>
                  </div>

                  <div className={`flex gap-1.5 p-2 border-b ${borderColor} overflow-x-auto scrollbar-hide`}>
                    {filterTabs.map(tab => {
                      const Icon = tab.icon;
                      const count = tab.key === 'favorites' 
                        ? videos.filter(v => preferences[v.id]?.isFavorite).length
                        : tab.key === 'watchLater'
                        ? videos.filter(v => preferences[v.id]?.isWatchLater).length
                        : tab.key === 'continue'
                        ? videos.filter(v => {
                            const pref = preferences[v.id];
                            return pref && pref.watchProgress > 0 && pref.watchPercentage < 95;
                          }).length
                        : null;
                      
                      return (
                        <button
                          key={tab.key}
                          onClick={() => setFilter(tab.key)}
                          className={`flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-full whitespace-nowrap transition-colors flex-shrink-0 touch-target
                            ${filter === tab.key 
                              ? 'bg-orange-500 text-white' 
                              : `${buttonBg} ${buttonText} ${buttonHover}`
                            }`}
                          data-testid={`button-filter-${tab.key}`}
                        >
                          {Icon && <Icon className="w-3.5 h-3.5" />}
                          {tab.label}
                          {count !== null && count > 0 && (
                            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                              filter === tab.key ? 'bg-white/20' : isDark ? 'bg-gray-600' : 'bg-gray-300'
                            }`}>
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {filter !== 'continue' && (
                    <div className={`px-3 py-2 border-b ${borderColor} flex items-center justify-between`}>
                      <span className={`text-xs ${textSecondary}`}>
                        {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''}
                      </span>
                      <select 
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className={`text-xs ${inputBg} border ${inputBorder} ${buttonText} rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500`}
                        data-testid="select-sort-order"
                      >
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                        <option value="duration">Duration</option>
                      </select>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto">
                    {filteredVideos.length === 0 ? (
                      <div className={`p-6 text-center ${textSecondary}`}>
                        {filter === 'favorites' ? (
                          <>
                            <Heart className={`w-12 h-12 mx-auto mb-3 ${textMuted}`} />
                            <p className="font-medium">No favorites yet</p>
                            <p className="text-sm mt-1">Click the heart icon on any video to add it to your favorites.</p>
                          </>
                        ) : filter === 'watchLater' ? (
                          <>
                            <BookmarkPlus className={`w-12 h-12 mx-auto mb-3 ${textMuted}`} />
                            <p className="font-medium">Watch later list is empty</p>
                            <p className="text-sm mt-1">Click the bookmark icon on any video to save it for later.</p>
                          </>
                        ) : filter === 'continue' ? (
                          <>
                            <History className={`w-12 h-12 mx-auto mb-3 ${textMuted}`} />
                            <p className="font-medium">No videos in progress</p>
                            <p className="text-sm mt-1">Start watching a video and it will appear here.</p>
                          </>
                        ) : searchQuery ? (
                          <>
                            <Search className={`w-12 h-12 mx-auto mb-3 ${textMuted}`} />
                            <p className="font-medium">No results found</p>
                            <p className="text-sm mt-1">Try a different search term.</p>
                          </>
                        ) : (
                          <p>No videos available</p>
                        )}
                      </div>
                    ) : (
                      <div className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                        {filteredVideos.map((video) => {
                          const pref = preferences[video.id];
                          const hasProgress = pref && pref.watchProgress > 0 && pref.watchPercentage < 95;
                          const isCompleted = pref && pref.watchPercentage >= 95;
                          
                          return (
                            <button
                              key={video.id}
                              onClick={() => {
                                saveProgress(true);
                                setIframeReady(false);
                                setSelectedVideo(video);
                                if (isMobile) setShowMobileList(false);
                              }}
                              className={`
                                w-full p-2 sm:p-3 text-left transition-all duration-200 group relative touch-target
                                ${selectedVideo?.id === video.id 
                                  ? `${cardActive} border-l-2 ${activeBorder}` 
                                  : `${cardHover} border-l-2 border-transparent`
                                }
                              `}
                              data-testid={`button-video-${video.id}`}
                            >
                              <div className="flex gap-3">
                                <div className="relative flex-shrink-0 w-28 h-16 rounded-lg overflow-hidden bg-gray-800">
                                  {getThumbnail(video) ? (
                                    <img 
                                      src={getThumbnail(video)} 
                                      alt={video.name}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Play className="w-6 h-6 text-white/30" />
                                    </div>
                                  )}
                                  
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center">
                                      <Play className="w-4 h-4 text-gray-900 fill-gray-900 ml-0.5" />
                                    </div>
                                  </div>
                                  
                                  {hasProgress && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                                      <div 
                                        className="h-full bg-orange-500"
                                        style={{ width: `${pref.watchPercentage}%` }}
                                      />
                                    </div>
                                  )}
                                  
                                  {isCompleted && (
                                    <div className="absolute top-1 right-1">
                                      <CheckCircle className="w-4 h-4 text-green-500 fill-green-500" />
                                    </div>
                                  )}
                                  
                                  <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 text-white text-xs rounded font-medium">
                                    {formatDuration(video.duration)}
                                  </span>
                                  
                                  {isNew(video) && !hasProgress && !isCompleted && (
                                    <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-orange-500 text-white text-xs rounded font-bold">
                                      NEW
                                    </span>
                                  )}
                                  
                                  {selectedVideo?.id === video.id && (
                                    <div className={`absolute inset-0 border-2 ${activeBorder} rounded-lg`}>
                                      <div className="absolute top-1 left-1 flex items-center gap-1 px-1.5 py-0.5 bg-orange-500 rounded text-xs text-white font-medium">
                                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                                        Playing
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex-1 min-w-0 py-0.5">
                                  <h4 className={`font-medium text-sm line-clamp-2 ${selectedVideo?.id === video.id ? activeText : textPrimary}`} data-testid={`text-video-title-${video.id}`}>
                                    {video.name}
                                  </h4>
                                  <p className={`text-xs ${textSecondary} mt-1`} data-testid={`text-video-date-${video.id}`}>
                                    {formatDate(video.created_time)}
                                  </p>
                                  
                                  <div className="flex items-center gap-2 mt-1">
                                    {pref?.isFavorite && (
                                      <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                                    )}
                                    {pref?.isWatchLater && (
                                      <BookmarkPlus className="w-3 h-3 text-orange-500 fill-orange-500" />
                                    )}
                                    {hasProgress && (
                                      <span className={`text-xs ${textMuted}`}>
                                        {Math.round(pref.watchPercentage)}% watched
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`video-actions-${video.id}`}>
                                <button
                                  onClick={(e) => toggleFavorite(video, e)}
                                  className={`p-1.5 rounded-full transition-colors ${
                                    pref?.isFavorite 
                                      ? 'bg-red-500 text-white' 
                                      : `${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} ${textSecondary}`
                                  }`}
                                  title={pref?.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                  data-testid={`button-favorite-${video.id}`}
                                >
                                  <Heart className={`w-3 h-3 ${pref?.isFavorite ? 'fill-white' : ''}`} />
                                </button>
                                <button
                                  onClick={(e) => toggleWatchLater(video, e)}
                                  className={`p-1.5 rounded-full transition-colors ${
                                    pref?.isWatchLater 
                                      ? 'bg-orange-500 text-white' 
                                      : `${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} ${textSecondary}`
                                  }`}
                                  title={pref?.isWatchLater ? 'Remove from watch later' : 'Add to watch later'}
                                  data-testid={`button-watchlater-${video.id}`}
                                >
                                  <BookmarkPlus className={`w-3 h-3 ${pref?.isWatchLater ? 'fill-white' : ''}`} />
                                </button>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
