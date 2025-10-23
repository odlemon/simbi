const fs = require('fs');
const path = require('path');

function fixSchemaForSQLite() {
  console.log('🔧 Fixing Prisma Schema for SQLite Compatibility...\n');
  
  const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
  let schemaContent = fs.readFileSync(schemaPath, 'utf8');
  
  console.log('1. Removing @db.Text annotations...');
  
  // Remove all @db.Text annotations
  schemaContent = schemaContent.replace(/@db\.Text/g, '');
  
  console.log('✅ Removed @db.Text annotations');
  
  console.log('2. Updating datasource to use SQLite...');
  
  // Ensure datasource is set to SQLite
  schemaContent = schemaContent.replace(
    /datasource db \{[^}]*\}/,
    `datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}`
  );
  
  console.log('✅ Datasource updated to SQLite');
  
  console.log('3. Updating generator output path...');
  
  // Update generator to specify output path
  schemaContent = schemaContent.replace(
    /generator client \{[^}]*\}/,
    `generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/@prisma/client"
}`
  );
  
  console.log('✅ Generator updated with output path');
  
  // Write the updated schema
  fs.writeFileSync(schemaPath, schemaContent);
  
  console.log('\n✅ Schema updated for SQLite compatibility');
  console.log('\n4. Next steps:');
  console.log('   Run: npx prisma migrate dev --name init');
  console.log('   Run: npx prisma db seed');
  console.log('   Run: npm run dev');
  
  return true;
}

// Run the fix
if (fixSchemaForSQLite()) {
  console.log('\n🎉 Schema fixed for SQLite!');
} else {
  console.log('\n💥 Schema fix failed.');
}
