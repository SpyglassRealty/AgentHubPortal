// ReZen Dashboard API hooks and utilities
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ── Types ────────────────────────────────────────────

export interface RevenueKPIs {
  closedVolume: number;
  grossGCI: number;
  netIncome: number;
  avgCommission: number;
  commissionCount: number;
  feesDeductions: number;
}

export interface MonthlyTrend {
  month: string;
  key: string;
  grossGCI: number;
  netIncome: number;
  volume: number;
  count: number;
}

export interface RevenueDashboardData {
  kpis: RevenueKPIs;
  monthlyTrend: MonthlyTrend[];
}

export interface TypeBreakdown {
  name: string;
  count: number;
  volume: number;
  gci: number;
}

export interface AgentProduction {
  name: string;
  volume: number;
  gci: number;
  count: number;
}

export interface AgentDistribution {
  name: string;
  value: number;
  gci: number;
  count: number;
}

export interface LeadSourceBreakdown {
  name: string;
  count: number;
  volume: number;
  gci: number;
  avgCommissionPct: number;
}

export interface AnalyticsDashboardData {
  byType: TypeBreakdown[];
  topAgents: AgentProduction[];
  agentDistribution: AgentDistribution[];
  byPropertyType: TypeBreakdown[];
  byLeadSource: LeadSourceBreakdown[];
  totalTransactions: number;
}

export interface TransactionRow {
  id: string;
  date: string | null;
  address: string;
  city: string;
  state: string;
  agent: string;
  type: string;
  side: string;
  price: number;
  grossCommission: number;
  netPayout: number;
  status: string;
  propertyType: string;
  code: string;
}

export interface TransactionsTableData {
  transactions: TransactionRow[];
  totalCount: number;
}

// ── Fetch helpers ────────────────────────────────────

async function fetchRezenDashboard<T>(endpoint: string): Promise<T> {
  const response = await fetch(`/api/admin/rezen-dashboard/${endpoint}`, {
    credentials: "include",
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API error: ${response.status}`);
  }
  return response.json();
}

// ── React Query Hooks ────────────────────────────────

export function useRevenueData() {
  return useQuery<RevenueDashboardData>({
    queryKey: ["rezen-dashboard", "revenue"],
    queryFn: () => fetchRezenDashboard("revenue"),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
}

export function useAnalyticsData() {
  return useQuery<AnalyticsDashboardData>({
    queryKey: ["rezen-dashboard", "analytics"],
    queryFn: () => fetchRezenDashboard("analytics"),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export function useTransactionsTable(status: string = "CLOSED") {
  return useQuery<TransactionsTableData>({
    queryKey: ["rezen-dashboard", "transactions", status],
    queryFn: () => fetchRezenDashboard(`transactions?status=${status}`),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export function useRefreshDashboard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/rezen-dashboard/refresh", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to refresh");
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all rezen-dashboard queries
      queryClient.invalidateQueries({ queryKey: ["rezen-dashboard"] });
    },
  });
}

// ── Formatting Utilities ─────────────────────────────

export function formatCurrency(value: number | undefined | null, compact = false): string {
  if (value == null || isNaN(value)) return "$0";

  if (compact) {
    if (Math.abs(value) >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1_000) {
      return `$${(value / 1_000).toFixed(0)}K`;
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

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatPercent(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return "0%";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}
