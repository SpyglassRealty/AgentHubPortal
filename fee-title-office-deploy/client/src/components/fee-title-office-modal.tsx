import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { ESignatureManager } from "./e-signature-manager";
import { DocumentManager } from "./document-manager";
import { AgentManager } from "./agent-manager";
import { ComplianceChecklistComponent } from "./compliance-checklist";
import { 
  FileText, 
  Calendar, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Plus, 
  MessageSquare, 
  Upload,
  Brain,
  Zap,
  Target,
  Filter,
  Search,
  Bell,
  Settings,
  TrendingUp,
  FileSearch,
  DollarSign,
  Home,
  Scale,
  Shield,
  Workflow,
  PenTool
} from "lucide-react";

interface FeetitleOfficeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId?: string;
}

const TEAM_MEMBERS = [
  { id: "sunny", name: "Sunny", role: "Transaction Coordinator", avatar: "/avatars/sunny.jpg", initials: "SU" },
  { id: "trish", name: "Trish", role: "Marketing Manager", avatar: "/avatars/trish.jpg", initials: "TR" },
  { id: "daryl", name: "Daryl", role: "Tech Lead", avatar: "/avatars/daryl.jpg", initials: "DA" },
  { id: "caleb", name: "Caleb", role: "Operations", avatar: "/avatars/caleb.jpg", initials: "CA" },
  { id: "maggie", name: "Maggie", role: "QA Specialist", avatar: "/avatars/maggie.jpg", initials: "MA" },
];

const TRANSACTION_TYPES = [
  "Purchase Agreement",
  "Listing Agreement", 
  "Refinance",
  "Cash Sale",
  "New Construction",
  "Commercial Deal",
  "Investment Property",
  "Short Sale",
  "Foreclosure"
];

const WORKFLOW_TEMPLATES = {
  "Purchase Agreement": [
    { task: "Contract Review", ai: true, priority: "high", estimated_hours: 2 },
    { task: "Title Search", ai: true, priority: "high", estimated_hours: 4 },
    { task: "Loan Coordination", ai: false, priority: "medium", estimated_hours: 6 },
    { task: "Inspection Scheduling", ai: true, priority: "medium", estimated_hours: 1 },
    { task: "Appraisal Coordination", ai: false, priority: "medium", estimated_hours: 2 },
    { task: "Final Walkthrough", ai: false, priority: "low", estimated_hours: 1 },
    { task: "Closing Preparation", ai: true, priority: "high", estimated_hours: 3 },
  ],
  "Listing Agreement": [
    { task: "Property Analysis", ai: true, priority: "high", estimated_hours: 3 },
    { task: "Marketing Plan Creation", ai: true, priority: "high", estimated_hours: 4 },
    { task: "Photography Scheduling", ai: false, priority: "medium", estimated_hours: 1 },
    { task: "MLS Entry", ai: true, priority: "high", estimated_hours: 2 },
    { task: "Showing Coordination", ai: true, priority: "medium", estimated_hours: 8 },
    { task: "Offer Management", ai: false, priority: "high", estimated_hours: 6 },
  ],
};

export function FeeitleOfficeModal({ open, onOpenChange, transactionId }: FeeitleOfficeModalProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [newTransactionData, setNewTransactionData] = useState({
    property_address: "",
    transaction_type: "",
    client_name: "",
    closing_date: "",
    assigned_team: [] as string[],
    priority: "medium",
    estimated_value: "",
  });
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error'>('saved');

  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [customTasks, setCustomTasks] = useState<any[]>([]);
  useEffect(() => {
    const saveData = () => {
      setSaveStatus('saving');
      localStorage.setItem('transactionData', JSON.stringify(newTransactionData));
      // Simulate API call
      setTimeout(() => {
        setSaveStatus('saved');
        toast({ title: 'Autosaved!', description: 'Your progress has been saved.' });
      }, 1000);
    };

    const autosaveInterval = setInterval(() => {
      saveData();
    }, 30000);

    return () => clearInterval(autosaveInterval);
  }, [newTransactionData]);

  useEffect(() => {
    const storedData = localStorage.getItem('transactionData');
    if (storedData) {
      setNewTransactionData(JSON.parse(storedData));
      toast({ title: 'Data Restored!', description: 'Your previous progress has been restored.' });
    }
  }, []);

  // Mock data for existing transaction
  const mockTransactionData = {
    id: "TX-2026-001",
    property_address: "123 Main St, Austin, TX 78704",
    transaction_type: "Purchase Agreement",
    client_name: "John & Jane Smith",
    closing_date: "2026-03-25",
    assigned_team: ["sunny", "trish", "caleb"],
    priority: "high",
    estimated_value: "$750,000",
    progress: 68,
    status: "In Progress",
    ai_insights: [
      "Title search may reveal potential lien issues - recommend early review",
      "Appraisal scheduled for next week - property value trends looking positive",
      "Consider expediting loan processing due to tight closing timeline"
    ],
    smart_alerts: [
      { type: "deadline", message: "Inspection contingency expires in 3 days", severity: "warning" },
      { type: "task", message: "Loan documents ready for review", severity: "info" },
    ],
    workflow_status: [
      { stage: "Contract", completed: true, ai_processed: true },
      { stage: "Title Search", completed: true, ai_processed: true },
      { stage: "Loan Processing", completed: false, ai_processed: false, current: true },
      { stage: "Inspection", completed: false, ai_processed: false },
      { stage: "Appraisal", completed: false, ai_processed: false },
      { stage: "Closing", completed: false, ai_processed: false },
    ],
    recent_activity: [
      { user: "AI Assistant", action: "Generated closing checklist", time: "2 hours ago", ai: true },
      { user: "Sunny", action: "Updated inspection report", time: "4 hours ago", ai: false },
      { user: "AI Assistant", action: "Detected document discrepancy", time: "1 day ago", ai: true },
    ],
    documents: [
      { name: "Purchase Agreement.pdf", status: "processed", ai_extracted: true },
      { name: "Title Report.pdf", status: "processing", ai_extracted: false },
      { name: "Inspection Report.pdf", status: "uploaded", ai_extracted: false },
    ],
    collaboration: [
      { user: "Trish", message: "Marketing materials ready for review", time: "1 hour ago" },
      { user: "Caleb", message: "Systems integration complete", time: "3 hours ago" },
    ]
  };

  const createTransaction = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create transaction");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Transaction created successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      onOpenChange(false);
    },
  });

  const generateAITasks = () => {
    const template = WORKFLOW_TEMPLATES[selectedTemplate as keyof typeof WORKFLOW_TEMPLATES];
    if (template) {
      const aiEnhancedTasks = template.map((task, index) => ({
        ...task,
        id: `task-${index}`,
        assigned_to: "",
        due_date: "",
        ai_confidence: task.ai ? Math.floor(Math.random() * 20) + 80 : 0,
      }));
      setCustomTasks(aiEnhancedTasks);
      toast({ 
        title: "AI Workflow Generated!", 
        description: `Created ${template.length} optimized tasks for ${selectedTemplate}` 
      });
    }
  };

  const handleCreateTransaction = () => {
    const transactionData = {
      ...newTransactionData,
      ai_generated_tasks: customTasks,
      ai_enabled: true,
    };
    createTransaction.mutate(transactionData);
  };

  const isEditing = !!transactionId;
  const displayData = isEditing ? mockTransactionData : newTransactionData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-[#EF4923] to-[#D4401F] flex items-center justify-center">
                <Home className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold">
                  {isEditing ? "Fee Title Office - Transaction Management" : "Create New Transaction"}
                </DialogTitle>
                <p className="text-muted-foreground">
                  {isEditing 
                    ? `${displayData.property_address} • ${displayData.transaction_type}`
                    : "AI-powered real estate transaction management"
                  }
                </p>
              </div>
            </div>
            {saveStatus === 'saving' && <Badge variant="secondary">Saving...</Badge>}
            <div className="flex items-center gap-2">
              <Badge variant={isEditing ? "default" : "secondary"}>
                {isEditing ? displayData.status : "Draft"}
              </Badge>
              {isEditing && (
                <div className="flex items-center gap-2 text-sm">
                  <Brain className="h-4 w-4 text-[#EF4923]" />
                  <span className="font-medium">AI Enhanced</span>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
              <TabsTrigger value="overview">
                <Target className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="workflow">
                <Workflow className="h-4 w-4 mr-2" />
                Workflow
              </TabsTrigger>
              <TabsTrigger value="agents">
                <Users className="h-4 w-4 mr-2" />
                Agents
              </TabsTrigger>
              <TabsTrigger value="documents">
                <FileText className="h-4 w-4 mr-2" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="e-signature">
                <PenTool className="h-4 w-4 mr-2" />
                E-Signature
              </TabsTrigger>
              <TabsTrigger value="compliance">
                <Shield className="h-4 w-4 mr-2" />
                Compliance
              </TabsTrigger>
              <TabsTrigger value="ai-insights">
                <Brain className="h-4 w-4 mr-2" />
                AI Insights
              </TabsTrigger>
              <TabsTrigger value="communication">
                <MessageSquare className="h-4 w-4 mr-2" />
                Communication
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto pt-4">
              <TabsContent value="overview" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Transaction Details */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Transaction Details
                      </CardTitle>
                      <CardDescription>
                        {isEditing ? "Review and manage transaction information" : "Enter transaction information"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="property_address">Property Address</Label>
                          <Input 
                            id="property_address"
                            value={isEditing ? displayData.property_address : newTransactionData.property_address}
                            onChange={(e) => !isEditing && setNewTransactionData(prev => ({ ...prev, property_address: e.target.value }))}
                            placeholder="123 Main St, Austin, TX 78704"
                            disabled={isEditing}
                          />
                        </div>
                        <div>
                          <Label htmlFor="client_name">Client Name</Label>
                          <Input 
                            id="client_name"
                            value={isEditing ? displayData.client_name : newTransactionData.client_name}
                            onChange={(e) => !isEditing && setNewTransactionData(prev => ({ ...prev, client_name: e.target.value }))}
                            placeholder="John & Jane Smith"
                            disabled={isEditing}
                          />
                        </div>
                        <div>
                          <Label htmlFor="transaction_type">Transaction Type</Label>
                          <Select 
                            value={isEditing ? displayData.transaction_type : newTransactionData.transaction_type}
                            onValueChange={(value) => {
                              if (!isEditing) {
                                setNewTransactionData(prev => ({ ...prev, transaction_type: value }));
                                setSelectedTemplate(value);
                              }
                            }}
                            disabled={isEditing}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select transaction type" />
                            </SelectTrigger>
                            <SelectContent>
                              {TRANSACTION_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="closing_date">Expected Closing Date</Label>
                          <Input 
                            id="closing_date"
                            type="date"
                            value={isEditing ? displayData.closing_date : newTransactionData.closing_date}
                            onChange={(e) => !isEditing && setNewTransactionData(prev => ({ ...prev, closing_date: e.target.value }))}
                            disabled={isEditing}
                          />
                        </div>
                        <div>
                          <Label htmlFor="estimated_value">Estimated Value</Label>
                          <Input 
                            id="estimated_value"
                            value={isEditing ? displayData.estimated_value : newTransactionData.estimated_value}
                            onChange={(e) => !isEditing && setNewTransactionData(prev => ({ ...prev, estimated_value: e.target.value }))}
                            placeholder="$750,000"
                            disabled={isEditing}
                          />
                        </div>
                        <div>
                          <Label htmlFor="priority">Priority</Label>
                          <Select 
                            value={isEditing ? displayData.priority : newTransactionData.priority}
                            onValueChange={(value) => !isEditing && setNewTransactionData(prev => ({ ...prev, priority: value }))}
                            disabled={isEditing}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {!isEditing && selectedTemplate && (
                        <div className="pt-4 border-t">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium flex items-center gap-2">
                                <Zap className="h-4 w-4 text-yellow-500" />
                                AI Workflow Generation
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                Generate optimized tasks based on transaction type
                              </p>
                            </div>
                            <Button onClick={generateAITasks} variant="outline" size="sm">
                              <Brain className="h-4 w-4 mr-2" />
                              Generate AI Tasks
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Quick Stats & Progress */}
                  <div className="space-y-6">
                    {isEditing && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Progress Overview</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span>Overall Progress</span>
                              <span>{displayData.progress}%</span>
                            </div>
                            <Progress value={displayData.progress} className="h-2" />
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                              <div className="text-2xl font-bold text-green-600">4</div>
                              <div className="text-xs text-muted-foreground">Completed</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-blue-600">3</div>
                              <div className="text-xs text-muted-foreground">In Progress</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {isEditing && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Bell className="h-4 w-4" />
                            Smart Alerts
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {displayData.smart_alerts.map((alert, index) => (
                            <div key={index} className={`p-3 rounded-lg border ${
                              alert.severity === 'warning' 
                                ? 'border-yellow-200 bg-yellow-50' 
                                : 'border-blue-200 bg-blue-50'
                            }`}>
                              <div className="flex items-start gap-2">
                                {alert.severity === 'warning' ? (
                                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5" />
                                )}
                                <div className="text-sm">{alert.message}</div>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="workflow" className="mt-0">
                <div className="space-y-6">
                  {isEditing ? (
                    <>
                      {/* Workflow Progress */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Transaction Workflow
                          </CardTitle>
                          <CardDescription>
                            AI-optimized workflow with intelligent task sequencing
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {displayData.workflow_status.map((stage, index) => (
                              <div key={index} className="flex items-center gap-4">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                  stage.completed 
                                    ? 'bg-green-100 text-green-600' 
                                    : stage.current 
                                      ? 'bg-blue-100 text-blue-600 animate-pulse' 
                                      : 'bg-gray-100 text-gray-400'
                                }`}>
                                  {stage.completed ? (
                                    <CheckCircle2 className="h-5 w-5" />
                                  ) : stage.current ? (
                                    <Clock className="h-5 w-5" />
                                  ) : (
                                    <div className="h-3 w-3 rounded-full bg-current" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium">{stage.stage}</h4>
                                    {stage.ai_processed && (
                                      <Badge variant="secondary" className="text-xs">
                                        <Brain className="h-3 w-3 mr-1" />
                                        AI Enhanced
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {stage.completed ? 'Completed' : stage.current ? 'In Progress' : 'Pending'}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    <>
                      {/* Generated Tasks Preview */}
                      {customTasks.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Zap className="h-5 w-5 text-yellow-500" />
                              AI-Generated Workflow
                            </CardTitle>
                            <CardDescription>
                              Optimized task sequence for {selectedTemplate}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {customTasks.map((task, index) => (
                                <div key={task.id} className="flex items-center gap-3 p-3 border rounded-lg">
                                  <Checkbox />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{task.task}</span>
                                      {task.ai && (
                                        <Badge variant="secondary" className="text-xs">
                                          <Brain className="h-3 w-3 mr-1" />
                                          AI: {task.ai_confidence}%
                                        </Badge>
                                      )}
                                      <Badge variant={
                                        task.priority === 'high' ? 'destructive' : 
                                        task.priority === 'medium' ? 'default' : 'secondary'
                                      } className="text-xs">
                                        {task.priority}
                                      </Badge>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      Est. {task.estimated_hours}h
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="agents" className="mt-0">
                <AgentManager 
                  transactionId={transactionId || 'new'}
                  transactionType={isEditing ? displayData.transaction_type : newTransactionData.transaction_type}
                />
              </TabsContent>

              <TabsContent value="documents" className="mt-0">
                <DocumentManager 
                  transactionId={transactionId || 'new'}
                  transactionType={isEditing ? displayData.transaction_type : newTransactionData.transaction_type}
                  onTermsExtracted={(terms) => {
                    // Auto-populate form fields from extracted document terms
                    if (!isEditing) {
                      setNewTransactionData(prev => ({
                        ...prev,
                        property_address: terms.property_address || prev.property_address,
                        client_name: terms.client_name || prev.client_name,
                        estimated_value: terms.estimated_value || prev.estimated_value,
                        closing_date: terms.key_dates?.closing_date || prev.closing_date,
                        transaction_type: prev.transaction_type || 'Purchase Agreement'
                      }));
                    }
                  }}
                />
              </TabsContent>

              <TabsContent value="e-signature" className="mt-0">
                <ESignatureManager 
                  transactionId={transactionId || 'new'}
                  transactionType={isEditing ? displayData.transaction_type : newTransactionData.transaction_type}
                />
              </TabsContent>

              <TabsContent value="compliance" className="mt-0">
                <ComplianceChecklistComponent
                  transactionId={transactionId || 'new'}
                  transactionType={isEditing ? displayData.transaction_type : "Residential Closing"}
                  state="Texas"
                />
              </TabsContent>

              <TabsContent value="ai-insights" className="mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-[#EF4923]" />
                        AI Insights & Recommendations
                      </CardTitle>
                      <CardDescription>
                        Smart analysis and proactive suggestions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isEditing ? (
                        <div className="space-y-4">
                          {displayData.ai_insights.map((insight, index) => (
                            <div key={index} className="p-3 border-l-4 border-[#EF4923] bg-[#FEF2F0] rounded-r-lg">
                              <div className="flex items-start gap-2">
                                <Brain className="h-4 w-4 text-[#EF4923] mt-0.5" />
                                <p className="text-sm">{insight}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Brain className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                          <p className="text-sm text-muted-foreground">
                            AI insights will be generated after transaction creation
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Performance Analytics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Time to Close</span>
                          <span className="font-medium">32 days avg</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Success Rate</span>
                          <span className="font-medium">94%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Client Satisfaction</span>
                          <span className="font-medium">4.8/5</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="communication" className="mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Team Communication
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isEditing ? (
                        <div className="space-y-4">
                          {displayData.collaboration.map((msg, index) => (
                            <div key={index} className="flex gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                  {msg.user.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{msg.user}</span>
                                  <span className="text-xs text-muted-foreground">{msg.time}</span>
                                </div>
                                <p className="text-sm">{msg.message}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                          <p className="text-sm text-muted-foreground">
                            Communication hub will be available after creation
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isEditing ? (
                        <div className="space-y-3">
                          {displayData.recent_activity.map((activity, index) => (
                            <div key={index} className="flex items-start gap-3">
                              <div className={`h-2 w-2 rounded-full mt-2 ${
                                activity.ai ? 'bg-[#EF4923]' : 'bg-blue-500'
                              }`} />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{activity.user}</span>
                                  {activity.ai && (
                                    <Badge variant="secondary" className="text-xs">
                                      <Brain className="h-3 w-3 mr-1" />
                                      AI
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm">{activity.action}</p>
                                <span className="text-xs text-muted-foreground">{activity.time}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                          <p className="text-sm text-muted-foreground">
                            Activity tracking starts after transaction creation
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Footer Actions */}
        <Separator />
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-4">
            {isEditing && (
              <>
                <Badge variant="outline" className="gap-2">
                  <DollarSign className="h-3 w-3" />
                  {displayData.estimated_value}
                </Badge>
                <Badge variant="outline" className="gap-2">
                  <Calendar className="h-3 w-3" />
                  Closes {new Date(displayData.closing_date).toLocaleDateString()}
                </Badge>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {isEditing ? "Close" : "Cancel"}
            </Button>
            {!isEditing && (
              <Button 
                onClick={handleCreateTransaction}
                disabled={!newTransactionData.property_address || !newTransactionData.transaction_type}
                className="bg-[#EF4923] hover:bg-[#D4401F]"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Transaction
              </Button>
            )}
            {isEditing && (
              <Button className="bg-[#EF4923] hover:bg-[#D4401F]">
                <Settings className="h-4 w-4 mr-2" />
                Update
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}