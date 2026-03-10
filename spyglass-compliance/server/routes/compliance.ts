/**
 * Compliance Review Routes
 * Admin review, approval, rejection, and waiver of compliance items
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../index.js';
import { 
  requireAuth,
  requireAdmin,
  sanitizeUser
} from '../middleware/auth.js';
import { 
  notifyChangesRequested,
  notifyDealApproved,
  sendSlackNotification 
} from '../lib/slack.js';

const router = Router();

/**
 * GET /api/compliance/pending
 * Get all pending compliance items for admin review
 */
router.get('/pending', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      dealId,
      agentId,
      documentType,
      status = 'uploaded',
      limit = '50',
      offset = '0'
    } = req.query;

    // Build filter conditions
    const where: any = {};

    if (dealId && typeof dealId === 'string') {
      where.dealId = dealId;
    }

    if (documentType && typeof documentType === 'string') {
      where.documentType = documentType;
    }

    if (status && typeof status === 'string') {
      where.status = status;
    }

    // Filter by agent if specified
    if (agentId && typeof agentId === 'string') {
      where.deal = {
        agentId: agentId
      };
    }

    const complianceItems = await prisma.complianceItem.findMany({
      where,
      include: {
        deal: {
          include: {
            agent: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                trecLicense: true
              }
            }
          }
        },
        documents: {
          select: {
            id: true,
            filename: true,
            fileSize: true,
            mimeType: true,
            createdAt: true
          }
        },
        reviewedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: [
        { required: 'desc' },
        { deal: { createdAt: 'desc' } }
      ],
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    const total = await prisma.complianceItem.count({ where });

    res.json({
      success: true,
      complianceItems,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: total > parseInt(offset as string) + parseInt(limit as string)
      }
    });

  } catch (error) {
    console.error('Get pending compliance error:', error);
    res.status(500).json({
      error: 'Failed to get pending compliance items',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * POST /api/compliance/:id/approve
 * Approve a compliance item
 */
router.post('/:id/approve', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const complianceItem = await prisma.complianceItem.findUnique({
      where: { id },
      include: {
        deal: {
          include: {
            agent: {
              select: { firstName: true, lastName: true, email: true }
            }
          }
        }
      }
    });

    if (!complianceItem) {
      return res.status(404).json({
        error: 'Compliance item not found',
        message: 'The specified compliance item does not exist'
      });
    }

    if (complianceItem.status === 'approved') {
      return res.status(400).json({
        error: 'Already approved',
        message: 'This compliance item is already approved'
      });
    }

    // Update compliance item
    const updatedItem = await prisma.complianceItem.update({
      where: { id },
      data: {
        status: 'approved',
        reviewedById: req.user!.id,
        reviewedAt: new Date(),
        rejectionReason: null
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        dealId: complianceItem.dealId,
        action: 'compliance_approved',
        details: {
          complianceItemId: id,
          documentType: complianceItem.documentType,
          label: complianceItem.label,
          dealNumber: complianceItem.deal.dealNumber,
          agentEmail: complianceItem.deal.agent?.email,
          notes: notes || null,
          timestamp: new Date().toISOString()
        }
      }
    });

    // Check compliance completion and update status accordingly
    const { checkComplianceAndUpdateStatus } = await import('../lib/deal-status-flow.js');
    await checkComplianceAndUpdateStatus(complianceItem.dealId);

    console.log(`✅ Compliance approved: ${complianceItem.label} for deal ${complianceItem.deal.dealNumber} by ${req.user?.email}`);

    res.json({
      success: true,
      message: 'Compliance item approved successfully',
      complianceItem: updatedItem
    });

  } catch (error) {
    console.error('Approve compliance error:', error);
    res.status(500).json({
      error: 'Failed to approve compliance item',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * POST /api/compliance/:id/reject
 * Reject a compliance item with reason
 */
router.post('/:id/reject', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, notes } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        error: 'Rejection reason required',
        message: 'A reason must be provided when rejecting compliance items'
      });
    }

    const complianceItem = await prisma.complianceItem.findUnique({
      where: { id },
      include: {
        deal: {
          include: {
            agent: {
              select: { firstName: true, lastName: true, email: true }
            }
          }
        }
      }
    });

    if (!complianceItem) {
      return res.status(404).json({
        error: 'Compliance item not found',
        message: 'The specified compliance item does not exist'
      });
    }

    // Update compliance item
    const updatedItem = await prisma.complianceItem.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason: reason.trim(),
        reviewedById: req.user!.id,
        reviewedAt: new Date()
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        dealId: complianceItem.dealId,
        action: 'compliance_rejected',
        details: {
          complianceItemId: id,
          documentType: complianceItem.documentType,
          label: complianceItem.label,
          dealNumber: complianceItem.deal.dealNumber,
          agentEmail: complianceItem.deal.agent?.email,
          rejectionReason: reason.trim(),
          notes: notes || null,
          timestamp: new Date().toISOString()
        }
      }
    });

    // Check compliance completion and update status accordingly
    const { checkComplianceAndUpdateStatus } = await import('../lib/deal-status-flow.js');
    await checkComplianceAndUpdateStatus(complianceItem.dealId);

    console.log(`❌ Compliance rejected: ${complianceItem.label} for deal ${complianceItem.deal.dealNumber} by ${req.user?.email}`);
    console.log(`   Reason: ${reason.trim()}`);

    res.json({
      success: true,
      message: 'Compliance item rejected successfully',
      complianceItem: updatedItem
    });

  } catch (error) {
    console.error('Reject compliance error:', error);
    res.status(500).json({
      error: 'Failed to reject compliance item',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * POST /api/compliance/:id/waive
 * Waive a compliance item (mark as not required)
 */
router.post('/:id/waive', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, notes } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        error: 'Waiver reason required',
        message: 'A reason must be provided when waiving compliance items'
      });
    }

    const complianceItem = await prisma.complianceItem.findUnique({
      where: { id },
      include: {
        deal: {
          include: {
            agent: {
              select: { firstName: true, lastName: true, email: true }
            }
          }
        }
      }
    });

    if (!complianceItem) {
      return res.status(404).json({
        error: 'Compliance item not found',
        message: 'The specified compliance item does not exist'
      });
    }

    if (!complianceItem.required) {
      return res.status(400).json({
        error: 'Cannot waive optional item',
        message: 'Only required compliance items can be waived'
      });
    }

    // Update compliance item
    const updatedItem = await prisma.complianceItem.update({
      where: { id },
      data: {
        status: 'waived',
        rejectionReason: reason.trim(),
        reviewedById: req.user!.id,
        reviewedAt: new Date()
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        dealId: complianceItem.dealId,
        action: 'compliance_waived',
        details: {
          complianceItemId: id,
          documentType: complianceItem.documentType,
          label: complianceItem.label,
          dealNumber: complianceItem.deal.dealNumber,
          agentEmail: complianceItem.deal.agent?.email,
          waiverReason: reason.trim(),
          notes: notes || null,
          timestamp: new Date().toISOString()
        }
      }
    });

    // Check compliance completion and update status accordingly
    const { checkComplianceAndUpdateStatus } = await import('../lib/deal-status-flow.js');
    await checkComplianceAndUpdateStatus(complianceItem.dealId);

    console.log(`⚠️ Compliance waived: ${complianceItem.label} for deal ${complianceItem.deal.dealNumber} by ${req.user?.email}`);
    console.log(`   Reason: ${reason.trim()}`);

    res.json({
      success: true,
      message: 'Compliance item waived successfully',
      complianceItem: updatedItem
    });

  } catch (error) {
    console.error('Waive compliance error:', error);
    res.status(500).json({
      error: 'Failed to waive compliance item',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * POST /api/compliance/:id/reset
 * Reset a compliance item back to pending (admin only)
 */
router.post('/:id/reset', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const complianceItem = await prisma.complianceItem.findUnique({
      where: { id },
      include: {
        deal: {
          include: {
            agent: {
              select: { firstName: true, lastName: true, email: true }
            }
          }
        }
      }
    });

    if (!complianceItem) {
      return res.status(404).json({
        error: 'Compliance item not found',
        message: 'The specified compliance item does not exist'
      });
    }

    // Determine new status based on whether documents exist
    const documentCount = await prisma.document.count({
      where: { complianceItemId: id }
    });

    const newStatus = documentCount > 0 ? 'uploaded' : 'pending';

    // Update compliance item
    const updatedItem = await prisma.complianceItem.update({
      where: { id },
      data: {
        status: newStatus,
        rejectionReason: null,
        reviewedById: null,
        reviewedAt: null
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        dealId: complianceItem.dealId,
        action: 'compliance_reset',
        details: {
          complianceItemId: id,
          documentType: complianceItem.documentType,
          label: complianceItem.label,
          dealNumber: complianceItem.deal.dealNumber,
          previousStatus: complianceItem.status,
          newStatus,
          notes: notes || null,
          timestamp: new Date().toISOString()
        }
      }
    });

    console.log(`🔄 Compliance reset: ${complianceItem.label} for deal ${complianceItem.deal.dealNumber} by ${req.user?.email}`);

    res.json({
      success: true,
      message: 'Compliance item reset successfully',
      complianceItem: updatedItem
    });

  } catch (error) {
    console.error('Reset compliance error:', error);
    res.status(500).json({
      error: 'Failed to reset compliance item',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * GET /api/compliance/dashboard
 * Get compliance dashboard statistics for admins
 */
router.get('/dashboard', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const [
      totalItems,
      pendingItems,
      uploadedItems,
      approvedItems,
      rejectedItems,
      waivedItems,
      itemsByType,
      recentActivity
    ] = await Promise.all([
      // Total compliance items
      prisma.complianceItem.count(),
      
      // Pending items (no documents uploaded)
      prisma.complianceItem.count({
        where: { status: 'pending' }
      }),
      
      // Uploaded items (waiting for review)
      prisma.complianceItem.count({
        where: { status: 'uploaded' }
      }),
      
      // Approved items
      prisma.complianceItem.count({
        where: { status: 'approved' }
      }),
      
      // Rejected items
      prisma.complianceItem.count({
        where: { status: 'rejected' }
      }),
      
      // Waived items
      prisma.complianceItem.count({
        where: { status: 'waived' }
      }),
      
      // Items by document type
      prisma.complianceItem.groupBy({
        by: ['documentType', 'status'],
        _count: true
      }),
      
      // Recent activity
      prisma.auditLog.findMany({
        where: {
          action: {
            in: ['compliance_approved', 'compliance_rejected', 'compliance_waived', 'compliance_reset']
          }
        },
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      })
    ]);

    // Get deals needing attention
    const dealsNeedingAttention = await prisma.deal.findMany({
      where: {
        status: { in: ['submitted', 'changes_requested'] }
      },
      include: {
        agent: {
          select: { firstName: true, lastName: true, email: true }
        },
        complianceItems: {
          where: {
            status: { in: ['uploaded', 'rejected'] }
          }
        }
      },
      orderBy: { createdAt: 'asc' },
      take: 10
    });

    // Process items by type for dashboard
    const complianceByType: Record<string, Record<string, number>> = {};
    itemsByType.forEach(item => {
      if (!complianceByType[item.documentType]) {
        complianceByType[item.documentType] = {};
      }
      complianceByType[item.documentType][item.status] = item._count;
    });

    res.json({
      success: true,
      stats: {
        totalItems,
        pendingItems,
        uploadedItems,
        approvedItems,
        rejectedItems,
        waivedItems,
        complianceByType,
        dealsNeedingAttention: dealsNeedingAttention.length,
        avgApprovalTime: null // Could calculate if needed
      },
      dealsNeedingAttention,
      recentActivity
    });

  } catch (error) {
    console.error('Compliance dashboard error:', error);
    res.status(500).json({
      error: 'Failed to get compliance dashboard',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * GET /api/compliance/agents
 * Get compliance statistics by agent (admin only)
 */
router.get('/agents', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const agents = await prisma.user.findMany({
      where: {
        role: 'agent',
        isActive: true
      },
      include: {
        deals: {
          include: {
            complianceItems: true
          }
        }
      }
    });

    const agentStats = agents.map(agent => {
      const totalItems = agent.deals.reduce((sum, deal) => sum + deal.complianceItems.length, 0);
      const approvedItems = agent.deals.reduce((sum, deal) => 
        sum + deal.complianceItems.filter(item => item.status === 'approved').length, 0
      );
      const pendingItems = agent.deals.reduce((sum, deal) => 
        sum + deal.complianceItems.filter(item => item.status === 'pending').length, 0
      );
      const rejectedItems = agent.deals.reduce((sum, deal) => 
        sum + deal.complianceItems.filter(item => item.status === 'rejected').length, 0
      );

      return {
        agent: sanitizeUser(agent),
        stats: {
          totalDeals: agent.deals.length,
          totalItems,
          approvedItems,
          pendingItems,
          rejectedItems,
          completionRate: totalItems > 0 ? Math.round((approvedItems / totalItems) * 100) : 0
        }
      };
    });

    // Sort by completion rate (lowest first - needs attention)
    agentStats.sort((a, b) => a.stats.completionRate - b.stats.completionRate);

    res.json({
      success: true,
      agentStats
    });

  } catch (error) {
    console.error('Agent compliance stats error:', error);
    res.status(500).json({
      error: 'Failed to get agent compliance statistics',
      message: 'An unexpected error occurred'
    });
  }
});

export default router;