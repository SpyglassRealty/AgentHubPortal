import { useState, useEffect } from 'react';
import { Play, Clock, ArrowRight, Megaphone } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Link } from 'wouter';

interface LatestVideo {
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

interface CompanyUpdatesProps {
  onVideoClick: (video: LatestVideo) => void;
}

export function CompanyUpdates({ onVideoClick }: CompanyUpdatesProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  const [latestVideo, setLatestVideo] = useState<LatestVideo | null>(null);
  const [loading, setLoading] = useState(true);

  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';
  const textMuted = isDark ? 'text-gray-500' : 'text-gray-400';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
  const hoverBg = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50';
  const dividerColor = isDark ? 'border-gray-700' : 'border-gray-100';

  useEffect(() => {
    fetchLatestVideo();
  }, []);

  const fetchLatestVideo = async () => {
    try {
      const response = await fetch('/api/vimeo/training-videos?limit=1');
      if (response.ok) {
        const data = await response.json();
        if (data.videos && data.videos.length > 0) {
          setLatestVideo(data.videos[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch latest video:', err);
    } finally {
      setLoading(false);
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

  const isNew = (dateString: string) => {
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

  const getThumbnail = (video: LatestVideo) => {
    const sizes = video.pictures?.sizes || [];
    const medium = sizes.find(s => s.width >= 640) || sizes[sizes.length - 1];
    return medium?.link || '';
  };

  return (
    <div className={`${cardBg} rounded-xl border ${borderColor} overflow-hidden`} data-testid="company-updates-widget">
      <div className={`flex items-center justify-between px-4 py-3 border-b ${borderColor}`}>
        <h2 className={`font-semibold ${textPrimary}`}>Company Updates</h2>
        <Link 
          href="/training"
          className={`text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1 transition-colors`}
          data-testid="link-view-training"
        >
          View Training
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className={`animate-pulse flex gap-4`}>
            <div className={`w-40 h-24 ${isDark ? 'bg-gray-700' : 'bg-gray-300'} rounded-lg`}></div>
            <div className="flex-1 space-y-2">
              <div className={`h-4 ${isDark ? 'bg-gray-700' : 'bg-gray-300'} rounded w-1/4`}></div>
              <div className={`h-5 ${isDark ? 'bg-gray-700' : 'bg-gray-300'} rounded w-3/4`}></div>
              <div className={`h-4 ${isDark ? 'bg-gray-700' : 'bg-gray-300'} rounded w-1/2`}></div>
            </div>
          </div>
        ) : latestVideo ? (
          <button
            onClick={() => onVideoClick(latestVideo)}
            className={`w-full flex gap-4 p-2 -m-2 rounded-lg transition-colors ${hoverBg} text-left group`}
            data-testid="button-latest-video"
          >
            <div className="relative flex-shrink-0 w-40 h-24 rounded-lg overflow-hidden bg-gray-900">
              {getThumbnail(latestVideo) ? (
                <img 
                  src={getThumbnail(latestVideo)} 
                  alt={latestVideo.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                  <Play className="w-8 h-8 text-white/30" />
                </div>
              )}
              
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                  <Play className="w-6 h-6 text-white fill-white ml-1" />
                </div>
              </div>
              
              {isNew(latestVideo.created_time) && (
                <span className="absolute top-2 left-2 px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded">
                  NEW
                </span>
              )}
              
              <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white text-xs rounded font-medium">
                {formatDuration(latestVideo.duration)}
              </span>
            </div>
            
            <div className="flex-1 min-w-0 py-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-orange-500/10 text-orange-500 text-xs font-medium rounded">
                  New Training
                </span>
                <span className={`text-xs ${textMuted}`}>
                  {getRelativeTime(latestVideo.created_time)}
                </span>
              </div>
              
              <h3 className={`font-medium ${textPrimary} line-clamp-2 group-hover:text-orange-500 transition-colors`}>
                {latestVideo.name}
              </h3>
              
              <p className={`text-sm ${textSecondary} mt-1 line-clamp-1`}>
                Watch the latest training module from Spyglass Realty.
              </p>
              
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs font-medium text-orange-500 flex items-center gap-1`}>
                  <Play className="w-3 h-3" />
                  Watch Now
                </span>
              </div>
            </div>
          </button>
        ) : (
          <p className={`text-sm ${textSecondary} text-center py-4`}>No training videos available</p>
        )}

        <div className={`border-t ${dividerColor}`}></div>

        <div className={`flex gap-3 p-2 -m-2 rounded-lg ${hoverBg} cursor-pointer transition-colors`} data-testid="announcement-item">
          <div className={`w-10 h-10 rounded-lg ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'} flex items-center justify-center flex-shrink-0`}>
            <Megaphone className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`px-2 py-0.5 ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-100 text-blue-600'} text-xs font-medium rounded`}>
                Announcement
              </span>
              <span className={`text-xs ${textMuted}`}>Yesterday</span>
            </div>
            <h3 className={`font-medium ${textPrimary} line-clamp-1`}>
              Q4 Goals & Incentives
            </h3>
            <p className={`text-sm ${textSecondary} mt-0.5 line-clamp-1`}>
              Review the updated commission structure and bonus opportunities for top performers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
