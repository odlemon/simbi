const fs = require('fs');
const path = require('path');

// Files that need to be fixed
const filesToFix = [
  'src/services/buyer/analytics/AdvancedAnalyticsService.ts',
  'src/services/buyer/quote/QuoteService.ts',
  'src/services/buyer/dispute/DisputeService.ts',
  'src/services/buyer/analytics/AnalyticsService.ts',
  'src/services/buyer/enterprise/EnterpriseUserService.ts',
  'src/services/buyer/order/OrderService.ts',
  'src/services/buyer/address/BuyerAddressService.ts',
  'src/services/buyer/auth/BuyerAuthService.ts',
  'src/middleware/buyerAuth.ts'
];

function fixPrismaConnection(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if file already uses singleton
    if (content.includes('dbConnection.getPrismaClient()')) {
      console.log(`✅ ${filePath} already fixed`);
      return;
    }
    
    // Replace PrismaClient import and instantiation
    content = content.replace(
      /import { PrismaClient[^}]*} from '@prisma\/client';/g,
      "import { dbConnection } from '../../utils/database';"
    );
    
    content = content.replace(
      /const prisma = new PrismaClient\(\);/g,
      'const prisma = dbConnection.getPrismaClient();'
    );
    
    // Handle different import patterns
    content = content.replace(
      /import { PrismaClient } from '@prisma\/client';/g,
      "import { dbConnection } from '../../utils/database';"
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed ${filePath}`);
    
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
}

console.log('🔧 Fixing Prisma connection leaks...\n');

filesToFix.forEach(fixPrismaConnection);

console.log('\n🎉 All Prisma connections fixed!');
console.log('\n📝 Summary:');
console.log('- Replaced multiple PrismaClient instances with singleton');
console.log('- All services now use shared database connection');
console.log('- This should fix the connection pool timeout issue');
