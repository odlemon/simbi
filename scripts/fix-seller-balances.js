const { PrismaClient, TransactionType } = require('@prisma/client');

// Create PrismaClient instance
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: ['error', 'warn']
});

/**
 * Script to fix seller balances by:
 * 1. Inspecting all sellers and their transactions
 * 2. Checking if ledger entries exist for all paid orders
 * 3. Creating missing ledger entries
 * 4. Recalculating balances correctly (revenue - commissions - expenses)
 */
async function fixSellerBalances() {
  try {
    console.log('🔍 Starting seller balance fix...\n');

    // Get all sellers
    const sellers = await prisma.seller.findMany({
      select: {
        id: true,
        businessName: true,
        email: true
      }
    });

    console.log(`📊 Found ${sellers.length} sellers to process\n`);

    let totalFixed = 0;
    let totalSellersProcessed = 0;

    for (const seller of sellers) {
      console.log(`\n👤 Processing seller: ${seller.businessName} (${seller.email})`);
      console.log(`   Seller ID: ${seller.id}`);

      try {
        // Get all orders for this seller with payments
        const orders = await prisma.order.findMany({
          where: {
            sellerId: seller.id
          },
          include: {
            payment: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        });

        // Filter to only paid orders
        const paidOrders = orders.filter(order => 
          order.payment && 
          (order.payment.status === 'COMPLETED' || order.payment.status === 'PARTIAL')
        );

        console.log(`   📦 Total orders: ${orders.length}`);
        console.log(`   💰 Paid orders: ${paidOrders.length}`);

        if (paidOrders.length === 0) {
          console.log(`   ⏭️  No paid orders, skipping...`);
          continue;
        }

        // Get existing ledger entries for this seller
        const existingLedgerEntries = await prisma.sellerLedger.findMany({
          where: {
            sellerId: seller.id,
            type: { in: [TransactionType.SALE, TransactionType.COMMISSION] }
          },
          select: {
            referenceId: true,
            type: true,
            category: true
          }
        });

        // Create a map of order IDs that have ledger entries
        const ordersWithLedger = new Set();
        existingLedgerEntries.forEach(entry => {
          if (entry.referenceId) {
            ordersWithLedger.add(entry.referenceId);
          }
        });

        console.log(`   📝 Orders with ledger entries: ${ordersWithLedger.size}`);

        // Find orders missing ledger entries
        const ordersNeedingLedger = paidOrders.filter(order => 
          !ordersWithLedger.has(order.id)
        );

        console.log(`   🔧 Orders needing ledger entries: ${ordersNeedingLedger.length}`);

        if (ordersNeedingLedger.length === 0) {
          console.log(`   ✅ All orders have ledger entries`);
          
          // Still check if balance is correct
          await verifyAndFixBalance(seller.id);
          continue;
        }

        // Get account IDs (we'll need to handle this)
        // For now, we'll set them to null and let the system handle it
        let salesAccountId = null;
        let commissionAccountId = null;

        try {
          // Try to get account IDs from Chart of Accounts
          const salesAccount = await prisma.chartOfAccount.findFirst({
            where: {
              code: 'SALES_REVENUE'
            }
          });
          salesAccountId = salesAccount?.id || null;

          const commissionAccount = await prisma.chartOfAccount.findFirst({
            where: {
              code: 'PLATFORM_COMMISSION'
            }
          });
          commissionAccountId = commissionAccount?.id || null;
        } catch (error) {
          console.log(`   ⚠️  Could not fetch account IDs, using null`);
        }

        // Get current balance from latest ledger entry
        const lastLedgerEntry = await prisma.sellerLedger.findFirst({
          where: { sellerId: seller.id },
          orderBy: { transactionDate: 'desc' },
          select: { balance: true, transactionDate: true }
        });

        let currentBalance = lastLedgerEntry?.balance || 0;
        let lastTransactionDate = lastLedgerEntry?.transactionDate || new Date(0);

        console.log(`   💵 Current ledger balance: $${currentBalance.toFixed(2)}`);

        // Process each order that needs ledger entries
        let entriesCreated = 0;
        for (const order of ordersNeedingLedger) {
          const payment = order.payment;
          const paymentAmount = payment.amount || 0;
          
          if (paymentAmount === 0) {
            console.log(`   ⚠️  Order ${order.orderNumber} has zero payment, skipping...`);
            continue;
          }

          // Use order's transaction date or payment date
          const transactionDate = payment.paidAt || order.createdAt || new Date();

          // Calculate commission
          // Commission should be proportional to payment amount
          const orderTotal = order.totalAmount || 0;
          const commissionRate = orderTotal > 0 ? (order.platformCommission || 0) / orderTotal : 0.1;
          const commissionAmount = paymentAmount * commissionRate;
          const netAmount = paymentAmount - commissionAmount;

          const isPartial = payment.status === 'PARTIAL';

          // Create SALE entry
          currentBalance = currentBalance + paymentAmount;
          await prisma.sellerLedger.create({
            data: {
              sellerId: seller.id,
              accountId: salesAccountId,
              transactionDate: transactionDate,
              type: TransactionType.SALE,
              category: isPartial ? 'PARTIAL_PAYMENT' : 'CASH_PAYMENT',
              amountUSD: paymentAmount,
              amountZWL: paymentAmount,
              description: isPartial 
                ? `Partial cash payment received for order ${order.orderNumber} (${paymentAmount} of ${orderTotal})`
                : `Cash payment received for order ${order.orderNumber}`,
              referenceId: order.id,
              debit: paymentAmount,
              credit: 0,
              balance: currentBalance
            }
          });

          // Create COMMISSION entry
          currentBalance = currentBalance - commissionAmount;
          await prisma.sellerLedger.create({
            data: {
              sellerId: seller.id,
              accountId: commissionAccountId,
              transactionDate: transactionDate,
              type: TransactionType.COMMISSION,
              category: 'PLATFORM_COMMISSION',
              amountUSD: commissionAmount,
              amountZWL: commissionAmount,
              description: isPartial
                ? `Platform commission for partial payment on order ${order.orderNumber}`
                : `Platform commission for order ${order.orderNumber}`,
              referenceId: order.id,
              debit: 0,
              credit: commissionAmount,
              balance: currentBalance
            }
          });

          entriesCreated += 2;
          console.log(`   ✅ Created ledger entries for order ${order.orderNumber} (Payment: $${paymentAmount.toFixed(2)}, Commission: $${commissionAmount.toFixed(2)})`);
        }

        console.log(`   📊 Created ${entriesCreated} ledger entries`);
        totalFixed += entriesCreated;

        // Verify and fix balance
        await verifyAndFixBalance(seller.id);

        totalSellersProcessed++;

      } catch (error) {
        console.error(`   ❌ Error processing seller ${seller.businessName}:`, error.message);
        console.error(error.stack);
      }
    }

    console.log(`\n\n✅ Fix complete!`);
    console.log(`   📊 Sellers processed: ${totalSellersProcessed}`);
    console.log(`   🔧 Ledger entries created: ${totalFixed}`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Verify and fix the seller's balance if needed
 */
async function verifyAndFixBalance(sellerId) {
  try {
    // Get all paid orders
    const paidOrders = await prisma.order.findMany({
      where: {
        sellerId: sellerId,
        payment: {
          status: { in: ['COMPLETED', 'PARTIAL'] }
        }
      },
      include: {
        payment: true
      }
    });

    // Calculate expected balance: revenue - commissions - expenses
    let totalRevenue = 0;
    let totalCommissions = 0;

    paidOrders.forEach(order => {
      const paymentAmount = order.payment?.amount || 0;
      totalRevenue += paymentAmount;
      
      // Calculate proportional commission
      const orderTotal = order.totalAmount || 0;
      const commissionRate = orderTotal > 0 ? (order.platformCommission || 0) / orderTotal : 0.1;
      totalCommissions += paymentAmount * commissionRate;
    });

    // Get expenses
    const expenses = await prisma.sellerExpense.aggregate({
      where: { sellerId: sellerId },
      _sum: { amount: true }
    });
    const totalExpenses = expenses._sum.amount || 0;

    // Expected balance
    const expectedBalance = totalRevenue - totalCommissions - totalExpenses;

    // Get actual balance from ledger
    const lastLedgerEntry = await prisma.sellerLedger.findFirst({
      where: { sellerId: sellerId },
      orderBy: { transactionDate: 'desc' },
      select: { balance: true }
    });

    const actualBalance = lastLedgerEntry?.balance || 0;
    const difference = Math.abs(expectedBalance - actualBalance);

    if (difference > 0.01) { // Allow for small floating point differences
      console.log(`   ⚠️  Balance mismatch detected!`);
      console.log(`      Expected: $${expectedBalance.toFixed(2)}`);
      console.log(`      Actual: $${actualBalance.toFixed(2)}`);
      console.log(`      Difference: $${difference.toFixed(2)}`);
      
      // Update the latest ledger entry's balance
      if (lastLedgerEntry) {
        // Get the latest entry ID to update just that one
        const latestEntry = await prisma.sellerLedger.findFirst({
          where: { sellerId: sellerId },
          orderBy: { transactionDate: 'desc', createdAt: 'desc' },
          select: { id: true }
        });
        
        if (latestEntry) {
          await prisma.sellerLedger.update({
            where: { id: latestEntry.id },
            data: { balance: expectedBalance }
          });
          console.log(`   ✅ Updated ledger balance to $${expectedBalance.toFixed(2)}`);
        }
      } else {
        // Create an adjustment entry if no ledger entries exist
        await prisma.sellerLedger.create({
          data: {
            sellerId: sellerId,
            accountId: null,
            transactionDate: new Date(),
            type: TransactionType.ADJUSTMENT,
            category: 'BALANCE_CORRECTION',
            amountUSD: expectedBalance,
            amountZWL: expectedBalance,
            description: `Balance correction - initial balance set to ${expectedBalance}`,
            referenceId: null,
            debit: expectedBalance > 0 ? expectedBalance : 0,
            credit: expectedBalance < 0 ? Math.abs(expectedBalance) : 0,
            balance: expectedBalance
          }
        });
        console.log(`   ✅ Created adjustment entry with balance $${expectedBalance.toFixed(2)}`);
      }
    } else {
      console.log(`   ✅ Balance is correct: $${actualBalance.toFixed(2)}`);
    }

  } catch (error) {
    console.error(`   ❌ Error verifying balance:`, error.message);
  }
}

// Run the script
if (require.main === module) {
  fixSellerBalances()
    .then(() => {
      console.log('\n✨ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixSellerBalances, verifyAndFixBalance };

