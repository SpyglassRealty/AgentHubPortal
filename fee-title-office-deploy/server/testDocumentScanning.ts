import type { Express } from "express";
import OpenAI from 'openai';

export function registerTestRoutes(app: Express) {
  
  // Test endpoint to verify document scanning is ready
  app.get('/api/test/document-scanning', async (req, res) => {
    try {
      const checks = {
        openai_configured: false,
        pdf_parse_available: false,
        tesseract_available: false,
        routes_registered: true
      };

      // Check OpenAI configuration
      const openaiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      checks.openai_configured = !!openaiKey;

      // Check pdf-parse
      try {
        const pdf = await import('pdf-parse');
        checks.pdf_parse_available = !!pdf.default;
      } catch (e) {
        checks.pdf_parse_available = false;
      }

      // Check tesseract
      try {
        const tesseract = await import('tesseract.js');
        checks.tesseract_available = !!tesseract.createWorker;
      } catch (e) {
        checks.tesseract_available = false;
      }

      const allReady = Object.values(checks).every(Boolean);

      res.json({
        ready: allReady,
        checks,
        message: allReady 
          ? "✅ Document scanning is ready for testing"
          : "❌ Some components need configuration"
      });

    } catch (error) {
      res.status(500).json({
        ready: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: "❌ Document scanning test failed"
      });
    }
  });

  // Simple AI test endpoint
  app.post('/api/test/ai-extraction', async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Text required for testing' });
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
            content: "Extract any addresses, prices, names, or dates from the following text. Return as JSON."
          },
          {
            role: "user",
            content: text.substring(0, 1000)
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 1000,
      });

      const extracted = JSON.parse(completion.choices[0].message.content || '{}');
      
      res.json({
        success: true,
        extracted,
        message: "✅ AI extraction test successful"
      });

    } catch (error) {
      console.error('AI extraction test error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: "❌ AI extraction test failed"
      });
    }
  });
}