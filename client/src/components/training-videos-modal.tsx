import { useState, useEffect } from 'react';
import { X, Play, Clock, Calendar, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { useTheme } from 'next-themes';

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

interface TrainingVideosModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialVideoId?: string;
}

export function TrainingVideosModal({ isOpen, onClose, initialVideoId }: TrainingVideosModalProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  const [videos, setVideos] = useState<VimeoVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VimeoVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  const modalBg = isDark ? 'bg-gray-900' : 'bg-white';
  const sidebarBg = isDark ? 'bg-gray-800' : 'bg-gray-50';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
  const hoverBg = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100';
  const activeBg = isDark ? 'bg-gray-700' : 'bg-orange-50';
  const overlayBg = isDark ? 'bg-black/80' : 'bg-black/50';

  useEffect(() => {
    if (isOpen) {
      fetchVideos();
    }
  }, [isOpen]);

  useEffect(() => {
    if (videos.length > 0 && !selectedVideo) {
      if (initialVideoId) {
        const initial = videos.find(v => v.id === initialVideoId);
        setSelectedVideo(initial || videos[0]);
      } else {
        setSelectedVideo(videos[0]);
      }
    }
  }, [videos, initialVideoId]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedVideo(null);
      setIsTheaterMode(false);
    }
  }, [isOpen]);

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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
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

  const getThumbnail = (video: VimeoVideo) => {
    const sizes = video.pictures?.sizes || [];
    const medium = sizes.find(s => s.width >= 640) || sizes[sizes.length - 1];
    return medium?.link || '';
  };

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
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <Play className="w-4 h-4 text-white fill-white" />
              </div>
              <div>
                <h2 className={`font-semibold ${textPrimary}`}>Training Videos</h2>
                <p className={`text-xs ${textSecondary}`}>{videos.length} videos available</p>
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

          <div className="flex-1 bg-black flex items-center justify-center">
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
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                  data-testid="button-retry-videos"
                >
                  Retry
                </button>
              </div>
            ) : selectedVideo ? (
              <iframe
                src={(() => {
                  const baseUrl = selectedVideo.player_embed_url || `https://player.vimeo.com/video/${selectedVideo.id}`;
                  const separator = baseUrl.includes('?') ? '&' : '?';
                  return `${baseUrl}${separator}autoplay=0&title=0&byline=0&portrait=0`;
                })()}
                className="w-full h-full"
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title={selectedVideo.name}
                data-testid="iframe-video-player"
              />
            ) : (
              <p className="text-white/50">No video selected</p>
            )}
          </div>

          {selectedVideo && !loading && (
            <div className={`p-4 border-t ${borderColor}`}>
              <h3 className={`font-semibold ${textPrimary} mb-1`} data-testid="text-selected-video-title">
                {selectedVideo.name}
              </h3>
              <div className={`flex items-center gap-4 text-sm ${textSecondary}`}>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDuration(selectedVideo.duration)}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(selectedVideo.created_time)}
                </span>
              </div>
              {selectedVideo.description && (
                <p className={`mt-2 text-sm ${textSecondary} line-clamp-2`}>
                  {selectedVideo.description}
                </p>
              )}
            </div>
          )}
        </div>

        {!isTheaterMode && (
          <div className={`w-80 ${sidebarBg} border-l ${borderColor} flex flex-col`}>
            <div className={`p-3 border-b ${borderColor}`}>
              <h3 className={`font-medium ${textPrimary} text-sm`}>All Videos</h3>
              <p className={`text-xs ${textSecondary}`}>Newest first</p>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className={`w-6 h-6 animate-spin ${textSecondary}`} />
                </div>
              ) : videos.length === 0 ? (
                <div className={`p-4 text-center ${textSecondary}`}>
                  No training videos available
                </div>
              ) : (
                <div className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {videos.map((video, index) => (
                    <button
                      key={video.id}
                      onClick={() => setSelectedVideo(video)}
                      className={`
                        w-full p-3 text-left transition-colors
                        ${selectedVideo?.id === video.id ? activeBg : hoverBg}
                      `}
                      data-testid={`button-video-${video.id}`}
                    >
                      <div className="flex gap-3">
                        <div className="relative flex-shrink-0 w-28 h-16 rounded overflow-hidden bg-gray-900">
                          {getThumbnail(video) ? (
                            <img 
                              src={getThumbnail(video)} 
                              alt={video.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="w-6 h-6 text-white/30" />
                            </div>
                          )}
                          <span className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/80 text-white text-xs rounded">
                            {formatDuration(video.duration)}
                          </span>
                          {selectedVideo?.id === video.id && (
                            <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                                <Play className="w-4 h-4 text-white fill-white" />
                              </div>
                            </div>
                          )}
                          {index === 0 && (
                            <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-purple-500 text-white text-xs rounded font-medium">
                              NEW
                            </span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-medium text-sm ${textPrimary} line-clamp-2`}>
                            {video.name}
                          </h4>
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
