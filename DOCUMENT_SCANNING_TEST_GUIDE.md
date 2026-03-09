# 🧪 Fee Title Office Document Scanning - Test Guide

## 🎯 **TEST URL** 
**Production:** https://fee-title-office-deploy-3v396ghjq-ryan-4655s-projects.vercel.app/fee-title-office

## ✅ **Pre-Test Verification**

Before testing contract upload, verify the system is ready:

### 1. Health Check
Visit: `https://fee-title-office-deploy-3v396ghjq-ryan-4655s-projects.vercel.app/api/test/document-scanning`

Should return:
```json
{
  "ready": true,
  "checks": {
    "openai_configured": true,
    "pdf_parse_available": true, 
    "tesseract_available": true,
    "routes_registered": true
  },
  "message": "✅ Document scanning is ready for testing"
}
```

### 2. AI Extraction Test
POST to: `https://fee-title-office-deploy-3v396ghjq-ryan-4655s-projects.vercel.app/api/test/ai-extraction`
```json
{
  "text": "Purchase Agreement - 123 Main St, Austin TX 78704 - Sale Price: $750,000 - Buyer: John Smith - Closing Date: March 25, 2026"
}
```

## 🔬 **Contract Upload Test Process**

### Step 1: Access Fee Title Office
1. Go to the test URL above
2. Click "New Transaction" button
3. Fill in basic transaction details:
   - **Property Address:** 123 Main St, Austin, TX 78704
   - **Transaction Type:** Purchase Agreement
   - **Client Name:** Test Client
   - **Expected Closing:** 2026-03-25

### Step 2: Upload Contract Document
1. Click on "Documents" tab
2. Drag and drop a contract file OR click "Upload Files"
3. **Supported formats:** PDF, PNG, JPG, GIF
4. **File should contain:** Real estate contract with terms like:
   - Property address
   - Purchase price
   - Buyer/seller names
   - Closing date
   - Earnest money
   - Option period

### Step 3: Watch AI Processing
1. System will detect it's a contract document
2. You'll see "🔍 AI Document Scanning" progress indicator
3. OCR extracts text from PDF/image
4. OpenAI GPT-4o analyzes and extracts terms
5. Results modal appears with extracted data

### Step 4: Review Extraction Results
The results modal will show:
- **📊 Summary stats:** Fields extracted, missing fields, confidence
- **⚠️ Missing fields alert:** Required fields that need attention
- **📋 Extracted terms:** All found data with confidence scores
- **✅ Apply button:** To populate Fee Title Office form

### Step 5: Auto-Populate Form
1. Click "Apply to Fee Title Office" button
2. Form fields auto-populate with extracted terms
3. Missing fields are highlighted for manual entry
4. Transaction priority set based on completeness

## 🎯 **What Should Happen**

### ✅ **Successful Test Results:**
- Document uploads without errors
- Text extraction completes (PDF parsing or OCR)
- AI returns structured JSON with contract terms
- Form fields auto-populate with extracted data
- Missing fields are identified and flagged
- Compliance checking highlights incomplete areas

### ❌ **Potential Issues to Watch:**
- Upload fails → Check file format/size
- OCR fails → Document may be too blurry/low quality
- AI extraction fails → OpenAI API key issue
- No terms extracted → Document doesn't contain recognizable contract text
- Form doesn't populate → JavaScript console errors

## 🛠 **Debugging Issues**

### If Upload Fails:
1. Check browser console for errors
2. Verify file is under 10MB
3. Try a different file format (PDF vs image)

### If AI Processing Fails:
1. Check `/api/test/document-scanning` endpoint
2. Verify OpenAI API key is configured in Vercel environment
3. Check server logs for detailed error messages

### If Terms Don't Extract:
1. Make sure document contains actual contract text
2. Try a clearer/higher quality document
3. Check if document is in English
4. Verify it's a real estate contract format

## 📋 **Test Checklist**

- [ ] Health check API returns all green
- [ ] AI extraction test works
- [ ] Fee Title Office page loads
- [ ] New transaction form works
- [ ] Document upload area appears
- [ ] Contract file uploads successfully
- [ ] AI scanning progress shows
- [ ] Results modal displays extracted terms
- [ ] Form auto-populates when "Apply" clicked
- [ ] Missing fields are highlighted
- [ ] Transaction priority updates based on completeness

## 🚀 **Ready for Production**

Once all tests pass, this system can:
1. **Auto-extract** 27+ contract terms
2. **Populate** Fee Title Office forms instantly  
3. **Flag** missing required information
4. **Set** transaction priority based on completeness
5. **Integrate** with Jointly or other transaction platforms

## 📞 **Support**

If any issues occur during testing, the system provides detailed error messages and fallback options. All document processing is logged for debugging.