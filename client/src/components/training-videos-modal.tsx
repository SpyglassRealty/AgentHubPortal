import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, Play, Clock, Calendar, ArrowRight,
  Loader2, Maximize2, Minimize2, Heart, Plus, Check
} from 'lucide-react';
import { useTheme } from 'next-themes';
import Player from '@vimeo/player';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link } from 'wouter';

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
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [preferences, setPreferences] = useState<Record<string, VideoPreference>>({});
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [watchLaterLoading, setWatchLaterLoading] = useState(false);

  const modalBg = isDark ? 'bg-gray-900' : 'bg-white';
  const overlayBg = isDark ? 'bg-black/80' : 'bg-black/50';
  
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';
  
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
  const hoverBg = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100';
  
  const buttonBg = isDark ? 'bg-gray-700' : 'bg-gray-100';
  const buttonHover = isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-200';
  const buttonText = isDark ? 'text-gray-300' : 'text-gray-700';

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

  const toggleFavorite = async () => {
    if (!selectedVideo || favoriteLoading) return;
    
    setFavoriteLoading(true);
    try {
      const response = await fetch(`/api/videos/${selectedVideo.id}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          videoName: selectedVideo.name,
          videoThumbnail: getThumbnail(selectedVideo),
          videoDuration: selectedVideo.duration
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setPreferences(prev => ({
          ...prev,
          [selectedVideo.id]: {
            ...prev[selectedVideo.id],
            isFavorite: data.isFavorite,
            isWatchLater: prev[selectedVideo.id]?.isWatchLater || false,
            watchProgress: prev[selectedVideo.id]?.watchProgress || 0,
            watchPercentage: prev[selectedVideo.id]?.watchPercentage || 0,
            lastWatchedAt: prev[selectedVideo.id]?.lastWatchedAt || null
          }
        }));
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    } finally {
      setFavoriteLoading(false);
    }
  };

  const toggleWatchLater = async () => {
    if (!selectedVideo || watchLaterLoading) return;
    
    setWatchLaterLoading(true);
    try {
      const response = await fetch(`/api/videos/${selectedVideo.id}/watch-later`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          videoName: selectedVideo.name,
          videoThumbnail: getThumbnail(selectedVideo),
          videoDuration: selectedVideo.duration
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setPreferences(prev => ({
          ...prev,
          [selectedVideo.id]: {
            ...prev[selectedVideo.id],
            isFavorite: prev[selectedVideo.id]?.isFavorite || false,
            isWatchLater: data.isWatchLater,
            watchProgress: prev[selectedVideo.id]?.watchProgress || 0,
            watchPercentage: prev[selectedVideo.id]?.watchPercentage || 0,
            lastWatchedAt: prev[selectedVideo.id]?.lastWatchedAt || null
          }
        }));
      }
    } catch (err) {
      console.error('Failed to toggle watch later:', err);
    } finally {
      setWatchLaterLoading(false);
    }
  };

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
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

  const currentIndex = videos.findIndex(v => v.id === selectedVideo?.id);
  const isFavorited = selectedVideo ? preferences[selectedVideo.id]?.isFavorite : false;
  const isInWatchLater = selectedVideo ? preferences[selectedVideo.id]?.isWatchLater : false;

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 ${overlayBg} safe-area-inset`}
      onClick={onClose}
      data-testid="modal-training-videos-overlay"
    >
      <div 
        className={`
          relative flex flex-col
          ${isTheaterMode ? 'w-full h-full' : 'w-full max-w-4xl'}
          ${modalBg} rounded-xl shadow-2xl overflow-hidden
          transition-all duration-300 modal-container
        `}
        onClick={(e) => e.stopPropagation()}
        data-testid="modal-training-videos"
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-3 sm:px-4 py-3 border-b ${borderColor}`}>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Play className="w-4 h-4 text-white fill-white" />
            </div>
            <div className="min-w-0">
              <h2 className={`font-semibold ${textPrimary} text-sm sm:text-base`}>Training Videos</h2>
              <p className={`text-xs ${textSecondary}`}>Latest Training</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
            {!isMobile && (
              <button
                onClick={() => setIsTheaterMode(!isTheaterMode)}
                className={`p-2 rounded-lg ${hoverBg} transition-colors ${textSecondary} touch-target flex items-center justify-center`}
                title={isTheaterMode ? 'Exit theater mode' : 'Theater mode'}
                data-testid="button-theater-mode"
              >
                {isTheaterMode ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
            )}
            <button
              onClick={onClose}
              className={`p-2 rounded-lg ${hoverBg} transition-colors ${textSecondary} touch-target flex items-center justify-center`}
              data-testid="button-close-modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Player - NO overlay icons */}
        <div className={`${isTheaterMode ? 'flex-1' : 'aspect-video'} ${isDark ? 'bg-black' : 'bg-gray-900'} flex items-center justify-center relative`}>
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
          ) : (
            <p className="text-white/50">No video selected</p>
          )}
        </div>

        {/* Video Info & Action Buttons */}
        {selectedVideo && !loading && (
          <div className={`px-4 py-4 border-t ${borderColor}`}>
            {/* Title */}
            <h3 className={`font-semibold ${textPrimary} line-clamp-2 mb-2`} data-testid="text-selected-video-title">
              {selectedVideo.name}
            </h3>
            
            {/* Meta info */}
            <div className={`flex items-center gap-3 text-sm ${textSecondary} mb-4`}>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDuration(selectedVideo.duration)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(selectedVideo.created_time)}
              </span>
              <span className={`text-xs`}>
                {currentIndex + 1} of {videos.length}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Add to Favorites */}
              <button
                onClick={toggleFavorite}
                disabled={favoriteLoading}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isFavorited
                    ? 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30'
                    : `${buttonBg} ${buttonText} ${buttonHover}`
                }`}
                data-testid="button-toggle-favorite"
              >
                <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                {favoriteLoading ? 'Saving...' : isFavorited ? 'Favorited' : 'Add to Favorites'}
              </button>

              {/* Add to Watch Later */}
              <button
                onClick={toggleWatchLater}
                disabled={watchLaterLoading}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isInWatchLater
                    ? 'bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30'
                    : `${buttonBg} ${buttonText} ${buttonHover}`
                }`}
                data-testid="button-toggle-watchlater"
              >
                {isInWatchLater ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {watchLaterLoading ? 'Saving...' : isInWatchLater ? 'Added to List' : 'Watch Later'}
              </button>

              {/* Go to Training - Primary action */}
              <Link
                href="/training"
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-lg 
                         text-sm font-medium hover:bg-orange-600 transition-colors ml-auto"
                data-testid="link-go-to-training"
              >
                Go to Training
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
