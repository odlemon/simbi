const { prisma, checkDatabaseConnection } = require('./src/utils/database');

async function testDatabaseConnection() {
  console.log('🔄 Testing database connection...');
  
  try {
    // Test 1: Basic connection check
    console.log('1️⃣ Testing basic connection...');
    const isConnected = await checkDatabaseConnection();
    console.log('✅ Connection check result:', isConnected);
    
    // Test 2: Simple query
    console.log('2️⃣ Testing simple query...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Query result:', result);
    
    // Test 3: Test multiple queries (connection pooling)
    console.log('3️⃣ Testing connection pooling...');
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(prisma.$queryRaw`SELECT ${i} as test_number`);
    }
    const results = await Promise.all(promises);
    console.log('✅ Pooling test results:', results.length, 'queries completed');
    
    // Test 4: Test actual data query
    console.log('4️⃣ Testing actual data query...');
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



