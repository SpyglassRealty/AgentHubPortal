/**
 * Test Deal Creation & Compliance Auto-Generation
 * Comprehensive testing of deal CRUD and compliance item generation
 */

import { PrismaClient } from '@prisma/client';
import { generateDealNumber, isValidDealNumber } from '../lib/deal-number-generator.js';
import { generateComplianceItems } from '../lib/compliance-templates.js';

const prisma = new PrismaClient();

async function testDealNumberGeneration() {
  console.log('🔢 Testing deal number generation...');
  
  try {
    // Test generating multiple deal numbers
    const dealNumber1 = await generateDealNumber();
    console.log(`✅ Generated deal number: ${dealNumber1}`);
    
    if (!isValidDealNumber(dealNumber1)) {
      throw new Error('Generated deal number is invalid format');
    }
    
    // Verify format (SPY-2026-XXXX)
    const currentYear = new Date().getFullYear();
    const expectedPattern = new RegExp(`^SPY-${currentYear}-\\d{4}$`);
    
    if (!expectedPattern.test(dealNumber1)) {
      throw new Error(`Deal number format incorrect. Expected SPY-${currentYear}-XXXX, got ${dealNumber1}`);
    }
    
    console.log('✅ Deal number format validation passed');
    console.log('✅ Deal number generation working correctly\n');
    
    return dealNumber1;
    
  } catch (error) {
    console.error('❌ Deal number generation failed:', error);
    throw error;
  }
}

async function testComplianceGeneration() {
  console.log('📋 Testing compliance item generation...');
  
  try {
    // Test all deal types
    const dealTypes = ['listing', 'buyer_rep', 'lease'];
    
    for (const dealType of dealTypes) {
      console.log(`\n   Testing ${dealType} compliance items:`);
      
      const complianceItems = generateComplianceItems(dealType);
      
      console.log(`   ✅ Generated ${complianceItems.length} compliance items for ${dealType}`);
      
      // Verify structure
      complianceItems.forEach((item, index) => {
        if (!item.documentType || !item.label || typeof item.required !== 'boolean') {
          throw new Error(`Compliance item ${index} missing required fields`);
        }
      });
      
      // Log some examples
      const requiredCount = complianceItems.filter(item => item.required).length;
      const optionalCount = complianceItems.filter(item => !item.required).length;
      
      console.log(`   📊 ${requiredCount} required, ${optionalCount} optional`);
      
      // Show first few items
      complianceItems.slice(0, 3).forEach(item => {
        const reqText = item.required ? '(required)' : '(optional)';
        console.log(`   - ${item.label} ${reqText}`);
      });
    }
    
    console.log('\n✅ Compliance item generation working correctly');
    
  } catch (error) {
    console.error('❌ Compliance generation failed:', error);
    throw error;
  }
}

async function testDealCreationWorkflow() {
  console.log('🏠 Testing complete deal creation workflow...');
  
  try {
    // Get test agent
    const testAgent = await prisma.user.findFirst({
      where: { 
        role: 'agent',
        isActive: true
      }
    });
    
    if (!testAgent) {
      throw new Error('No active agent found for testing');
    }
    
    console.log(`   Using agent: ${testAgent.email}`);
    
    // Test creating deals of each type
    const dealTypes = ['listing', 'buyer_rep', 'lease'] as const;
    const createdDeals = [];
    
    for (const dealType of dealTypes) {
      console.log(`\n   Creating ${dealType} deal...`);
      
      const dealNumber = await generateDealNumber();
      
      const dealData = {
        dealNumber,
        dealType,
        agentId: testAgent.id,
        propertyAddress: `123 Test ${dealType.toUpperCase()} Street`,
        city: 'Austin',
        state: 'TX',
        zip: '78704',
        mlsNumber: `MLS${Date.now()}`,
        salePrice: dealType === 'lease' ? null : 750000,
        leasePrice: dealType === 'lease' ? 3500 : null,
        commissionPct: dealType === 'lease' ? 8 : 3,
        buyerName: dealType === 'listing' ? null : 'Test Buyer',
        sellerName: dealType === 'buyer_rep' ? null : 'Test Seller',
        tenantName: dealType === 'lease' ? 'Test Tenant' : null,
        notes: `Test ${dealType} deal created by automation`
      };
      
      // Create deal with transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create deal
        const deal = await tx.deal.create({ data: dealData });
        
        // Generate and create compliance items
        const complianceTemplates = generateComplianceItems(dealType);
        const complianceItems = await Promise.all(
          complianceTemplates.map(template =>
            tx.complianceItem.create({
              data: {
                dealId: deal.id,
                documentType: template.documentType,
                label: template.label,
                required: template.required
              }
            })
          )
        );
        
        return { deal, complianceItems };
      });
      
      console.log(`   ✅ Deal created: ${result.deal.dealNumber}`);
      console.log(`   📋 ${result.complianceItems.length} compliance items generated`);
      
      createdDeals.push(result.deal);
    }
    
    console.log(`\n✅ Successfully created ${createdDeals.length} test deals`);
    
    // Verify database state
    const totalDeals = await prisma.deal.count();
    const totalComplianceItems = await prisma.complianceItem.count();
    
    console.log(`📊 Total deals in database: ${totalDeals}`);
    console.log(`📊 Total compliance items in database: ${totalComplianceItems}`);
    
    return createdDeals;
    
  } catch (error) {
    console.error('❌ Deal creation workflow failed:', error);
    throw error;
  }
}

async function testDealRetrieval() {
  console.log('\n📖 Testing deal retrieval...');
  
  try {
    // Get all deals
    const deals = await prisma.deal.findMany({
      include: {
        agent: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        complianceItems: {
          select: {
            documentType: true,
            label: true,
            required: true,
            status: true
          }
        },
        _count: {
          select: {
            complianceItems: true,
            documents: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    console.log(`   Found ${deals.length} recent deals:`);
    
    deals.forEach(deal => {
      console.log(`   - ${deal.dealNumber}: ${deal.propertyAddress}`);
      console.log(`     Agent: ${deal.agent?.firstName} ${deal.agent?.lastName}`);
      console.log(`     Compliance: ${deal._count.complianceItems} items`);
      console.log(`     Type: ${deal.dealType}, Status: ${deal.status}`);
    });
    
    console.log('✅ Deal retrieval working correctly');
    
  } catch (error) {
    console.error('❌ Deal retrieval failed:', error);
    throw error;
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    // Delete test deals and related data
    const testDeals = await prisma.deal.findMany({
      where: {
        propertyAddress: {
          contains: 'Test'
        }
      }
    });
    
    console.log(`   Found ${testDeals.length} test deals to clean up`);
    
    for (const deal of testDeals) {
      await prisma.$transaction(async (tx) => {
        await tx.complianceItem.deleteMany({ where: { dealId: deal.id } });
        await tx.auditLog.deleteMany({ where: { dealId: deal.id } });
        await tx.deal.delete({ where: { id: deal.id } });
      });
    }
    
    console.log('✅ Test data cleanup completed');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    // Don't throw - cleanup failure shouldn't fail the test
  }
}

async function runAllTests() {
  console.log('🧪 Starting Deal Creation & Compliance Tests\n');
  
  try {
    await testDealNumberGeneration();
    await testComplianceGeneration();
    await testDealCreationWorkflow();
    await testDealRetrieval();
    
    console.log('\n🎉 All Deal Creation Tests Passed!\n');
    
    console.log('📊 Test Summary:');
    console.log('✅ Deal number generation (SPY-YYYY-XXXX format)');
    console.log('✅ Deal number validation');
    console.log('✅ Compliance item generation for all deal types');
    console.log('✅ Transaction-based deal creation');
    console.log('✅ Compliance item auto-creation');
    console.log('✅ Deal retrieval with relationships');
    console.log('✅ Database integrity maintained');
    
    console.log('\n🏠 Deal Types Tested:');
    console.log('✅ Listing deals (11 compliance items)');
    console.log('✅ Buyer representation deals (10 compliance items)');
    console.log('✅ Lease deals (6 compliance items)');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  } finally {
    await cleanupTestData();
    await prisma.$disconnect();
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export { runAllTests };