# Agent Hub Portal - API Reference

## Base URL
**Production**: `https://missioncontrol-tjfm.onrender.com`  
**Local Development**: `http://localhost:3000`

---

## Authentication

All API endpoints require authentication unless otherwise noted.

### Headers
```
Cookie: session-cookie (handled automatically by browser)
Content-Type: application/json
```

### Auth Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/user` | GET | Get current authenticated user |
| `/api/auth/link-fub` | POST | Link Follow Up Boss account |

---

## CMA (Comparative Market Analysis)

### CMA Management
| Endpoint | Method | Description | Body |
|----------|--------|-------------|------|
| `/api/cma` | GET | List user's CMAs | - |
| `/api/cma` | POST | Create new CMA | `{name, subjectProperty, comparableProperties, notes}` |
| `/api/cma/:id` | GET | Get specific CMA | - |
| `/api/cma/:id` | PUT | Update CMA | `{name, subjectProperty, comparableProperties, notes, status}` |
| `/api/cma/:id` | DELETE | Delete CMA | - |

### Property Search
| Endpoint | Method | Description | Body |
|----------|--------|-------------|------|
| `/api/cma/search-properties` | POST | Search properties for CMA | See search parameters below |

#### Search Parameters
```json
{
  "search": "2402 Rockingham Cir, Austin, TX 78704",
  "city": "Austin",
  "subdivision": "Circle C Ranch", 
  "zip": "78704",
  "county": "Travis",
  "minBeds": 3,
  "minBaths": 2,
  "minPrice": 300000,
  "maxPrice": 600000,
  "propertyType": "Single Family Residence",
  "statuses": ["Active", "Closed"],
  "minSqft": 1500,
  "maxSqft": 3000,
  "dateSoldDays": 180,
  "page": 1,
  "limit": 25,
  "mapBounds": {
    "sw": {"lat": 30.2, "lng": -97.8},
    "ne": {"lat": 30.3, "lng": -97.7}
  }
}
```

---

## Follow Up Boss Integration

| Endpoint | Method | Description | Query Parameters |
|----------|--------|-------------|------------------|
| `/api/fub/agents` | GET | List FUB agents | - |
| `/api/fub/calendar` | GET | Get calendar events | `startDate`, `endDate`, `agentId` |
| `/api/fub/deals` | GET | Get deals and pipeline | `agentId` |
| `/api/test-fub` | GET | Test FUB API connectivity | - |

### Calendar Response
```json
{
  "events": [
    {
      "id": "12345",
      "title": "Property Showing",
      "startDate": "2024-02-20T10:00:00Z",
      "endDate": "2024-02-20T11:00:00Z",
      "type": "meeting",
      "location": "123 Main St",
      "personName": "John Smith"
    }
  ]
}
```

---

## ReZen Analytics

| Endpoint | Method | Description | Body |
|----------|--------|-------------|------|
| `/api/rezen/performance` | GET | Agent performance metrics | - |
| `/api/rezen/transactions` | GET | Transaction history | Query: `period`, `side`, `status` |
| `/api/rezen/income` | GET | Income overview | Query: `yentaId` |
| `/api/rezen/link` | POST | Link ReZen account | `{yentaId}` |
| `/api/rezen/unlink` | POST | Unlink ReZen account | - |

### Performance Response
```json
{
  "summary": {
    "gciYTD": 125000,
    "gciL12M": 180000,
    "totalDealsYTD": 15,
    "avgPerDeal": 8333
  },
  "dealBreakdown": {
    "buyerCountYTD": 8,
    "sellerCountYTD": 7,
    "totalVolumeYTD": 4500000
  },
  "pendingPipeline": [...]
}
```

---

## Market Data & Analytics

### Market Pulse
| Endpoint | Method | Description | Query Parameters |
|----------|--------|-------------|------------------|
| `/api/market-pulse` | GET | Market statistics | `refresh=true` |
| `/api/market-pulse/property-types` | GET | Property type breakdown | - |
| `/api/market-pulse/heatmap` | GET | ZIP code heatmap data | - |
| `/api/market-pulse/zip/:zipCode` | GET | Specific ZIP analysis | - |
| `/api/market-pulse/trends` | GET | Market trend data | `months`, `area` |

### Company Listings
| Endpoint | Method | Description | Query Parameters |
|----------|--------|-------------|------------------|
| `/api/company-listings` | GET | Spyglass company listings | `page`, `limit`, `status`, `sortBy` |
| `/api/spyglass-listings` | GET | Alternative company listings | Same as above |

---

## Agent Management

### Profile Management
| Endpoint | Method | Description | Body |
|----------|--------|-------------|------|
| `/api/agent-profile` | PUT | Update agent profile | `{phone, title, bio, headshotUrl}` |
| `/api/agent-profile/generate-bio` | POST | AI-generated bio | `{experience, specialties, location}` |

### Context & Suggestions  
| Endpoint | Method | Description | Body |
|----------|--------|-------------|------|
| `/api/context/profile` | GET | Get agent context profile | - |
| `/api/context/profile` | POST | Update context profile | `{missionFocus, experienceLevel, primaryGoal}` |
| `/api/context/suggestions` | GET | Get AI suggestions | - |
| `/api/context/suggestions/:id/dismiss` | POST | Dismiss suggestion | - |
| `/api/context/suggestions/:id/complete` | POST | Complete suggestion | - |

---

## Content & Resources

### Agent Resources
| Endpoint | Method | Description | Body |
|----------|--------|-------------|------|
| `/api/agent-resources` | GET | List agent resources | - |
| `/api/agent-resources` | POST | Create resource | `{name, type, url, fileData}` |
| `/api/agent-resources/:id` | PUT | Update resource | Resource data |
| `/api/agent-resources/:id` | DELETE | Delete resource | - |

### Training Videos
| Endpoint | Method | Description | Query Parameters |
|----------|--------|-------------|------------------|
| `/api/training/latest-video` | GET | Get latest training video | - |

---

## Admin & Configuration

### Integration Management
| Endpoint | Method | Description | Body |
|----------|--------|-------------|------|
| `/api/admin/integrations` | GET | List integrations | - |
| `/api/admin/integrations` | POST | Add integration | `{name, apiKey, config}` |
| `/api/admin/integrations/:name/test` | POST | Test integration | - |

### System Health
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/debug/auth-status` | GET | Authentication status |
| `/api/test-google-calendar` | GET | Test Google Calendar |

---

## Error Responses

### Standard Error Format
```json
{
  "message": "Error description",
  "error": "specific_error_code",
  "debug": true
}
```

### Common HTTP Status Codes
- `200` - Success
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (insufficient permissions)
- `404` - Resource not found
- `422` - Validation error
- `500` - Internal server error
- `502` - External API error (Repliers, FUB, etc.)
- `503` - Service unavailable (integration not configured)

---

## Rate Limits

### API Usage Guidelines
- **CMA Searches**: Reasonable limits (25 properties) for performance
- **External APIs**: Respectful usage patterns implemented
- **Bulk Operations**: Pagination for large datasets

### Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1645123456
```

---

## Webhooks & Real-time

### Available Webhooks
Currently, the system uses polling-based updates rather than webhooks. Future implementation may include:
- FUB deal updates
- ReZen transaction notifications
- Market data refresh notifications

### WebSocket Events
Not currently implemented, but could be added for:
- Real-time CMA collaboration
- Live market data updates
- Notification system

---

## SDK & Client Libraries

### JavaScript/TypeScript
The frontend uses the following patterns for API calls:

```typescript
import { apiRequest } from '@/lib/queryClient';

// GET request
const cmas = await apiRequest('/api/cma');

// POST request with body
const result = await apiRequest('/api/cma/search-properties', {
  method: 'POST',
  body: JSON.stringify(searchParams)
});
```

### React Query Integration
```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

// Query
const { data: cmas } = useQuery({
  queryKey: ['cmas'],
  queryFn: () => apiRequest('/api/cma')
});

// Mutation
const createCMA = useMutation({
  mutationFn: (cmaData) => apiRequest('/api/cma', {
    method: 'POST',
    body: JSON.stringify(cmaData)
  })
});
```

---

This API reference provides comprehensive endpoint documentation for the Agent Hub Portal system.