# Foreclosure Flow - Property Management System

A comprehensive foreclosure property management system built with Next.js, featuring advanced visit tracking and scheduling.

## 🆕 New Features Added: Property Visit Tracking & Asset Management Platform

### 1. Enhanced Quick Info Panel
The property detail view now includes two new fields in the Quick Info section:
- **Last Property Visit**: Shows the date when the property was last visited
- **Visit Schedule**: Dropdown to select weekly or bi-weekly visit frequency
- **Next Visit Due**: Calculated field showing when the next visit is scheduled
- **Visit Status**: Color-coded indicators for overdue, due soon, or upcoming visits

### 2. Dashboard Integration
The dashboard now features:
- **Properties Due This Week**: New widget showing properties that need visits during the current calendar week (Monday-Sunday)
- **Needs Visit**: Updated counter that calculates properties requiring visits based on schedule
- **Visit Status Indicators**: Color-coded system (red=overdue, yellow=due soon, green=on track)

### 3. Database Schema Updates
Added new fields to the `properties` table:
```sql
- last_visit_date (DATE) - When property was last visited
- visit_schedule (ENUM: 'weekly', 'bi-weekly') - Visit frequency
- asset_management_platform (TEXT) - Platform managing the asset
```

### 4. Visit Scheduling Logic
- **Weekly Schedule**: Property due for visit every 7 days from last visit
- **Bi-weekly Schedule**: Property due for visit every 14 days from last visit
- **Dashboard Calculation**: Shows properties due within current calendar week (Monday-Sunday)
- **Status Colors**: 
  - Red: Overdue visits
  - Yellow: Due within 2 days
  - Green: Future visits

### 5. UI Components
- **QuickInfoPanel**: Enhanced with visit tracking fields and status indicators
- **PropertyDetailPage**: Updated property view with visit history and scheduling
- **Dashboard**: New "Properties Due This Week" section with visit scheduling
- **EditPropertyForm**: Added visit tracking fields to property editing

### 6. Asset Management Platform Integration
- **Smart Autocomplete**: Text input with intelligent suggestions based on previously entered platforms
- **Learning System**: Automatically remembers and suggests all previously entered platform names
- **Standardization**: Helps standardize platform names across properties
- **Common Platforms**: Pre-loaded with realistic platforms like "Fannie Mae", "Freddie Mac", "Bank of America REO", "Wells Fargo REO", "JPMorgan Chase REO", "HUD Homes", "Citibank REO", "PNC Bank REO"
- **Form Integration**: Available in both property creation and edit forms
- **Display**: Shown prominently in property details under Property Management section

## Tech Stack
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite with better-sqlite3
- **Design System**: Spyglass Mission Control (dark charcoal + orange accents)

## Installation

1. Clone the repository:
```bash
cd ~/clawd/projects/foreclosure-management-pro
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Database
The SQLite database is automatically initialized on first run with:
- Properties table with visit tracking fields
- Visit history table for detailed visit logs
- Sample data with realistic visit schedules

## Deployment
The application is deployed on Vercel at: https://foreclosure-flow.vercel.app

## Project Structure
```
├── app/                    # Next.js App Router
│   ├── dashboard/         # Dashboard with visit scheduling
│   ├── properties/        # Property management
│   │   └── [id]/         # Property details & edit
│   └── api/              # API routes
├── components/           # Reusable components
│   ├── Sidebar.tsx      # Main navigation
│   └── QuickInfoPanel.tsx # Enhanced property info panel
├── lib/                 # Business logic
│   ├── database.ts      # SQLite database setup
│   └── properties.ts    # Property service with visit logic
└── types/               # TypeScript definitions
```

## Key Features
- 📊 **Dashboard**: Overview of portfolio with visit tracking
- 🏠 **Property Management**: Full CRUD operations with visit scheduling
- 📅 **Visit Tracking**: Automated scheduling based on frequency settings
- 🏢 **Asset Platform Tracking**: Smart autocomplete for asset management platforms
- 🎨 **Dark Theme**: Professional Spyglass Mission Control design
- 📱 **Responsive**: Works on desktop and mobile devices
- ⚡ **Real-time**: Live updates and status calculations

## Visit Tracking Workflow
1. Set visit schedule (weekly/bi-weekly) for each property
2. Record last visit date when property is inspected
3. System automatically calculates next visit due date
4. Dashboard shows properties due this week
5. Color-coded status indicators help prioritize visits
6. Visit history maintains detailed logs of all inspections

## Asset Management Platform Workflow
1. When creating/editing a property, start typing in the "Asset Management Platform" field
2. System shows autocomplete suggestions based on previously entered platforms
3. Select from suggestions or type a new platform name
4. System learns and remembers new platform names for future suggestions
5. Platform appears as a badge in property details for easy identification
6. Helps maintain consistency across similar properties

## Color Coding System
- 🟢 **Green**: On track, visit not due yet
- 🟡 **Yellow**: Due within 2 days
- 🔴 **Red**: Overdue for visit
- 🔵 **Blue**: Weekly schedule
- 🟣 **Purple**: Bi-weekly schedule