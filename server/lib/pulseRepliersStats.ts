/**
 * Repliers real-time statistics API client for Pulse V2 layers.
 *
 * Two scope modes:
 *   zip     → GET with zip={zip}&boardId=53
 *   polygon → POST with { map: [ring] }, NO boardId
 *             (boardId on polygon POSTs returns zero results — see CLAUDE.md)
 *
 * Retries up to MAX_RETRIES times on 5xx with linear backoff.
 * Throws on final failure — callers are responsible for null-return.
 */

const BASE_URL = "https://api.repliers.io/listings";
const TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;

export type RepliersScope =
  | { type: "zip"; zip: string }
  | { type: "polygon"; ring: number[][] };

export interface RepliersStatsOptions {
  scope: RepliersScope;
  statistics: string[];
  filters: {
    status?: string;
    lastStatus?: string;
    minSoldDate?: string;
    type?: string;
  };
  listings?: false;
}

function getApiKey(): string {
  const key = process.env.IDX_GRID_API_KEY;
  if (!key) throw new Error("IDX_GRID_API_KEY not configured");
  return key;
}

async function fetchOnce(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal as any });
  } finally {
    clearTimeout(timer);
  }
}

export async function getRepliersStats(opts: RepliersStatsOptions): Promise<any> {
  const { scope, statistics, filters, listings } = opts;
  const apiKey = getApiKey();

  const params = new URLSearchParams();
  if (filters.type)        params.set("type", filters.type);
  if (filters.status)      params.set("status", filters.status);
  if (filters.lastStatus)  params.set("lastStatus", filters.lastStatus);
  if (filters.minSoldDate) params.set("minSoldDate", filters.minSoldDate);
  params.set("statistics", statistics.join(","));
  if (listings === false)  params.set("listings", "false");

  const baseHeaders: Record<string, string> = {
    "Accept": "application/json",
    "REPLIERS-API-KEY": apiKey,
  };

  let url: string;
  let init: RequestInit;

  if (scope.type === "zip") {
    params.set("zip", scope.zip);
    params.set("boardId", "53");
    url = `${BASE_URL}?${params.toString()}`;
    console.debug(`[pulseRepliersStats] GET ${url}`);
    init = { method: "GET", headers: baseHeaders };
  } else {
    // POST polygon — boardId intentionally absent (returns zero results with it)
    url = `${BASE_URL}?${params.toString()}`;
    const body = JSON.stringify({ map: [scope.ring] });
    console.debug(`[pulseRepliersStats] POST ${url} ring-pts=${scope.ring.length}`);
    init = {
      method: "POST",
      headers: { ...baseHeaders, "Content-Type": "application/json" },
      body,
    };
  }

  let lastErr: Error = new Error("Repliers fetch failed");
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, attempt * 500));
      console.warn(`[pulseRepliersStats] retry ${attempt}/${MAX_RETRIES} for ${url}`);
    }
    try {
      const res = await fetchOnce(url, init);
      if (res.status >= 500 && attempt < MAX_RETRIES) {
        lastErr = new Error(`Repliers ${res.status}`);
        continue;
      }
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`Repliers API ${res.status}: ${errBody.substring(0, 200)}`);
      }
      return res.json();
    } catch (err: any) {
      lastErr = err;
      if (attempt >= MAX_RETRIES) break;
    }
  }
  throw lastErr;
}
