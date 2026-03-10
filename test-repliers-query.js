#!/usr/bin/env node
/**
 * Test Repliers API for Daryl's specific property query
 * Address: 48 East Avenue 2311, Austin, TX MLS # 8292181
 * Also investigate downtown Austin address issues
 */

const REPLIERS_API_URL = 'https://api.repliers.io';
const REPLIERS_API_KEY = 'sSOnHkc9wVilKtkd7N2qRs2R2WMH00';

async function testRepliers() {
  console.log('🔍 Testing Repliers API for specific property and downtown Austin...\n');

  try {
    // 1. Query the specific property by MLS number
    console.log('=== QUERYING SPECIFIC PROPERTY ===');
    console.log('MLS #: 8292181');
    console.log('Address: 48 East Avenue 2311, Austin, TX\n');

    const specificPropertyResponse = await fetch(`${REPLIERS_API_URL}/listings?mlsNumber=8292181`, {
      headers: {
        'Content-Type': 'application/json',
        'REPLIERS-API-KEY': REPLIERS_API_KEY,
      },
    });

    if (!specificPropertyResponse.ok) {
      throw new Error(`API Error: ${specificPropertyResponse.status} - ${await specificPropertyResponse.text()}`);
    }

    const specificProperty = await specificPropertyResponse.json();
    console.log('📊 API Response:', JSON.stringify(specificProperty, null, 2));
    
    if (specificProperty.listings && specificProperty.listings.length > 0) {
      const listing = specificProperty.listings[0];
      console.log('\n✅ Found the property!');
      console.log(`📍 Address: ${listing.address.streetNumber} ${listing.address.streetName} ${listing.address.streetSuffix || ''} ${listing.address.unitNumber ? '#' + listing.address.unitNumber : ''}`);
      console.log(`🏠 Price: $${listing.listPrice.toLocaleString()}`);
      console.log(`📊 Details: ${listing.details.numBedrooms}BR/${listing.details.numBathrooms}BA, ${listing.details.sqft} sqft`);
      console.log(`📅 Status: ${listing.status}`);
    } else {
      console.log('❌ Property not found in Repliers API response');
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // 2. Test downtown Austin area search to identify address issues
    console.log('=== TESTING DOWNTOWN AUSTIN LISTINGS ===');
    console.log('Searching for downtown Austin listings to identify patterns...\n');

    // Search by zip codes common in downtown Austin
    const downtownZips = ['78701', '78702', '78703'];
    
    for (const zip of downtownZips) {
      console.log(`🗺️ Testing zip code: ${zip}`);
      
      const zipResponse = await fetch(`${REPLIERS_API_URL}/listings?raw.PostalCode=${zip}&status=A&resultsPerPage=10`, {
        headers: {
          'Content-Type': 'application/json',
          'REPLIERS-API-KEY': REPLIERS_API_KEY,
        },
      });

      if (zipResponse.ok) {
        const zipData = await zipResponse.json();
        console.log(`   📊 Found ${zipData.count} active listings in ${zip}`);
        
        if (zipData.listings && zipData.listings.length > 0) {
          console.log('   📝 Sample addresses:');
          zipData.listings.slice(0, 5).forEach((listing, i) => {
            const address = `${listing.address.streetNumber} ${listing.address.streetName} ${listing.address.streetSuffix || ''} ${listing.address.unitNumber ? '#' + listing.address.unitNumber : ''}`;
            console.log(`     ${i + 1}. ${address.trim()}, ${listing.address.city}, ${listing.address.state} ${listing.address.zip}`);
            console.log(`        MLS: ${listing.mlsNumber} | $${listing.listPrice.toLocaleString()}`);
          });
        }
      } else {
        console.log(`   ❌ Error fetching ${zip}: ${zipResponse.status}`);
      }
      console.log('');
    }

    console.log('='.repeat(60) + '\n');

    // 3. Test by searching "East Avenue" specifically
    console.log('=== TESTING EAST AVENUE PROPERTIES ===');
    console.log('Searching for other East Avenue properties...\n');

    const eastAveResponse = await fetch(`${REPLIERS_API_URL}/listings?streetName=East Avenue&status=A&resultsPerPage=20`, {
      headers: {
        'Content-Type': 'application/json',
        'REPLIERS-API-KEY': REPLIERS_API_KEY,
      },
    });

    if (eastAveResponse.ok) {
      const eastAveData = await eastAveResponse.json();
      console.log(`📊 Found ${eastAveData.count} active listings on East Avenue`);
      
      if (eastAveData.listings && eastAveData.listings.length > 0) {
        console.log('📝 East Avenue listings:');
        eastAveData.listings.forEach((listing, i) => {
          const address = `${listing.address.streetNumber} ${listing.address.streetName} ${listing.address.streetSuffix || ''} ${listing.address.unitNumber ? '#' + listing.address.unitNumber : ''}`;
          console.log(`  ${i + 1}. ${address.trim()}, ${listing.address.city}, ${listing.address.state} ${listing.address.zip}`);
          console.log(`     MLS: ${listing.mlsNumber} | $${listing.listPrice.toLocaleString()} | Status: ${listing.status}`);
        });
      }
    } else {
      console.log(`❌ Error searching East Avenue: ${eastAveResponse.status} - ${await eastAveResponse.text()}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testRepliers().catch(console.error);