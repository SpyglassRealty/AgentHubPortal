import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { documentScanner, type DocumentScanResult } from "@/lib/document-ai-scanner";
import { 
  Upload, 
  FileText, 
  Image, 
  File,
  Download, 
  Share,
  Trash2,
  Eye,
  CheckCircle,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  FolderOpen,
  Brain,
  Shield,
  Archive,
  Scan,
  Zap,
  AlertCircle
} from "lucide-react";

interface DocumentFile {
  id: string;
  name: string;
  type: string;
  size: number;
  category: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  uploadedAt: string;
  uploadedBy: string;
  aiProcessed: boolean;
  aiExtractedData?: any;
  version: number;
  tags: string[];
  description?: string;
  url?: string;
  thumbnailUrl?: string;
  isRequired: boolean;
  complianceChecked: boolean;
}

interface DocumentCategory {
  id: string;
  name: string;
  description: string;
  required: boolean;
  templates?: string[];
  color: string;
}

const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  {
    id: 'contracts',
    name: 'Contracts & Agreements',
    description: 'Purchase agreements, listing contracts, and amendments',
    required: true,
    templates: ['Purchase Agreement Template', 'Listing Agreement Template'],
    color: 'bg-red-100 text-red-800'
  },
  {
    id: 'disclosures',
    name: 'Disclosures',
    description: 'Property disclosures, lead paint, and other required disclosures',
    required: true,
    templates: ['Seller Disclosure Template', 'Lead Paint Disclosure'],
    color: 'bg-orange-100 text-orange-800'
  },
  {
    id: 'financing',
    name: 'Financing Documents',
    description: 'Loan applications, pre-approval letters, and lender documents',
    required: false,
    templates: ['Loan Application', 'Pre-approval Letter'],
    color: 'bg-blue-100 text-blue-800'
  },
  {
    id: 'inspections',
    name: 'Inspections & Appraisals',
    description: 'Home inspection reports, appraisals, and surveys',
    required: false,
    templates: ['Inspection Report Template'],
    color: 'bg-green-100 text-green-800'
  },
  {
    id: 'title',
    name: 'Title Documents',
    description: 'Title commitments, deeds, and title insurance documents',
    required: true,
    templates: ['Title Commitment', 'Deed Template'],
    color: 'bg-purple-100 text-purple-800'
  },
  {
    id: 'closing',
    name: 'Closing Documents',
    description: 'Closing disclosures, settlement statements, and final documents',
    required: true,
    templates: ['Closing Disclosure', 'Settlement Statement'],
    color: 'bg-yellow-100 text-yellow-800'
  },
  {
    id: 'photos',
    name: 'Photos & Media',
    description: 'Property photos, videos, and virtual tour media',
    required: false,
    color: 'bg-pink-100 text-pink-800'
  },
  {
    id: 'other',
    name: 'Other Documents',
    description: 'Miscellaneous documents and correspondence',
    required: false,
    color: 'bg-gray-100 text-gray-800'
  }
];

const MOCK_DOCUMENTS: DocumentFile[] = [
  {
    id: 'doc-1',
    name: 'Purchase_Agreement_123_Main_St.pdf',
    type: 'application/pdf',
    size: 2456789,
    category: 'contracts',
    status: 'completed',
    uploadedAt: '2026-03-07T10:00:00Z',
    uploadedBy: 'Ryan Rodenbeck',
    aiProcessed: true,
    aiExtractedData: {
      purchasePrice: '$750,000',
      closingDate: '2026-03-25',
      buyers: ['John Smith', 'Jane Smith'],
      property: '123 Main St, Austin, TX 78704'
    },
    version: 1,
    tags: ['TREC 20-16', 'Executed'],
    description: 'Fully executed purchase agreement',
    isRequired: true,
    complianceChecked: true
  },
  {
    id: 'doc-2',
    name: 'Sellers_Disclosure_Notice.pdf',
    type: 'application/pdf',
    size: 1234567,
    category: 'disclosures',
    status: 'processing',
    uploadedAt: '2026-03-07T11:30:00Z',
    uploadedBy: 'Sunny Martinez',
    aiProcessed: false,
    version: 1,
    tags: ['TREC OP-H', 'Required'],
    isRequired: true,
    complianceChecked: false
  },
  {
    id: 'doc-3',
    name: 'Property_Photos.zip',
    type: 'application/zip',
    size: 15678900,
    category: 'photos',
    status: 'completed',
    uploadedAt: '2026-03-06T14:20:00Z',
    uploadedBy: 'Trish Martinez',
    aiProcessed: true,
    aiExtractedData: {
      imageCount: 25,
      roomTypes: ['Kitchen', 'Living Room', 'Bedroom', 'Bathroom'],
      qualityScore: 'High'
    },
    version: 1,
    tags: ['Professional', 'MLS Ready'],
    thumbnailUrl: '/placeholder-property.jpg',
    isRequired: false,
    complianceChecked: true
  }
];

interface DocumentManagerProps {
  transactionId: string;
  transactionType: string;
  onTermsExtracted?: (terms: any) => void; // Callback to populate Fee Title Office form
}

export function DocumentManager({ transactionId, transactionType, onTermsExtracted }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<DocumentFile[]>(MOCK_DOCUMENTS);
  const [activeTab, setActiveTab] = useState("all");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [dragOver, setDragOver] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<DocumentScanResult | null>(null);
  const [showScanResults, setShowScanResults] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (files: FileList | File[]) => {
    for (const [index, file] of Array.from(files).entries()) {
      const newDoc: DocumentFile = {
        id: `doc-${Date.now()}-${index}`,
        name: file.name,
        type: file.type,
        size: file.size,
        category: getFileCategory(file.name, file.type),
        status: 'uploading',
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'Current User',
        aiProcessed: false,
        version: 1,
        tags: [],
        isRequired: false,
        complianceChecked: false
      };

      setDocuments(prev => [...prev, newDoc]);

      // Check if this is a contract document that should be scanned
      const shouldScan = file.name.toLowerCase().includes('contract') || 
                        file.name.toLowerCase().includes('agreement') ||
                        file.name.toLowerCase().includes('purchase') ||
                        file.name.toLowerCase().includes('listing');

      if (shouldScan && (file.type.includes('pdf') || file.type.includes('image'))) {
        await handleDocumentScan(file, newDoc.id);
      } else {
        // Standard upload process for non-contract documents
        setTimeout(() => {
          setDocuments(prev => prev.map(doc => 
            doc.id === newDoc.id ? { ...doc, status: 'processing' } : doc
          ));
        }, 1000);

        setTimeout(() => {
          setDocuments(prev => prev.map(doc => 
            doc.id === newDoc.id ? { 
              ...doc, 
              status: 'completed',
              aiProcessed: false,
              complianceChecked: true
            } : doc
          ));
        }, 3000);
      }
    }
  };

  const handleDocumentScan = async (file: File, docId: string) => {
    setIsScanning(true);
    
    try {
      // Update document status to processing
      setDocuments(prev => prev.map(doc => 
        doc.id === docId ? { ...doc, status: 'processing' } : doc
      ));

      toast({
        title: "🔍 Scanning Document",
        description: `AI is extracting terms from ${file.name}...`
      });

      // Perform AI document scanning
      const scanResult = await documentScanner.scanDocument(file, transactionType);
      setScanResults(scanResult);

      if (scanResult.success && scanResult.extractedTerms) {
        const extractedData = scanResult.extractedTerms;
        
        // Update document with extracted data
        setDocuments(prev => prev.map(doc => 
          doc.id === docId ? { 
            ...doc, 
            status: 'completed',
            aiProcessed: true,
            aiExtractedData: {
              documentType: extractedData.documentType,
              propertyAddress: extractedData.propertyAddress,
              purchasePrice: extractedData.purchasePrice,
              closingDate: extractedData.closingDate,
              parties: {
                buyer: extractedData.buyerName,
                seller: extractedData.sellerName
              },
              missingFields: extractedData.missingFields?.length || 0,
              confidence: Math.round(Object.values(extractedData.confidence).reduce((a, b) => a + b, 0) / Object.keys(extractedData.confidence).length)
            },
            complianceChecked: true,
            tags: extractedData.missingFields.length > 0 ? ['Incomplete', 'Needs Review'] : ['Complete', 'AI Processed']
          } : doc
        ));

        // Show scan results and offer to populate form
        setShowScanResults(true);

        toast({
          title: "✅ Document Scanned Successfully",
          description: `Extracted ${Object.keys(extractedData.confidence).length} fields. ${extractedData.missingFields.length} fields need attention.`
        });

        // Auto-populate form if callback provided
        if (onTermsExtracted) {
          const formData = documentScanner.populateFormFields(extractedData);
          onTermsExtracted(formData);
        }

      } else {
        // Scan failed
        setDocuments(prev => prev.map(doc => 
          doc.id === docId ? { 
            ...doc, 
            status: 'error',
            aiProcessed: false,
            complianceChecked: false,
            tags: ['Scan Failed']
          } : doc
        ));

        toast({
          title: "❌ Scanning Failed",
          description: scanResult.error || "Unable to extract terms from document",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Document scanning error:', error);
      
      setDocuments(prev => prev.map(doc => 
        doc.id === docId ? { 
          ...doc, 
          status: 'error',
          tags: ['Scan Error']
        } : doc
      ));

      toast({
        title: "❌ Scanning Error",
        description: "Failed to process document. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsScanning(false);
    }
  };

  const getFileCategory = (fileName: string, fileType: string): string => {
    const name = fileName.toLowerCase();
    
    if (name.includes('purchase') || name.includes('contract') || name.includes('agreement')) {
      return 'contracts';
    } else if (name.includes('disclosure') || name.includes('notice')) {
      return 'disclosures';
    } else if (name.includes('loan') || name.includes('financing') || name.includes('preapproval')) {
      return 'financing';
    } else if (name.includes('inspection') || name.includes('appraisal') || name.includes('survey')) {
      return 'inspections';
    } else if (name.includes('title') || name.includes('deed') || name.includes('commitment')) {
      return 'title';
    } else if (name.includes('closing') || name.includes('settlement') || name.includes('hud')) {
      return 'closing';
    } else if (fileType.startsWith('image/') || fileType.startsWith('video/') || name.includes('photo')) {
      return 'photos';
    } else {
      return 'other';
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (type === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'uploading':
        return <Upload className="h-4 w-4 text-gray-600" />;
      default:
        return <File className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    const matchesTab = activeTab === 'all' || 
                      (activeTab === 'required' && doc.isRequired) ||
                      (activeTab === 'ai-processed' && doc.aiProcessed);
    
    return matchesSearch && matchesCategory && matchesTab;
  });

  const documentsByCategory = DOCUMENT_CATEGORIES.map(category => ({
    ...category,
    count: documents.filter(doc => doc.category === category.id).length,
    required: documents.filter(doc => doc.category === category.id && doc.isRequired).length
  }));

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-[#EF4923]" />
            Document Manager
          </h2>
          <p className="text-gray-600 mt-1">
            Upload, organize, and manage all transaction documents with AI processing
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Files
          </Button>
          <Button onClick={() => setUploadModalOpen(true)} className="bg-[#EF4923] hover:bg-[#D4401F]">
            <Upload className="h-4 w-4 mr-2" />
            Advanced Upload
          </Button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleFileUpload(e.target.files);
          }
        }}
      />

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver 
            ? 'border-[#EF4923] bg-[#FEF2F0]' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex items-center justify-center gap-4 mb-4">
          <Upload className="h-12 w-12 text-gray-400" />
          <div className="text-2xl text-gray-300">+</div>
          <Brain className="h-12 w-12 text-[#EF4923]" />
        </div>
        <h3 className="text-lg font-medium mb-2">AI-Powered Document Upload</h3>
        <p className="text-gray-600 mb-2">
          Upload contracts and agreements for automatic term extraction
        </p>
        <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Auto-extract terms</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="h-4 w-4 text-blue-500" />
            <span>Compliance check</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span>Populate forms</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search documents, tags, or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {DOCUMENT_CATEGORIES.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            More Filters
          </Button>
        </div>
      </div>

      {/* Document Categories Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {documentsByCategory.map((category) => (
          <Card key={category.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Badge className={category.color}>
                  {category.name}
                </Badge>
                {category.required > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {category.required} Required
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-2">{category.description}</p>
              <p className="text-lg font-semibold">{category.count} files</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Transaction Documents
          </CardTitle>
          <CardDescription>
            All documents for this transaction with AI processing and compliance checking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All ({documents.length})</TabsTrigger>
              <TabsTrigger value="required">Required ({documents.filter(d => d.isRequired).length})</TabsTrigger>
              <TabsTrigger value="ai-processed">AI Processed ({documents.filter(d => d.aiProcessed).length})</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4 mt-6">
              {filteredDocuments.map((document) => (
                <div key={document.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex-shrink-0 mt-1">
                        {getFileIcon(document.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{document.name}</h3>
                          {getStatusIcon(document.status)}
                          <Badge className={DOCUMENT_CATEGORIES.find(c => c.id === document.category)?.color || 'bg-gray-100 text-gray-800'}>
                            {DOCUMENT_CATEGORIES.find(c => c.id === document.category)?.name}
                          </Badge>
                          {document.isRequired && (
                            <Badge variant="destructive" className="text-xs">Required</Badge>
                          )}
                          {document.aiProcessed && (
                            <Badge variant="secondary" className="text-xs">
                              <Brain className="h-3 w-3 mr-1" />
                              AI Processed
                            </Badge>
                          )}
                          {document.complianceChecked && (
                            <Badge variant="secondary" className="text-xs">
                              <Shield className="h-3 w-3 mr-1" />
                              Compliance ✓
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <span>{formatFileSize(document.size)}</span>
                          <span>Uploaded {new Date(document.uploadedAt).toLocaleDateString()}</span>
                          <span>by {document.uploadedBy}</span>
                          {document.version > 1 && <span>v{document.version}</span>}
                        </div>

                        {document.description && (
                          <p className="text-sm text-gray-600 mb-2">{document.description}</p>
                        )}

                        {document.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {document.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {document.aiExtractedData && (
                          <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-2">
                            <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-1">
                              <Brain className="h-4 w-4" />
                              AI Extracted Information
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              {Object.entries(document.aiExtractedData).map(([key, value]) => (
                                <div key={key}>
                                  <span className="text-blue-700 font-medium">{key}:</span>
                                  <span className="text-blue-600 ml-1">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {document.status === 'uploading' && (
                          <Progress value={60} className="w-full mt-2" />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      <Button variant="outline" size="sm">
                        <Share className="h-4 w-4 mr-1" />
                        Share
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredDocuments.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No documents found</h3>
                  <p className="text-gray-600">
                    {searchQuery || selectedCategory !== 'all' 
                      ? 'Try adjusting your search or filter criteria' 
                      : 'Upload your first document to get started'
                    }
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Advanced Upload Modal */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Advanced Document Upload</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Category</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select document category" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Description</Label>
              <Input placeholder="Enter document description..." />
            </div>
            
            <div>
              <Label>Tags</Label>
              <Input placeholder="Enter tags separated by commas..." />
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setUploadModalOpen(false)}>
                Cancel
              </Button>
              <Button className="bg-[#EF4923] hover:bg-[#D4401F]">
                <Upload className="h-4 w-4 mr-2" />
                Upload Documents
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Scan Results Modal */}
      <Dialog open={showScanResults} onOpenChange={setShowScanResults}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5 text-[#EF4923]" />
              Document Scan Results
            </DialogTitle>
          </DialogHeader>
          
          {scanResults?.success && scanResults.extractedTerms && (
            <div className="space-y-6 py-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {Object.keys(scanResults.extractedTerms.confidence).length}
                    </div>
                    <div className="text-sm text-gray-600">Fields Extracted</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {scanResults.extractedTerms.missingFields.length}
                    </div>
                    <div className="text-sm text-gray-600">Missing Fields</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.round(Object.values(scanResults.extractedTerms.confidence).reduce((a, b) => a + b, 0) / Object.keys(scanResults.extractedTerms.confidence).length)}%
                    </div>
                    <div className="text-sm text-gray-600">Avg Confidence</div>
                  </CardContent>
                </Card>
              </div>

              {/* Missing Fields Alert */}
              {scanResults.extractedTerms.missingFields.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Missing Required Fields</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        The following required fields could not be extracted and need manual entry:
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {scanResults.extractedTerms.missingFields.map((field) => (
                          <Badge key={field} variant="secondary" className="bg-yellow-100 text-yellow-800">
                            {field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Extracted Terms */}
              <div>
                <h4 className="font-medium mb-3">Extracted Terms</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
                  {Object.entries(scanResults.extractedTerms.confidence).map(([key, confidence]) => {
                    const value = scanResults.extractedTerms?.[key as keyof typeof scanResults.extractedTerms];
                    if (!value || key === 'confidence' || key === 'missingFields') return null;
                    
                    return (
                      <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium text-sm">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </div>
                          <div className="text-sm text-gray-600">
                            {Array.isArray(value) ? value.join(', ') : String(value)}
                          </div>
                        </div>
                        <Badge 
                          variant={confidence > 80 ? 'default' : confidence > 60 ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {confidence}%
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  onClick={() => {
                    if (onTermsExtracted && scanResults.extractedTerms) {
                      const formData = documentScanner.populateFormFields(scanResults.extractedTerms);
                      onTermsExtracted(formData);
                      toast({
                        title: "✅ Terms Applied",
                        description: "Fee Title Office form has been populated with extracted terms."
                      });
                    }
                    setShowScanResults(false);
                  }}
                  className="bg-[#EF4923] hover:bg-[#D4401F]"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Apply to Fee Title Office
                </Button>
                <Button variant="outline" onClick={() => setShowScanResults(false)}>
                  Review Later
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Scanning Progress Indicator */}
      {isScanning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-4">
                <Scan className="h-8 w-8 text-[#EF4923] animate-spin" />
              </div>
              <h3 className="text-lg font-medium mb-2">AI Document Scanning</h3>
              <p className="text-gray-600 mb-4">
                Extracting terms and analyzing contract details...
              </p>
              <Progress value={undefined} className="w-full" />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}