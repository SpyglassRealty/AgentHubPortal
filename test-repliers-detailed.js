#!/usr/bin/env node
/**
 * More detailed Repliers API testing to find the missing property
 */

const REPLIERS_API_URL = 'https://api.repliers.io';
const REPLIERS_API_KEY = 'sSOnHkc9wVilKtkd7N2qRs2R2WMH00';

async function detailedTest() {
  console.log('🔬 Detailed Repliers API investigation...\n');

  try {
    // 1. Search by address components - try different street name variations
    console.log('=== SEARCHING BY ADDRESS VARIATIONS ===');
    
    const streetVariations = [
      'East Avenue',
      'East Ave', 
      'E Avenue',
      'E Ave',
      'EAST AVENUE',
      'EAST AVE'
    ];

    for (const street of streetVariations) {
      console.log(`🔍 Trying street name: "${street}"`);
      
      const response = await fetch(`${REPLIERS_API_URL}/listings?streetName=${encodeURIComponent(street)}&streetNumber=48&resultsPerPage=50`, {
        headers: {
          'Content-Type': 'application/json',
          'REPLIERS-API-KEY': REPLIERS_API_KEY,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`   📊 Found ${data.count} listings for "${street}"`);
        
        if (data.listings && data.listings.length > 0) {
          console.log('   📝 Results:');
          data.listings.forEach((listing, i) => {
            const address = `${listing.address.streetNumber} ${listing.address.streetName} ${listing.address.streetSuffix || ''} ${listing.address.unitNumber ? '#' + listing.address.unitNumber : ''}`;
            console.log(`     ${i + 1}. ${address.trim()} | MLS: ${listing.mlsNumber} | Status: ${listing.status} | $${listing.listPrice.toLocaleString()}`);
          });
        }
      } else {
        console.log(`   ❌ Error: ${response.status}`);
      }
      console.log('');
    }

    console.log('='.repeat(60) + '\n');

    // 2. Search just by street number and zip
    console.log('=== SEARCHING BY STREET NUMBER + ZIP ===');
    console.log('Looking for 48 [anything] in 78701...\n');

    const numberResponse = await fetch(`${REPLIERS_API_URL}/listings?streetNumber=48&raw.PostalCode=78701&resultsPerPage=50`, {
      headers: {
        'Content-Type': 'application/json',
        'REPLIERS-API-KEY': REPLIERS_API_KEY,
      },
    });

    if (numberResponse.ok) {
      const numberData = await numberResponse.json();
      console.log(`📊 Found ${numberData.count} listings with street number 48 in 78701`);
      
      if (numberData.listings && numberData.listings.length > 0) {
        console.log('📝 All 48 [Street] properties in 78701:');
        numberData.listings.forEach((listing, i) => {
          const address = `${listing.address.streetNumber} ${listing.address.streetName} ${listing.address.streetSuffix || ''} ${listing.address.unitNumber ? '#' + listing.address.unitNumber : ''}`;
          console.log(`  ${i + 1}. ${address.trim()}`);
          console.log(`     MLS: ${listing.mlsNumber} | Status: ${listing.status} | $${listing.listPrice.toLocaleString()}`);
          console.log(`     Raw Street: "${listing.address.streetName}" | Suffix: "${listing.address.streetSuffix || 'none'}"`);
          
          // Check if this could be our target property
          if (listing.address.unitNumber === '2311' || listing.mlsNumber === '8292181') {
            console.log(`     🎯 POTENTIAL MATCH! ${listing.address.unitNumber ? 'Unit matches' : 'MLS matches'}`);
          }
        });
      }
    } else {
      console.log(`❌ Error: ${numberResponse.status}`);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // 3. Try broader downtown search looking for unit 2311
    console.log('=== SEARCHING FOR UNIT 2311 ===');
    console.log('Looking for any property with unit number 2311...\n');

    const unitResponse = await fetch(`${REPLIERS_API_URL}/listings?unitNumber=2311&resultsPerPage=50`, {
      headers: {
        'Content-Type': 'application/json',
        'REPLIERS-API-KEY': REPLIERS_API_KEY,
      },
    });

    if (unitResponse.ok) {
      const unitData = await unitResponse.json();
      console.log(`📊 Found ${unitData.count} listings with unit number 2311`);
      
      if (unitData.listings && unitData.listings.length > 0) {
        console.log('📝 All properties with unit #2311:');
        unitData.listings.forEach((listing, i) => {
          const address = `${listing.address.streetNumber} ${listing.address.streetName} ${listing.address.streetSuffix || ''} #${listing.address.unitNumber}`;
          console.log(`  ${i + 1}. ${address}`);
          console.log(`     MLS: ${listing.mlsNumber} | Status: ${listing.status} | $${listing.listPrice.toLocaleString()}`);
          console.log(`     Area: ${listing.address.city}, ${listing.address.state} ${listing.address.zip}`);
          
          if (listing.mlsNumber === '8292181' || listing.address.streetNumber === '48') {
            console.log(`     🎯 POTENTIAL MATCH!`);
          }
        });
      }
    } else {
      console.log(`❌ Error: ${unitResponse.status}`);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // 4. Check if the listing might be sold/closed
    console.log('=== CHECKING ALL STATUSES FOR MLS 8292181 ===');
    console.log('Including sold/closed listings...\n');

    const allStatusResponse = await fetch(`${REPLIERS_API_URL}/listings?mlsNumber=8292181&status=A,P,S,CS`, {
      headers: {
        'Content-Type': 'application/json',
        'REPLIERS-API-KEY': REPLIERS_API_KEY,
      },
    });

    if (allStatusResponse.ok) {
      const allStatusData = await allStatusResponse.json();
      console.log(`📊 Found ${allStatusData.count} listings for MLS 8292181 (all statuses)`);
      
      if (allStatusData.listings && allStatusData.listings.length > 0) {
        const listing = allStatusData.listings[0];
        console.log('✅ FOUND THE LISTING!');
        const address = `${listing.address.streetNumber} ${listing.address.streetName} ${listing.address.streetSuffix || ''} ${listing.address.unitNumber ? '#' + listing.address.unitNumber : ''}`;
        console.log(`📍 Address: ${address.trim()}`);
        console.log(`📊 MLS: ${listing.mlsNumber} | Status: ${listing.status} | Price: $${listing.listPrice.toLocaleString()}`);
        console.log(`📅 List Date: ${listing.listDate} | Last Update: ${listing.lastUpdate || 'N/A'}`);
        console.log('📋 Full listing data:');
        console.log(JSON.stringify(listing, null, 2));
      } else {
        console.log('❌ Still no results for MLS 8292181 with any status');
      }
    } else {
      console.log(`❌ Error: ${allStatusResponse.status} - ${await allStatusResponse.text()}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

detailedTest().catch(console.error);