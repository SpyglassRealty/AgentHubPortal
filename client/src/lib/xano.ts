// Xano API types and hooks for admin dashboards
import { useQuery } from "@tanstack/react-query";

// ── Types ────────────────────────────────────────────

export interface XanoTransaction {
  id: number;
  address?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  price?: number;
  sale_price?: number;
  close_price?: number;
  volume?: number;
  gci?: number;
  gross_commission?: number;
  close_date?: string;
  closing_date?: string;
  expected_close_date?: string;
  status?: string;
  type?: string;
  transaction_type?: string;
  representation?: string;
  agent_name?: string;
  agent_id?: number;
  listing_agent?: string;
  buying_agent?: string;
  created_at?: string;
  [key: string]: any;
}

export interface XanoListing {
  id: number;
  address?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  price?: number;
  list_price?: number;
  status?: string;
  listing_date?: string;
  expiration_date?: string;
  agent_name?: string;
  agent_id?: number;
  type?: string;
  created_at?: string;
  [key: string]: any;
}

export interface XanoNetworkMember {
  id: number;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  tier?: number;
  status?: string;
  join_date?: string;
  sponsor?: string;
  sponsor_name?: string;
  sponsorship_type?: string;
  network_size?: number;
  cap?: number;
  paid?: number;
  capped?: boolean;
  locked?: boolean;
  [key: string]: any;
}

export interface XanoRevShare {
  id?: number;
  amount?: number;
  total?: number;
  status?: string;
  tier?: number;
  agent_name?: string;
  date?: string;
  [key: string]: any;
}

export interface XanoRosterMember {
  id: number;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  status?: string;
  team_status?: string;
  join_date?: string;
  last_login?: string;
  team_cap?: number;
  team_paid?: number;
  brokerage_cap?: number;
  brokerage_paid?: number;
  capped?: boolean;
  has_seat?: boolean;
  location?: string;
  [key: string]: any;
}

// ── Fetch Helpers ────────────────────────────────────

async function fetchXano<T>(endpoint: string): Promise<T> {
  const response = await fetch(`/api/admin/xano/${endpoint}`, {
    credentials: "include",
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Xano API error: ${response.status}`);
  }
  return response.json();
}

// ── React Query Hooks ────────────────────────────────

export function useXanoTransactionsClosed() {
  return useQuery<XanoTransaction[]>({
    queryKey: ["xano", "transactions", "closed"],
    queryFn: () => fetchXano("transactions/closed"),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

export function useXanoTransactionsPending() {
  return useQuery<XanoTransaction[]>({
    queryKey: ["xano", "transactions", "pending"],
    queryFn: () => fetchXano("transactions/pending"),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useXanoTransactionsTerminated() {
  return useQuery<XanoTransaction[]>({
    queryKey: ["xano", "transactions", "terminated"],
    queryFn: () => fetchXano("transactions/terminated"),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useXanoListings() {
  return useQuery<XanoListing[]>({
    queryKey: ["xano", "listings"],
    queryFn: () => fetchXano("listings"),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useXanoNetwork() {
  return useQuery<XanoNetworkMember[]>({
    queryKey: ["xano", "network"],
    queryFn: () => fetchXano("network"),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useXanoRevShare() {
  return useQuery<XanoRevShare[]>({
    queryKey: ["xano", "revshare"],
    queryFn: () => fetchXano("revshare"),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useXanoContributions() {
  return useQuery<any>({
    queryKey: ["xano", "contributions"],
    queryFn: () => fetchXano("contributions"),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useXanoRoster() {
  return useQuery<XanoRosterMember[]>({
    queryKey: ["xano", "roster"],
    queryFn: () => fetchXano("roster"),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useXanoLocations() {
  return useQuery<any[]>({
    queryKey: ["xano", "locations"],
    queryFn: () => fetchXano("locations"),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
}

// ── Utility Functions ────────────────────────────────

export function formatCurrency(value: number | undefined | null, compact = false): string {
  if (value == null || isNaN(value)) return "$0";
  
  if (compact) {
    if (Math.abs(value) >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1_000) {
      return `$${(value / 1_000).toFixed(1)}K`;
    }
  }
  
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return "0";
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPercent(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return "0%";
  return `${value >= 0 ? "+" : ""}${value.toFixed(0)}%`;
}

export function getMonthName(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", { month: "short", year: "numeric" });
}

export function getMonthKey(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
