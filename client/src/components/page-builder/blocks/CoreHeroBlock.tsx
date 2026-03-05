import React from 'react';
import { BlockProps } from '../types';

interface CoreHeroProps extends BlockProps {
  title: string;
  subtitle?: string;
  backgroundImage?: string;
  overlayOpacity?: number;
  height?: string;
}

export function CoreHeroBlock({ 
  title, 
  subtitle, 
  backgroundImage = 'https://images.unsplash.com/photo-1629538480890-17a87addd019',
  overlayOpacity = 0.4,
  height = '300px'
}: CoreHeroProps) {
  return (
    <section 
      className="relative overflow-hidden"
      style={{
        height,
        background: backgroundImage ? `url(${backgroundImage}) center/cover no-repeat` : '#fa4616'
      }}
    >
      {/* Dark overlay */}
      <div 
        className="absolute inset-0 bg-black" 
        style={{ opacity: overlayOpacity }}
      />
      
      {/* Content */}
      <div className="relative z-10 h-full flex items-center justify-center">
        <div className="max-w-[1100px] mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xl text-white/90">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

CoreHeroBlock.displayName = 'Core Hero';
CoreHeroBlock.schema = {
  title: { type: 'string', label: 'Title', required: true },
  subtitle: { type: 'string', label: 'Subtitle' },
  backgroundImage: { type: 'string', label: 'Background Image URL' },
  overlayOpacity: { type: 'number', label: 'Overlay Opacity', min: 0, max: 1, step: 0.1 },
  height: { type: 'string', label: 'Height (e.g., 300px, 50vh)' }
};