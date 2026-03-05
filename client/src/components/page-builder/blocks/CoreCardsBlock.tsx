import React from 'react';
import { BlockProps } from '../types';

interface CardItem {
  title: string;
  description: string;
  imageUrl?: string;
  linkUrl?: string;
  linkText?: string;
}

interface CoreCardsProps extends BlockProps {
  heading?: string;
  cards: CardItem[];
  columns?: 2 | 3 | 4;
  background?: 'white' | 'light' | 'dark';
}

export function CoreCardsBlock({ 
  heading,
  cards = [],
  columns = 3,
  background = 'white'
}: CoreCardsProps) {
  const bgClass = {
    white: 'bg-white',
    light: 'bg-gray-50',
    dark: 'bg-gray-900 text-white'
  }[background];

  const gridClass = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4'
  }[columns];

  return (
    <section className={`py-16 ${bgClass}`}>
      <div className="max-w-[1100px] mx-auto px-4">
        {heading && (
          <h2 className="text-3xl font-bold text-center mb-12">{heading}</h2>
        )}
        
        <div className={`grid grid-cols-1 ${gridClass} gap-6`}>
          {cards.map((card, index) => (
            <div 
              key={index}
              className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {card.imageUrl && (
                <div className="aspect-[4/3] overflow-hidden">
                  <img 
                    src={card.imageUrl} 
                    alt={card.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-3">{card.title}</h3>
                <p className="text-gray-600 mb-4">{card.description}</p>
                
                {card.linkText && (
                  <a 
                    href={card.linkUrl || '#'}
                    className="text-[#fa4616] hover:underline font-medium"
                  >
                    {card.linkText} →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

CoreCardsBlock.displayName = 'Core Cards Grid';
CoreCardsBlock.schema = {
  heading: { type: 'string', label: 'Section Heading' },
  cards: {
    type: 'array',
    label: 'Cards',
    schema: {
      title: { type: 'string', label: 'Title', required: true },
      description: { type: 'textarea', label: 'Description', required: true },
      imageUrl: { type: 'string', label: 'Image URL' },
      linkUrl: { type: 'string', label: 'Link URL' },
      linkText: { type: 'string', label: 'Link Text' }
    }
  },
  columns: { 
    type: 'select', 
    label: 'Columns', 
    options: [
      { value: 2, label: '2 Columns' },
      { value: 3, label: '3 Columns' },
      { value: 4, label: '4 Columns' }
    ]
  },
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