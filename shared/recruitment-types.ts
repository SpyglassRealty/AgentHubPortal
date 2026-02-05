/**
 * Recruitment Module Types
 * 
 * Agent profile and transaction history for recruitment purposes.
 * Data structure designed to work with Repliers sold data once available.
 */

export interface AgentTransaction {
  mlsNumber: string;
  listDate: string;
  soldDate: string | null;
  listPrice: number;
  soldPrice: number | null;
  address: string;
  city: string;
  propertyType: string;
  role: 'listing' | 'buyer' | 'both';
  brokerage: string;
  status: 'active' | 'pending' | 'sold' | 'expired' | 'withdrawn';
}

export interface BrokerageHistory {
  name: string;
  startDate: string;
  endDate: string | null;
  transactionCount: number;
  totalVolume: number;
  isCurrent: boolean;
}

export interface AgentProfile {
  // Identifiers
  agentId: string;
  mlsId: string;
  licenseNumber: string; // TREC# - the golden key
  
  // Basic Info
  name: string;
  email: string | null;
  phone: string | null;
  photo: string | null;
  
  // Current Brokerage
  currentBrokerage: string;
  brokerageHistory: BrokerageHistory[];
  
  // Production Metrics
  careerStats: {
    totalTransactions: number;
    totalVolume: number;
    avgPrice: number;
    yearsActive: number;
    firstTransactionDate: string | null;
    lastTransactionDate: string | null;
  };
  
  // Annual breakdown
  annualProduction: {
    year: number;
    transactions: number;
    volume: number;
    avgPrice: number;
    brokerage: string;
  }[];
  
  // Recent transactions
  recentTransactions: AgentTransaction[];
  
  // Specializations (derived from data)
  specialization: {
    primaryCity: string;
    propertyTypes: { type: string; percentage: number }[];
    priceRange: { min: number; max: number; avg: number };
    buyerVsSeller: { buyer: number; seller: number }; // percentages
  };
  
  // Recruitment signals
  signals: {
    recentBrokerageChange: boolean;
    volumeDecline: boolean;
    volumeGrowth: boolean;
    avgTimeAtBrokerage: number; // years
    isTopProducer: boolean; // top 20% in market
  };
}

export interface AgentSearchFilters {
  query?: string; // name or license number
  city?: string;
  minVolume?: number;
  maxVolume?: number;
  minTransactions?: number;
  maxTransactions?: number;
  brokerage?: string;
  excludeBrokerage?: string; // e.g., exclude Spyglass agents
  yearsExperience?: number;
  recentBrokerageChange?: boolean; // changed in last 12 months
  sortBy?: 'volume' | 'transactions' | 'name' | 'recentActivity';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface AgentSearchResults {
  agents: AgentProfile[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Recruitment tracking
export interface RecruitmentProspect {
  id: string;
  agentId: string;
  licenseNumber: string;
  agentName: string;
  currentBrokerage: string;
  status: 'identified' | 'researching' | 'outreach' | 'meeting_scheduled' | 'negotiating' | 'offer_made' | 'hired' | 'declined' | 'not_interested';
  priority: 'low' | 'medium' | 'high' | 'hot';
  notes: string;
  lastContactDate: string | null;
  nextFollowUpDate: string | null;
  assignedTo: string | null; // user id
  createdAt: string;
  updatedAt: string;
  // Snapshot of metrics at time of identification
  snapshotVolume: number;
  snapshotTransactions: number;
}

// For the volume chart (like Courted's)
export interface VolumeChartData {
  year: number;
  volume: number;
  brokerage: string;
  brokerageColor?: string;
}
