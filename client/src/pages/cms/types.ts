import type { CmsPage, PageContent, CmsSection, CmsColumn, CmsBlock, BlockStyle } from "@shared/schema";

export type { CmsPage, PageContent, CmsSection, CmsColumn, CmsBlock, BlockStyle };

// Widget definition for the sidebar
export interface WidgetDefinition {
  type: string;
  label: string;
  icon: string;
  category: 'layout' | 'basic' | 'content' | 'realestate' | 'advanced';
  defaultContent: Record<string, any>;
  defaultStyle?: BlockStyle;
}

// Editor state
export interface EditorState {
  page: CmsPage | null;
  selectedBlockId: string | null;
  selectedSectionId: string | null;
  isDirty: boolean;
  history: PageContent[];
  historyIndex: number;
}

// Widget definitions for the drag-and-drop sidebar
export const WIDGET_DEFINITIONS: WidgetDefinition[] = [
  // Layout
  {
    type: 'section',
    label: 'Section',
    icon: '⬜',
    category: 'layout',
    defaultContent: {},
    defaultStyle: { padding: '40px 20px' },
  },
  {
    type: 'columns-2',
    label: '2 Columns',
    icon: '▥',
    category: 'layout',
    defaultContent: { columns: 2 },
  },
  {
    type: 'columns-3',
    label: '3 Columns',
    icon: '▦',
    category: 'layout',
    defaultContent: { columns: 3 },
  },
  {
    type: 'spacer',
    label: 'Spacer',
    icon: '↕',
    category: 'layout',
    defaultContent: { height: '40px' },
  },
  {
    type: 'divider',
    label: 'Divider',
    icon: '─',
    category: 'layout',
    defaultContent: { style: 'solid', width: '100%' },
  },

  // Basic
  {
    type: 'heading',
    label: 'Heading',
    icon: 'H',
    category: 'basic',
    defaultContent: { text: 'New Heading', level: 'h2' },
  },
  {
    type: 'text',
    label: 'Rich Text',
    icon: 'T',
    category: 'basic',
    defaultContent: { html: '<p>Start typing your content here...</p>' },
  },
  {
    type: 'image',
    label: 'Image',
    icon: '🖼',
    category: 'basic',
    defaultContent: { src: '', alt: '', caption: '' },
  },
  {
    type: 'button',
    label: 'Button',
    icon: '🔘',
    category: 'basic',
    defaultContent: { text: 'Click Me', url: '#', variant: 'primary' },
  },
  {
    type: 'link',
    label: 'Link',
    icon: '🔗',
    category: 'basic',
    defaultContent: { text: 'Click here', url: '#', target: '_self' },
  },

  // Content
  {
    type: 'gallery',
    label: 'Image Gallery',
    icon: '🖼️',
    category: 'content',
    defaultContent: { images: [], columns: 3 },
  },
  {
    type: 'video',
    label: 'Video Embed',
    icon: '▶',
    category: 'content',
    defaultContent: { url: '', provider: 'youtube' },
  },
  {
    type: 'testimonial',
    label: 'Testimonial',
    icon: '💬',
    category: 'content',
    defaultContent: { quote: 'Great service!', author: 'John Doe', role: 'Client', avatar: '' },
  },
  {
    type: 'faq',
    label: 'FAQ Accordion',
    icon: '❓',
    category: 'content',
    defaultContent: {
      items: [
        { question: 'Question 1?', answer: 'Answer 1.' },
        { question: 'Question 2?', answer: 'Answer 2.' },
      ],
    },
  },
  {
    type: 'iconbox',
    label: 'Icon Box',
    icon: '⭐',
    category: 'content',
    defaultContent: { icon: '⭐', title: 'Feature Title', description: 'Feature description' },
  },

  // Real Estate
  {
    type: 'listing-card',
    label: 'Listing Card',
    icon: '🏠',
    category: 'realestate',
    defaultContent: { address: '123 Main St', price: '$450,000', beds: 3, baths: 2, sqft: '1,500', image: '' },
  },
  {
    type: 'agent-card',
    label: 'Agent Card',
    icon: '👤',
    category: 'realestate',
    defaultContent: { name: 'Agent Name', title: 'Realtor', phone: '', email: '', photo: '' },
  },
  {
    type: 'community-map',
    label: 'Community Map',
    icon: '🗺',
    category: 'realestate',
    defaultContent: { lat: 30.2672, lng: -97.7431, zoom: 12, title: 'Community' },
  },
  {
    type: 'contact-form',
    label: 'Contact Form',
    icon: '📧',
    category: 'realestate',
    defaultContent: { title: 'Contact Us', fields: ['name', 'email', 'phone', 'message'] },
  },
  {
    type: 'cta-banner',
    label: 'CTA Banner',
    icon: '📢',
    category: 'realestate',
    defaultContent: {
      headline: 'Ready to Find Your Dream Home?',
      subtext: 'Contact us today for a free consultation.',
      buttonText: 'Get Started',
      buttonUrl: '#',
    },
  },

  // Advanced
  {
    type: 'html',
    label: 'Custom HTML',
    icon: '</>',
    category: 'advanced',
    defaultContent: { html: '<div>Custom HTML content</div>' },
  },
  {
    type: 'embed',
    label: 'Embed Code',
    icon: '📋',
    category: 'advanced',
    defaultContent: { code: '' },
  },
];

export const WIDGET_CATEGORIES = [
  { id: 'layout', label: 'Layout' },
  { id: 'basic', label: 'Basic' },
  { id: 'content', label: 'Content' },
  { id: 'realestate', label: 'Real Estate' },
  { id: 'advanced', label: 'Advanced' },
] as const;
