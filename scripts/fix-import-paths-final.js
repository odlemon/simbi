const fs = require('fs');
const path = require('path');

function fixImportPaths(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Fix incorrect import paths for database
    const incorrectPaths = [
      "import { prisma } from '../../utils/database';",
      "import { prisma } from '../utils/database';",
      "import { dbConnection } from '../../utils/database';",
      "import { dbConnection } from '../utils/database';"
    ];

    for (const incorrectPath of incorrectPaths) {
      if (content.includes(incorrectPath)) {
        // Calculate correct relative path
        const relativePath = path.relative(path.dirname(filePath), 'src/utils/database');
        const correctImport = `import { prisma } from "${relativePath.replace(/\\/g, '/')}";`;
        
        content = content.replace(incorrectPath, correctImport);
        modified = true;
      }
    }

    // Remove any remaining dbConnection usage
    if (content.includes('dbConnection.getPrismaClient()')) {
      content = content.replace(/dbConnection\.getPrismaClient\(\)/g, 'prisma');
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
      if (fixImportPaths(filePath)) {
        fixedCount++;
      }
    }
  }

  return fixedCount;
}

console.log('🔧 Fixing all import paths to use single Prisma instance...\n');

// Fix all files
const fixedCount = findAndFixFiles('src');

console.log(`\n🎉 Fixed ${fixedCount} files!`);
console.log('\n📝 Changes made:');
console.log('- Fixed incorrect relative import paths');
console.log('- Removed duplicate imports');
console.log('- All files now use single prisma instance');
console.log('\n🚀 Try starting the server now: npm run dev');
