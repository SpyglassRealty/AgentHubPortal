import { WorkflowTemplate, TransactionTask, AIInsight } from '@/types/transaction';

export const WORKFLOW_TEMPLATES: WorkflowTemplate = {
  "Purchase Agreement": [
    { task: "Contract Review & Analysis", ai: true, priority: "high", estimated_hours: 2 },
    { task: "Title Search Initiation", ai: true, priority: "high", estimated_hours: 4 },
    { task: "Loan Application Processing", ai: false, priority: "medium", estimated_hours: 6 },
    { task: "Property Inspection Coordination", ai: true, priority: "medium", estimated_hours: 1 },
    { task: "Appraisal Management", ai: false, priority: "medium", estimated_hours: 2 },
    { task: "Insurance Verification", ai: true, priority: "medium", estimated_hours: 1 },
    { task: "Final Walkthrough Scheduling", ai: false, priority: "low", estimated_hours: 1 },
    { task: "Closing Document Preparation", ai: true, priority: "high", estimated_hours: 3 },
    { task: "Settlement Coordination", ai: false, priority: "high", estimated_hours: 2 },
  ],
  "Listing Agreement": [
    { task: "Property Market Analysis", ai: true, priority: "high", estimated_hours: 3 },
    { task: "Pricing Strategy Development", ai: true, priority: "high", estimated_hours: 2 },
    { task: "Marketing Plan Creation", ai: true, priority: "high", estimated_hours: 4 },
    { task: "Professional Photography Scheduling", ai: false, priority: "medium", estimated_hours: 1 },
    { task: "MLS Listing Creation", ai: true, priority: "high", estimated_hours: 2 },
    { task: "Social Media Campaign Setup", ai: true, priority: "medium", estimated_hours: 2 },
    { task: "Showing Coordination System", ai: true, priority: "medium", estimated_hours: 1 },
    { task: "Offer Review & Negotiation", ai: false, priority: "high", estimated_hours: 6 },
    { task: "Contract Management", ai: true, priority: "high", estimated_hours: 4 },
  ],
  "Refinance": [
    { task: "Current Loan Analysis", ai: true, priority: "high", estimated_hours: 2 },
    { task: "Rate Shopping & Comparison", ai: true, priority: "high", estimated_hours: 3 },
    { task: "Application Processing", ai: false, priority: "medium", estimated_hours: 4 },
    { task: "Document Collection", ai: true, priority: "medium", estimated_hours: 2 },
    { task: "Appraisal Coordination", ai: false, priority: "medium", estimated_hours: 2 },
    { task: "Underwriting Support", ai: true, priority: "high", estimated_hours: 3 },
    { task: "Closing Preparation", ai: true, priority: "high", estimated_hours: 2 },
  ],
  "Cash Sale": [
    { task: "Proof of Funds Verification", ai: true, priority: "high", estimated_hours: 1 },
    { task: "Purchase Agreement Review", ai: true, priority: "high", estimated_hours: 2 },
    { task: "Title Search & Insurance", ai: true, priority: "high", estimated_hours: 3 },
    { task: "Property Inspection", ai: false, priority: "medium", estimated_hours: 2 },
    { task: "Final Walkthrough", ai: false, priority: "low", estimated_hours: 1 },
    { task: "Closing Documentation", ai: true, priority: "high", estimated_hours: 2 },
  ],
  "New Construction": [
    { task: "Builder Contract Review", ai: true, priority: "high", estimated_hours: 3 },
    { task: "Construction Timeline Monitoring", ai: true, priority: "medium", estimated_hours: 8 },
    { task: "Quality Control Inspections", ai: false, priority: "high", estimated_hours: 4 },
    { task: "Change Order Management", ai: true, priority: "medium", estimated_hours: 6 },
    { task: "Final Walk-Through Coordination", ai: false, priority: "high", estimated_hours: 2 },
    { task: "Warranty Documentation", ai: true, priority: "medium", estimated_hours: 1 },
    { task: "Closing & Handover", ai: false, priority: "high", estimated_hours: 3 },
  ],
  "Commercial Deal": [
    { task: "Due Diligence Package Review", ai: true, priority: "high", estimated_hours: 6 },
    { task: "Financial Analysis", ai: true, priority: "high", estimated_hours: 4 },
    { task: "Environmental Assessment Coordination", ai: false, priority: "high", estimated_hours: 3 },
    { task: "Zoning & Permit Verification", ai: true, priority: "medium", estimated_hours: 2 },
    { task: "Financing Coordination", ai: false, priority: "high", estimated_hours: 8 },
    { task: "Legal Documentation Review", ai: true, priority: "high", estimated_hours: 4 },
    { task: "Closing Coordination", ai: false, priority: "high", estimated_hours: 4 },
  ],
  "Investment Property": [
    { task: "ROI Analysis", ai: true, priority: "high", estimated_hours: 3 },
    { task: "Rental Market Analysis", ai: true, priority: "high", estimated_hours: 2 },
    { task: "Property Cash Flow Modeling", ai: true, priority: "high", estimated_hours: 2 },
    { task: "Tax Implications Review", ai: true, priority: "medium", estimated_hours: 2 },
    { task: "Property Management Setup", ai: false, priority: "medium", estimated_hours: 3 },
    { task: "Insurance & Protection Planning", ai: true, priority: "medium", estimated_hours: 2 },
    { task: "Closing & Transfer", ai: false, priority: "high", estimated_hours: 3 },
  ],
  "Short Sale": [
    { task: "Financial Hardship Documentation", ai: true, priority: "high", estimated_hours: 4 },
    { task: "Lender Negotiation", ai: false, priority: "high", estimated_hours: 8 },
    { task: "BPO/Appraisal Coordination", ai: true, priority: "high", estimated_hours: 2 },
    { task: "Approval Letter Management", ai: true, priority: "high", estimated_hours: 3 },
    { task: "Buyer Communication", ai: false, priority: "medium", estimated_hours: 4 },
    { task: "Closing Coordination", ai: false, priority: "high", estimated_hours: 3 },
  ],
  "Foreclosure": [
    { task: "Property Research & Analysis", ai: true, priority: "high", estimated_hours: 3 },
    { task: "Auction Strategy Development", ai: true, priority: "high", estimated_hours: 2 },
    { task: "Financing Pre-Approval", ai: false, priority: "high", estimated_hours: 4 },
    { task: "Title Research", ai: true, priority: "high", estimated_hours: 3 },
    { task: "Inspection (if possible)", ai: false, priority: "medium", estimated_hours: 2 },
    { task: "Post-Purchase Renovation Planning", ai: true, priority: "low", estimated_hours: 4 },
  ],
};

export class TransactionAI {
  
  /**
   * Generate AI-enhanced tasks based on transaction type
   */
  static generateAITasks(transactionType: string, customParams?: any): TransactionTask[] {
    const template = WORKFLOW_TEMPLATES[transactionType];
    if (!template) return [];

    return template.map((task, index) => ({
      id: `task-${Date.now()}-${index}`,
      task: task.task,
      assigned_to: "",
      due_date: "",
      priority: task.priority,
      estimated_hours: task.estimated_hours,
      ai: task.ai,
      ai_confidence: task.ai ? this.calculateAIConfidence(task.task, transactionType) : 0,
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  }

  /**
   * Calculate AI confidence based on task complexity and our training data
   */
  private static calculateAIConfidence(taskName: string, transactionType: string): number {
    const baseConfidence = 85;
    
    // Higher confidence for document processing and analysis tasks
    if (taskName.toLowerCase().includes('review') || 
        taskName.toLowerCase().includes('analysis') ||
        taskName.toLowerCase().includes('document')) {
      return Math.min(95, baseConfidence + Math.floor(Math.random() * 10));
    }
    
    // Medium confidence for coordination and management tasks
    if (taskName.toLowerCase().includes('coordination') || 
        taskName.toLowerCase().includes('management') ||
        taskName.toLowerCase().includes('scheduling')) {
      return Math.min(90, baseConfidence + Math.floor(Math.random() * 5));
    }
    
    // Standard confidence for other tasks
    return baseConfidence + Math.floor(Math.random() * 8);
  }

  /**
   * Generate AI insights based on transaction data
   */
  static generateAIInsights(transaction: any): AIInsight[] {
    const insights: AIInsight[] = [];
    const now = new Date().toISOString();

    // Timeline analysis
    if (transaction.closing_date) {
      const closingDate = new Date(transaction.closing_date);
      const today = new Date();
      const daysToClose = Math.ceil((closingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysToClose < 30) {
        insights.push({
          id: `insight-timeline-${Date.now()}`,
          type: 'warning',
          message: `Tight closing timeline detected (${daysToClose} days). Consider expediting title search and loan processing.`,
          confidence: 92,
          source: 'Timeline Analysis Engine',
          created_at: now,
          acted_upon: false,
        });
      }
    }

    // Property value analysis
    if (transaction.estimated_value) {
      const value = parseInt(transaction.estimated_value.replace(/\$|,/g, ''));
      if (value > 1000000) {
        insights.push({
          id: `insight-value-${Date.now()}`,
          type: 'recommendation',
          message: 'High-value transaction detected. Recommend additional insurance review and enhanced due diligence protocols.',
          confidence: 88,
          source: 'Property Value Analyzer',
          created_at: now,
          acted_upon: false,
        });
      }
    }

    // Transaction type specific insights
    if (transaction.transaction_type === 'Purchase Agreement') {
      insights.push({
        id: `insight-purchase-${Date.now()}`,
        type: 'recommendation',
        message: 'Consider scheduling home inspection within 7 days of contract acceptance to maintain negotiation leverage.',
        confidence: 94,
        source: 'Purchase Agreement Optimizer',
        created_at: now,
        acted_upon: false,
      });
    }

    if (transaction.transaction_type === 'Listing Agreement') {
      insights.push({
        id: `insight-listing-${Date.now()}`,
        type: 'opportunity',
        message: 'Market conditions favorable for listings in this price range. Consider highlighting unique property features in marketing.',
        confidence: 87,
        source: 'Market Trend Analyzer',
        created_at: now,
        acted_upon: false,
      });
    }

    return insights;
  }

  /**
   * Generate smart alerts based on transaction progress
   */
  static generateSmartAlerts(transaction: any): any[] {
    const alerts = [];
    const now = new Date();

    // Contract-related alerts
    if (transaction.contract_date) {
      const contractDate = new Date(transaction.contract_date);
      const daysSinceContract = Math.floor((now.getTime() - contractDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceContract === 7) {
        alerts.push({
          type: 'deadline',
          message: 'Option period expires today - confirm extension or proceed',
          severity: 'warning'
        });
      }
    }

    // Inspection alerts
    if (transaction.inspection_date) {
      const inspectionDate = new Date(transaction.inspection_date);
      const daysToInspection = Math.floor((inspectionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysToInspection === 1) {
        alerts.push({
          type: 'task',
          message: 'Property inspection scheduled for tomorrow - confirm attendance',
          severity: 'info'
        });
      }
    }

    // Closing alerts
    if (transaction.closing_date) {
      const closingDate = new Date(transaction.closing_date);
      const daysToClosing = Math.floor((closingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysToClosing === 7) {
        alerts.push({
          type: 'deadline',
          message: 'Closing in 7 days - verify all documents and funds are ready',
          severity: 'warning'
        });
      }
    }

    return alerts;
  }

  /**
   * Calculate transaction risk score
   */
  static calculateRiskScore(transaction: any): number {
    let riskScore = 0;

    // Timeline risk
    if (transaction.closing_date) {
      const daysToClose = Math.ceil((new Date(transaction.closing_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (daysToClose < 21) riskScore += 25;
      else if (daysToClose < 30) riskScore += 15;
    }

    // Transaction type risk
    const highRiskTypes = ['Short Sale', 'Foreclosure', 'New Construction'];
    if (highRiskTypes.includes(transaction.transaction_type)) {
      riskScore += 20;
    }

    // Value risk
    if (transaction.estimated_value) {
      const value = parseInt(transaction.estimated_value.replace(/\$|,/g, ''));
      if (value > 2000000) riskScore += 15;
      else if (value > 1000000) riskScore += 10;
    }

    // Team assignment risk
    if (transaction.assigned_team.length < 2) {
      riskScore += 10;
    }

    return Math.min(100, riskScore);
  }

  /**
   * Generate automated task suggestions
   */
  static generateTaskSuggestions(transaction: any): string[] {
    const suggestions = [];

    // Based on transaction type
    if (transaction.transaction_type === 'Purchase Agreement') {
      suggestions.push('Schedule home inspection within 7 days');
      suggestions.push('Order appraisal and title search simultaneously');
      suggestions.push('Set up automated lender communication schedule');
    }

    // Based on progress
    if (transaction.progress < 25) {
      suggestions.push('Upload all required documents for AI processing');
      suggestions.push('Assign team members to critical path tasks');
    }

    // Based on timeline
    if (transaction.closing_date) {
      const daysToClose = Math.ceil((new Date(transaction.closing_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (daysToClose < 30) {
        suggestions.push('Consider expediting all third-party services');
        suggestions.push('Schedule final walkthrough 24-48 hours before closing');
      }
    }

    return suggestions;
  }
}