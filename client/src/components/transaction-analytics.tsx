import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock, 
  Target, 
  Users,
  CheckCircle,
  AlertTriangle,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Brain
} from "lucide-react";

interface AnalyticsData {
  totalTransactions: number;
  activeTransactions: number;
  averageCloseTime: number;
  successRate: number;
  totalVolume: number;
  monthlyGrowth: number;
  agentPerformance: {
    topPerformer: string;
    averageRating: number;
  };
  complianceScore: number;
  aiAutomationSavings: number;
}

const MOCK_ANALYTICS: AnalyticsData = {
  totalTransactions: 247,
  activeTransactions: 34,
  averageCloseTime: 32,
  successRate: 94.2,
  totalVolume: 87650000,
  monthlyGrowth: 15.3,
  agentPerformance: {
    topPerformer: "Ryan Rodenbeck",
    averageRating: 4.8
  },
  complianceScore: 96.5,
  aiAutomationSavings: 156
};

interface TransactionTrend {
  month: string;
  transactions: number;
  volume: number;
  averagePrice: number;
}

const TRANSACTION_TRENDS: TransactionTrend[] = [
  { month: "Jan 2026", transactions: 18, volume: 12500000, averagePrice: 694444 },
  { month: "Feb 2026", transactions: 22, volume: 15200000, averagePrice: 690909 },
  { month: "Mar 2026", transactions: 28, volume: 19800000, averagePrice: 707143 },
  { month: "Apr 2026", transactions: 31, volume: 22100000, averagePrice: 712903 },
  { month: "May 2026", transactions: 35, volume: 25400000, averagePrice: 725714 },
  { month: "Jun 2026", transactions: 29, volume: 21200000, averagePrice: 731034 }
];

interface ComplianceMetric {
  category: string;
  score: number;
  totalItems: number;
  completedItems: number;
  overdueItems: number;
  trend: 'up' | 'down' | 'stable';
}

const COMPLIANCE_METRICS: ComplianceMetric[] = [
  { category: "Contract Execution", score: 98, totalItems: 45, completedItems: 44, overdueItems: 0, trend: 'up' },
  { category: "Disclosures", score: 95, totalItems: 38, completedItems: 36, overdueItems: 1, trend: 'stable' },
  { category: "Financing", score: 92, totalItems: 28, completedItems: 26, overdueItems: 0, trend: 'up' },
  { category: "Title & Closing", score: 97, totalItems: 42, completedItems: 41, overdueItems: 0, trend: 'up' },
  { category: "Post-Closing", score: 89, totalItems: 24, completedItems: 21, overdueItems: 2, trend: 'down' }
];

export function TransactionAnalytics() {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-[#EF4923]" />
          Transaction Analytics
        </h2>
        <p className="text-gray-600 mt-1">
          Comprehensive insights into transaction performance and compliance
        </p>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Volume</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(MOCK_ANALYTICS.totalVolume)}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">+{formatPercent(MOCK_ANALYTICS.monthlyGrowth)} this month</span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Deals</p>
                <p className="text-2xl font-bold text-blue-600">{MOCK_ANALYTICS.activeTransactions}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {MOCK_ANALYTICS.totalTransactions} total transactions
                </p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Close Time</p>
                <p className="text-2xl font-bold text-[#EF4923]">{MOCK_ANALYTICS.averageCloseTime} days</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingDown className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">-2 days vs last month</span>
                </div>
              </div>
              <Clock className="h-8 w-8 text-[#EF4923]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-purple-600">{formatPercent(MOCK_ANALYTICS.successRate)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">+2% improvement</span>
                </div>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="trends" className="space-y-6">
        <TabsList>
          <TabsTrigger value="trends">Market Trends</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Analytics</TabsTrigger>
          <TabsTrigger value="ai-performance">AI Performance</TabsTrigger>
          <TabsTrigger value="agent-metrics">Agent Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Transaction Volume Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Transaction Volume Trends
                </CardTitle>
                <CardDescription>Monthly transaction volume over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {TRANSACTION_TRENDS.map((trend, index) => (
                    <div key={trend.month} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{trend.month}</span>
                        <span className="text-sm font-medium">{formatCurrency(trend.volume)}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <Progress 
                          value={(trend.volume / Math.max(...TRANSACTION_TRENDS.map(t => t.volume))) * 100} 
                          className="flex-1 h-2" 
                        />
                        <span className="text-xs text-gray-600 w-16">{trend.transactions} deals</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Price Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Average Price Trends
                </CardTitle>
                <CardDescription>Average transaction price by month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {TRANSACTION_TRENDS.map((trend, index) => {
                    const previousPrice = index > 0 ? TRANSACTION_TRENDS[index - 1].averagePrice : trend.averagePrice;
                    const priceChange = ((trend.averagePrice - previousPrice) / previousPrice) * 100;
                    
                    return (
                      <div key={trend.month} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{trend.month}</p>
                          <p className="text-sm text-gray-600">{trend.transactions} transactions</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(trend.averagePrice)}</p>
                          <div className="flex items-center gap-1">
                            {priceChange > 0 ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : priceChange < 0 ? (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            ) : null}
                            <span className={`text-xs ${
                              priceChange > 0 ? 'text-green-600' : 
                              priceChange < 0 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {priceChange !== 0 && `${priceChange > 0 ? '+' : ''}${priceChange.toFixed(1)}%`}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compliance Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Compliance Score Overview
                </CardTitle>
                <CardDescription>Overall compliance performance across all categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-green-600 mb-2">
                    {formatPercent(MOCK_ANALYTICS.complianceScore)}
                  </div>
                  <p className="text-gray-600">Overall Compliance Score</p>
                  <Badge className="bg-green-100 text-green-800 mt-2">Excellent</Badge>
                </div>
                
                <div className="space-y-4">
                  {COMPLIANCE_METRICS.map((metric) => (
                    <div key={metric.category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{metric.category}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{formatPercent(metric.score)}</span>
                          {metric.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-600" />}
                          {metric.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-600" />}
                          {metric.overdueItems > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {metric.overdueItems} overdue
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Progress value={metric.score} className="h-2" />
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>{metric.completedItems} of {metric.totalItems} completed</span>
                        <span>{metric.totalItems - metric.completedItems} remaining</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Risk Assessment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Risk Assessment
                </CardTitle>
                <CardDescription>Potential compliance risks and recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border-l-4 border-red-500 bg-red-50 rounded-r-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <h4 className="font-medium text-red-800">High Priority</h4>
                    </div>
                    <p className="text-sm text-red-700">
                      2 post-closing items overdue across 3 transactions. Review required.
                    </p>
                  </div>

                  <div className="p-4 border-l-4 border-yellow-500 bg-yellow-50 rounded-r-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <h4 className="font-medium text-yellow-800">Medium Priority</h4>
                    </div>
                    <p className="text-sm text-yellow-700">
                      5 disclosure items pending review. Consider automated reminders.
                    </p>
                  </div>

                  <div className="p-4 border-l-4 border-green-500 bg-green-50 rounded-r-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <h4 className="font-medium text-green-800">Low Risk</h4>
                    </div>
                    <p className="text-sm text-green-700">
                      Contract execution and title processes are performing excellently.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ai-performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <Zap className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
                <p className="text-2xl font-bold text-yellow-600">{MOCK_ANALYTICS.aiAutomationSavings}</p>
                <p className="text-sm text-gray-600">Hours saved this month</p>
                <Badge className="bg-yellow-100 text-yellow-800 mt-2">AI Automation</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Brain className="h-12 w-12 mx-auto text-purple-500 mb-4" />
                <p className="text-2xl font-bold text-purple-600">97%</p>
                <p className="text-sm text-gray-600">Document processing accuracy</p>
                <Badge className="bg-purple-100 text-purple-800 mt-2">AI Processing</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Target className="h-12 w-12 mx-auto text-blue-500 mb-4" />
                <p className="text-2xl font-bold text-blue-600">89%</p>
                <p className="text-sm text-gray-600">Prediction accuracy</p>
                <Badge className="bg-blue-100 text-blue-800 mt-2">AI Insights</Badge>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Performance Breakdown
              </CardTitle>
              <CardDescription>Detailed AI feature performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[
                  { feature: "Document Data Extraction", accuracy: 97, processed: 234, errors: 7 },
                  { feature: "Compliance Risk Detection", accuracy: 94, processed: 89, errors: 5 },
                  { feature: "Timeline Prediction", accuracy: 89, processed: 156, errors: 17 },
                  { feature: "Contract Analysis", accuracy: 92, processed: 67, errors: 5 },
                  { feature: "Price Recommendation", accuracy: 85, processed: 43, errors: 7 }
                ].map((ai, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{ai.feature}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">{ai.processed} processed</span>
                        <span className="text-sm font-medium">{ai.accuracy}% accuracy</span>
                      </div>
                    </div>
                    <Progress value={ai.accuracy} className="h-2" />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{ai.processed - ai.errors} successful</span>
                      <span>{ai.errors} errors</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agent-metrics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Agent Performance
                </CardTitle>
                <CardDescription>Individual agent performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: "Ryan Rodenbeck", transactions: 45, volume: 32500000, rating: 4.9, role: "Broker/Owner" },
                    { name: "Trish Martinez", transactions: 38, volume: 28900000, rating: 4.8, role: "Listing Agent" },
                    { name: "Sunny Martinez", transactions: 32, volume: 18750000, rating: 4.7, role: "Buyer Agent" },
                  ].map((agent, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-[#EF4923] text-white flex items-center justify-center font-medium">
                          {agent.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <h4 className="font-medium">{agent.name}</h4>
                          <p className="text-sm text-gray-600">{agent.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-4">
                          <div className="text-sm">
                            <p className="font-medium">{agent.transactions} deals</p>
                            <p className="text-gray-600">{formatCurrency(agent.volume)}</p>
                          </div>
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <span className="text-yellow-500">★</span>
                              <span className="font-medium">{agent.rating}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Team Goals Progress</CardTitle>
                <CardDescription>Progress toward 2026 team goals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Annual Volume Goal</span>
                      <span className="text-sm text-gray-600">$87.6M / $150M</span>
                    </div>
                    <Progress value={58.4} className="h-3" />
                    <p className="text-xs text-gray-500 mt-1">58.4% complete • $62.4M remaining</p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Transaction Count</span>
                      <span className="text-sm text-gray-600">247 / 400</span>
                    </div>
                    <Progress value={61.8} className="h-3" />
                    <p className="text-xs text-gray-500 mt-1">61.8% complete • 153 deals remaining</p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Client Satisfaction</span>
                      <span className="text-sm text-gray-600">4.8 / 5.0</span>
                    </div>
                    <Progress value={96} className="h-3" />
                    <p className="text-xs text-gray-500 mt-1">Exceeding target • Maintain excellence</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}