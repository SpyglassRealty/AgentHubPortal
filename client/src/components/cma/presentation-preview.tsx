import { useMemo, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Maximize2,
  MapPin,
  Mail,
  Phone,
  User,
  Home,
  BedDouble,
  Bath,
  Ruler,
  Calendar,
  ImageIcon,
} from "lucide-react";
import type { PresentationSection } from "./presentation-sections";
import mapboxgl from "mapbox-gl";

const MAPBOX_TOKEN =
  "pk.eyJ1Ijoic3B5Z2xhc3NyZWFsdHkiLCJhIjoiY21sYmJjYjR5MG5teDNkb29oYnlldGJ6bCJ9.h6al6oHtIP5YiiIW97zhDw";

interface PropertyData {
  mlsNumber: string;
  address: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
  listPrice: number;
  soldPrice?: number | null;
  beds: number;
  baths: number;
  sqft: number;
  lotSizeAcres?: number | null;
  yearBuilt?: number | null;
  propertyType?: string;
  status: string;
  listDate?: string;
  soldDate?: string | null;
  daysOnMarket?: number;
  photo?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface CmaData {
  id?: string;
  name: string;
  subjectProperty: PropertyData | null;
  comparableProperties: PropertyData[];
  notes: string;
  status: string;
}

interface PreviewProps {
  sections: PresentationSection[];
  cma: CmaData;
  onFullscreen?: () => void;
}

function formatPrice(price: number | null | undefined): string {
  if (!price) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatNumber(num: number | null | undefined): string {
  if (!num) return "—";
  return new Intl.NumberFormat("en-US").format(num);
}

function statusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "active":
      return "bg-green-100 text-green-800";
    case "closed":
    case "sold":
      return "bg-blue-100 text-blue-800";
    case "active under contract":
    case "pending":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

// Individual section renderers

function CoverPageSection({ cma }: { cma: CmaData }) {
  const subject = cma.subjectProperty;
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border p-8 text-center space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-[#EF4923]">Spyglass Realty</h2>
        <div className="w-16 h-0.5 bg-[#EF4923] mx-auto" />
      </div>
      <div className="space-y-1">
        <h3 className="text-xl font-semibold text-gray-800">
          Comparative Market Analysis
        </h3>
        <p className="text-sm text-gray-500 italic">
          Prepared exclusively for you
        </p>
      </div>
      {subject && (
        <div className="space-y-1">
          <p className="text-lg font-medium text-gray-700">{subject.address}</p>
          {subject.city && (
            <p className="text-sm text-gray-500">
              {subject.city}
              {subject.state ? `, ${subject.state}` : ""}
              {subject.zip ? ` ${subject.zip}` : ""}
            </p>
          )}
        </div>
      )}
      <p className="text-sm text-gray-400">{today}</p>
    </div>
  );
}

function CoverLetterSection({ content }: { content?: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 space-y-3">
      <h4 className="text-lg font-semibold text-gray-800 border-b pb-2">
        Cover Letter
      </h4>
      {content ? (
        <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
          {content}
        </p>
      ) : (
        <p className="text-sm text-gray-400 italic">
          No cover letter content has been added yet. Switch to the Content tab
          to add a personalized message.
        </p>
      )}
    </div>
  );
}

function AgentResumeSection({ content }: { content?: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 space-y-3">
      <h4 className="text-lg font-semibold text-gray-800 border-b pb-2">
        Agent Resume
      </h4>
      {content ? (
        <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
          {content}
        </p>
      ) : (
        <p className="text-sm text-gray-400 italic">
          No agent resume content added yet. Switch to the Content tab to add
          your professional background.
        </p>
      )}
    </div>
  );
}

function ContactMeSection() {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 space-y-3">
      <h4 className="text-lg font-semibold text-gray-800 border-b pb-2">
        Contact Me
      </h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <User className="h-4 w-4 text-[#EF4923]" />
          <span>Your Agent Name</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Mail className="h-4 w-4 text-[#EF4923]" />
          <span>agent@spyglassrealty.com</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Phone className="h-4 w-4 text-[#EF4923]" />
          <span>(512) 555-0100</span>
        </div>
      </div>
    </div>
  );
}

function MapSection({ comps, subject }: { comps: PropertyData[]; subject: PropertyData | null }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const allProps = useMemo(() => {
    const list: PropertyData[] = [];
    if (subject?.latitude && subject?.longitude) list.push(subject);
    comps.forEach((c) => {
      if (c.latitude && c.longitude) list.push(c);
    });
    return list;
  }, [comps, subject]);

  useEffect(() => {
    if (!mapContainerRef.current || allProps.length === 0) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [allProps[0].longitude!, allProps[0].latitude!],
      zoom: 11,
      interactive: false,
    });

    map.on("load", () => {
      const bounds = new mapboxgl.LngLatBounds();
      allProps.forEach((p) => {
        const isSubject = subject && p.mlsNumber === subject.mlsNumber && p.address === subject.address;
        const color = isSubject ? "#EF4923" : "#3b82f6";

        const el = document.createElement("div");
        el.style.cssText = `
          width: 14px; height: 14px;
          background: ${color};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        `;
        new mapboxgl.Marker({ element: el })
          .setLngLat([p.longitude!, p.latitude!])
          .addTo(map);
        bounds.extend([p.longitude!, p.latitude!]);
      });
      if (allProps.length > 1) {
        map.fitBounds(bounds, { padding: 40 });
      }
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [allProps, subject]);

  if (allProps.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 text-center text-gray-400">
        <MapPin className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">
          No properties with coordinates available for the map.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h4 className="text-lg font-semibold text-gray-800">
          Map of All Listings
        </h4>
      </div>
      <div ref={mapContainerRef} className="w-full h-[280px]" />
    </div>
  );
}

function SummaryCompsSection({ comps }: { comps: PropertyData[] }) {
  if (comps.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 text-center text-gray-400">
        <p className="text-sm">No comparable properties to summarize.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h4 className="text-lg font-semibold text-gray-800">
          Summary of Comparable Properties
        </h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider">
              <th className="text-left px-3 py-2 font-medium">Address</th>
              <th className="text-right px-3 py-2 font-medium">Price</th>
              <th className="text-center px-3 py-2 font-medium">Beds</th>
              <th className="text-center px-3 py-2 font-medium">Baths</th>
              <th className="text-right px-3 py-2 font-medium">SqFt</th>
              <th className="text-right px-3 py-2 font-medium">$/SqFt</th>
              <th className="text-center px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {comps.map((c, i) => {
              const price = c.soldPrice || c.listPrice;
              const ppsf = price && c.sqft ? Math.round(price / c.sqft) : 0;
              return (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-700 truncate max-w-[180px]">
                    {c.address}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700">
                    {formatPrice(price)}
                  </td>
                  <td className="px-3 py-2 text-center">{c.beds}</td>
                  <td className="px-3 py-2 text-center">{c.baths}</td>
                  <td className="px-3 py-2 text-right">
                    {formatNumber(c.sqft)}
                  </td>
                  <td className="px-3 py-2 text-right">${ppsf}</td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColor(
                        c.status
                      )}`}
                    >
                      {c.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PropertyDetailsSection({ comps }: { comps: PropertyData[] }) {
  const MAX_SHOWN = 6;
  const shown = comps.slice(0, MAX_SHOWN);
  const remaining = comps.length - MAX_SHOWN;

  if (comps.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 text-center text-gray-400">
        <p className="text-sm">No comparable properties added.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h4 className="text-lg font-semibold text-gray-800">
          Property Details
        </h4>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {shown.map((c, i) => (
          <div
            key={i}
            className="border rounded-lg p-3 flex gap-3 hover:shadow-sm transition"
          >
            {c.photo ? (
              <img
                src={c.photo}
                alt=""
                className="w-20 h-16 rounded object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-16 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                <ImageIcon className="h-6 w-6 text-gray-300" />
              </div>
            )}
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-xs font-semibold text-gray-800 truncate">
                {c.address}
              </p>
              {c.city && (
                <p className="text-[10px] text-gray-500">{c.city}</p>
              )}
              <p className="text-sm font-bold text-[#EF4923]">
                {formatPrice(c.soldPrice || c.listPrice)}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
                <span className="flex items-center gap-0.5">
                  <BedDouble className="h-3 w-3" /> {c.beds}
                </span>
                <span className="flex items-center gap-0.5">
                  <Bath className="h-3 w-3" /> {c.baths}
                </span>
                <span className="flex items-center gap-0.5">
                  <Ruler className="h-3 w-3" /> {formatNumber(c.sqft)}
                </span>
                {c.yearBuilt && (
                  <span className="flex items-center gap-0.5">
                    <Calendar className="h-3 w-3" /> {c.yearBuilt}
                  </span>
                )}
              </div>
              <span
                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColor(
                  c.status
                )}`}
              >
                {c.status}
              </span>
            </div>
          </div>
        ))}
      </div>
      {remaining > 0 && (
        <div className="px-4 pb-3 text-center">
          <span className="text-xs text-gray-500">
            +{remaining} more propert{remaining === 1 ? "y" : "ies"}
          </span>
        </div>
      )}
    </div>
  );
}

function PropertyPhotosSection({ comps }: { comps: PropertyData[] }) {
  const withPhotos = comps.filter((c) => c.photo);

  if (withPhotos.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 text-center text-gray-400">
        <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No property photos available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h4 className="text-lg font-semibold text-gray-800">
          Property Photos
        </h4>
      </div>
      <div className="p-4 grid grid-cols-3 gap-2">
        {withPhotos.slice(0, 9).map((c, i) => (
          <div key={i} className="relative">
            <img
              src={c.photo!}
              alt={c.address}
              className="w-full h-24 rounded object-cover"
            />
            <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1 py-0.5 rounded">
              {c.streetAddress || c.address.split(",")[0]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdjustmentsSection({ comps }: { comps: PropertyData[] }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h4 className="text-lg font-semibold text-gray-800">Adjustments</h4>
      </div>
      <div className="p-4">
        {comps.length === 0 ? (
          <p className="text-sm text-gray-400 text-center">
            No properties to adjust.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider">
                  <th className="text-left px-3 py-2 font-medium">Feature</th>
                  <th className="text-center px-3 py-2 font-medium">Subject</th>
                  {comps.slice(0, 4).map((c, i) => (
                    <th key={i} className="text-center px-3 py-2 font-medium truncate max-w-[100px]">
                      Comp {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y text-gray-600">
                {["Price", "Sq Ft", "Beds", "Baths", "Year Built"].map(
                  (feat) => (
                    <tr key={feat}>
                      <td className="px-3 py-2 font-medium">{feat}</td>
                      <td className="px-3 py-2 text-center">—</td>
                      {comps.slice(0, 4).map((_, ci) => (
                        <td key={ci} className="px-3 py-2 text-center">
                          —
                        </td>
                      ))}
                    </tr>
                  )
                )}
              </tbody>
            </table>
            <p className="text-[10px] text-gray-400 mt-2 text-center italic">
              Detailed adjustments will be available in a future update.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function AvgPriceSqftSection({ comps, subject }: { comps: PropertyData[]; subject: PropertyData | null }) {
  const data = useMemo(() => {
    const items: Array<{ label: string; ppsf: number; isSubject?: boolean }> = [];
    if (subject && subject.listPrice && subject.sqft) {
      items.push({
        label: subject.streetAddress || subject.address.split(",")[0] || "Subject",
        ppsf: Math.round(subject.listPrice / subject.sqft),
        isSubject: true,
      });
    }
    comps.forEach((c) => {
      const price = c.soldPrice || c.listPrice;
      if (price && c.sqft) {
        items.push({
          label: c.streetAddress || c.address.split(",")[0] || c.mlsNumber,
          ppsf: Math.round(price / c.sqft),
        });
      }
    });
    return items;
  }, [comps, subject]);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 text-center text-gray-400">
        <p className="text-sm">No price per sq ft data available.</p>
      </div>
    );
  }

  const maxPpsf = Math.max(...data.map((d) => d.ppsf));

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h4 className="text-lg font-semibold text-gray-800">
          Average Price Per Sq. Ft.
        </h4>
      </div>
      <div className="p-4 space-y-2">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <span
              className="text-[10px] text-gray-600 w-28 truncate flex-shrink-0 text-right"
              title={item.label}
            >
              {item.label}
            </span>
            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
              <div
                className={`h-full rounded-full flex items-center justify-end pr-2 text-white text-[10px] font-semibold transition-all ${
                  item.isSubject ? "bg-[#EF4923]" : "bg-blue-500"
                }`}
                style={{
                  width: `${Math.max(
                    (item.ppsf / maxPpsf) * 100,
                    15
                  )}%`,
                }}
              >
                ${item.ppsf}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompStatisticsSection({ comps }: { comps: PropertyData[] }) {
  const stats = useMemo(() => {
    if (comps.length === 0) return null;
    const prices = comps
      .map((c) => c.soldPrice || c.listPrice)
      .filter(Boolean) as number[];
    const ppsfs = comps
      .map((c) => {
        const p = c.soldPrice || c.listPrice;
        return p && c.sqft ? p / c.sqft : 0;
      })
      .filter(Boolean);
    const doms = comps
      .map((c) => c.daysOnMarket)
      .filter((d) => d != null) as number[];

    const avg = (a: number[]) =>
      a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
    const med = (a: number[]) => {
      if (!a.length) return 0;
      const s = [...a].sort((x, y) => x - y);
      const m = Math.floor(s.length / 2);
      return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    };

    return {
      avgPrice: avg(prices),
      medPrice: med(prices),
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      avgPpsf: avg(ppsfs),
      avgDom: avg(doms),
    };
  }, [comps]);

  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 text-center text-gray-400">
        <p className="text-sm">Add comparable properties to see statistics.</p>
      </div>
    );
  }

  const cards = [
    { label: "Average Price", value: formatPrice(stats.avgPrice) },
    { label: "Median Price", value: formatPrice(stats.medPrice) },
    {
      label: "Price Range",
      value: `${formatPrice(stats.minPrice)} – ${formatPrice(stats.maxPrice)}`,
    },
    { label: "Avg $/SqFt", value: `$${Math.round(stats.avgPpsf)}` },
    {
      label: "Avg Days on Market",
      value: `${Math.round(stats.avgDom)} days`,
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h4 className="text-lg font-semibold text-gray-800">
          Comparable Property Statistics
        </h4>
      </div>
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cards.map((c, i) => (
          <div key={i} className="border rounded-lg p-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
              {c.label}
            </p>
            <p className="text-sm font-bold text-gray-800 mt-1">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChapterHeaderSection({ title }: { title: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
      <div className="w-12 h-0.5 bg-[#EF4923] mx-auto mb-3" />
      <h3 className="text-xl font-bold text-gray-800">{title}</h3>
      <div className="w-12 h-0.5 bg-[#EF4923] mx-auto mt-3" />
    </div>
  );
}

function PlaceholderSection({ title }: { title: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 text-center text-gray-400">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs mt-1">This section will be available in a future update.</p>
    </div>
  );
}

function WhatIsCmaSection() {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 space-y-3">
      <h4 className="text-lg font-semibold text-gray-800 border-b pb-2">
        What is a CMA?
      </h4>
      <p className="text-sm text-gray-600 leading-relaxed">
        A Comparative Market Analysis (CMA) is a detailed evaluation of the
        prices of recently sold homes that are similar to your property. By
        comparing features like location, size, condition, and amenities, a CMA
        helps determine a competitive and realistic listing price or offer price.
      </p>
      <p className="text-sm text-gray-600 leading-relaxed">
        This report uses actual market data to provide you with an accurate
        picture of your property's value in today's market.
      </p>
    </div>
  );
}

function OurCompanySection() {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 space-y-3">
      <h4 className="text-lg font-semibold text-gray-800 border-b pb-2">
        Our Company
      </h4>
      <div className="text-center space-y-2">
        <h5 className="text-xl font-bold text-[#EF4923]">Spyglass Realty</h5>
        <p className="text-sm text-gray-600 leading-relaxed">
          Based in Austin, TX, Spyglass Realty is a full-service real estate
          brokerage dedicated to helping clients navigate the Central Texas real
          estate market with confidence and expertise.
        </p>
      </div>
    </div>
  );
}

// Main preview component

export function PresentationPreview({ sections, cma, onFullscreen }: PreviewProps) {
  const enabledSections = useMemo(
    () => [...sections].filter((s) => s.enabled).sort((a, b) => a.order - b.order),
    [sections]
  );

  const renderSection = (section: PresentationSection) => {
    switch (section.id) {
      case "cover-page":
        return <CoverPageSection cma={cma} />;
      case "listing-brochure":
        return <PlaceholderSection title="Listing Brochure" />;
      case "cover-letter":
        return <CoverLetterSection content={section.content} />;
      case "agent-resume":
        return <AgentResumeSection content={section.content} />;
      case "our-company":
        return <OurCompanySection />;
      case "what-is-cma":
        return <WhatIsCmaSection />;
      case "contact-me":
        return <ContactMeSection />;
      case "map-all-listings":
        return (
          <MapSection
            comps={cma.comparableProperties}
            subject={cma.subjectProperty}
          />
        );
      case "summary-comps":
        return <SummaryCompsSection comps={cma.comparableProperties} />;
      case "listings-chapter-header":
        return <ChapterHeaderSection title="Listings" />;
      case "property-details":
        return <PropertyDetailsSection comps={cma.comparableProperties} />;
      case "property-photos":
        return <PropertyPhotosSection comps={cma.comparableProperties} />;
      case "adjustments":
        return <AdjustmentsSection comps={cma.comparableProperties} />;
      case "analysis-chapter-header":
        return <ChapterHeaderSection title="Analysis" />;
      case "online-valuation":
        return <PlaceholderSection title="Online Valuation Analysis" />;
      case "avg-price-sqft":
        return (
          <AvgPriceSqftSection
            comps={cma.comparableProperties}
            subject={cma.subjectProperty}
          />
        );
      case "comp-statistics":
        return <CompStatisticsSection comps={cma.comparableProperties} />;
      default:
        return <PlaceholderSection title={section.label} />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Preview header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Live Preview
          </h3>
          <Badge variant="secondary" className="text-xs">
            {enabledSections.length} section
            {enabledSections.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        {onFullscreen && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onFullscreen}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Scrollable preview */}
      <div className="flex-1 overflow-y-auto bg-gray-100 p-4">
        {enabledSections.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Home className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No sections enabled</p>
            <p className="text-xs mt-1">
              Toggle sections on in the left panel to build your presentation.
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-w-[640px] mx-auto">
            {enabledSections.map((section) => (
              <div key={section.id}>{renderSection(section)}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
