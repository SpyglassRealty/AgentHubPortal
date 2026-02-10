import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { db } from './db';
import { users, passwordResetTokens } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

const SALT_ROUNDS = 12;
const RESET_TOKEN_EXPIRY_HOURS = 24;

// Hash password for storage
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Verify password against hash
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate secure reset token
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Create password reset token in database
export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = generateResetToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
  
  await db.insert(passwordResetTokens).values({
    userId,
    token,
    expiresAt,
  });
  
  return token;
}

// Verify password reset token
export async function verifyResetToken(token: string): Promise<{ userId: string } | null> {
  const tokenData = await db.query.passwordResetTokens.findFirst({
    where: and(
      eq(passwordResetTokens.token, token),
      eq(passwordResetTokens.used, false)
    ),
  });
  
  if (!tokenData) {
    return null;
  }
  
  if (new Date() > tokenData.expiresAt) {
    return null;
  }
  
  return { userId: tokenData.userId };
}

// Mark reset token as used
export async function markTokenAsUsed(token: string): Promise<void> {
  await db.update(passwordResetTokens)
    .set({ used: true })
    .where(eq(passwordResetTokens.token, token));
}

// Update user password
export async function updateUserPassword(userId: string, newPassword: string): Promise<void> {
  const hashedPassword = await hashPassword(newPassword);
  await db.update(users)
    .set({ password: hashedPassword })
    .where(eq(users.id, userId));
}

// Get user by email for login
export async function getUserByEmailForLogin(email: string) {
  return db.query.users.findFirst({
    where: eq(users.email, email),
  });
}

// Send password reset email
export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  try {
    // Load Gmail credentials
    const credentialsPath = path.join(process.cwd(), '../.credentials/gmail.json');
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    
    // Create transporter
    const transporter = nodemailer.createTransporter({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: credentials.email,
        pass: credentials.password,
      },
    });
    
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5000'}/reset-password?token=${token}`;
    
    const mailOptions = {
      from: credentials.email,
      to: email,
      subject: 'Mission Control - Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #EF4923; color: white; padding: 20px; text-align: center;">
            <h1>Mission Control</h1>
            <p>Password Reset Request</p>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>Reset Your Password</h2>
            <p>You requested a password reset for your Mission Control account. Click the button below to reset your password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: #EF4923; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            
            <p><strong>This link will expire in ${RESET_TOKEN_EXPIRY_HOURS} hours.</strong></p>
            
            <p>If you didn't request this password reset, you can safely ignore this email.</p>
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Spyglass Realty - Mission Control</p>
          </div>
        </div>
      `,
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`[Password Reset] Email sent to ${email}`);
  } catch (error) {
    console.error('[Password Reset] Failed to send email:', error);
    throw new Error('Failed to send password reset email');
  }
}

// Password validation
export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password) {
    return { valid: false, message: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  
  return { valid: true };
}