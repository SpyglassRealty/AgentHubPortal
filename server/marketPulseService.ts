import { storage } from "./storage";
import type { MarketPulseSnapshot, InsertMarketPulseSnapshot } from "@shared/schema";
import { DEFAULT_OFFICE } from "./config/offices";

export interface MarketPulseData {
  totalProperties: number;
  active: number;
  activeUnderContract: number;
  pending: number;
  closed: number;
  lastUpdatedAt: string;
  officeName?: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, headers: Record<string, string>, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, { headers });
      if (response.ok || attempt === retries) {
        return response;
      }
      if (response.status >= 500) {
        console.log(`[Market Pulse] Retry ${attempt}/${retries} for ${url} (status: ${response.status})`);
        await delay(RETRY_DELAY_MS * attempt);
      } else {
        return response;
      }
    } catch (error) {
      if (attempt === retries) throw error;
      console.log(`[Market Pulse] Retry ${attempt}/${retries} for ${url} (error: ${error})`);
      await delay(RETRY_DELAY_MS * attempt);
    }
  }
  throw new Error("Exhausted retries");
}

export async function fetchMarketPulseFromAPI(): Promise<MarketPulseData> {
  const apiKey = process.env.IDX_GRID_API_KEY;
  console.log(`[Market Pulse DEBUG] API Key status: ${apiKey ? 'SET (length: ' + apiKey.length + ')' : 'NOT SET'}`);
  
  if (!apiKey) {
    throw new Error("Market data API key not configured");
  }

  const baseUrl = 'https://api.repliers.io/listings';
  const officeId = DEFAULT_OFFICE.officeId;
  const officeName = DEFAULT_OFFICE.name;
  
  const activeParams = new URLSearchParams({
    listings: 'false',
    type: 'Sale',
    standardStatus: 'Active',
    officeId: officeId,
  });
  const activeUrl = `${baseUrl}?${activeParams.toString()}`;
  
  const activeUnderContractParams = new URLSearchParams({
    listings: 'false',
    type: 'Sale',
    standardStatus: 'Active Under Contract',
    officeId: officeId,
  });
  const activeUnderContractUrl = `${baseUrl}?${activeUnderContractParams.toString()}`;
  
  const pendingParams = new URLSearchParams({
    listings: 'false',
    type: 'Sale',
    standardStatus: 'Pending',
    officeId: officeId,
  });
  const pendingUrl = `${baseUrl}?${pendingParams.toString()}`;
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const minSoldDate = thirtyDaysAgo.toISOString().split('T')[0];
  
  const closedParams = new URLSearchParams({
    listings: 'false',
    type: 'Sale',
    status: 'U',
    lastStatus: 'Sld',
    minSoldDate: minSoldDate,
    officeId: officeId,
  });
  const closedUrl = `${baseUrl}?${closedParams.toString()}`;

  console.log(`[Market Pulse Service] Fetching ${officeName} data from Repliers API...`);
  console.log(`[Market Pulse DEBUG] Office ID: ${officeId}`);
  console.log(`[Market Pulse DEBUG] Active URL: ${activeUrl}`);

  const headers = {
    'Accept': 'application/json',
    'REPLIERS-API-KEY': apiKey
  };

  const [
    activeResponse, 
    activeUnderContractResponse, 
    pendingResponse, 
    closedResponse
  ] = await Promise.all([
    fetchWithRetry(activeUrl, headers),
    fetchWithRetry(activeUnderContractUrl, headers),
    fetchWithRetry(pendingUrl, headers),
    fetchWithRetry(closedUrl, headers)
  ]);
  
  console.log(`[Market Pulse DEBUG] API Response statuses: Active=${activeResponse.status}, UnderContract=${activeUnderContractResponse.status}, Pending=${pendingResponse.status}, Closed=${closedResponse.status}`);

  if (!activeResponse.ok) {
    const text = await activeResponse.text();
    console.error(`[Market Pulse DEBUG] Active API error: ${activeResponse.status} - ${text}`);
    throw new Error(`Active listings API error: ${activeResponse.status} - ${text.substring(0, 200)}`);
  }
  
  const activeData = await activeResponse.json();
  const activeUnderContractData = activeUnderContractResponse.ok ? await activeUnderContractResponse.json() : { count: 0 };
  const pendingData = pendingResponse.ok ? await pendingResponse.json() : { count: 0 };
  const closedData = closedResponse.ok ? await closedResponse.json() : { count: 0 };
  
  console.log(`[Market Pulse DEBUG] Raw API responses:`, {
    active: activeData?.count || 'undefined',
    activeUnderContract: activeUnderContractData?.count || 'undefined', 
    pending: pendingData?.count || 'undefined',
    closed: closedData?.count || 'undefined'
  });
  
  const active = activeData.count || 0;
  const activeUnderContract = activeUnderContractData.count || 0;
  const pending = pendingData.count || 0;
  const closed = closedData.count || 0;
  
  console.log(`[Market Pulse Service] ${officeName} - Active: ${active}, Under Contract: ${activeUnderContract}, Pending: ${pending}, Closed (30d): ${closed}`);

  const totalInventory = active + activeUnderContract + pending;

  return {
    totalProperties: totalInventory,
    active,
    activeUnderContract,
    pending,
    closed,
    lastUpdatedAt: new Date().toISOString(),
    officeName: officeName,
  };
}

export async function refreshAndCacheMarketPulse(): Promise<MarketPulseData> {
  console.log(`[Market Pulse Service] Refreshing and caching data...`);
  
  const data = await fetchMarketPulseFromAPI();
  
  const snapshot: InsertMarketPulseSnapshot = {
    totalProperties: data.totalProperties,
    active: data.active,
    activeUnderContract: data.activeUnderContract,
    pending: data.pending,
    closed: data.closed,
    lastUpdatedAt: new Date(data.lastUpdatedAt)
  };
  
  await storage.saveMarketPulseSnapshot(snapshot);
  console.log(`[Market Pulse Service] Data cached successfully at ${data.lastUpdatedAt}`);
  
  return data;
}

export async function getMarketPulseData(forceRefresh = false): Promise<MarketPulseData> {
  console.log(`[Market Pulse Service] Getting market data (forceRefresh: ${forceRefresh})`);
  
  if (forceRefresh) {
    console.log(`[Market Pulse Service] Force refresh requested, fetching fresh data from API`);
    return refreshAndCacheMarketPulse();
  }
  
  const cachedSnapshot = await storage.getLatestMarketPulseSnapshot();
  console.log(`[Market Pulse DEBUG] Cached snapshot:`, cachedSnapshot ? {
    totalProperties: cachedSnapshot.totalProperties,
    active: cachedSnapshot.active,
    activeUnderContract: cachedSnapshot.activeUnderContract,
    pending: cachedSnapshot.pending,
    closed: cachedSnapshot.closed,
    lastUpdatedAt: cachedSnapshot.lastUpdatedAt.toISOString()
  } : 'null');
  
  if (cachedSnapshot) {
    const ageMs = Date.now() - cachedSnapshot.lastUpdatedAt.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);
    
    console.log(`[Market Pulse Service] Returning cached data (age: ${ageHours.toFixed(1)}h)`);
    
    const result = {
      totalProperties: cachedSnapshot.totalProperties,
      active: cachedSnapshot.active,
      activeUnderContract: cachedSnapshot.activeUnderContract,
      pending: cachedSnapshot.pending,
      closed: cachedSnapshot.closed,
      lastUpdatedAt: cachedSnapshot.lastUpdatedAt.toISOString(),
      officeName: DEFAULT_OFFICE.name
    };
    
    console.log(`[Market Pulse DEBUG] Final result being returned:`, result);
    return result;
  }
  
  console.log(`[Market Pulse Service] No cached data found, fetching fresh data from API`);
  return refreshAndCacheMarketPulse();
}

export async function ensureFreshMarketPulseData(maxAgeHours = 24): Promise<void> {
  const cachedSnapshot = await storage.getLatestMarketPulseSnapshot();
  
  if (!cachedSnapshot) {
    console.log(`[Market Pulse Service] No cached data found, fetching fresh data...`);
    await refreshAndCacheMarketPulse();
    return;
  }
  
  const ageMs = Date.now() - cachedSnapshot.lastUpdatedAt.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  
  if (ageHours > maxAgeHours) {
    console.log(`[Market Pulse Service] Cached data is ${ageHours.toFixed(1)}h old (max: ${maxAgeHours}h), refreshing...`);
    await refreshAndCacheMarketPulse();
  } else {
    console.log(`[Market Pulse Service] Cached data is ${ageHours.toFixed(1)}h old, still fresh`);
  }
}
