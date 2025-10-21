const { PrismaClient } = require('@prisma/client');

async function aggressiveConnectionReset() {
  console.log('🔥 AGGRESSIVE DATABASE CONNECTION RESET\n');
  
  try {
    // Step 1: Kill all existing connections
    console.log('💀 Step 1: Killing all existing connections...');
    
    // Create a client and immediately disconnect
    const killClient = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || "mysql://avnadmin:AVNS_yh3wiHkC2mkX8tq2jwN@mysql-3577d233-clearcoverhealth-def0.b.aivencloud.com:21949/defaultdb?ssl-mode=REQUIRED"
        }
      }
    });
    
    try {
      await killClient.$connect();
      console.log('✅ Kill client connected');
    } catch (error) {
      console.log('⚠️ Kill client connection failed (expected):', error.code);
    }
    
    try {
      await killClient.$disconnect();
      console.log('✅ Kill client disconnected');
    } catch (error) {
      console.log('⚠️ Kill client disconnect error:', error.message);
    }
    
    // Step 2: Wait longer for connections to fully close
    console.log('\n⏳ Step 2: Waiting 5 seconds for all connections to close...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 3: Test with minimal connection
    console.log('🔄 Step 3: Testing minimal connection...');
    const testClient = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || "mysql://avnadmin:AVNS_yh3wiHkC2mkX8tq2jwN@mysql-3577d233-clearcoverhealth-def0.b.aivencloud.com:21949/defaultdb?ssl-mode=REQUIRED"
        }
      }
    });
    
    try {
      await testClient.$connect();
      console.log('✅ Test connection successful');
      
      // Simple query to test
      const result = await testClient.$queryRaw`SELECT 1 as test`;
      console.log('✅ Database query successful:', result);
      
      await testClient.$disconnect();
      console.log('✅ Test connection closed');
      
    } catch (error) {
      console.log('❌ Test connection failed:', error.message);
      if (error.code === 'P2024') {
        console.log('💡 Still getting connection pool timeout.');
        console.log('🔄 The remote database might be overloaded.');
        console.log('⏳ Try waiting a few more minutes before starting the server.');
      }
    }
    
    // Step 4: Final wait
    console.log('\n⏳ Step 4: Final wait for connections to clear...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n🎉 Aggressive reset completed!');
    console.log('📝 If you still get connection errors, the remote database might be overloaded.');
    console.log('💡 Consider using a local database for development.');
    
  } catch (error) {
    console.error('❌ Aggressive reset failed:', error.message);
  }
}

aggressiveConnectionReset();
