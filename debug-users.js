import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Use the same connection setup as the app
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

async function checkUsers() {
  try {
    console.log('🔍 Checking users table...\n');
    
    const result = await client`
      SELECT id, email, role, first_name, last_name 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    
    console.log('📊 Users in database:');
    console.table(result);
    
    // Also check call_duty_signups to see what user IDs are there
    const signups = await client`
      SELECT DISTINCT user_id 
      FROM call_duty_signups 
      ORDER BY user_id
    `;
    
    console.log('\n📅 User IDs in call_duty_signups:');
    signups.forEach(s => console.log(`- ${s.user_id}`));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

checkUsers();