/**
 * HTML Import Parser for Mission Control Page Builder
 * Converts HTML pages into Mission Control widget blocks
 */

import { nanoid } from 'nanoid';
import type { BlockData } from '@/components/page-builder/types';

interface ParseResult {
  seo: {
    title: string;
    description: string;
    canonical: string;
    ogImage: string;
    keywords: string;
  };
  blocks: BlockData[];
  assets: string[];
}

export class HTMLImportParser {
  private widgetMap = {
    hero: 'idx-hero',
    cards: 'idx-cards',
    split: 'idx-two-column',
    testimonials: 'idx-testimonials',
    faq: 'faq',
    text: 'text',
    services: 'idx-features',
    communities: 'idx-neighborhoods'
  };

  /**
   * Main parse function - converts HTML to page blocks
   */
  parseHTML(htmlContent: string): ParseResult {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    const result: ParseResult = {
      seo: this.extractSEO(doc),
      blocks: [],
      assets: []
    };

    // Parse each section
    const sections = doc.querySelectorAll('section');
    sections.forEach(section => {
      const block = this.parseSection(section);
      if (block) {
        result.blocks.push(block);
        // Collect assets for download
        if ('assets' in block) {
          result.assets.push(...(block as any).assets);
        }
      }
    });

    return result;
  }

  /**
   * Extract SEO metadata
   */
  private extractSEO(doc: Document) {
    return {
      title: doc.querySelector('title')?.textContent || '',
      description: doc.querySelector<HTMLMetaElement>('meta[name="description"]')?.content || '',
      canonical: doc.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href || '',
      ogImage: doc.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content || '',
      keywords: doc.querySelector<HTMLMetaElement>('meta[name="keywords"]')?.content || ''
    };
  }

  /**
   * Parse individual section based on content patterns
   */
  private parseSection(section: HTMLElement): BlockData | null {
    // Hero section
    if (section.classList.contains('hero')) {
      return this.parseHero(section);
    }

    // Text/intro sections
    if (section.querySelector('.intro-text') || section.querySelector('.text-center')) {
      return this.parseTextSection(section);
    }

    // Split/two-column sections
    if (section.querySelector('.split')) {
      return this.parseSplitSection(section);
    }

    // Card grid sections
    if (section.querySelector('.cards-3')) {
      return this.parseCardSection(section);
    }

    // Community grid
    if (section.querySelector('.community-grid')) {
      return this.parseCommunityGrid(section);
    }

    // Services grid
    if (section.querySelector('.services-grid')) {
      return this.parseServicesSection(section);
    }

    // Testimonials
    if (section.querySelector('.testimonials-grid')) {
      return this.parseTestimonials(section);
    }

    // FAQ
    if (section.querySelector('.faq-list')) {
      return this.parseFAQ(section);
    }

    // Generic section with heading + content
    const heading = section.querySelector('h2');
    const content = section.querySelector('p');
    if (heading || content) {
      return {
        id: nanoid(),
        type: 'text',
        props: {
          heading: heading?.textContent || '',
          content: this.cleanHTML(section.innerHTML),
          backgroundColor: this.getBackgroundColor(section)
        }
      };
    }

    return null;
  }

  /**
   * Parse hero section
   */
  private parseHero(section: HTMLElement): BlockData & { assets?: string[] } {
    const h1 = section.querySelector('h1');
    const backgroundImage = this.extractBackgroundImage(section);
    
    return {
      id: nanoid(),
      type: 'idx-hero',
      props: {
        headline: h1?.textContent || '',
        backgroundImage: backgroundImage,
        overlay: true,
        overlayOpacity: 0.5,
        height: 'medium',
        alignment: 'left',
        // Hero typically has search bar in IDX
        showSearch: true
      },
      assets: backgroundImage ? [backgroundImage] : []
    };
  }

  /**
   * Parse text/intro sections
   */
  private parseTextSection(section: HTMLElement): BlockData {
    const container = section.querySelector('.intro-text') || section.querySelector('.container');
    const h2 = section.querySelector('h2');
    
    return {
      id: nanoid(),
      type: 'text',
      props: {
        heading: h2?.textContent || '',
        content: this.extractParagraphs(container as HTMLElement),
        alignment: section.classList.contains('text-center') ? 'center' : 'left',
        backgroundColor: this.getBackgroundColor(section),
        maxWidth: '800px'
      }
    };
  }

  /**
   * Parse split/two-column sections
   */
  private parseSplitSection(section: HTMLElement): BlockData & { assets?: string[] } {
    const split = section.querySelector('.split');
    if (!split) return this.createEmptyBlock();
    
    const isReverse = split.classList.contains('split--reverse');
    const imgDiv = split.querySelector('.split__img');
    const textDiv = split.querySelector('.split__text');
    
    // Check if it's video or image
    const iframe = imgDiv?.querySelector('iframe');
    const img = imgDiv?.querySelector('img');
    
    const leftContent = {
      type: iframe ? 'video' : 'image',
      url: iframe ? (iframe as HTMLIFrameElement).src : (img as HTMLImageElement)?.src,
      alt: (img as HTMLImageElement)?.alt
    };
    
    const rightContent = {
      type: 'content',
      heading: textDiv?.querySelector('h2')?.textContent || '',
      content: this.extractTextContent(textDiv as HTMLElement),
      buttons: this.extractButtons(textDiv as HTMLElement)
    };

    return {
      id: nanoid(),
      type: 'idx-two-column',
      props: {
        leftColumn: isReverse ? rightContent : leftContent,
        rightColumn: isReverse ? leftContent : rightContent,
        gap: 'large',
        verticalAlignment: 'center',
        backgroundColor: this.getBackgroundColor(section)
      },
      assets: img?.src ? [(img as HTMLImageElement).src] : []
    };
  }

  /**
   * Parse card grid sections
   */
  private parseCardSection(section: HTMLElement): BlockData & { assets?: string[] } {
    const cards: any[] = [];
    const assets: string[] = [];
    
    section.querySelectorAll('.card').forEach(card => {
      const img = card.querySelector('img') as HTMLImageElement;
      const link = card.querySelector('a') as HTMLAnchorElement;
      const text = card.querySelector('.card__body p');
      
      cards.push({
        image: img?.src || '',
        imageAlt: img?.alt || '',
        title: img?.alt || '', // Using alt as title since no h3 in these cards
        description: text?.textContent || '',
        link: link?.href || '',
        linkText: 'Learn More'
      });
      
      if (img?.src) assets.push(img.src);
    });

    return {
      id: nanoid(),
      type: 'idx-cards',
      props: {
        heading: section.querySelector('h2')?.textContent || '',
        cards: cards,
        columns: 3,
        backgroundColor: this.getBackgroundColor(section)
      },
      assets: assets
    };
  }

  /**
   * Parse community grid
   */
  private parseCommunityGrid(section: HTMLElement): BlockData & { assets?: string[] } {
    const communities: any[] = [];
    const assets: string[] = [];
    
    section.querySelectorAll('.community-item').forEach(item => {
      const img = item.querySelector('img') as HTMLImageElement;
      const label = item.querySelector('.community-label');
      
      communities.push({
        name: label?.textContent || '',
        image: img?.src || '',
        link: '#' // Would need to extract actual links
      });
      
      if (img?.src) assets.push(img.src);
    });

    return {
      id: nanoid(),
      type: 'idx-neighborhoods',
      props: {
        heading: section.querySelector('h2')?.textContent || '',
        neighborhoods: communities,
        columns: 4,
        showLabels: true
      },
      assets: assets
    };
  }

  /**
   * Parse services section
   */
  private parseServicesSection(section: HTMLElement): BlockData {
    const services: any[] = [];
    
    section.querySelectorAll('.service-item').forEach(item => {
      services.push({
        title: item.querySelector('h3')?.textContent || '',
        description: item.querySelector('p')?.innerHTML || '',
        icon: 'check-circle' // Default icon
      });
    });

    return {
      id: nanoid(),
      type: 'idx-features',
      props: {
        heading: section.querySelector('h2')?.textContent || '',
        features: services,
        columns: 2,
        backgroundColor: this.getBackgroundColor(section)
      }
    };
  }

  /**
   * Parse testimonials
   */
  private parseTestimonials(section: HTMLElement): BlockData {
    const testimonials: any[] = [];
    
    section.querySelectorAll('.testimonial-card').forEach(card => {
      testimonials.push({
        quote: card.querySelector('blockquote')?.textContent || '',
        author: card.querySelector('cite')?.textContent || '',
        rating: 5, // All show 5 stars
        stars: true
      });
    });

    return {
      id: nanoid(),
      type: 'idx-testimonials',
      props: {
        heading: section.querySelector('h2')?.textContent || '',
        items: testimonials,
        columns: 2,
        backgroundColor: this.getBackgroundColor(section),
        theme: section.classList.contains('section--dark') ? 'dark' : 'light'
      }
    };
  }

  /**
   * Parse FAQ section
   */
  private parseFAQ(section: HTMLElement): BlockData {
    const items: any[] = [];
    
    section.querySelectorAll('.faq-item').forEach(item => {
      items.push({
        question: item.querySelector('h3')?.textContent || '',
        answer: item.querySelector('p')?.innerHTML || ''
      });
    });

    return {
      id: nanoid(),
      type: 'faq',
      props: {
        heading: section.querySelector('h2')?.textContent || '',
        items: items,
        expandable: true
      }
    };
  }

  /**
   * Helper: Extract background image from inline styles
   */
  private extractBackgroundImage(element: HTMLElement): string | null {
    const style = element.getAttribute('style') || '';
    const bgImage = style.match(/background-image:\s*url\(['"]?(.*?)['"]?\)/);
    if (bgImage) return bgImage[1];
    
    // Also check computed styles
    const computedStyle = window.getComputedStyle(element);
    const computedBg = computedStyle.backgroundImage;
    if (computedBg && computedBg !== 'none') {
      const match = computedBg.match(/url\(['"]?(.*?)['"]?\)/);
      if (match) return match[1];
    }
    
    return null;
  }

  /**
   * Helper: Get background color class
   */
  private getBackgroundColor(section: HTMLElement): string {
    if (section.classList.contains('section--dark')) return 'dark';
    if (section.classList.contains('section--light')) return 'light';
    return 'white';
  }

  /**
   * Helper: Extract text content preserving links
   */
  private extractTextContent(element: HTMLElement): string {
    if (!element) return '';
    
    // Clone to avoid modifying original
    const clone = element.cloneNode(true) as HTMLElement;
    
    // Remove buttons
    clone.querySelectorAll('.btn-group').forEach(el => el.remove());
    
    // Get inner HTML to preserve links
    return this.cleanHTML(clone.innerHTML);
  }

  /**
   * Helper: Extract paragraphs
   */
  private extractParagraphs(container: HTMLElement | null): string {
    if (!container) return '';
    
    const paragraphs = container.querySelectorAll('p');
    return Array.from(paragraphs)
      .map(p => p.innerHTML)
      .join('\n\n');
  }

  /**
   * Helper: Extract buttons
   */
  private extractButtons(element: HTMLElement): any[] {
    const buttons: any[] = [];
    element.querySelectorAll('.btn').forEach(btn => {
      const anchor = btn as HTMLAnchorElement;
      buttons.push({
        text: btn.textContent?.trim() || '',
        link: anchor.href || '#',
        style: btn.classList.contains('btn--primary') ? 'primary' : 'secondary',
        target: anchor.target || '_self'
      });
    });
    return buttons;
  }

  /**
   * Helper: Clean HTML content
   */
  private cleanHTML(html: string): string {
    return html
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .trim();
  }

  /**
   * Helper: Create empty block
   */
  private createEmptyBlock(): BlockData & { assets?: string[] } {
    return {
      id: nanoid(),
      type: 'text',
      props: {
        heading: '',
        content: '',
      },
      assets: []
    };
  }
}