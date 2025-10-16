// @ts-nocheck
/**
 * Script to create the first Super Admin user
 * Run with: npx ts-node scripts/create-super-admin.ts
 */

import { AuthService } from "../src/services/admin/auth/AuthService";
import { UserRole } from "@prisma/client";
import { dbConnection } from "../src/utils/database";

async function createSuperAdmin() {
  try {
    console.log("🚀 Creating Super Admin...\n");

    const authService = new AuthService();

    // Create super admin
    const admin = await authService.createAdmin({
      email: "admin@simbimarket.com",
      password: "Admin123!@#",
      firstName: "System",
      lastName: "Administrator",
      role: UserRole.SUPER_ADMIN,
    });

    console.log("✅ Super Admin created successfully!\n");
    console.log("📧 Email:", admin.email);
    console.log("🔑 Password: Admin123!@#");
    console.log("👤 Role:", admin.role);
    console.log("\n⚠️  IMPORTANT: Change this password after first login!\n");

    await dbConnection.disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error creating Super Admin:");
    console.error(error.message);
    
    await dbConnection.disconnect();
    process.exit(1);
  }
}

createSuperAdmin();


