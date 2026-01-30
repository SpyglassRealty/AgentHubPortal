# Mission Control - Spyglass Realty Agent Portal

## Overview

Mission Control is a unified agent portal for Spyglass Realty, designed as a centralized hub for real estate agents. It provides authenticated access to various integrated applications like ReChat, Blog to Email Automator, and RealtyHack AI, all within a branded dashboard. The project aims to enhance agent productivity by offering a single point of access to essential tools and providing context-aware suggestions based on agent profiles and market data.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Technologies

The application is a full-stack web application with a React frontend and an Express.js backend, written in TypeScript. It is designed to run on Replit, leveraging its authentication services.

### Frontend

- **Technology Stack**: React 18, Vite, TypeScript.
- **UI/UX**: Utilizes `shadcn/ui` (built on Radix UI and Tailwind CSS) for a consistent, accessible, and branded interface.
  - **Brand Colors (Official)**: 
    - Spyglass Red-Orange: `#EF4923` / `hsl(11, 86%, 54%)` / `rgb(239, 73, 35)`
    - Spyglass Black: `#222222` / `hsl(0, 0%, 13%)` / `rgb(34, 34, 34)`
  - All orange UI elements use `#EF4923`, hover states use `#D4401F`
  - **Dark Mode Colors**:
    - Background: `#222222` (Spyglass Black) - NOT pure black
    - Cards/Elevated surfaces: `#2a2a2a` (slightly lighter)
    - Secondary/Muted: `#333333`
    - Borders: `#3a3a3a` / `border-[#333333]`
  - Responsive design with mobile/desktop breakpoints, 44px+ touch targets, and safe area insets
- **Routing**: `Wouter` handles client-side routing, with conditional rendering based on authentication status.
- **State Management**: `TanStack Query` manages server state, while a custom `useAuth` hook handles global authentication state.

### Backend

- **Server Framework**: Express.js with Node.js, using ESM modules.
- **Build Strategy**: Vite for client-side and esbuild for server-side bundling.
- **Authentication**: Custom OpenID Connect (OIDC) integration with Replit's authentication service via Passport.js. Sessions are managed in PostgreSQL using `connect-pg-simple` with a 7-day duration.
- **API**: RESTful API under `/api` prefix, protected by authentication middleware.
- **Logging**: Custom utility for API request logging.

### Data Storage

- **Database**: PostgreSQL accessed via Drizzle ORM.
- **ORM Choice**: Drizzle ORM for type-safe queries, lightweight runtime, and a built-in migration system.
- **Schema**: Includes `users` (synchronized from OIDC), `sessions`, `agent_profiles`, `context_suggestions`, and `market_pulse_snapshots` tables.

### Feature Specifications

- **Context-Aware Mission Control**: Aims to proactively suggest tasks and actions based on agent profiles and FUB data.
    - **Onboarding Flow**: Gathers agent preferences (focus, experience, goals) to tailor suggestions.
    - **Context Engine**: Rule-based engine analyzing FUB data to generate suggestions like `deal_action`, `closing_soon`, `task_overdue`, etc.
- **Follow Up Boss (FUB) Integration**: Custom API client communicates with FUB via HTTP Basic Auth.
    - **Endpoints**: Retrieves calendar events, deals, and agent lists.
    - **Agent Linking**: Automatically links users to their FUB account by email. Super admins can view data for any agent.
- **ReZen Integration**: Custom client for ReZen/Real Brokerage platform using `X-API-KEY` header.
    - **Endpoints**: Fetches transaction data, income overviews, and performance metrics.
    - **My Performance Widget**: Displays GCI summaries, deal breakdowns, performance insights, and pending pipeline. Users can link their ReZen account via `yentaId`.
- **Market Pulse**: Displays real-time Austin Metro Area property inventory using the Repliers API.
    - **Data**: Covers Active, Active Under Contract, Pending, and Closed listings (30 days).
    - **Caching**: Data is cached in the `market_pulse_snapshots` table and refreshed daily via `node-cron` or manually.
- **Company Listings Widget**: Dashboard widget showing Spyglass Realty office-specific listings.
    - **Office Filtering**: Uses `officeId=ACT1518371` to filter for Spyglass Realty listings (NOT listOfficeKey=5220).
    - **SPYGLASS_OFFICES Config**: Maps office names to Repliers officeId values (e.g., `austin` → `ACT1518371`).
    - **Display**: Horizontal scrolling cards with property photo, price, address, bed/bath/sqft.
    - **Image CDN**: All images served via `https://cdn.repliers.io/` base URL.
    - **API Endpoint**: `GET /api/company-listings/office?office=austin&status=Active&limit=20` (legacy: `officeCode=5220` also supported)
    - **Dashboard Layout**: Vertical stack with Market Pulse at top and Spyglass listings below.
- **Properties Page - Enhanced Austin Metro Listings**: Full-featured listings browser with office filter toggle.
    - **Office Toggle**: "All Austin Metro" (~20k listings) vs "Spyglass Realty Only" (~109 listings)
    - **URL Parameter**: `/properties?office=spyglass` - Pre-selects Spyglass filter
    - **API Endpoint**: `GET /api/company-listings?office=all|spyglass` - Returns paginated listings with office filter
    - **View Modes**: Grid (1-4 columns), List (horizontal cards), Table (scrollable)
    - **Filters**: Status, Price Range, Beds, Baths, SqFt, City, Property Type, Days on Market, Search
    - **Pagination**: Page numbers, prev/next buttons, items per page selector
    - **Dashboard Integration**: "View All" from Spyglass Listings navigates to `/properties?office=spyglass`
- **Notification System**: Centralized notification service with user preferences.
    - **Notification Types**: `lead_assigned`, `appointment_reminder`, `deal_update`, `task_due`, `system`.
    - **Preference Controls**: Per-type toggles, quiet hours (Central timezone), and delivery method preferences (push/email).
    - **Notification Service**: `server/services/notificationService.ts` checks user preferences before creating notifications.
    - **Settings UI**: Integrated into the Settings page (`/settings`) with comprehensive toggle controls.
- **Training Videos Modal**: Embedded video training system with Vimeo integration.
    - **Vimeo Configuration**: 
        - User ID: `192648675`
        - Folder ID: `27970547` (Training Videos folder)
        - API Path: `/users/{user_id}/projects/{folder_id}/videos`
    - **Video Playback**: Uses @vimeo/player SDK for embedded playback within the modal.
    - **Filter Tabs**: All, New, Favorites, Watch Later, Continue Watching.
    - **User Preferences**: Favorites, Watch Later, and Continue Watching functionality stored per-user.
    - **Progress Tracking**: Automatic progress saving with 10-second throttling, immediate save on pause/ended.
    - **Resume Playback**: Videos resume from saved position using player.setCurrentTime() on player ready.
    - **Database Schema**: `userVideoPreferences` table stores favorites, watch later, progress, and video metadata.
    - **API Endpoints**: 
        - `/api/vimeo/training-videos` - Returns all videos from the Training Videos folder
        - `/api/vimeo/latest-video` - Returns the most recent video for Dashboard Company Updates
        - GET/POST for favorites, watch later, progress, and bulk preferences retrieval.
- **Marketing Calendar**: AI-powered social media content idea generator.
    - **Content Generation**: Uses GPT-4o to generate monthly social media content plans.
    - **Save/Delete Functionality**: Users can save content ideas to their account and delete them.
    - **Database Schema**: `savedContentIdeas` table stores saved content with platform, content type, hashtags, and status.
    - **API Endpoints**:
        - `POST /api/marketing/social-ideas` - Generate AI content ideas for a month
        - `GET /api/content-ideas/saved` - Retrieve all saved content ideas
        - `POST /api/content-ideas/save` - Save a content idea (Zod validated)
        - `DELETE /api/content-ideas/:id` - Delete a saved content idea
        - `PATCH /api/content-ideas/:id/status` - Update status (saved/scheduled/posted)

## External Dependencies

- **Replit Platform Services**: Replit Auth (OIDC), Replit Development Tools (Cartographer, dev-banner), Replit Deployment.
- **Third-Party UI Libraries**: Radix UI, Lucide React, Framer Motion, Embla Carousel.
- **Form Handling**: React Hook Form, Zod, @hookform/resolvers.
- **Utility Libraries**: date-fns, nanoid, clsx, tailwind-merge.
- **Build & Development Tools**: Vite, esbuild, TypeScript, Tailwind CSS.
- **Database Stack**: PostgreSQL (external), Drizzle ORM, node-postgres (pg), connect-pg-simple.
- **Application Integrations**: Follow Up Boss API, ReZen API, Repliers API.