/**
 * Recruitment API - Agent Profile & Search
 * 
 * Currently uses mock data until Repliers sold data access is granted.
 * TODO: Replace mock functions with Repliers API calls once available.
 */

import type { Express } from 'express';
import type { AgentProfile, AgentSearchFilters, AgentSearchResults, VolumeChartData } from '../shared/recruitment-types';

const REPLIERS_API_URL = process.env.REPLIERS_API_URL || 'https://api.repliers.io';
const REPLIERS_API_KEY = process.env.REPLIERS_API_KEY || '';

// Brokerage colors for the chart
const BROKERAGE_COLORS: Record<string, string> = {
  'Spyglass Realty': '#EF4923',
  'Compass RE Texas, LLC': '#000000',
  'Keller Williams': '#B5121B',
  'eXp Realty': '#2563EB',
  'Realty Austin': '#1B4D3E',
  'Kuper Sotheby\'s': '#002349',
  'default': '#6B7280',
};

function getBrokerageColor(name: string): string {
  for (const [key, color] of Object.entries(BROKERAGE_COLORS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) {
      return color;
    }
  }
  return BROKERAGE_COLORS.default;
}

/**
 * Generate mock agent data for development
 * This will be replaced with real Repliers API calls
 */
function generateMockAgent(licenseOrName: string): AgentProfile {
  const mockAgents: Record<string, Partial<AgentProfile>> = {
    'tracy': {
      name: 'Tracy Trevino',
      licenseNumber: 'TREC#0657808',
      mlsId: '657808',
      email: 'tracy@tracysellsaustin.com',
      phone: '(512) 784-6001',
      currentBrokerage: 'Compass RE Texas, LLC',
      brokerageHistory: [
        { name: 'Homecity Real Estate', startDate: '2015-01-01', endDate: '2017-06-30', transactionCount: 24, totalVolume: 8500000, isCurrent: false },
        { name: 'Home Beacon Realty, LLC', startDate: '2017-07-01', endDate: '2020-12-31', transactionCount: 45, totalVolume: 18000000, isCurrent: false },
        { name: 'Spyglass Realty', startDate: '2021-01-01', endDate: '2024-02-28', transactionCount: 62, totalVolume: 38000000, isCurrent: false },
        { name: 'Compass RE Texas, LLC', startDate: '2024-03-01', endDate: null, transactionCount: 18, totalVolume: 9500000, isCurrent: true },
      ],
      careerStats: {
        totalTransactions: 149,
        totalVolume: 74000000,
        avgPrice: 496644,
        yearsActive: 11,
        firstTransactionDate: '2015-03-15',
        lastTransactionDate: '2026-01-28',
      },
      annualProduction: [
        { year: 2016, transactions: 8, volume: 3200000, avgPrice: 400000, brokerage: 'Homecity Real Estate' },
        { year: 2017, transactions: 12, volume: 4800000, avgPrice: 400000, brokerage: 'Homecity Real Estate' },
        { year: 2018, transactions: 14, volume: 5600000, avgPrice: 400000, brokerage: 'Home Beacon Realty, LLC' },
        { year: 2019, transactions: 15, volume: 6000000, avgPrice: 400000, brokerage: 'Home Beacon Realty, LLC' },
        { year: 2020, transactions: 16, volume: 6400000, avgPrice: 400000, brokerage: 'Home Beacon Realty, LLC' },
        { year: 2021, transactions: 18, volume: 9000000, avgPrice: 500000, brokerage: 'Spyglass Realty' },
        { year: 2022, transactions: 22, volume: 13200000, avgPrice: 600000, brokerage: 'Spyglass Realty' },
        { year: 2023, transactions: 14, volume: 8400000, avgPrice: 600000, brokerage: 'Spyglass Realty' },
        { year: 2024, transactions: 12, volume: 6600000, avgPrice: 550000, brokerage: 'Compass RE Texas, LLC' },
        { year: 2025, transactions: 10, volume: 5500000, avgPrice: 550000, brokerage: 'Compass RE Texas, LLC' },
      ],
      specialization: {
        primaryCity: 'Austin, TX',
        propertyTypes: [
          { type: 'Single Family', percentage: 75 },
          { type: 'Condo', percentage: 20 },
          { type: 'Townhouse', percentage: 5 },
        ],
        priceRange: { min: 250000, max: 1200000, avg: 496644 },
        buyerVsSeller: { buyer: 45, seller: 55 },
      },
      signals: {
        recentBrokerageChange: true,
        volumeDecline: true,
        volumeGrowth: false,
        avgTimeAtBrokerage: 2.75,
        isTopProducer: true,
      },
    },
  };

  // Check if we have mock data for this query
  const searchKey = licenseOrName.toLowerCase();
  const matchedKey = Object.keys(mockAgents).find(k => 
    searchKey.includes(k) || 
    mockAgents[k].licenseNumber?.toLowerCase().includes(searchKey) ||
    mockAgents[k].mlsId?.includes(searchKey)
  );

  if (matchedKey) {
    const mock = mockAgents[matchedKey];
    return {
      agentId: `AGT-${mock.mlsId}`,
      mlsId: mock.mlsId!,
      licenseNumber: mock.licenseNumber!,
      name: mock.name!,
      email: mock.email || null,
      phone: mock.phone || null,
      photo: null,
      currentBrokerage: mock.currentBrokerage!,
      brokerageHistory: mock.brokerageHistory!,
      careerStats: mock.careerStats!,
      annualProduction: mock.annualProduction!,
      recentTransactions: [],
      specialization: mock.specialization!,
      signals: mock.signals!,
    };
  }

  // Generate random mock agent
  const brokerages = ['Compass RE Texas, LLC', 'Keller Williams Realty', 'eXp Realty', 'Realty Austin', 'Kuper Sotheby\'s'];
  const currentBrokerage = brokerages[Math.floor(Math.random() * brokerages.length)];
  
  return {
    agentId: `AGT-${Math.random().toString(36).substring(7)}`,
    mlsId: Math.floor(100000 + Math.random() * 900000).toString(),
    licenseNumber: `TREC#${Math.floor(100000 + Math.random() * 9900000)}`,
    name: licenseOrName || 'Sample Agent',
    email: null,
    phone: null,
    photo: null,
    currentBrokerage,
    brokerageHistory: [
      { name: currentBrokerage, startDate: '2022-01-01', endDate: null, transactionCount: 25, totalVolume: 12500000, isCurrent: true }
    ],
    careerStats: {
      totalTransactions: 25,
      totalVolume: 12500000,
      avgPrice: 500000,
      yearsActive: 4,
      firstTransactionDate: '2022-03-01',
      lastTransactionDate: '2026-01-15',
    },
    annualProduction: [
      { year: 2022, transactions: 5, volume: 2500000, avgPrice: 500000, brokerage: currentBrokerage },
      { year: 2023, transactions: 8, volume: 4000000, avgPrice: 500000, brokerage: currentBrokerage },
      { year: 2024, transactions: 7, volume: 3500000, avgPrice: 500000, brokerage: currentBrokerage },
      { year: 2025, transactions: 5, volume: 2500000, avgPrice: 500000, brokerage: currentBrokerage },
    ],
    recentTransactions: [],
    specialization: {
      primaryCity: 'Austin, TX',
      propertyTypes: [{ type: 'Single Family', percentage: 100 }],
      priceRange: { min: 300000, max: 700000, avg: 500000 },
      buyerVsSeller: { buyer: 50, seller: 50 },
    },
    signals: {
      recentBrokerageChange: false,
      volumeDecline: false,
      volumeGrowth: false,
      avgTimeAtBrokerage: 4,
      isTopProducer: false,
    },
  };
}

/**
 * Search agents - currently returns mock data
 * TODO: Integrate with Repliers sold data API
 */
async function searchAgents(filters: AgentSearchFilters): Promise<AgentSearchResults> {
  // Mock implementation
  const agents: AgentProfile[] = [];
  
  if (filters.query) {
    agents.push(generateMockAgent(filters.query));
  }
  
  return {
    agents,
    total: agents.length,
    page: filters.page || 1,
    pageSize: filters.pageSize || 20,
    hasMore: false,
  };
}

/**
 * Get agent profile by license number or MLS ID
 */
async function getAgentProfile(identifier: string): Promise<AgentProfile | null> {
  return generateMockAgent(identifier);
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
      const filters: AgentSearchFilters = {
        query: req.query.q as string,
        city: req.query.city as string,
        minVolume: req.query.minVolume ? Number(req.query.minVolume) : undefined,
        maxVolume: req.query.maxVolume ? Number(req.query.maxVolume) : undefined,
        brokerage: req.query.brokerage as string,
        excludeBrokerage: req.query.excludeBrokerage as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
        page: req.query.page ? Number(req.query.page) : 1,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : 20,
      };
      
      const results = await searchAgents(filters);
      res.json(results);
    } catch (error) {
      console.error('Agent search error:', error);
      res.status(500).json({ error: 'Failed to search agents' });
    }
  });

  // Get agent profile
  app.get('/api/recruitment/agents/:identifier', async (req, res) => {
    try {
      const { identifier } = req.params;
      const agent = await getAgentProfile(identifier);
      
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      res.json({
        agent,
        chartData: getVolumeChartData(agent),
      });
    } catch (error) {
      console.error('Get agent error:', error);
      res.status(500).json({ error: 'Failed to get agent profile' });
    }
  });

  // Check API status (for debugging data access)
  app.get('/api/recruitment/status', async (req, res) => {
    try {
      // Test Repliers API access
      const response = await fetch(`${REPLIERS_API_URL}/listings?resultsPerPage=1&status=S`, {
        headers: { 'REPLIERS-API-KEY': REPLIERS_API_KEY },
      });
      
      const hasSoldAccess = response.ok;
      const errorMsg = !response.ok ? await response.text() : null;
      
      res.json({
        repliersConnected: true,
        hasSoldDataAccess: hasSoldAccess,
        error: errorMsg,
        message: hasSoldAccess 
          ? 'Full data access available' 
          : 'Currently using mock data. Sold data access pending from Repliers.',
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
}
