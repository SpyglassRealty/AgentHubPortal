/**
 * Authentication Routes
 * Login, logout, and user session management
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../index.js';
import { 
  hashPassword, 
  verifyPassword, 
  requireAuth,
  sanitizeUser,
  isValidEmail,
  isValidPassword,
  checkLoginRateLimit,
  recordLoginAttempt
} from '../middleware/auth.js';

const router = Router();

// Session types are defined in ../types/session.d.ts

/**
 * POST /api/auth/login
 * Authenticate user with email and password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }
    
    if (!isValidEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please enter a valid email address'
      });
    }
    
    // Check rate limiting
    const rateLimitCheck = checkLoginRateLimit(email);
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        error: 'Rate limited',
        message: rateLimitCheck.message
      });
    }
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { 
        email: email.toLowerCase(),
        isActive: true
      }
    });
    
    if (!user) {
      recordLoginAttempt(email, false);
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    
    if (!isValidPassword) {
      recordLoginAttempt(email, false);
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }
    
    // Create session
    req.session.userId = user.id;
    recordLoginAttempt(email, true);
    
    // Log successful login
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'login',
        details: {
          email: user.email,
          timestamp: new Date().toISOString(),
          userAgent: req.get('User-Agent'),
          ip: req.ip
        }
      }
    });
    
    console.log(`✅ User logged in: ${user.email} (${user.role})`);
    
    res.json({
      success: true,
      message: 'Login successful',
      user: sanitizeUser(user)
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * POST /api/auth/logout
 * End user session
 */
router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    
    // Log logout
    if (userId) {
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'logout',
          details: {
            timestamp: new Date().toISOString(),
            userAgent: req.get('User-Agent'),
            ip: req.ip
          }
        }
      });
    }
    
    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
        return res.status(500).json({
          error: 'Logout failed',
          message: 'Failed to end session'
        });
      }
      
      console.log(`✅ User logged out: ${userId}`);
      
      res.json({
        success: true,
        message: 'Logout successful'
      });
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Not authenticated',
        message: 'No active session found'
      });
    }
    
    const user = await prisma.user.findUnique({
      where: { 
        id: userId,
        isActive: true
      }
    });
    
    if (!user) {
      // User was deleted or deactivated
      req.session.destroy(() => {});
      return res.status(401).json({
        error: 'User not found',
        message: 'Account may have been deactivated'
      });
    }
    
    res.json({
      success: true,
      user: sanitizeUser(user)
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
 * POST /api/auth/change-password
 * Change user password (authenticated users only)
 */
router.post('/change-password', requireAuth, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.session.userId;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Missing passwords',
        message: 'Current password and new password are required'
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
    
    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId! }
    });
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'Account not found'
      });
    }
    
    // Verify current password
    const isCurrentValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return res.status(401).json({
        error: 'Invalid password',
        message: 'Current password is incorrect'
      });
    }
    
    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);
    
    // Update password
    await prisma.user.update({
      where: { id: userId! },
      data: { passwordHash: newPasswordHash }
    });
    
    // Log password change
    await prisma.auditLog.create({
      data: {
        userId: userId!,
        action: 'password_change',
        details: {
          timestamp: new Date().toISOString(),
          userAgent: req.get('User-Agent'),
          ip: req.ip
        }
      }
    });
    
    console.log(`✅ Password changed for user: ${user.email}`);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Password change failed',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * GET /api/auth/check
 * Quick authentication check (no user data)
 */
router.get('/check', (req: Request, res: Response) => {
  const isAuthenticated = !!req.session?.userId;
  
  res.json({
    authenticated: isAuthenticated,
    timestamp: new Date().toISOString()
  });
});

export default router;