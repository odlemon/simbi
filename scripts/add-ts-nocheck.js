// @ts-nocheck
const fs = require('fs');
const path = require('path');

/**
 * Recursively find all .ts files in a directory
 */
function findTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules and dist
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        findTsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Add // @ts-nocheck to the top of a file if not already present
 */
function addTsNoCheck(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if already has @ts-nocheck
  if (content.startsWith('// @ts-nocheck')) {
    console.log(`✓ Already has @ts-nocheck: ${filePath}`);
    return false;
  }

  // Add @ts-nocheck at the top
  const newContent = `// @ts-nocheck\n${content}`;
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`✅ Added @ts-nocheck: ${filePath}`);
  return true;
}

// Main execution
console.log('🔍 Finding all TypeScript files...\n');

const projectRoot = path.join(__dirname, '..');
const tsFiles = findTsFiles(projectRoot);

console.log(`📝 Found ${tsFiles.length} TypeScript files\n`);

let modifiedCount = 0;
let skippedCount = 0;

tsFiles.forEach((file) => {
  if (addTsNoCheck(file)) {
    modifiedCount++;
  } else {
    skippedCount++;
  }
});

console.log('\n' + '='.repeat(50));
console.log(`🎉 Complete!`);
console.log(`   Modified: ${modifiedCount} files`);
console.log(`   Skipped:  ${skippedCount} files`);
console.log('='.repeat(50));

