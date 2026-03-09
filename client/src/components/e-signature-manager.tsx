import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  Send, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Plus,
  Edit,
  Eye,
  Download,
  Upload,
  PenTool,
  Shield,
  Zap
} from "lucide-react";

interface SignatureRequest {
  id: string;
  documentName: string;
  status: 'draft' | 'sent' | 'in_progress' | 'completed' | 'declined' | 'expired';
  signers: Signer[];
  createdAt: string;
  completedAt?: string;
  expiresAt: string;
  templateUsed?: string;
}

interface Signer {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'pending' | 'signed' | 'declined' | 'viewed';
  signedAt?: string;
  order: number;
}

interface ESignatureTemplate {
  id: string;
  name: string;
  description: string;
  category: 'purchase' | 'listing' | 'disclosure' | 'addendum' | 'other';
  fields: SignatureField[];
  signers: string[];
}

interface SignatureField {
  id: string;
  type: 'signature' | 'initial' | 'date' | 'text' | 'checkbox';
  label: string;
  required: boolean;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  signerRole: string;
}

const MOCK_SIGNATURE_REQUESTS: SignatureRequest[] = [
  {
    id: 'sig-001',
    documentName: 'Purchase Agreement - 123 Main St',
    status: 'in_progress',
    signers: [
      {
        id: 'sig-1',
        name: 'John Smith',
        email: 'john@example.com',
        role: 'Buyer',
        status: 'signed',
        order: 1,
        signedAt: '2026-03-07T14:30:00Z'
      },
      {
        id: 'sig-2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'Co-Buyer',
        status: 'pending',
        order: 2
      },
      {
        id: 'sig-3',
        name: 'Ryan Rodenbeck',
        email: 'ryan@spyglassrealty.com',
        role: 'Buyer Agent',
        status: 'pending',
        order: 3
      }
    ],
    createdAt: '2026-03-07T10:00:00Z',
    expiresAt: '2026-03-14T10:00:00Z',
    templateUsed: 'Purchase Agreement Template'
  },
  {
    id: 'sig-002',
    documentName: 'Listing Agreement - 456 Oak Ave',
    status: 'completed',
    signers: [
      {
        id: 'sig-4',
        name: 'Sarah Johnson',
        email: 'sarah@example.com',
        role: 'Seller',
        status: 'signed',
        order: 1,
        signedAt: '2026-03-06T16:45:00Z'
      },
      {
        id: 'sig-5',
        name: 'Trish Martinez',
        email: 'trish@spyglassrealty.com',
        role: 'Listing Agent',
        status: 'signed',
        order: 2,
        signedAt: '2026-03-06T17:15:00Z'
      }
    ],
    createdAt: '2026-03-06T15:00:00Z',
    completedAt: '2026-03-06T17:15:00Z',
    expiresAt: '2026-03-13T15:00:00Z',
    templateUsed: 'Listing Agreement Template'
  }
];

const E_SIGNATURE_TEMPLATES: ESignatureTemplate[] = [
  {
    id: 'template-purchase',
    name: 'Purchase Agreement Template',
    description: 'TREC 20-16 One to Four Family Residential Contract',
    category: 'purchase',
    signers: ['Buyer', 'Co-Buyer', 'Seller', 'Co-Seller', 'Buyer Agent', 'Seller Agent'],
    fields: [
      { id: 'f1', type: 'signature', label: 'Buyer Signature', required: true, page: 8, x: 100, y: 400, width: 200, height: 50, signerRole: 'Buyer' },
      { id: 'f2', type: 'date', label: 'Date Signed', required: true, page: 8, x: 320, y: 420, width: 100, height: 30, signerRole: 'Buyer' },
      { id: 'f3', type: 'signature', label: 'Seller Signature', required: true, page: 8, x: 100, y: 500, width: 200, height: 50, signerRole: 'Seller' }
    ]
  },
  {
    id: 'template-listing',
    name: 'Listing Agreement Template',
    description: 'TREC 1-2 Listing Agreement',
    category: 'listing',
    signers: ['Seller', 'Co-Seller', 'Listing Agent'],
    fields: [
      { id: 'f4', type: 'signature', label: 'Seller Signature', required: true, page: 4, x: 100, y: 600, width: 200, height: 50, signerRole: 'Seller' },
      { id: 'f5', type: 'signature', label: 'Agent Signature', required: true, page: 4, x: 100, y: 700, width: 200, height: 50, signerRole: 'Listing Agent' }
    ]
  }
];

interface ESignatureManagerProps {
  transactionId: string;
  transactionType: string;
}

export function ESignatureManager({ transactionId, transactionType }: ESignatureManagerProps) {
  const [activeTab, setActiveTab] = useState("active");
  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [signers, setSigners] = useState<Signer[]>([]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'declined':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'expired':
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const addSigner = () => {
    const newSigner: Signer = {
      id: `signer-${Date.now()}`,
      name: '',
      email: '',
      role: 'Buyer',
      status: 'pending',
      order: signers.length + 1
    };
    setSigners([...signers, newSigner]);
  };

  const updateSigner = (id: string, field: keyof Signer, value: any) => {
    setSigners(signers.map(signer => 
      signer.id === id ? { ...signer, [field]: value } : signer
    ));
  };

  const removeSigner = (id: string) => {
    setSigners(signers.filter(signer => signer.id !== id));
  };

  const handleCreateRequest = () => {
    // Implementation would create signature request
    console.log('Creating signature request:', {
      template: selectedTemplate,
      signers: signers,
      transactionId
    });
    setNewRequestOpen(false);
  };

  const activeRequests = MOCK_SIGNATURE_REQUESTS.filter(req => 
    req.status === 'sent' || req.status === 'in_progress'
  );

  const completedRequests = MOCK_SIGNATURE_REQUESTS.filter(req => 
    req.status === 'completed'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <PenTool className="h-6 w-6 text-[#EF4923]" />
            E-Signature Manager
          </h2>
          <p className="text-gray-600 mt-1">
            Send, track, and manage electronic signatures for transaction documents
          </p>
        </div>
        <Button onClick={() => setNewRequestOpen(true)} className="bg-[#EF4923] hover:bg-[#D4401F]">
          <Plus className="h-4 w-4 mr-2" />
          New Signature Request
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Requests', value: '3', icon: Clock, color: 'text-blue-600' },
          { label: 'Completed Today', value: '7', icon: CheckCircle, color: 'text-green-600' },
          { label: 'Avg. Completion Time', value: '2.3 days', icon: Zap, color: 'text-[#EF4923]' },
          { label: 'Success Rate', value: '98%', icon: Shield, color: 'text-purple-600' },
        ].map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className="text-xl font-bold">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Signature Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Signature Requests
          </CardTitle>
          <CardDescription>
            Track document signing progress and manage e-signature workflows
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="active">Active ({activeRequests.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completedRequests.length})</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4 mt-6">
              {activeRequests.map((request) => (
                <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(request.status)}
                        <h3 className="font-medium">{request.documentName}</h3>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        Created {new Date(request.createdAt).toLocaleDateString()} • 
                        Expires {new Date(request.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        <Send className="h-4 w-4 mr-1" />
                        Remind
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Signers:</h4>
                    {request.signers.map((signer) => (
                      <div key={signer.id} className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-gray-300" />
                        <span className="flex-1">{signer.name} ({signer.role})</span>
                        <Badge variant="outline" className={`text-xs ${
                          signer.status === 'signed' ? 'bg-green-50 text-green-700' :
                          signer.status === 'viewed' ? 'bg-blue-50 text-blue-700' :
                          'bg-gray-50 text-gray-700'
                        }`}>
                          {signer.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4 mt-6">
              {completedRequests.map((request) => (
                <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(request.status)}
                        <h3 className="font-medium">{request.documentName}</h3>
                        <Badge className={getStatusColor(request.status)}>
                          Completed
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        Completed {request.completedAt ? new Date(request.completedAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="templates" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {E_SIGNATURE_TEMPLATES.map((template) => (
                  <Card key={template.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-medium">{template.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                          <Badge variant="outline" className="mt-2 text-xs">
                            {template.category}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        <p><strong>Signers:</strong> {template.signers.join(', ')}</p>
                        <p><strong>Fields:</strong> {template.fields.length} signature fields</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedTemplate(template.id);
                            setNewRequestOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Use Template
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* New Signature Request Dialog */}
      <Dialog open={newRequestOpen} onOpenChange={setNewRequestOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Signature Request</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Document Selection */}
            <div>
              <Label htmlFor="document">Document</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select document to send for signature" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="purchase-agreement">Purchase Agreement - 123 Main St</SelectItem>
                  <SelectItem value="disclosure">Seller's Disclosure - 123 Main St</SelectItem>
                  <SelectItem value="addendum">Financing Addendum - 123 Main St</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Template Selection */}
            <div>
              <Label htmlFor="template">Template (Optional)</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template for signature fields" />
                </SelectTrigger>
                <SelectContent>
                  {E_SIGNATURE_TEMPLATES.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Signers */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Signers</Label>
                <Button variant="outline" size="sm" onClick={addSigner}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Signer
                </Button>
              </div>
              
              <div className="space-y-3">
                {signers.map((signer, index) => (
                  <div key={signer.id} className="flex gap-3 p-3 border border-gray-200 rounded-lg">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                      <Input
                        placeholder="Full Name"
                        value={signer.name}
                        onChange={(e) => updateSigner(signer.id, 'name', e.target.value)}
                      />
                      <Input
                        placeholder="Email Address"
                        type="email"
                        value={signer.email}
                        onChange={(e) => updateSigner(signer.id, 'email', e.target.value)}
                      />
                      <Select 
                        value={signer.role} 
                        onValueChange={(value) => updateSigner(signer.id, 'role', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Buyer">Buyer</SelectItem>
                          <SelectItem value="Co-Buyer">Co-Buyer</SelectItem>
                          <SelectItem value="Seller">Seller</SelectItem>
                          <SelectItem value="Co-Seller">Co-Seller</SelectItem>
                          <SelectItem value="Buyer Agent">Buyer Agent</SelectItem>
                          <SelectItem value="Seller Agent">Seller Agent</SelectItem>
                          <SelectItem value="Title Company">Title Company</SelectItem>
                          <SelectItem value="Lender">Lender</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-600">Order: {signer.order}</span>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => removeSigner(signer.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <Label htmlFor="message">Message to Signers (Optional)</Label>
              <Textarea 
                placeholder="Add a personal message that will be included in the signature request email..."
                className="mt-1"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setNewRequestOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateRequest}
                className="bg-[#EF4923] hover:bg-[#D4401F]"
                disabled={signers.length === 0}
              >
                <Send className="h-4 w-4 mr-2" />
                Send for Signature
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}