const REPLIERS_API_KEY = process.env.REPLIERS_API_KEY;
const REPLIERS_BASE_URL = 'https://api.repliers.io';

async function testOfficeQuery() {
  console.log('='.repeat(60));
  console.log('TESTING REPLIERS API - OFFICE 5220 QUERY');
  console.log('='.repeat(60));

  if (!REPLIERS_API_KEY) {
    console.error('ERROR: REPLIERS_API_KEY not set');
    return;
  }

  // First, get a few listings and find ones from Spyglass Realty
  console.log('\n--- Searching for Spyglass Realty in listing data ---');
  
  const searchParams = new URLSearchParams({
    'OriginatingSystemName': 'ACTRIS',
    'standardStatus': 'Active',
    'resultsPerPage': '100',
  });

  try {
    const response = await fetch(`${REPLIERS_BASE_URL}/listings?${searchParams}`, {
      headers: {
        'REPLIERS-API-KEY': REPLIERS_API_KEY,
        'Content-Type': 'application/json',
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`Total Active listings: ${data.count}`);
      
      // Find listings with "Spyglass" in office info
      const spyglassListings = data.listings?.filter((listing: any) => {
        const officeName = listing.office?.brokerageName || '';
        const agentBrokerage = listing.agents?.[0]?.brokerage?.name || '';
        return officeName.toLowerCase().includes('spyglass') || 
               agentBrokerage.toLowerCase().includes('spyglass');
      }) || [];
      
      console.log(`\nListings with Spyglass in office data (from first 100): ${spyglassListings.length}`);
      
      if (spyglassListings.length > 0) {
        console.log('\n--- Spyglass Listing Sample ---');
        const sample = spyglassListings[0];
        console.log('Office object:', JSON.stringify(sample.office, null, 2));
        console.log('Agents:', JSON.stringify(sample.agents, null, 2));
        console.log('Address:', sample.address?.full || `${sample.address?.streetNumber} ${sample.address?.streetName}`);
        console.log('MLS#:', sample.mlsNumber);
        
        // Look for any office ID fields
        console.log('\nAll top-level fields:', Object.keys(sample).join(', '));
        
        const officeFields = Object.entries(sample).filter(([key]) => 
          key.toLowerCase().includes('office')
        );
        console.log('\nOffice-related fields:');
        officeFields.forEach(([key, value]) => {
          console.log(`  ${key}: ${JSON.stringify(value)}`);
        });
        
        // Check agent officeId
        if (sample.agents?.[0]?.officeId) {
          console.log(`\nAgent officeId: ${sample.agents[0].officeId}`);
          console.log(`Agent boardOfficeId: ${sample.agents[0].boardOfficeId}`);
        }
      }
      
      // Now let's try different office-related parameter names
      console.log('\n\n--- Testing different office query parameters ---');
      
      // Get a known Spyglass officeId from the agents data
      let testOfficeId = '';
      let testBoardOfficeId = '';
      
      for (const listing of data.listings || []) {
        if (listing.office?.brokerageName?.toLowerCase().includes('spyglass') ||
            listing.agents?.[0]?.brokerage?.name?.toLowerCase().includes('spyglass')) {
          testOfficeId = listing.agents?.[0]?.officeId || '';
          testBoardOfficeId = listing.agents?.[0]?.boardOfficeId || '';
          break;
        }
      }
      
      if (testOfficeId) {
        console.log(`\nFound Spyglass officeId: ${testOfficeId}`);
        console.log(`Found Spyglass boardOfficeId: ${testBoardOfficeId}`);
        
        // Try query with these IDs
        const testQueries = [
          { field: 'officeId', value: testOfficeId },
          { field: 'boardOfficeId', value: testBoardOfficeId },
          { field: 'agents.officeId', value: testOfficeId },
          { field: 'listOfficeKey', value: testBoardOfficeId },
        ];
        
        for (const query of testQueries) {
          if (!query.value) continue;
          
          const params = new URLSearchParams({
            'OriginatingSystemName': 'ACTRIS',
            'standardStatus': 'Active',
            'resultsPerPage': '5',
          });
          params.append(query.field, query.value);
          
          console.log(`\nTrying ${query.field}=${query.value}...`);
          
          const resp = await fetch(`${REPLIERS_BASE_URL}/listings?${params}`, {
            headers: {
              'REPLIERS-API-KEY': REPLIERS_API_KEY,
              'Content-Type': 'application/json',
            }
          });
          
          if (resp.ok) {
            const d = await resp.json();
            console.log(`  Count: ${d.count}`);
            
            // Check if results are actually from Spyglass
            if (d.listings?.length > 0) {
              const firstOffice = d.listings[0].office?.brokerageName || d.listings[0].agents?.[0]?.brokerage?.name;
              console.log(`  First result brokerage: ${firstOffice}`);
            }
          } else {
            console.log(`  Error: ${resp.status}`);
          }
        }
      }
      
      // Try the "5220" office code with different field names
      console.log('\n\n--- Testing "5220" office code with different fields ---');
      
      const officeCodeTests = [
        'listOfficeKey',
        'ListOfficeKey',
        'listOfficeMlsId',
        'ListOfficeMlsId',
        'officeKey',
        'boardOfficeId',
      ];
      
      for (const field of officeCodeTests) {
        const params = new URLSearchParams({
          'OriginatingSystemName': 'ACTRIS',
          'standardStatus': 'Active',
          'resultsPerPage': '5',
        });
        params.append(field, '5220');
        
        const resp = await fetch(`${REPLIERS_BASE_URL}/listings?${params}`, {
          headers: {
            'REPLIERS-API-KEY': REPLIERS_API_KEY,
            'Content-Type': 'application/json',
          }
        });
        
        if (resp.ok) {
          const d = await resp.json();
          // Check if this is different from baseline (26936)
          const isFiltered = d.count !== data.count;
          console.log(`${field}=5220: count=${d.count} ${isFiltered ? '✅ FILTERED!' : '(same as baseline)'}`);
          
          if (isFiltered && d.listings?.length > 0) {
            const firstOffice = d.listings[0].office?.brokerageName || d.listings[0].agents?.[0]?.brokerage?.name;
            console.log(`  First result brokerage: ${firstOffice}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Query error:', error);
  }

  console.log('\n' + '='.repeat(60));
  console.log('QUERY COMPLETE');
  console.log('='.repeat(60));
}

testOfficeQuery();
