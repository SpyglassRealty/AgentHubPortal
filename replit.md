# Mission Control - Spyglass Realty Agent Portal

## Overview

Mission Control is a unified agent portal for Spyglass Realty, built as a centralized hub for accessing various real estate tools and resources. The application provides authenticated access to multiple integrated applications including ReChat (CRM), Blog to Email Automator, and RealtyHack AI, presenting them in a clean, branded dashboard interface.

The system is built as a full-stack web application with a React frontend and Express backend, designed to run on Replit's platform with built-in authentication and session management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack**: React 18 with TypeScript, using Vite as the build tool and development server.

**UI Framework**: The application uses shadcn/ui component library built on Radix UI primitives, styled with Tailwind CSS. This provides a consistent, accessible component system with the "new-york" style variant.

**Routing**: Client-side routing is handled by Wouter, a lightweight React router. The routing strategy implements a conditional render based on authentication state:
- Unauthenticated users see only the landing page
- Authenticated users access the dashboard and individual app views
- A loading state displays during authentication checks

**State Management**: 
- TanStack Query (React Query) manages server state with custom query functions that handle authentication errors
- Authentication state is globally accessible through a custom `useAuth` hook
- No global client state management library is used; component state and React Query suffice

**Design System**: The application implements Spyglass Realty's brand identity with a custom color palette:
- Primary brand color: Orange (hsl(28, 94%, 54%))
- Neutral base: Charcoal grays
- Custom CSS variables in Tailwind configuration enable theming throughout shadcn components

**Responsive Design**: The layout adapts between desktop and mobile using a sidebar pattern that converts to a mobile sheet/drawer on smaller screens.

### Backend Architecture

**Server Framework**: Express.js running on Node.js with TypeScript, using ESM modules.

**Build Strategy**: The build process uses two separate tools:
- Vite for client-side bundling (outputs to `dist/public`)
- esbuild for server-side bundling (outputs to `dist/index.cjs`)
- Selected dependencies are bundled with the server to reduce filesystem syscalls and improve cold start performance

**Development vs Production**:
- Development mode uses Vite's middleware mode for HMR and live reloading
- Production mode serves pre-built static files from the dist directory
- Conditional Replit-specific plugins (cartographer, dev-banner) load only in development

**Authentication System**: Custom OpenID Connect (OIDC) integration with Replit's authentication service using Passport.js:
- Strategy: `openid-client/passport` for OIDC flows
- Session Management: PostgreSQL-backed sessions via `connect-pg-simple`
- Session Duration: 7 days with secure, httpOnly cookies
- User Profile: Claims are extracted from OIDC tokens and stored in the database

**Session Storage**: Sessions are persisted in PostgreSQL rather than in-memory, enabling:
- Session persistence across server restarts
- Horizontal scaling capabilities
- 7-day session TTL with automatic cleanup

**API Architecture**: RESTful endpoints under `/api` prefix:
- `/api/auth/user` - Returns authenticated user profile
- Authentication middleware (`isAuthenticated`) protects all API routes
- Consistent error handling with appropriate HTTP status codes

**Logging**: Custom logging utility formats requests with timestamps and duration tracking for API endpoints.

### Data Storage Solutions

**Database**: PostgreSQL accessed via Drizzle ORM

**ORM Choice**: Drizzle was selected for:
- Type-safe database queries with full TypeScript inference
- Lightweight runtime compared to alternatives
- SQL-like query syntax for developer familiarity
- Built-in migration system via drizzle-kit

**Schema Design**:
- `users` table: Stores user profiles synchronized from OIDC authentication (id, email, names, profile image, fubUserId, isSuperAdmin, timestamps)
- `sessions` table: Stores express-session data (managed by connect-pg-simple)
- UUID generation uses PostgreSQL's `gen_random_uuid()` for primary keys

### Follow Up Boss Integration

**API Client**: Custom FUB client (`server/fubClient.ts`) handles all API communication using HTTP Basic Auth with the broker-level API key stored in `FUB_API_KEY` secret.

**Endpoints**:
- `/api/fub/calendar` - Returns events and tasks for the authenticated user (or impersonated agent)
- `/api/fub/deals` - Returns deals with summary statistics
- `/api/fub/agents` - Super admin only, returns list of all active FUB users

**Agent Linking**: Users are automatically linked to their FUB account by email on first API request. The `fubUserId` is cached in the database for subsequent requests.

**Super Admin Feature**: Users with `isSuperAdmin=true` can view any agent's data via an agent selector dropdown on Calendar and Reports pages. The selected agent ID is passed to API endpoints via `agentId` query parameter.

### Context-Aware Mission Control

**Philosophy**: Transforms the dashboard from "What do you want to work on?" to "Here's what you should work on right now."

**Components**:
- `agent_profiles` table: Stores agent onboarding answers (missionFocus, experienceLevel, primaryGoal)
- `context_suggestions` table: Stores generated action items with priority, type, and recommended app
- `ContextEngine` (`server/contextEngine.ts`): Rule-based engine that analyzes FUB data and generates suggestions

**Onboarding Flow**: First-time users see a 3-question modal:
1. Primary focus (buyers, sellers, both, team lead)
2. Experience level (new, experienced, veteran)
3. Top priority this quarter (grow pipeline, close deals, build team, improve systems)

**Suggestion Types**:
- `deal_action`: Buyers in inspection stage requiring attention
- `closing_soon`: Deals closing within the next 7 days
- `pipeline_empty`: No active deals detected
- `task_overdue`: Incomplete tasks past due date
- `appointments_today`: Events scheduled for today
- `deal_summary`: Overview of current under-contract volume

**API Endpoints**:
- `GET /api/context/profile` - Returns agent profile and onboarding status
- `POST /api/context/profile` - Saves onboarding answers
- `GET /api/context/suggestions` - Regenerates and returns active suggestions
- `POST /api/context/suggestions/:id/dismiss` - Dismisses a suggestion
- `POST /api/context/suggestions/:id/complete` - Marks a suggestion as completed

### ReZen Integration

**API Client**: Custom ReZen client (`server/rezenClient.ts`) handles API communication with the ReZen/Real Brokerage platform.

**Authentication**: Uses `x-api-key` header (no Bearer prefix) with the API key stored in `REZEN_API_KEY` secret.

**Endpoints**:
- `/api/rezen/transactions` - Returns closed transactions for a given agent yentaId

**Usage**: Each agent's yentaId is found in their ReZen profile URL (e.g., `0d71597f-e3af-47bd-9645-59fc2910656e`). Query params: `yentaId` (required), `dateFrom`, `dateTo`.

**Database Configuration**: Connection via `DATABASE_URL` environment variable, with connection pooling through `node-postgres` (pg).

**Migration Strategy**: Schema changes are managed through Drizzle Kit:
- Schema definition lives in `shared/schema.ts`
- Migrations output to `./migrations` directory
- `npm run db:push` applies schema changes to the database

### External Dependencies

**Replit Platform Services**:
- **Replit Auth (OIDC)**: Primary authentication provider via `https://replit.com/oidc`
- **Replit Development Tools**: Cartographer and dev-banner plugins for enhanced development experience
- **Replit Deployment**: Custom meta image plugin updates OpenGraph tags with Replit deployment URLs

**Third-Party UI Libraries**:
- **Radix UI**: Accessible component primitives for all interactive UI elements
- **Lucide React**: Icon library providing consistent iconography
- **Framer Motion**: Animation library for page transitions and micro-interactions
- **Embla Carousel**: Touch-enabled carousel component

**Form Handling**:
- **React Hook Form**: Form state management
- **Zod**: Runtime type validation and schema definition
- **@hookform/resolvers**: Bridges React Hook Form with Zod validators

**Utility Libraries**:
- **date-fns**: Date formatting and manipulation
- **nanoid**: Unique ID generation for cache-busting and identifiers
- **clsx & tailwind-merge**: Conditional className composition

**Build & Development Tools**:
- **Vite**: Frontend build tool with HMR
- **esbuild**: Fast server-side bundling
- **TypeScript**: Type safety across the entire stack
- **Tailwind CSS**: Utility-first CSS framework with custom configuration

**Database Stack**:
- **PostgreSQL**: Primary data store (provisioned externally, connected via DATABASE_URL)
- **Drizzle ORM**: Type-safe database queries and migrations
- **node-postgres (pg)**: PostgreSQL client with connection pooling
- **connect-pg-simple**: PostgreSQL session store for express-session

**Application Integration**: The system serves as a portal to external applications (ReChat, Blog to Email Automator, RealtyHack AI) which are embedded via iframes or opened in new tabs. No direct API integrations with these services exist at the application layer.