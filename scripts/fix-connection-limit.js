const fs = require('fs');

function fixConnectionLimit() {
  console.log('🔧 Fixing connection limit to optimal value...\n');
  
  // Create balanced database utility
  const balancedDatabaseCode = `// @ts-nocheck
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
      }
      // Remove the restrictive connection settings
      // Let Prisma use its default optimized settings
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

  // Write the balanced database utility
  fs.writeFileSync('src/utils/database.ts', balancedDatabaseCode);
  console.log('✅ Balanced database utility created');
  
  // Create environment file with standard connection string
  const envContent = `# Application
NODE_ENV=development
PORT=3000

# Database - Standard connection (no artificial limits)
DATABASE_URL="mysql://avnadmin:AVNS_yh3wiHkC2mkX8tq2jwN@mysql-3577d233-clearcoverhealth-def0.b.aivencloud.com:21949/defaultdb?ssl-mode=REQUIRED"

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
`;

  fs.writeFileSync('.env', envContent);
  console.log('✅ Environment file updated with standard settings');
  
  console.log('\n🎉 Connection limit fixed!');
  console.log('📝 Changes made:');
  console.log('- Removed artificial connection limit of 3');
  console.log('- Removed artificial timeout of 5 seconds');
  console.log('- Using Prisma default optimized settings');
  console.log('- Should now use default connection pool (typically 5-10 connections)');
  console.log('\n🚀 Try starting the server now: npm run dev');
}

fixConnectionLimit();
