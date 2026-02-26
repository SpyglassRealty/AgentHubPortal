#!/usr/bin/env node

// Deployment verification script
const https = require('https');

const MISSION_CONTROL_URL = 'https://missioncontrol-tjfm.onrender.com';
const EXPECTED_SECTIONS = [
  'hero', 'navigation', 'stats', 'awards', 'seller', 'buyer', 
  'testimonials', 'reviews', 'whyChoose', 'threeReasons', 
  'newForm', 'youtube', 'cta', 'footer'
];

function checkEndpoint(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, error: e.message, raw: data });
        }
      });
    }).on('error', reject);
  });
}

async function verifyDeployment() {
  console.log('🔍 Verifying Mission Control deployment...');
  
  try {
    // Check site content API
    const siteContent = await checkEndpoint(`${MISSION_CONTROL_URL}/api/site-content`);
    
    if (siteContent.status !== 200) {
      console.log('❌ Site content API failed:', siteContent.status);
      return false;
    }
    
    const sections = Object.keys(siteContent.data);
    console.log('📋 Available sections:', sections.join(', '));
    
    // Check for missing sections
    const missing = EXPECTED_SECTIONS.filter(section => !sections.includes(section));
    if (missing.length > 0) {
      console.log('⚠️  Missing sections:', missing.join(', '));
      return false;
    }
    
    console.log('✅ All sections present');
    
    // Check admin API (basic health check)
    try {
      const healthCheck = await checkEndpoint(`${MISSION_CONTROL_URL}/`);
      if (healthCheck.status === 200) {
        console.log('✅ Application responding');
      }
    } catch (e) {
      console.log('⚠️  Health check failed:', e.message);
    }
    
    console.log('🎉 Deployment verification passed!');
    return true;
    
  } catch (error) {
    console.log('❌ Deployment verification failed:', error.message);
    return false;
  }
}

if (require.main === module) {
  verifyDeployment().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { verifyDeployment };