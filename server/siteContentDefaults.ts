// Default homepage section content — matches what's currently hardcoded in IDX components

export const SITE_CONTENT_DEFAULTS: Record<string, any> = {
  hero: {
    welcomeLabel: "Welcome to Spyglass Realty",
    headline: "Highly Reviewed, Trained, and Experienced",
    headlineHighlight: "Real Estate Agents",
    headlineSuffix: "in Austin",
    backgroundImage: "/images/austin-skyline-hero.jpg",
    backgroundImageFallback: "https://images.unsplash.com/photo-1531218150217-54595bc2b934?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80",
    ctaText: "GET A CONSULTATION",
    ctaLink: "/contact",
    searchPlaceholder: "Try: '3 bed house in Austin under $500k with a pool'",
    tabs: [
      { id: "buy", label: "Buy" },
      { id: "sell", label: "Sell" },
      { id: "rent", label: "Rent" },
    ],
  },

  stats: {
    items: [
      {
        value: "6x Times",
        description: "Volume of Average Agent",
        subtext: "We sell more homes than the typical agent",
      },
      {
        value: "3% Higher",
        description: "Sale Price",
        subtext: "On average compared to other agents",
      },
      {
        value: "23 Days Less",
        description: "Than Average Agent",
        subtext: "Faster time on market",
      },
    ],
  },

  awards: {
    heading: "Multiple Award Winning Real Estate Brokerage In Austin",
    badges: [
      {
        title: "LEADING",
        subtitle: "",
        label: "Leading Real Estate Companies",
        imageUrl: "",
      },
      {
        title: "Inc.",
        subtitle: "5000",
        label: "Fastest Growing Companies",
        imageUrl: "",
      },
      {
        title: "AUSTIN",
        subtitle: "BUSINESS JOURNAL",
        label: "Austin Business Journal",
        imageUrl: "",
      },
    ],
    reviews: [
      {
        rating: 5.0,
        platform: "Google Reviews",
        subtitle: "Based on 700+ reviews",
      },
      {
        rating: 5.0,
        platform: "Zillow Reviews",
        subtitle: "Premier Agent",
      },
      {
        rating: 5.0,
        platform: "Facebook Reviews",
        subtitle: "Verified Business",
      },
    ],
  },

  seller: {
    label: "I AM A SELLER",
    heading: "Are You Looking to Sell a Home in Austin?",
    paragraphs: [
      "Spyglass is a boutique of marketing excellence with expertise home selling experience throughout Austin. With over 6 times the volume of the average agent, we utilize advanced marketing strategies, professional photography, and comprehensive market analysis to get your home sold faster and for top dollar.",
      "Our proven track record shows homes sell 23 days faster than the average agent and for 3% higher sale prices. Let our award-winning team help you navigate the selling process with confidence.",
    ],
    imageUrl: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    imageAlt: "Professional handshake representing successful home sale",
    primaryButtonText: "Free Consultation",
    primaryButtonLink: "/contact",
    secondaryButtonText: "Read More",
    secondaryButtonLink: "/selling",
  },

  buyer: {
    label: "I AM A BUYER",
    heading: "Are You Looking to Buy a Home in Austin?",
    paragraphs: [
      "Our experienced buyers' agents understand the Austin market like no other. We provide comprehensive market analysis, neighborhood insights, and personalized service to help you find the perfect home.",
      "With our advanced AI-powered search technology and deep local expertise, we'll help you navigate Austin's competitive market and secure your dream home at the best possible price.",
    ],
    imageUrl: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    imageAlt: "Happy family in front of their new home",
    primaryButtonText: "Free Consultation",
    primaryButtonLink: "/contact",
    secondaryButtonText: "Read More",
    secondaryButtonLink: "/buying",
  },

  testimonials: {
    label: "Testimonials",
    heading: "What Are Our Past Customers Saying...",
    items: [
      {
        quote: "Spyglass Realty exceeded our expectations in every way. They sold our home in just 8 days above asking price and helped us find our dream home. Their market knowledge and negotiation skills are unmatched.",
        author: "Agent Tom",
        rating: 5,
      },
      {
        quote: "Working with Spyglass was the best decision we made. They were professional, responsive, and truly cared about finding us the right home. The whole process was seamless and stress-free.",
        author: "Agent Sarah",
        rating: 5,
      },
      {
        quote: "I've bought and sold several homes over the years, and Spyglass is by far the best real estate team I've worked with. Their attention to detail and market expertise made all the difference.",
        author: "Agent Mike",
        rating: 5,
      },
    ],
  },

  reviews: {
    starCount: 5,
    heading: "Over 700 5-Star Reviews",
    paragraphs: [
      "Our clients consistently rate us 5 stars across all platforms. We're proud of our reputation for exceptional service, market expertise, and results that exceed expectations.",
      "From first-time homebuyers to luxury property investors, our clients trust us to deliver outstanding results. Read what they have to say about their experience working with Spyglass Realty.",
    ],
    imageUrl: "https://images.unsplash.com/photo-1521791136064-7986c2920216?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    imageAlt: "Professional handshake representing successful partnership",
    floatingReview: {
      text: "Absolutely amazing experience! They went above and beyond...",
      author: "Sarah M.",
    },
    buttonText: "Read More",
    buttonLink: "/reviews",
  },

  whyChoose: {
    label: "Why Choose Spyglass?",
    heading: "Helping You Unlock the Power of Homeownership",
    paragraphs: [
      "At Spyglass Realty, we believe homeownership is more than just a transaction—it's about finding your place in the world. Our award-winning team combines cutting-edge technology with personalized service to make your real estate journey seamless.",
      "Whether you're buying your first home or selling your tenth, we're here to guide you every step of the way with expertise, integrity, and results that speak for themselves.",
    ],
    buttonText: "Find Out More",
    buttonLink: "/about",
  },

  threeReasons: {
    heading: "Three Reasons to Work With Us",
    subtext: "Discover what sets Spyglass Realty apart from other real estate brokerages in Austin.",
    cards: [
      {
        iconName: "ChartBarIcon",
        title: "Proven Results",
        description: "Our track record speaks for itself—6x the volume of average agents, 3% higher sale prices, and 23 days faster closings. We deliver results that matter.",
      },
      {
        iconName: "UsersIcon",
        title: "Expert Team",
        description: "Our highly trained and experienced agents know Austin inside and out. With award-winning service and deep local expertise, we're your trusted advisors.",
      },
      {
        iconName: "HomeIcon",
        title: "Cutting-Edge Technology",
        description: "From AI-powered search to advanced marketing strategies, we use the latest technology to give you a competitive advantage in today's market.",
      },
    ],
  },

  newForm: {
    heading: "We are a New Form of Realty",
    paragraphs: [
      "Spyglass Realty represents the evolution of real estate services. We combine traditional expertise with innovative technology to create a seamless, modern experience that puts our clients first.",
      "Our approach is built on transparency, efficiency, and results. We're not just keeping up with the changing real estate landscape—we're leading it.",
      "Experience the difference that a forward-thinking, client-focused real estate brokerage can make in your property journey.",
    ],
    buttonText: "Find Out More",
    buttonLink: "/about",
  },

  youtube: {
    heading: "See Our Latest Videos on our YouTube Channel",
    subtext: "Stay informed with market updates, home buying tips, and exclusive property tours.",
    channelUrl: "https://www.youtube.com/@spyglassrealty",
    buttonText: "See All",
    videos: [
      {
        title: "Austin Market Update - February 2024",
        description: "Latest trends and insights in the Austin real estate market",
        thumbnailUrl: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        videoUrl: "",
        featured: true,
      },
      {
        title: "First-Time Buyer Tips",
        description: "",
        thumbnailUrl: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
        videoUrl: "",
        featured: false,
      },
      {
        title: "Home Staging Tips",
        description: "",
        thumbnailUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
        videoUrl: "",
        featured: false,
      },
    ],
  },

  cta: {
    heading: "Take The First Step to Your Real Estate Journey",
    subtext: "Ready to buy or sell? Our expert team is here to guide you through every step of the process. Schedule your free consultation today.",
    buttonText: "Start Now",
    buttonLink: "/contact",
  },

  footer: {
    address: "2025 Guadalupe Street",
    city: "Austin, TX 78705",
    phone: "737-727-4889",
    socialLinks: {
      facebook: "https://facebook.com/spyglassrealty",
      twitter: "https://twitter.com/spyglassrealty",
      instagram: "https://instagram.com/spyglassrealty",
      linkedin: "https://linkedin.com/company/spyglass-realty",
      youtube: "https://youtube.com/@spyglassrealty",
    },
    columns: [
      {
        title: "Featured",
        links: [
          { label: "Featured Listings", href: "/" },
          { label: "Newsroom", href: "/newsroom" },
          { label: "Blog", href: "/blog" },
          { label: "Mortgage Calculator", href: "/mortgage" },
        ],
      },
      {
        title: "Communities",
        links: [
          { label: "Barton Hills", href: "/communities/barton-hills" },
          { label: "Travis Heights", href: "/communities/travis-heights" },
          { label: "Zilker", href: "/communities/zilker" },
          { label: "South Lamar", href: "/communities/south-lamar" },
          { label: "Downtown", href: "/communities/downtown" },
          { label: "All Communities", href: "/communities" },
        ],
      },
      {
        title: "Navigation",
        links: [
          { label: "Buying", href: "/buying" },
          { label: "Selling", href: "/selling" },
          { label: "Search", href: "/" },
          { label: "About Us", href: "/about" },
          { label: "Our Team", href: "/agents" },
          { label: "Contact", href: "/contact" },
        ],
      },
    ],
  },
};

// All valid section keys
export const VALID_SECTIONS = Object.keys(SITE_CONTENT_DEFAULTS);
