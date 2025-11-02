const fs = require('fs');
const path = require('path');

// List of files that need to be fixed
const filesToFix = [
  'src/services/seller/accounting/AccountingService.ts',
  'src/services/admin/sellers/SRICalculationService.ts',
  'src/services/admin/dashboard/DashboardService.ts',
  'src/services/admin/sellers/SellerManagementService.ts',
  'src/services/seller/auth/SellerAuthService.ts',
  'src/services/seller/dashboard/DashboardService.ts',
  'src/services/seller/staff/StaffTimeTrackingService.ts',
  'src/services/seller/staff/StaffService.ts',
  'src/services/seller/staff/StaffAuthService.ts',
  'src/services/seller/staff/OrderProcessingService.ts',
  'src/services/seller/loans/LoanService.ts',
  'src/services/seller/inventory/BulkUploadService.ts',
  'src/services/seller/accounting/ChartOfAccountsService.ts',
  'src/services/seller/accounting/AccountMappingService.ts',
  'src/services/admin/settings/SystemSettingsService.ts',
  'src/services/admin/sellers/DocumentManagementService.ts',
  'src/services/admin/security/SecurityAnomalyService.ts',
  'src/services/admin/products/ProductManagementService.ts',
  'src/services/admin/products/ProductImportService.ts',
  'src/services/admin/products/CustomProductRequestService.ts',
  'src/services/admin/logistics/LogisticsManagementService.ts',
  'src/services/admin/inventory/StockVarianceService.ts',
  'src/services/admin/hr/HRManagementService.ts',
  'src/services/admin/financial/FinancialReconciliationService.ts',
  'src/services/admin/disputes/DisputeSLOService.ts',
  'src/services/admin/disputes/DisputeManagementService.ts',
  'src/services/admin/compliance/AntiSnipingService.ts',
  'src/services/admin/auth/AuthService.ts'
];

function fixFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Remove private prisma declarations
    const privatePrismaRegex = /^\s*private\s+prisma\s*=\s*prisma\s*;\s*$/gm;
    if (privatePrismaRegex.test(content)) {
      content = content.replace(privatePrismaRegex, '');
      modified = true;
      console.log(`✅ Removed private prisma declaration from ${filePath}`);
    }

    // Replace this.prisma with prisma
    const thisPrismaRegex = /this\.prisma/g;
    if (thisPrismaRegex.test(content)) {
      content = content.replace(thisPrismaRegex, 'prisma');
      modified = true;
      console.log(`✅ Replaced this.prisma with prisma in ${filePath}`);
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`📝 Updated ${filePath}`);
    } else {
      console.log(`ℹ️  No changes needed for ${filePath}`);
    }

  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

console.log('🔄 Fixing Prisma singleton pattern in services...\n');

filesToFix.forEach(fixFile);

console.log('\n✅ All files processed!');



