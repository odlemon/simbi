const fs = require('fs');
const path = require('path');

function updateFileToUseSinglePrismaInstance(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Replace dbConnection.getPrismaClient() with prisma
    if (content.includes('dbConnection.getPrismaClient()')) {
      content = content.replace(/dbConnection\.getPrismaClient\(\)/g, 'prisma');
      modified = true;
    }

    // Add prisma import if not present
    if (content.includes('prisma') && !content.includes("import { prisma }")) {
      // Find the last import statement
      const lines = content.split('\n');
      let lastImportIndex = -1;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('import ')) {
          lastImportIndex = i;
        }
      }
      
      if (lastImportIndex !== -1) {
        // Add prisma import after the last import
        lines.splice(lastImportIndex + 1, 0, "import { prisma } from '../../utils/database';");
        content = lines.join('\n');
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Updated: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

function findAndUpdateServiceFiles(dir) {
  const files = fs.readdirSync(dir);
  let updatedCount = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Recursively search subdirectories
      updatedCount += findAndUpdateServiceFiles(filePath);
    } else if (file.endsWith('.ts') && !file.includes('node_modules')) {
      // Update TypeScript files
      if (updateFileToUseSinglePrismaInstance(filePath)) {
        updatedCount++;
      }
    }
  }

  return updatedCount;
}

console.log('🔧 Converting all services to use SINGLE Prisma instance...\n');

// Update all service files
const updatedCount = findAndUpdateServiceFiles('src');

console.log(`\n🎉 Updated ${updatedCount} files to use single Prisma instance!`);
console.log('\n📝 Changes made:');
console.log('- Replaced dbConnection.getPrismaClient() with prisma');
console.log('- Added prisma import to service files');
console.log('- Now using SINGLE Prisma instance across entire project');
console.log('\n🚀 This should eliminate connection pool issues!');
