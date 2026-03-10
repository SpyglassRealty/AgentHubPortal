/**
 * Create Test User Script
 * Creates initial admin and agent users for testing
 */

import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../middleware/auth.js';

const prisma = new PrismaClient();

async function createTestUsers() {
  try {
    console.log('🧪 Creating test users for authentication testing...');
    
    // Create admin user
    const adminPassword = await hashPassword('admin123');
    const admin = await prisma.user.upsert({
      where: { email: 'admin@spyglassrealty.com' },
      update: {},
      create: {
        email: 'admin@spyglassrealty.com',
        passwordHash: adminPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        phone: '512-555-0001',
        trecLicense: 'ADMIN001'
      }
    });
    
    console.log('✅ Admin user created:', admin.email);
    
    // Create test agent user
    const agentPassword = await hashPassword('agent123');
    const agent = await prisma.user.upsert({
      where: { email: 'agent@spyglassrealty.com' },
      update: {},
      create: {
        email: 'agent@spyglassrealty.com',
        passwordHash: agentPassword,
        firstName: 'Test',
        lastName: 'Agent',
        role: 'agent',
        phone: '512-555-0002',
        trecLicense: 'AGENT001'
      }
    });
    
    console.log('✅ Agent user created:', agent.email);
    
    console.log('🎉 Test users created successfully!');
    console.log('');
    console.log('📝 Login credentials:');
    console.log('Admin: admin@spyglassrealty.com / admin123');
    console.log('Agent: agent@spyglassrealty.com / agent123');
    console.log('');
    console.log('🧪 Test auth endpoints:');
    console.log('POST http://localhost:3000/api/auth/login');
    console.log('GET  http://localhost:3000/api/auth/me');
    console.log('POST http://localhost:3000/api/auth/logout');
    
  } catch (error) {
    console.error('❌ Failed to create test users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();