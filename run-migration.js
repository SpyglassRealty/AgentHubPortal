// Script to run the agent fields migration
// Wait 5-10 minutes after deployment, then run this script

const MISSION_CONTROL_URL = 'https://missioncontrol-tjfm.onrender.com';

async function runMigration() {
  console.log('🚀 Running agent fields migration...');
  console.log('⏳ This requires authentication. You may need to log in first.');
  
  try {
    // Note: This will fail without authentication
    // You'll need to run this from the browser console while logged in
    const response = await fetch(`${MISSION_CONTROL_URL}/api/admin/run-agent-migration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Migration successful:', result);
    } else {
      console.error('❌ Migration failed:', result);
    }
  } catch (error) {
    console.error('❌ Error running migration:', error);
  }
}

console.log(`
To run the migration:

1. Open Mission Control in your browser: ${MISSION_CONTROL_URL}/admin
2. Log in as an admin
3. Open the browser console (F12)
4. Copy and paste this code:

fetch('/api/admin/run-agent-migration', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include'
}).then(r => r.json()).then(console.log);

The migration will add:
- years_of_experience (integer)
- languages (JSONB array)
- specialties (JSONB array)
`);