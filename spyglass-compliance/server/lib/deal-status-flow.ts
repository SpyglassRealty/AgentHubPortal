/**
 * Deal Status Flow Management
 * Handles automated status transitions and notifications for compliance workflow
 */

import { prisma } from '../index.js';
import { 
  notifyStatusChange,
  notifyDealApproved,
  notifyChangesRequested,
  sendRichSlackNotification
} from './slack.js';

export type DealStatus = 'draft' | 'submitted' | 'in_review' | 'changes_requested' | 'approved' | 'closed' | 'cancelled';
export type ComplianceStatus = 'pending' | 'uploaded' | 'approved' | 'rejected' | 'waived';

export interface StatusTransition {
  dealId: string;
  fromStatus: DealStatus;
  toStatus: DealStatus;
  triggeredBy: 'user' | 'system' | 'compliance';
  userId?: string;
  reason?: string;
}

/**
 * Check if status transition is valid according to business rules
 */
export function isValidStatusTransition(from: DealStatus, to: DealStatus, userRole?: string): boolean {
  const transitions: Record<DealStatus, DealStatus[]> = {
    'draft': ['submitted', 'cancelled'],
    'submitted': ['in_review', 'changes_requested', 'cancelled'],
    'in_review': ['approved', 'changes_requested', 'cancelled'],
    'changes_requested': ['submitted', 'cancelled'],
    'approved': ['closed', 'cancelled'],
    'closed': [], // Terminal state
    'cancelled': [] // Terminal state
  };

  // Admin/super_admin can make any valid transition
  if (userRole === 'admin' || userRole === 'super_admin') {
    return transitions[from]?.includes(to) || false;
  }

  // Agents can only submit deals and resubmit after changes requested
  if (userRole === 'agent') {
    if (from === 'draft' && to === 'submitted') return true;
    if (from === 'changes_requested' && to === 'submitted') return true;
    return false;
  }

  return transitions[from]?.includes(to) || false;
}

/**
 * Update deal status with proper validation and notifications
 */
export async function updateDealStatus(
  dealId: string,
  newStatus: DealStatus,
  userId: string,
  reason?: string
): Promise<{ success: boolean; message: string; previousStatus?: DealStatus }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        agent: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!deal) {
      return { success: false, message: 'Deal not found' };
    }

    // Check if transition is valid
    if (!isValidStatusTransition(deal.status as DealStatus, newStatus, user.role)) {
      return { 
        success: false, 
        message: `Invalid status transition from ${deal.status} to ${newStatus}` 
      };
    }

    // Update deal status
    const updatedDeal = await prisma.deal.update({
      where: { id: dealId },
      data: { 
        status: newStatus,
        updatedAt: new Date()
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        dealId,
        userId,
        action: 'status_changed',
        details: {
          fromStatus: deal.status,
          toStatus: newStatus,
          reason: reason || null,
          triggeredBy: 'user'
        }
      }
    });

    // Send notifications
    const agentName = `${deal.agent.firstName} ${deal.agent.lastName}`;
    
    // General status change notification
    await notifyStatusChange({
      dealNumber: deal.dealNumber,
      agentName,
      oldStatus: deal.status,
      newStatus,
      propertyAddress: deal.propertyAddress
    });

    // Specific status notifications
    switch (newStatus) {
      case 'approved':
        await notifyDealApproved({
          dealNumber: deal.dealNumber,
          propertyAddress: deal.propertyAddress,
          closingDate: deal.closingDate
        });
        break;
        
      case 'changes_requested':
        await notifyChangesRequested({
          dealNumber: deal.dealNumber,
          agentName
        });
        break;
        
      case 'closed':
        await sendRichSlackNotification({
          title: '🏁 Deal Closed',
          message: `${deal.dealNumber} — ${deal.propertyAddress} has been closed successfully!`,
          color: 'good',
          fields: [
            { title: 'Agent', value: agentName, short: true },
            { title: 'Property', value: deal.propertyAddress, short: true },
            { title: 'Sale Price', value: deal.salePrice ? `$${deal.salePrice.toLocaleString()}` : 'N/A', short: true },
            { title: 'Closing Date', value: deal.closingDate?.toLocaleDateString() || 'N/A', short: true }
          ]
        });
        break;
    }

    return { 
      success: true, 
      message: `Deal status updated to ${newStatus}`, 
      previousStatus: deal.status as DealStatus 
    };

  } catch (error) {
    console.error('Error updating deal status:', error);
    return { success: false, message: 'Failed to update deal status' };
  }
}

/**
 * Check compliance completion and auto-transition deal status
 */
export async function checkComplianceAndUpdateStatus(dealId: string): Promise<void> {
  try {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        complianceItems: true,
        agent: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!deal) {
      console.error(`Deal ${dealId} not found`);
      return;
    }

    const requiredItems = deal.complianceItems.filter(item => item.required);
    const completedItems = requiredItems.filter(item => 
      item.status === 'approved' || item.status === 'waived'
    );
    const rejectedItems = deal.complianceItems.filter(item => item.status === 'rejected');

    // Auto-transition based on compliance status
    if (deal.status === 'submitted' && requiredItems.length > 0) {
      // Move to in_review when documents start being uploaded
      const uploadedItems = deal.complianceItems.filter(item => item.status === 'uploaded');
      if (uploadedItems.length > 0 && deal.status === 'submitted') {
        await updateDealStatus(dealId, 'in_review', 'system', 'Documents uploaded - moved to review');
      }
    }

    if (deal.status === 'in_review') {
      // Check if all required items are complete
      if (completedItems.length === requiredItems.length && requiredItems.length > 0) {
        await updateDealStatus(dealId, 'approved', 'system', 'All compliance items completed');
        return;
      }

      // Check if any items were rejected
      if (rejectedItems.length > 0) {
        await updateDealStatus(dealId, 'changes_requested', 'system', 'Compliance items rejected');
        return;
      }
    }

    // If deal was in changes_requested and all issues resolved, move back to in_review
    if (deal.status === 'changes_requested' && rejectedItems.length === 0) {
      const hasUploaded = deal.complianceItems.some(item => item.status === 'uploaded');
      if (hasUploaded) {
        await updateDealStatus(dealId, 'in_review', 'system', 'Issues resolved - returned to review');
      }
    }

  } catch (error) {
    console.error('Error checking compliance and updating status:', error);
  }
}

/**
 * Get deal status summary for dashboard
 */
export async function getDealStatusSummary(agentId?: string) {
  try {
    const whereClause = agentId ? { agentId } : {};

    const [
      totalDeals,
      draftDeals,
      submittedDeals,
      inReviewDeals,
      changesRequestedDeals,
      approvedDeals,
      closedDeals,
      cancelledDeals
    ] = await Promise.all([
      prisma.deal.count({ where: whereClause }),
      prisma.deal.count({ where: { ...whereClause, status: 'draft' } }),
      prisma.deal.count({ where: { ...whereClause, status: 'submitted' } }),
      prisma.deal.count({ where: { ...whereClause, status: 'in_review' } }),
      prisma.deal.count({ where: { ...whereClause, status: 'changes_requested' } }),
      prisma.deal.count({ where: { ...whereClause, status: 'approved' } }),
      prisma.deal.count({ where: { ...whereClause, status: 'closed' } }),
      prisma.deal.count({ where: { ...whereClause, status: 'cancelled' } })
    ]);

    return {
      total: totalDeals,
      draft: draftDeals,
      submitted: submittedDeals,
      inReview: inReviewDeals,
      changesRequested: changesRequestedDeals,
      approved: approvedDeals,
      closed: closedDeals,
      cancelled: cancelledDeals
    };

  } catch (error) {
    console.error('Error getting deal status summary:', error);
    throw error;
  }
}

/**
 * Get deals that need attention (stuck in certain statuses for too long)
 */
export async function getDealsNeedingAttention(agentId?: string) {
  try {
    const daysAgo = (days: number) => {
      const date = new Date();
      date.setDate(date.getDate() - days);
      return date;
    };

    const whereClause = agentId ? { agentId } : {};

    const [
      longInReview,
      longChangesRequested,
      longApproved
    ] = await Promise.all([
      // Deals in review for more than 3 days
      prisma.deal.findMany({
        where: {
          ...whereClause,
          status: 'in_review',
          updatedAt: { lt: daysAgo(3) }
        },
        include: {
          agent: {
            select: { firstName: true, lastName: true, email: true }
          },
          _count: {
            select: { complianceItems: { where: { status: 'uploaded' } } }
          }
        },
        orderBy: { updatedAt: 'asc' }
      }),
      
      // Deals with changes requested for more than 2 days
      prisma.deal.findMany({
        where: {
          ...whereClause,
          status: 'changes_requested',
          updatedAt: { lt: daysAgo(2) }
        },
        include: {
          agent: {
            select: { firstName: true, lastName: true, email: true }
          },
          _count: {
            select: { complianceItems: { where: { status: 'rejected' } } }
          }
        },
        orderBy: { updatedAt: 'asc' }
      }),
      
      // Approved deals not closed within 30 days of closing date
      prisma.deal.findMany({
        where: {
          ...whereClause,
          status: 'approved',
          closingDate: { lt: daysAgo(30) }
        },
        include: {
          agent: {
            select: { firstName: true, lastName: true, email: true }
          }
        },
        orderBy: { closingDate: 'asc' }
      })
    ]);

    return {
      longInReview: longInReview.map(deal => ({
        ...deal,
        daysInStatus: Math.floor((Date.now() - deal.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
        reason: 'In review for over 3 days'
      })),
      longChangesRequested: longChangesRequested.map(deal => ({
        ...deal,
        daysInStatus: Math.floor((Date.now() - deal.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
        reason: 'Changes requested for over 2 days'
      })),
      longApproved: longApproved.map(deal => ({
        ...deal,
        daysOverdue: Math.floor((Date.now() - deal.closingDate!.getTime()) / (1000 * 60 * 60 * 24)),
        reason: 'Approved but past closing date'
      }))
    };

  } catch (error) {
    console.error('Error getting deals needing attention:', error);
    throw error;
  }
}

/**
 * Send daily status report to Slack
 */
export async function sendDailyStatusReport(): Promise<void> {
  try {
    const summary = await getDealStatusSummary();
    const attention = await getDealsNeedingAttention();
    
    const totalAttention = attention.longInReview.length + attention.longChangesRequested.length + attention.longApproved.length;

    const fields = [
      { title: 'Total Active Deals', value: String(summary.total - summary.closed - summary.cancelled), short: true },
      { title: 'In Review', value: String(summary.inReview), short: true },
      { title: 'Changes Requested', value: String(summary.changesRequested), short: true },
      { title: 'Approved', value: String(summary.approved), short: true },
      { title: 'Needs Attention', value: String(totalAttention), short: true },
      { title: 'Closed This Period', value: String(summary.closed), short: true }
    ];

    await sendRichSlackNotification({
      title: '📊 Daily Deal Status Report',
      message: 'Current pipeline status and deals needing attention',
      color: totalAttention > 5 ? 'warning' : 'good',
      fields
    });

    // Send attention alerts if needed
    if (totalAttention > 0) {
      let attentionMessage = '⚠️ Deals needing attention:\\n';
      
      attention.longInReview.forEach(deal => {
        attentionMessage += `• ${deal.dealNumber} - In review ${deal.daysInStatus} days\\n`;
      });
      
      attention.longChangesRequested.forEach(deal => {
        attentionMessage += `• ${deal.dealNumber} - Changes requested ${deal.daysInStatus} days\\n`;
      });
      
      attention.longApproved.forEach(deal => {
        attentionMessage += `• ${deal.dealNumber} - ${deal.daysOverdue} days past closing\\n`;
      });

      await sendRichSlackNotification({
        title: '🚨 Deals Needing Immediate Attention',
        message: attentionMessage,
        color: 'warning'
      });
    }

  } catch (error) {
    console.error('Error sending daily status report:', error);
  }
}