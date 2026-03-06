/**
 * Example: How the Buyer Page HTML converts to Mission Control blocks
 */

// Input: The HTML from the Google Doc
const buyerPageHTML = `<!DOCTYPE html>
<html lang="en-US">
<head>
  <title>Buy a Home in Austin, TX with Local Realtors | Spyglass Realty</title>
  <meta name="description" content="Looking to buy a home in Austin? Our experienced realtors...">
  <!-- ... -->
</head>
<body>
  <section class="hero">
    <div class="hero__inner">
      <h1>Buy a Home in Austin with Trusted Local Experts</h1>
    </div>
  </section>
  <!-- ... rest of HTML ... -->
</body>
</html>`;

// Output: Converted to Mission Control page blocks
const convertedPage = {
  seo: {
    title: "Buy a Home in Austin, TX with Local Realtors | Spyglass Realty",
    description: "Looking to buy a home in Austin? Our experienced realtors at Spyglass Realty guide buyers through the competitive market. Start your home search today.",
    canonical: "https://www.spyglassrealty.com/buy-home-austin.php",
    ogImage: "/uploads/Spyglass_Realty_Team_Photo_2022.jpg"
  },
  
  blocks: [
    // Hero Section
    {
      type: "idx-hero",
      props: {
        headline: "Buy a Home in Austin with Trusted Local Experts",
        backgroundImage: "/uploads/406773042_781869253938024_4445688314460109621_n.jpg",
        overlay: true,
        overlayOpacity: 0.5,
        height: "medium",
        alignment: "left",
        showSearch: true
      }
    },
    
    // Intro Text Section
    {
      type: "text",
      props: {
        heading: "DISCOVER THE PERFECT HOME",
        content: `<p>Let's face it. Austin's competitive market and rapidly changing dynamics can make the search for the perfect home quite challenging. Our dedicated team of Austin realtors turn challenges into opportunities and will guide you through the process with expertise and personalized attention.</p>

<p>Whether you're a <a href="/blog/critical-tips-first-time-home-buyers-should-know.html"><strong>first-time buyer</strong></a>, <a href="/relocation-services.php"><strong>relocating with your family</strong></a>, or <strong>exploring the city solo</strong>, we offer a smooth and easy home-buying experience.</p>`,
        alignment: "center",
        backgroundColor: "light",
        maxWidth: "800px"
      }
    },
    
    // Video + Text Split
    {
      type: "idx-two-column",
      props: {
        leftColumn: {
          type: "video",
          url: "https://www.youtube.com/embed/50iN9Q7jtdk",
          alt: "Best Time of the Year to Buy in Austin"
        },
        rightColumn: {
          type: "content",
          heading: "Is It A Good Time to Buy a Home in Austin?",
          content: "<p>Explore the ideal timing for buying a home in Austin, Texas. Gain key insights into the current real estate market, including the booming job scene and vibrant culture that make Austin a prime destination.</p>",
          buttons: [
            {
              text: "SCHEDULE A CONSULTATION",
              link: "https://app.monstercampaigns.com/c/jldybn4wlckocttmgzab/",
              style: "primary",
              target: "_blank"
            },
            {
              text: "DISCOVER HOMES",
              link: "/idx",
              style: "secondary"
            }
          ]
        },
        gap: "large",
        verticalAlignment: "center"
      }
    },
    
    // Resource Cards
    {
      type: "idx-cards",
      props: {
        cards: [
          {
            image: "/uploads/agent-1/complimentary_buyer_guide.png",
            imageAlt: "Free Buyer's Guide",
            title: "Free Buyer's Guide",
            description: "Purchasing a home involves numerous essential steps that shouldn't be overlooked. Download our buyer's guide to learn the crucial actions to take when you're ready to embark on the journey of buying a house.",
            link: "https://app.monstercampaigns.com/c/rnfaammu6a4jemvukjxd/",
            linkText: "Learn More"
          },
          {
            image: "/uploads/agent-1/04 - Pages/buy a home/loan.png",
            imageAlt: "Mortgage Loan Types",
            title: "Mortgage Loan Types",
            description: "When you want to apply for a mortgage loan to purchase a home there are many options available depending on your needs…",
            link: "https://www.spyglassrealty.com/blog/mortgages-types.html",
            linkText: "Learn More"
          },
          {
            image: "/uploads/agent-1/faq.png",
            imageAlt: "Buyer FAQ",
            title: "Buyer FAQ",
            description: "Spyglass Realty's Buyer FAQ provides concise answers to common questions, guiding prospective homebuyers through the real estate process…",
            link: "/buyer-faq.php",
            linkText: "Learn More"
          }
        ],
        columns: 3,
        backgroundColor: "light"
      }
    },
    
    // Services Grid
    {
      type: "idx-features",
      props: {
        heading: "Full-Service Solution for Home Buyers Austin",
        features: [
          {
            title: "Service Oriented",
            description: "Our commitment extends beyond the transaction. We provide <a href=\"/blog/remodel-vs-renovation-which-is-right-for-your-home.html\">renovation and remodeling advice</a>, coordinating upgrades for our clients post-closing, completely free of charge.",
            icon: "check-circle"
          },
          {
            title: "Search Active Listings",
            description: "Access our <a href=\"/listings.php\">advanced search portal</a>, where you can collaborate with friends and family, explore new listings, and save your favorite properties.",
            icon: "search"
          },
          {
            title: "Experienced and Reliable",
            description: "With a track record of closing thousands of homes since 2008, our Austin realtors bring expertise and personalized service to every transaction.",
            icon: "award"
          },
          {
            title: "Up-to-Date Information",
            description: "We stay current with the latest real estate trends and market data, providing home buyers Austin with accurate information.",
            icon: "trending-up"
          },
          {
            title: "Listening to Your Needs",
            description: "We genuinely care about your preferences and requirements, creating a customized selection of listings that align with your expectations.",
            icon: "users"
          },
          {
            title: "Relocation Services",
            description: "Our global network of leading real estate companies empowers us to assist home buyers and sellers everywhere.",
            icon: "globe"
          }
        ],
        columns: 2,
        backgroundColor: "light"
      }
    },
    
    // Testimonials
    {
      type: "idx-testimonials",
      props: {
        heading: "What Our Clients Say",
        items: [
          {
            quote: "I had my property listed before and it did not get the results I wanted so I talked to Spyglass. I was really impressed with how they took everything from the beginning to the end, they helped stage the place, they helped contractors lined up, it was sort of a self contained holistic approach, and I was very pleased with the results.",
            author: "Barton Hills Seller",
            rating: 5,
            stars: true
          },
          {
            quote: "Our house was on the market for six months with another realtor, without any serious offers. We changed to Spyglass Realty, and Ryan and Sunny had us four offers within a few weeks. Their knowledge of the market and the staging was phenomenal.",
            author: "Fernando DaSilva",
            rating: 5,
            stars: true
          },
          // ... more testimonials
        ],
        columns: 2,
        backgroundColor: "dark",
        theme: "dark"
      }
    },
    
    // FAQ Section
    {
      type: "faq",
      props: {
        heading: "Frequently Asked Questions About Buying a Home in Austin",
        items: [
          {
            question: "How do I start the home buying process in Austin?",
            answer: "The first step is getting pre-approved for a mortgage to understand your budget. Our Austin realtors will then help you identify neighborhoods that match your lifestyle and price range, followed by scheduling home tours and making competitive offers in Austin's fast-moving market."
          },
          {
            question: "What should I expect when working with home buyers Austin agents?",
            answer: "Our agents provide personalized service from start to finish. We'll listen to your needs, send you listings that match your criteria, schedule tours, help you make competitive offers, and guide you through inspections and closing."
          },
          // ... more FAQ items
        ],
        expandable: true
      }
    }
  ],
  
  // Assets to download and re-host
  assets: [
    "/uploads/406773042_781869253938024_4445688314460109621_n.jpg",
    "/uploads/agent-1/complimentary_buyer_guide.png",
    "/uploads/agent-1/04 - Pages/buy a home/loan.png",
    "/uploads/agent-1/faq.png",
    "/uploads/agent-1/04 - Pages/buy a home/Texas_Map.png",
    "/uploads/agent-1/04 - Pages/buy a home/austin_relocation.png",
    "/uploads/agent-1/04 - Pages/buy a home/spyglass_realty_logo_shadow.png"
  ]
};

// Example usage in Mission Control
async function importBuyerPage() {
  const parser = new HTMLImportParser();
  const result = parser.parseHTML(buyerPageHTML);
  
  console.log('Parsed blocks:', result.blocks.length);
  console.log('Found assets:', result.assets.length);
  console.log('SEO title:', result.seo.title);
  
  // Create the page
  const newPage = await createPage({
    title: result.seo.title,
    slug: 'buy-home-austin',
    blocks: result.blocks,
    seo: result.seo,
    status: 'draft'
  });
  
  console.log('Page created:', newPage.id);
  return newPage;
}