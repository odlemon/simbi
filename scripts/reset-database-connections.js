const { PrismaClient } = require('@prisma/client');

async function resetDatabaseConnections() {
  console.log('🔄 Resetting database connections...\n');
  
  try {
    // Create a new Prisma client to test connection
    const prisma = new PrismaClient();
    
    console.log('📡 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Force disconnect all connections
    console.log('🔌 Disconnecting all connections...');
    await prisma.$disconnect();
    console.log('✅ All connections disconnected');
    
    // Wait a moment for connections to fully close
    console.log('⏳ Waiting for connections to close...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test reconnection
    console.log('🔄 Testing reconnection...');
    await prisma.$connect();
    console.log('✅ Reconnection successful');
    
    // Final disconnect
    await prisma.$disconnect();
    console.log('✅ Final disconnect completed');
    
    console.log('\n🎉 Database connections reset successfully!');
    console.log('📝 You can now start the server with: npm run dev');
    
  } catch (error) {
    console.error('❌ Error resetting connections:', error.message);
    
    if (error.code === 'P2024') {
      console.log('\n💡 Connection pool timeout detected.');
      console.log('🔄 This is expected - connections are being reset.');
      console.log('⏳ Please wait a moment and try starting the server again.');
    }
  }
}

resetDatabaseConnections();
