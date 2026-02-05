/**
 * Recruitment API - Agent Profile & Search
 * 
 * Uses Repliers API for real agent transaction data.
 * Key query for sold data: status=U&lastStatus=Sld
 */

import type { Express } from 'express';
import type { AgentProfile, AgentSearchFilters, AgentSearchResults, VolumeChartData, BrokerageHistory } from '../shared/recruitment-types';

const REPLIERS_API_URL = process.env.REPLIERS_API_URL || 'https://api.repliers.io';
const REPLIERS_API_KEY = process.env.REPLIERS_API_KEY || '';

// Agent cache for fast search (Repliers /members doesn't support server-side search)
interface CachedAgent {
  agentId: string;
  name: string;
  nameLower: string;
  phones: string[];
  email?: string;
  brokerage: string;
  brokerageLower: string;
}

let agentCache: CachedAgent[] = [];
let cacheLoaded = false;
let cacheLoading = false;

async function loadAgentCache() {
  if (cacheLoading || cacheLoaded) return;
  cacheLoading = true;
  
  console.log('[Recruitment] Loading agent cache from Repliers API...');
  const allAgents: CachedAgent[] = [];
  let page = 1;
  const pageSize = 500;
  let totalPages = 1;
  
  try {
    while (page <= totalPages && page <= 30) { // Cap at 15,000 agents
      const data = await repliersRequest('/members', {
        resultsPerPage: String(pageSize),
        pageNum: String(page),
      });
      
      totalPages = data.numPages || 1;
      
      for (const m of data.members || []) {
        allAgents.push({
          agentId: m.agentId,
          name: m.name || '',
          nameLower: (m.name || '').toLowerCase(),
          phones: m.phones || [],
          email: m.email,
          brokerage: m.brokerage?.name || 'Unknown',
          brokerageLower: (m.brokerage?.name || '').toLowerCase(),
        });
      }
      
      page++;
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 50));
    }
    
    agentCache = allAgents;
    cacheLoaded = true;
    console.log(`[Recruitment] Agent cache loaded: ${agentCache.length} agents`);
  } catch (error) {
    console.error('[Recruitment] Failed to load agent cache:', error);
    cacheLoading = false;
  }
}

function searchCachedAgents(query: string, limit = 20): CachedAgent[] {
  const searchTerms = query.toLowerCase().split(/\s+/);
  return agentCache
    .filter(agent => searchTerms.every(term => 
      agent.nameLower.includes(term) || agent.brokerageLower.includes(term)
    ))
    .slice(0, limit);
}

// Brokerage colors for the chart
const BROKERAGE_COLORS: Record<string, string> = {
  'Spyglass Realty': '#EF4923',
  'Compass': '#000000',
  'Keller Williams': '#B5121B',
  'eXp Realty': '#2563EB',
  'Realty Austin': '#1B4D3E',
  'Kuper Sotheby': '#002349',
  'Coldwell Banker': '#002878',
  'RE/MAX': '#DC1C2E',
  'Century 21': '#A98A4E',
  'Berkshire Hathaway': '#522D6D',
  'default': '#6B7280',
};

function getBrokerageColor(name: string): string {
  const nameLower = name.toLowerCase();
  for (const [key, color] of Object.entries(BROKERAGE_COLORS)) {
    if (nameLower.includes(key.toLowerCase())) {
      return color;
    }
  }
  return BROKERAGE_COLORS.default;
}

/**
 * Make request to Repliers API
 */
async function repliersRequest(endpoint: string, params: Record<string, string> = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = `${REPLIERS_API_URL}${endpoint}${queryString ? '?' + queryString : ''}`;
  
  const response = await fetch(url, {
    headers: {
      'REPLIERS-API-KEY': REPLIERS_API_KEY,
    },
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Repliers API error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

/**
 * Search for agent by name using /members endpoint
 */
async function searchAgentByName(name: string): Promise<any[]> {
  const data = await repliersRequest('/members', {
    name,
    resultsPerPage: '20',
  });
  return data.members || [];
}

/**
 * Get agent's sold transactions
 */
async function getAgentSoldTransactions(agentId: string, limit = 500): Promise<any[]> {
  const data = await repliersRequest('/listings', {
    agentId,
    status: 'U',
    lastStatus: 'Sld',
    resultsPerPage: String(limit),
    sortBy: 'soldDateDesc',
  });
  return data.listings || [];
}

/**
 * Get agent's active listings
 */
async function getAgentActiveListings(agentId: string): Promise<number> {
  const data = await repliersRequest('/listings', {
    agentId,
    status: 'A',
    listings: 'false',
  });
  return data.count || 0;
}

/**
 * Build agent profile from transactions
 */
function buildAgentProfile(agent: any, transactions: any[]): AgentProfile {
  // Group transactions by year and brokerage
  const yearlyData: Record<number, { transactions: number; volume: number; brokerage: string }> = {};
  const brokerageStints: Record<string, { startDate: string; endDate: string | null; transactions: number; volume: number }> = {};
  
  let currentBrokerage = agent.brokerage?.name || 'Unknown';
  let firstTransactionDate: string | null = null;
  let lastTransactionDate: string | null = null;
  let totalVolume = 0;
  let totalTransactions = transactions.length;
  
  // Process each transaction
  for (const tx of transactions) {
    const soldDate = tx.soldDate ? new Date(tx.soldDate) : null;
    const soldPrice = tx.soldPrice || 0;
    const txBrokerage = tx.agents?.[0]?.brokerage?.name || 'Unknown';
    
    if (soldDate) {
      const year = soldDate.getFullYear();
      const dateStr = soldDate.toISOString().split('T')[0];
      
      // Track first/last transaction
      if (!firstTransactionDate || dateStr < firstTransactionDate) {
        firstTransactionDate = dateStr;
      }
      if (!lastTransactionDate || dateStr > lastTransactionDate) {
        lastTransactionDate = dateStr;
      }
      
      // Yearly aggregation
      if (!yearlyData[year]) {
        yearlyData[year] = { transactions: 0, volume: 0, brokerage: txBrokerage };
      }
      yearlyData[year].transactions++;
      yearlyData[year].volume += soldPrice;
      
      // Brokerage tracking
      if (!brokerageStints[txBrokerage]) {
        brokerageStints[txBrokerage] = { 
          startDate: dateStr, 
          endDate: dateStr, 
          transactions: 0, 
          volume: 0 
        };
      }
      if (dateStr < brokerageStints[txBrokerage].startDate) {
        brokerageStints[txBrokerage].startDate = dateStr;
      }
      if (dateStr > (brokerageStints[txBrokerage].endDate || '')) {
        brokerageStints[txBrokerage].endDate = dateStr;
      }
      brokerageStints[txBrokerage].transactions++;
      brokerageStints[txBrokerage].volume += soldPrice;
      
      totalVolume += soldPrice;
    }
  }
  
  // Build brokerage history sorted by start date
  const brokerageHistory: BrokerageHistory[] = Object.entries(brokerageStints)
    .map(([name, data]) => ({
      name,
      startDate: data.startDate,
      endDate: name === currentBrokerage ? null : data.endDate,
      transactionCount: data.transactions,
      totalVolume: data.volume,
      isCurrent: name === currentBrokerage,
    }))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  
  // Build annual production sorted by year
  const annualProduction = Object.entries(yearlyData)
    .map(([year, data]) => ({
      year: parseInt(year),
      transactions: data.transactions,
      volume: data.volume,
      avgPrice: data.transactions > 0 ? Math.round(data.volume / data.transactions) : 0,
      brokerage: data.brokerage,
    }))
    .sort((a, b) => a.year - b.year);
  
  // Calculate years active
  const yearsActive = firstTransactionDate && lastTransactionDate
    ? Math.ceil((new Date(lastTransactionDate).getTime() - new Date(firstTransactionDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 0;
  
  // Calculate specialization from transactions
  const cities: Record<string, number> = {};
  const propertyTypes: Record<string, number> = {};
  let buyerCount = 0;
  let sellerCount = 0;
  let minPrice = Infinity;
  let maxPrice = 0;
  
  for (const tx of transactions) {
    const city = tx.address?.city || 'Unknown';
    const propType = tx.details?.propertyType || tx.details?.style || 'Other';
    const price = tx.soldPrice || 0;
    
    cities[city] = (cities[city] || 0) + 1;
    propertyTypes[propType] = (propertyTypes[propType] || 0) + 1;
    
    if (price > 0) {
      minPrice = Math.min(minPrice, price);
      maxPrice = Math.max(maxPrice, price);
    }
    
    // Rough buyer/seller estimation based on agent position
    // In a full implementation, you'd check listing vs buyer agent
    sellerCount++; // Default to seller since we're querying by listing agent
  }
  
  const primaryCity = Object.entries(cities).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
  const propTypeList = Object.entries(propertyTypes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => ({
      type,
      percentage: Math.round((count / totalTransactions) * 100),
    }));
  
  // Determine signals
  const recentYear = new Date().getFullYear();
  const lastYearVolume = yearlyData[recentYear - 1]?.volume || 0;
  const twoYearsAgoVolume = yearlyData[recentYear - 2]?.volume || 0;
  const volumeDecline = lastYearVolume < twoYearsAgoVolume * 0.8;
  const volumeGrowth = lastYearVolume > twoYearsAgoVolume * 1.2;
  
  // Check for recent brokerage change (within last 12 months)
  const recentBrokerageChange = brokerageHistory.some(b => {
    if (!b.startDate) return false;
    const startDate = new Date(b.startDate);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return startDate > oneYearAgo && !b.isCurrent;
  });
  
  const avgTimeAtBrokerage = brokerageHistory.length > 0
    ? brokerageHistory.reduce((sum, b) => {
        const start = new Date(b.startDate);
        const end = b.endDate ? new Date(b.endDate) : new Date();
        return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
      }, 0) / brokerageHistory.length
    : 0;
  
  return {
    agentId: agent.agentId,
    mlsId: agent.boardAgentId || agent.agentId,
    licenseNumber: `MLS#${agent.boardAgentId || agent.agentId}`, // Would need TREC lookup for actual license
    name: agent.name || 'Unknown',
    email: agent.email || null,
    phone: agent.phones?.[0] || null,
    photo: agent.photo?.large || agent.photo?.small || null,
    currentBrokerage,
    brokerageHistory,
    careerStats: {
      totalTransactions,
      totalVolume,
      avgPrice: totalTransactions > 0 ? Math.round(totalVolume / totalTransactions) : 0,
      yearsActive,
      firstTransactionDate,
      lastTransactionDate,
    },
    annualProduction,
    recentTransactions: transactions.slice(0, 10).map(tx => ({
      mlsNumber: tx.mlsNumber,
      listDate: tx.listDate,
      soldDate: tx.soldDate,
      listPrice: tx.listPrice,
      soldPrice: tx.soldPrice,
      address: `${tx.address?.streetNumber || ''} ${tx.address?.streetName || ''} ${tx.address?.streetSuffix || ''}`.trim(),
      city: tx.address?.city || '',
      propertyType: tx.details?.propertyType || tx.details?.style || 'Unknown',
      role: 'listing' as const,
      brokerage: tx.agents?.[0]?.brokerage?.name || 'Unknown',
      status: tx.lastStatus === 'Sld' ? 'sold' as const : 'active' as const,
    })),
    specialization: {
      primaryCity,
      propertyTypes: propTypeList,
      priceRange: {
        min: minPrice === Infinity ? 0 : minPrice,
        max: maxPrice,
        avg: totalTransactions > 0 ? Math.round(totalVolume / totalTransactions) : 0,
      },
      buyerVsSeller: { buyer: 40, seller: 60 }, // Approximation
    },
    signals: {
      recentBrokerageChange,
      volumeDecline,
      volumeGrowth,
      avgTimeAtBrokerage,
      isTopProducer: totalVolume > 10000000, // $10M+ career = top producer
    },
  };
}

/**
 * Get volume chart data for an agent
 */
function getVolumeChartData(agent: AgentProfile): VolumeChartData[] {
  return agent.annualProduction.map(year => ({
    year: year.year,
    volume: year.volume,
    brokerage: year.brokerage,
    brokerageColor: getBrokerageColor(year.brokerage),
  }));
}

export function registerRecruitmentRoutes(app: Express) {
  // Search agents
  app.get('/api/recruitment/agents/search', async (req, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query || query.length < 2) {
        return res.json({ agents: [], total: 0, page: 1, pageSize: 20, hasMore: false });
      }
      
      // Ensure cache is loaded
      if (!cacheLoaded) {
        await loadAgentCache();
      }
      
      // Search cached agents
      const matchedAgents = searchCachedAgents(query, 20);
      
      if (matchedAgents.length === 0) {
        return res.json({ 
          agents: [], 
          total: 0, 
          page: 1, 
          pageSize: 20, 
          hasMore: false,
          cacheStatus: { loaded: cacheLoaded, count: agentCache.length }
        });
      }
      
      // For each matched agent, get quick stats (parallel, limited)
      const agentSummaries = await Promise.all(
        matchedAgents.slice(0, 10).map(async (agent) => {
          try {
            // Quick count of sold listings
            const countData = await repliersRequest('/listings', {
              agentId: agent.agentId,
              status: 'U',
              lastStatus: 'Sld',
              listings: 'false',
            });
            
            return {
              agentId: agent.agentId,
              mlsId: agent.agentId,
              licenseNumber: `MLS#${agent.agentId}`,
              name: agent.name,
              email: agent.email || null,
              phone: agent.phones?.[0] || null,
              photo: null,
              currentBrokerage: agent.brokerage,
              transactionCount: countData.count || 0,
            };
          } catch (e) {
            return {
              agentId: agent.agentId,
              mlsId: agent.agentId,
              licenseNumber: `MLS#${agent.agentId}`,
              name: agent.name,
              email: agent.email || null,
              phone: agent.phones?.[0] || null,
              photo: null,
              currentBrokerage: agent.brokerage,
              transactionCount: 0,
            };
          }
        })
      );
      
      res.json({
        agents: agentSummaries,
        total: matchedAgents.length,
        page: 1,
        pageSize: 20,
        hasMore: matchedAgents.length > 10,
        cacheStatus: { loaded: cacheLoaded, count: agentCache.length }
      });
    } catch (error) {
      console.error('Agent search error:', error);
      res.status(500).json({ error: 'Failed to search agents' });
    }
  });

  // Get agent profile
  app.get('/api/recruitment/agents/:identifier', async (req, res) => {
    try {
      const { identifier } = req.params;
      
      // First, find the agent
      let agent: any = null;
      
      // Try searching by name or ID
      const members = await searchAgentByName(identifier);
      if (members.length > 0) {
        agent = members[0];
      } else {
        // Try as agentId directly
        const listings = await repliersRequest('/listings', {
          agentId: identifier,
          status: 'U',
          lastStatus: 'Sld',
          resultsPerPage: '1',
        });
        if (listings.listings?.[0]?.agents?.[0]) {
          agent = listings.listings[0].agents[0];
          agent.agentId = identifier;
        }
      }
      
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      // Get full transaction history
      const transactions = await getAgentSoldTransactions(agent.agentId, 500);
      
      // Build profile
      const profile = buildAgentProfile(agent, transactions);
      
      res.json({
        agent: profile,
        chartData: getVolumeChartData(profile),
      });
    } catch (error) {
      console.error('Get agent error:', error);
      res.status(500).json({ error: 'Failed to get agent profile' });
    }
  });

  // Check API status
  app.get('/api/recruitment/status', async (req, res) => {
    try {
      // Test sold data access
      const response = await repliersRequest('/listings', {
        status: 'U',
        lastStatus: 'Sld',
        resultsPerPage: '1',
      });
      
      res.json({
        repliersConnected: true,
        hasSoldDataAccess: true,
        totalSoldListings: response.count,
        agentCacheLoaded: cacheLoaded,
        agentCacheCount: agentCache.length,
        message: cacheLoaded 
          ? 'Full data access available' 
          : 'Loading agent cache... First search may be slow.',
      });
    } catch (error) {
      res.json({
        repliersConnected: false,
        hasSoldDataAccess: false,
        error: String(error),
        message: 'Cannot connect to Repliers API',
      });
    }
  });

  // Start loading agent cache in background
  loadAgentCache().catch(console.error);
}
