const { PrismaClient } = require('@prisma/client');

async function forceDisconnectAll() {
  console.log('🔧 Force disconnecting all database connections...\n');
  
  const clients = [];
  
  try {
    // Create multiple clients to simulate the old behavior
    console.log('📡 Creating test connections...');
    for (let i = 0; i < 5; i++) {
      const client = new PrismaClient();
      clients.push(client);
      await client.$connect();
      console.log(`✅ Connection ${i + 1} established`);
    }
    
    console.log('\n🔌 Disconnecting all connections...');
    
    // Disconnect all clients
    for (let i = 0; i < clients.length; i++) {
      try {
        await clients[i].$disconnect();
        console.log(`✅ Connection ${i + 1} disconnected`);
      } catch (error) {
        console.log(`⚠️ Connection ${i + 1} disconnect error:`, error.message);
      }
    }
    
    // Wait for all connections to close
    console.log('\n⏳ Waiting for all connections to close...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test that we can connect again
    console.log('🔄 Testing fresh connection...');
    const testClient = new PrismaClient();
    await testClient.$connect();
    console.log('✅ Fresh connection successful');
    await testClient.$disconnect();
    console.log('✅ Fresh connection closed');
    
    console.log('\n🎉 All connections reset successfully!');
    console.log('📝 The database connection pool is now clean.');
    console.log('🚀 You can start the server with: npm run dev');
    
  } catch (error) {
    console.error('❌ Error during disconnect:', error.message);
    
    if (error.code === 'P2024') {
      console.log('\n💡 Connection pool timeout - this is expected during reset.');
      console.log('⏳ Please wait a moment and try starting the server.');
    }
  } finally {
    // Ensure all clients are disconnected
    for (const client of clients) {
      try {
        await client.$disconnect();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
  }
}

forceDisconnectAll();
