# Third-Party Integrations Guide

## Overview

Agent Hub Portal integrates with multiple third-party services to provide comprehensive real estate functionality. This document details each integration, configuration requirements, and implementation specifics.

---

## 1. Repliers API (Primary MLS Integration)

### Purpose
Primary source for MLS (Multiple Listing Service) data including property listings, market statistics, and real estate analytics.

### Configuration
```env
IDX_GRID_API_KEY=your_repliers_api_key
```

### API Details
- **Base URL**: `https://api.repliers.io`
- **Authentication**: API Key in header `REPLIERS-API-KEY`
- **Documentation**: https://docs.repliers.io/reference/getting-started-with-your-api
- **Rate Limits**: Respectful usage implemented

### Key Endpoints Used
```javascript
// Property search with filtering
GET /listings?listings=true&type=Sale&standardStatus=Active&city=Austin

// Market aggregates
GET /listings?aggregates=class,details.propertyType&listings=false

// Geographic search via POST with polygon data
POST /listings
Body: { map: [[[lng, lat], [lng, lat], ...]] }
```

### Data Fields Retrieved
```javascript
const fields = [
  'mlsNumber', 'listingId', 'address', 'map', 'details', 'images',
  'listPrice', 'soldPrice', 'originalPrice', 'listPriceLog',
  'remarks', 'publicRemarks', 'description',
  'listDate', 'soldDate', 'closeDate', 
  'daysOnMarket', 'simpleDaysOnMarket',
  'standardStatus', 'status', 'lastStatus',
  'bedroomsTotal', 'bathroomsTotal', 'livingArea'
];
```

### Implementation Notes
- **Austin MSA Focus**: Filters by Travis, Williamson, Hays, Bastrop, Caldwell counties
- **Photo Processing**: Custom utility `extractPhotosFromRepliersList()` handles image arrays
- **Status Handling**: Maps RESO standards (Active, Under Contract, Closed)
- **Search Strategies**: Address parsing, geographic bounds, MLS number lookup

---

## 2. Follow Up Boss (FUB) CRM

### Purpose
Real estate CRM integration for agent management, calendar events, deal tracking, and lead management.

### Configuration
```env
FUB_API_KEY=your_fub_api_key
```

### API Details
- **Base URL**: `https://api.followupboss.com/v1`
- **Authentication**: Basic Auth with API key as username
- **Documentation**: Follow Up Boss API docs
- **Client**: `server/fubClient.ts`

### Key Features
```javascript
// Get agent information
GET /people/agents

// Calendar events
GET /events?start=2024-01-01&end=2024-01-31&assignedUser=123

// Deals and pipeline
GET /deals?assignedUser=123

// Tasks and to-dos
GET /todos?assignedUser=123&completed=false
```

### Data Models
```typescript
interface FubAgent {
  id: number;
  name: string;
  email: string;
}

interface FubEvent {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  type: 'appointment' | 'task' | 'deal_closing';
  personName?: string;
  location?: string;
}

interface FubDeal {
  id: number;
  personName: string;
  price: number;
  status: 'under_contract' | 'closed' | 'active';
  closeDate?: string;
}
```

### User Linking Process
1. User provides FUB API key in Agent Hub Portal
2. System looks up FUB user by email address
3. Links FUB user ID to Agent Hub Portal user record
4. Enables personalized calendar and deal data

---

## 3. Google Services Integration

### Purpose
Authentication, calendar integration, and service account access for Google APIs.

### Configuration
```env
# OAuth for authentication
GOOGLE_CLIENT_ID=your_client_id.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret

# Service Account for Calendar API
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
GOOGLE_CALENDAR_CREDENTIALS=path/to/credentials.json
```

### Services Used

#### Google OAuth 2.0
- **Scope**: User profile and email access
- **Implementation**: Passport.js strategy
- **Flow**: Authorization code flow with PKCE

#### Google Calendar API
- **Purpose**: Agent scheduling integration
- **Authentication**: Service account with domain-wide delegation
- **Client**: `server/googleCalendarClient.ts`

```javascript
// Calendar API usage
const calendar = google.calendar({ version: 'v3', auth: jwtClient });
const events = await calendar.events.list({
  calendarId: userEmail,
  timeMin: startDate,
  timeMax: endDate
});
```

### Domain-Wide Delegation Setup
Required for accessing user calendars via service account:
1. Create service account in Google Console
2. Enable Calendar API
3. Configure domain-wide delegation in Google Admin
4. Authorize service account with calendar scopes

---

## 4. ReZen Analytics

### Purpose
Real estate transaction analytics, performance metrics, and income tracking.

### Configuration
```env
REZEN_API_KEY=your_rezen_api_key
```

### API Details
- **Base URL**: ReZen API endpoint
- **Authentication**: API key based
- **Client**: `server/rezenClient.ts`

### Key Functionality
```javascript
// Income overview
getIncomeOverview(yentaId: string)

// Transaction history
getTransactions(yentaId: string, status: 'OPEN' | 'CLOSED', options)

// Performance metrics
// - GCI (Gross Commission Income)
// - Transaction counts and volumes
// - YTD vs L12M comparisons
```

### User Linking
- Users provide their ReZen Yenta ID (UUID format)
- System validates UUID format
- Stores in user profile for API calls

---

## 5. OpenAI Integration

### Purpose
AI-powered content generation, bio creation, and contextual suggestions.

### Configuration
```env
OPENAI_API_KEY=sk-your_openai_api_key
```

### Implementation
```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Bio generation
const response = await openai.chat.completions.create({
  model: "gpt-3.5-turbo",
  messages: [
    {
      role: "system",
      content: "Generate a professional real estate agent bio..."
    },
    {
      role: "user", 
      content: `Agent details: ${agentInfo}`
    }
  ],
  max_tokens: 300
});
```

### Use Cases
- **Agent Bio Generation**: Creates professional bios based on experience
- **Context Suggestions**: Provides actionable recommendations
- **Content Enhancement**: Improves marketing copy and descriptions

---

## 6. Mapbox Integration

### Purpose
Interactive maps, property visualization, and geographic analysis.

### Configuration
```env
MAPBOX_PUBLIC_TOKEN=pk.your_mapbox_token
```

### Implementation
```javascript
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';

// Map initialization
mapboxgl.accessToken = process.env.MAPBOX_PUBLIC_TOKEN;
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11',
  center: [-97.7431, 30.2672], // Austin, TX
  zoom: 10
});
```

### Features Used
- **Property Markers**: Display CMA comparable properties
- **Drawing Tools**: User-drawn polygon search areas
- **Bounds Search**: Rectangle selection for property queries
- **Clustering**: Group nearby properties for better UX

---

## 7. Vimeo Integration

### Purpose
Training video content delivery and educational materials.

### Configuration
```env
VIMEO_ACCESS_TOKEN=your_vimeo_token
```

### Implementation
```javascript
// Get latest training video
const response = await fetch('https://api.vimeo.com/me/videos', {
  headers: {
    'Authorization': `bearer ${process.env.VIMEO_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  }
});
```

### Usage
- Delivers latest training content to agents
- Embedded video players in training sections
- Progress tracking for educational materials

---

## 8. Email Services (Gmail API)

### Purpose
Email integration for agent communication and lead management.

### Configuration
Uses same Google Service Account as Calendar API.

### Client
`server/gmailClient.ts` - Handles Gmail API interactions

---

## Integration Testing Endpoints

### Health Check Endpoints
```javascript
// Test FUB connectivity
GET /api/test-fub
Response: { success: true, fubResponse: {...} }

// Test Google Calendar
GET /api/test-google-calendar  
Response: { success: true, message: "Client initialized" }

// Test integration configurations
GET /api/admin/integrations
Response: [{ name: "fub", configured: true, lastTested: "..." }]
```

---

## Error Handling Patterns

### API Failures
```javascript
// Standard error response
{
  "message": "Failed to fetch FUB data",
  "error": "api_unavailable", 
  "integration": "fub",
  "debug": true
}
```

### Fallback Strategies
- **FUB Unavailable**: Return empty events/deals with message
- **Repliers API Error**: Show cached data if available
- **Google Services**: Graceful degradation of calendar features
- **ReZen Offline**: Display "Service temporarily unavailable"

---

## Security Considerations

### API Key Management
- All keys stored as environment variables
- Never exposed to frontend JavaScript
- Rotation procedures documented

### Data Privacy
- User data encrypted in transit and at rest
- API keys scoped to minimum required permissions
- Regular security audits of integrations

### Rate Limiting
- Respectful API usage patterns implemented
- Exponential backoff for failed requests
- Request queuing for high-volume operations

---

## Monitoring & Maintenance

### Health Monitoring
- Integration status checks on startup
- Periodic connectivity testing
- Error rate monitoring per integration

### Logging
```javascript
// Integration-specific logging
console.log('[FUB] API call successful:', { endpoint, responseTime });
console.error('[Repliers] API error:', { status, error, retryAttempt });
```

### Maintenance Tasks
- **API Key Rotation**: Quarterly security updates
- **Endpoint Monitoring**: Track API changes and deprecations
- **Performance Optimization**: Monitor response times and optimize calls
- **Error Analysis**: Regular review of integration failures

This integration guide provides comprehensive details for maintaining and extending third-party service connections in Agent Hub Portal.