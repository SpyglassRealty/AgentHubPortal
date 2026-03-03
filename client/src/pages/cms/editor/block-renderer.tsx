import { useQuery } from "@tanstack/react-query";
import type { CmsBlock } from "../types";

interface BlockRendererProps {
  block: CmsBlock;
}

export function BlockRenderer({ block }: BlockRendererProps) {
  switch (block.type) {
    case "heading":
      return <HeadingBlock content={block.content} />;
    case "text":
      return <TextBlock content={block.content} />;
    case "image":
      return <ImageBlock content={block.content} />;
    case "button":
      return <ButtonBlock content={block.content} />;
    case "link":
      return <LinkBlock content={block.content} />;
    case "spacer":
      return <SpacerBlock content={block.content} />;
    case "divider":
      return <DividerBlock content={block.content} />;
    case "gallery":
      return <GalleryBlock content={block.content} />;
    case "video":
      return <VideoBlock content={block.content} />;
    case "testimonial":
      return <TestimonialBlock content={block.content} />;
    case "faq":
      return <FaqBlock content={block.content} />;
    case "iconbox":
      return <IconBoxBlock content={block.content} />;
    case "listing-card":
      return <ListingCardBlock content={block.content} />;
    case "agent-card":
      return <AgentCardBlock content={block.content} />;
    case "community-map":
      return <CommunityMapBlock content={block.content} />;
    case "contact-form":
      return <ContactFormBlock content={block.content} />;
    case "idx-feed":
      return <IdxFeedBlock content={block.content} />;
    case "cta-banner":
      return <CtaBannerBlock content={block.content} />;
    case "html":
      return <HtmlBlock content={block.content} />;
    case "embed":
      return <EmbedBlock content={block.content} />;
    default:
      return (
        <div className="p-3 bg-muted rounded text-sm text-muted-foreground">
          Unknown block type: {block.type}
        </div>
      );
  }
}

function HeadingBlock({ content }: { content: Record<string, any> }) {
  const level = content.level || "h2";
  const sizeClass =
    level === "h1"
      ? "text-4xl"
      : level === "h2"
      ? "text-3xl"
      : level === "h3"
      ? "text-2xl"
      : level === "h4"
      ? "text-xl"
      : level === "h5"
      ? "text-lg"
      : "text-base";

  const text = content.text || "Heading";
  const className = `${sizeClass} font-bold`;

  if (level === "h1") return <h1 className={className}>{text}</h1>;
  if (level === "h2") return <h2 className={className}>{text}</h2>;
  if (level === "h3") return <h3 className={className}>{text}</h3>;
  if (level === "h4") return <h4 className={className}>{text}</h4>;
  if (level === "h5") return <h5 className={className}>{text}</h5>;
  if (level === "h6") return <h6 className={className}>{text}</h6>;
  return <h2 className={className}>{text}</h2>;
}

function TextBlock({ content }: { content: Record<string, any> }) {
  // Support both rich text (HTML) and plain text for backward compatibility
  const htmlContent = content.html || content.text || "Start typing...";
  
  // If it's plain text, wrap in paragraph
  const isPlainText = htmlContent === content.text && !content.html;
  
  if (isPlainText) {
    return (
      <p className="text-sm leading-relaxed whitespace-pre-wrap">
        {htmlContent}
      </p>
    );
  }
  
  return (
    <div 
      className="prose prose-sm max-w-none leading-relaxed"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}

function ImageBlock({ content }: { content: Record<string, any> }) {
  if (!content.src) {
    return (
      <div className="flex items-center justify-center h-32 bg-muted rounded-lg border-2 border-dashed">
        <div className="text-center text-muted-foreground">
          <span className="text-2xl block mb-1">🖼</span>
          <span className="text-xs">Add image URL in properties</span>
        </div>
      </div>
    );
  }
  return (
    <figure>
      <img
        src={content.src}
        alt={content.alt || ""}
        className="max-w-full rounded-lg"
      />
      {content.caption && (
        <figcaption className="text-xs text-muted-foreground mt-1 text-center">
          {content.caption}
        </figcaption>
      )}
    </figure>
  );
}

function ButtonBlock({ content }: { content: Record<string, any> }) {
  const variants: Record<string, string> = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border border-input bg-background hover:bg-accent",
    ghost: "hover:bg-accent hover:text-accent-foreground",
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2 cursor-pointer ${
        variants[content.variant || "primary"] || variants.primary
      }`}
    >
      {content.text || "Button"}
    </span>
  );
}

function LinkBlock({ content }: { content: Record<string, any> }) {
  return (
    <span className="text-primary underline text-sm cursor-pointer">
      {content.text || "Link"}
    </span>
  );
}

function SpacerBlock({ content }: { content: Record<string, any> }) {
  return (
    <div
      style={{ height: content.height || "40px" }}
      className="bg-muted/30 rounded border border-dashed border-muted-foreground/20 flex items-center justify-center"
    >
      <span className="text-[10px] text-muted-foreground">Spacer ({content.height || "40px"})</span>
    </div>
  );
}

function DividerBlock({ content }: { content: Record<string, any> }) {
  return (
    <hr
      className="border-t"
      style={{
        borderStyle: content.style || "solid",
        width: content.width || "100%",
      }}
    />
  );
}

function GalleryBlock({ content }: { content: Record<string, any> }) {
  const images = content.images || [];
  const cols = content.columns || 3;

  if (images.length === 0) {
    return (
      <div className="p-6 bg-muted rounded-lg border-2 border-dashed text-center text-muted-foreground">
        <span className="text-2xl block mb-1">🖼️</span>
        <span className="text-xs">Image Gallery — Add images in properties</span>
      </div>
    );
  }

  return (
    <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {images.map((img: string, i: number) => (
        <img key={i} src={img} alt="" className="rounded-md w-full h-32 object-cover" />
      ))}
    </div>
  );
}

function VideoBlock({ content }: { content: Record<string, any> }) {
  if (!content.url) {
    return (
      <div className="p-6 bg-muted rounded-lg border-2 border-dashed text-center text-muted-foreground">
        <span className="text-2xl block mb-1">▶</span>
        <span className="text-xs">Video Embed — Add URL in properties</span>
      </div>
    );
  }

  // Extract YouTube/Vimeo embed URL
  let embedUrl = content.url;
  const ytMatch = content.url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/
  );
  if (ytMatch) {
    embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
  }
  const vimeoMatch = content.url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return (
    <div className="aspect-video rounded-lg overflow-hidden bg-black">
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allowFullScreen
        title="Video"
      />
    </div>
  );
}

function TestimonialBlock({ content }: { content: Record<string, any> }) {
  return (
    <div className="bg-muted/50 rounded-xl p-6 border">
      <div className="text-2xl mb-2">💬</div>
      <blockquote className="text-sm italic mb-3">
        "{content.quote || "Great service!"}"
      </blockquote>
      <div className="flex items-center gap-3">
        {content.avatar && (
          <img src={content.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
        )}
        <div>
          <p className="font-semibold text-sm">{content.author || "John Doe"}</p>
          {content.role && (
            <p className="text-xs text-muted-foreground">{content.role}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function FaqBlock({ content }: { content: Record<string, any> }) {
  const items = content.items || [];
  return (
    <div className="space-y-2">
      {items.map((item: { question: string; answer: string }, i: number) => (
        <div key={i} className="border rounded-lg p-3">
          <p className="font-semibold text-sm">{item.question}</p>
          <p className="text-xs text-muted-foreground mt-1">{item.answer}</p>
        </div>
      ))}
      {items.length === 0 && (
        <div className="text-sm text-muted-foreground">No FAQ items yet</div>
      )}
    </div>
  );
}

function IconBoxBlock({ content }: { content: Record<string, any> }) {
  return (
    <div className="text-center p-4">
      <div className="text-3xl mb-2">{content.icon || "⭐"}</div>
      <h4 className="font-semibold text-sm">{content.title || "Feature"}</h4>
      <p className="text-xs text-muted-foreground mt-1">
        {content.description || "Description"}
      </p>
    </div>
  );
}

function ListingCardBlock({ content }: { content: Record<string, any> }) {
  return (
    <div className="border rounded-xl overflow-hidden shadow-sm">
      {content.image ? (
        <img src={content.image} alt="" className="w-full h-40 object-cover" />
      ) : (
        <div className="w-full h-40 bg-muted flex items-center justify-center">
          <span className="text-2xl">🏠</span>
        </div>
      )}
      <div className="p-4">
        <p className="font-bold text-lg">{content.price || "$450,000"}</p>
        <p className="text-sm text-muted-foreground">{content.address || "123 Main St"}</p>
        <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
          <span>{content.beds || 3} Beds</span>
          <span>{content.baths || 2} Baths</span>
          <span>{content.sqft || "1,500"} sqft</span>
        </div>
      </div>
    </div>
  );
}

function AgentCardBlock({ content }: { content: Record<string, any> }) {
  return (
    <div className="border rounded-xl p-6 text-center shadow-sm">
      {content.photo ? (
        <img src={content.photo} alt="" className="h-20 w-20 rounded-full mx-auto object-cover mb-3" />
      ) : (
        <div className="h-20 w-20 rounded-full mx-auto mb-3 bg-muted flex items-center justify-center">
          <span className="text-2xl">👤</span>
        </div>
      )}
      <h4 className="font-bold">{content.name || "Agent Name"}</h4>
      <p className="text-sm text-muted-foreground">{content.title || "Realtor"}</p>
      {content.phone && <p className="text-xs mt-1">{content.phone}</p>}
      {content.email && <p className="text-xs text-primary">{content.email}</p>}
    </div>
  );
}

function CommunityMapBlock({ content }: { content: Record<string, any> }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="h-48 bg-muted flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <span className="text-3xl block mb-1">🗺</span>
          <p className="text-sm font-medium">{content.title || "Community Map"}</p>
          <p className="text-xs">Map will render on published page</p>
        </div>
      </div>
    </div>
  );
}

function ContactFormBlock({ content }: { content: Record<string, any> }) {
  const fields = content.fields || ["name", "email", "phone", "message"];
  return (
    <div className="border rounded-xl p-6">
      <h3 className="font-bold text-lg mb-4">{content.title || "Contact Us"}</h3>
      <div className="space-y-3">
        {fields.map((field: string) => (
          <div key={field}>
            <label className="text-xs font-medium capitalize text-muted-foreground">
              {field}
            </label>
            {field === "message" ? (
              <div className="mt-1 h-16 bg-muted rounded-md border" />
            ) : (
              <div className="mt-1 h-9 bg-muted rounded-md border" />
            )}
          </div>
        ))}
        <div className="pt-2">
          <span className="inline-block bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium">
            Submit
          </span>
        </div>
      </div>
    </div>
  );
}

function CtaBannerBlock({ content }: { content: Record<string, any> }) {
  return (
    <div className="bg-gradient-to-r from-primary/90 to-primary text-primary-foreground rounded-xl p-8 text-center">
      <h3 className="text-2xl font-bold mb-2">
        {content.headline || "Ready to Find Your Dream Home?"}
      </h3>
      <p className="text-sm opacity-90 mb-4">
        {content.subtext || "Contact us today for a free consultation."}
      </p>
      <span className="inline-block bg-white text-primary rounded-md px-6 py-2.5 font-semibold text-sm cursor-pointer">
        {content.buttonText || "Get Started"}
      </span>
    </div>
  );
}

function HtmlBlock({ content }: { content: Record<string, any> }) {
  return (
    <div className="border rounded-lg p-3 bg-muted/30">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">HTML</span>
      </div>
      <pre className="text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap max-h-32">
        {content.html || "<div>Custom HTML</div>"}
      </pre>
    </div>
  );
}

interface IdxListing {
  mlsNumber: string;
  listPrice: number;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  photo: string | null;
  photos: string[];
  status: string;
  daysOnMarket: number;
  yearBuilt: number | null;
  propertyType: string;
  listDate: string | null;
}

function IdxFeedBlock({ content }: { content: Record<string, any> }) {
  const communityId = content.communityId;
  const limit = content.pageLimit || 12;
  const sortField = content.sortField || "ListingPrice";
  const sortOrder = content.sortOrder || "DESC";

  // Map sort fields to Repliers sortBy format
  const sortByMap: Record<string, string> = {
    ListingPrice: sortOrder === "ASC" ? "listPriceAsc" : "listPriceDesc",
    ListDate: sortOrder === "ASC" ? "createdOnAsc" : "createdOnDesc",
    DaysOnMarket: sortOrder === "ASC" ? "daysOnMarketAsc" : "daysOnMarketDesc",
  };
  const sort = sortByMap[sortField] || "createdOnDesc";

  // Fetch communities for the name display
  const { data: communities } = useQuery<Array<{ id: number; name: string }>>({
    queryKey: ["/api/admin/communities/with-polygons"],
    queryFn: async () => {
      const res = await fetch("/api/admin/communities/with-polygons", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60000,
  });

  const communityName = communityId
    ? communities?.find((c) => c.id === communityId)?.name || `Community #${communityId}`
    : "All Communities";

  // Fetch real listings from Repliers via polygon
  const { data: listingsData, isLoading: listingsLoading, error: listingsError } = useQuery<{
    listings: IdxListing[];
    count: number;
    communityName: string;
  }>({
    queryKey: ["/api/listings/by-polygon", communityId, sort, limit],
    queryFn: async () => {
      if (!communityId) return { listings: [], count: 0, communityName: "" };
      const params = new URLSearchParams({
        communityId: communityId.toString(),
        sort,
        limit: limit.toString(),
        class: (content.searchType || "residential").toLowerCase(),
      });
      const res = await fetch(`/api/listings/by-polygon?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to fetch listings");
      }
      return res.json();
    },
    enabled: !!communityId,
    staleTime: 300000, // 5 min cache
  });

  const listings = listingsData?.listings || [];

  // If no community selected, show config preview
  if (!communityId) {
    return (
      <div className="border rounded-xl p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">🏘</span>
          <div>
            <h3 className="font-bold text-lg">IDX Listing Feed</h3>
            <p className="text-sm text-muted-foreground">
              Select a community in the properties panel to display live MLS listings
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-white rounded-lg p-3 border">
            <span className="text-muted-foreground text-xs">Search Type</span>
            <p className="font-medium">{content.searchType || "Residential"}</p>
          </div>
          <div className="bg-white rounded-lg p-3 border">
            <span className="text-muted-foreground text-xs">Sort</span>
            <p className="font-medium">
              {sortField} ({sortOrder})
            </p>
          </div>
        </div>
        {/* Placeholder skeleton cards */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border overflow-hidden">
              <div className="h-16 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                <span className="text-gray-400 text-sm">🏠</span>
              </div>
              <div className="p-2">
                <div className="h-2 bg-gray-200 rounded w-3/4 mb-1"></div>
                <div className="h-2 bg-gray-100 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-xl p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏘</span>
          <div>
            <h3 className="font-bold text-lg">Listings in {communityName}</h3>
            <p className="text-sm text-muted-foreground">
              {listingsLoading
                ? "Loading live MLS listings..."
                : listingsError
                ? "Error loading listings"
                : `${listingsData?.count || 0} active listings`}
            </p>
          </div>
        </div>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span className="bg-white rounded px-2 py-1 border">{content.searchType || "Residential"}</span>
          <span className="bg-white rounded px-2 py-1 border">{sortField} {sortOrder}</span>
        </div>
      </div>

      {/* Loading state */}
      {listingsLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: Math.min(limit, 6) }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border overflow-hidden animate-pulse">
              <div className="h-32 bg-gray-200" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {listingsError && !listingsLoading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-sm text-red-600">
            Could not load listings. The MLS API may be temporarily unavailable.
          </p>
        </div>
      )}

      {/* Listings grid */}
      {!listingsLoading && !listingsError && listings.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {listings.slice(0, limit).map((listing) => (
            <div key={listing.mlsNumber} className="bg-white rounded-lg border overflow-hidden hover:shadow-md transition-shadow">
              {listing.photo ? (
                <img
                  src={listing.photo}
                  alt={listing.address}
                  className="w-full h-32 object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-32 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                  <span className="text-2xl">🏠</span>
                </div>
              )}
              <div className="p-3">
                <p className="font-bold text-base">
                  ${listing.listPrice?.toLocaleString() || "N/A"}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {listing.address}
                </p>
                <p className="text-xs text-muted-foreground">
                  {listing.city}{listing.state ? `, ${listing.state}` : ""} {listing.postalCode}
                </p>
                <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                  {listing.bedrooms > 0 && <span>{listing.bedrooms} Beds</span>}
                  {listing.bathrooms > 0 && <span>{listing.bathrooms} Baths</span>}
                  {listing.sqft > 0 && <span>{listing.sqft.toLocaleString()} sqft</span>}
                </div>
                {listing.daysOnMarket > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {listing.daysOnMarket} days on market
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {!listingsLoading && !listingsError && listings.length === 0 && (
        <div className="bg-white rounded-lg border p-6 text-center">
          <span className="text-3xl block mb-2">🔍</span>
          <p className="text-sm text-muted-foreground">
            No active listings found in this community polygon.
          </p>
        </div>
      )}
    </div>
  );
}

function EmbedBlock({ content }: { content: Record<string, any> }) {
  if (!content.code) {
    return (
      <div className="p-6 bg-muted rounded-lg border-2 border-dashed text-center text-muted-foreground">
        <span className="text-2xl block mb-1">📋</span>
        <span className="text-xs">Embed Code — Add code in properties</span>
      </div>
    );
  }
  return (
    <div className="border rounded-lg p-3 bg-muted/30">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">Embed</span>
      </div>
      <pre className="text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap max-h-32">
        {content.code}
      </pre>
    </div>
  );
}
