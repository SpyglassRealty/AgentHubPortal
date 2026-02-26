#!/usr/bin/env node

// Script to migrate Mission Control to Vercel for better deployment consistency

const fs = require('fs');
const path = require('path');

console.log('🚀 Mission Control → Vercel Migration Helper');
console.log('=====================================\n');

// Create vercel.json configuration
const vercelConfig = {
  "name": "mission-control",
  "version": 2,
  "builds": [
    {
      "src": "client/dist/**/*",
      "use": "@vercel/static"
    },
    {
      "src": "server/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/client/dist/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
};

// Write vercel.json
fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2));
console.log('✅ Created vercel.json');

// Create deployment script
const deployScript = `#!/bin/bash

# Build and deploy to Vercel
echo "🏗️  Building Mission Control..."

# Install dependencies
npm ci

# Build client
cd client && npm run build && cd ..

# Build server
cd server && npm run build && cd ..

echo "🚀 Deploying to Vercel..."
npx vercel --prod

echo "🔍 Verifying deployment..."
node scripts/verify-deployment.js

echo "✅ Deployment complete!"
`;

fs.writeFileSync('scripts/deploy-vercel.sh', deployScript);
fs.chmodSync('scripts/deploy-vercel.sh', '755');
console.log('✅ Created deployment script');

console.log('\n🎯 Next Steps:');
console.log('1. Run: npm install -g vercel');  
console.log('2. Run: vercel login');
console.log('3. Run: ./scripts/deploy-vercel.sh');
console.log('4. Update environment variables in Vercel dashboard');
console.log('5. Update DNS/domain settings');

console.log('\n💡 Benefits of Vercel:');
console.log('- Instant deployments (30-60 seconds)');
console.log('- Automatic builds from GitHub');
console.log('- Better error reporting');
console.log('- Preview deployments for testing');
console.log('- Same reliability as your IDX site');

console.log('\n⏱️  Migration time: ~30 minutes');
console.log('📈 Time saved long-term: Hours per week');