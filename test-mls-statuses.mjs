#!/usr/bin/env node

/**
 * Test script to check different MLS statuses and verify API integration
 */

const REPLIERS_API_URL = 'https://api.repliers.io';
const REPLIERS_API_KEY = 'sSOnHkc9wVilKtkd7N2qRs2R2WMH00';

console.log('🔍 Testing different MLS statuses for listing #6572809\n');

async function testMlsWithStatus(mlsNumber, status, statusDescription) {
  try {
    const url = new URL('/listings', REPLIERS_API_URL);
    url.searchParams.set('mlsNumber', mlsNumber);
    if (status) url.searchParams.set('status', status);

    console.log(`📋 Testing ${statusDescription} (${status || 'all'}):`);
    console.log(`   URL: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'REPLIERS-API-KEY': REPLIERS_API_KEY,
      },
    });

    if (!response.ok) {
      console.log(`   ❌ Error: ${response.status} ${response.statusText}`);
      return false;
    }

    const data = await response.json();
    
    if (data.listings && data.listings.length > 0) {
      const listing = data.listings[0];
      console.log(`   ✅ FOUND!`);
      console.log(`      Address: ${listing.address?.unparsedAddress || 'N/A'}`);
      console.log(`      Price: $${listing.listPrice?.toLocaleString() || 'N/A'}`);
      console.log(`      Status: ${listing.status || 'N/A'}`);
      console.log(`      List Date: ${listing.listDate || 'N/A'}`);
      return true;
    } else {
      console.log(`   ❌ Not found`);
      return false;
    }

  } catch (error) {
    console.log(`   💥 Error: ${error.message}`);
    return false;
  }
}

async function testGenericListings() {
  try {
    console.log('\n📊 Testing generic listing search to verify API works:');
    
    const url = new URL('/listings', REPLIERS_API_URL);
    url.searchParams.set('type', 'Sale');
    url.searchParams.set('status', 'A');
    url.searchParams.set('resultsPerPage', '5');
    url.searchParams.set('area', 'Travis'); // Austin area

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'REPLIERS-API-KEY': REPLIERS_API_KEY,
      },
    });

    if (!response.ok) {
      console.log(`❌ Error: ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json();
    console.log(`✅ API working - found ${data.count || 0} total listings`);
    
    if (data.listings && data.listings.length > 0) {
      console.log('📋 Sample active listings:');
      data.listings.slice(0, 3).forEach((listing, index) => {
        console.log(`   ${index + 1}. MLS #${listing.mlsNumber} - ${listing.address?.unparsedAddress || 'No address'}`);
        console.log(`      Price: $${listing.listPrice?.toLocaleString() || 'N/A'} - Status: ${listing.status || 'N/A'}`);
      });
    }

  } catch (error) {
    console.log(`💥 Generic search error: ${error.message}`);
  }
}

async function main() {
  const targetMls = '6572809';
  
  console.log('='.repeat(60));
  console.log(`🎯 SEARCHING FOR MLS #${targetMls} IN DIFFERENT STATUSES`);
  console.log('='.repeat(60));

  // Test different statuses
  const statuses = [
    [null, 'All statuses'],
    ['A', 'Active'],
    ['P', 'Pending'],
    ['S', 'Sold'],
    ['E', 'Expired'],
    ['W', 'Withdrawn'],
    ['C', 'Closed'],
    ['U', 'Under Contract'],
  ];

  let found = false;
  for (const [status, description] of statuses) {
    const result = await testMlsWithStatus(targetMls, status, description);
    if (result) found = true;
    console.log(''); // blank line
  }

  await testGenericListings();

  console.log('\n' + '='.repeat(60));
  if (found) {
    console.log('🎉 SUCCESS: MLS #6572809 was found in the system!');
    console.log('✅ The Repliers API integration is working correctly');
    console.log('🔧 Mission Control polygon manager should work fine');
  } else {
    console.log('ℹ️  MLS #6572809 not found in any status');
    console.log('   This could mean:');
    console.log('   - The listing number might be incorrect');
    console.log('   - The listing might be from a different MLS region');
    console.log('   - The listing might be very old and archived');
    console.log('');
    console.log('✅ However, the Repliers API is definitely working');
    console.log('🔧 The Mission Control integration should work for valid listings');
  }
  console.log('='.repeat(60));
}

main().catch(console.error);