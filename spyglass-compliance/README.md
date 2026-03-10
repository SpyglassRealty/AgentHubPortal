# Spyglass Compliance

Compliance and transaction management web app for Spyglass Realty.

## Overview

This app streamlines the compliance process for real estate transactions by:

- **Deal Management**: Track listings, buyer representations, and leases
- **Document Compliance**: Automated checklists based on transaction type  
- **PDF Contract Extraction**: Automatically extract terms from Texas residential contracts
- **CDA Generation**: Calculate and generate Commission Disbursement Authorizations
- **Slack Notifications**: Real-time updates on deal status and document uploads
- **Role-based Access**: Agents see their deals, admins see all deals

## Tech Stack

- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Frontend**: React + Vite + TypeScript
- **Styling**: Tailwind CSS
- **File Uploads**: Multer (local disk storage)
- **PDF Generation**: PDFKit
- **Authentication**: express-session + bcrypt
- **Notifications**: Slack webhooks

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- pdftotext (poppler-utils) for contract extraction

```bash
# macOS
brew install poppler

# Ubuntu/Debian  
apt-get install poppler-utils
```

### Installation

1. **Clone and setup**:
   ```bash
   cd spyglass-compliance
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your database URL and other settings
   ```

3. **Setup database**:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

4. **Start development**:
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:3000`

### Building for Production

```bash
npm run build
npm start
```

## Environment Variables

See `.env.example` for all required environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key  
- `SLACK_WEBHOOK_URL`: Slack notifications endpoint
- `UPLOAD_DIR`: File storage directory
- Other configuration options

## Deployment

### Render

This app is configured for deployment on Render:

1. **Connect repo** to Render
2. **Create PostgreSQL database** named `spyglass-compliance-db`
3. **Deploy web service** using `render.yaml`
4. **Set custom domain** to `compliance.spyglassrealty.com`

The `render.yaml` handles build commands and environment variables.

## Features

### Deal Types & Compliance

**Listing Deals** require: Listing Agreement, Seller Disclosure, Commission Agreement, MLS Input Form, Purchase Contract, Addenda, Option/EM Receipt, Title Order, Closing Disclosure, Final Walkthrough

**Buyer Rep Deals** require: Buyer Rep Agreement, Commission Agreement, Purchase Contract, Addenda, Financing Addendum, Option/EM Receipt, Title Order, Closing Disclosure, Final Walkthrough

**Lease Deals** require: Tenant Rep Agreement, Commission Agreement, Lease Agreement, ID Verification

### Deal Numbers

Auto-generated in format: `SPY-2026-XXXX` (sequential, year-based)

### CDA Calculations

```
grossCommission = salePrice × (commissionPct / 100)
referralFee = grossCommission × (referralFeePct / 100) // 0 if no referral
netCommission = grossCommission - referralFee
transactionFee = 425 // 125 for lease deals
spyglassAmount = (netCommission - transactionFee) × (spyglasSplitPct / 100)
agentAmount = netCommission - transactionFee - spyglassAmount
```

### Slack Notifications

Automatic notifications for:
- New deal submissions
- Document uploads
- All required docs uploaded  
- Changes requested
- Deal approvals
- CDA generation

## API Endpoints

- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Current user
- `POST /api/deals` - Create deal
- `GET /api/deals` - List deals (filtered by role)
- `POST /api/documents/upload` - Upload document
- `POST /api/documents/scan` - Extract contract terms
- `POST /api/cda/generate` - Generate CDA PDF
- And more...

## Development

### Project Structure

```
spyglass-compliance/
├── server/           # Backend API
│   ├── routes/       # API endpoints  
│   ├── lib/          # Business logic
│   └── prisma/       # Database schema
├── client/           # React frontend
│   ├── src/pages/    # Page components
│   ├── src/components/ # UI components
│   └── src/lib/      # Utilities
└── uploads/          # File storage
```

### Database Migrations

```bash
# Create migration
npm run db:migrate

# Reset database  
npx prisma migrate reset

# View database
npm run db:studio
```

## License

Private - Spyglass Realty and Investments, LLC