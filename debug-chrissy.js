const { execSync } = require('child_process');

// Debug script to find Chrissy Hand
console.log('🔍 Debugging Chrissy Hand issue...\n');

// Check GHL sync logs
console.log('1. Checking recent GHL sync activity:');
try {
  const result = execSync('cd ~/clawd/projects/recruiting-pipeline-next && tail -20 ghl-sync.log 2>/dev/null || echo "No log file found"', { encoding: 'utf8' });
  console.log(result);
} catch (e) {
  console.log('No sync logs available');
}

// Run a targeted sync
console.log('\n2. Running targeted contact check in GHL...');
try {
  execSync('cd ~/clawd/projects/recruiting-pipeline-next && node -e "console.log(\'Checking GHL for Chrissy Hand...\')"', { stdio: 'inherit' });
} catch (e) {
  console.log('Error checking GHL');
}

console.log('\nTo fix this issue:');
console.log('1. Ensure Chrissy Hand has the "recruiting" tag in GHL');
console.log('2. Run: cd ~/clawd/projects/recruiting-pipeline-next && node scripts/ghl-sync.mjs');
console.log('3. Check if she appears in the pipeline after sync');