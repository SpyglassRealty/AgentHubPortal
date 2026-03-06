/**
 * HTML Import Parser for Mission Control Page Builder
 * Converts HTML pages into Mission Control widget blocks
 */

class HTMLImportParser {
  constructor() {
    this.widgetMap = {
      hero: 'idx-hero',
      cards: 'idx-cards',
      split: 'idx-two-column',
      testimonials: 'idx-testimonials',
      faq: 'faq',
      text: 'text',
      services: 'idx-features',
      communities: 'idx-neighborhoods'
    };
  }

  /**
   * Main parse function - converts HTML to page blocks
   */
  parseHTML(htmlContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    const result = {
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
        if (block.assets) {
          result.assets.push(...block.assets);
        }
      }
    });

    return result;
  }

  /**
   * Extract SEO metadata
   */
  extractSEO(doc) {
    return {
      title: doc.querySelector('title')?.textContent || '',
      description: doc.querySelector('meta[name="description"]')?.content || '',
      canonical: doc.querySelector('link[rel="canonical"]')?.href || '',
      ogImage: doc.querySelector('meta[property="og:image"]')?.content || '',
      keywords: doc.querySelector('meta[name="keywords"]')?.content || ''
    };
  }

  /**
   * Parse individual section based on content patterns
   */
  parseSection(section) {
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
  parseHero(section) {
    const h1 = section.querySelector('h1');
    const backgroundImage = this.extractBackgroundImage(section);
    
    return {
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
  parseTextSection(section) {
    const container = section.querySelector('.intro-text') || section.querySelector('.container');
    const h2 = section.querySelector('h2');
    
    return {
      type: 'text',
      props: {
        heading: h2?.textContent || '',
        content: this.extractParagraphs(container),
        alignment: section.classList.contains('text-center') ? 'center' : 'left',
        backgroundColor: this.getBackgroundColor(section),
        maxWidth: '800px'
      }
    };
  }

  /**
   * Parse split/two-column sections
   */
  parseSplitSection(section) {
    const split = section.querySelector('.split');
    const isReverse = split.classList.contains('split--reverse');
    const imgDiv = split.querySelector('.split__img');
    const textDiv = split.querySelector('.split__text');
    
    // Check if it's video or image
    const iframe = imgDiv?.querySelector('iframe');
    const img = imgDiv?.querySelector('img');
    
    const leftContent = {
      type: iframe ? 'video' : 'image',
      url: iframe ? iframe.src : img?.src,
      alt: img?.alt
    };
    
    const rightContent = {
      type: 'content',
      heading: textDiv?.querySelector('h2')?.textContent || '',
      content: this.extractTextContent(textDiv),
      buttons: this.extractButtons(textDiv)
    };

    return {
      type: 'idx-two-column',
      props: {
        leftColumn: isReverse ? rightContent : leftContent,
        rightColumn: isReverse ? leftContent : rightContent,
        gap: 'large',
        verticalAlignment: 'center',
        backgroundColor: this.getBackgroundColor(section)
      },
      assets: img?.src ? [img.src] : []
    };
  }

  /**
   * Parse card grid sections
   */
  parseCardSection(section) {
    const cards = [];
    const assets = [];
    
    section.querySelectorAll('.card').forEach(card => {
      const img = card.querySelector('img');
      const link = card.querySelector('a');
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
  parseCommunityGrid(section) {
    const communities = [];
    const assets = [];
    
    section.querySelectorAll('.community-item').forEach(item => {
      const img = item.querySelector('img');
      const label = item.querySelector('.community-label');
      
      communities.push({
        name: label?.textContent || '',
        image: img?.src || '',
        link: '#' // Would need to extract actual links
      });
      
      if (img?.src) assets.push(img.src);
    });

    return {
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
  parseServicesSection(section) {
    const services = [];
    
    section.querySelectorAll('.service-item').forEach(item => {
      services.push({
        title: item.querySelector('h3')?.textContent || '',
        description: item.querySelector('p')?.innerHTML || '',
        icon: 'check-circle' // Default icon
      });
    });

    return {
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
  parseTestimonials(section) {
    const testimonials = [];
    
    section.querySelectorAll('.testimonial-card').forEach(card => {
      testimonials.push({
        quote: card.querySelector('blockquote')?.textContent || '',
        author: card.querySelector('cite')?.textContent || '',
        rating: 5, // All show 5 stars
        stars: true
      });
    });

    return {
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
  parseFAQ(section) {
    const items = [];
    
    section.querySelectorAll('.faq-item').forEach(item => {
      items.push({
        question: item.querySelector('h3')?.textContent || '',
        answer: item.querySelector('p')?.innerHTML || ''
      });
    });

    return {
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
  extractBackgroundImage(element) {
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
  getBackgroundColor(section) {
    if (section.classList.contains('section--dark')) return 'dark';
    if (section.classList.contains('section--light')) return 'light';
    return 'white';
  }

  /**
   * Helper: Extract text content preserving links
   */
  extractTextContent(element) {
    if (!element) return '';
    
    // Clone to avoid modifying original
    const clone = element.cloneNode(true);
    
    // Remove buttons
    clone.querySelectorAll('.btn-group').forEach(el => el.remove());
    
    // Get inner HTML to preserve links
    return this.cleanHTML(clone.innerHTML);
  }

  /**
   * Helper: Extract paragraphs
   */
  extractParagraphs(container) {
    if (!container) return '';
    
    const paragraphs = container.querySelectorAll('p');
    return Array.from(paragraphs)
      .map(p => p.innerHTML)
      .join('\n\n');
  }

  /**
   * Helper: Extract buttons
   */
  extractButtons(element) {
    const buttons = [];
    element.querySelectorAll('.btn').forEach(btn => {
      buttons.push({
        text: btn.textContent.trim(),
        link: btn.href || '#',
        style: btn.classList.contains('btn--primary') ? 'primary' : 'secondary',
        target: btn.target || '_self'
      });
    });
    return buttons;
  }

  /**
   * Helper: Clean HTML content
   */
  cleanHTML(html) {
    return html
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .trim();
  }
}

// Export for use in Mission Control
export default HTMLImportParser;