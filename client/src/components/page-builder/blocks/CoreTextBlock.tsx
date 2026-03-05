import React from 'react';
import { BlockProps } from '../types';

interface CoreTextProps extends BlockProps {
  heading?: string;
  content: string;
  textAlign?: 'left' | 'center' | 'right';
  maxWidth?: string;
  background?: 'white' | 'light' | 'dark';
}

export function CoreTextBlock({ 
  heading,
  content,
  textAlign = 'center',
  maxWidth = '800px',
  background = 'white'
}: CoreTextProps) {
  const bgClass = {
    white: 'bg-white',
    light: 'bg-gray-50',
    dark: 'bg-gray-900 text-white'
  }[background];

  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  }[textAlign];

  return (
    <section className={`py-16 ${bgClass}`}>
      <div className="max-w-[1100px] mx-auto px-4">
        <div className={`${alignClass} mx-auto`} style={{ maxWidth }}>
          {heading && (
            <h2 className="text-3xl font-bold mb-6">{heading}</h2>
          )}
          <div 
            className="prose prose-lg mx-auto"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </div>
    </section>
  );
}

CoreTextBlock.displayName = 'Core Text Section';
CoreTextBlock.schema = {
  heading: { type: 'string', label: 'Heading' },
  content: { type: 'richtext', label: 'Content', required: true },
  textAlign: {
    type: 'select',
    label: 'Text Align',
    options: [
      { value: 'left', label: 'Left' },
      { value: 'center', label: 'Center' },
      { value: 'right', label: 'Right' }
    ]
  },
  maxWidth: { type: 'string', label: 'Max Width (e.g., 800px)' },
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