import React from 'react';
import { BlockProps } from '../types';

interface CoreSplitProps extends BlockProps {
  imageUrl?: string;
  videoUrl?: string;
  imageAlt?: string;
  heading: string;
  content: string;
  primaryButtonText?: string;
  primaryButtonUrl?: string;
  secondaryButtonText?: string;
  secondaryButtonUrl?: string;
  reverse?: boolean;
  background?: 'white' | 'light' | 'dark';
}

interface VideoData {
  thumbnailUrl: string;
  embedUrl: string;
  isVideo: boolean;
}

function extractVideoData(videoUrl: string): VideoData {
  if (!videoUrl) return { thumbnailUrl: '', embedUrl: '', isVideo: false };
  
  // YouTube video detection
  const youtubeMatch = videoUrl.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (youtubeMatch) {
    const videoId = youtubeMatch[1];
    return {
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      isVideo: true
    };
  }
  
  // Vimeo video detection
  const vimeoMatch = videoUrl.match(/(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    const videoId = vimeoMatch[1];
    return {
      thumbnailUrl: `https://vumbnail.com/${videoId}.jpg`,
      embedUrl: `https://player.vimeo.com/video/${videoId}`,
      isVideo: true
    };
  }
  
  // Direct video file detection
  const videoExtensions = /\.(mp4|webm|ogg|mov|avi)(\?.*)?$/i;
  if (videoExtensions.test(videoUrl)) {
    return {
      thumbnailUrl: '',
      embedUrl: videoUrl,
      isVideo: true
    };
  }
  
  return { thumbnailUrl: '', embedUrl: '', isVideo: false };
}

function VideoThumbnail({ videoUrl, className }: { videoUrl: string; className?: string }) {
  const videoData = extractVideoData(videoUrl);
  const [showVideo, setShowVideo] = React.useState(false);
  
  if (!videoData.isVideo) return null;
  
  if (showVideo) {
    return (
      <div className={className}>
        <iframe 
          src={videoData.embedUrl}
          className="w-full h-[300px] rounded-lg"
          frameBorder="0"
          allowFullScreen
        />
      </div>
    );
  }
  
  return (
    <div 
      className={`${className} relative cursor-pointer group`}
      onClick={() => setShowVideo(true)}
    >
      <div 
        className="w-full h-[300px] rounded-lg bg-gray-900 bg-cover bg-center flex items-center justify-center shadow-sm"
        style={videoData.thumbnailUrl ? { backgroundImage: `url(${videoData.thumbnailUrl})` } : {}}
      >
        <div className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center group-hover:bg-white transition-colors">
          <div className="w-0 h-0 border-l-[25px] border-l-[#fa4616] border-t-[15px] border-t-transparent border-b-[15px] border-b-transparent ml-1" />
        </div>
      </div>
    </div>
  );
}

export function CoreSplitBlock({ 
  imageUrl,
  videoUrl,
  imageAlt = '',
  heading,
  content,
  primaryButtonText,
  primaryButtonUrl,
  secondaryButtonText,
  secondaryButtonUrl,
  reverse = false,
  background = 'white'
}: CoreSplitProps) {
  const bgClass = {
    white: 'bg-white',
    light: 'bg-gray-50',
    dark: 'bg-gray-900 text-white'
  }[background];

  return (
    <section className={`py-16 ${bgClass}`}>
      <div className="max-w-[1100px] mx-auto px-4">
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-12 items-center ${reverse ? 'md:flex-row-reverse' : ''}`}>
          {/* Media */}
          <div className={reverse ? 'md:order-2' : ''}>
            {videoUrl ? (
              <VideoThumbnail videoUrl={videoUrl} className="w-full" />
            ) : imageUrl ? (
              <img 
                src={imageUrl} 
                alt={imageAlt}
                className="w-full rounded-lg shadow-sm"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-[300px] bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-500">No media provided</span>
              </div>
            )}
          </div>
          
          {/* Content */}
          <div className={reverse ? 'md:order-1' : ''}>
            <h2 className="text-3xl font-bold mb-4">{heading}</h2>
            <div 
              className="prose prose-lg mb-6"
              dangerouslySetInnerHTML={{ __html: content }}
            />
            
            {/* Buttons */}
            {(primaryButtonText || secondaryButtonText) && (
              <div className="flex flex-wrap gap-3">
                {primaryButtonText && (
                  <a 
                    href={primaryButtonUrl || '#'}
                    className="inline-flex px-6 py-3 bg-[#fa4616] text-white font-medium rounded hover:opacity-85 transition-opacity"
                  >
                    {primaryButtonText}
                  </a>
                )}
                {secondaryButtonText && (
                  <a 
                    href={secondaryButtonUrl || '#'}
                    className="inline-flex px-6 py-3 border-2 border-[#fa4616] text-[#fa4616] font-medium rounded hover:bg-[#fa4616] hover:text-white transition-colors"
                  >
                    {secondaryButtonText}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

CoreSplitBlock.displayName = 'Core Split Section';
CoreSplitBlock.schema = {
  imageUrl: { type: 'string', label: 'Image URL', required: true },
  imageAlt: { type: 'string', label: 'Image Alt Text' },
  heading: { type: 'string', label: 'Heading', required: true },
  content: { type: 'richtext', label: 'Content', required: true },
  primaryButtonText: { type: 'string', label: 'Primary Button Text' },
  primaryButtonUrl: { type: 'string', label: 'Primary Button URL' },
  secondaryButtonText: { type: 'string', label: 'Secondary Button Text' },
  secondaryButtonUrl: { type: 'string', label: 'Secondary Button URL' },
  reverse: { type: 'boolean', label: 'Reverse Layout' },
  background: { 
    type: 'select', 
    label: 'Background', 
    options: [
      { value: 'white', label: 'White' },
      { value: 'light', label: 'Light Gray' },
      { value: 'dark', label: 'Dark' }
    ]
  }
};