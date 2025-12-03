// @ts-nocheck
import { logger } from "../../../utils/logger";
import { Seller, Buyer, SellerStatus, BuyerStatus, Prisma } from "@prisma/client";
import { prisma } from "../../../utils/database";

interface UserFilters {
  search?: string;
  status?: string;
  userType?: "seller" | "buyer" | "all";
}

interface GetAllUsersParams {
  page?: number;
  limit?: number;
  filters?: UserFilters;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface UnifiedUser {
  id: string;
  email: string;
  userType: "seller" | "buyer";
  isSeller: boolean;
  isBuyer: boolean;
  name?: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  tradingName?: string;
  companyName?: string;
  phone?: string;
  contactNumber?: string;
  status: SellerStatus | BuyerStatus;
  createdAt: Date;
  updatedAt: Date;
  // Seller specific fields
  tin?: string;
  sriScore?: number;
  isEligible?: boolean;
  // Buyer specific fields
  buyerType?: string;
  _count?: {
    orders?: number;
    addresses?: number;
  };
}

interface GetAllUsersResponse {
  users: UnifiedUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    sellerCount: number;
    buyerCount: number;
    pages: number;
  };
}

export class UserManagementService {
  /**
   * Get all users (sellers and buyers) with pagination and filters
   */
  async getAllUsers(params: GetAllUsersParams = {}): Promise<GetAllUsersResponse> {
    try {
      const {
        page = 1,
        limit = 20,
        filters = {},
        sortBy = "createdAt",
        sortOrder = "desc",
      } = params;

      const skip = (page - 1) * limit;
      const userType = filters.userType || "all";

      // Build where clauses for sellers and buyers
      const sellerWhere: Prisma.SellerWhereInput = {};
      const buyerWhere: Prisma.BuyerWhereInput = {};

      // Apply search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        sellerWhere.OR = [
          { businessName: { contains: filters.search, mode: "insensitive" } },
          { tradingName: { contains: filters.search, mode: "insensitive" } },
          { email: { contains: filters.search, mode: "insensitive" } },
          { tin: { contains: filters.search, mode: "insensitive" } },
        ];

        buyerWhere.OR = [
          { firstName: { contains: filters.search, mode: "insensitive" } },
          { lastName: { contains: filters.search, mode: "insensitive" } },
          { email: { contains: filters.search, mode: "insensitive" } },
          { companyName: { contains: filters.search, mode: "insensitive" } },
        ];
      }

      // Apply status filter
      if (filters.status) {
        if (userType === "seller" || userType === "all") {
          sellerWhere.status = filters.status as SellerStatus;
        }
        if (userType === "buyer" || userType === "all") {
          buyerWhere.status = filters.status as BuyerStatus;
        }
      }

      // Fetch sellers and buyers in parallel
      const fetchPromises: Promise<any>[] = [];

      if (userType === "seller" || userType === "all") {
        fetchPromises.push(
          prisma.seller.findMany({
            where: sellerWhere,
            select: {
              id: true,
              email: true,
              businessName: true,
              tradingName: true,
              contactNumber: true,
              tin: true,
              status: true,
              sriScore: true,
              isEligible: true,
              createdAt: true,
              updatedAt: true,
              _count: {
                select: {
                  orders: true,
                },
              },
            },
            orderBy: { [sortBy]: sortOrder },
          }),
          prisma.seller.count({ where: sellerWhere })
        );
      } else {
        fetchPromises.push(Promise.resolve([]), Promise.resolve(0));
      }

      if (userType === "buyer" || userType === "all") {
        fetchPromises.push(
          prisma.buyer.findMany({
            where: buyerWhere,
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              companyName: true,
              phoneNumber: true,
              buyerType: true,
              status: true,
              createdAt: true,
              updatedAt: true,
              _count: {
                select: {
                  orders: true,
                  addresses: true,
                },
              },
            },
            orderBy: { [sortBy]: sortOrder },
          }),
          prisma.buyer.count({ where: buyerWhere })
        );
      } else {
        fetchPromises.push(Promise.resolve([]), Promise.resolve(0));
      }

      const [sellers, sellerCount, buyers, buyerCount] = await Promise.all(fetchPromises);

      // Transform sellers to unified format
      const unifiedSellers: UnifiedUser[] = (sellers || []).map((seller: any) => ({
        id: seller.id,
        email: seller.email,
        userType: "seller" as const,
        isSeller: true,
        isBuyer: false,
        businessName: seller.businessName,
        tradingName: seller.tradingName,
        name: seller.businessName || seller.tradingName,
        contactNumber: seller.contactNumber,
        phone: seller.contactNumber,
        tin: seller.tin,
        status: seller.status,
        sriScore: seller.sriScore,
        isEligible: seller.isEligible,
        createdAt: seller.createdAt,
        updatedAt: seller.updatedAt,
        _count: {
          orders: seller._count?.orders || 0,
        },
      }));

      // Transform buyers to unified format
      const unifiedBuyers: UnifiedUser[] = (buyers || []).map((buyer: any) => ({
        id: buyer.id,
        email: buyer.email,
        userType: "buyer" as const,
        isSeller: false,
        isBuyer: true,
        firstName: buyer.firstName,
        lastName: buyer.lastName,
        name: buyer.companyName || `${buyer.firstName} ${buyer.lastName}`,
        companyName: buyer.companyName,
        phone: buyer.phoneNumber,
        phoneNumber: buyer.phoneNumber,
        buyerType: buyer.buyerType,
        status: buyer.status,
        createdAt: buyer.createdAt,
        updatedAt: buyer.updatedAt,
        _count: {
          orders: buyer._count?.orders || 0,
          addresses: buyer._count?.addresses || 0,
        },
      }));

      // Combine and sort all users
      let allUsers = [...unifiedSellers, ...unifiedBuyers];

      // Sort combined results
      allUsers.sort((a, b) => {
        const aValue = a[sortBy as keyof UnifiedUser];
        const bValue = b[sortBy as keyof UnifiedUser];

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
        if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });

      const total = allUsers.length;
      const paginatedUsers = allUsers.slice(skip, skip + limit);

      return {
        users: paginatedUsers,
        pagination: {
          page,
          limit,
          total,
          sellerCount: sellerCount || 0,
          buyerCount: buyerCount || 0,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      logger.error("Error fetching all users", {
        error: error.message,
        filters,
        params,
      });
      throw error;
    }
  }
}
