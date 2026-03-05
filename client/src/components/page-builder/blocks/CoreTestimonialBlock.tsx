import React from 'react';
import { BlockProps } from '../types';

interface TestimonialItem {
  quote: string;
  author: string;
  rating?: number;
}

interface CoreTestimonialProps extends BlockProps {
  heading?: string;
  testimonials: TestimonialItem[];
  background?: 'white' | 'light' | 'dark';
}

export function CoreTestimonialBlock({ 
  heading,
  testimonials = [],
  background = 'light'
}: CoreTestimonialProps) {
  const bgClass = {
    white: 'bg-white',
    light: 'bg-gray-50',
    dark: 'bg-gray-900 text-white'
  }[background];

  const renderStars = (rating: number = 5) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  return (
    <section className={`py-16 ${bgClass}`}>
      <div className="max-w-[1100px] mx-auto px-4">
        {heading && (
          <h2 className="text-3xl font-bold text-center mb-12">{heading}</h2>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="text-[#fa4616] text-xl mb-3">
                {renderStars(testimonial.rating)}
              </div>
              
              <blockquote className="text-gray-700 mb-4 italic">
                "{testimonial.quote}"
              </blockquote>
              
              <cite className="text-sm font-medium text-gray-900 not-italic">
                — {testimonial.author}
              </cite>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

CoreTestimonialBlock.displayName = 'Core Testimonials';
CoreTestimonialBlock.schema = {
  heading: { type: 'string', label: 'Section Heading' },
  testimonials: {
    type: 'array',
    label: 'Testimonials',
    schema: {
      quote: { type: 'textarea', label: 'Quote', required: true },
      author: { type: 'string', label: 'Author Name', required: true },
      rating: { type: 'number', label: 'Rating (1-5)', min: 1, max: 5 }
    }
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