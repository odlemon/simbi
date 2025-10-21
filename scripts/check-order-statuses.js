const { PrismaClient } = require('@prisma/client');

async function checkOrderStatuses() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking order statuses...');
    
    const orders = await prisma.order.findMany({
      select: {
        id: true,
        status: true,
        orderNumber: true
      },
      take: 10
    });
    
    console.log('📋 Sample orders:');
    orders.forEach(order => {
      console.log(`  ${order.orderNumber}: ${order.status}`);
    });
    
    // Count by status
    const statusCounts = await prisma.order.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });
    
    console.log('\n📊 Status counts:');
    statusCounts.forEach(count => {
      console.log(`  ${count.status}: ${count._count.status}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrderStatuses();
