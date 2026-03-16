import { NextRequest, NextResponse } from 'next/server';

const MLS_GRID_BBO = process.env.MLS_GRID_BBO || 'c6bb3e07-6d5c-4c0d-a9c3-0f088f0ad717';
const MLS_GRID_BASE_URL = process.env.MLS_GRID_BASE_URL || 'https://api-prod.mlsgrid.com/v2';
const REPLIERS_API_KEY = process.env.REPLIERS_API_KEY || 'sSOnHkc9wVilKtkd7N2qRs2R2WMH00';

// Rate limiting: max 2.0 RPS per MLS Grid TOS - use 700ms intervals (1.43 RPS)
const RATE_LIMIT_DELAY = 700;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface AgentSearchResult {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  office?: string;
  officeName?: string;
  licenseNumber?: string;
  mlsId?: string;
  source: 'mls-grid' | 'repliers-enrichment';
  photoUrl?: string;
  bio?: string;
  specialties?: string[];
  languages?: string[];
  website?: string;
  socialMedia?: {
    facebook?: string;
    linkedin?: string;
    instagram?: string;
  };
  stats?: {
    totalSold?: number;
    totalVolume?: number;
    averagePrice?: number;
    yearsActive?: string[];
    lastTransactionDate?: string;
  };
}

interface MLSGridMember {
  MemberKey: string;
  MemberMlsId: string;
  MemberFullName: string;
  MemberEmail?: string;
  MemberPhoneNumber?: string;
  MemberOfficeKey?: string;
  MemberOfficeName?: string;
  MemberLicenseNumber?: string;
}

interface MLSGridProperty {
  ListAgentFullName?: string;
  ListAgentMlsId?: string;
  ListOfficeName?: string;
  ClosePrice?: number;
  CloseDate?: string;
  UnparsedAddress?: string;
}

async function searchMLSGridMembers(query: string): Promise<MLSGridMember[]> {
  try {
    console.log(`[MLS Grid] Searching members for: "${query}"`);
    
    // Search for members with name containing the query
    const response = await fetch(
      `${MLS_GRID_BASE_URL}/Members?$filter=contains(MemberFullName,'${encodeURIComponent(query)}')&$top=50`,
      {
        headers: {
          'Authorization': `Bearer ${MLS_GRID_BBO}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error(`[MLS Grid] Members search failed: ${response.status}`);
      return [];
    }

    const data = await response.json();
    console.log(`[MLS Grid] Found ${data.value?.length || 0} members`);
    return data.value || [];
  } catch (error) {
    console.error('[MLS Grid] Members search error:', error);
    return [];
  }
}

async function searchMLSGridPropertiesForAgent(query: string): Promise<{ agents: Set<string>, properties: MLSGridProperty[] }> {
  try {
    console.log(`[MLS Grid] Searching properties for agent: "${query}"`);
    
    // Search properties where the listing agent name contains the query terms
    const queryParts = query.split(' ').filter(part => part.length > 2);
    if (queryParts.length === 0) return { agents: new Set(), properties: [] };
    
    // Build filter for name parts (case-insensitive contains)
    const nameFilters = queryParts.map(part => `contains(ListAgentFullName,'${encodeURIComponent(part)}')`);
    const filterString = nameFilters.join(' and ');
    
    const response = await fetch(
      `${MLS_GRID_BASE_URL}/Properties?$filter=${encodeURIComponent(filterString)}&$select=ListAgentFullName,ListAgentMlsId,ListOfficeName,ClosePrice,CloseDate,UnparsedAddress&$top=100`,
      {
        headers: {
          'Authorization': `Bearer ${MLS_GRID_BBO}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error(`[MLS Grid] Properties search failed: ${response.status}`);
      return { agents: new Set(), properties: [] };
    }

    const data = await response.json();
    const properties = data.value || [];
    
    // Extract unique agent names that match our query
    const agents = new Set<string>();
    properties.forEach((property: MLSGridProperty) => {
      if (property.ListAgentFullName) {
        const agentName = property.ListAgentFullName.toLowerCase();
        const queryLower = query.toLowerCase();
        
        // Check if all query parts are found in the agent name
        const matchesAll = queryParts.every(part => 
          agentName.includes(part.toLowerCase())
        );
        
        if (matchesAll) {
          agents.add(property.ListAgentFullName);
        }
      }
    });
    
    console.log(`[MLS Grid] Found ${properties.length} properties with ${agents.size} unique matching agents`);
    return { agents, properties };
  } catch (error) {
    console.error('[MLS Grid] Properties search error:', error);
    return { agents: new Set(), properties: [] };
  }
}

async function enrichWithRepliers(agentName: string, agentMlsId?: string): Promise<Partial<AgentSearchResult>> {
  try {
    // Rate limit compliance: wait before Repliers API call
    await sleep(RATE_LIMIT_DELAY);
    
    console.log(`[Repliers] Enriching data for: "${agentName}"`);
    
    // Search Repliers for additional agent data and statistics
    const response = await fetch(
      `https://api.repliers.io/listings?agentId=${encodeURIComponent(agentMlsId || agentName)}&status=U&lastStatus=Sld&statistics=cnt-closed,sum-soldPrice,avg-soldPrice&resultsPerPage=1`,
      {
        headers: {
          'REPLIERS-API-KEY': REPLIERS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.log(`[Repliers] Enrichment failed for ${agentName}: ${response.status}`);
      return {};
    }

    const data = await response.json();
    const stats = data.statistics || {};
    
    return {
      stats: {
        totalSold: data.count || 0,
        totalVolume: stats.soldPrice?.sum || 0,
        averagePrice: stats.soldPrice?.avg || 0,
        yearsActive: stats.closed?.yr ? Object.keys(stats.closed.yr).sort() : [],
      }
    };
  } catch (error) {
    console.error(`[Repliers] Enrichment error for ${agentName}:`, error);
    return {};
  }
}

async function getAgentStatsFromProperties(agentMlsId: string, properties: MLSGridProperty[]): Promise<Partial<AgentSearchResult>> {
  // Calculate stats from MLS Grid properties data
  const agentProperties = properties.filter(p => p.ListAgentMlsId === agentMlsId);
  const closedProperties = agentProperties.filter(p => p.ClosePrice && p.CloseDate);
  
  if (closedProperties.length === 0) {
    return { stats: { totalSold: 0, totalVolume: 0, averagePrice: 0 } };
  }
  
  const totalVolume = closedProperties.reduce((sum, p) => sum + (p.ClosePrice || 0), 0);
  const averagePrice = totalVolume / closedProperties.length;
  
  // Extract years from close dates
  const years = [...new Set(closedProperties.map(p => {
    if (!p.CloseDate) return null;
    try {
      return new Date(p.CloseDate).getFullYear().toString();
    } catch {
      return null;
    }
  }).filter(Boolean))].sort();
  
  const lastTransactionDate = closedProperties
    .map(p => p.CloseDate)
    .filter(Boolean)
    .sort()
    .reverse()[0];
  
  return {
    stats: {
      totalSold: closedProperties.length,
      totalVolume: Math.round(totalVolume),
      averagePrice: Math.round(averagePrice),
      yearsActive: years as string[],
      lastTransactionDate
    }
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || searchParams.get('name') || '';
  
  if (!query || query.length < 2) {
    return NextResponse.json({
      agents: [],
      message: 'Query must be at least 2 characters long',
      source: 'mls-grid'
    });
  }

  console.log(`[Agent Search] Starting search for: "${query}"`);
  
  try {
    const results: AgentSearchResult[] = [];
    const processedAgents = new Set<string>();

    // Step 1: Search MLS Grid Members API
    await sleep(RATE_LIMIT_DELAY); // Rate limit compliance
    const members = await searchMLSGridMembers(query);
    
    for (const member of members) {
      if (processedAgents.has(member.MemberMlsId)) continue;
      
      const agent: AgentSearchResult = {
        id: member.MemberKey,
        name: member.MemberFullName,
        email: member.MemberEmail,
        phone: member.MemberPhoneNumber,
        office: member.MemberOfficeKey,
        officeName: member.MemberOfficeName,
        licenseNumber: member.MemberLicenseNumber,
        mlsId: member.MemberMlsId,
        source: 'mls-grid'
      };
      
      // Try to enrich with Repliers transaction stats (but don't block on failure)
      try {
        const enrichment = await enrichWithRepliers(member.MemberFullName, member.MemberMlsId);
        Object.assign(agent, enrichment);
      } catch (error) {
        console.log(`[Repliers] Enrichment skipped for ${member.MemberFullName}`);
      }
      
      results.push(agent);
      processedAgents.add(member.MemberMlsId);
    }

    // Step 2: Fallback - Search Properties by listing agent name
    if (results.length === 0) {
      await sleep(RATE_LIMIT_DELAY); // Rate limit compliance
      const { agents: foundAgents, properties } = await searchMLSGridPropertiesForAgent(query);
      
      for (const agentName of foundAgents) {
        if (processedAgents.has(agentName)) continue;
        
        // Find properties for this agent to get MLS ID and stats
        const agentProperties = properties.filter(p => 
          p.ListAgentFullName && 
          p.ListAgentFullName.toLowerCase() === agentName.toLowerCase()
        );
        
        const firstProperty = agentProperties[0];
        const agentMlsId = firstProperty?.ListAgentMlsId || agentName;
        
        const agent: AgentSearchResult = {
          id: agentMlsId,
          name: agentName,
          mlsId: firstProperty?.ListAgentMlsId,
          officeName: firstProperty?.ListOfficeName,
          source: 'mls-grid'
        };
        
        // Get stats from properties data
        if (firstProperty?.ListAgentMlsId) {
          const propertyStats = await getAgentStatsFromProperties(firstProperty.ListAgentMlsId, properties);
          Object.assign(agent, propertyStats);
        }
        
        // Try to enrich with additional Repliers data
        try {
          const enrichment = await enrichWithRepliers(agentName, agentMlsId);
          Object.assign(agent, enrichment);
        } catch (error) {
          console.log(`[Repliers] Enrichment skipped for ${agentName}`);
        }
        
        results.push(agent);
        processedAgents.add(agentName);
      }
    }

    console.log(`[Agent Search] Completed. Found ${results.length} agents`);
    
    return NextResponse.json({
      agents: results,
      count: results.length,
      query: query,
      source: 'mls-grid',
      message: results.length === 0 ? 'No agents found matching your search' : `Found ${results.length} agent(s)`
    });

  } catch (error) {
    console.error('[Agent Search] Error:', error);
    
    return NextResponse.json({
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      agents: [],
      count: 0
    }, { status: 500 });
  }
}

// POST method for more complex search criteria
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      city, 
      state, 
      office, 
      licenseNumber,
      minTransactions,
      maxTransactions,
      minVolume,
      maxVolume 
    } = body;

    if (!name || name.length < 2) {
      return NextResponse.json({
        error: 'Name is required and must be at least 2 characters',
        agents: [],
        count: 0
      }, { status: 400 });
    }

    // Use the same search logic as GET but with additional filtering
    const searchParams = new URLSearchParams({ name });
    const mockRequest = new NextRequest(`${request.url}?${searchParams}`);
    const searchResults = await GET(mockRequest);
    const data = await searchResults.json();

    // Apply additional filters
    let filteredAgents = data.agents || [];

    if (office) {
      filteredAgents = filteredAgents.filter((agent: AgentSearchResult) => 
        agent.officeName?.toLowerCase().includes(office.toLowerCase())
      );
    }

    if (licenseNumber) {
      filteredAgents = filteredAgents.filter((agent: AgentSearchResult) => 
        agent.licenseNumber?.includes(licenseNumber)
      );
    }

    if (minTransactions !== undefined) {
      filteredAgents = filteredAgents.filter((agent: AgentSearchResult) => 
        (agent.stats?.totalSold || 0) >= minTransactions
      );
    }

    if (maxTransactions !== undefined) {
      filteredAgents = filteredAgents.filter((agent: AgentSearchResult) => 
        (agent.stats?.totalSold || 0) <= maxTransactions
      );
    }

    if (minVolume !== undefined) {
      filteredAgents = filteredAgents.filter((agent: AgentSearchResult) => 
        (agent.stats?.totalVolume || 0) >= minVolume
      );
    }

    if (maxVolume !== undefined) {
      filteredAgents = filteredAgents.filter((agent: AgentSearchResult) => 
        (agent.stats?.totalVolume || 0) <= maxVolume
      );
    }

    return NextResponse.json({
      agents: filteredAgents,
      count: filteredAgents.length,
      query: name,
      filters: { city, state, office, licenseNumber, minTransactions, maxTransactions, minVolume, maxVolume },
      source: 'mls-grid',
      message: filteredAgents.length === 0 ? 'No agents found matching your criteria' : `Found ${filteredAgents.length} agent(s)`
    });

  } catch (error) {
    console.error('[Agent Search POST] Error:', error);
    
    return NextResponse.json({
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      agents: [],
      count: 0
    }, { status: 500 });
  }
}