// Default homepage section content — matches the redesigned Spyglass IDX homepage

export const SITE_CONTENT_DEFAULTS: Record<string, any> = {
  hero: {
    headline: "Your Home. Our Obsession.",
    subtitleStats: "1,200+ 5-star reviews  |  2,500+ Homes Sold  |  $2B+ in Volume  |  #1 Independent Brokerage",
    subtitleTagline: "Austin's premier real estate brokerage",
    backgroundImage: "/images/austin-skyline-hero.jpg",
    backgroundImageFallback: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80",
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

  stats: {
    items: [
      { iconName: "HomeIcon", value: "3,400+", label: "For Sale" },
      { iconName: "UserGroupIcon", value: "2,500+", label: "Sold" },
      { iconName: "MapPinIcon", value: "200+", label: "Neighborhoods" },
      { iconName: "CurrencyDollarIcon", value: "$2B+", label: "Listings Sold" },
    ],
  },

  whatBringsYou: {
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

  spyglassDifference: {
    heading: "The Spyglass Difference",
    subtitle: "What sets us apart from every other brokerage in Austin",
    items: [
      {
        stat: "$50K+",
        statLabel: "More per sale on average",
        title: "We don't just list it. We launch it.",
        description: "Professional photography, staging, and advanced marketing drive results. Our listings get unmatched exposure.",
      },
      {
        stat: "102%",
        statLabel: "Average sale-to-list ratio",
        title: "Your bottom line is our obsession.",
        description: "Data-driven pricing and expert negotiation ensures exceptional results for every client.",
      },
      {
        stat: "23",
        statLabel: "Days less on market",
        title: "Boutique service. Big results.",
        description: "Highly trained agents with personalized attention means you get the experience you deserve.",
      },
    ],
  },

  featuredListings: {
    heading: "Featured Listings",
    viewAllText: "View All Listings →",
    viewAllLink: "/featured-listings",
  },

  testimonials: {
    label: "Testimonials",
    heading: "What Are Our Past Customers Saying...",
    items: [
      {
        quote: "Spyglass Realty exceeded our expectations in every way. They sold our home in just 8 days above asking price and helped us find our dream home. Their market knowledge and negotiation skills are unmatched.",
        agent: "Agent Tom",
        rating: 5,
      },
      {
        quote: "Working with Spyglass was the best decision we made. They were professional, responsive, and truly cared about finding us the right home. The whole process was seamless and stress-free.",
        agent: "Agent Sarah",
        rating: 5,
      },
      {
        quote: "I've bought and sold several homes over the years, and Spyglass is by far the best real estate team I've worked with. Their attention to detail and market expertise made all the difference.",
        agent: "Agent Mike",
        rating: 5,
      },
    ],
  },

  neighborhoods: {
    heading: "Austin Neighborhoods",
    subtitle: "Explore the communities that make Austin one of the best places to live",
    items: [
      { name: "South Congress", slug: "south-congress", image: "https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=400" },
      { name: "Downtown", slug: "downtown", image: "https://images.unsplash.com/photo-1570636614075-3009b1b5e25f?w=400" },
      { name: "Westlake", slug: "westlake-hills", image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400" },
      { name: "Mueller", slug: "mueller", image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400" },
      { name: "East Austin", slug: "east-austin", image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400" },
      { name: "Circle C Ranch", slug: "circle-c-ranch", image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400" },
    ],
    exploreAllText: "Explore All Neighborhoods",
    exploreAllLink: "/communities",
  },

  newForm: {
    heading: "Ready to make your move?",
    description: "Connect with Austin's most trusted real estate experts. We're here to help you navigate the Austin market with confidence — whether you're buying, selling, or just exploring your options.",
    buttonText: "Get Started",
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
