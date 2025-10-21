// @ts-nocheck
import { PrismaClient } from '@prisma/client';

// ✅ SINGLETON PATTERN - Following Prisma docs exactly
let prisma: PrismaClient;

// Prevent hot reloading from creating new instances in development
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

if (process.env.NODE_ENV === 'production') {
  // Production: Create new instance
  prisma = new PrismaClient();
} else {
  // Development: Reuse global instance to prevent hot reload issues
  prisma = globalForPrisma.prisma || new PrismaClient();
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = prisma;
  }
}

// Export the SINGLE instance
export { prisma };

// Legacy compatibility - but now uses the same instance
export class DatabaseConnection {
  private static instance: DatabaseConnection;
  
  private constructor() {
    // Use the same prisma instance
  }
  
  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }
  
  public async connect(): Promise<void> {
    try {
      await prisma.$connect();
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
      await prisma.$disconnect();
      console.log('📤 Disconnected from MySQL database');
    } catch (error) {
      console.error('❌ Error disconnecting from MySQL:', error);
    }
  }
  
  public getPrismaClient(): PrismaClient {
    return prisma; // Return the SAME instance
  }
}

// Export singleton instance for backward compatibility
export const dbConnection = DatabaseConnection.getInstance();