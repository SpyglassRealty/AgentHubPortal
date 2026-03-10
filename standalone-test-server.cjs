const express = require('express');
const path = require('path');

const app = express();
const PORT = 3001;

// Simple CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'dist/public')));

// Mock document scanning endpoint
app.post('/api/documents/scan', async (req, res) => {
  try {
    const { documentId, fileName, fileData, transactionType } = req.body;
    
    console.log(`[Mock Scan] Processing ${fileName} (${transactionType || 'Unknown'})`);
    
    if (!fileName) {
      return res.status(400).json({ error: 'Missing filename' });
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Return realistic mock data based on transaction type
    const mockExtractedTerms = {
      documentType: transactionType === 'Listing Agreement' ? 'listing_agreement' : 'purchase_agreement',
      propertyAddress: "123 Main St, Austin, TX 78704",
      purchasePrice: 750000,
      earnestMoney: 5000,
      closingDate: "2026-03-25",
      optionPeriodDays: 10,
      optionFee: 500,
      buyerName: ["John Smith", "Jane Smith"],
      sellerName: ["Mike Johnson", "Sarah Johnson"],
      listingAgent: "Ryan Rodenbeck - Spyglass Realty",
      sellingAgent: "Test Agent - Austin Realty",
      cashDown: 150000,
      loanAmount: 600000,
      titleCompany: "Austin Title Company",
      inspectionPeriodDays: 10,
      appraisalContingency: true,
      financingContingency: true,
      sellerConcessions: 7500,
      contractDate: "2026-03-01",
      effectiveDate: "2026-03-01",
      inspectionDeadline: "2026-03-11",
      appraisalDeadline: "2026-03-20",
      confidence: {
        propertyAddress: 95,
        purchasePrice: 98,
        buyerName: 90,
        sellerName: 85,
        closingDate: 92,
        earnestMoney: 88,
        optionPeriodDays: 85,
        titleCompany: 80,
        listingAgent: 93,
        contractDate: 89
      },
      missingFields: ["lenderName", "loanApprovalDeadline", "escrowAgent"]
    };
    
    console.log(`[Mock Scan] Extracted ${Object.keys(mockExtractedTerms.confidence).length} fields, ${mockExtractedTerms.missingFields.length} missing`);
    
    res.json({
      success: true,
      documentId: documentId || `doc_${Date.now()}`,
      fileName,
      extractedTerms: mockExtractedTerms,
      processingTime: 2000,
      documentText: `Mock extraction from ${fileName}: PURCHASE AGREEMENT for property at 123 Main St, Austin, TX. Sale price $750,000. Buyers: John & Jane Smith. Closing date March 25, 2026...`,
      message: "🧪 Mock AI extraction complete - ready for form population!"
    });

  } catch (error) {
    console.error('[Mock Scan] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Document scanning failed'
    });
  }
});

// Health check
app.get('/api/documents/scan/health', (req, res) => {
  res.json({
    status: 'healthy',
    mode: 'mock_testing',
    services: {
      mock_scanning: true,
      form_population: true,
      compliance_checking: true
    },
    timestamp: new Date().toISOString(),
    message: "✅ Ready for document scanning tests with mock data"
  });
});

// Test endpoint
app.get('/api/test/document-scanning', (req, res) => {
  res.json({
    ready: true,
    checks: {
      mock_scanning: true,
      form_population: true,
      compliance_analysis: true,
      routes_registered: true
    },
    message: "✅ Document scanning ready for testing (mock mode)"
  });
});

// Root route
app.get('/', (req, res) => {
  res.redirect('/fee-title-office');
});

// Serve the test HTML file directly
app.get('/fee-title-office', (req, res) => {
  const htmlPath = path.join(__dirname, 'test-fee-title-office.html');
  console.log(`Serving Fee Title Office test page from ${htmlPath}`);
  res.sendFile(htmlPath);
});

// Serve SPA for all other routes
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'test-fee-title-office.html');
  console.log(`Serving test page for ${req.path} from ${indexPath}`);
  res.sendFile(indexPath);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Fee Title Office Test Server running!');
  console.log(`📋 Main URL: http://192.168.1.162:${PORT}/fee-title-office`);
  console.log(`🧪 Health Check: http://192.168.1.162:${PORT}/api/test/document-scanning`);
  console.log(`📄 Document Scan: http://192.168.1.162:${PORT}/api/documents/scan`);
  console.log('✅ Mock document scanning enabled - ready for contract testing!');
});