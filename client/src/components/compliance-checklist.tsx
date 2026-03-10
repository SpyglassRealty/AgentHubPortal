import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Shield,
  CheckCircle,
  AlertTriangle,
  Clock,
  FileText,
  User,
  Calendar,
  ExternalLink,
  Plus,
  Filter,
  Search,
  TrendingUp,
  Target,
  Bell,
  Download,
  Upload
} from "lucide-react";
import { 
  getComplianceChecklistByType,
  calculateComplianceScore,
  getOverdueItems,
  getUpcomingItems,
  type ComplianceChecklist,
  type ComplianceChecklistItem,
  COMPLIANCE_CATEGORIES
} from "@/lib/compliance-templates";

interface ComplianceChecklistProps {
  transactionId: string;
  transactionType: string;
  state?: string;
}

export function ComplianceChecklistComponent({ transactionId, transactionType, state = "Texas" }: ComplianceChecklistProps) {
  const [checklist, setChecklist] = useState<ComplianceChecklist | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [itemDetailOpen, setItemDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ComplianceChecklistItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadedChecklist = getComplianceChecklistByType(transactionType, state);
    if (loadedChecklist) {
      setChecklist(loadedChecklist);
    }
  }, [transactionType, state]);

  if (!checklist) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium mb-2">No Compliance Checklist Available</h3>
        <p className="text-gray-600">
          Compliance checklist for {transactionType} in {state} is not available yet.
        </p>
      </div>
    );
  }

  const score = calculateComplianceScore(checklist);
  const overdueItems = getOverdueItems(checklist);
  const upcomingItems = getUpcomingItems(checklist, 7);

  const updateItemStatus = (itemId: string, completed: boolean, notes?: string) => {
    setChecklist(prev => {
      if (!prev) return prev;
      
      return {
        ...prev,
        items: prev.items.map(item =>
          item.id === itemId
            ? {
                ...item,
                completed,
                completedAt: completed ? new Date().toISOString() : undefined,
                completedBy: completed ? 'Current User' : undefined,
                notes: notes || item.notes
              }
            : item
        )
      };
    });
  };

  const filteredItems = checklist.items.filter(item => {
    const matchesSearch = item.task.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesTab = activeTab === 'all' ||
                      (activeTab === 'pending' && !item.completed) ||
                      (activeTab === 'completed' && item.completed) ||
                      (activeTab === 'overdue' && overdueItems.some(od => od.id === item.id)) ||
                      (activeTab === 'critical' && item.priority === 'critical');
    
    return matchesSearch && matchesCategory && matchesTab;
  });

  const itemsByCategory = COMPLIANCE_CATEGORIES.map(category => ({
    category,
    items: checklist.items.filter(item => item.category === category),
    completed: checklist.items.filter(item => item.category === category && item.completed).length
  }));

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'low':
        return <Target className="h-4 w-4 text-green-600" />;
      default:
        return <Target className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-[#EF4923]" />
            Compliance Checklist
          </h2>
          <p className="text-gray-600 mt-1">
            {checklist.name} - {checklist.state} ({checklist.version})
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import Template
          </Button>
        </div>
      </div>

      {/* Compliance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Progress</p>
                <p className="text-3xl font-bold text-[#EF4923]">{score.overall}%</p>
                <p className="text-xs text-gray-500">{score.completed} of {score.total} completed</p>
              </div>
              <div className="h-16 w-16">
                <div className="relative h-16 w-16">
                  <svg className="h-16 w-16 transform -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      className="text-gray-200"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 28}`}
                      strokeDashoffset={`${2 * Math.PI * 28 * (1 - score.overall / 100)}`}
                      className="text-[#EF4923]"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-medium">{score.overall}%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical Items</p>
                <p className="text-3xl font-bold text-red-600">{score.critical}%</p>
                <p className="text-xs text-gray-500">{score.criticalCompleted} of {score.criticalTotal}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue Items</p>
                <p className="text-3xl font-bold text-orange-600">{overdueItems.length}</p>
                <p className="text-xs text-gray-500">Require immediate attention</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Due This Week</p>
                <p className="text-3xl font-bold text-blue-600">{upcomingItems.length}</p>
                <p className="text-xs text-gray-500">Items coming due</p>
              </div>
              <Bell className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(overdueItems.length > 0 || upcomingItems.length > 0) && (
        <div className="space-y-3">
          {overdueItems.length > 0 && (
            <div className="border-l-4 border-red-500 bg-red-50 p-4 rounded-r-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h3 className="font-medium text-red-800">Overdue Items ({overdueItems.length})</h3>
              </div>
              <ul className="text-sm text-red-700 space-y-1">
                {overdueItems.slice(0, 3).map(item => (
                  <li key={item.id}>• {item.task}</li>
                ))}
                {overdueItems.length > 3 && <li>• And {overdueItems.length - 3} more...</li>}
              </ul>
            </div>
          )}

          {upcomingItems.length > 0 && (
            <div className="border-l-4 border-yellow-500 bg-yellow-50 p-4 rounded-r-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <h3 className="font-medium text-yellow-800">Due This Week ({upcomingItems.length})</h3>
              </div>
              <ul className="text-sm text-yellow-700 space-y-1">
                {upcomingItems.slice(0, 3).map(item => (
                  <li key={item.id}>• {item.task}</li>
                ))}
                {upcomingItems.length > 3 && <li>• And {upcomingItems.length - 3} more...</li>}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search compliance items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <select 
            className="px-3 py-2 border border-gray-300 rounded-md bg-white"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {COMPLIANCE_CATEGORIES.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            More Filters
          </Button>
        </div>
      </div>

      {/* Compliance Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Compliance Items
          </CardTitle>
          <CardDescription>
            Track and manage compliance requirements for this transaction
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="all">All ({checklist.items.length})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({checklist.items.filter(i => !i.completed).length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({checklist.items.filter(i => i.completed).length})</TabsTrigger>
              <TabsTrigger value="overdue">Overdue ({overdueItems.length})</TabsTrigger>
              <TabsTrigger value="critical">Critical ({checklist.items.filter(i => i.priority === 'critical').length})</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Progress by Category */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Progress by Category</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {itemsByCategory.map(({ category, items, completed }) => (
                      <div key={category} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{category}</span>
                          <span className="text-sm text-gray-600">{completed}/{items.length}</span>
                        </div>
                        <Progress value={items.length > 0 ? (completed / items.length) * 100 : 0} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {checklist.items
                        .filter(item => item.completed && item.completedAt)
                        .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
                        .slice(0, 5)
                        .map(item => (
                          <div key={item.id} className="flex items-start gap-3">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.task}</p>
                              <p className="text-xs text-gray-500">
                                Completed {item.completedAt ? new Date(item.completedAt).toLocaleDateString() : 'Unknown'}
                                {item.completedBy && ` by ${item.completedBy}`}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value={activeTab} className="space-y-4 mt-6">
              {filteredItems.map((item) => (
                <div 
                  key={item.id} 
                  className={`border rounded-lg p-4 transition-colors ${
                    item.completed ? 'bg-green-50 border-green-200' : 
                    overdueItems.some(od => od.id === item.id) ? 'bg-red-50 border-red-200' :
                    'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="pt-1">
                      <Checkbox
                        checked={item.completed}
                        onCheckedChange={(checked) => updateItemStatus(item.id, !!checked)}
                        disabled={!item.required && item.completed}
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-medium ${item.completed ? 'line-through text-gray-500' : ''}`}>
                              {item.task}
                            </h3>
                            <Badge className={getPriorityColor(item.priority)}>
                              {item.priority}
                            </Badge>
                            {item.required && (
                              <Badge variant="destructive" className="text-xs">Required</Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {item.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                        </div>
                        {getPriorityIcon(item.priority)}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                        {item.dueDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Due: {new Date(item.dueDate).toLocaleDateString()}
                          </div>
                        )}
                        {item.completed && item.completedAt && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            Completed: {new Date(item.completedAt).toLocaleDateString()}
                            {item.completedBy && ` by ${item.completedBy}`}
                          </div>
                        )}
                      </div>

                      {item.documents && item.documents.length > 0 && (
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Required documents: {item.documents.join(', ')}
                          </span>
                        </div>
                      )}

                      {item.dependencies && item.dependencies.length > 0 && (
                        <div className="text-sm text-gray-600 mb-2">
                          <strong>Dependencies:</strong> {item.dependencies.join(', ')}
                        </div>
                      )}

                      {item.notes && (
                        <div className="bg-blue-50 border border-blue-200 rounded p-2 text-sm">
                          <strong>Notes:</strong> {item.notes}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedItem(item);
                          setItemDetailOpen(true);
                        }}
                      >
                        Details
                      </Button>
                      {item.documents && (
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-1" />
                          Docs
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {filteredItems.length === 0 && (
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No items found</h3>
                  <p className="text-gray-600">
                    {searchQuery || selectedCategory !== 'all' 
                      ? 'Try adjusting your search or filter criteria' 
                      : 'All compliance items are up to date'
                    }
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Item Detail Dialog */}
      <Dialog open={itemDetailOpen} onOpenChange={setItemDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedItem && getPriorityIcon(selectedItem.priority)}
              {selectedItem?.task}
            </DialogTitle>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-6 py-4">
              <div className="flex flex-wrap gap-2">
                <Badge className={getPriorityColor(selectedItem.priority)}>
                  {selectedItem.priority} Priority
                </Badge>
                {selectedItem.required && (
                  <Badge variant="destructive">Required</Badge>
                )}
                <Badge variant="outline">{selectedItem.category}</Badge>
                {selectedItem.completed && (
                  <Badge className="bg-green-100 text-green-800">Completed</Badge>
                )}
              </div>

              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-gray-600">{selectedItem.description}</p>
              </div>

              {selectedItem.documents && selectedItem.documents.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Required Documents</h4>
                  <ul className="space-y-1">
                    {selectedItem.documents.map((doc, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{doc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add notes about this compliance item..."
                  value={selectedItem.notes || ''}
                  onChange={(e) => {
                    if (selectedItem) {
                      const updatedItem = { ...selectedItem, notes: e.target.value };
                      setSelectedItem(updatedItem);
                      updateItemStatus(selectedItem.id, selectedItem.completed, e.target.value);
                    }
                  }}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setItemDetailOpen(false)}>
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    if (selectedItem) {
                      updateItemStatus(selectedItem.id, !selectedItem.completed);
                      setItemDetailOpen(false);
                    }
                  }}
                  className={selectedItem.completed ? "bg-gray-600 hover:bg-gray-700" : "bg-[#EF4923] hover:bg-[#D4401F]"}
                >
                  {selectedItem.completed ? 'Mark Incomplete' : 'Mark Complete'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}