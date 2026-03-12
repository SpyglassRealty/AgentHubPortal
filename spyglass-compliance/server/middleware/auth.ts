/**
 * Authentication Middleware
 * Session-based auth with role guards
 */

import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../index.js';
import { User, Role } from '@prisma/client';

// Helper to properly cast user from request
function getTypedUser(reqUser: any): User {
  return reqUser as User;
}

// Types are defined in ../types/session.d.ts

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  trecLicense?: string;
  phone?: string;
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  return await bcrypt.hash(password, rounds);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Middleware to require authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    });
  }
  next();
}

/**
 * Middleware to require admin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    });
  }
  
  const user = getTypedUser(req.user);
  if (!req.user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return res.status(403).json({
      error: 'Insufficient permissions',
      message: 'Admin access required'
    });
  }
  
  next();
}

/**
 * Middleware to require super admin role
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    });
  }
  
  const user = getTypedUser(req.user);
  if (!req.user || user.role !== 'super_admin') {
    return res.status(403).json({
      error: 'Insufficient permissions',
      message: 'Super admin access required'
    });
  }
  
  next();
}

/**
 * Middleware to load user from session
 */
export async function loadUser(req: Request, res: Response, next: NextFunction) {
  if (req.session?.userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { 
          id: req.session.userId,
          isActive: true
        }
      });
      
      if (user) {
        req.user = user;
      } else {
        // User was deleted or deactivated, clear session
        req.session.destroy((err) => {
          if (err) console.error('Failed to destroy session:', err);
        });
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  }
  next();
}

/**
 * Check if user owns resource or is admin
 */
export function requireOwnershipOrAdmin(getUserId: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in to access this resource'
      });
    }
    
    // Admins can access everything
    const user = getTypedUser(req.user);
    if (user.role === 'admin' || user.role === 'super_admin') {
      return next();
    }
    
    // Check if user owns the resource
    const resourceUserId = getUserId(req);
    if (user.id !== resourceUserId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only access your own resources'
      });
    }
    
    next();
  };
}

/**
 * Sanitize user object for API responses (remove password hash)
 */
export function sanitizeUser(user: User): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    trecLicense: user.trecLicense || undefined,
    phone: user.phone || undefined
  };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/\d/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  
  return { valid: true };
}

/**
 * Rate limiting for login attempts
 */
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

export function checkLoginRateLimit(email: string): { allowed: boolean; message?: string } {
  const now = Date.now();
  const key = email.toLowerCase();
  const attempts = loginAttempts.get(key);
  
  // Clean up old attempts (older than 15 minutes)
  if (attempts && now - attempts.lastAttempt > 15 * 60 * 1000) {
    loginAttempts.delete(key);
    return { allowed: true };
  }
  
  // Check if too many attempts
  if (attempts && attempts.count >= 5) {
    const remainingTime = Math.ceil((attempts.lastAttempt + 15 * 60 * 1000 - now) / 60000);
    return { 
      allowed: false, 
      message: `Too many login attempts. Try again in ${remainingTime} minutes.` 
    };
  }
  
  return { allowed: true };
}

export function recordLoginAttempt(email: string, success: boolean) {
  const now = Date.now();
  const key = email.toLowerCase();
  
  if (success) {
    // Clear attempts on successful login
    loginAttempts.delete(key);
  } else {
    // Increment failed attempts
    const attempts = loginAttempts.get(key) || { count: 0, lastAttempt: 0 };
    loginAttempts.set(key, {
      count: attempts.count + 1,
      lastAttempt: now
    });
  }
}