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
    type: 'community_hero',
    label: 'Community Hero',
    icon: '🏙️',
    category: 'Content',
    defaultProps: {
      image: '',
      heading: 'Welcome to [Community Name]',
      subheading: 'Discover the perfect place to call home',
      buttonText: 'Explore Available Homes',
      buttonUrl: '#listings',
      // Typography defaults
      headingFont: 'Inter',
      headingSize: 48,
      headingWeight: 'bold',
      subheadingFont: 'Inter',
      subheadingSize: 20,
      subheadingWeight: 'normal',
      buttonFont: 'Inter',
      buttonFontSize: 16,
      buttonFontWeight: 'medium',
      // Button style defaults
      buttonTextColor: '#ffffff',
      buttonBgColor: '#EF4923',
      buttonHoverTextColor: '#ffffff',
      buttonHoverBgColor: '#d63d1c',
      buttonRounded: true,
      // Overlay defaults
      gradientTopOpacity: 20,
      gradientBottomOpacity: 80,
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
  {
    type: 'idx-hero',
    label: 'IDX Hero',
    icon: '🏔️',
    category: 'Real Estate',
    defaultProps: {
      headline: "The Best Austin Real Estate Agents",
      subtitleStats: "700+ 5-Star Reviews  |  3,000+ Families Helped  |  #1 Independent Brokerage",
      subtitleTagline: "Helping You Unlock the Power of Homeownership",
      backgroundImage: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80",
      primaryCtaText: "Search Homes",
      primaryCtaLink: "/search",
      secondaryCtaText: "What's My Home Worth?",
      secondaryCtaLink: "/sell",
      searchPlaceholder: "Enter neighborhood, address, or ZIP code",
      trustBarItems: [
        "1,200+ Reviews",
        "2,500+ Homes Sold",
        "$2B+ in Volume",
        "#1 Independent Brokerage",
      ],
    },
  },
  {
    type: 'idx-stats',
    label: 'IDX Stats Bar',
    icon: '📊',
    category: 'Real Estate',
    defaultProps: {
      items: [
        { iconName: 'HomeIcon', value: '3,400+', label: 'For Sale' },
        { iconName: 'UserGroupIcon', value: '2,500+', label: 'Sold' },
        { iconName: 'MapPinIcon', value: '200+', label: 'Neighborhoods' },
        { iconName: 'CurrencyDollarIcon', value: '$2B+', label: 'Listings Sold' },
      ],
    },
  },
  {
    type: 'idx-cards',
    label: 'IDX What Brings You',
    icon: '🏠',
    category: 'Real Estate',
    defaultProps: {
      heading: "What brings you here?",
      cards: [
        {
          title: "Find Your Next Home",
          description: "Access exclusive listings and AI-powered search to find properties before they hit the MLS.",
          imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
          imageAlt: "Modern home interior",
          linkText: "See homes before they hit the market →",
          linkHref: "/buy",
        },
        {
          title: "Sell for More. Stress Less",
          description: "Our proven marketing strategy sells homes for 102% of asking price on average.",
          imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
          imageAlt: "Luxury home exterior",
          linkText: "Get your free home valuation →",
          linkHref: "/sell",
        },
      ],
    },
  },
  {
    type: 'idx-testimonials',
    label: 'IDX Testimonials',
    icon: '💬',
    category: 'Real Estate',
    defaultProps: {
      label: "Testimonials",
      heading: "What Are Our Past Customers Saying...",
      items: [
        {
          quote: "Working with John McCarthy from a seller's perspective has been amazing. He is sharp, ambitious and professional. The technical tools he made available gave us peace of mind including an app with the ability to give us showing times and feedback instantly.",
          agent: "John McCarthy Client",
          rating: 5,
        },
        {
          quote: "I've purchased 2 homes and land with Spyglass and have sold 1 home with them as well. We set the high comp for the area we sold in. We had multiple offers and the one that ended up winning was because of a follow-up call.",
          agent: "Lacey Miller",
          rating: 5,
        },
      ],
    },
  },
  {
    type: 'idx-reviews',
    label: 'IDX Reviews Count',
    icon: '⭐',
    category: 'Real Estate',
    defaultProps: {
      count: "1,200+",
      label: "5-Star Reviews",
      subtext: "Average rating 4.9 out of 5",
    },
  },
  {
    type: 'idx-neighborhoods',
    label: 'IDX Neighborhoods',
    icon: '🏘️',
    category: 'Real Estate',
    defaultProps: {
      heading: "Explore Austin's Top Neighborhoods",
      subheading: "Find your perfect community with our neighborhood guides",
      neighborhoods: [
        { name: "Downtown Austin", imageUrl: "https://images.unsplash.com/photo-1601925228316-f3f19d9f6d3d?w=400&q=80", link: "/neighborhoods/downtown-austin" },
        { name: "Mueller", imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=80", link: "/neighborhoods/mueller" },
        { name: "Circle C Ranch", imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80", link: "/neighborhoods/circle-c-ranch" },
        { name: "Westlake Hills", imageUrl: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&q=80", link: "/neighborhoods/westlake-hills" },
      ],
    },
  },
  {
    type: 'idx-cta-banner',
    label: 'IDX CTA Banner',
    icon: '📢',
    category: 'Real Estate',
    defaultProps: {
      heading: "The New Form of Realty is Here",
      subheading: "Experience the difference",
      description: "Join thousands of satisfied clients who've discovered a better way to buy and sell real estate.",
      primaryCtaText: "Get Started Today",
      primaryCtaUrl: "/contact",
      secondaryCtaText: "Learn More",
      secondaryCtaUrl: "/about",
      bgColor: "#1F2937",
    },
  },
  {
    type: 'idx-two-column',
    label: 'IDX Two Column',
    icon: '⬜⬜',
    category: 'Real Estate',
    defaultProps: {
      heading: "Your Homeownership Dream Starts Here",
      subheading: "Expert guidance every step of the way",
      description: "We believe homeownership should be accessible to everyone. Our team of experts will guide you through every step of the process, from finding your dream home to closing the deal.",
      imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      imageAlt: "Happy family in their new home",
      imagePosition: "right",
      ctaText: "Start Your Journey",
      ctaUrl: "/get-started",
    },
  },
  {
    type: 'idx-features',
    label: 'IDX Features List',
    icon: '✨',
    category: 'Real Estate',
    defaultProps: {
      heading: "The Spyglass Difference",
      subheading: "Why clients choose us over the competition",
      features: [
        { icon: "📱", title: "Tech-Enabled", description: "Cutting-edge tools for a seamless experience" },
        { icon: "🏆", title: "Award-Winning", description: "#1 Independent Brokerage in Austin" },
        { icon: "💰", title: "Best Value", description: "Save thousands with our innovative approach" },
        { icon: "🤝", title: "Personal Service", description: "Dedicated agent support from start to finish" },
      ],
      imageUrl: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      imageAlt: "Modern home interior showcasing Spyglass listings",
    },
  },

  // ── Core Pages ──────────────────────────────────
  {
    type: 'hero',
    label: 'Core Hero',
    icon: '🎯',
    category: 'Core Pages',
    defaultProps: {
      title: 'Welcome to Our Site',
      subtitle: 'Your success starts here',
      backgroundImage: 'https://images.unsplash.com/photo-1629538480890-17a87addd019',
      overlayOpacity: 0.4,
      height: '300px',
    },
  },
  {
    type: 'core-split',
    label: 'Core Split Section',
    icon: '📐',
    category: 'Core Pages',
    defaultProps: {
      imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa',
      videoUrl: '',
      heading: 'Section Heading',
      content: '<p>Your content goes here. Describe your services, features, or tell your story.</p>',
      primaryButtonText: 'Get Started',
      primaryButtonUrl: '#',
      secondaryButtonText: 'Learn More',
      secondaryButtonUrl: '#',
      reverse: false,
      background: 'white',
    },
  },
  {
    type: 'core-split-left',
    label: 'Core Split (Media Left)',
    icon: '📐⬅️',
    category: 'Core Pages',
    defaultProps: {
      imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa',
      videoUrl: '',
      heading: 'Section Heading',
      content: '<p>Your content goes here. Describe your services, features, or tell your story.</p>',
      primaryButtonText: 'Get Started',
      primaryButtonUrl: '#',
      secondaryButtonText: 'Learn More',
      secondaryButtonUrl: '#',
      background: 'white',
    },
  },
  {
    type: 'core-split-right',
    label: 'Core Split (Media Right)',
    icon: '➡️📐',
    category: 'Core Pages',
    defaultProps: {
      imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa',
      videoUrl: '',
      heading: 'Section Heading',
      content: '<p>Your content goes here. Describe your services, features, or tell your story.</p>',
      primaryButtonText: 'Get Started',
      primaryButtonUrl: '#',
      secondaryButtonText: 'Learn More',
      secondaryButtonUrl: '#',
      background: 'white',
    },
  },
  {
    type: 'idx-two-column',
    label: 'IDX Two Column',
    icon: '⬜⬜',
    category: 'Real Estate',
    defaultProps: {
      imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa',
      heading: "Your Homeownership Dream Starts Here",
      content: '<p>Your content goes here. Describe your services, features, or tell your story.</p>',
      primaryButtonText: 'Get Started',
      primaryButtonUrl: '#',
      secondaryButtonText: 'Learn More',
      secondaryButtonUrl: '#',
      reverse: false,
      background: 'white',
    },
  },
  {
    type: 'cards',
    label: 'Core Cards Grid',
    icon: '🎴',
    category: 'Core Pages',
    defaultProps: {
      heading: 'Our Services',
      cards: [
        { title: 'Service One', description: 'Description of your first service or feature.', linkText: 'Learn More', linkUrl: '#' },
        { title: 'Service Two', description: 'Description of your second service or feature.', linkText: 'Learn More', linkUrl: '#' },
        { title: 'Service Three', description: 'Description of your third service or feature.', linkText: 'Learn More', linkUrl: '#' },
      ],
      columns: 3,
      background: 'white',
    },
  },
  {
    type: 'testimonial',
    label: 'Core Testimonials',
    icon: '⭐',
    category: 'Core Pages',
    defaultProps: {
      heading: 'What Our Clients Say',
      testimonials: [
        { quote: 'Excellent service! Highly recommend.', author: 'Jane Doe', rating: 5 },
        { quote: 'Professional and responsive team.', author: 'John Smith', rating: 5 },
        { quote: 'Made the process easy and stress-free.', author: 'Sarah Johnson', rating: 5 },
      ],
      background: 'light',
    },
  },
  {
    type: 'text',
    label: 'Core Text Section',
    icon: '📄',
    category: 'Core Pages',
    defaultProps: {
      heading: 'About Us',
      content: '<p>Add your content here. This section is perfect for introductory text, descriptions, or any content that needs emphasis.</p>',
      textAlign: 'center',
      maxWidth: '800px',
      background: 'white',
    },
  },
];

export const widgetCategories: WidgetCategory[] = ['Layout', 'Basic', 'Media', 'Content', 'Real Estate', 'Core Pages'];

export function getWidgetsByCategory(category: WidgetCategory): WidgetDefinition[] {
  return blockRegistry.filter(w => w.category === category);
}

export function getWidgetDefinition(type: string): WidgetDefinition | undefined {
  return blockRegistry.find(w => w.type === type);
}
