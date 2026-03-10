#!/usr/bin/env node

/**
 * Test Mission Control's API endpoint directly on Render
 */

console.log('🧪 Testing Mission Control API on Render\n');

async function testCommunityListings() {
  // Test the listings endpoint with different community IDs
  const testCommunityIds = [1, 2, 3, 4, 5];
  
  for (const communityId of testCommunityIds) {
    console.log(`🔍 Testing community ID ${communityId}:`);
    
    try {
      const url = `https://missioncontrol-tjfm.onrender.com/api/listings/by-polygon?communityId=${communityId}`;
      console.log(`   URL: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      console.log(`   Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`   ❌ Error: ${errorText}`);
        console.log('');
        continue;
      }

      const data = await response.json();
      
      if (data.listings && data.listings.length > 0) {
        console.log(`   ✅ SUCCESS! Found ${data.count || data.listings.length} listings`);
        console.log(`   Community: ${data.communityName || 'Unknown'}`);
        console.log(`   Sample listing: MLS #${data.listings[0].mlsNumber} - ${data.listings[0].address}`);
        console.log('   🎉 IDX widget should work for this community!');
        return { success: true, communityId, data };
      } else {
        console.log(`   ⚠️  No listings found (community may not have polygon)`);
      }

    } catch (error) {
      console.log(`   💥 Error: ${error.message}`);
    }
    
    console.log('');
  }
  
  return { success: false };
}

async function testHealthEndpoints() {
  console.log('🏥 Testing basic health endpoints:\n');
  
  const endpoints = [
    '/api/health',
    '/api/communities',
    '/',
  ];
  
  for (const endpoint of endpoints) {
    try {
      const url = `https://missioncontrol-tjfm.onrender.com${endpoint}`;
      const response = await fetch(url);
      console.log(`${endpoint}: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log(`${endpoint}: Error - ${error.message}`);
    }
  }
  console.log('');
}

async function main() {
  console.log('='.repeat(60));
  console.log('🎯 MISSION CONTROL API DIAGNOSTICS');
  console.log('='.repeat(60));

  await testHealthEndpoints();
  const result = await testCommunityListings();

  console.log('='.repeat(60));
  if (result.success) {
    console.log('🎉 SUCCESS: Found a working community with listings!');
    console.log(`✅ Community ID ${result.communityId} has ${result.data.count} listings`);
    console.log('🔧 The IDX widget should display listings for this community');
    console.log('');
    console.log('📋 NEXT STEPS FOR CALEB:');
    console.log(`1. Navigate to community ID ${result.communityId} in Mission Control`);
    console.log('2. Check if the IDX widget displays the listings');
    console.log('3. If not, the issue is in the front-end rendering');
  } else {
    console.log('⚠️  No working communities found');
    console.log('🔧 This could mean:');
    console.log('   - No communities have polygons defined yet');
    console.log('   - Database connection issues');
    console.log('   - Environment variables not set on Render');
    console.log('');
    console.log('📋 DEBUGGING STEPS:');
    console.log('1. Check Render environment variables');
    console.log('2. Verify at least one community has a polygon');
    console.log('3. Check Render deployment logs');
  }
  console.log('='.repeat(60));
}

main().catch(console.error);