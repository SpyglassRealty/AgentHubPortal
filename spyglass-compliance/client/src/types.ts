export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'agent' | 'admin' | 'super_admin'
  phone?: string
  trecLicense?: string
  isActive: boolean
}

export interface Deal {
  id: string
  dealNumber: string
  dealType: 'listing' | 'buyer_rep' | 'lease'
  status: 'draft' | 'submitted' | 'in_review' | 'changes_requested' | 'approved' | 'closed' | 'cancelled'
  propertyAddress: string
  city: string
  state: string
  zip: string
  mlsNumber?: string
  listPrice?: number
  salePrice?: number
  leasePrice?: number
  closingDate?: string
  buyerName?: string
  sellerName?: string
  tenantName?: string
  notes?: string
  createdAt: string
  updatedAt: string
  agent?: User
}

export interface ComplianceItem {
  id: string
  dealId: string
  documentType: string
  label: string
  required: boolean
  status: 'pending' | 'uploaded' | 'approved' | 'rejected' | 'waived'
  rejectionReason?: string
  reviewedAt?: string
  documents?: Array<{
    id: string
    filename: string
    fileSize: number
    createdAt: string
  }>
}