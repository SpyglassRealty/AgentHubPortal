import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ── Types ────────────────────────────────────────────

export interface CommunityListItem {
  id: number;
  slug: string;
  name: string;
  county: string | null;
  published: boolean | null;
  featured: boolean | null;
  updatedAt: string | null;
  metaTitle: string | null;
}

export interface CommunitySection {
  id: string;
  heading: string;
  content: string;
  order: number;
}

export interface Community {
  id: number;
  slug: string;
  name: string;
  county: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  focusKeyword: string | null;
  description: string | null;
  highlights: string[] | null;
  bestFor: string[] | null;
  nearbyLandmarks: string[] | null;
  sections: CommunitySection[] | null;
  published: boolean | null;
  featured: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface CommunitiesResponse {
  communities: CommunityListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  counties: string[];
}

// ── API helpers ──────────────────────────────────────

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || "API error");
  }
  return res.json();
}

// ── Hooks ────────────────────────────────────────────

export function useAdminCommunities(
  search: string = "",
  filter: string = "all",
  page: number = 1,
  county: string = ""
) {
  return useQuery<CommunitiesResponse>({
    queryKey: ["admin-communities", search, filter, page, county],
    queryFn: () => {
      const params = new URLSearchParams({
        search,
        filter,
        page: page.toString(),
        limit: "50",
      });
      if (county) params.set("county", county);
      return fetchJson(`/api/admin/communities?${params}`);
    },
    staleTime: 30_000,
  });
}

export function useAdminCommunity(slug: string | undefined) {
  return useQuery<Community>({
    queryKey: ["admin-community", slug],
    queryFn: () => fetchJson(`/api/admin/communities/${slug}`),
    enabled: !!slug,
    staleTime: 10_000,
  });
}

export function useUpdateCommunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, data }: { slug: string; data: Partial<Community> }) =>
      fetchJson(`/api/admin/communities/${slug}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, { slug }) => {
      qc.invalidateQueries({ queryKey: ["admin-community", slug] });
      qc.invalidateQueries({ queryKey: ["admin-communities"] });
    },
  });
}

export function useTogglePublish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) =>
      fetchJson(`/api/admin/communities/${slug}/publish`, {
        method: "POST",
      }),
    onSuccess: (_data, slug) => {
      qc.invalidateQueries({ queryKey: ["admin-community", slug] });
      qc.invalidateQueries({ queryKey: ["admin-communities"] });
    },
  });
}
