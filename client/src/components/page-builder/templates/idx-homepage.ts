import { nanoid } from 'nanoid';
import type { BlockData } from '../types';

export const idxHomepageTemplate: BlockData[] = [
  // IDX Hero Section
  {
    id: nanoid(),
    type: 'idx-hero',
    props: {
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

  // Stats Bar
  {
    id: nanoid(),
    type: 'idx-stats',
    props: {
      items: [
        { iconName: 'HomeIcon', value: '3,400+', label: 'For Sale' },
        { iconName: 'UserGroupIcon', value: '2,500+', label: 'Sold' },
        { iconName: 'MapPinIcon', value: '200+', label: 'Neighborhoods' },
        { iconName: 'CurrencyDollarIcon', value: '$2B+', label: 'Listings Sold' },
      ],
    },
  },

  // What Brings You Section
  {
    id: nanoid(),
    type: 'idx-cards',
    props: {
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

  // Homeownership Dream Section (Two Column)
  {
    id: nanoid(),
    type: 'idx-two-column',
    props: {
      heading: "Your Homeownership Dream Starts Here",
      subheading: "Expert guidance every step of the way",
      description: "We believe homeownership should be accessible to everyone. Our team of experts will guide you through every step of the process, from finding your dream home to closing the deal. With cutting-edge technology and personalized service, we make your journey smooth and stress-free.",
      imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      imageAlt: "Happy family in their new home",
      imagePosition: "left",
      ctaText: "Start Your Journey",
      ctaUrl: "/get-started",
    },
  },

  // Spyglass Difference Section (Features)
  {
    id: nanoid(),
    type: 'idx-features',
    props: {
      heading: "The Spyglass Difference",
      subheading: "Why clients choose us over the competition",
      features: [
        { 
          icon: "📱", 
          title: "Tech-Enabled Experience", 
          description: "Cutting-edge tools and AI-powered search for a seamless home buying journey" 
        },
        { 
          icon: "🏆", 
          title: "Award-Winning Service", 
          description: "#1 Independent Brokerage in Austin with over 700 5-star reviews" 
        },
        { 
          icon: "💰", 
          title: "Best Value Guaranteed", 
          description: "Save thousands with our innovative approach and transparent pricing" 
        },
        { 
          icon: "🤝", 
          title: "Personal Touch", 
          description: "Dedicated agent support from your first showing to closing day" 
        },
      ],
      imageUrl: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      imageAlt: "Modern home interior showcasing Spyglass listings",
    },
  },

  // Testimonials Section
  {
    id: nanoid(),
    type: 'idx-testimonials',
    props: {
      label: "Testimonials",
      heading: "What Are Our Past Customers Saying...",
      items: [
        {
          quote: "Working with John McCarthy from a seller's perspective has been amazing. He is sharp, ambitious and professional. The technical tools he made available gave us peace of mind including an app with the ability to give us showing times and feedback instantly. Complete accountability at every step; we joked that he was setting the bar very high!",
          agent: "John McCarthy Client",
          rating: 5,
        },
        {
          quote: "I've purchased 2 homes and land with Spyglass and have sold 1 home with them as well. We set the high comp for the area we sold in. We had multiple offers and the one that ended up winning was because of a follow-up call since they expressed they really liked the house, but didn't make an offer. That follow-up call got us the best offer.",
          agent: "Lacey Miller",
          rating: 5,
        },
        {
          quote: "They were well organized, professional and very focused on a successful outcome. The photos and video, inclusive of aerial views, were incredible and in correlation with the rest of the marketing package, resulted in a full price offer only 1 day after listing. The team was able to secure a record deal for our neighborhood in record time.",
          agent: "Heather Knudson",
          rating: 5,
        },
        {
          quote: "We have been working with Jennifer at Spyglass Realty for about a month now and are about to close on our first home. She has been patient, communicative, and on top of everything. She and Ryan were tactical and gave great suggestions with the offering process. They helped us make a compelling offer that ultimately got us our dream home despite not having the highest offer.",
          agent: "Joe Harvey",
          rating: 5,
        },
      ],
    },
  },

  // Reviews Count Section
  {
    id: nanoid(),
    type: 'idx-reviews',
    props: {
      count: "1,200+",
      label: "5-Star Reviews",
      subtext: "Average rating 4.9 out of 5",
    },
  },

  // Featured Listings Section (using existing idx-feed)
  {
    id: nanoid(),
    type: 'idx-feed',
    props: {
      communityId: null, // Will need to be set to a real community ID
      searchType: 'Residential',
      searchSubtype: '',
      sortOrder: 'DESC',
      sortField: 'ListDate',
      pageLimit: 8,
    },
  },

  // CTA Banner - New Form of Realty
  {
    id: nanoid(),
    type: 'idx-cta-banner',
    props: {
      heading: "The New Form of Realty is Here",
      subheading: "Experience the difference",
      description: "Join thousands of satisfied clients who've discovered a better way to buy and sell real estate. Our innovative approach combines cutting-edge technology with personalized service.",
      primaryCtaText: "Get Started Today",
      primaryCtaUrl: "/contact",
      secondaryCtaText: "Learn More",
      secondaryCtaUrl: "/about",
      bgColor: "#1F2937",
    },
  },

  // Neighborhoods Section
  {
    id: nanoid(),
    type: 'idx-neighborhoods',
    props: {
      heading: "Explore Austin's Top Neighborhoods",
      subheading: "Find your perfect community with our neighborhood guides",
      neighborhoods: [
        { 
          name: "Downtown Austin", 
          imageUrl: "https://images.unsplash.com/photo-1601925228316-f3f19d9f6d3d?w=400&q=80", 
          link: "/neighborhoods/downtown-austin" 
        },
        { 
          name: "Mueller", 
          imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=80", 
          link: "/neighborhoods/mueller" 
        },
        { 
          name: "Circle C Ranch", 
          imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80", 
          link: "/neighborhoods/circle-c-ranch" 
        },
        { 
          name: "Westlake Hills", 
          imageUrl: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&q=80", 
          link: "/neighborhoods/westlake-hills" 
        },
        { 
          name: "Zilker", 
          imageUrl: "https://images.unsplash.com/photo-1516156008625-3a9d6067fab5?w=400&q=80", 
          link: "/neighborhoods/zilker" 
        },
        { 
          name: "Hyde Park", 
          imageUrl: "https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=400&q=80", 
          link: "/neighborhoods/hyde-park" 
        },
        { 
          name: "Lakeway", 
          imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=80", 
          link: "/neighborhoods/lakeway" 
        },
        { 
          name: "Cedar Park", 
          imageUrl: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&q=80", 
          link: "/neighborhoods/cedar-park" 
        },
      ],
    },
  },
];