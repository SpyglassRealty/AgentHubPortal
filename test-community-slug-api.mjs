#!/usr/bin/env node

/**
 * Test the new /api/communities/[slug] endpoint on Mission Control
 */

console.log('🧪 Testing Mission Control Community Slug API\n');

async function testCommunitySlugAPI() {
  // Test community slugs that might exist
  const testSlugs = ['downtown-austin', 'natiivo-test-1', 'downtown', 'austin-downtown'];
  
  for (const slug of testSlugs) {
    console.log(`🔍 Testing slug: "${slug}"`);
    
    try {
      // Test both the production Render deployment and the by-id endpoint for comparison
      const urls = [
        `https://missioncontrol-tjfm.onrender.com/api/communities/${slug}?live=true&pageSize=20`,
        `https://missioncontrol-tjfm.onrender.com/api/listings/by-polygon?communityId=1` // Known working endpoint
      ];
      
      for (const url of urls) {
        const isSlugAPI = url.includes(`/communities/${slug}`);
        const label = isSlugAPI ? '   New slug API:' : '   Known working by-ID:';
        
        console.log(`${label} ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        console.log(`     Status: ${response.status} ${response.statusText}`);

        if (response.ok) {
          const data = await response.json();
          
          if (data.listings && data.listings.length > 0) {
            console.log(`     ✅ SUCCESS! Found ${data.total || data.count} listings`);
            console.log(`     Community: ${data.community?.name || data.communityName || 'Unknown'}`);
            console.log(`     Sample: MLS #${data.listings[0].mlsNumber} - ${data.listings[0].address || data.listings[0].address?.street || 'No address'}`);
            
            if (isSlugAPI) {
              console.log('     🎉 New slug API is working - IDX widgets should work!');
              return { success: true, slug, data };
            }
          } else {
            console.log(`     ⚠️  No listings found`);
          }
        } else {
          const errorText = await response.text();
          console.log(`     ❌ Error: ${errorText.substring(0, 200)}`);
        }
      }

    } catch (error) {
      console.log(`   💥 Error: ${error.message}`);
    }
    
    console.log('');
  }
  
  return { success: false };
}

async function checkExistingCommunities() {
  console.log('🔍 Checking what communities exist in Mission Control:\n');
  
  try {
    // Try to get a list of communities first
    const response = await fetch('https://missioncontrol-tjfm.onrender.com/api/admin/communities?limit=10', {
      headers: { 'Accept': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.communities && data.communities.length > 0) {
        console.log('📋 Found communities in Mission Control:');
        data.communities.slice(0, 5).forEach((community, index) => {
          console.log(`   ${index + 1}. "${community.name}" (slug: ${community.slug})`);
        });
        
        // Test the first community's slug
        const firstSlug = data.communities[0].slug;
        console.log(`\n🎯 Testing first community slug: "${firstSlug}"`);
        
        const testResponse = await fetch(`https://missioncontrol-tjfm.onrender.com/api/communities/${firstSlug}?live=true`, {
          headers: { 'Accept': 'application/json' }
        });
        
        console.log(`Status: ${testResponse.status} ${testResponse.statusText}`);
        
        if (testResponse.ok) {
          const testData = await testResponse.json();
          console.log(`✅ SUCCESS! Community "${testData.community?.name}" has ${testData.total} listings`);
          return { success: true, slug: firstSlug, data: testData };
        } else {
          const errorText = await testResponse.text();
          console.log(`❌ Error: ${errorText}`);
        }
        
      } else {
        console.log('⚠️  No communities found in response');
      }
    } else {
      console.log(`❌ Failed to fetch communities list: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.log(`💥 Error fetching communities: ${error.message}`);
  }
  
  return { success: false };
}

async function main() {
  console.log('='.repeat(60));
  console.log('🎯 TESTING MISSION CONTROL COMMUNITY SLUG API');
  console.log('='.repeat(60));

  // First, see what communities actually exist
  const existingResult = await checkExistingCommunities();
  
  if (!existingResult.success) {
    // Fallback to testing common slug names
    console.log('\n📝 Fallback: Testing common community slugs...\n');
    await testCommunitySlugAPI();
  }

  console.log('='.repeat(60));
  console.log('📋 SUMMARY FOR CALEB:');
  if (existingResult.success) {
    console.log('🎉 SUCCESS: The new slug-based API endpoint is working!');
    console.log(`✅ Community "${existingResult.slug}" returns ${existingResult.data.total} listings`);
    console.log('🔧 IDX widgets that expect spyglass-idx API format should now work');
    console.log('');
    console.log('📝 TO TEST IN UI:');
    console.log('1. Open Mission Control');
    console.log('2. Navigate to a community page with a polygon');
    console.log('3. The IDX widget should now display listings');
    console.log('4. Check browser console for any remaining errors');
  } else {
    console.log('⚠️  API endpoint exists but needs debugging');
    console.log('🔧 Possible issues:');
    console.log('   - Communities may not have polygons defined yet');
    console.log('   - Database connection issues');
    console.log('   - Route needs to be deployed to Render');
  }
  console.log('='.repeat(60));
}

main().catch(console.error);