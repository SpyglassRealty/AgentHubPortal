-- CreateEnum
CREATE TYPE "Role" AS ENUM ('agent', 'admin', 'super_admin');

-- CreateEnum
CREATE TYPE "DealType" AS ENUM ('listing', 'buyer_rep', 'lease');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('draft', 'submitted', 'in_review', 'changes_requested', 'approved', 'closed', 'cancelled');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('soi', 'company_lead_no_ref', 'company_lead_with_ref', 'zillow_flex', 'other');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('pending', 'uploaded', 'approved', 'rejected', 'waived');

-- CreateEnum
CREATE TYPE "CDAStatus" AS ENUM ('draft', 'sent', 'acknowledged');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'agent',
    "phone" TEXT,
    "trecLicense" TEXT,
    "slackUserId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deals" (
    "id" TEXT NOT NULL,
    "dealNumber" TEXT NOT NULL,
    "dealType" "DealType" NOT NULL,
    "status" "DealStatus" NOT NULL DEFAULT 'submitted',
    "agentId" TEXT NOT NULL,
    "propertyAddress" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'TX',
    "zip" TEXT NOT NULL,
    "mlsNumber" TEXT,
    "listPrice" DECIMAL(65,30),
    "salePrice" DECIMAL(65,30),
    "leasePrice" DECIMAL(65,30),
    "commissionPct" DECIMAL(65,30),
    "commissionAmount" DECIMAL(65,30),
    "referralFeePct" DECIMAL(65,30),
    "referralSource" TEXT,
    "leadSource" "LeadSource",
    "closingDate" TIMESTAMP(3),
    "contractDate" TIMESTAMP(3),
    "optionExpiryDate" TIMESTAMP(3),
    "earnestMoney" DECIMAL(65,30),
    "optionFee" DECIMAL(65,30),
    "titleCompany" TEXT,
    "lenderName" TEXT,
    "buyerName" TEXT,
    "sellerName" TEXT,
    "tenantName" TEXT,
    "jointlyDealUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_items" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "status" "ComplianceStatus" NOT NULL DEFAULT 'pending',
    "rejectionReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "complianceItemId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cdas" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "generatedById" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grossCommission" DECIMAL(65,30) NOT NULL,
    "referralFee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "referralSource" TEXT,
    "transactionFee" DECIMAL(65,30) NOT NULL,
    "spyglasSplitPct" DECIMAL(65,30) NOT NULL,
    "spyglassAmount" DECIMAL(65,30) NOT NULL,
    "agentAmount" DECIMAL(65,30) NOT NULL,
    "pdfPath" TEXT,
    "notes" TEXT,
    "status" "CDAStatus" NOT NULL DEFAULT 'draft',

    CONSTRAINT "cdas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "dealId" TEXT,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "deals_dealNumber_key" ON "deals"("dealNumber");

-- CreateIndex
CREATE UNIQUE INDEX "cdas_dealId_key" ON "cdas"("dealId");

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_items" ADD CONSTRAINT "compliance_items_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_items" ADD CONSTRAINT "compliance_items_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_complianceItemId_fkey" FOREIGN KEY ("complianceItemId") REFERENCES "compliance_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cdas" ADD CONSTRAINT "cdas_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cdas" ADD CONSTRAINT "cdas_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
