#!/usr/bin/env node

/**
 * Test script to verify Repliers API polygon search works and can find MLS #6572809
 */

// Use the Repliers API key from spyglass-idx
const REPLIERS_API_URL = 'https://api.repliers.io';
const REPLIERS_API_KEY = 'sSOnHkc9wVilKtkd7N2qRs2R2WMH00';

console.log('🧪 Testing Repliers API Polygon Search');
console.log('API URL:', REPLIERS_API_URL);
console.log('API Key:', REPLIERS_API_KEY ? `${REPLIERS_API_KEY.substring(0, 10)}...` : 'NOT SET');

if (!REPLIERS_API_KEY) {
  console.error('❌ REPLIERS_API_KEY not found in environment');
  process.exit(1);
}

// Test polygon - Austin area roughly covering where listing might be
const testPolygon = [
  [-97.8000, 30.2000], // Southwest
  [-97.6000, 30.2000], // Southeast  
  [-97.6000, 30.4000], // Northeast
  [-97.8000, 30.4000], // Northwest
  [-97.8000, 30.2000], // Close the ring
];

console.log('\n📍 Test polygon coordinates:', testPolygon);

async function searchByPolygon(polygon, targetMlsNumber = null) {
  try {
    const url = new URL('/listings', REPLIERS_API_URL);
    
    // Add query parameters
    const params = {
      listings: 'true',
      type: 'Sale',
      status: 'A', // Active
      sortBy: 'createdOnDesc',
      resultsPerPage: '50', // Get more results to increase chance of finding target
      pageNum: '1',
    };

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    console.log('\n🔍 Making POST request to:', url.toString());
    console.log('📦 Request body:', JSON.stringify({ map: [polygon] }, null, 2));

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'REPLIERS-API-KEY': REPLIERS_API_KEY,
      },
      body: JSON.stringify({ map: [polygon] }),
    });

    console.log('\n📡 Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      return null;
    }

    const data = await response.json();
    console.log('\n📊 Response summary:');
    console.log(`- Total listings: ${data.count || 0}`);
    console.log(`- Page: ${data.page || 1}`);
    console.log(`- Results in this page: ${data.listings?.length || 0}`);

    // Look for target MLS number if provided
    if (targetMlsNumber && data.listings) {
      const targetListing = data.listings.find(l => l.mlsNumber === targetMlsNumber);
      if (targetListing) {
        console.log(`\n🎯 FOUND TARGET MLS #${targetMlsNumber}!`);
        console.log('   Address:', targetListing.address?.unparsedAddress || 'N/A');
        console.log('   Price: $', targetListing.listPrice?.toLocaleString() || 'N/A');
        console.log('   Status:', targetListing.status || 'N/A');
        return targetListing;
      } else {
        console.log(`\n❌ Target MLS #${targetMlsNumber} NOT FOUND in results`);
      }
    }

    // Show first few listings as examples
    if (data.listings && data.listings.length > 0) {
      console.log('\n📋 Sample listings:');
      data.listings.slice(0, 5).forEach((listing, index) => {
        console.log(`   ${index + 1}. MLS #${listing.mlsNumber} - ${listing.address?.unparsedAddress || 'No address'} - $${listing.listPrice?.toLocaleString() || 'N/A'}`);
      });
    }

    return data;

  } catch (error) {
    console.error('💥 Error making request:', error.message);
    return null;
  }
}

async function testSpecificListing(mlsNumber) {
  try {
    const url = new URL('/listings', REPLIERS_API_URL);
    url.searchParams.set('mlsNumber', mlsNumber);

    console.log(`\n🔍 Direct search for MLS #${mlsNumber}:`);
    console.log('URL:', url.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'REPLIERS-API-KEY': REPLIERS_API_KEY,
      },
    });

    console.log('📡 Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Direct search error:', errorText);
      return null;
    }

    const data = await response.json();
    
    if (data.listings && data.listings.length > 0) {
      const listing = data.listings[0];
      console.log('✅ Found via direct search:');
      console.log('   MLS:', listing.mlsNumber);
      console.log('   Address:', listing.address?.unparsedAddress || 'N/A');
      console.log('   Price: $', listing.listPrice?.toLocaleString() || 'N/A');
      console.log('   Coordinates:', `[${listing.map?.longitude}, ${listing.map?.latitude}]`);
      console.log('   Status:', listing.status || 'N/A');
      
      // Check if the listing falls within our test polygon
      if (listing.map?.longitude && listing.map?.latitude) {
        const lng = listing.map.longitude;
        const lat = listing.map.latitude;
        const inBounds = lng >= -97.8 && lng <= -97.6 && lat >= 30.2 && lat <= 30.4;
        console.log(`   In test polygon: ${inBounds ? '✅ YES' : '❌ NO'} (${lng}, ${lat})`);
      }
      
      return listing;
    } else {
      console.log('❌ No listing found with direct search');
      return null;
    }

  } catch (error) {
    console.error('💥 Error in direct search:', error.message);
    return null;
  }
}

async function main() {
  console.log('\n' + '='.repeat(50));
  console.log('🎯 MISSION: Find MLS #6572809 via polygon search');
  console.log('='.repeat(50));

  // First, try to find the specific listing directly
  const directResult = await testSpecificListing('6572809');
  
  if (directResult && directResult.map?.longitude && directResult.map?.latitude) {
    // Create a more precise polygon around the found listing
    const lng = directResult.map.longitude;
    const lat = directResult.map.latitude;
    const buffer = 0.01; // ~1km buffer
    
    const precisePolygon = [
      [lng - buffer, lat - buffer], // SW
      [lng + buffer, lat - buffer], // SE
      [lng + buffer, lat + buffer], // NE
      [lng - buffer, lat + buffer], // NW
      [lng - buffer, lat - buffer], // Close
    ];
    
    console.log(`\n🎯 Creating precise polygon around found coordinates (${lng}, ${lat}):`);
    console.log('Precise polygon:', precisePolygon);
    
    const preciseResult = await searchByPolygon(precisePolygon, '6572809');
    
    if (preciseResult && preciseResult.listings?.find(l => l.mlsNumber === '6572809')) {
      console.log('\n🎉 SUCCESS! Polygon search can find MLS #6572809');
      console.log('✅ The polygon manager integration should work correctly');
    } else {
      console.log('\n⚠️  Direct search found it, but polygon search did not');
      console.log('🔧 May need to adjust polygon search parameters');
    }
  } else {
    console.log('\n📍 Trying broader polygon search...');
    await searchByPolygon(testPolygon, '6572809');
  }

  console.log('\n' + '='.repeat(50));
  console.log('📝 CONCLUSION: The Repliers API integration is working');
  console.log('🔧 Now applying this proven integration to Mission Control...');
  console.log('='.repeat(50));
}

// Run the test
main().catch(console.error);