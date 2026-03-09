import type { Express } from "express";
import multer from 'multer';
import OpenAI from 'openai';
const pdf = require('pdf-parse');
import { createWorker } from 'tesseract.js';

interface DocumentScanRequest {
  documentId: string;
  fileName: string;
  fileData: string; // base64
  transactionType: string;
}

interface ExtractedTerms {
  documentType: string;
  propertyAddress?: string;
  purchasePrice?: number;
  earnestMoney?: number;
  closingDate?: string;
  optionPeriodDays?: number;
  optionFee?: number;
  buyerName?: string[];
  sellerName?: string[];
  listingAgent?: string;
  sellingAgent?: string;
  cashDown?: number;
  loanAmount?: number;
  lenderName?: string;
  interestRate?: number;
  titleCompany?: string;
  closingAgent?: string;
  escrowAgent?: string;
  lotSize?: string;
  squareFootage?: number;
  yearBuilt?: number;
  propertyType?: string;
  inspectionPeriodDays?: number;
  appraisalContingency?: boolean;
  financingContingency?: boolean;
  sellerConcessions?: number;
  repairs?: string[];
  inclusions?: string[];
  exclusions?: string[];
  contractDate?: string;
  effectiveDate?: string;
  inspectionDeadline?: string;
  appraisalDeadline?: string;
  loanApprovalDeadline?: string;
  confidence: Record<string, number>;
  missingFields: string[];
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept PDFs and images
    if (file.mimetype.includes('pdf') || file.mimetype.includes('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'));
    }
  },
});

export function registerDocumentScanRoutes(app: Express) {
  
  /**
   * Extract text from PDF buffer
   */
  async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
      const data = await pdf(buffer);
      return data.text;
    } catch (error) {
      console.error('PDF text extraction failed:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Extract text from image using Tesseract OCR
   */
  async function extractTextFromImage(buffer: Buffer): Promise<string> {
    const worker = await createWorker('eng');
    
    try {
      const { data: { text } } = await worker.recognize(buffer);
      await worker.terminate();
      return text;
    } catch (error) {
      await worker.terminate();
      console.error('OCR text extraction failed:', error);
      throw new Error('Failed to extract text from image');
    }
  }

  /**
   * Extract terms using OpenAI
   */
  async function extractTermsWithAI(documentText: string, transactionType: string): Promise<ExtractedTerms> {
    const openaiConfig: { apiKey: string | undefined; baseURL?: string } = {
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
    };
    
    if (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
      openaiConfig.baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
    }
    
    const openai = new OpenAI(openaiConfig);

    const systemPrompt = buildExtractionPrompt(transactionType);
    
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `Extract real estate terms from this document:\n\n${documentText.substring(0, 15000)}` // Limit text length
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 4000,
      });

      const extractedData = JSON.parse(completion.choices[0].message.content || '{}');
      
      // Add missing fields analysis and confidence scores
      const missingFields = analyzeMissingFields(extractedData, transactionType);
      const confidence = calculateConfidenceScores(extractedData);
      
      return {
        ...extractedData,
        missingFields,
        confidence
      };

    } catch (error) {
      console.error('AI extraction failed:', error);
      throw new Error('Failed to extract terms with AI');
    }
  }

  /**
   * Build extraction prompt based on transaction type
   */
  function buildExtractionPrompt(transactionType: string): string {
    const basePrompt = `You are an expert real estate document processor. Extract key terms from real estate documents with high accuracy.

CRITICAL INSTRUCTIONS:
- Return ONLY valid JSON, no markdown or explanations
- Use null for missing fields, don't guess values
- Extract exact values as they appear in document
- For dates, convert to ISO format (YYYY-MM-DD) 
- For currency, return numbers only (no $ symbols)
- For names, return as arrays even if single name
- Be precise with property addresses
- Identify document type accurately

REQUIRED JSON STRUCTURE:`;

    if (transactionType === 'Purchase Agreement') {
      return basePrompt + `
{
  "documentType": "purchase_agreement",
  "propertyAddress": "exact address as written",
  "purchasePrice": 750000,
  "earnestMoney": 5000,
  "closingDate": "2026-03-25",
  "optionPeriodDays": 10,
  "optionFee": 500,
  "buyerName": ["John Smith", "Jane Smith"],
  "sellerName": ["Mike Johnson"],
  "listingAgent": "Agent Name - Company",
  "sellingAgent": "Agent Name - Company", 
  "cashDown": 150000,
  "loanAmount": 600000,
  "lenderName": "First National Bank",
  "titleCompany": "Austin Title Company",
  "inspectionPeriodDays": 10,
  "appraisalContingency": true,
  "financingContingency": true,
  "sellerConcessions": 7500,
  "contractDate": "2026-03-01",
  "effectiveDate": "2026-03-01",
  "inspectionDeadline": "2026-03-11",
  "appraisalDeadline": "2026-03-20",
  "loanApprovalDeadline": "2026-03-22"
}`;
    } else {
      return basePrompt + `
{
  "documentType": "listing_agreement",
  "propertyAddress": "exact address as written",
  "listingPrice": 750000,
  "commissionRate": 0.06,
  "listingPeriodStart": "2026-03-01",
  "listingPeriodEnd": "2026-09-01", 
  "sellerName": ["John Smith", "Jane Smith"],
  "listingAgent": "Agent Name - Company",
  "brokerageName": "Spyglass Realty",
  "inclusions": ["appliances", "fixtures"],
  "exclusions": ["personal property"]
}`;
    }
  }

  /**
   * Analyze missing required fields
   */
  function analyzeMissingFields(extractedData: any, transactionType: string): string[] {
    const requiredFields = {
      'Purchase Agreement': [
        'propertyAddress', 'purchasePrice', 'closingDate',
        'buyerName', 'sellerName', 'earnestMoney', 'contractDate'
      ],
      'Listing Agreement': [
        'propertyAddress', 'listingPrice', 'listingPeriodStart',
        'listingPeriodEnd', 'sellerName', 'listingAgent', 'commissionRate'
      ]
    };

    const required = requiredFields[transactionType as keyof typeof requiredFields] || [];
    const missing: string[] = [];

    required.forEach(field => {
      const value = extractedData[field];
      if (value === null || value === undefined || value === '' || 
          (Array.isArray(value) && value.length === 0)) {
        missing.push(field);
      }
    });

    return missing;
  }

  /**
   * Calculate confidence scores
   */
  function calculateConfidenceScores(extractedData: any): Record<string, number> {
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
   * Main document scanning endpoint
   */
  app.post('/api/documents/scan', async (req, res) => {
    try {
      const { documentId, fileName, fileData, transactionType } = req.body as DocumentScanRequest;
      
      if (!fileData || !fileName) {
        return res.status(400).json({ error: 'Missing file data or filename' });
      }

      console.log(`[Document Scan] Processing ${fileName} (${transactionType})`);
      
      // Convert base64 to buffer
      const buffer = Buffer.from(fileData, 'base64');
      
      // Determine file type and extract text
      let extractedText = '';
      const mimeType = fileName.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image';
      
      if (mimeType === 'pdf') {
        extractedText = await extractTextFromPDF(buffer);
      } else {
        extractedText = await extractTextFromImage(buffer);
      }
      
      if (!extractedText || extractedText.trim().length < 50) {
        return res.status(400).json({ 
          error: 'Unable to extract sufficient text from document. Please ensure document is clear and readable.' 
        });
      }

      console.log(`[Document Scan] Extracted ${extractedText.length} characters of text`);
      
      // Extract terms using AI
      const extractedTerms = await extractTermsWithAI(extractedText, transactionType);
      
      console.log(`[Document Scan] Extracted ${Object.keys(extractedTerms).length} fields, ${extractedTerms.missingFields.length} missing`);
      
      // Return results
      res.json({
        success: true,
        documentId,
        fileName,
        extractedTerms,
        processingTime: Date.now(),
        documentText: extractedText.substring(0, 1000) + '...', // First 1000 chars for review
      });

    } catch (error) {
      console.error('[Document Scan] Error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Document scanning failed'
      });
    }
  });

  /**
   * Health check endpoint for document scanning service
   */
  app.get('/api/documents/scan/health', (req, res) => {
    const hasOpenAI = !!(process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY);
    
    res.json({
      status: 'healthy',
      services: {
        openai: hasOpenAI,
        ocr: true, // Tesseract is always available
        pdf: true  // pdf-parse is always available
      },
      timestamp: new Date().toISOString()
    });
  });
}