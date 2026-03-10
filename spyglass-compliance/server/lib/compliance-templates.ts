/**
 * Compliance Checklist Templates
 * Auto-generate compliance items based on deal type
 */

export interface ComplianceTemplate {
  documentType: string;
  label: string;
  required: boolean;
}

/**
 * Generate compliance items for a deal based on deal type
 * @param dealType - Type of deal (listing, buyer_rep, lease)
 * @returns Array of compliance items to create
 */
export function generateComplianceItems(dealType: string): ComplianceTemplate[] {
  switch (dealType) {
    case 'listing':
      return getListingComplianceItems();
    case 'buyer_rep':
      return getBuyerRepComplianceItems();
    case 'lease':
      return getLeaseComplianceItems();
    default:
      throw new Error(`Unknown deal type: ${dealType}`);
  }
}

/**
 * Listing deal compliance items
 */
function getListingComplianceItems(): ComplianceTemplate[] {
  return [
    {
      documentType: 'listing_agreement',
      label: 'Listing Agreement',
      required: true
    },
    {
      documentType: 'seller_disclosure',
      label: 'Seller Disclosure',
      required: true
    },
    {
      documentType: 'commission_agreement',
      label: 'Commission Agreement',
      required: true
    },
    {
      documentType: 'mls_input_form',
      label: 'MLS Input Form',
      required: true
    },
    {
      documentType: 'purchase_contract',
      label: 'Purchase Contract',
      required: true
    },
    {
      documentType: 'addenda',
      label: 'Contract Addenda',
      required: true
    },
    {
      documentType: 'option_em_receipt',
      label: 'Option Period & Earnest Money Receipt',
      required: true
    },
    {
      documentType: 'title_order',
      label: 'Title Order',
      required: true
    },
    {
      documentType: 'hoa_addendum',
      label: 'HOA Addendum',
      required: false
    },
    {
      documentType: 'closing_disclosure',
      label: 'Closing Disclosure',
      required: true
    },
    {
      documentType: 'final_walkthrough',
      label: 'Final Walkthrough',
      required: true
    }
  ];
}

/**
 * Buyer representation deal compliance items
 */
function getBuyerRepComplianceItems(): ComplianceTemplate[] {
  return [
    {
      documentType: 'buyer_rep_agreement',
      label: 'Buyer Representation Agreement',
      required: true
    },
    {
      documentType: 'commission_agreement',
      label: 'Commission Agreement',
      required: true
    },
    {
      documentType: 'purchase_contract',
      label: 'Purchase Contract',
      required: true
    },
    {
      documentType: 'addenda',
      label: 'Contract Addenda',
      required: true
    },
    {
      documentType: 'financing_addendum',
      label: 'Financing Addendum',
      required: true
    },
    {
      documentType: 'option_em_receipt',
      label: 'Option Period & Earnest Money Receipt',
      required: true
    },
    {
      documentType: 'title_order',
      label: 'Title Order',
      required: true
    },
    {
      documentType: 'hoa_addendum',
      label: 'HOA Addendum',
      required: false
    },
    {
      documentType: 'closing_disclosure',
      label: 'Closing Disclosure',
      required: true
    },
    {
      documentType: 'final_walkthrough',
      label: 'Final Walkthrough',
      required: true
    }
  ];
}

/**
 * Lease deal compliance items
 */
function getLeaseComplianceItems(): ComplianceTemplate[] {
  return [
    {
      documentType: 'tenant_rep_agreement',
      label: 'Tenant Representation Agreement',
      required: true
    },
    {
      documentType: 'commission_agreement',
      label: 'Commission Agreement',
      required: true
    },
    {
      documentType: 'lease_agreement',
      label: 'Lease Agreement',
      required: true
    },
    {
      documentType: 'lease_addenda',
      label: 'Lease Addenda',
      required: false
    },
    {
      documentType: 'id_verification',
      label: 'ID Verification',
      required: true
    },
    {
      documentType: 'move_in_checklist',
      label: 'Move-In Checklist',
      required: false
    }
  ];
}

/**
 * Get all document types across all deal types for reference
 */
export function getAllDocumentTypes(): string[] {
  const allTemplates = [
    ...getListingComplianceItems(),
    ...getBuyerRepComplianceItems(),
    ...getLeaseComplianceItems()
  ];
  
  // Get unique document types
  const uniqueTypes = Array.from(new Set(allTemplates.map(t => t.documentType)));
  return uniqueTypes.sort();
}

/**
 * Get human-readable label for a document type
 */
export function getDocumentTypeLabel(documentType: string): string {
  const allTemplates = [
    ...getListingComplianceItems(),
    ...getBuyerRepComplianceItems(),
    ...getLeaseComplianceItems()
  ];
  
  const template = allTemplates.find(t => t.documentType === documentType);
  return template?.label || documentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}