const { PrismaClient } = require('@prisma/client');

async function setupLocalDatabase() {
  console.log('🏠 Setting up local database for development...\n');
  
  try {
    // Test if we can connect to a local database
    const localUrl = "mysql://root:password@localhost:3306/simbi_dev";
    
    console.log('📡 Testing local database connection...');
    const localClient = new PrismaClient({
      datasources: {
        db: {
          url: localUrl
        }
      }
    });
    
    try {
      await localClient.$connect();
      console.log('✅ Local database connection successful');
      
      // Test query
      const result = await localClient.$queryRaw`SELECT 1 as test`;
      console.log('✅ Local database query successful:', result);
      
      await localClient.$disconnect();
      console.log('✅ Local database connection closed');
      
      console.log('\n🎉 Local database is working!');
      console.log('📝 To use local database:');
      console.log('1. Create a .env file with: DATABASE_URL="mysql://root:password@localhost:3306/simbi_dev"');
      console.log('2. Run: npx prisma db push');
      console.log('3. Run: npx prisma db seed');
      console.log('4. Start server: npm run dev');
      
    } catch (error) {
      console.log('❌ Local database not available:', error.message);
      console.log('\n💡 Alternative solutions:');
      console.log('1. Install MySQL locally');
      console.log('2. Use Docker: docker run --name mysql -e MYSQL_ROOT_PASSWORD=password -p 3306:3306 -d mysql:8.0');
      console.log('3. Wait for remote database to clear (try again in 10-15 minutes)');
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  }
}

setupLocalDatabase();
