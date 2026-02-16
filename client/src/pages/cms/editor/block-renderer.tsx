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
      ? "text-3xl"
      : level === "h3"
      ? "text-xl"
      : level === "h4"
      ? "text-lg"
      : "text-2xl";

  const text = content.text || "Heading";

  if (level === "h1") return <h1 className={`${sizeClass} font-bold`}>{text}</h1>;
  if (level === "h3") return <h3 className={`${sizeClass} font-bold`}>{text}</h3>;
  if (level === "h4") return <h4 className={`${sizeClass} font-bold`}>{text}</h4>;
  return <h2 className={`${sizeClass} font-bold`}>{text}</h2>;
}

function TextBlock({ content }: { content: Record<string, any> }) {
  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap">
      {content.text || "Start typing..."}
    </p>
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
