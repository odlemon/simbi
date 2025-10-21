const fs = require('fs');

function optimizeDatabaseConnection() {
  console.log('⚡ Optimizing database connection settings...\n');
  
  // Create optimized database utility
  const optimizedDatabaseCode = `// @ts-nocheck
import { PrismaClient } from '@prisma/client';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private prisma: PrismaClient;
  
  private constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      },
      // Optimize connection pool for remote database
      __internal: {
        engine: {
          connectTimeout: 5000,  // 5 seconds instead of 10
          connectionLimit: 3,    // Only 3 connections instead of 9
        }
      }
    });
  }
  
  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }
  
  public async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      console.log('✅ Connected to MySQL database successfully');
    } catch (error) {
      console.error('❌ MySQL connection error:', error);
      // Don't exit process in serverless environment
      if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
      }
    }
  }
  
  public async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      console.log('📤 Disconnected from MySQL database');
    } catch (error) {
      console.error('❌ Error disconnecting from MySQL:', error);
    }
  }
  
  public getPrismaClient(): PrismaClient {
    return this.prisma;
  }
}

// Export a singleton instance
export const dbConnection = DatabaseConnection.getInstance();
`;

  // Write the optimized database utility
  fs.writeFileSync('src/utils/database.ts', optimizedDatabaseCode);
  console.log('✅ Optimized database utility created');
  
  // Create environment file with connection string
  const envContent = `# Application
NODE_ENV=development
PORT=3000

# Database - Optimized for remote connection
DATABASE_URL="mysql://avnadmin:AVNS_yh3wiHkC2mkX8tq2jwN@mysql-3577d233-clearcoverhealth-def0.b.aivencloud.com:21949/defaultdb?ssl-mode=REQUIRED&connection_limit=3&connect_timeout=5"

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
`;

  fs.writeFileSync('.env', envContent);
  console.log('✅ Environment file created with optimized settings');
  
  console.log('\n🎉 Database connection optimized!');
  console.log('📝 Changes made:');
  console.log('- Reduced connection limit to 3');
  console.log('- Reduced timeout to 5 seconds');
  console.log('- Added connection pool optimization');
  console.log('\n🚀 Try starting the server now: npm run dev');
}

optimizeDatabaseConnection();
