import { useState } from "react";
import { Plus, Home, TrendingUp, Calendar, Users, FileText, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FeeitleOfficeModal } from "./fee-title-office-modal";

interface TransactionDashboardProps {
  className?: string;
}

// Mock data for demonstration
const ACTIVE_TRANSACTIONS = [
  {
    id: "TX-2026-001",
    property_address: "123 Main St, Austin, TX 78704",
    client_name: "John & Jane Smith",
    transaction_type: "Purchase Agreement",
    progress: 68,
    priority: "high",
    closing_date: "2026-03-25",
    estimated_value: "$750,000",
    status: "In Progress",
  },
  {
    id: "TX-2026-002", 
    property_address: "456 Oak Ave, Austin, TX 78701",
    client_name: "Sarah Johnson",
    transaction_type: "Listing Agreement",
    progress: 85,
    priority: "medium",
    closing_date: "2026-03-18",
    estimated_value: "$890,000",
    status: "Pending Close",
  },
  {
    id: "TX-2026-003",
    property_address: "789 Pine Dr, Austin, TX 78702",
    client_name: "Mike & Lisa Davis",
    transaction_type: "Refinance",
    progress: 42,
    priority: "low",
    closing_date: "2026-04-05",
    estimated_value: "$650,000", 
    status: "In Progress",
  },
];

const QUICK_STATS = [
  {
    title: "Active Transactions",
    value: "24",
    change: "+3 this week",
    icon: Home,
    color: "text-blue-600",
  },
  {
    title: "Avg Time to Close",
    value: "32 days",
    change: "-2 days vs last month",
    icon: Calendar,
    color: "text-green-600",
  },
  {
    title: "Success Rate",
    value: "94%",
    change: "+2% improvement",
    icon: TrendingUp,
    color: "text-[#EF4923]",
  },
  {
    title: "AI Automations",
    value: "156",
    change: "Tasks automated this week",
    icon: Brain,
    color: "text-purple-600",
  },
];

export function TransactionDashboard({ className }: TransactionDashboardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<string | undefined>(undefined);

  const openNewTransaction = () => {
    setSelectedTransaction(undefined);
    setModalOpen(true);
  };

  const openExistingTransaction = (transactionId: string) => {
    setSelectedTransaction(transactionId);
    setModalOpen(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Pending Close': return 'bg-yellow-100 text-yellow-800';
      case 'Closed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#EF4923] to-[#D4401F] flex items-center justify-center">
              <Home className="h-6 w-6 text-white" />
            </div>
            Fee Title Office
          </h1>
          <p className="text-muted-foreground mt-2">
            AI-powered real estate transaction management for Spyglass Realty
          </p>
        </div>
        <Button onClick={openNewTransaction} className="bg-[#EF4923] hover:bg-[#D4401F]">
          <Plus className="h-4 w-4 mr-2" />
          New Transaction
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {QUICK_STATS.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                </div>
                <div className={`h-12 w-12 rounded-lg bg-background flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Active Transactions
              </CardTitle>
              <CardDescription>
                Manage your current real estate transactions with AI-powered insights
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                <Brain className="h-3 w-3 mr-1" />
                AI Enhanced
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ACTIVE_TRANSACTIONS.map((transaction) => (
              <div 
                key={transaction.id}
                className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openExistingTransaction(transaction.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium truncate">{transaction.property_address}</h3>
                      <Badge variant={getPriorityColor(transaction.priority)} className="text-xs">
                        {transaction.priority} priority
                      </Badge>
                      <Badge className={`text-xs ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Client:</span>
                        <div>{transaction.client_name}</div>
                      </div>
                      <div>
                        <span className="font-medium">Type:</span>
                        <div>{transaction.transaction_type}</div>
                      </div>
                      <div>
                        <span className="font-medium">Closing:</span>
                        <div>{new Date(transaction.closing_date).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <span className="font-medium">Value:</span>
                        <div>{transaction.estimated_value}</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm text-muted-foreground">{transaction.progress}%</span>
                  </div>
                  <Progress value={transaction.progress} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Features Showcase */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-[#EF4923]" />
            AI-Powered Features
          </CardTitle>
          <CardDescription>
            Intelligent automation and insights for better transaction management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-medium mb-2">Document Processing</h4>
              <p className="text-sm text-muted-foreground">
                Automatically extract key information from contracts, disclosures, and reports
              </p>
            </div>
            
            <div className="text-center">
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center mx-auto mb-3">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-medium mb-2">Smart Scheduling</h4>
              <p className="text-sm text-muted-foreground">
                Intelligent deadline management and automated task creation
              </p>
            </div>
            
            <div className="text-center">
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-medium mb-2">Predictive Analytics</h4>
              <p className="text-sm text-muted-foreground">
                Risk assessment and timeline predictions based on historical data
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fee Title Office Modal */}
      <FeeitleOfficeModal 
        open={modalOpen}
        onOpenChange={setModalOpen}
        transactionId={selectedTransaction}
      />
    </div>
  );
}