import { useQuery } from "@tanstack/react-query";
import { GraduationCap, ExternalLink, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface School {
  universalId: string;
  name: string;
  type: string;
  levelCodes: string;
  level: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  overviewUrl: string;
  ratingBand: string | null;
  distance: number;
  districtName: string | null;
}

interface SchoolsSectionProps {
  lat: number;
  lng: number;
  className?: string;
}

function getRatingColor(band: string | null): string {
  if (!band) return "bg-muted text-muted-foreground";
  switch (band.toLowerCase()) {
    case "above average":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    case "average":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
    case "below average":
      return "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getRatingIcon(band: string | null): string {
  if (!band) return "—";
  switch (band.toLowerCase()) {
    case "above average": return "★★★";
    case "average": return "★★";
    case "below average": return "★";
    default: return "—";
  }
}

function getLevelLabel(levelCodes: string): string {
  const codes = levelCodes.split(",").map(c => c.trim());
  const labels: string[] = [];
  if (codes.includes("p")) labels.push("Pre-K");
  if (codes.includes("e")) labels.push("Elementary");
  if (codes.includes("m")) labels.push("Middle");
  if (codes.includes("h")) labels.push("High");
  return labels.join(" / ") || levelCodes;
}

function getTypeLabel(type: string): string {
  switch (type.toLowerCase()) {
    case "public": return "Public";
    case "private": return "Private";
    case "charter": return "Charter";
    case "oosle": return "Online";
    default: return type;
  }
}

export default function SchoolsSection({ lat, lng, className = "" }: SchoolsSectionProps) {
  const { data, isLoading, error } = useQuery<{
    schools: School[];
    meta: {
      count: number;
      attribution: {
        text: string;
        logoUrl: string;
        linkUrl: string;
      };
    };
  }>({
    queryKey: ["/api/pulse/schools", lat, lng],
    queryFn: async () => {
      const res = await fetch(
        `/api/pulse/schools?lat=${lat}&lng=${lng}&radius=5&limit=15`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch schools");
      return res.json();
    },
    enabled: !!lat && !!lng,
    staleTime: 1000 * 60 * 30, // 30 min
  });

  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <GraduationCap className="h-4 w-4 text-[#EF4923]" />
          <h3 className="text-sm font-semibold">Nearby Schools</h3>
        </div>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error || !data?.schools?.length) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-[#EF4923]" />
          <h3 className="text-sm font-semibold">Nearby Schools</h3>
        </div>
        <p className="text-xs text-muted-foreground">No school data available for this area.</p>
      </div>
    );
  }

  const schools = data.schools;
  const attribution = data.meta.attribution;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-[#EF4923]" />
          <h3 className="text-sm font-semibold">
            Nearby Schools <span className="text-muted-foreground font-normal">({schools.length})</span>
          </h3>
        </div>
      </div>

      <div className="space-y-2">
        {schools.slice(0, 10).map((school) => (
          <a
            key={school.universalId}
            href={school.overviewUrl}
            target="_blank"
            rel="noopener nofollow"
            className="block p-2.5 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 hover:border-[#EF4923]/30 transition-all group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-foreground truncate group-hover:text-[#EF4923] transition-colors">
                    {school.name}
                  </span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">
                    {getTypeLabel(school.type)}
                  </span>
                  <span className="text-[10px] text-muted-foreground/40">•</span>
                  <span className="text-[10px] text-muted-foreground">
                    {getLevelLabel(school.levelCodes)}
                  </span>
                  <span className="text-[10px] text-muted-foreground/40">•</span>
                  <span className="text-[10px] text-muted-foreground">
                    {school.distance.toFixed(1)} mi
                  </span>
                </div>
              </div>
              {school.ratingBand && (
                <Badge
                  variant="outline"
                  className={`text-[9px] font-semibold px-1.5 py-0.5 whitespace-nowrap ${getRatingColor(school.ratingBand)}`}
                >
                  {getRatingIcon(school.ratingBand)} {school.ratingBand}
                </Badge>
              )}
            </div>
          </a>
        ))}
      </div>

      {/* GreatSchools Attribution — required */}
      <div className="flex items-center gap-2 pt-1 border-t border-border/50">
        <a
          href={attribution.linkUrl}
          target="_blank"
          rel="noopener nofollow"
          className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity"
        >
          <img
            src="https://www.greatschools.org/assets/shared/gs-logo.svg"
            alt="GreatSchools"
            className="h-3.5"
            onError={(e) => {
              // Fallback if logo doesn't load
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <span className="text-[9px] text-muted-foreground">
            {attribution.text}
          </span>
        </a>
      </div>
    </div>
  );
}
