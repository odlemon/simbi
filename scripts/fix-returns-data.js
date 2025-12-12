// @ts-nocheck
const { PrismaClient, DisputeStatus } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixReturnsData() {
  try {
    console.log('🔍 Finding returns that need fixing...\n');

    // Find returns that:
    // 1. Have been inspected (inspectionCompletedAt is set) but status is still UNDER_REVIEW
    // 2. Don't have logistics cost set (returnLogisticsCost is 0 or null)
    const returnsToFix = await prisma.dispute.findMany({
      where: {
        requestType: {
          in: ['RETURN', 'EXCHANGE'],
        },
        OR: [
          {
            inspectionCompletedAt: { not: null },
            status: 'UNDER_REVIEW',
          },
          {
            OR: [
              { returnLogisticsCost: null },
              { returnLogisticsCost: 0 },
            ],
            faultClassification: { not: null },
          },
        ],
      },
      include: {
        order: {
          select: {
            orderNumber: true,
          },
        },
      },
    });

    console.log(`📋 Found ${returnsToFix.length} return(s) to fix:\n`);

    if (returnsToFix.length === 0) {
      console.log('✅ No returns need fixing. All data is correct!');
      return;
    }

    let fixed = 0;
    let skipped = 0;

    for (const returnRequest of returnsToFix) {
      console.log(`\n📦 Processing Return ID: ${returnRequest.id}`);
      console.log(`   Order: ${returnRequest.order?.orderNumber || 'N/A'}`);
      console.log(`   Current Status: ${returnRequest.status}`);
      console.log(`   Fault Classification: ${returnRequest.faultClassification || 'N/A'}`);
      console.log(`   Logistics Cost: ${returnRequest.returnLogisticsCost || 0}`);
      console.log(`   Inspection Completed: ${returnRequest.inspectionCompletedAt ? 'Yes' : 'No'}`);

      // Determine what needs to be fixed
      const updates = {};

      // Fix 1: Set logistics cost if missing
      if (!returnRequest.returnLogisticsCost || returnRequest.returnLogisticsCost === 0) {
        updates.returnLogisticsCost = 15.0; // Default return shipping cost
        console.log('   ✅ Will set logistics cost to $15.00');
      }

      // Fix 2: Update status if inspection is completed but status is still UNDER_REVIEW
      if (returnRequest.inspectionCompletedAt && returnRequest.status === 'UNDER_REVIEW') {
        if (returnRequest.faultClassification === 'SELLER_FAULT') {
          updates.status = DisputeStatus.RESOLVED_BUYER_FAVOR;
          console.log('   ✅ Will set status to RESOLVED_BUYER_FAVOR (seller fault)');
        } else if (
          returnRequest.faultClassification === 'BUYER_FAULT' ||
          returnRequest.faultClassification === 'NO_FAULT' ||
          returnRequest.faultClassification === 'LOGISTICS_FAULT'
        ) {
          updates.status = DisputeStatus.CLOSED_NO_FAULT;
          console.log('   ✅ Will set status to CLOSED_NO_FAULT');
        }
      }

      // Fix 3: Set resolutionDate if inspection is completed but resolutionDate is missing
      if (returnRequest.inspectionCompletedAt && !returnRequest.resolutionDate) {
        updates.resolutionDate = returnRequest.inspectionCompletedAt;
        console.log('   ✅ Will set resolutionDate timestamp');
      }

      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        try {
          await prisma.dispute.update({
            where: { id: returnRequest.id },
            data: updates,
          });
          fixed++;
          console.log(`   ✅ Successfully updated return ${returnRequest.id}`);
        } catch (error) {
          console.error(`   ❌ Error updating return ${returnRequest.id}:`, error.message);
          skipped++;
        }
      } else {
        console.log('   ⚠️  No updates needed for this return');
        skipped++;
      }
    }

    console.log(`\n\n📊 Summary:`);
    console.log(`   ✅ Fixed: ${fixed} return(s)`);
    console.log(`   ⚠️  Skipped: ${skipped} return(s)`);
    console.log(`   📦 Total processed: ${returnsToFix.length} return(s)`);

    console.log('\n✅ Data fix completed!');
  } catch (error) {
    console.error('❌ Error fixing returns data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixReturnsData()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });

