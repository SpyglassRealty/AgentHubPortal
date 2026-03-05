import React from 'react';
import { useQuery } from '@tanstack/react-query';
import type { BlockData } from './types';

interface BlockRendererProps {
  block: BlockData;
  isPreview?: boolean;
  renderBlock?: (block: BlockData) => React.ReactNode;
}

// ── Helper: extract YouTube/Vimeo embed URL ──────────────────────
function getVideoEmbedUrl(url: string): string {
  if (!url) return '';
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return url;
}

// ── Star rating component ──────────────────────────────────
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= rating ? 'text-yellow-400' : 'text-gray-300'}>★</span>
      ))}
    </div>
  );
}

export function BlockRenderer({ block, isPreview = false, renderBlock }: BlockRendererProps) {
  const { type, props } = block;

  switch (type) {
    case 'heading': {
      const level = props.level || 2;
      const sizes: Record<number, string> = {
        1: 'text-4xl font-bold',
        2: 'text-3xl font-bold',
        3: 'text-2xl font-semibold',
        4: 'text-xl font-semibold',
        5: 'text-lg font-medium',
        6: 'text-base font-medium',
      };
      const headingStyle = {
        textAlign: props.alignment || 'left' as React.CSSProperties['textAlign'],
        color: props.color || 'inherit',
      };
      const headingClass = `${sizes[level]} leading-tight`;
      const text = props.text || 'Heading';
      const anchorId = props.anchorId;
      if (level === 1) return <h1 id={anchorId} className={headingClass} style={headingStyle}>{text}</h1>;
      if (level === 3) return <h3 id={anchorId} className={headingClass} style={headingStyle}>{text}</h3>;
      if (level === 4) return <h4 id={anchorId} className={headingClass} style={headingStyle}>{text}</h4>;
      if (level === 5) return <h5 id={anchorId} className={headingClass} style={headingStyle}>{text}</h5>;
      if (level === 6) return <h6 id={anchorId} className={headingClass} style={headingStyle}>{text}</h6>;
      return <h2 id={anchorId} className={headingClass} style={headingStyle}>{text}</h2>;
    }

    case 'text':
      return (
        <div
          className="prose prose-sm max-w-none dark:prose-invert [&_a]:text-[#EF4923] [&_a]:no-underline [&_a:hover]:underline"
          style={{ textAlign: props.alignment || 'left' }}
          dangerouslySetInnerHTML={{ __html: (props.content || '').replace(/\n/g, '<br/>') }}
        />
      );

    case 'image': {
      if (!props.url) {
        return (
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400"
            style={{ textAlign: props.alignment || 'center' }}
          >
            <div className="text-4xl mb-2">🖼️</div>
            <p className="text-sm">Add an image URL in settings</p>
            {!props.alt && (
              <p className="text-xs text-red-400 mt-1">Alt text required</p>
            )}
          </div>
        );
      }
      const imgEl = (
        <img
          src={props.url}
          alt={props.alt || ''}
          className="max-w-full rounded-lg"
          style={{ width: props.width || '100%' }}
          loading={props.loading || 'lazy'}
          srcSet={props.srcset || undefined}
        />
      );
      return (
        <div style={{ textAlign: props.alignment || 'center' }} className="relative">
          {props.link ? (
            <a href={props.link} target="_blank" rel="noopener noreferrer">{imgEl}</a>
          ) : imgEl}
          {!props.alt && !isPreview && (
            <div className="absolute top-1 right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded">
              Alt required
            </div>
          )}
        </div>
      );
    }

    case 'button': {
      const btnStyles: Record<string, string> = {
        primary: 'bg-[#EF4923] text-white hover:bg-[#d63d1c]',
        secondary: 'bg-gray-800 text-white hover:bg-gray-700',
        outline: 'border-2 border-[#EF4923] text-[#EF4923] hover:bg-[#EF4923] hover:text-white',
      };
      const btnSizes: Record<string, string> = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
      };
      return (
        <div style={{ textAlign: props.alignment || 'center' }}>
          <a
            href={props.url || '#'}
            className={`inline-block rounded-lg font-medium transition-colors ${btnStyles[props.style || 'primary']} ${btnSizes[props.size || 'md']}`}
          >
            {props.text || 'Button'}
          </a>
        </div>
      );
    }

    case 'spacer':
      return <div style={{ height: `${props.height || 40}px` }} />;

    case 'divider':
      return (
        <hr
          style={{
            borderStyle: props.style || 'solid',
            borderColor: props.color || '#e5e7eb',
            width: props.width || '100%',
            borderWidth: '1px 0 0 0',
          }}
        />
      );

    case 'html':
      return (
        <div
          className="prose prose-sm max-w-none dark:prose-invert [&_a]:text-[#EF4923] [&_a]:no-underline [&_a:hover]:underline"
          dangerouslySetInnerHTML={{ __html: props.code || '' }}
        />
      );

    case 'core-hero':
      return (
        <section 
          className="relative overflow-hidden"
          style={{
            height: props.height || '300px',
            background: props.backgroundImage ? `url(${props.backgroundImage}) center/cover no-repeat` : '#fa4616'
          }}
        >
          <div 
            className="absolute inset-0 bg-black" 
            style={{ opacity: props.overlayOpacity || 0.4 }}
          />
          <div className="relative z-10 h-full flex items-center justify-center">
            <div className="max-w-[1100px] mx-auto px-4 text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                {props.title || 'Hero Title'}
              </h1>
              {props.subtitle && (
                <p className="text-xl text-white/90">{props.subtitle}</p>
              )}
            </div>
          </div>
        </section>
      );

    case 'core-split':
      return (
        <section className={`py-16 ${props.background === 'light' ? 'bg-gray-50' : props.background === 'dark' ? 'bg-gray-900 text-white' : 'bg-white'}`}>
          <div className="max-w-[1100px] mx-auto px-4">
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-12 items-center`}>
              <div className={props.reverse ? 'md:order-2' : ''}>
                <img 
                  src={props.imageUrl || 'https://via.placeholder.com/600x400'} 
                  alt={props.imageAlt || ''}
                  className="w-full rounded-lg shadow-sm"
                />
              </div>
              <div className={props.reverse ? 'md:order-1' : ''}>
                <h2 className="text-3xl font-bold mb-4">{props.heading || 'Section Heading'}</h2>
                <div 
                  className="prose prose-lg mb-6"
                  dangerouslySetInnerHTML={{ __html: props.content || '<p>Content goes here...</p>' }}
                />
                {(props.primaryButtonText || props.secondaryButtonText) && (
                  <div className="flex flex-wrap gap-3">
                    {props.primaryButtonText && (
                      <a 
                        href={props.primaryButtonUrl || '#'}
                        className="inline-flex px-6 py-3 bg-[#fa4616] text-white font-medium rounded hover:opacity-85 transition-opacity"
                      >
                        {props.primaryButtonText}
                      </a>
                    )}
                    {props.secondaryButtonText && (
                      <a 
                        href={props.secondaryButtonUrl || '#'}
                        className="inline-flex px-6 py-3 border-2 border-[#fa4616] text-[#fa4616] font-medium rounded hover:bg-[#fa4616] hover:text-white transition-colors"
                      >
                        {props.secondaryButtonText}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      );

    case 'core-cards':
      return (
        <section className={`py-16 ${props.background === 'light' ? 'bg-gray-50' : props.background === 'dark' ? 'bg-gray-900 text-white' : 'bg-white'}`}>
          <div className="max-w-[1100px] mx-auto px-4">
            {props.heading && (
              <h2 className="text-3xl font-bold text-center mb-12">{props.heading}</h2>
            )}
            <div className={`grid grid-cols-1 ${props.columns === 2 ? 'md:grid-cols-2' : props.columns === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-6`}>
              {(props.cards || []).map((card: any, index: number) => (
                <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {card.imageUrl && (
                    <div className="aspect-[4/3] overflow-hidden">
                      <img src={card.imageUrl} alt={card.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-xl font-semibold mb-3">{card.title}</h3>
                    <p className="text-gray-600 mb-4">{card.description}</p>
                    {card.linkText && (
                      <a href={card.linkUrl || '#'} className="text-[#fa4616] hover:underline font-medium">
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

    case 'core-testimonial':
      return (
        <section className={`py-16 ${props.background === 'light' ? 'bg-gray-50' : props.background === 'dark' ? 'bg-gray-900 text-white' : 'bg-white'}`}>
          <div className="max-w-[1100px] mx-auto px-4">
            {props.heading && (
              <h2 className="text-3xl font-bold text-center mb-12">{props.heading}</h2>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(props.testimonials || []).map((testimonial: any, index: number) => (
                <div key={index} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                  <div className="text-[#fa4616] text-xl mb-3">
                    {'★'.repeat(testimonial.rating || 5)}{'☆'.repeat(5 - (testimonial.rating || 5))}
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

    case 'core-text':
      return (
        <section className={`py-16 ${props.background === 'light' ? 'bg-gray-50' : props.background === 'dark' ? 'bg-gray-900 text-white' : 'bg-white'}`}>
          <div className="max-w-[1100px] mx-auto px-4">
            <div 
              className={`${props.textAlign === 'left' ? 'text-left' : props.textAlign === 'right' ? 'text-right' : 'text-center'} mx-auto`} 
              style={{ maxWidth: props.maxWidth || '800px' }}
            >
              {props.heading && (
                <h2 className="text-3xl font-bold mb-6">{props.heading}</h2>
              )}
              <div 
                className="prose prose-lg mx-auto"
                dangerouslySetInnerHTML={{ __html: props.content || '' }}
              />
            </div>
          </div>
        </section>
      );

    case 'video': {
      const embedUrl = getVideoEmbedUrl(props.url || '');
      if (!embedUrl) {
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400">
            <div className="text-4xl mb-2">🎬</div>
            <p className="text-sm">Add a YouTube or Vimeo URL</p>
          </div>
        );
      }
      return (
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            src={`${embedUrl}${props.autoplay ? '?autoplay=1&mute=1' : ''}`}
            className="absolute inset-0 w-full h-full rounded-lg"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    case 'columns': {
      const colCount = props.columns || 2;
      const children = block.children || [];
      return (
        <div className={`grid gap-6 ${colCount === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
          {Array.from({ length: colCount }).map((_, colIndex) => (
            <div key={colIndex} className="min-h-[60px]">
              {(children[colIndex] || []).map((child) => (
                <div key={child.id} className="mb-4 last:mb-0">
                  {renderBlock ? renderBlock(child) : <BlockRenderer block={child} isPreview={isPreview} />}
                </div>
              ))}
              {(!children[colIndex] || children[colIndex].length === 0) && !isPreview && (
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center text-gray-400 text-sm">
                  Column {colIndex + 1}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    case 'hero':
      return (
        <div
          className="relative rounded-xl overflow-hidden"
          style={{
            backgroundImage: props.bgImage ? `url(${props.bgImage})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            minHeight: '400px',
          }}
        >
          {props.overlay && (
            <div className="absolute inset-0 bg-black/50" />
          )}
          {!props.bgImage && (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
          )}
          <div className="relative z-10 flex flex-col items-center justify-center text-center p-12 min-h-[400px]">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{props.heading || 'Hero Heading'}</h1>
            {props.subtext ? (
              <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl">{props.subtext}</p>
            ) : null}
            {(props.ctaText || props.ctaText2) && (
              <div className="flex gap-4 flex-wrap justify-center">
                {props.ctaText && (
                  <a
                    href={props.ctaUrl || '#'}
                    className="px-8 py-3 bg-[#EF4923] text-white rounded-lg font-medium hover:bg-[#d63d1c] transition-colors"
                  >
                    {props.ctaText}
                  </a>
                )}
                {props.ctaText2 && (
                  <a
                    href={props.ctaUrl2 || '#'}
                    className="px-8 py-3 border-2 border-white text-white rounded-lg font-medium hover:bg-white/10 transition-colors"
                  >
                    {props.ctaText2}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      );

    case 'cards': {
      const cards = props.cards || [];
      const cols = props.columns || 3;
      const gridCls = cols === 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' :
                       cols === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' :
                       'grid-cols-1 sm:grid-cols-2';
      return (
        <div className={`grid gap-6 ${gridCls}`}>
          {cards.map((card: any, i: number) => (
            <div key={i} className="bg-white dark:bg-card rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
              {card.image && (
                <img src={card.image} alt={card.title} className="w-full h-48 object-cover" />
              )}
              {!card.image && (
                <div className="w-full h-48 bg-gray-100 dark:bg-muted flex items-center justify-center text-gray-400 text-3xl">🖼️</div>
              )}
              <div className="p-5">
                <h3 className="font-semibold text-lg mb-2">{card.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{card.description}</p>
                {card.link && (
                  <a href={card.link} className="text-sm text-[#EF4923] font-medium mt-3 inline-block hover:underline">
                    Learn more →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    case 'testimonial':
      return (
        <div className="bg-white dark:bg-card rounded-xl p-8 shadow-sm border text-center max-w-xl mx-auto">
          {props.avatar && (
            <img src={props.avatar} alt={props.author} className="w-16 h-16 rounded-full mx-auto mb-4 object-cover" />
          )}
          <StarRating rating={props.rating || 5} />
          <blockquote className="text-lg italic text-gray-700 dark:text-gray-300 my-4">
            "{props.quote || 'Testimonial quote...'}"
          </blockquote>
          <p className="font-semibold text-gray-900 dark:text-white">— {props.author || 'Author'}</p>
        </div>
      );

    case 'cta':
      return (
        <div
          className="rounded-xl p-10 text-center"
          style={{ backgroundColor: props.bgColor || '#EF4923' }}
        >
          <h2 className="text-3xl font-bold text-white mb-3">{props.heading || 'Call to Action'}</h2>
          <p className="text-white/80 mb-6 max-w-xl mx-auto">{props.text || 'Description text...'}</p>
          <a
            href={props.buttonUrl || '#'}
            className="inline-block px-8 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            {props.buttonText || 'Click Here'}
          </a>
        </div>
      );

    case 'image-gallery': {
      const images = props.images || [];
      const gCols = props.columns || 3;
      const gGrid = gCols === 4 ? 'grid-cols-2 md:grid-cols-4' :
                    gCols === 3 ? 'grid-cols-2 md:grid-cols-3' :
                    'grid-cols-1 md:grid-cols-2';
      if (images.length === 0) {
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400">
            <div className="text-4xl mb-2">🖼️</div>
            <p className="text-sm">Add images in settings</p>
          </div>
        );
      }
      return (
        <div className={`grid gap-4 ${gGrid}`}>
          {images.map((img: any, i: number) => (
            <img
              key={i}
              src={img.url}
              alt={img.alt || ''}
              className="w-full h-48 object-cover rounded-lg"
            />
          ))}
        </div>
      );
    }

    case 'faq': {
      const items = props.items || [];
      return (
        <div className="space-y-3">
          {items.map((item: any, i: number) => (
            <details key={i} className="bg-white dark:bg-card rounded-lg border shadow-sm group">
              <summary className="p-4 font-medium cursor-pointer list-none flex items-center justify-between hover:bg-gray-50 dark:hover:bg-muted rounded-lg">
                {item.question || 'Question?'}
                <span className="ml-2 text-gray-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-4 pb-4 text-gray-600 dark:text-gray-400">
                {item.answer || 'Answer...'}
              </div>
            </details>
          ))}
        </div>
      );
    }

    case 'toc': {
      const headings = props.headings || [];
      if (headings.length === 0) {
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-400">
            <div className="text-2xl mb-1">📋</div>
            <p className="text-sm">Table of Contents (auto-generates from headings)</p>
          </div>
        );
      }
      return (
        <div className="highlight bg-gray-50 border border-gray-200 rounded-lg p-5 my-4">
          <p className="font-semibold text-sm text-gray-700 mb-3 uppercase tracking-wide">Table of Contents</p>
          <ul className="space-y-1.5">
            {headings.map((h: any, i: number) => (
              <li key={i} style={{ paddingLeft: h.level === 3 ? '1rem' : '0' }}>
                <a
                  href={`#${h.anchorId}`}
                  className="text-sm text-[#EF4923] hover:underline"
                >
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    case 'idx-feed':
      return <IdxFeedBlock props={props} />;

    case 'idx-hero':
      return (
        <section className="relative min-h-[85vh] flex items-center justify-center rounded-xl overflow-hidden">
          {/* Background Image with Overlay */}
          <div className="absolute inset-0 z-0">
            <div 
              className="w-full h-full bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: `url('${block.content?.backgroundImage || props.backgroundImage || ''}')`
              }}
            />
            <div className="absolute inset-0 bg-black/50"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 max-w-4xl mx-auto px-4 text-center text-white">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4">
              {block.content?.headline || props.headline}
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-3">
              {block.content?.subtitleStats || props.subtitleStats}
            </p>
            <p className="text-base text-white/60 mb-8">
              {block.content?.subtitleTagline || props.subtitleTagline}
            </p>

            {/* Dual CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <a
                href={block.content?.primaryCtaLink || props.primaryCtaLink || '#'}
                className="px-8 py-3.5 bg-[#EF4923] hover:bg-[#d63d1c] text-white font-semibold rounded-lg transition-all text-lg shadow-lg hover:shadow-xl"
              >
                {block.content?.primaryCtaText || props.primaryCtaText}
              </a>
              <a
                href={block.content?.secondaryCtaLink || props.secondaryCtaLink || '#'}
                className="px-8 py-3.5 bg-white/10 backdrop-blur-sm border-2 border-white/40 text-white font-semibold rounded-lg hover:bg-white/20 transition-all text-lg"
              >
                {block.content?.secondaryCtaText || props.secondaryCtaText}
              </a>
            </div>

            {/* Search Bar */}
            <div className="max-w-3xl mx-auto mb-8">
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-white rounded-lg px-4 py-3 text-gray-800 text-left flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="text-gray-400">{block.content?.searchPlaceholder || props.searchPlaceholder}</span>
                </div>
                <button className="px-5 py-3 bg-[#EF4923] hover:bg-[#d63d1c] rounded-lg text-white transition-all flex items-center gap-2 font-medium">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  <span className="hidden md:inline">Filters</span>
                </button>
              </div>
            </div>

            {/* Trust Bar */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/70">
              <div className="flex items-center gap-1">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <span className="ml-1">{(block.content?.trustBarItems || props.trustBarItems)?.[0]}</span>
              </div>
              {(block.content?.trustBarItems || props.trustBarItems || []).slice(1).map((item: string, i: number) => (
                <span key={i}>
                  <span className="hidden sm:inline text-white/30 mr-6">|</span>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>
      );

    case 'idx-stats':
      return (
        <section className="bg-white border-y border-gray-100">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {props.items.map((stat: any, index: number) => (
              <div 
                key={index} 
                className="flex flex-col items-center justify-center py-6 px-4 border-r border-gray-100 last:border-r-0 hover:bg-gray-50 transition-colors cursor-default"
              >
                <div className="w-6 h-6 text-[#EF4923] mb-2">
                  {stat.iconName === 'HomeIcon' && '🏠'}
                  {stat.iconName === 'UserGroupIcon' && '👥'}
                  {stat.iconName === 'MapPinIcon' && '📍'}
                  {stat.iconName === 'CurrencyDollarIcon' && '💵'}
                  {stat.iconName === 'ChartBarIcon' && '📊'}
                  {stat.iconName === 'StarIcon' && '⭐'}
                </div>
                <div className="text-xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>
      );

    case 'idx-cards':
      return (
        <section className="py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
              {props.heading}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {props.cards.map((card: any, index: number) => (
                <div key={index} className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all">
                  <img
                    src={card.imageUrl}
                    alt={card.imageAlt || card.title}
                    className="w-full h-72 object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                    <h3 className="text-2xl font-bold mb-2">{card.title}</h3>
                    <p className="text-white/80 text-sm mb-4">
                      {card.description}
                    </p>
                    <a 
                      href={card.linkHref} 
                      className="inline-flex items-center text-[#EF4923] font-medium hover:text-white transition-colors"
                    >
                      {card.linkText}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case 'idx-testimonials': {
      const testimonials = props.items || [];
      // Simple static display of first testimonial for preview
      const currentTestimonial = testimonials[0] || { quote: 'Add testimonials in settings', agent: 'Customer', rating: 5 };
      
      return (
        <section className="py-16 bg-[#1F2937] text-white">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="inline-block mb-4">
              <span className="px-4 py-2 bg-[#EF4923]/20 border border-[#EF4923]/40 text-[#EF4923] text-sm font-semibold uppercase tracking-wider rounded-full">
                {props.label}
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-12">
              {props.heading}
            </h2>
            <div className="relative min-h-[200px] flex items-center justify-center">
              <div className="max-w-3xl mx-auto">
                <div className="flex justify-center mb-6">
                  <div className="flex text-yellow-400">
                    {[...Array(currentTestimonial.rating)].map((_, i) => (
                      <svg key={i} className="w-6 h-6 fill-current" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                    ))}
                  </div>
                </div>
                <blockquote className="text-xl md:text-2xl leading-relaxed mb-8 font-light italic">
                  &ldquo;{currentTestimonial.quote}&rdquo;
                </blockquote>
                <p className="text-[#EF4923] font-semibold">
                  {currentTestimonial.agent}
                </p>
              </div>
            </div>
            {testimonials.length > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {testimonials.map((_: any, index: number) => (
                  <div
                    key={index}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      index === 0 ? 'bg-[#EF4923]' : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      );
    }

    case 'idx-reviews':
      return (
        <section className="py-20 bg-gradient-to-br from-[#EF4923] to-[#d63d1c] text-white">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="text-7xl md:text-8xl font-bold mb-4">
              {props.count}
            </div>
            <div className="flex justify-center gap-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-8 h-8 fill-current text-yellow-400" viewBox="0 0 20 20">
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                </svg>
              ))}
            </div>
            <h3 className="text-3xl font-semibold mb-2">{props.label}</h3>
            <p className="text-xl text-white/80">{props.subtext}</p>
          </div>
        </section>
      );

    case 'idx-neighborhoods': {
      const neighborhoods = props.neighborhoods || [];
      return (
        <section className="py-20 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">
              {props.heading}
            </h2>
            <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
              {props.subheading}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {neighborhoods.map((neighborhood: any, index: number) => (
                <a
                  key={index}
                  href={neighborhood.link}
                  className="group relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all"
                >
                  <img
                    src={neighborhood.imageUrl}
                    alt={neighborhood.name}
                    className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-white font-semibold text-lg">{neighborhood.name}</h3>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      );
    }

    case 'idx-cta-banner':
      return (
        <section 
          className="py-20 text-white relative overflow-hidden"
          style={{ 
            backgroundColor: props.bgColor || '#1F2937',
            backgroundImage: props.bgImage ? `url('${props.bgImage}')` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {props.bgImage && <div className="absolute inset-0 bg-black/60" />}
          <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              {props.heading}
            </h2>
            <p className="text-2xl text-white/80 mb-6">
              {props.subheading}
            </p>
            <p className="text-lg text-white/70 mb-10 max-w-2xl mx-auto">
              {props.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={props.primaryCtaUrl || '#'}
                className="px-8 py-3.5 bg-[#EF4923] hover:bg-[#d63d1c] text-white font-semibold rounded-lg transition-all text-lg shadow-lg hover:shadow-xl"
              >
                {props.primaryCtaText}
              </a>
              <a
                href={props.secondaryCtaUrl || '#'}
                className="px-8 py-3.5 bg-transparent border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-all text-lg"
              >
                {props.secondaryCtaText}
              </a>
            </div>
          </div>
        </section>
      );

    case 'idx-two-column': {
      const isImageLeft = props.imagePosition === 'left';
      return (
        <section className="py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-12 items-center ${isImageLeft ? '' : 'md:flex-row-reverse'}`}>
              <div className={isImageLeft ? 'order-2 md:order-1' : 'order-2'}>
                <img
                  src={props.imageUrl}
                  alt={props.imageAlt}
                  className="w-full rounded-2xl shadow-lg"
                />
              </div>
              <div className={isImageLeft ? 'order-1 md:order-2' : 'order-1'}>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  {props.heading}
                </h2>
                <p className="text-xl text-gray-700 mb-6">
                  {props.subheading}
                </p>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  {props.description}
                </p>
                {props.ctaText && (
                  <a
                    href={props.ctaUrl || '#'}
                    className="inline-flex items-center px-6 py-3 bg-[#EF4923] hover:bg-[#d63d1c] text-white font-semibold rounded-lg transition-all"
                  >
                    {props.ctaText}
                    <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      );
    }

    case 'idx-features': {
      const features = props.features || [];
      return (
        <section className="py-20 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">
              {props.heading}
            </h2>
            <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
              {props.subheading}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <img
                  src={props.imageUrl}
                  alt={props.imageAlt}
                  className="w-full rounded-2xl shadow-lg"
                />
              </div>
              <div className="space-y-8">
                {features.map((feature: any, index: number) => (
                  <div key={index} className="flex gap-4">
                    <div className="text-3xl flex-shrink-0">{feature.icon}</div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      );
    }

    default:
      return (
        <div className="p-4 border border-dashed border-red-300 rounded-lg text-red-500 text-sm">
          Unknown block type: {type}
        </div>
      );
  }
}

// ── IDX Listing Feed Block ──────────────────────────────────

interface IdxListing {
  mlsNumber: string;
  listPrice: number;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  photo: string | null;
  photos: string[];
  status: string;
  daysOnMarket: number;
  yearBuilt: number | null;
  propertyType: string;
  listDate: string | null;
}

function IdxFeedBlock({ props }: { props: Record<string, any> }) {
  const communityId = props.communityId;
  const limit = props.pageLimit || 12;
  const sortField = props.sortField || 'ListingPrice';
  const sortOrder = props.sortOrder || 'DESC';

  // Map sort fields to Repliers sortBy format
  const sortByMap: Record<string, string> = {
    ListingPrice: sortOrder === 'ASC' ? 'listPriceAsc' : 'listPriceDesc',
    ListDate: sortOrder === 'ASC' ? 'createdOnAsc' : 'createdOnDesc',
    DaysOnMarket: sortOrder === 'ASC' ? 'daysOnMarketAsc' : 'daysOnMarketDesc',
  };
  const sort = sortByMap[sortField] || 'createdOnDesc';

  // Fetch communities for name display
  const { data: communities } = useQuery<Array<{ id: number; name: string }>>({
    queryKey: ['/api/admin/communities/with-polygons'],
    queryFn: async () => {
      const res = await fetch('/api/admin/communities/with-polygons', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60000,
  });

  const communityName = communityId
    ? communities?.find((c) => c.id === communityId)?.name || `Community #${communityId}`
    : 'All Communities';

  // Fetch real listings from Repliers via polygon
  const { data: listingsData, isLoading: listingsLoading, error: listingsError } = useQuery<{
    listings: IdxListing[];
    count: number;
    communityName: string;
  }>({
    queryKey: ['/api/listings/by-polygon', communityId, sort, limit],
    queryFn: async () => {
      if (!communityId) return { listings: [], count: 0, communityName: '' };
      const params = new URLSearchParams({
        communityId: communityId.toString(),
        sort,
        limit: limit.toString(),
        class: (props.searchType || 'residential').toLowerCase(),
      });
      const res = await fetch(`/api/listings/by-polygon?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to fetch listings');
      }
      return res.json();
    },
    enabled: !!communityId,
    staleTime: 300000, // 5 min cache
  });

  const listings = listingsData?.listings || [];

  // If no community selected, show config preview
  if (!communityId) {
    return (
      <div className="border rounded-xl p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">🏘</span>
          <div>
            <h3 className="font-bold text-lg">IDX Listing Feed</h3>
            <p className="text-sm text-gray-500">
              Select a community in the settings panel to display live MLS listings
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-white rounded-lg p-3 border">
            <span className="text-gray-400 text-xs">Search Type</span>
            <p className="font-medium">{props.searchType || 'Residential'}</p>
          </div>
          <div className="bg-white rounded-lg p-3 border">
            <span className="text-gray-400 text-xs">Sort</span>
            <p className="font-medium">{sortField} ({sortOrder})</p>
          </div>
        </div>
        {/* Placeholder skeleton cards */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border overflow-hidden">
              <div className="h-16 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                <span className="text-gray-400 text-sm">🏠</span>
              </div>
              <div className="p-2">
                <div className="h-2 bg-gray-200 rounded w-3/4 mb-1"></div>
                <div className="h-2 bg-gray-100 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-xl p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏘</span>
          <div>
            <h3 className="font-bold text-lg">Listings in {communityName}</h3>
            <p className="text-sm text-gray-500">
              {listingsLoading
                ? 'Loading live MLS listings...'
                : listingsError
                ? 'Error loading listings'
                : `${listingsData?.count || 0} active listings`}
            </p>
          </div>
        </div>
        <div className="flex gap-2 text-xs text-gray-500">
          <span className="bg-white rounded px-2 py-1 border">{props.searchType || 'Residential'}</span>
          <span className="bg-white rounded px-2 py-1 border">{sortField} {sortOrder}</span>
        </div>
      </div>

      {/* Loading state */}
      {listingsLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: Math.min(limit, 6) }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border overflow-hidden animate-pulse">
              <div className="h-32 bg-gray-200" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {listingsError && !listingsLoading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-sm text-red-600">
            Could not load listings. The MLS API may be temporarily unavailable.
          </p>
        </div>
      )}

      {/* Listings grid */}
      {!listingsLoading && !listingsError && listings.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {listings.slice(0, limit).map((listing) => (
            <div key={listing.mlsNumber} className="bg-white rounded-lg border overflow-hidden hover:shadow-md transition-shadow">
              {listing.photo ? (
                <img
                  src={listing.photo}
                  alt={listing.address}
                  className="w-full h-32 object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-32 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                  <span className="text-2xl">🏠</span>
                </div>
              )}
              <div className="p-3">
                <p className="font-bold text-base">
                  ${listing.listPrice?.toLocaleString() || 'N/A'}
                </p>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {listing.address}
                </p>
                <p className="text-xs text-gray-500">
                  {listing.city}{listing.state ? `, ${listing.state}` : ''} {listing.postalCode}
                </p>
                <div className="flex gap-3 mt-2 text-xs text-gray-500">
                  {listing.bedrooms > 0 && <span>{listing.bedrooms} Beds</span>}
                  {listing.bathrooms > 0 && <span>{listing.bathrooms} Baths</span>}
                  {listing.sqft > 0 && <span>{listing.sqft.toLocaleString()} sqft</span>}
                </div>
                {listing.daysOnMarket > 0 && (
                  <p className="text-[10px] text-gray-500 mt-1">
                    {listing.daysOnMarket} days on market
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {!listingsLoading && !listingsError && listings.length === 0 && (
        <div className="bg-white rounded-lg border p-6 text-center">
          <span className="text-3xl block mb-2">🔍</span>
          <p className="text-sm text-gray-500">
            No active listings found in this community polygon.
          </p>
        </div>
      )}
    </div>
  );
}
