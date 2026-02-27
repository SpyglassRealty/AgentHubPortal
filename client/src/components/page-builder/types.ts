// ── Page Builder Block Types ──────────────────────────────────────────────

export type BlockType =
  | 'heading'
  | 'text'
  | 'image'
  | 'button'
  | 'spacer'
  | 'divider'
  | 'html'
  | 'video'
  | 'columns'
  | 'hero'
  | 'cards'
  | 'testimonial'
  | 'cta'
  | 'image-gallery'
  | 'faq'
  | 'toc';

export interface BlockBase {
  id: string;
  type: BlockType;
  props: Record<string, any>;
  children?: BlockData[][];  // For columns: array of columns, each containing blocks
}

// ── Specific Block Props ──────────────────────────────────────────────

export interface HeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  alignment: 'left' | 'center' | 'right';
  color: string;
  anchorId?: string;
}

export interface TextProps {
  content: string;
  alignment: 'left' | 'center' | 'right';
}

export interface ImageProps {
  url: string;
  alt: string;
  width: string;
  alignment: 'left' | 'center' | 'right';
  link: string;
  loading?: 'lazy' | 'eager';
  srcset?: string;
}

export interface ButtonProps {
  text: string;
  url: string;
  style: 'primary' | 'secondary' | 'outline';
  size: 'sm' | 'md' | 'lg';
  alignment: 'left' | 'center' | 'right';
}

export interface SpacerProps {
  height: number;
}

export interface DividerProps {
  style: 'solid' | 'dashed' | 'dotted';
  color: string;
  width: string;
}

export interface HtmlProps {
  code: string;
}

export interface VideoProps {
  url: string;
  autoplay: boolean;
}

export interface ColumnsProps {
  columns: 2 | 3;
}

export interface HeroProps {
  heading: string;
  subtext: string;
  bgImage: string;
  ctaText: string;
  ctaUrl: string;
  ctaText2: string;
  ctaUrl2: string;
  overlay: boolean;
}

export interface CardItem {
  image: string;
  title: string;
  description: string;
  link: string;
}

export interface CardsProps {
  cards: CardItem[];
  columns: 2 | 3 | 4;
}

export interface TestimonialProps {
  quote: string;
  author: string;
  rating: number;
  avatar: string;
}

export interface CtaProps {
  heading: string;
  text: string;
  buttonText: string;
  buttonUrl: string;
  bgColor: string;
}

export interface GalleryImage {
  url: string;
  alt: string;
}

export interface ImageGalleryProps {
  images: GalleryImage[];
  columns: 2 | 3 | 4;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqProps {
  items: FaqItem[];
}

export interface TocHeading {
  text: string;
  level: 2 | 3;
  anchorId: string;
}

export interface TocProps {
  headings: TocHeading[];
}

// ── Union type ──────────────────────────────────────────────

export type BlockData = BlockBase;

// ── Widget Category ──────────────────────────────────────────

export type WidgetCategory = 'Layout' | 'Basic' | 'Media' | 'Content';

export interface WidgetDefinition {
  type: BlockType;
  label: string;
  icon: string;
  category: WidgetCategory;
  defaultProps: Record<string, any>;
}
