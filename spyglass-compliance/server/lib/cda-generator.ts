/**
 * Commission Disbursement Authorization (CDA) Generator
 * Handles calculation logic and PDF generation for CDAs
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export interface CDACalculation {
  grossCommission: number;
  referralFee: number;
  netCommission: number;
  transactionFee: number;
  spyglassAmount: number;
  agentAmount: number;
}

export interface CDAData {
  dealNumber: string;
  propertyAddress: string;
  agentName: string;
  closingDate: Date | null;
  salePrice: number;
  commissionPct: number;
  referralFeePct?: number;
  referralSource?: string;
  spyglasSplitPct: number;
  dealType: 'listing' | 'buyer_rep' | 'lease';
}

/**
 * Calculate CDA amounts based on deal data
 */
export function calculateCDA(data: CDAData): CDACalculation {
  // Calculate gross commission
  const grossCommission = data.salePrice * (data.commissionPct / 100);
  
  // Calculate referral fee (0 if no referral)
  const referralFee = data.referralFeePct 
    ? grossCommission * (data.referralFeePct / 100)
    : 0;
    
  // Calculate net commission after referral fee
  const netCommission = grossCommission - referralFee;
  
  // Transaction fee: $425 for most deals, $125 for lease deals
  const transactionFee = data.dealType === 'lease' ? 125 : 425;
  
  // Calculate Spyglass amount
  const spyglassAmount = (netCommission - transactionFee) * (data.spyglasSplitPct / 100);
  
  // Calculate agent amount (remaining after transaction fee and Spyglass split)
  const agentAmount = netCommission - transactionFee - spyglassAmount;
  
  return {
    grossCommission,
    referralFee,
    netCommission,
    transactionFee,
    spyglassAmount,
    agentAmount
  };
}

/**
 * Generate CDA PDF document
 */
export async function generateCDAPDF(
  data: CDAData,
  calculation: CDACalculation,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Header
      doc.fontSize(20)
         .text('Spyglass Realty', 50, 50, { align: 'center' })
         .fontSize(16)
         .text('Commission Disbursement Authorization', 50, 80, { align: 'center' })
         .moveDown(2);

      // Deal Information
      doc.fontSize(12);
      
      const leftCol = 50;
      const rightCol = 300;
      let yPos = 140;
      
      doc.text('Deal Information:', leftCol, yPos, { underline: true });
      yPos += 20;
      
      doc.text(`Deal Number: ${data.dealNumber}`, leftCol, yPos);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, rightCol, yPos);
      yPos += 15;
      
      doc.text(`Property: ${data.propertyAddress}`, leftCol, yPos);
      yPos += 15;
      
      doc.text(`Agent: ${data.agentName}`, leftCol, yPos);
      if (data.closingDate) {
        doc.text(`Closing Date: ${data.closingDate.toLocaleDateString()}`, rightCol, yPos);
      }
      yPos += 30;

      // Commission Breakdown Table
      doc.text('Commission Breakdown:', leftCol, yPos, { underline: true });
      yPos += 25;
      
      // Table headers
      doc.text('Description', leftCol, yPos);
      doc.text('Amount', rightCol, yPos);
      yPos += 15;
      
      // Draw line under headers
      doc.moveTo(leftCol, yPos)
         .lineTo(500, yPos)
         .stroke();
      yPos += 10;
      
      // Sale price
      doc.text(`Sale Price:`, leftCol, yPos);
      doc.text(`$${data.salePrice.toLocaleString()}`, rightCol, yPos);
      yPos += 15;
      
      // Commission percentage
      doc.text(`Commission (${data.commissionPct}%):`, leftCol, yPos);
      doc.text(`$${calculation.grossCommission.toLocaleString()}`, rightCol, yPos);
      yPos += 15;
      
      // Referral fee (if applicable)
      if (calculation.referralFee > 0) {
        doc.text(`Referral Fee (${data.referralFeePct}%):`, leftCol, yPos);
        doc.text(`-$${calculation.referralFee.toLocaleString()}`, rightCol, yPos);
        yPos += 15;
        
        if (data.referralSource) {
          doc.fontSize(10)
             .text(`  Source: ${data.referralSource}`, leftCol + 20, yPos)
             .fontSize(12);
          yPos += 15;
        }
      }
      
      // Net commission
      doc.text('Net Commission:', leftCol, yPos);
      doc.text(`$${calculation.netCommission.toLocaleString()}`, rightCol, yPos);
      yPos += 15;
      
      // Transaction fee
      doc.text('Transaction Fee:', leftCol, yPos);
      doc.text(`-$${calculation.transactionFee.toLocaleString()}`, rightCol, yPos);
      yPos += 15;
      
      // Spyglass split
      doc.text(`Spyglass Split (${data.spyglasSplitPct}%):`, leftCol, yPos);
      doc.text(`-$${calculation.spyglassAmount.toLocaleString()}`, rightCol, yPos);
      yPos += 20;
      
      // Draw line above agent net
      doc.moveTo(leftCol, yPos)
         .lineTo(500, yPos)
         .stroke();
      yPos += 10;
      
      // Agent Net (prominently displayed)
      doc.fontSize(14)
         .text('AGENT NET:', leftCol, yPos, { underline: true })
         .fontSize(16)
         .text(`$${calculation.agentAmount.toLocaleString()}`, rightCol, yPos, { 
           underline: true 
         });
      yPos += 40;
      
      // Signatures section
      doc.fontSize(12);
      yPos += 30;
      
      doc.text('Agent Signature:', leftCol, yPos);
      doc.text('Date:', rightCol, yPos);
      yPos += 30;
      
      doc.text('_'.repeat(40), leftCol, yPos);
      doc.text('_'.repeat(20), rightCol, yPos);
      yPos += 40;
      
      doc.text('Broker Signature:', leftCol, yPos);
      doc.text('Date:', rightCol, yPos);
      yPos += 30;
      
      doc.text('_'.repeat(40), leftCol, yPos);
      doc.text('_'.repeat(20), rightCol, yPos);
      
      // Footer
      doc.fontSize(10)
         .text('Spyglass Realty and Investments, LLC | Austin, TX', 50, 750, { 
           align: 'center' 
         });
      
      doc.end();
      
      stream.on('finish', () => resolve());
      stream.on('error', (error) => reject(error));
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Validate CDA data before calculation
 */
export function validateCDAData(data: CDAData): string[] {
  const errors: string[] = [];
  
  if (!data.dealNumber?.trim()) {
    errors.push('Deal number is required');
  }
  
  if (!data.propertyAddress?.trim()) {
    errors.push('Property address is required');
  }
  
  if (!data.agentName?.trim()) {
    errors.push('Agent name is required');
  }
  
  if (!data.salePrice || data.salePrice <= 0) {
    errors.push('Sale price must be greater than 0');
  }
  
  if (!data.commissionPct || data.commissionPct <= 0 || data.commissionPct > 100) {
    errors.push('Commission percentage must be between 0 and 100');
  }
  
  if (!data.spyglasSplitPct || data.spyglasSplitPct < 0 || data.spyglasSplitPct > 100) {
    errors.push('Spyglass split percentage must be between 0 and 100');
  }
  
  if (data.referralFeePct && (data.referralFeePct < 0 || data.referralFeePct > 100)) {
    errors.push('Referral fee percentage must be between 0 and 100');
  }
  
  return errors;
}

/**
 * Get CDA filename for a deal
 */
export function getCDAFilename(dealNumber: string): string {
  return `CDA_${dealNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}