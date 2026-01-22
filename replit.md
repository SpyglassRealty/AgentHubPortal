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
- **UI/UX**: Utilizes `shadcn/ui` (built on Radix UI and Tailwind CSS) for a consistent, accessible, and branded interface (Spyglass Realty's orange and charcoal palette). It features a responsive design adapting to mobile and desktop with appropriate breakpoints, touch targets, and dynamic viewport handling.
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

## External Dependencies

- **Replit Platform Services**: Replit Auth (OIDC), Replit Development Tools (Cartographer, dev-banner), Replit Deployment.
- **Third-Party UI Libraries**: Radix UI, Lucide React, Framer Motion, Embla Carousel.
- **Form Handling**: React Hook Form, Zod, @hookform/resolvers.
- **Utility Libraries**: date-fns, nanoid, clsx, tailwind-merge.
- **Build & Development Tools**: Vite, esbuild, TypeScript, Tailwind CSS.
- **Database Stack**: PostgreSQL (external), Drizzle ORM, node-postgres (pg), connect-pg-simple.
- **Application Integrations**: Follow Up Boss API, ReZen API, Repliers API.