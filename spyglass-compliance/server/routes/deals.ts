/**
 * Deal Management Routes
 * CRUD operations for real estate transactions with auto-compliance generation
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../index.js';
import { 
  requireAuth,
  requireAdmin,
  requireOwnershipOrAdmin,
  sanitizeUser
} from '../middleware/auth.js';
import { generateDealNumber } from '../lib/deal-number-generator.js';
import { generateComplianceItems } from '../lib/compliance-templates.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * GET /api/deals
 * List deals (agents see only their deals, admins see all)
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      status,
      dealType,
      search,
      agentId,
      limit = '50',
      offset = '0',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter conditions
    const where: any = {};

    // Agents can only see their own deals, admins see all
    if (req.user?.role === 'agent') {
      where.agentId = req.user.id;
    } else if (agentId && typeof agentId === 'string') {
      where.agentId = agentId;
    }

    if (status && typeof status === 'string') {
      where.status = status;
    }

    if (dealType && typeof dealType === 'string') {
      where.dealType = dealType;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { dealNumber: { contains: search, mode: 'insensitive' } },
        { propertyAddress: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { buyerName: { contains: search, mode: 'insensitive' } },
        { sellerName: { contains: search, mode: 'insensitive' } },
        { mlsNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Validate sort options
    const validSortFields = ['createdAt', 'updatedAt', 'dealNumber', 'propertyAddress', 'status', 'closingDate'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy as string : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 'asc' : 'desc';

    const deals = await prisma.deal.findMany({
      where,
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
        },
        _count: {
          select: {
            complianceItems: true,
            documents: true
          }
        }
      },
      orderBy: { [sortField]: sortDirection },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    const total = await prisma.deal.count({ where });

    res.json({
      success: true,
      deals,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: total > parseInt(offset as string) + parseInt(limit as string)
      }
    });

  } catch (error) {
    console.error('List deals error:', error);
    res.status(500).json({
      error: 'Failed to list deals',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * GET /api/deals/:id
 * Get specific deal details with compliance items
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deal = await prisma.deal.findUnique({
      where: { id },
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
        },
        complianceItems: {
          include: {
            documents: {
              select: {
                id: true,
                filename: true,
                fileSize: true,
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
            { label: 'asc' }
          ]
        },
        cda: true,
        auditLogs: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    if (!deal) {
      return res.status(404).json({
        error: 'Deal not found',
        message: 'The requested deal does not exist'
      });
    }

    // Check ownership (agents can only see their own deals)
    if (req.user?.role === 'agent' && deal.agentId !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only access your own deals'
      });
    }

    res.json({
      success: true,
      deal
    });

  } catch (error) {
    console.error('Get deal error:', error);
    res.status(500).json({
      error: 'Failed to get deal',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * POST /api/deals
 * Create new deal with auto-generated compliance items
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      dealType,
      propertyAddress,
      city,
      state = 'TX',
      zip,
      mlsNumber,
      listPrice,
      salePrice,
      leasePrice,
      commissionPct,
      referralFeePct,
      referralSource,
      leadSource,
      closingDate,
      contractDate,
      optionExpiryDate,
      earnestMoney,
      optionFee,
      titleCompany,
      lenderName,
      buyerName,
      sellerName,
      tenantName,
      jointlyDealUrl,
      notes
    } = req.body;

    // Validate required fields
    if (!dealType || !propertyAddress || !city || !zip) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Deal type, property address, city, and zip are required'
      });
    }

    // Validate deal type
    if (!['listing', 'buyer_rep', 'lease'].includes(dealType)) {
      return res.status(400).json({
        error: 'Invalid deal type',
        message: 'Deal type must be listing, buyer_rep, or lease'
      });
    }

    // For agents, set agentId to themselves; admins can specify agentId
    let agentId = req.user!.id;
    if (req.user?.role === 'admin' || req.user?.role === 'super_admin') {
      agentId = req.body.agentId || req.user!.id;
      
      // Verify agent exists if specified
      if (req.body.agentId) {
        const agent = await prisma.user.findUnique({
          where: { id: req.body.agentId, isActive: true }
        });
        
        if (!agent) {
          return res.status(400).json({
            error: 'Invalid agent',
            message: 'The specified agent does not exist or is inactive'
          });
        }
      }
    }

    // Generate deal number
    const dealNumber = await generateDealNumber();

    // Parse dates
    const parsedClosingDate = closingDate ? new Date(closingDate) : null;
    const parsedContractDate = contractDate ? new Date(contractDate) : null;
    const parsedOptionExpiryDate = optionExpiryDate ? new Date(optionExpiryDate) : null;

    // Create deal in transaction with compliance items
    const result = await prisma.$transaction(async (tx) => {
      // Create the deal
      const newDeal = await tx.deal.create({
        data: {
          id: uuidv4(),
          dealNumber,
          dealType,
          agentId,
          propertyAddress: propertyAddress.trim(),
          city: city.trim(),
          state,
          zip: zip.trim(),
          mlsNumber: mlsNumber?.trim() || null,
          listPrice: listPrice ? parseFloat(listPrice) : null,
          salePrice: salePrice ? parseFloat(salePrice) : null,
          leasePrice: leasePrice ? parseFloat(leasePrice) : null,
          commissionPct: commissionPct ? parseFloat(commissionPct) : null,
          referralFeePct: referralFeePct ? parseFloat(referralFeePct) : null,
          referralSource: referralSource?.trim() || null,
          leadSource: leadSource || null,
          closingDate: parsedClosingDate,
          contractDate: parsedContractDate,
          optionExpiryDate: parsedOptionExpiryDate,
          earnestMoney: earnestMoney ? parseFloat(earnestMoney) : null,
          optionFee: optionFee ? parseFloat(optionFee) : null,
          titleCompany: titleCompany?.trim() || null,
          lenderName: lenderName?.trim() || null,
          buyerName: buyerName?.trim() || null,
          sellerName: sellerName?.trim() || null,
          tenantName: tenantName?.trim() || null,
          jointlyDealUrl: jointlyDealUrl?.trim() || null,
          notes: notes?.trim() || null
        }
      });

      // Generate compliance items based on deal type
      const complianceTemplates = generateComplianceItems(dealType);
      
      const complianceItems = await Promise.all(
        complianceTemplates.map(template =>
          tx.complianceItem.create({
            data: {
              id: uuidv4(),
              dealId: newDeal.id,
              documentType: template.documentType,
              label: template.label,
              required: template.required
            }
          })
        )
      );

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: req.user!.id,
          dealId: newDeal.id,
          action: 'deal_created',
          details: {
            dealNumber: newDeal.dealNumber,
            dealType: newDeal.dealType,
            propertyAddress: newDeal.propertyAddress,
            complianceItemsGenerated: complianceItems.length,
            timestamp: new Date().toISOString()
          }
        }
      });

      return { deal: newDeal, complianceItems };
    });

    // Fetch the complete deal data
    const dealWithDetails = await prisma.deal.findUnique({
      where: { id: result.deal.id },
      include: {
        agent: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        complianceItems: true
      }
    });

    console.log(`✅ Deal created: ${result.deal.dealNumber} by ${req.user?.email} (${result.complianceItems.length} compliance items generated)`);

    res.status(201).json({
      success: true,
      message: 'Deal created successfully',
      deal: dealWithDetails,
      complianceItemsGenerated: result.complianceItems.length
    });

  } catch (error) {
    console.error('Create deal error:', error);
    res.status(500).json({
      error: 'Failed to create deal',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * PUT /api/deals/:id
 * Update deal (agents can only update their own deals)
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if deal exists and user has access
    const existingDeal = await prisma.deal.findUnique({
      where: { id }
    });

    if (!existingDeal) {
      return res.status(404).json({
        error: 'Deal not found',
        message: 'The requested deal does not exist'
      });
    }

    // Check ownership for agents
    if (req.user?.role === 'agent' && existingDeal.agentId !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only update your own deals'
      });
    }

    const updateData: any = {};
    const allowedFields = [
      'propertyAddress', 'city', 'state', 'zip', 'mlsNumber',
      'listPrice', 'salePrice', 'leasePrice', 'commissionPct',
      'referralFeePct', 'referralSource', 'leadSource',
      'closingDate', 'contractDate', 'optionExpiryDate',
      'earnestMoney', 'optionFee', 'titleCompany', 'lenderName',
      'buyerName', 'sellerName', 'tenantName', 'jointlyDealUrl', 'notes'
    ];

    // Build update data from allowed fields
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (['listPrice', 'salePrice', 'leasePrice', 'commissionPct', 'referralFeePct', 'earnestMoney', 'optionFee'].includes(field)) {
          updateData[field] = req.body[field] ? parseFloat(req.body[field]) : null;
        } else if (['closingDate', 'contractDate', 'optionExpiryDate'].includes(field)) {
          updateData[field] = req.body[field] ? new Date(req.body[field]) : null;
        } else if (typeof req.body[field] === 'string') {
          updateData[field] = req.body[field].trim() || null;
        } else {
          updateData[field] = req.body[field];
        }
      }
    });

    // Only admins can update status and agentId
    if (req.user?.role === 'admin' || req.user?.role === 'super_admin') {
      if (req.body.status) updateData.status = req.body.status;
      if (req.body.agentId) {
        // Verify new agent exists
        const agent = await prisma.user.findUnique({
          where: { id: req.body.agentId, isActive: true }
        });
        
        if (!agent) {
          return res.status(400).json({
            error: 'Invalid agent',
            message: 'The specified agent does not exist or is inactive'
          });
        }
        
        updateData.agentId = req.body.agentId;
      }
    }

    // Update deal
    const updatedDeal = await prisma.deal.update({
      where: { id },
      data: updateData,
      include: {
        agent: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        complianceItems: {
          select: {
            id: true,
            documentType: true,
            label: true,
            required: true,
            status: true
          }
        }
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        dealId: id,
        action: 'deal_updated',
        details: {
          dealNumber: updatedDeal.dealNumber,
          changes: updateData,
          timestamp: new Date().toISOString()
        }
      }
    });

    console.log(`✅ Deal updated: ${updatedDeal.dealNumber} by ${req.user?.email}`);

    res.json({
      success: true,
      message: 'Deal updated successfully',
      deal: updatedDeal
    });

  } catch (error) {
    console.error('Update deal error:', error);
    res.status(500).json({
      error: 'Failed to update deal',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * DELETE /api/deals/:id
 * Delete deal (admin only)
 */
router.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deal = await prisma.deal.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            documents: true,
            complianceItems: true
          }
        }
      }
    });

    if (!deal) {
      return res.status(404).json({
        error: 'Deal not found',
        message: 'The requested deal does not exist'
      });
    }

    // Delete in transaction
    await prisma.$transaction(async (tx) => {
      // Delete related records first
      await tx.document.deleteMany({ where: { dealId: id } });
      await tx.complianceItem.deleteMany({ where: { dealId: id } });
      await tx.cDA.deleteMany({ where: { dealId: id } });
      await tx.auditLog.deleteMany({ where: { dealId: id } });
      
      // Delete the deal
      await tx.deal.delete({ where: { id } });
    });

    console.log(`✅ Deal deleted: ${deal.dealNumber} by ${req.user?.email} (${deal._count.documents} documents, ${deal._count.complianceItems} compliance items)`);

    res.json({
      success: true,
      message: 'Deal deleted successfully'
    });

  } catch (error) {
    console.error('Delete deal error:', error);
    res.status(500).json({
      error: 'Failed to delete deal',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * GET /api/deals/stats/overview
 * Get deal statistics overview
 */
router.get('/stats/overview', requireAuth, async (req: Request, res: Response) => {
  try {
    // Build filter for agent vs admin
    const dealFilter: any = {};
    if (req.user?.role === 'agent') {
      dealFilter.agentId = req.user.id;
    }

    // Get basic counts
    const [
      totalDeals,
      activeDeals,
      closedDeals,
      pendingApproval
    ] = await Promise.all([
      prisma.deal.count({ where: dealFilter }),
      prisma.deal.count({ 
        where: { 
          ...dealFilter, 
          status: { in: ['submitted', 'in_review'] } 
        }
      }),
      prisma.deal.count({ 
        where: { ...dealFilter, status: 'closed' }
      }),
      prisma.deal.count({ 
        where: { ...dealFilter, status: 'submitted' }
      })
    ]);

    // Get deals by type
    const dealsByType = await prisma.deal.groupBy({
      by: ['dealType'],
      where: dealFilter,
      _count: true
    });

    // Get recent deals
    const recentDeals = await prisma.deal.findMany({
      where: dealFilter,
      include: {
        agent: {
          select: { firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    res.json({
      success: true,
      stats: {
        totalDeals,
        activeDeals,
        closedDeals,
        pendingApproval,
        dealsByType: dealsByType.reduce((acc, item) => {
          acc[item.dealType] = item._count;
          return acc;
        }, {} as Record<string, number>),
        recentDeals
      }
    });

  } catch (error) {
    console.error('Get deal stats error:', error);
    res.status(500).json({
      error: 'Failed to get deal statistics',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * POST /api/deals/:id/status
 * Update deal status with proper workflow validation
 */
router.post('/:id/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!status) {
      return res.status(400).json({
        error: 'Status required',
        message: 'New status must be provided'
      });
    }

    // Validate status value
    const validStatuses = ['draft', 'submitted', 'in_review', 'changes_requested', 'approved', 'closed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Import here to avoid circular dependency
    const { updateDealStatus } = await import('../lib/deal-status-flow.js');
    
    const result = await updateDealStatus(id, status, req.user!.id, reason);

    if (!result.success) {
      return res.status(400).json({
        error: 'Status update failed',
        message: result.message
      });
    }

    // Get updated deal data
    const updatedDeal = await prisma.deal.findUnique({
      where: { id },
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
        },
        complianceItems: {
          include: {
            documents: {
              select: {
                id: true,
                filename: true,
                fileSize: true,
                createdAt: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      message: result.message,
      deal: updatedDeal,
      previousStatus: result.previousStatus
    });

  } catch (error) {
    console.error('Update deal status error:', error);
    res.status(500).json({
      error: 'Failed to update deal status',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * GET /api/deals/status/summary
 * Get deal status summary statistics
 */
router.get('/status/summary', requireAuth, async (req: Request, res: Response) => {
  try {
    const { getDealStatusSummary } = await import('../lib/deal-status-flow.js');
    
    // Agents see only their deals, admins see all
    const agentId = req.user?.role === 'agent' ? req.user.id : undefined;
    const summary = await getDealStatusSummary(agentId);

    res.json({
      success: true,
      summary
    });

  } catch (error) {
    console.error('Get deal status summary error:', error);
    res.status(500).json({
      error: 'Failed to get deal status summary',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * GET /api/deals/status/attention
 * Get deals that need attention (admin only)
 */
router.get('/status/attention', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { getDealsNeedingAttention } = await import('../lib/deal-status-flow.js');
    
    const dealsNeedingAttention = await getDealsNeedingAttention();

    res.json({
      success: true,
      dealsNeedingAttention
    });

  } catch (error) {
    console.error('Get deals needing attention error:', error);
    res.status(500).json({
      error: 'Failed to get deals needing attention',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * POST /api/deals/status/daily-report
 * Send daily status report to Slack (admin only)
 */
router.post('/status/daily-report', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { sendDailyStatusReport } = await import('../lib/deal-status-flow.js');
    
    await sendDailyStatusReport();

    res.json({
      success: true,
      message: 'Daily status report sent to Slack'
    });

  } catch (error) {
    console.error('Send daily status report error:', error);
    res.status(500).json({
      error: 'Failed to send daily status report',
      message: 'An unexpected error occurred'
    });
  }
});

export default router;