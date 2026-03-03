import type { WidgetDefinition, WidgetCategory } from './types';

export const blockRegistry: WidgetDefinition[] = [
  // ── Layout ──────────────────────────────────
  {
    type: 'columns',
    label: 'Columns',
    icon: '⬜⬜',
    category: 'Layout',
    defaultProps: { columns: 2 },
  },
  {
    type: 'spacer',
    label: 'Spacer',
    icon: '↕️',
    category: 'Layout',
    defaultProps: { height: 40 },
  },
  {
    type: 'divider',
    label: 'Divider',
    icon: '➖',
    category: 'Layout',
    defaultProps: { style: 'solid', color: '#e5e7eb', width: '100%' },
  },

  // ── Basic ──────────────────────────────────
  {
    type: 'heading',
    label: 'Heading',
    icon: '🔤',
    category: 'Basic',
    defaultProps: { level: 2, text: 'New Heading', alignment: 'left', color: '#000000' },
  },
  {
    type: 'text',
    label: 'Text',
    icon: '📝',
    category: 'Basic',
    defaultProps: { content: 'Enter your text here...', alignment: 'left' },
  },
  {
    type: 'image',
    label: 'Image',
    icon: '🖼️',
    category: 'Basic',
    defaultProps: { url: '', alt: '', width: '100%', alignment: 'center', link: '' },
  },
  {
    type: 'button',
    label: 'Button',
    icon: '🔘',
    category: 'Basic',
    defaultProps: { text: 'Click Me', url: '#', style: 'primary', size: 'md', alignment: 'center' },
  },
  {
    type: 'html',
    label: 'HTML',
    icon: '💻',
    category: 'Basic',
    defaultProps: { code: '<div>Custom HTML</div>' },
  },

  // ── Media ──────────────────────────────────
  {
    type: 'video',
    label: 'Video',
    icon: '🎬',
    category: 'Media',
    defaultProps: { url: '', autoplay: false },
  },
  {
    type: 'image-gallery',
    label: 'Image Gallery',
    icon: '🖼️',
    category: 'Media',
    defaultProps: { images: [], columns: 3 },
  },

  // ── Content ──────────────────────────────────
  {
    type: 'hero',
    label: 'Hero',
    icon: '🏔️',
    category: 'Content',
    defaultProps: {
      heading: 'Welcome',
      subtext: 'Your subtitle here',
      bgImage: '',
      ctaText: 'Get Started',
      ctaUrl: '#',
      ctaText2: '',
      ctaUrl2: '',
      overlay: true,
    },
  },
  {
    type: 'cards',
    label: 'Cards',
    icon: '🃏',
    category: 'Content',
    defaultProps: {
      cards: [
        { image: '', title: 'Card 1', description: 'Description here', link: '' },
        { image: '', title: 'Card 2', description: 'Description here', link: '' },
        { image: '', title: 'Card 3', description: 'Description here', link: '' },
      ],
      columns: 3,
    },
  },
  {
    type: 'testimonial',
    label: 'Testimonial',
    icon: '💬',
    category: 'Content',
    defaultProps: { quote: 'Great experience!', author: 'John Doe', rating: 5, avatar: '' },
  },
  {
    type: 'cta',
    label: 'CTA',
    icon: '📢',
    category: 'Content',
    defaultProps: {
      heading: 'Ready to Get Started?',
      text: 'Contact us today for a free consultation.',
      buttonText: 'Contact Us',
      buttonUrl: '#',
      bgColor: '#EF4923',
    },
  },
  {
    type: 'faq',
    label: 'FAQ',
    icon: '❓',
    category: 'Content',
    defaultProps: {
      items: [
        { question: 'What is your service?', answer: 'We provide...' },
        { question: 'How does it work?', answer: 'It works by...' },
      ],
    },
  },
  {
    type: 'toc',
    label: 'Table of Contents',
    icon: '📋',
    category: 'Content',
    defaultProps: { headings: [] },
  },

  // ── Real Estate ──────────────────────────────────
  {
    type: 'idx-feed',
    label: 'IDX Listing Feed',
    icon: '🏘',
    category: 'Real Estate',
    defaultProps: {
      communityId: null,
      searchType: 'Residential',
      searchSubtype: '',
      sortOrder: 'DESC',
      sortField: 'ListingPrice',
      pageLimit: 12,
    },
  },
];

export const widgetCategories: WidgetCategory[] = ['Layout', 'Basic', 'Media', 'Content', 'Real Estate'];

export function getWidgetsByCategory(category: WidgetCategory): WidgetDefinition[] {
  return blockRegistry.filter(w => w.category === category);
}

export function getWidgetDefinition(type: string): WidgetDefinition | undefined {
  return blockRegistry.find(w => w.type === type);
}
