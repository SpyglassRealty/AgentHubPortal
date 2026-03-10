/**
 * Deal Number Generator
 * Auto-generates sequential deal numbers in format: SPY-2026-XXXX
 */

import { prisma } from '../index.js';

/**
 * Generate next sequential deal number for current year
 * Format: SPY-YYYY-XXXX (e.g., SPY-2026-0001)
 */
export async function generateDealNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `SPY-${currentYear}-`;
  
  try {
    // Find the highest deal number for current year
    const lastDeal = await prisma.deal.findFirst({
      where: {
        dealNumber: {
          startsWith: prefix
        }
      },
      orderBy: {
        dealNumber: 'desc'
      }
    });
    
    let nextSequence = 1;
    
    if (lastDeal) {
      // Extract sequence number from last deal (e.g., SPY-2026-0005 → 5)
      const lastSequence = lastDeal.dealNumber.split('-')[2];
      nextSequence = parseInt(lastSequence, 10) + 1;
    }
    
    // Format with leading zeros (4 digits)
    const sequenceString = nextSequence.toString().padStart(4, '0');
    
    return `${prefix}${sequenceString}`;
    
  } catch (error) {
    console.error('Error generating deal number:', error);
    throw new Error('Failed to generate deal number');
  }
}

/**
 * Validate deal number format
 */
export function isValidDealNumber(dealNumber: string): boolean {
  const pattern = /^SPY-\d{4}-\d{4}$/;
  return pattern.test(dealNumber);
}

/**
 * Get deal year from deal number
 */
export function getDealYear(dealNumber: string): number | null {
  const match = dealNumber.match(/^SPY-(\d{4})-\d{4}$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Get deal sequence from deal number
 */
export function getDealSequence(dealNumber: string): number | null {
  const match = dealNumber.match(/^SPY-\d{4}-(\d{4})$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Generate deal numbers for testing (batch creation)
 */
export async function generateMultipleDealNumbers(count: number): Promise<string[]> {
  const dealNumbers: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const dealNumber = await generateDealNumber();
    dealNumbers.push(dealNumber);
    
    // Create a placeholder deal to increment the sequence
    // This would be replaced by actual deal creation in real usage
    await prisma.deal.create({
      data: {
        dealNumber,
        dealType: 'listing',
        agentId: 'temp-id',
        propertyAddress: 'temp',
        city: 'temp',
        zip: 'temp'
      }
    }).then(deal => 
      // Immediately delete the placeholder
      prisma.deal.delete({ where: { id: deal.id } })
    ).catch(() => {
      // Ignore errors from this test sequence
    });
  }
  
  return dealNumbers;
}