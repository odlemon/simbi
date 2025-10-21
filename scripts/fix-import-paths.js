const fs = require('fs');
const path = require('path');

// Files that need import path fixes
const filesToFix = [
  'src/services/buyer/auth/BuyerAuthService.ts',
  'src/services/buyer/address/BuyerAddressService.ts',
  'src/services/buyer/order/OrderService.ts',
  'src/services/buyer/analytics/AnalyticsService.ts',
  'src/services/buyer/enterprise/EnterpriseUserService.ts',
  'src/services/buyer/quote/QuoteService.ts',
  'src/services/buyer/analytics/AdvancedAnalyticsService.ts',
  'src/services/buyer/dispute/DisputeService.ts',
  'src/services/buyer/product/ProductSearchService.ts',
  'src/middleware/buyerAuth.ts'
];

function fixImportPath(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix the import path
    content = content.replace(
      /import { dbConnection } from '\.\.\/\.\.\/utils\/database';/g,
      "import { dbConnection } from '../../../utils/database';"
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed import path in ${filePath}`);
    
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
}

console.log('🔧 Fixing import paths...\n');

filesToFix.forEach(fixImportPath);

console.log('\n🎉 All import paths fixed!');
