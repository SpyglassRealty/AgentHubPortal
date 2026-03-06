# IDX Lead Backup Implementation

## Overview
Implemented a backup lead capture solution for Spyglass IDX site that sends leads to Mission Control when Follow Up Boss (FUB) integration fails.

## Components Modified

### 1. Mission Control (Backend)
- **Schema**: Added `idxLeads` table in `shared/schema.ts`
  - Stores lead info, form type, property details
  - Tracks FUB sync status and errors
  - Includes assignment and status management

- **Storage**: Added methods in `server/storage.ts`:
  - `createIdxLead()` - Store new leads
  - `getIdxLeads()` - Query leads with filters
  - `updateIdxLead()` - Update lead status/assignment
  - `getIdxLeadStats()` - Dashboard statistics

- **API Endpoints** in `server/routes.ts`:
  - `POST /api/idx/leads/webhook` - Receive leads from IDX site (public)
  - `GET /api/admin/idx-leads` - View leads (admin)
  - `PUT /api/admin/idx-leads/:id` - Update lead
  - `POST /api/admin/idx-leads/:id/assign` - Assign lead
  - `POST /api/admin/idx-leads/:id/sync-fub` - Retry FUB sync

- **Database Migration**: `migrations/0011_idx_leads_backup.sql`
  - Creates idx_leads table with indexes

### 2. Mission Control (Frontend)
- **Admin UI**: Created `client/src/pages/admin-dashboards/idx-leads.tsx`
  - Table view with search/filters
  - Status management (new/contacted/qualified/archived)
  - Agent assignment
  - FUB sync retry functionality
  - CSV export
  - Lead detail modal with notes

- **Navigation**: Updated dashboard nav to include "IDX Leads" link

### 3. IDX Site Modifications
- **Lead Submission**: Modified `/api/leads/route.ts`
  - Always sends to Mission Control after FUB attempt
  - Includes FUB success/failure status
  - Handles complete FUB failure gracefully
  - Uses env vars for Mission Control URL and webhook secret

- **Environment Variables**: Added to `.env.example`
  - `MISSION_CONTROL_URL` - Mission Control API endpoint
  - `IDX_WEBHOOK_SECRET` - Optional security token

## How It Works

1. **Lead Submission Flow**:
   - User submits form on IDX site
   - IDX attempts to send to Follow Up Boss
   - Regardless of FUB result, sends copy to Mission Control
   - If FUB fails, includes error details for later retry

2. **Mission Control Processing**:
   - Receives lead via webhook
   - Stores in database with FUB sync status
   - Admins can view all leads in dashboard
   - Failed FUB syncs can be retried manually
   - Leads can be assigned to agents and tracked

3. **Security**:
   - Optional webhook secret for authentication
   - Admin endpoints require authentication
   - Rate limiting on IDX submission endpoint

## Deployment Steps

### Mission Control:
1. Run database migration: `npm run db:push`
2. Set environment variable if using webhook auth: `IDX_WEBHOOK_SECRET=<your-secret>`
3. Deploy to Render

### IDX Site:
1. Add environment variables:
   - `MISSION_CONTROL_URL=https://missioncontrol-tjfm.onrender.com`
   - `IDX_WEBHOOK_SECRET=<matching-secret>` (if using)
   - `FUB_API_KEY=<current-key>` (ensure it's set)
2. Deploy to Vercel

## Benefits
- Zero lead loss when FUB authentication fails
- Central dashboard for lead management
- Ability to retry failed syncs
- Lead assignment and tracking
- Export capability for reporting

## Future Enhancements
- Automated FUB retry queue
- Email notifications for new leads
- Lead scoring/qualification
- Integration with other CRMs as backup