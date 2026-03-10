/**
 * Document Management Routes
 * Upload, serve, and manage documents for deals
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../index.js';
import { 
  requireAuth,
  requireAdmin,
  requireOwnershipOrAdmin
} from '../middleware/auth.js';
import { 
  uploadSingle,
  uploadMultiple,
  handleUploadError,
  getFileInfo,
  deleteFile
} from '../middleware/upload.js';
import { extractTexasContractTerms } from '../lib/document-extractor.js';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /api/documents/upload/:dealId
 * Upload documents for a specific deal
 */
router.post('/upload/:dealId', requireAuth, uploadMultiple, handleUploadError, async (req: Request, res: Response) => {
  try {
    const { dealId } = req.params;
    const { complianceItemId, description, extractContract } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        error: 'No files provided',
        message: 'At least one file must be uploaded'
      });
    }

    // Verify deal exists and user has access
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        agent: {
          select: { id: true, email: true }
        }
      }
    });

    if (!deal) {
      // Clean up uploaded files if deal doesn't exist
      files.forEach(file => deleteFile(file.path));
      return res.status(404).json({
        error: 'Deal not found',
        message: 'The specified deal does not exist'
      });
    }

    // Check access (agents can only upload to their deals)
    if (req.user?.role === 'agent' && deal.agentId !== req.user.id) {
      files.forEach(file => deleteFile(file.path));
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only upload documents to your own deals'
      });
    }

    // Verify compliance item if specified
    let complianceItem = null;
    if (complianceItemId) {
      complianceItem = await prisma.complianceItem.findFirst({
        where: {
          id: complianceItemId,
          dealId: dealId
        }
      });

      if (!complianceItem) {
        files.forEach(file => deleteFile(file.path));
        return res.status(400).json({
          error: 'Invalid compliance item',
          message: 'The specified compliance item does not exist for this deal'
        });
      }
    }

    // Process files and create document records
    const documentPromises = files.map(async (file) => {
      const fileInfo = getFileInfo(file.path);
      
      const document = await prisma.document.create({
        data: {
          id: uuidv4(),
          dealId,
          complianceItemId: complianceItemId || null,
          uploadedById: req.user!.id,
          filename: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          mimeType: file.mimetype
        }
      });

      // Contract extraction for PDFs if requested
      let extractedData = null;
      if (extractContract === 'true' && file.mimetype === 'application/pdf') {
        try {
          const fileBuffer = fs.readFileSync(file.path);
          const base64Data = fileBuffer.toString('base64');
          extractedData = await extractTexasContractTerms(file.originalname, base64Data, deal.dealType);
          
          // Update document with extracted data
          await prisma.document.update({
            where: { id: document.id },
            data: {
              // Store extracted data in a JSON field (would need to add to schema)
              // For now, we'll log it and return it in response
            }
          });
        } catch (error) {
          console.error('Contract extraction failed:', error);
        }
      }

      return {
        ...document,
        fileInfo,
        extractedData
      };
    });

    const documents = await Promise.all(documentPromises);

    // Update compliance item status if specified
    if (complianceItem && complianceItem.status === 'pending') {
      await prisma.complianceItem.update({
        where: { id: complianceItemId },
        data: { status: 'uploaded' }
      });

      // Check compliance completion and update deal status accordingly
      const { checkComplianceAndUpdateStatus } = await import('../lib/deal-status-flow.js');
      await checkComplianceAndUpdateStatus(dealId);
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        dealId,
        action: 'documents_uploaded',
        details: {
          fileCount: files.length,
          fileNames: files.map(f => f.originalname),
          complianceItemId: complianceItemId || null,
          dealNumber: deal.dealNumber,
          timestamp: new Date().toISOString()
        }
      }
    });

    console.log(`✅ Documents uploaded: ${files.length} files for deal ${deal.dealNumber} by ${req.user?.email}`);

    res.status(201).json({
      success: true,
      message: `${files.length} document(s) uploaded successfully`,
      documents: documents.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        createdAt: doc.createdAt,
        extractedData: doc.extractedData
      }))
    });

  } catch (error) {
    console.error('Document upload error:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      const files = req.files as Express.Multer.File[];
      files.forEach(file => deleteFile(file.path));
    }
    
    res.status(500).json({
      error: 'Upload failed',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * GET /api/documents/deal/:dealId
 * List documents for a specific deal
 */
router.get('/deal/:dealId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { dealId } = req.params;

    // Verify deal exists and user has access
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      select: {
        id: true,
        dealNumber: true,
        agentId: true
      }
    });

    if (!deal) {
      return res.status(404).json({
        error: 'Deal not found',
        message: 'The specified deal does not exist'
      });
    }

    // Check access
    if (req.user?.role === 'agent' && deal.agentId !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only view documents for your own deals'
      });
    }

    const documents = await prisma.document.findMany({
      where: { dealId },
      include: {
        uploadedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        complianceItem: {
          select: {
            id: true,
            documentType: true,
            label: true,
            required: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Add file info for each document
    const documentsWithInfo = documents.map(doc => {
      const fileInfo = getFileInfo(doc.filePath);
      return {
        ...doc,
        fileInfo,
        // Don't expose full file path for security
        filePath: undefined
      };
    });

    res.json({
      success: true,
      dealNumber: deal.dealNumber,
      documents: documentsWithInfo
    });

  } catch (error) {
    console.error('List documents error:', error);
    res.status(500).json({
      error: 'Failed to list documents',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * GET /api/documents/:id/download
 * Download a specific document
 */
router.get('/:id/download', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        deal: {
          select: {
            id: true,
            dealNumber: true,
            agentId: true
          }
        }
      }
    });

    if (!document) {
      return res.status(404).json({
        error: 'Document not found',
        message: 'The specified document does not exist'
      });
    }

    // Check access
    if (req.user?.role === 'agent' && document.deal.agentId !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only download documents from your own deals'
      });
    }

    // Check if file exists
    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({
        error: 'File not found',
        message: 'The document file is missing from storage'
      });
    }

    // Create audit log for download
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        dealId: document.deal.id,
        action: 'document_downloaded',
        details: {
          documentId: document.id,
          filename: document.filename,
          dealNumber: document.deal.dealNumber,
          timestamp: new Date().toISOString()
        }
      }
    });

    console.log(`📥 Document downloaded: ${document.filename} from deal ${document.deal.dealNumber} by ${req.user?.email}`);

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Length', document.fileSize.toString());

    // Stream file to client
    const fileStream = fs.createReadStream(document.filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Document download error:', error);
    res.status(500).json({
      error: 'Download failed',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * DELETE /api/documents/:id
 * Delete a document
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        deal: {
          select: {
            id: true,
            dealNumber: true,
            agentId: true
          }
        },
        complianceItem: {
          select: {
            id: true,
            documentType: true,
            label: true
          }
        }
      }
    });

    if (!document) {
      return res.status(404).json({
        error: 'Document not found',
        message: 'The specified document does not exist'
      });
    }

    // Check access (agents can only delete from their deals, admins can delete any)
    if (req.user?.role === 'agent' && document.deal.agentId !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only delete documents from your own deals'
      });
    }

    // Delete file from disk
    if (fs.existsSync(document.filePath)) {
      deleteFile(document.filePath);
    }

    // Delete document record
    await prisma.document.delete({
      where: { id }
    });

    // Update compliance item status if this was the only document
    if (document.complianceItemId) {
      const remainingDocs = await prisma.document.count({
        where: { complianceItemId: document.complianceItemId }
      });

      if (remainingDocs === 0) {
        await prisma.complianceItem.update({
          where: { id: document.complianceItemId },
          data: { status: 'pending' }
        });
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        dealId: document.deal.id,
        action: 'document_deleted',
        details: {
          documentId: document.id,
          filename: document.filename,
          dealNumber: document.deal.dealNumber,
          timestamp: new Date().toISOString()
        }
      }
    });

    console.log(`🗑️ Document deleted: ${document.filename} from deal ${document.deal.dealNumber} by ${req.user?.email}`);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Document delete error:', error);
    res.status(500).json({
      error: 'Failed to delete document',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * POST /api/documents/scan
 * Scan document for contract terms (standalone endpoint)
 */
router.post('/scan', requireAuth, uploadSingle, handleUploadError, async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const { transactionType } = req.body;

    if (!file) {
      return res.status(400).json({
        error: 'No file provided',
        message: 'A document file must be uploaded for scanning'
      });
    }

    if (file.mimetype !== 'application/pdf') {
      deleteFile(file.path);
      return res.status(400).json({
        error: 'Invalid file type',
        message: 'Only PDF files can be scanned for contract terms'
      });
    }

    try {
      // Extract contract terms
      const fileBuffer = fs.readFileSync(file.path);
      const base64Data = fileBuffer.toString('base64');
      const extractedTerms = await extractTexasContractTerms(file.originalname, base64Data, transactionType);

      // Clean up temp file
      deleteFile(file.path);

      console.log(`🔍 Contract scanned: ${file.originalname} by ${req.user?.email}`);

      res.json({
        success: true,
        message: 'Contract terms extracted successfully',
        fileName: file.originalname,
        extractedTerms
      });

    } catch (extractError) {
      deleteFile(file.path);
      console.error('Contract extraction failed:', extractError);
      
      res.status(400).json({
        error: 'Extraction failed',
        message: 'Failed to extract terms from the contract. The file may be corrupted or not a valid Texas residential contract.'
      });
    }

  } catch (error) {
    console.error('Document scan error:', error);
    
    if (req.file) {
      deleteFile(req.file.path);
    }
    
    res.status(500).json({
      error: 'Scan failed',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * GET /api/documents/stats
 * Get document statistics
 */
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const dealFilter: any = {};
    if (req.user?.role === 'agent') {
      dealFilter.agentId = req.user.id;
    }

    const [
      totalDocuments,
      documentsByType,
      recentUploads,
      storageUsed
    ] = await Promise.all([
      prisma.document.count({
        where: dealFilter.agentId ? { deal: dealFilter } : {}
      }),
      
      prisma.document.groupBy({
        by: ['mimeType'],
        where: dealFilter.agentId ? { deal: dealFilter } : {},
        _count: true,
        _sum: { fileSize: true }
      }),
      
      prisma.document.findMany({
        where: dealFilter.agentId ? { deal: dealFilter } : {},
        include: {
          deal: {
            select: { dealNumber: true, propertyAddress: true }
          },
          uploadedBy: {
            select: { firstName: true, lastName: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      
      prisma.document.aggregate({
        where: dealFilter.agentId ? { deal: dealFilter } : {},
        _sum: { fileSize: true }
      })
    ]);

    res.json({
      success: true,
      stats: {
        totalDocuments,
        storageUsed: storageUsed._sum.fileSize || 0,
        documentsByType: documentsByType.reduce((acc, item) => {
          const type = item.mimeType.split('/')[1] || 'other';
          acc[type] = {
            count: item._count,
            totalSize: item._sum.fileSize || 0
          };
          return acc;
        }, {} as Record<string, any>),
        recentUploads
      }
    });

  } catch (error) {
    console.error('Document stats error:', error);
    res.status(500).json({
      error: 'Failed to get document statistics',
      message: 'An unexpected error occurred'
    });
  }
});

export default router;