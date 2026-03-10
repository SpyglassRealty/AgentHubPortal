#!/usr/bin/env node

/**
 * Debug what community slugs exist in Mission Control database
 */

console.log('🔍 Debugging Mission Control Community Slugs\n');

async function testVariousSlugFormats() {
  console.log('📝 Testing different slug formats for "Downtown Austin":\n');
  
  const possibleSlugs = [
    'downtown-austin',
    'downtown',
    'austin-downtown', 
    'natiivo-test-1',
    'natiivo',
    'downtown_austin',
    'downtownaustin',
    'austin_downtown'
  ];
  
  for (const slug of possibleSlugs) {
    try {
      console.log(`Testing: "${slug}"`);
      
      // Test both the new endpoint (if deployed) and try to infer from working ID endpoint
      const testUrl = `https://missioncontrol-tjfm.onrender.com/api/communities/${slug}`;
      const response = await fetch(testUrl);
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ FOUND! Community: ${data.community?.name}`);
        console.log(`   📊 Listings: ${data.total || 0}`);
        return { found: true, slug, data };
      } else if (response.status !== 404) {
        const errorText = await response.text();
        console.log(`   ⚠️  Unexpected error: ${errorText.substring(0, 100)}`);
      }
      
    } catch (error) {
      console.log(`   💥 Error: ${error.message}`);
    }
  }
  
  console.log('\n❌ No working slug found with new endpoint');
  return { found: false };
}

async function checkDirectDatabase() {
  console.log('\n🎯 Attempting to find community info through working endpoint:\n');
  
  try {
    // We know ID 1 works, let's see if we can get more info
    const response = await fetch('https://missioncontrol-tjfm.onrender.com/api/listings/by-polygon?communityId=1');
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Community ID 1 details:`);
      console.log(`   Name: "${data.communityName}"`);
      console.log(`   Listings: ${data.count}`);
      
      // Check if there are other community IDs
      console.log('\n🔍 Testing other community IDs:');
      
      for (let id = 2; id <= 10; id++) {
        const testResponse = await fetch(`https://missioncontrol-tjfm.onrender.com/api/listings/by-polygon?communityId=${id}`);
        if (testResponse.ok) {
          const testData = await testResponse.json();
          console.log(`   ID ${id}: "${testData.communityName}" (${testData.count} listings)`);
        } else if (testResponse.status !== 404 && testResponse.status !== 400) {
          console.log(`   ID ${id}: Error ${testResponse.status}`);
        }
      }
      
    } else {
      console.log(`❌ Failed to get community ID 1: ${response.status} ${response.statusText}`);
    }
    
  } catch (error) {
    console.log(`💥 Error checking database: ${error.message}`);
  }
}

async function checkDeploymentStatus() {
  console.log('\n🚀 Checking deployment status:\n');
  
  try {
    // Check if the basic Mission Control is responding
    const healthResponse = await fetch('https://missioncontrol-tjfm.onrender.com/');
    console.log(`Main site status: ${healthResponse.status} ${healthResponse.statusText}`);
    
    // Check if the new API route exists at all
    const newAPIResponse = await fetch('https://missioncontrol-tjfm.onrender.com/api/communities/test-slug-does-not-exist');
    console.log(`New API route status: ${newAPIResponse.status} ${newAPIResponse.statusText}`);
    
    if (newAPIResponse.status === 404 && newAPIResponse.headers.get('content-type')?.includes('text/html')) {
      console.log('   ⚠️  Route not found - deployment may not include latest changes');
    } else if (newAPIResponse.status === 404 && newAPIResponse.headers.get('content-type')?.includes('json')) {
      console.log('   ✅ Route exists but community not found (this is expected)');
    }
    
  } catch (error) {
    console.log(`💥 Deployment check error: ${error.message}`);
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('🔍 MISSION CONTROL COMMUNITY SLUG DEBUG');
  console.log('='.repeat(70));
  
  await checkDeploymentStatus();
  await checkDirectDatabase();
  const slugResult = await testVariousSlugFormats();
  
  console.log('\n' + '='.repeat(70));
  console.log('📋 DIAGNOSIS:');
  
  if (slugResult.found) {
    console.log(`✅ Found working community slug: "${slugResult.slug}"`);
    console.log('🎉 The new API endpoint is working!');
  } else {
    console.log('❌ New API endpoint not working yet');
    console.log('');
    console.log('🔧 LIKELY CAUSES:');
    console.log('1. Latest build not deployed to Render yet');
    console.log('2. Environment variables not set on Render deployment');
    console.log('3. Route registration issue in Express app');
    console.log('');
    console.log('🚀 NEXT STEPS FOR CALEB:');
    console.log('1. Deploy latest Mission Control build to Render');
    console.log('2. Ensure REPLIERS_API_KEY is set in Render environment');
    console.log('3. Check Render deployment logs for errors');
    console.log('4. Test URL: https://missioncontrol-tjfm.onrender.com/api/communities/[actual-slug]');
  }
  console.log('='.repeat(70));
}

main().catch(console.error);