/**
 * User Management Routes
 * Admin CRUD operations for agent accounts
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../index.js';
import { 
  requireAuth,
  requireAdmin,
  requireSuperAdmin,
  hashPassword,
  sanitizeUser,
  isValidEmail,
  isValidPassword
} from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * GET /api/users
 * List all users (admin only)
 */
router.get('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { 
      role, 
      search, 
      active,
      limit = '50',
      offset = '0'
    } = req.query;

    // Build filter conditions
    const where: any = {};
    
    if (role && typeof role === 'string') {
      where.role = role;
    }
    
    if (active !== undefined) {
      where.isActive = active === 'true';
    }
    
    if (search && typeof search === 'string') {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { trecLicense: { contains: search, mode: 'insensitive' } }
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: [
        { isActive: 'desc' },
        { createdAt: 'desc' }
      ],
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    const total = await prisma.user.count({ where });

    // Remove password hashes from response
    const sanitizedUsers = users.map(sanitizeUser);

    res.json({
      success: true,
      users: sanitizedUsers,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: total > parseInt(offset as string) + parseInt(limit as string)
      }
    });

  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({
      error: 'Failed to list users',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * GET /api/users/:id
 * Get specific user details (admin only)
 */
router.get('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        deals: {
          select: {
            id: true,
            dealNumber: true,
            propertyAddress: true,
            dealType: true,
            status: true,
            createdAt: true
          },
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            deals: true,
            documents: true,
            cdas: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }

    res.json({
      success: true,
      user: {
        ...sanitizeUser(user),
        recentDeals: user.deals,
        stats: {
          totalDeals: user._count.deals,
          totalDocuments: user._count.documents,
          totalCDAs: user._count.cdas
        }
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * POST /api/users
 * Create new user (admin only)
 */
router.post('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      role = 'agent',
      phone,
      trecLicense,
      slackUserId
    } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email, password, first name, and last name are required'
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please enter a valid email address'
      });
    }

    // Validate password
    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'Invalid password',
        message: passwordValidation.message
      });
    }

    // Validate role
    if (!['agent', 'admin', 'super_admin'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: 'Role must be agent, admin, or super_admin'
      });
    }

    // Only super admins can create other admins
    if ((role === 'admin' || role === 'super_admin') && req.user?.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'Only super admins can create admin accounts'
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'User exists',
        message: 'A user with this email already exists'
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        id: uuidv4(),
        email: email.toLowerCase(),
        passwordHash,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
        phone: phone?.trim() || null,
        trecLicense: trecLicense?.trim() || null,
        slackUserId: slackUserId?.trim() || null
      }
    });

    // Log user creation
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'user_created',
        details: {
          createdUserId: newUser.id,
          createdUserEmail: newUser.email,
          createdUserRole: newUser.role,
          timestamp: new Date().toISOString()
        }
      }
    });

    console.log(`✅ User created: ${newUser.email} (${newUser.role}) by ${req.user?.email}`);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: sanitizeUser(newUser)
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      error: 'Failed to create user',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * PUT /api/users/:id
 * Update user (admin only)
 */
router.put('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      email,
      firstName,
      lastName,
      role,
      phone,
      trecLicense,
      slackUserId,
      isActive
    } = req.body;

    // Get existing user
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }

    // Build update data
    const updateData: any = {};

    if (email && email !== existingUser.email) {
      if (!isValidEmail(email)) {
        return res.status(400).json({
          error: 'Invalid email',
          message: 'Please enter a valid email address'
        });
      }

      // Check if email is already taken
      const emailExists = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (emailExists && emailExists.id !== id) {
        return res.status(409).json({
          error: 'Email taken',
          message: 'A user with this email already exists'
        });
      }

      updateData.email = email.toLowerCase();
    }

    if (firstName !== undefined) {
      updateData.firstName = firstName.trim();
    }

    if (lastName !== undefined) {
      updateData.lastName = lastName.trim();
    }

    if (phone !== undefined) {
      updateData.phone = phone?.trim() || null;
    }

    if (trecLicense !== undefined) {
      updateData.trecLicense = trecLicense?.trim() || null;
    }

    if (slackUserId !== undefined) {
      updateData.slackUserId = slackUserId?.trim() || null;
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    // Handle role changes
    if (role && role !== existingUser.role) {
      if (!['agent', 'admin', 'super_admin'].includes(role)) {
        return res.status(400).json({
          error: 'Invalid role',
          message: 'Role must be agent, admin, or super_admin'
        });
      }

      // Only super admins can change roles to/from admin
      if ((role === 'admin' || role === 'super_admin' || 
           existingUser.role === 'admin' || existingUser.role === 'super_admin') 
          && req.user?.role !== 'super_admin') {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'Only super admins can modify admin roles'
        });
      }

      updateData.role = role;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData
    });

    // Log user update
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'user_updated',
        details: {
          updatedUserId: updatedUser.id,
          updatedUserEmail: updatedUser.email,
          changes: updateData,
          timestamp: new Date().toISOString()
        }
      }
    });

    console.log(`✅ User updated: ${updatedUser.email} by ${req.user?.email}`);

    res.json({
      success: true,
      message: 'User updated successfully',
      user: sanitizeUser(updatedUser)
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: 'Failed to update user',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * DELETE /api/users/:id
 * Deactivate user (admin only) - soft delete
 */
router.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get existing user
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }

    // Prevent self-deletion
    if (id === req.user?.id) {
      return res.status(400).json({
        error: 'Cannot delete self',
        message: 'You cannot deactivate your own account'
      });
    }

    // Only super admins can deactivate other admins
    if ((existingUser.role === 'admin' || existingUser.role === 'super_admin') 
        && req.user?.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'Only super admins can deactivate admin accounts'
      });
    }

    // Soft delete by setting isActive to false
    const deactivatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: false }
    });

    // Log user deactivation
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'user_deactivated',
        details: {
          deactivatedUserId: deactivatedUser.id,
          deactivatedUserEmail: deactivatedUser.email,
          timestamp: new Date().toISOString()
        }
      }
    });

    console.log(`✅ User deactivated: ${deactivatedUser.email} by ${req.user?.email}`);

    res.json({
      success: true,
      message: 'User deactivated successfully',
      user: sanitizeUser(deactivatedUser)
    });

  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      error: 'Failed to deactivate user',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * POST /api/users/:id/reactivate
 * Reactivate deactivated user (super admin only)
 */
router.post('/:id/reactivate', requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }

    if (user.isActive) {
      return res.status(400).json({
        error: 'User already active',
        message: 'This user is already active'
      });
    }

    const reactivatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: true }
    });

    // Log user reactivation
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'user_reactivated',
        details: {
          reactivatedUserId: reactivatedUser.id,
          reactivatedUserEmail: reactivatedUser.email,
          timestamp: new Date().toISOString()
        }
      }
    });

    console.log(`✅ User reactivated: ${reactivatedUser.email} by ${req.user?.email}`);

    res.json({
      success: true,
      message: 'User reactivated successfully',
      user: sanitizeUser(reactivatedUser)
    });

  } catch (error) {
    console.error('Reactivate user error:', error);
    res.status(500).json({
      error: 'Failed to reactivate user',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * POST /api/users/:id/reset-password
 * Reset user password (admin only)
 */
router.post('/:id/reset-password', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        error: 'Missing password',
        message: 'New password is required'
      });
    }

    // Validate new password
    const passwordValidation = isValidPassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'Invalid password',
        message: passwordValidation.message
      });
    }

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id },
      data: { passwordHash }
    });

    // Log password reset
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'password_reset',
        details: {
          targetUserId: user.id,
          targetUserEmail: user.email,
          timestamp: new Date().toISOString()
        }
      }
    });

    console.log(`✅ Password reset for: ${user.email} by ${req.user?.email}`);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      error: 'Failed to reset password',
      message: 'An unexpected error occurred'
    });
  }
});

export default router;