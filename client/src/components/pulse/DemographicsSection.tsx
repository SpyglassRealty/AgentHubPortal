import { useQuery } from "@tanstack/react-query";
import {
  Users,
  DollarSign,
  Home,
  GraduationCap,
  Wifi,
  Heart,
  User,
  Building2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DemographicsData {
  zip: string;
  year: number | null;
  source: string;
  county: string | null;
  city: string | null;
  demographics: {
    population: number | null;
    medianIncome: number | null;
    medianAge: number | null;
    homeownershipRate: number | null;
    povertyRate: number | null;
    collegeDegreeRate: number | null;
    remoteWorkPct: number | null;
    housingUnits: number | null;
    familyHouseholdsPct: number | null;
    homeowners25to44Pct: number | null;
    homeowners75plusPct: number | null;
  };
}

interface DemographicsSectionProps {
  zipCode: string;
  className?: string;
}

function formatNumber(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCurrency(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function formatPercent(n: number | null): string {
  if (n === null) return "—";
  return `${n.toFixed(1)}%`;
}

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
}

function StatItem({ icon, label, value, subtext }: StatItemProps) {
  return (
    <div className="flex items-center gap-2.5 p-2 rounded-md bg-muted/20">
      <div className="flex-shrink-0 w-7 h-7 rounded-md bg-[#EF4923]/10 flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
        <p className="text-sm font-bold text-foreground leading-tight">{value}</p>
        {subtext && (
          <p className="text-[9px] text-muted-foreground/70">{subtext}</p>
        )}
      </div>
    </div>
  );
}

export default function DemographicsSection({ zipCode, className = "" }: DemographicsSectionProps) {
  const { data, isLoading, error } = useQuery<DemographicsData>({
    queryKey: ["/api/pulse/demographics", zipCode],
    queryFn: async () => {
      const res = await fetch(`/api/pulse/demographics/${zipCode}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch demographics");
      return res.json();
    },
    enabled: !!zipCode,
    staleTime: 1000 * 60 * 30, // 30 min
  });

  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-4 w-4 text-[#EF4923]" />
          <h3 className="text-sm font-semibold">Demographics</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-14 w-full rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-[#EF4923]" />
          <h3 className="text-sm font-semibold">Demographics</h3>
        </div>
        <p className="text-xs text-muted-foreground">Demographic data unavailable.</p>
      </div>
    );
  }

  const d = data.demographics;
  const sourceLabel = data.source === "census_acs" 
    ? `US Census ACS ${data.year}` 
    : "Estimated";

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-[#EF4923]" />
          <h3 className="text-sm font-semibold">Demographics</h3>
        </div>
        <span className="text-[9px] text-muted-foreground">
          {sourceLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatItem
          icon={<Users className="h-3.5 w-3.5 text-[#EF4923]" />}
          label="Population"
          value={formatNumber(d.population)}
        />
        <StatItem
          icon={<DollarSign className="h-3.5 w-3.5 text-[#EF4923]" />}
          label="Median Income"
          value={formatCurrency(d.medianIncome)}
        />
        <StatItem
          icon={<User className="h-3.5 w-3.5 text-[#EF4923]" />}
          label="Median Age"
          value={d.medianAge !== null ? d.medianAge.toFixed(1) : "—"}
        />
        <StatItem
          icon={<Home className="h-3.5 w-3.5 text-[#EF4923]" />}
          label="Homeownership"
          value={formatPercent(d.homeownershipRate)}
        />
        <StatItem
          icon={<GraduationCap className="h-3.5 w-3.5 text-[#EF4923]" />}
          label="College Degree"
          value={formatPercent(d.collegeDegreeRate)}
        />
        <StatItem
          icon={<Heart className="h-3.5 w-3.5 text-[#EF4923]" />}
          label="Poverty Rate"
          value={formatPercent(d.povertyRate)}
        />
        <StatItem
          icon={<Wifi className="h-3.5 w-3.5 text-[#EF4923]" />}
          label="Remote Work"
          value={formatPercent(d.remoteWorkPct)}
        />
        <StatItem
          icon={<Building2 className="h-3.5 w-3.5 text-[#EF4923]" />}
          label="Housing Units"
          value={formatNumber(d.housingUnits)}
        />
      </div>

      {/* Additional breakdown if available */}
      {(d.familyHouseholdsPct !== null || d.homeowners25to44Pct !== null) && (
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {d.familyHouseholdsPct !== null && (
            <MiniStat label="Family Households" value={formatPercent(d.familyHouseholdsPct)} />
          )}
          {d.homeowners25to44Pct !== null && (
            <MiniStat label="Owners 25-44" value={formatPercent(d.homeowners25to44Pct)} />
          )}
          {d.homeowners75plusPct !== null && (
            <MiniStat label="Owners 75+" value={formatPercent(d.homeowners75plusPct)} />
          )}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-1.5 rounded bg-muted/30">
      <p className="text-[9px] text-muted-foreground leading-tight">{label}</p>
      <p className="text-xs font-bold">{value}</p>
    </div>
  );
}
