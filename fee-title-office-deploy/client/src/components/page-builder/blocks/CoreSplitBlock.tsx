import React from 'react';
import { BlockProps } from '../types';

interface CoreSplitProps extends BlockProps {
  imageUrl: string;
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

export function CoreSplitBlock({ 
  imageUrl,
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
          {/* Image */}
          <div className={reverse ? 'md:order-2' : ''}>
            <img 
              src={imageUrl} 
              alt={imageAlt}
              className="w-full rounded-lg shadow-sm"
              loading="lazy"
            />
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