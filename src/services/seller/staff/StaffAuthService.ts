// @ts-nocheck

import { logger } from "../../../utils/logger";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../../utils/database";

interface StaffLoginDTO {
  email: string;
  password: string;
}

export class StaffAuthService {
  private prisma = prisma;

  /**
   * Staff login
   */
  async login(data: StaffLoginDTO) {
    // Find staff member
    const staff = await this.prisma.sellerStaff.findUnique({
      where: { email: data.email },
      include: {
        seller: {
          select: {
            id: true,
            businessName: true,
            tradingName: true,
            status: true,
          },
        },
      },
    });

    if (!staff) {
      throw new Error("Invalid credentials");
    }

    // Check if staff is active
    if (!staff.isActive) {
      throw new Error("Your account has been deactivated. Please contact your manager.");
    }

    // Check if seller is active
    if (staff.seller.status !== "ACTIVE") {
      throw new Error("Your seller account is not active. Please contact support.");
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(data.password, staff.passwordHash);
    if (!isValidPassword) {
      throw new Error("Invalid credentials");
    }

    // Update last login
    await this.prisma.sellerStaff.update({
      where: { id: staff.id },
      data: { lastLogin: new Date() },
    });

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET as string;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not configured");
    }

    const accessToken = jwt.sign(
      {
        staffId: staff.id,
        sellerId: staff.sellerId,
        email: staff.email,
        role: staff.role,
        department: staff.department,
        type: "staff",
      },
      jwtSecret,
      { expiresIn: "7d" }
    );

    logger.info("Staff logged in successfully", {
      staffId: staff.id,
      sellerId: staff.sellerId,
      email: staff.email,
    });

    return {
      staff: {
        id: staff.id,
        sellerId: staff.sellerId,
        email: staff.email,
        firstName: staff.firstName,
        lastName: staff.lastName,
        department: staff.department,
        position: staff.position,
        role: staff.role,
        status: staff.status,
        businessName: staff.seller.tradingName || staff.seller.businessName,
      },
      accessToken,
    };
  }

  /**
   * Get staff profile
   */
  async getProfile(staffId: string) {
    const staff = await this.prisma.sellerStaff.findUnique({
      where: { id: staffId },
      include: {
        seller: {
          select: {
            businessName: true,
            tradingName: true,
          },
        },
      },
    });

    if (!staff) {
      throw new Error("Staff member not found");
    }

    return {
      id: staff.id,
      sellerId: staff.sellerId,
      email: staff.email,
      firstName: staff.firstName,
      lastName: staff.lastName,
      phone: staff.phone,
      department: staff.department,
      position: staff.position,
      salary: staff.salary,
      hourlyRate: staff.hourlyRate,
      startDate: staff.startDate,
      role: staff.role,
      status: staff.status,
      isActive: staff.isActive,
      lastLogin: staff.lastLogin,
      businessName: staff.seller.tradingName || staff.seller.businessName,
      createdAt: staff.createdAt,
    };
  }

  /**
   * Change password
   */
  async changePassword(staffId: string, oldPassword: string, newPassword: string) {
    const staff = await this.prisma.sellerStaff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      throw new Error("Staff member not found");
    }

    // Verify old password
    const isValidPassword = await bcrypt.compare(oldPassword, staff.passwordHash);
    if (!isValidPassword) {
      throw new Error("Current password is incorrect");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await this.prisma.sellerStaff.update({
      where: { id: staffId },
      data: { passwordHash: hashedPassword },
    });

    logger.info("Staff password changed", { staffId });

    return { message: "Password changed successfully" };
  }
}

export const staffAuthService = new StaffAuthService();



