export interface ExtractedDocumentTerms {
  // Core Transaction Details
  propertyAddress?: string;
  purchasePrice?: number;
  earnestMoney?: number;
  closingDate?: string;
  optionPeriodDays?: number;
  optionFee?: number;
  
  // Parties
  buyerName?: string[];
  sellerName?: string[];
  listingAgent?: string;
  sellingAgent?: string;
  
  // Financial Terms
  cashDown?: number;
  loanAmount?: number;
  lenderName?: string;
  interestRate?: number;
  
  // Title & Closing
  titleCompany?: string;
  closingAgent?: string;
  escrowAgent?: string;
  
  // Property Details
  lotSize?: string;
  squareFootage?: number;
  yearBuilt?: number;
  propertyType?: string;
  
  // Contingencies
  inspectionPeriodDays?: number;
  appraisalContingency?: boolean;
  financingContingency?: boolean;
  
  // Additional Terms
  sellerConcessions?: number;
  repairs?: string[];
  inclusions?: string[];
  exclusions?: string[];
  
  // Dates
  contractDate?: string;
  effectiveDate?: string;
  inspectionDeadline?: string;
  appraisalDeadline?: string;
  loanApprovalDeadline?: string;
  
  // Confidence scores for each extracted field
  confidence: Record<string, number>;
  
  // Missing required fields based on compliance
  missingFields: string[];
  
  // Document type classification
  documentType: 'purchase_agreement' | 'listing_agreement' | 'addendum' | 'disclosure' | 'unknown';
}

export interface DocumentScanResult {
  success: boolean;
  extractedTerms?: ExtractedDocumentTerms;
  error?: string;
  processingTime: number;
  documentId: string;
  fileName: string;
}

/**
 * AI-powered document scanner for real estate contracts
 * Uses OpenAI Vision API to extract terms from uploaded PDFs and images
 */
export class DocumentAIScanner {
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || '';
  }

  /**
   * Scan document and extract real estate terms
   */
  async scanDocument(file: File, transactionType?: string): Promise<DocumentScanResult> {
    const startTime = Date.now();
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Convert file to base64 for API processing
      const base64Data = await this.fileToBase64(file);
      
      // Call our backend API endpoint for document processing
      const response = await fetch('/api/documents/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          fileName: file.name,
          fileData: base64Data,
          transactionType: transactionType || 'Purchase Agreement'
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        extractedTerms: result.extractedTerms,
        processingTime: Date.now() - startTime,
        documentId,
        fileName: file.name
      };

    } catch (error) {
      console.error('Document scanning failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown scanning error',
        processingTime: Date.now() - startTime,
        documentId,
        fileName: file.name
      };
    }
  }

  /**
   * Convert file to base64 for processing
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove data URL prefix
        resolve(base64.split(',')[1]);
      };
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Auto-populate Fee Title Office form with extracted terms
   */
  populateFormFields(extractedTerms: ExtractedDocumentTerms): Record<string, any> {
    return {
      // Map extracted terms to form field names
      property_address: extractedTerms.propertyAddress,
      client_name: extractedTerms.buyerName?.join(' & ') || extractedTerms.sellerName?.join(' & '),
      estimated_value: `$${extractedTerms.purchasePrice?.toLocaleString() || ''}`,
      closing_date: extractedTerms.closingDate,
      
      // Additional populated fields
      transaction_details: {
        earnest_money: extractedTerms.earnestMoney,
        option_period: extractedTerms.optionPeriodDays,
        option_fee: extractedTerms.optionFee,
        loan_amount: extractedTerms.loanAmount,
        cash_down: extractedTerms.cashDown,
        seller_concessions: extractedTerms.sellerConcessions,
        title_company: extractedTerms.titleCompany,
        lender_name: extractedTerms.lenderName
      },
      
      // Parties information
      parties: {
        buyer: extractedTerms.buyerName,
        seller: extractedTerms.sellerName,
        listing_agent: extractedTerms.listingAgent,
        selling_agent: extractedTerms.sellingAgent
      },
      
      // Important dates
      key_dates: {
        contract_date: extractedTerms.contractDate,
        effective_date: extractedTerms.effectiveDate,
        closing_date: extractedTerms.closingDate,
        inspection_deadline: extractedTerms.inspectionDeadline,
        appraisal_deadline: extractedTerms.appraisalDeadline,
        loan_approval_deadline: extractedTerms.loanApprovalDeadline
      },
      
      // Flags for missing information
      missing_information: extractedTerms.missingFields,
      extraction_confidence: extractedTerms.confidence,
      
      // Auto-generated priority based on missing fields
      priority: extractedTerms.missingFields.length > 3 ? 'high' : 
                extractedTerms.missingFields.length > 1 ? 'medium' : 'low'
    };
  }
}

export const documentScanner = new DocumentAIScanner();