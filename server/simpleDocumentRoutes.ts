import type { Express } from "express";
import OpenAI from 'openai';

export function registerSimpleDocumentRoutes(app: Express) {
  
  // Simple document scanning endpoint for testing
  app.post('/api/documents/scan', async (req, res) => {
    try {
      const { documentId, fileName, fileData, transactionType } = req.body;
      
      if (!fileData || !fileName) {
        return res.status(400).json({ error: 'Missing file data or filename' });
      }

      console.log(`[Document Scan] Processing ${fileName} (${transactionType})`);
      
      // For now, return mock extracted data to test the UI flow
      const mockExtractedTerms = {
        documentType: "purchase_agreement",
        propertyAddress: "123 Main St, Austin, TX 78704",
        purchasePrice: 750000,
        earnestMoney: 5000,
        closingDate: "2026-03-25",
        optionPeriodDays: 10,
        optionFee: 500,
        buyerName: ["John Smith", "Jane Smith"],
        sellerName: ["Mike Johnson"],
        listingAgent: "Test Agent - Spyglass Realty",
        cashDown: 150000,
        loanAmount: 600000,
        titleCompany: "Austin Title Company",
        inspectionPeriodDays: 10,
        appraisalContingency: true,
        financingContingency: true,
        sellerConcessions: 7500,
        contractDate: "2026-03-01",
        effectiveDate: "2026-03-01",
        confidence: {
          propertyAddress: 95,
          purchasePrice: 98,
          buyerName: 90,
          sellerName: 85,
          closingDate: 92,
          earnestMoney: 88
        },
        missingFields: ["lenderName", "titleCompany", "appraisalDeadline"]
      };
      
      console.log(`[Document Scan] Returning mock data for testing`);
      
      // Return results
      res.json({
        success: true,
        documentId,
        fileName,
        extractedTerms: mockExtractedTerms,
        processingTime: Date.now(),
        documentText: "Mock document text for testing purposes...",
        message: "🧪 Using mock data for testing - AI scanning ready!"
      });

    } catch (error) {
      console.error('[Document Scan] Error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Document scanning failed'
      });
    }
  });

  // Health check endpoint
  app.get('/api/documents/scan/health', (req, res) => {
    const hasOpenAI = !!(process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY);
    
    res.json({
      status: 'healthy',
      mode: 'mock_testing',
      services: {
        openai: hasOpenAI,
        mock_data: true
      },
      timestamp: new Date().toISOString(),
      message: "✅ Ready for document scanning tests with mock data"
    });
  });

  // Test the complete flow with real OpenAI if available
  app.post('/api/documents/scan-real', async (req, res) => {
    try {
      const { text, transactionType } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Text required for real AI testing' });
      }

      const openaiConfig: { apiKey: string | undefined; baseURL?: string } = {
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
      };
      
      if (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
        openaiConfig.baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
      }
      
      if (!openaiConfig.apiKey) {
        return res.status(503).json({ error: 'OpenAI API key not configured' });
      }

      const openai = new OpenAI(openaiConfig);

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Extract real estate contract terms from this document. Return JSON with fields: propertyAddress, purchasePrice, buyerName (array), sellerName (array), closingDate (YYYY-MM-DD), earnestMoney, optionPeriodDays, etc.`
          },
          {
            role: "user",
            content: text.substring(0, 5000)
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 2000,
      });

      const extracted = JSON.parse(completion.choices[0].message.content || '{}');
      
      res.json({
        success: true,
        extractedTerms: extracted,
        message: "✅ Real AI extraction successful"
      });

    } catch (error) {
      console.error('Real AI extraction error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Real AI extraction failed'
      });
    }
  });
}