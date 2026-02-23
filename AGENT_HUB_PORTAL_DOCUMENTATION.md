# Agent Hub Portal - Technical Documentation

## Project Overview

**Agent Hub Portal** is a comprehensive real estate CMA (Comparative Market Analysis) and agent productivity platform built for Spyglass Realty. The application provides agents with tools for property analysis, market data visualization, performance tracking, and client management.

**Deployment URL**: https://missioncontrol-tjfm.onrender.com  
**Render Service**: https://dashboard.render.com/web/srv-d5vc5od6ubrc73cbslag  
**Repository**: AgentHubPortal (Git repository)

---

## Architecture

### Tech Stack
- **Frontend**: React 19.2.0 + TypeScript + Vite
- **Backend**: Node.js + Express.js + TypeScript
- **Database**: PostgreSQL (via Drizzle ORM)
- **Deployment**: Render.com
- **Authentication**: Passport.js (Google OAuth + Local)
- **UI Components**: Radix UI + Tailwind CSS
- **Maps**: Mapbox GL
- **Charts**: Recharts
- **PDF Generation**: React-PDF + jsPDF

### Project Structure
```
AgentHubPortal/
├── server/                 # Backend Express.js application
├── client/                 # Frontend React application  
├── shared/                 # Shared TypeScript types/schemas
├── migrations/             # Database migration files
├── scripts/                # Utility scripts (data refresh, backups)
└── dist/                   # Production build output
```

---

## Database Configuration

### Primary Database
- **Provider**: PostgreSQL (hosted on Render)
- **ORM**: Drizzle ORM with TypeScript
- **Connection**: Via `DATABASE_URL` environment variable
- **Auto-migrations**: Handled in `server/db.ts`

### Key Tables
- `users` - User accounts and agent profiles
- `cmas` - CMA reports and analysis data
- `agent_profiles` - Agent profile information
- `market_pulse_snapshots` - Market data snapshots
- `pulse_*` tables - Real estate market metrics
- `integration_configs` - Third-party API configurations

---

## Third-Party Integrations & APIs

### 1. Repliers API (Primary MLS Data)
**Purpose**: Real estate listing data and MLS integration  
**Environment**: `IDX_GRID_API_KEY`  
**Base URL**: `https://api.repliers.io`  
**Usage**: Property searches, CMA data, market analysis

**Key Endpoints Used**:
- `/listings` - Property search and details
- Supports filtering by location, price, property type, status
- Returns: MLS data, photos, property details, pricing history

### 2. Follow Up Boss (FUB) CRM
**Purpose**: Real estate CRM integration  
**Environment**: `FUB_API_KEY`  
**Base URL**: `https://api.followupboss.com/v1`  
**Client**: `server/fubClient.ts`

**Features**:
- Agent management and user linking
- Calendar events and appointments
- Deal tracking and pipeline
- Task management
- Lead and contact management

### 3. Google Services
**Purpose**: Calendar integration and authentication  
**Environment Variables**:
- `GOOGLE_CALENDAR_CREDENTIALS`
- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

**Services**:
- **Google Calendar**: Agent scheduling integration
- **Google OAuth**: User authentication
- **Google APIs**: Service account access

### 4. ReZen Analytics
**Purpose**: Real estate performance analytics  
**Environment**: Via ReZen API integration  
**Client**: `server/rezenClient.ts`  
**Features**: Transaction analysis, income tracking, performance metrics

### 5. Vimeo
**Purpose**: Training video content  
**Client**: `server/vimeoClient.ts`  
**Usage**: Agent training materials and educational content

### 6. OpenAI
**Purpose**: AI-powered content generation  
**Environment**: `OPENAI_API_KEY`  
**Usage**: Bio generation, content suggestions, contextual recommendations

### 7. Mapbox
**Purpose**: Interactive maps and geospatial features  
**Environment**: `MAPBOX_PUBLIC_TOKEN`  
**Usage**: Property location mapping, area visualization

---

## API Endpoints Structure

### Authentication (`/api/auth/`)
- `GET /api/auth/user` - Get current user profile
- `POST /api/auth/link-fub` - Link Follow Up Boss account

### CMA System (`/api/cma/`)
- `GET /api/cma` - List user's CMAs
- `POST /api/cma` - Create new CMA
- `GET /api/cma/:id` - Get specific CMA
- `PUT /api/cma/:id` - Update CMA
- `DELETE /api/cma/:id` - Delete CMA
- `POST /api/cma/search-properties` - Search properties for CMA analysis

### Follow Up Boss Integration (`/api/fub/`)
- `GET /api/fub/agents` - List FUB agents
- `GET /api/fub/calendar` - Get calendar events
- `GET /api/fub/deals` - Get deals and pipeline

### ReZen Integration (`/api/rezen/`)
- `GET /api/rezen/performance` - Agent performance metrics
- `GET /api/rezen/transactions` - Transaction history
- `POST /api/rezen/link` - Link ReZen account

### Market Data (`/api/market-pulse/`)
- `GET /api/market-pulse` - Get market pulse data
- `GET /api/market-pulse/property-types` - Property type aggregates

### Agent Management (`/api/agent-profile/`)
- `PUT /api/agent-profile` - Update agent profile
- `POST /api/agent-profile/generate-bio` - AI-generated bio

---

## Environment Variables

### Required for Production
```env
# Database
DATABASE_URL=postgresql://...

# Authentication  
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
SESSION_SECRET=...

# MLS Data (Primary)
IDX_GRID_API_KEY=...

# CRM Integration
FUB_API_KEY=...

# Google Services
GOOGLE_CALENDAR_CREDENTIALS=...
GOOGLE_SERVICE_ACCOUNT_JSON=...

# AI Services
OPENAI_API_KEY=...

# Maps
MAPBOX_PUBLIC_TOKEN=...
```

### Optional Integrations
```env
# ReZen Analytics
REZEN_API_KEY=...

# Vimeo
VIMEO_ACCESS_TOKEN=...

# Development
NODE_ENV=production
PORT=3000
```

---

## Build Process

### Development
```bash
npm run dev          # Start development server
npm run dev:client   # Start only frontend (Vite)
```

### Production Build
```bash
npm run build        # Build both client and server
npm start            # Start production server
```

### Build Configuration
- **Client**: Vite build to `dist/` with React optimization
- **Server**: ESBuild bundles to `dist/index.cjs` with dependency bundling
- **Dependencies**: Critical dependencies bundled, others externalized
- **Minification**: Enabled for production builds

---

## Deployment on Render

### Service Configuration
- **Type**: Web Service
- **Runtime**: Node.js
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Instance Type**: Starter (can be upgraded)
- **Auto-Deploy**: Enabled from Git repository

### Environment Setup
1. Configure all required environment variables in Render dashboard
2. Database automatically provisioned and `DATABASE_URL` injected
3. Domain configured at `missioncontrol-tjfm.onrender.com`

### Database Management
- Automatic migrations on startup via `server/db.ts`
- Backup scripts available in `scripts/` directory
- Market data refresh via scheduled tasks

---

## Key Features

### 1. CMA (Comparative Market Analysis)
- **Property Search**: Integration with Repliers MLS API
- **Data Analysis**: Automated comparable property selection
- **Report Generation**: PDF reports with market analysis
- **Price History**: Track listing and sold price changes
- **Map Integration**: Mapbox visualization of comparable properties

### 2. Market Pulse
- **Real-time Data**: Market statistics and trends
- **ZIP Code Analysis**: Localized market metrics  
- **Property Type Breakdown**: Residential, land, commercial analysis
- **Historical Tracking**: Market snapshots and trends

### 3. Agent Performance
- **FUB Integration**: CRM data synchronization
- **ReZen Analytics**: Transaction and income tracking
- **Calendar Management**: Google Calendar integration
- **Profile Management**: Bio, contact info, marketing materials

### 4. Context Engine
- **AI Suggestions**: OpenAI-powered recommendations
- **User Profiling**: Agent experience and goals tracking
- **Dynamic Content**: Personalized suggestions based on activity

---

## Data Flow

### CMA Creation Process
1. **User Input**: Agent searches for subject property address
2. **MLS Search**: Repliers API queries for comparable properties
3. **Data Processing**: Server transforms and filters property data
4. **Analysis**: Calculate market metrics and suggestions
5. **Storage**: Save CMA data to PostgreSQL
6. **Presentation**: Generate interactive reports and PDFs

### Integration Synchronization
1. **FUB Sync**: Calendar events and deals pulled on-demand
2. **Google Calendar**: Service account integration for scheduling
3. **Market Data**: Scheduled refreshes via cron tasks
4. **ReZen Analytics**: User-initiated linking and data pull

---

## Security & Authentication

### Authentication Flow
1. **Google OAuth**: Primary authentication method
2. **Local Fallback**: Email/password authentication available
3. **Session Management**: Express sessions with PostgreSQL storage
4. **FUB Linking**: API key-based integration per user

### Data Protection
- **API Keys**: Stored as environment variables
- **User Data**: Encrypted sessions and secure database
- **Rate Limiting**: API rate limiting implemented
- **CORS**: Configured for production domain

---

## Monitoring & Maintenance

### Health Checks
- **Database**: Connection testing on startup
- **APIs**: Integration testing endpoints available
- **Scheduler**: Background task monitoring

### Logging
- **Request Logging**: HTTP request/response logging
- **Error Tracking**: Comprehensive error logging
- **Performance**: Response time monitoring
- **Debug Modes**: Development logging available

### Data Management
- **Backups**: Automated database backup scripts
- **Migrations**: Schema version control
- **Data Refresh**: Market pulse data refresh jobs
- **Cleanup**: Session and temporary data cleanup

---

## Development Guidelines

### Code Organization
- **Shared Types**: TypeScript interfaces in `shared/`
- **Client Components**: React components with TypeScript
- **Server Routes**: Express.js routes with middleware
- **Database Schema**: Drizzle ORM models

### API Design Patterns
- **REST Endpoints**: Standard HTTP methods and status codes
- **Authentication**: Middleware-based auth checking
- **Error Handling**: Consistent error response format
- **Data Validation**: Zod schema validation

### Frontend Architecture
- **React Query**: Data fetching and caching
- **Wouter**: Lightweight routing
- **Tailwind CSS**: Utility-first styling
- **Radix UI**: Accessible component primitives

---

## Troubleshooting

### Common Issues
1. **Missing API Keys**: Check environment variable configuration
2. **Database Connection**: Verify `DATABASE_URL` and network access
3. **Build Failures**: Check Node.js version compatibility
4. **FUB Integration**: Verify API key and user linking
5. **Google Services**: Confirm service account JSON configuration

### Debug Endpoints
- `GET /api/test-fub` - Test FUB API connectivity
- `GET /api/test-google-calendar` - Test Google Calendar setup
- `GET /api/debug/auth-status` - Check authentication status

### Log Analysis
- Review Render logs for server-side issues
- Check browser console for client-side errors
- Monitor API response times and error rates

---

This documentation provides a comprehensive overview for any AI assistant working on the Agent Hub Portal project. The system integrates multiple real estate APIs and provides a full-featured agent productivity platform.