import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  X, Play, Clock, Calendar, ChevronRight, ChevronLeft, 
  Loader2, Maximize2, Minimize2, Search, Heart, BookmarkPlus, History
} from 'lucide-react';
import { useTheme } from 'next-themes';
import Player from '@vimeo/player';

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

interface TrainingVideosModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialVideoId?: string;
}

export function TrainingVideosModal({ isOpen, onClose, initialVideoId }: TrainingVideosModalProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<Player | null>(null);
  const lastProgressSaveRef = useRef<number>(0);
  const currentProgressRef = useRef<{ seconds: number; percent: number }>({ seconds: 0, percent: 0 });
  const selectedVideoRef = useRef<VimeoVideo | null>(null);
  
  const [videos, setVideos] = useState<VimeoVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VimeoVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [preferences, setPreferences] = useState<Record<string, VideoPreference>>({});
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);

  const modalBg = isDark ? 'bg-gray-900' : 'bg-white';
  const sidebarBg = isDark ? 'bg-gray-800' : 'bg-gray-50';
  const overlayBg = isDark ? 'bg-black/80' : 'bg-black/50';
  
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';
  const textMuted = isDark ? 'text-gray-500' : 'text-gray-400';
  
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
  
  const hoverBg = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100';
  const activeText = isDark ? 'text-orange-400' : 'text-orange-600';
  const activeBorder = isDark ? 'border-orange-500' : 'border-orange-500';
  
  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
  const inputText = isDark ? 'text-white' : 'text-gray-900';
  const inputPlaceholder = isDark ? 'placeholder-gray-400' : 'placeholder-gray-500';
  
  const buttonBg = isDark ? 'bg-gray-700' : 'bg-gray-100';
  const buttonHover = isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-200';
  const buttonText = isDark ? 'text-gray-300' : 'text-gray-700';
  
  const cardHover = isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100';
  const cardActive = isDark ? 'bg-orange-500/20' : 'bg-orange-50';
  
  const badgeBg = isDark ? 'bg-black/80' : 'bg-black/70';

  useEffect(() => {
    if (isOpen) {
      fetchVideos();
      fetchPreferences();
    }
  }, [isOpen]);

  useEffect(() => {
    if (videos.length > 0 && !selectedVideo && preferencesLoaded) {
      if (initialVideoId) {
        const initial = videos.find(v => v.id === initialVideoId);
        setSelectedVideo(initial || videos[0]);
      } else {
        setSelectedVideo(videos[0]);
      }
    }
  }, [videos, initialVideoId, preferencesLoaded]);
  
  useEffect(() => {
    selectedVideoRef.current = selectedVideo;
    setIframeReady(false);
  }, [selectedVideo]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedVideo(null);
      setIsTheaterMode(false);
      setSearchQuery('');
      setFilter('all');
      setSortOrder('newest');
      setPreferencesLoaded(false);
      setIframeReady(false);
    }
  }, [isOpen]);

  const handleIframeLoad = useCallback(() => {
    setIframeReady(true);
  }, []);

  const saveProgress = useCallback(async (video: VimeoVideo, seconds: number, percent: number) => {
    const now = Date.now();
    if (now - lastProgressSaveRef.current < 10000) return;
    lastProgressSaveRef.current = now;
    
    try {
      await fetch(`/api/videos/${video.id}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          progress: Math.floor(seconds),
          percentage: Math.floor(percent),
          videoName: video.name,
          videoThumbnail: getThumbnail(video),
          videoDuration: video.duration
        })
      });
      
      setPreferences(prev => ({
        ...prev,
        [video.id]: {
          ...prev[video.id],
          isFavorite: prev[video.id]?.isFavorite || false,
          isWatchLater: prev[video.id]?.isWatchLater || false,
          watchProgress: Math.floor(seconds),
          watchPercentage: Math.floor(percent),
          lastWatchedAt: new Date().toISOString()
        }
      }));
    } catch (err) {
      console.error('Failed to save progress:', err);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !selectedVideo || !iframeRef.current || !iframeReady) return;

    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    const initPlayer = async () => {
      try {
        const player = new Player(iframeRef.current!);
        
        await player.ready();
        playerRef.current = player;

        const video = selectedVideoRef.current;
        if (video && preferences[video.id]) {
          const savedProgress = preferences[video.id].watchProgress || 0;
          const savedPercentage = preferences[video.id].watchPercentage || 0;
          if (savedProgress > 0 && savedPercentage < 95) {
            try {
              await player.setCurrentTime(savedProgress);
            } catch (seekErr) {
              console.warn('Could not seek to saved position:', seekErr);
            }
          }
        }

        player.on('timeupdate', (data: { seconds: number; percent: number }) => {
          const seconds = data.seconds || 0;
          const percent = (data.percent || 0) * 100;
          currentProgressRef.current = { seconds, percent };
          
          const video = selectedVideoRef.current;
          if (video && percent >= 5 && percent < 95) {
            saveProgress(video, seconds, percent);
          }
        });

        player.on('pause', () => {
          const { seconds, percent } = currentProgressRef.current;
          const video = selectedVideoRef.current;
          if (video && seconds > 0) {
            lastProgressSaveRef.current = 0;
            saveProgress(video, seconds, percent);
          }
        });

        player.on('ended', () => {
          const { seconds, percent } = currentProgressRef.current;
          const video = selectedVideoRef.current;
          if (video && seconds > 0) {
            lastProgressSaveRef.current = 0;
            saveProgress(video, seconds, percent);
          }
        });
      } catch (err) {
        console.error('Failed to initialize Vimeo player:', err);
      }
    };

    initPlayer();
    
    return () => {
      const { seconds, percent } = currentProgressRef.current;
      const video = selectedVideoRef.current;
      if (video && seconds > 0) {
        lastProgressSaveRef.current = 0;
        const videoData = {
          progress: Math.floor(seconds),
          percentage: Math.floor(percent),
          videoName: video.name,
          videoThumbnail: getThumbnail(video),
          videoDuration: video.duration
        };
        fetch(`/api/videos/${video.id}/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(videoData),
          credentials: 'include',
          keepalive: true
        }).catch(() => {});
      }
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      currentProgressRef.current = { seconds: 0, percent: 0 };
    };
  }, [isOpen, selectedVideo, iframeReady, saveProgress, preferences]);

  const fetchVideos = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/vimeo/training-videos');
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
      const response = await fetch('/api/videos/preferences');
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

  const toggleFavorite = async (video: VimeoVideo, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const response = await fetch(`/api/videos/${video.id}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    }
    
    if (filter !== 'continue') {
      if (sortOrder === 'oldest') {
        result.sort((a, b) => new Date(a.created_time).getTime() - new Date(b.created_time).getTime());
      } else if (sortOrder === 'duration') {
        result.sort((a, b) => b.duration - a.duration);
      } else {
        result.sort((a, b) => new Date(b.created_time).getTime() - new Date(a.created_time).getTime());
      }
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
    const pref = preferences[video.id];
    const startTime = pref?.watchProgress && pref.watchPercentage < 95 ? `#t=${pref.watchProgress}s` : '';
    return `${baseUrl}${separator}api=1&autoplay=0&title=0&byline=0&portrait=0${startTime}`;
  };

  const playNext = () => {
    if (currentIndex < filteredVideos.length - 1) {
      setSelectedVideo(filteredVideos[currentIndex + 1]);
    }
  };

  const playPrevious = () => {
    if (currentIndex > 0) {
      setSelectedVideo(filteredVideos[currentIndex - 1]);
    }
  };

  const filterTabs = [
    { key: 'all', label: 'All', icon: null },
    { key: 'new', label: 'New', icon: null },
    { key: 'favorites', label: 'Favorites', icon: Heart },
    { key: 'watchLater', label: 'Watch Later', icon: BookmarkPlus },
    { key: 'continue', label: 'Continue', icon: History },
  ];

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${overlayBg}`}
      onClick={onClose}
      data-testid="modal-training-videos-overlay"
    >
      <div 
        className={`
          relative flex
          ${isTheaterMode ? 'w-full h-full' : 'w-full max-w-6xl h-[85vh]'}
          ${modalBg} rounded-xl shadow-2xl overflow-hidden
          transition-all duration-300
        `}
        onClick={(e) => e.stopPropagation()}
        data-testid="modal-training-videos"
      >
        <div className="flex-1 flex flex-col min-w-0">
          <div className={`flex items-center justify-between px-4 py-3 border-b ${borderColor}`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <Play className="w-4 h-4 text-white fill-white" />
              </div>
              <div>
                <h2 className={`font-semibold ${textPrimary}`}>Training Videos</h2>
                <p className={`text-xs ${textSecondary}`}>
                  {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''}
                  {filter !== 'all' && ` in ${filterTabs.find(t => t.key === filter)?.label}`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsTheaterMode(!isTheaterMode)}
                className={`p-2 rounded-lg ${hoverBg} transition-colors ${textSecondary}`}
                title={isTheaterMode ? 'Exit theater mode' : 'Theater mode'}
                data-testid="button-theater-mode"
              >
                {isTheaterMode ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg ${hoverBg} transition-colors ${textSecondary}`}
                data-testid="button-close-modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className={`flex-1 ${isDark ? 'bg-black' : 'bg-gray-900'} flex items-center justify-center relative`}>
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-white/50" />
                <p className="text-white/50">Loading videos...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-3">
                <p className="text-red-400">{error}</p>
                <button 
                  onClick={fetchVideos}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  data-testid="button-retry-videos"
                >
                  Retry
                </button>
              </div>
            ) : selectedVideo ? (
              <>
                <iframe
                  ref={iframeRef}
                  src={getEmbedUrl(selectedVideo)}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  title={selectedVideo.name}
                  data-testid="iframe-video-player"
                  onLoad={handleIframeLoad}
                />
                
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  <button
                    onClick={(e) => toggleFavorite(selectedVideo, e)}
                    className={`p-2 rounded-full transition-all ${
                      preferences[selectedVideo.id]?.isFavorite 
                        ? 'bg-red-500 text-white' 
                        : 'bg-black/50 text-white hover:bg-black/70'
                    }`}
                    title={preferences[selectedVideo.id]?.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    data-testid="button-toggle-favorite-player"
                  >
                    <Heart className={`w-5 h-5 ${preferences[selectedVideo.id]?.isFavorite ? 'fill-white' : ''}`} />
                  </button>
                  <button
                    onClick={(e) => toggleWatchLater(selectedVideo, e)}
                    className={`p-2 rounded-full transition-all ${
                      preferences[selectedVideo.id]?.isWatchLater 
                        ? 'bg-orange-500 text-white' 
                        : 'bg-black/50 text-white hover:bg-black/70'
                    }`}
                    title={preferences[selectedVideo.id]?.isWatchLater ? 'Remove from watch later' : 'Add to watch later'}
                    data-testid="button-toggle-watchlater-player"
                  >
                    <BookmarkPlus className={`w-5 h-5 ${preferences[selectedVideo.id]?.isWatchLater ? 'fill-white' : ''}`} />
                  </button>
                </div>
              </>
            ) : (
              <p className="text-white/50">No video selected</p>
            )}
          </div>

          {selectedVideo && !loading && (
            <div className={`px-4 py-3 border-t ${borderColor}`}>
              <div className="flex items-center justify-between">
                <button
                  onClick={playPrevious}
                  disabled={currentIndex === 0}
                  className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors
                    ${currentIndex === 0 
                      ? `${textMuted} cursor-not-allowed` 
                      : `${textSecondary} ${hoverBg}`
                    }`}
                  data-testid="button-previous-video"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Previous</span>
                </button>
                
                <div className="text-center flex-1 min-w-0 px-4">
                  <h3 className={`font-semibold ${textPrimary} truncate`} data-testid="text-selected-video-title">
                    {selectedVideo.name}
                  </h3>
                  <div className={`flex items-center justify-center gap-3 text-sm ${textSecondary} mt-1`}>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDuration(selectedVideo.duration)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(selectedVideo.created_time)}
                    </span>
                    <span className={`text-xs ${textMuted}`}>
                      {currentIndex + 1} of {filteredVideos.length}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={playNext}
                  disabled={currentIndex === filteredVideos.length - 1}
                  className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors
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

        {!isTheaterMode && (
          <div className={`w-80 ${sidebarBg} border-l ${borderColor} flex flex-col`}>
            <div className={`p-3 border-b ${borderColor}`}>
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted}`} />
                <input
                  type="text"
                  placeholder="Search videos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 ${inputBg} border ${inputBorder} rounded-lg text-sm ${inputText} ${inputPlaceholder} focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors`}
                  data-testid="input-search-videos"
                />
              </div>
            </div>

            <div className={`flex flex-wrap gap-1 p-2 border-b ${borderColor}`}>
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
                    className={`flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors
                      ${filter === tab.key 
                        ? 'bg-orange-500 text-white' 
                        : `${buttonBg} ${buttonText} ${buttonHover}`
                      }`}
                    data-testid={`button-filter-${tab.key}`}
                  >
                    {Icon && <Icon className="w-3 h-3" />}
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
                <span className={`text-xs ${textSecondary}`}>Sort by</span>
                <select 
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className={`text-xs ${inputBg} border ${inputBorder} ${buttonText} rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-500`}
                  data-testid="select-sort-order"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="duration">Duration</option>
                </select>
              </div>
            )}
            
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className={`w-6 h-6 animate-spin ${textSecondary}`} />
                </div>
              ) : filteredVideos.length === 0 ? (
                <div className={`p-4 text-center ${textSecondary}`}>
                  {filter === 'favorites' ? (
                    <div className="py-8">
                      <Heart className={`w-12 h-12 mx-auto mb-3 ${textMuted}`} />
                      <p className="font-medium">No favorites yet</p>
                      <p className="text-sm mt-1">Click the heart icon to save videos</p>
                    </div>
                  ) : filter === 'watchLater' ? (
                    <div className="py-8">
                      <BookmarkPlus className={`w-12 h-12 mx-auto mb-3 ${textMuted}`} />
                      <p className="font-medium">Watch later list is empty</p>
                      <p className="text-sm mt-1">Save videos to watch later</p>
                    </div>
                  ) : filter === 'continue' ? (
                    <div className="py-8">
                      <History className={`w-12 h-12 mx-auto mb-3 ${textMuted}`} />
                      <p className="font-medium">No videos in progress</p>
                      <p className="text-sm mt-1">Start watching to pick up where you left off</p>
                    </div>
                  ) : searchQuery ? (
                    'No videos match your search'
                  ) : (
                    'No training videos available'
                  )}
                </div>
              ) : (
                <div className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {filteredVideos.map((video) => (
                    <button
                      key={video.id}
                      onClick={() => setSelectedVideo(video)}
                      className={`
                        w-full p-2 text-left transition-all duration-200 group
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
                          
                          {preferences[video.id]?.watchProgress > 0 && preferences[video.id]?.watchPercentage < 95 && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
                              <div 
                                className="h-full bg-orange-500" 
                                style={{ width: `${preferences[video.id]?.watchPercentage || 0}%` }}
                              />
                            </div>
                          )}
                          
                          <span className={`absolute bottom-1 right-1 px-1.5 py-0.5 ${badgeBg} text-white text-xs rounded font-medium`}>
                            {formatDuration(video.duration)}
                          </span>
                          
                          {isNew(video) && !preferences[video.id]?.watchProgress && (
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
                          <div className="flex items-start gap-1">
                            <h4 className={`font-medium text-sm line-clamp-2 flex-1 ${selectedVideo?.id === video.id ? activeText : textPrimary}`}>
                              {video.name}
                            </h4>
                            <div className="flex gap-0.5 flex-shrink-0">
                              {preferences[video.id]?.isFavorite && (
                                <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                              )}
                              {preferences[video.id]?.isWatchLater && (
                                <BookmarkPlus className="w-3 h-3 text-orange-500" />
                              )}
                            </div>
                          </div>
                          <p className={`text-xs ${textSecondary} mt-1`}>
                            {formatDate(video.created_time)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
