// @ts-nocheck
import { Request } from "express";
import { UserRole } from "@prisma/client";

// Extend Express Request to include authenticated admin
export interface AuthenticatedRequest extends Request {
  admin?: {
    id: string;
    email: string;
    role: UserRole;
    firstName: string;
    lastName: string;
  };
}

// API Response format
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp: string;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Alert tiers for system
export enum AlertPriority {
  CRITICAL = "CRITICAL",
  HIGH = "HIGH",
  LOW = "LOW",
}

// SRI Component
export interface SRIComponents {
  fulfilmentRate: number;
  onTimeDeliveryRate: number;
  defectRate: number;
  complianceScore: number;
}

// Pricing calculation result
export interface PricingResult {
  displayPrice: number;
  sellerPrice: number;
  commission: number;
  commissionRate: number;
  sellerId: string;
  sriScore: number;
  currency: string;
  exchangeRate?: number;
}

// Financial reconciliation
export interface ReconciliationRecord {
  transactionId: string;
  grossValue: number;
  expectedRevenue: number;
  actualRevenue: number;
  variance: number;
  variancePercentage: number;
  exchangeRate?: number;
  transactionTime: Date;
}


