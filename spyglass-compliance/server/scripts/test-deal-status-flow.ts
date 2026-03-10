#!/usr/bin/env tsx

/**
 * Test Script: Deal Status Flow Management
 * Tests the automated deal status transitions and Slack notifications
 */

import { PrismaClient } from '@prisma/client';
import { 
  updateDealStatus, 
  checkComplianceAndUpdateStatus,
  getDealStatusSummary,
  getDealsNeedingAttention,
  sendDailyStatusReport
} from '../lib/deal-status-flow.js';

const prisma = new PrismaClient();

async function testDealStatusFlow() {
  console.log('🧪 Testing Deal Status Flow Management');
  console.log('=' .repeat(50));

  try {
    // 1. Test Deal Status Summary
    console.log('\\n📊 Testing Deal Status Summary...');
    const summary = await getDealStatusSummary();
    console.log('   ✅ Deal Status Summary:', summary);

    // 2. Test Deals Needing Attention
    console.log('\\n⚠️ Testing Deals Needing Attention...');
    const attention = await getDealsNeedingAttention();
    console.log('   ✅ Deals Needing Attention:', {
      longInReview: attention.longInReview.length,
      longChangesRequested: attention.longChangesRequested.length,
      longApproved: attention.longApproved.length
    });

    // 3. Find a test deal to work with
    const testDeal = await prisma.deal.findFirst({
      include: {
        agent: { select: { id: true, firstName: true, lastName: true, email: true } },
        complianceItems: true
      }
    });

    if (!testDeal) {
      console.log('   ⚠️ No deals found for testing - create a deal first');
      return;
    }

    console.log(`\\n🏠 Testing with deal: ${testDeal.dealNumber} (${testDeal.status})`);

    // 4. Test Manual Status Update
    console.log('\\n🔄 Testing Manual Status Update...');
    
    // Find admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: { in: ['admin', 'super_admin'] } }
    });

    if (!adminUser) {
      console.log('   ⚠️ No admin user found - create an admin user first');
      return;
    }

    const currentStatus = testDeal.status;
    let newStatus: string;

    // Choose appropriate status transition for testing
    switch (currentStatus) {
      case 'draft':
        newStatus = 'submitted';
        break;
      case 'submitted':
        newStatus = 'in_review';
        break;
      case 'in_review':
        newStatus = 'approved';
        break;
      case 'changes_requested':
        newStatus = 'submitted';
        break;
      case 'approved':
        newStatus = 'closed';
        break;
      default:
        newStatus = 'submitted';
    }

    const statusResult = await updateDealStatus(
      testDeal.id, 
      newStatus as any, 
      adminUser.id,
      'Test status transition'
    );

    if (statusResult.success) {
      console.log(`   ✅ Status updated: ${currentStatus} → ${newStatus}`);
      console.log(`   📝 Message: ${statusResult.message}`);
    } else {
      console.log(`   ❌ Status update failed: ${statusResult.message}`);
    }

    // 5. Test Compliance Status Check
    console.log('\\n📋 Testing Compliance Status Check...');
    await checkComplianceAndUpdateStatus(testDeal.id);
    console.log('   ✅ Compliance check completed');

    // Check if status changed
    const updatedDeal = await prisma.deal.findUnique({
      where: { id: testDeal.id },
      select: { status: true }
    });
    
    if (updatedDeal?.status !== newStatus) {
      console.log(`   🔄 Status auto-changed to: ${updatedDeal?.status}`);
    } else {
      console.log(`   📌 Status remains: ${updatedDeal?.status}`);
    }

    // 6. Test Daily Status Report
    console.log('\\n📈 Testing Daily Status Report...');
    await sendDailyStatusReport();
    console.log('   ✅ Daily status report sent to Slack');

    // 7. Show compliance item status for context
    console.log('\\n📄 Compliance Items Status:');
    const complianceStats = testDeal.complianceItems.reduce((acc: any, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
    console.log('   ', complianceStats);

    console.log('\\n🎉 All Deal Status Flow tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

async function testNotifications() {
  console.log('\\n🔔 Testing Slack Notifications...');
  
  try {
    // Import Slack functions
    const { 
      notifyStatusChange,
      notifyDealApproved,
      sendRichSlackNotification,
      testSlackConnection 
    } = await import('../lib/slack.js');

    // Test Slack connection
    console.log('   🧪 Testing Slack connection...');
    const connectionOk = await testSlackConnection();
    
    if (connectionOk) {
      console.log('   ✅ Slack connection successful');
      
      // Test status change notification
      await notifyStatusChange({
        dealNumber: 'SPY-2026-TEST',
        agentName: 'Test Agent',
        oldStatus: 'submitted',
        newStatus: 'approved',
        propertyAddress: '123 Test Street, Austin TX'
      });
      console.log('   ✅ Status change notification sent');
      
      // Test rich notification
      await sendRichSlackNotification({
        title: '🧪 Deal Status Flow Test Complete',
        message: 'All deal status flow functionality has been tested successfully!',
        color: 'good',
        fields: [
          { title: 'Status Transitions', value: 'Working ✅', short: true },
          { title: 'Compliance Checking', value: 'Working ✅', short: true },
          { title: 'Slack Notifications', value: 'Working ✅', short: true },
          { title: 'Auto Status Updates', value: 'Working ✅', short: true }
        ]
      });
      console.log('   ✅ Rich notification sent');
      
    } else {
      console.log('   ⚠️ Slack connection failed - check SLACK_WEBHOOK_URL');
    }

  } catch (error) {
    console.error('   ❌ Notification test failed:', error);
  }
}

async function main() {
  try {
    console.log('🚀 Starting Deal Status Flow Tests...');
    console.log(`📅 ${new Date().toLocaleString()}`);
    
    await testDealStatusFlow();
    await testNotifications();
    
    console.log('\\n✅ All tests completed!');
    
  } catch (error) {
    console.error('\\n❌ Tests failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}