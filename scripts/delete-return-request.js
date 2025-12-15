// @ts-nocheck
// Quick script to delete a return request
// Usage: node scripts/delete-return-request.js <dispute-id>
// Or: node scripts/delete-return-request.js --list (to list all return requests)

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === '--list' || args[0] === '-l') {
    // List all return/exchange requests
    const disputes = await prisma.dispute.findMany({
      where: {
        requestType: {
          in: ['RETURN', 'EXCHANGE']
        }
      },
      select: {
        id: true,
        requestType: true,
        returnReason: true,
        status: true,
        createdAt: true,
        order: {
          select: {
            orderNumber: true
          }
        },
        buyer: {
          select: {
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });

    console.log('\n📋 Recent Return/Exchange Requests:\n');
    disputes.forEach((d, i) => {
      console.log(`${i + 1}. ID: ${d.id}`);
      console.log(`   Type: ${d.requestType} | Reason: ${d.returnReason || 'N/A'}`);
      console.log(`   Status: ${d.status} | Order: ${d.order?.orderNumber || 'N/A'}`);
      console.log(`   Buyer: ${d.buyer?.email || 'N/A'} | Created: ${d.createdAt}`);
      console.log('');
    });

    if (disputes.length === 0) {
      console.log('No return requests found.');
    }
    return;
  }

  const disputeId = args[0];

  if (!disputeId) {
    console.error('❌ Please provide a dispute ID');
    console.log('Usage: node scripts/delete-return-request.js <dispute-id>');
    console.log('   Or: node scripts/delete-return-request.js --list');
    process.exit(1);
  }

  try {
    // Find the dispute
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        order: {
          select: {
            orderNumber: true
          }
        }
      }
    });

    if (!dispute) {
      console.error(`❌ Dispute with ID ${disputeId} not found`);
      process.exit(1);
    }

    // Check if it's a return/exchange request
    if (dispute.requestType !== 'RETURN' && dispute.requestType !== 'EXCHANGE') {
      console.error(`❌ This is not a return/exchange request. Type: ${dispute.requestType}`);
      process.exit(1);
    }

    console.log(`\n📋 Found Return Request:`);
    console.log(`   ID: ${dispute.id}`);
    console.log(`   Type: ${dispute.requestType}`);
    console.log(`   Status: ${dispute.status}`);
    console.log(`   Order: ${dispute.order?.orderNumber || 'N/A'}`);
    console.log(`   Created: ${dispute.createdAt}\n`);

    // Delete the dispute
    await prisma.dispute.delete({
      where: { id: disputeId }
    });

    console.log(`✅ Successfully deleted return request: ${disputeId}\n`);
  } catch (error) {
    console.error('❌ Error deleting return request:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();





