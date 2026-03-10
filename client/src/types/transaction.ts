export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  initials: string;
  email?: string;
  phone?: string;
}

export interface TransactionTask {
  id: string;
  task: string;
  assigned_to: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high';
  estimated_hours: number;
  ai: boolean;
  ai_confidence?: number;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface TransactionDocument {
  id: string;
  name: string;
  status: 'uploaded' | 'processing' | 'processed' | 'error';
  ai_extracted: boolean;
  file_path: string;
  extracted_data?: Record<string, any>;
  uploaded_at: string;
  processed_at?: string;
}

export interface SmartAlert {
  id: string;
  type: 'deadline' | 'task' | 'document' | 'compliance' | 'risk';
  message: string;
  severity: 'info' | 'warning' | 'error';
  created_at: string;
  read: boolean;
  action_url?: string;
}

export interface WorkflowStage {
  stage: string;
  completed: boolean;
  current: boolean;
  ai_processed: boolean;
  started_at?: string;
  completed_at?: string;
  estimated_completion?: string;
}

export interface ActivityItem {
  id: string;
  user: string;
  action: string;
  time: string;
  ai: boolean;
  details?: Record<string, any>;
}

export interface CollaborationMessage {
  id: string;
  user: string;
  message: string;
  time: string;
  thread_id?: string;
  attachments?: string[];
}

export interface AIInsight {
  id: string;
  type: 'recommendation' | 'warning' | 'opportunity' | 'prediction';
  message: string;
  confidence: number;
  source: string;
  created_at: string;
  acted_upon: boolean;
}

export interface Transaction {
  id: string;
  property_address: string;
  transaction_type: string;
  client_name: string;
  closing_date: string;
  assigned_team: string[];
  priority: 'low' | 'medium' | 'high';
  estimated_value: string;
  progress: number;
  status: 'draft' | 'active' | 'in_progress' | 'pending_close' | 'closed' | 'cancelled';
  
  // AI and smart features
  ai_insights: AIInsight[];
  smart_alerts: SmartAlert[];
  workflow_status: WorkflowStage[];
  recent_activity: ActivityItem[];
  documents: TransactionDocument[];
  collaboration: CollaborationMessage[];
  
  // Additional transaction details
  buyer_agent?: string;
  seller_agent?: string;
  lender?: string;
  title_company?: string;
  attorney?: string;
  
  // Financial details
  purchase_price?: number;
  loan_amount?: number;
  down_payment?: number;
  closing_costs?: number;
  
  // Important dates
  contract_date?: string;
  inspection_date?: string;
  appraisal_date?: string;
  final_walkthrough_date?: string;
  
  // Compliance and risk
  risk_score?: number;
  compliance_checks: ComplianceCheck[];
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface ComplianceCheck {
  id: string;
  check_type: string;
  status: 'pending' | 'passed' | 'failed' | 'warning';
  description: string;
  required_action?: string;
  due_date?: string;
}

export interface NewTransactionData {
  property_address: string;
  transaction_type: string;
  client_name: string;
  closing_date: string;
  assigned_team: string[];
  priority: 'low' | 'medium' | 'high';
  estimated_value: string;
  ai_generated_tasks?: TransactionTask[];
  ai_enabled: boolean;
}

export interface WorkflowTemplate {
  [key: string]: {
    task: string;
    ai: boolean;
    priority: 'low' | 'medium' | 'high';
    estimated_hours: number;
  }[];
}

export const TRANSACTION_STATUSES = [
  'draft',
  'active', 
  'in_progress',
  'pending_close',
  'closed',
  'cancelled'
] as const;

export const TRANSACTION_TYPES = [
  'Purchase Agreement',
  'Listing Agreement',
  'Refinance',
  'Cash Sale',
  'New Construction',
  'Commercial Deal',
  'Investment Property',
  'Short Sale',
  'Foreclosure'
] as const;

export const PRIORITIES = ['low', 'medium', 'high'] as const;

export const TEAM_ROLES = [
  'Transaction Coordinator',
  'Marketing Manager',
  'Tech Lead',
  'Operations',
  'QA Specialist',
  'Listing Agent',
  'Buyer Agent',
  'Office Manager'
] as const;