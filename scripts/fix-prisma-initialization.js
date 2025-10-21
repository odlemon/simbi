const fs = require('fs');
const path = require('path');

function fixPrismaInitialization(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Fix circular prisma assignments
    const circularPatterns = [
      /const prisma = prisma;/g,
      /let prisma = prisma;/g,
      /var prisma = prisma;/g
    ];

    for (const pattern of circularPatterns) {
      if (pattern.test(content)) {
        content = content.replace(pattern, '');
        modified = true;
      }
    }

    // Remove duplicate prisma imports
    const lines = content.split('\n');
    const prismaImports = lines.filter(line => 
      line.includes('import') && line.includes('prisma') && line.includes('database')
    );
    
    if (prismaImports.length > 1) {
      // Keep only the first prisma import
      let firstImportIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('import') && lines[i].includes('prisma') && lines[i].includes('database')) {
          if (firstImportIndex === -1) {
            firstImportIndex = i;
          } else {
            lines[i] = ''; // Remove duplicate
            modified = true;
          }
        }
      }
      if (modified) {
        content = lines.join('\n');
      }
    }

    // Remove any remaining dbConnection imports if prisma is already imported
    if (content.includes('import { prisma }') && content.includes('import { dbConnection }')) {
      content = content.replace(/import { dbConnection } from [^;]+;/g, '');
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

function findAndFixFiles(dir) {
  const files = fs.readdirSync(dir);
  let fixedCount = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Recursively search subdirectories
      fixedCount += findAndFixFiles(filePath);
    } else if (file.endsWith('.ts') && !file.includes('node_modules')) {
      // Fix TypeScript files
      if (fixPrismaInitialization(filePath)) {
        fixedCount++;
      }
    }
  }

  return fixedCount;
}

console.log('🔧 Fixing Prisma initialization issues...\n');

// Fix all files
const fixedCount = findAndFixFiles('src');

console.log(`\n🎉 Fixed ${fixedCount} files!`);
console.log('\n📝 Changes made:');
console.log('- Removed circular prisma assignments');
console.log('- Removed duplicate prisma imports');
console.log('- Cleaned up dbConnection imports');
console.log('\n🚀 Try starting the server now: npm run dev');
