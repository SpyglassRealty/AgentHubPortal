import { OpenAI } from 'openai';

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
  private openai: OpenAI;
  private baseURL: string;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
      dangerouslyAllowBrowser: true // For client-side usage
    });
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
   * Extract terms from document text using AI
   */
  private async extractTermsFromText(documentText: string, transactionType: string): Promise<ExtractedDocumentTerms> {
    const prompt = this.buildExtractionPrompt(transactionType);
    
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: prompt.systemPrompt
        },
        {
          role: "user", 
          content: `Extract terms from this real estate document:\n\n${documentText}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1, // Low temperature for consistent extraction
    });

    const extractedData = JSON.parse(completion.choices[0].message.content || '{}');
    
    // Add missing fields analysis
    const missingFields = this.analyzeMissingFields(extractedData, transactionType);
    
    return {
      ...extractedData,
      missingFields,
      confidence: this.calculateConfidenceScores(extractedData)
    };
  }

  /**
   * Build extraction prompt based on transaction type
   */
  private buildExtractionPrompt(transactionType: string) {
    const baseSystemPrompt = `You are an expert real estate transaction processor. Extract key terms from real estate documents with high accuracy. 

    CRITICAL INSTRUCTIONS:
    - Return ONLY valid JSON, no markdown or explanations
    - Use null for missing fields, don't guess
    - Extract exact values as they appear in document  
    - For dates, use ISO format (YYYY-MM-DD)
    - For currency, return numbers without $ symbols
    - Assign confidence scores 0-100 for each extracted field
    - Classify document type accurately`;

    const purchaseAgreementFields = `
    Extract these fields for Purchase Agreement:
    {
      "documentType": "purchase_agreement",
      "propertyAddress": "full address as written",
      "purchasePrice": numeric_value_only,
      "earnestMoney": numeric_value_only,
      "closingDate": "YYYY-MM-DD",
      "optionPeriodDays": number_of_days,
      "optionFee": numeric_value_only,
      "buyerName": ["array", "of", "buyer", "names"],
      "sellerName": ["array", "of", "seller", "names"],
      "listingAgent": "agent name and company",
      "sellingAgent": "agent name and company",
      "cashDown": numeric_value_only,
      "loanAmount": numeric_value_only,
      "lenderName": "lender name if specified",
      "titleCompany": "title company name",
      "inspectionPeriodDays": number_of_days,
      "appraisalContingency": boolean,
      "financingContingency": boolean,
      "sellerConcessions": numeric_value_only,
      "contractDate": "YYYY-MM-DD",
      "effectiveDate": "YYYY-MM-DD"
    }`;

    const listingAgreementFields = `
    Extract these fields for Listing Agreement:
    {
      "documentType": "listing_agreement",
      "propertyAddress": "full address as written",
      "listingPrice": numeric_value_only,
      "commissionRate": percentage_as_decimal,
      "listingPeriodStart": "YYYY-MM-DD",
      "listingPeriodEnd": "YYYY-MM-DD",
      "sellerName": ["array", "of", "seller", "names"],
      "listingAgent": "agent name and company",
      "brokerageName": "brokerage company name",
      "exclusions": ["items", "excluded", "from", "sale"],
      "inclusions": ["items", "included", "in", "sale"]
    }`;

    return {
      systemPrompt: baseSystemPrompt + (transactionType === 'Listing Agreement' ? listingAgreementFields : purchaseAgreementFields)
    };
  }

  /**
   * Analyze missing required fields based on compliance requirements
   */
  private analyzeMissingFields(extractedData: any, transactionType: string): string[] {
    const requiredFields = {
      'Purchase Agreement': [
        'propertyAddress', 'purchasePrice', 'closingDate', 
        'buyerName', 'sellerName', 'earnestMoney'
      ],
      'Listing Agreement': [
        'propertyAddress', 'listingPrice', 'listingPeriodStart',
        'listingPeriodEnd', 'sellerName', 'listingAgent', 'commissionRate'
      ]
    };

    const required = requiredFields[transactionType as keyof typeof requiredFields] || [];
    const missing: string[] = [];

    required.forEach(field => {
      if (!extractedData[field] || extractedData[field] === null || extractedData[field] === '') {
        missing.push(field);
      }
    });

    return missing;
  }

  /**
   * Calculate confidence scores for extracted data
   */
  private calculateConfidenceScores(extractedData: any): Record<string, number> {
    const confidence: Record<string, number> = {};
    
    Object.keys(extractedData).forEach(key => {
      const value = extractedData[key];
      
      if (value === null || value === undefined || value === '') {
        confidence[key] = 0;
      } else if (Array.isArray(value)) {
        confidence[key] = value.length > 0 ? 85 : 0;
      } else if (typeof value === 'number') {
        confidence[key] = value > 0 ? 95 : 50;
      } else if (typeof value === 'string') {
        // Higher confidence for longer, more specific strings
        if (value.length > 10) confidence[key] = 90;
        else if (value.length > 5) confidence[key] = 75;
        else confidence[key] = 60;
      } else if (typeof value === 'boolean') {
        confidence[key] = 80;
      } else {
        confidence[key] = 70;
      }
    });

    return confidence;
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