# CRITICAL FIXES FOR DARYL'S BUG REPORT

## Issues Identified:
1. **Phone column migration failing** - uses Drizzle schema checks instead of real DB queries
2. **Photo upload not saving** - headshot_url remains NULL
3. **Title field not saving** - settings form not updating database

## Root Cause:
The migration verification was checking the Drizzle schema definition instead of querying the actual database columns.

## Fix Applied:
1. **Real database column verification** using `information_schema.columns` 
2. **Agent profile API endpoints** that actually update the database
3. **Proper error handling** with detailed logging

## Verification Commands:
After deploy, run these to verify the fix:

```sql
-- Check if phone column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'agent_profiles' AND column_name = 'phone';

-- Check all agent_profiles columns  
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'agent_profiles' 
ORDER BY column_name;

-- Test data insertion
SELECT user_id, title, phone, LENGTH(headshot_url) as headshot_len, LENGTH(bio) as bio_len 
FROM agent_profiles;
```

## API Endpoints Available:
- `GET /api/agent-profile` - Get profile
- `PUT /api/agent-profile` - Update phone, title, bio, social links
- `PUT /api/agent-profile/bio` - Update bio only
- `POST /api/agent-profile/generate-bio` - AI bio generation
- `POST /api/agent-profile/photo` - Upload headshot

## Expected Behavior After Fix:
1. Phone column should exist and accept data
2. Photo upload should save to headshot_url column
3. Settings form should save title field
4. All database operations should succeed