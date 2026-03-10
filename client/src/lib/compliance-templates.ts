// Comprehensive compliance checklists based on BrokerMint and SkySlope research
export interface ComplianceChecklistItem {
  id: string;
  category: string;
  task: string;
  description: string;
  required: boolean;
  dueDate?: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: string;
  notes?: string;
  dependencies?: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  documents?: string[];
}

export interface ComplianceChecklist {
  id: string;
  name: string;
  transactionType: string;
  state: string;
  version: string;
  items: ComplianceChecklistItem[];
  lastUpdated: string;
}

export const TEXAS_PURCHASE_COMPLIANCE: ComplianceChecklist = {
  id: 'tx-purchase-2026',
  name: 'Texas Purchase Agreement Compliance',
  transactionType: 'Purchase Agreement',
  state: 'Texas',
  version: '2026.1',
  lastUpdated: '2026-03-01',
  items: [
    // Pre-Contract Phase
    {
      id: 'pre-1',
      category: 'Pre-Contract',
      task: 'Buyer Pre-Approval Verification',
      description: 'Verify buyer has valid pre-approval letter from qualified lender',
      required: true,
      completed: false,
      priority: 'critical',
      documents: ['Pre-approval Letter', 'Financial Statements']
    },
    {
      id: 'pre-2',
      category: 'Pre-Contract',
      task: 'Property Disclosure Review',
      description: 'Review and acknowledge all property disclosures',
      required: true,
      completed: false,
      priority: 'critical',
      documents: ['Seller\'s Disclosure', 'Lead-Based Paint Disclosure']
    },
    {
      id: 'pre-3',
      category: 'Pre-Contract',
      task: 'Agent License Verification',
      description: 'Confirm all agents have current Texas real estate licenses',
      required: true,
      completed: false,
      priority: 'high',
      documents: ['License Verification']
    },

    // Contract Execution Phase
    {
      id: 'contract-1',
      category: 'Contract Execution',
      task: 'Purchase Agreement Completion',
      description: 'Complete and execute TREC-approved purchase agreement',
      required: true,
      completed: false,
      priority: 'critical',
      documents: ['One to Four Family Residential Contract (TREC 20-16)', 'Addenda']
    },
    {
      id: 'contract-2',
      category: 'Contract Execution',
      task: 'Earnest Money Deposit',
      description: 'Collect and deposit earnest money within required timeframe',
      required: true,
      completed: false,
      priority: 'critical',
      documents: ['Earnest Money Receipt', 'Deposit Slip']
    },
    {
      id: 'contract-3',
      category: 'Contract Execution',
      task: 'Contract Distribution',
      description: 'Distribute executed contract to all parties within 3 days',
      required: true,
      completed: false,
      priority: 'high',
      documents: ['Distribution Confirmation']
    },

    // Option Period Phase
    {
      id: 'option-1',
      category: 'Option Period',
      task: 'Option Fee Payment',
      description: 'Verify option fee paid within 3 days of effective date',
      required: true,
      completed: false,
      priority: 'critical',
      documents: ['Option Fee Receipt']
    },
    {
      id: 'option-2',
      category: 'Option Period',
      task: 'Property Inspection Scheduling',
      description: 'Schedule property inspection during option period',
      required: false,
      completed: false,
      priority: 'high',
      documents: ['Inspection Report']
    },
    {
      id: 'option-3',
      category: 'Option Period',
      task: 'HOA Documentation',
      description: 'Obtain HOA bylaws, financial statements, and meeting minutes',
      required: false,
      completed: false,
      priority: 'medium',
      documents: ['HOA Bylaws', 'Financial Statements', 'Meeting Minutes']
    },

    // Financing Phase
    {
      id: 'finance-1',
      category: 'Financing',
      task: 'Loan Application Submission',
      description: 'Submit complete loan application within required timeframe',
      required: true,
      completed: false,
      priority: 'critical',
      documents: ['Loan Application', '1003 Form']
    },
    {
      id: 'finance-2',
      category: 'Financing',
      task: 'Appraisal Coordination',
      description: 'Coordinate property appraisal with lender',
      required: true,
      completed: false,
      priority: 'high',
      documents: ['Appraisal Report']
    },
    {
      id: 'finance-3',
      category: 'Financing',
      task: 'Loan Conditions Review',
      description: 'Review and address all loan conditions',
      required: true,
      completed: false,
      priority: 'high',
      documents: ['Conditions List', 'Condition Responses']
    },

    // Title and Closing Phase
    {
      id: 'title-1',
      category: 'Title & Closing',
      task: 'Title Commitment Review',
      description: 'Review title commitment and resolve any issues',
      required: true,
      completed: false,
      priority: 'critical',
      documents: ['Title Commitment', 'Title Curative Documents']
    },
    {
      id: 'title-2',
      category: 'Title & Closing',
      task: 'Survey Review',
      description: 'Review property survey for boundary issues',
      required: true,
      completed: false,
      priority: 'high',
      documents: ['Property Survey', 'Survey Affidavit']
    },
    {
      id: 'title-3',
      category: 'Title & Closing',
      task: 'Final Walkthrough',
      description: 'Conduct final walkthrough within 5 days of closing',
      required: true,
      completed: false,
      priority: 'high',
      documents: ['Walkthrough Checklist']
    },
    {
      id: 'title-4',
      category: 'Title & Closing',
      task: 'Closing Disclosure Review',
      description: 'Review closing disclosure with client 3 days prior to closing',
      required: true,
      completed: false,
      priority: 'critical',
      documents: ['Closing Disclosure', 'Review Acknowledgment']
    },

    // Post-Closing Phase
    {
      id: 'post-1',
      category: 'Post-Closing',
      task: 'Document Filing',
      description: 'Ensure all documents are properly filed and recorded',
      required: true,
      completed: false,
      priority: 'high',
      documents: ['Recorded Deed', 'Filing Receipts']
    },
    {
      id: 'post-2',
      category: 'Post-Closing',
      task: 'Client Follow-up',
      description: 'Follow up with clients within 48 hours of closing',
      required: false,
      completed: false,
      priority: 'medium',
      documents: ['Follow-up Log']
    },
    {
      id: 'post-3',
      category: 'Post-Closing',
      task: 'Transaction File Audit',
      description: 'Complete internal audit of transaction file',
      required: true,
      completed: false,
      priority: 'high',
      documents: ['Audit Checklist', 'Compliance Review']
    }
  ]
};

export const TEXAS_LISTING_COMPLIANCE: ComplianceChecklist = {
  id: 'tx-listing-2026',
  name: 'Texas Listing Agreement Compliance',
  transactionType: 'Listing Agreement',
  state: 'Texas',
  version: '2026.1',
  lastUpdated: '2026-03-01',
  items: [
    // Pre-Listing Phase
    {
      id: 'pre-list-1',
      category: 'Pre-Listing',
      task: 'Property Assessment',
      description: 'Conduct thorough property assessment and CMA',
      required: true,
      completed: false,
      priority: 'critical',
      documents: ['Property Assessment', 'CMA Report']
    },
    {
      id: 'pre-list-2',
      category: 'Pre-Listing',
      task: 'Seller Disclosure Preparation',
      description: 'Prepare complete seller\'s disclosure statement',
      required: true,
      completed: false,
      priority: 'critical',
      documents: ['Seller\'s Disclosure Notice (TREC OP-H)']
    },

    // Listing Agreement Phase
    {
      id: 'list-1',
      category: 'Listing Agreement',
      task: 'Listing Agreement Execution',
      description: 'Execute TREC-approved listing agreement',
      required: true,
      completed: false,
      priority: 'critical',
      documents: ['Listing Agreement (TREC 1-2)']
    },
    {
      id: 'list-2',
      category: 'Listing Agreement',
      task: 'MLS Entry',
      description: 'Enter property in MLS within 48 hours of execution',
      required: true,
      completed: false,
      priority: 'high',
      documents: ['MLS Entry Confirmation']
    },

    // Marketing Phase
    {
      id: 'market-1',
      category: 'Marketing',
      task: 'Professional Photography',
      description: 'Schedule professional photography and virtual tour',
      required: false,
      completed: false,
      priority: 'medium',
      documents: ['Photo Shoot Schedule', 'Photo Releases']
    },
    {
      id: 'market-2',
      category: 'Marketing',
      task: 'Marketing Materials Creation',
      description: 'Create property marketing materials and online listings',
      required: true,
      completed: false,
      priority: 'medium',
      documents: ['Marketing Materials', 'Online Listings']
    },

    // Showing and Offers Phase
    {
      id: 'show-1',
      category: 'Showing & Offers',
      task: 'Showing Instructions',
      description: 'Provide clear showing instructions and lockbox access',
      required: true,
      completed: false,
      priority: 'high',
      documents: ['Showing Instructions', 'Lockbox Agreement']
    },
    {
      id: 'show-2',
      category: 'Showing & Offers',
      task: 'Offer Review Process',
      description: 'Establish clear offer review and response procedures',
      required: true,
      completed: false,
      priority: 'high',
      documents: ['Offer Review Procedures']
    },

    // Contract to Closing Phase
    {
      id: 'contract-list-1',
      category: 'Contract to Closing',
      task: 'Purchase Contract Review',
      description: 'Review purchase contract with seller',
      required: true,
      completed: false,
      priority: 'critical',
      documents: ['Purchase Agreement', 'Contract Review Notes']
    },
    {
      id: 'contract-list-2',
      category: 'Contract to Closing',
      task: 'Closing Coordination',
      description: 'Coordinate closing process with all parties',
      required: true,
      completed: false,
      priority: 'high',
      documents: ['Closing Coordination Timeline']
    }
  ]
};

export const COMPLIANCE_CATEGORIES = [
  'Pre-Contract',
  'Contract Execution',
  'Option Period',
  'Financing',
  'Title & Closing',
  'Post-Closing',
  'Pre-Listing',
  'Listing Agreement',
  'Marketing',
  'Showing & Offers',
  'Contract to Closing'
];

export const DOCUMENT_TEMPLATES = {
  'Purchase Agreement': [
    'One to Four Family Residential Contract (TREC 20-16)',
    'Seller\'s Disclosure Notice (TREC OP-H)',
    'Lead-Based Paint Disclosure',
    'Information About Brokerage Services (TREC IABS 1-0)',
    'Earnest Money Contract Addenda'
  ],
  'Listing Agreement': [
    'Listing Agreement (TREC 1-2)',
    'Information About Brokerage Services (TREC IABS 1-0)',
    'Seller\'s Disclosure Notice (TREC OP-H)',
    'MLS Data Input Form',
    'Marketing Authorization'
  ],
  'Common Forms': [
    'Amendment to Contract (TREC 38-7)',
    'Termination of Contract (TREC 38-0)',
    'Release of Earnest Money (TREC 47-0)',
    'Third Party Financing Addendum (TREC 40-9)',
    'Seller Financing Addendum (TREC 26-7)'
  ]
};

export function getComplianceChecklistByType(transactionType: string, state: string = 'Texas'): ComplianceChecklist | null {
  if (state === 'Texas') {
    switch (transactionType) {
      case 'Purchase Agreement':
        return TEXAS_PURCHASE_COMPLIANCE;
      case 'Listing Agreement':
        return TEXAS_LISTING_COMPLIANCE;
      default:
        return null;
    }
  }
  return null;
}

export function calculateComplianceScore(checklist: ComplianceChecklist): {
  overall: number;
  critical: number;
  completed: number;
  total: number;
  criticalCompleted: number;
  criticalTotal: number;
} {
  const total = checklist.items.length;
  const completed = checklist.items.filter(item => item.completed).length;
  const criticalItems = checklist.items.filter(item => item.priority === 'critical');
  const criticalTotal = criticalItems.length;
  const criticalCompleted = criticalItems.filter(item => item.completed).length;

  return {
    overall: total > 0 ? Math.round((completed / total) * 100) : 0,
    critical: criticalTotal > 0 ? Math.round((criticalCompleted / criticalTotal) * 100) : 100,
    completed,
    total,
    criticalCompleted,
    criticalTotal
  };
}

export function getOverdueItems(checklist: ComplianceChecklist): ComplianceChecklistItem[] {
  const now = new Date();
  return checklist.items.filter(item => {
    if (!item.dueDate || item.completed) return false;
    return new Date(item.dueDate) < now;
  });
}

export function getUpcomingItems(checklist: ComplianceChecklist, days: number = 7): ComplianceChecklistItem[] {
  const now = new Date();
  const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
  
  return checklist.items.filter(item => {
    if (!item.dueDate || item.completed) return false;
    const dueDate = new Date(item.dueDate);
    return dueDate >= now && dueDate <= futureDate;
  });
}