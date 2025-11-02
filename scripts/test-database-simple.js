const { PrismaClient } = require('@prisma/client');

async function testDatabaseConnection() {
  console.log('🔄 Testing database connection...');
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL + '&connection_limit=15&pool_timeout=30&connect_timeout=60&socket_timeout=60'
      }
    },
    log: ['error', 'warn'],
  });
  
  try {
    // Test 1: Basic connection check
    console.log('1️⃣ Testing basic connection...');
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Connection successful');
    
    // Test 2: Test multiple queries (connection pooling)
    console.log('2️⃣ Testing connection pooling...');
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(prisma.$queryRaw`SELECT ${i} as test_number`);
    }
    const results = await Promise.all(promises);
    console.log('✅ Pooling test results:', results.length, 'queries completed');
    
    // Test 3: Test actual data query
    console.log('3️⃣ Testing actual data query...');
    const sellerCount = await prisma.seller.count();
    console.log('✅ Seller count:', sellerCount);
    
    const productCount = await prisma.masterProduct.count();
    console.log('✅ Master product count:', productCount);
    
    console.log('🎉 All database tests passed!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  } finally {
    await prisma.$disconnect();
    console.log('📤 Disconnected from database');
  }
}

testDatabaseConnection();



