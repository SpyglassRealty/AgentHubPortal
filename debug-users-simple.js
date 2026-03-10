import { db } from "./server/db.ts";
import { users, callDutySignups } from "./shared/schema.ts";
import { eq } from "drizzle-orm";

async function checkUsers() {
  try {
    console.log('🔍 Checking users table...\n');
    
    // Check all users
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      role: users.role,
      firstName: users.firstName,
      lastName: users.lastName
    }).from(users);
    
    console.log('📊 Users in database:');
    console.table(allUsers);
    
    // Look for Daryl's account specifically
    const darylUsers = allUsers.filter(u => 
      u.email?.includes('daryl') || 
      u.role === 'developer' ||
      u.id?.includes('110569188758928514822')
    );
    
    console.log('\n🎯 Potential Daryl accounts:');
    console.table(darylUsers);
    
    // Check call_duty_signups table for user IDs
    const signups = await db.select({
      userId: callDutySignups.userId
    }).from(callDutySignups);
    
    const uniqueUserIds = [...new Set(signups.map(s => s.userId))];
    console.log('\n📅 Unique user IDs in call_duty_signups:');
    uniqueUserIds.forEach(id => console.log(`- ${id}`));
    
    // Test getUserId function simulation
    console.log('\n🔧 Testing auth flow:');
    console.log('Google OAuth sub claim: "110569188758928514822"');
    console.log('Expected user ID: "google_110569188758928514822"');
    
    // Check if the expected user exists
    const expectedUserId = "google_110569188758928514822";
    const userExists = await db.select().from(users).where(eq(users.id, expectedUserId));
    console.log(`\n✅ User ${expectedUserId} exists:`, userExists.length > 0);
    
    if (userExists.length > 0) {
      console.log('User details:', userExists[0]);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUsers();