
import { z } from 'zod';
import { prisma } from "../../../utils/database";



// Validation schemas
const createDisputeSchema = z.object({
  orderId: z.string(),
  disputeType: z.enum(['WRONG_PART', 'DEFECTIVE_PRODUCT', 'COUNTERFEIT_PRODUCT', 'NOT_RECEIVED', 'DAMAGED_IN_TRANSIT', 'OTHER']),
  description: z.string().min(10).max(1000),
  evidenceUrls: z.array(z.string().url()).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().default('MEDIUM')
});

const updateDisputeSchema = z.object({
  status: z.enum(['OPEN', 'UNDER_REVIEW', 'AWAITING_EVIDENCE', 'RESOLVED_BUYER_FAVOR', 'RESOLVED_SELLER_FAVOR', 'CLOSED_NO_FAULT']).optional(),
  resolution: z.string().optional(),
  adminNotes: z.string().optional(),
  evidenceUrls: z.array(z.string().url()).optional()
});

const adminResolutionSchema = z.object({
  resolution: z.enum(['BUYER_FAVOR', 'SELLER_FAVOR', 'NO_FAULT']),
  resolutionNotes: z.string().min(10),
  refundAmount: z.number().optional(),
  sriImpact: z.number().min(0).max(10).optional(),
  actionRequired: z.string().optional()
});

export interface DisputeData {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  disputeType: DisputeType;
  status: DisputeStatus;
  description: string;
  evidenceUrls: string[];
  priority: string;
  resolution?: string;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  order: {
    orderNumber: string;
    totalAmount: number;
    status: string;
  };
  buyer: {
    firstName: string;
    lastName: string;
    email: string;
  };
  seller: {
    businessName: string;
    email: string;
  };
}

export interface DisputeResolution {
  disputeId: string;
  resolution: 'BUYER_FAVOR' | 'SELLER_FAVOR' | 'NO_FAULT';
  resolutionNotes: string;
  refundAmount?: number;
  sriImpact?: number;
  actionRequired?: string;
  resolvedBy: string;
  resolvedAt: Date;
}

export interface DisputeStats {
  totalDisputes: number;
  openDisputes: number;
  resolvedDisputes: number;
  averageResolutionTime: number;
  disputesByType: { [key: string]: number };
  disputesByStatus: { [key: string]: number };
}

export class DisputeService {
  /**
   * Create a new dispute
   */
  async createDispute(buyerId: string, disputeData: z.infer<typeof createDisputeSchema>): Promise<{ success: boolean; data?: DisputeData; error?: string }> {
    try {
      const validatedData = createDisputeSchema.parse(disputeData);

      // Verify order exists and belongs to buyer
      const order = await prisma.order.findFirst({
        where: {
          id: validatedData.orderId,
          buyerId
        },
        include: {
          seller: {
            select: {
              id: true,
              businessName: true,
              email: true
            }
          }
        }
      });

      if (!order) {
        return {
          success: false,
          error: 'ORDER_NOT_FOUND'
        };
      }

      // Check if dispute already exists for this order
      const existingDispute = await prisma.dispute.findFirst({
        where: {
          orderId: validatedData.orderId,
          status: { in: ['OPEN', 'UNDER_REVIEW', 'AWAITING_EVIDENCE'] }
        }
      });

      if (existingDispute) {
        return {
          success: false,
          error: 'DISPUTE_ALREADY_EXISTS'
        };
      }

      // Create dispute
      const dispute = await prisma.dispute.create({
        data: {
          orderId: validatedData.orderId,
          buyerId,
          sellerId: order.sellerId,
          disputeType: validatedData.disputeType,
          status: 'OPEN',
          description: validatedData.description,
          evidenceUrls: validatedData.evidenceUrls || [],
          priority: validatedData.priority
        },
        include: {
          order: {
            select: {
              orderNumber: true,
              totalAmount: true,
              status: true
            }
          },
          buyer: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          },
          seller: {
            select: {
              businessName: true,
              email: true
            }
          }
        }
      });

      return {
        success: true,
        data: dispute
      };

    } catch (error) {
      console.error('Create dispute error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get disputes for buyer
   */
  async getBuyerDisputes(buyerId: string, page: number = 1, limit: number = 20): Promise<{ success: boolean; data?: DisputeData[]; total?: number; error?: string }> {
    try {
      const skip = (page - 1) * limit;

      const [disputes, total] = await Promise.all([
        prisma.dispute.findMany({
          where: { buyerId },
          include: {
            order: {
              select: {
                orderNumber: true,
                totalAmount: true,
                status: true
              }
            },
            buyer: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            },
            seller: {
              select: {
                businessName: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.dispute.count({
          where: { buyerId }
        })
      ]);

      return {
        success: true,
        data: disputes,
        total
      };

    } catch (error) {
      console.error('Get buyer disputes error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get dispute by ID
   */
  async getDisputeById(disputeId: string, buyerId: string): Promise<{ success: boolean; data?: DisputeData; error?: string }> {
    try {
      const dispute = await prisma.dispute.findFirst({
        where: {
          id: disputeId,
          buyerId
        },
        include: {
          order: {
            select: {
              orderNumber: true,
              totalAmount: true,
              status: true
            }
          },
          buyer: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          },
          seller: {
            select: {
              businessName: true,
              email: true
            }
          }
        }
      });

      if (!dispute) {
        return {
          success: false,
          error: 'DISPUTE_NOT_FOUND'
        };
      }

      return {
        success: true,
        data: dispute
      };

    } catch (error) {
      console.error('Get dispute by ID error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update dispute (buyer can add evidence)
   */
  async updateDispute(disputeId: string, buyerId: string, updateData: z.infer<typeof updateDisputeSchema>): Promise<{ success: boolean; data?: DisputeData; error?: string }> {
    try {
      const validatedData = updateDisputeSchema.parse(updateData);

      // Check if dispute exists and belongs to buyer
      const existingDispute = await prisma.dispute.findFirst({
        where: {
          id: disputeId,
          buyerId
        }
      });

      if (!existingDispute) {
        return {
          success: false,
          error: 'DISPUTE_NOT_FOUND'
        };
      }

      // Only allow certain updates for buyers
      const allowedUpdates: any = {};
      if (validatedData.evidenceUrls) {
        allowedUpdates.evidenceUrls = validatedData.evidenceUrls;
      }

      const dispute = await prisma.dispute.update({
        where: { id: disputeId },
        data: allowedUpdates,
        include: {
          order: {
            select: {
              orderNumber: true,
              totalAmount: true,
              status: true
            }
          },
          buyer: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          },
          seller: {
            select: {
              businessName: true,
              email: true
            }
          }
        }
      });

      return {
        success: true,
        data: dispute
      };

    } catch (error) {
      console.error('Update dispute error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all disputes (admin only)
   */
  async getAllDisputes(page: number = 1, limit: number = 20, filters?: any): Promise<{ success: boolean; data?: DisputeData[]; total?: number; error?: string }> {
    try {
      const skip = (page - 1) * limit;
      const whereClause: any = {};

      if (filters?.status) {
        whereClause.status = filters.status;
      }
      if (filters?.disputeType) {
        whereClause.disputeType = filters.disputeType;
      }
      if (filters?.priority) {
        whereClause.priority = filters.priority;
      }
      if (filters?.dateFrom) {
        whereClause.createdAt = { gte: new Date(filters.dateFrom) };
      }
      if (filters?.dateTo) {
        whereClause.createdAt = { ...whereClause.createdAt, lte: new Date(filters.dateTo) };
      }

      const [disputes, total] = await Promise.all([
        prisma.dispute.findMany({
          where: whereClause,
          include: {
            order: {
              select: {
                orderNumber: true,
                totalAmount: true,
                status: true
              }
            },
            buyer: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            },
            seller: {
              select: {
                businessName: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.dispute.count({
          where: whereClause
        })
      ]);

      return {
        success: true,
        data: disputes,
        total
      };

    } catch (error) {
      console.error('Get all disputes error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Admin resolve dispute
   */
  async resolveDispute(disputeId: string, adminId: string, resolutionData: z.infer<typeof adminResolutionSchema>): Promise<{ success: boolean; data?: DisputeResolution; error?: string }> {
    try {
      const validatedData = adminResolutionSchema.parse(resolutionData);

      // Get dispute
      const dispute = await prisma.dispute.findUnique({
        where: { id: disputeId }
      });

      if (!dispute) {
        return {
          success: false,
          error: 'DISPUTE_NOT_FOUND'
        };
      }

      // Update dispute status
      const updatedDispute = await prisma.dispute.update({
        where: { id: disputeId },
        data: {
          status: 'RESOLVED_BUYER_FAVOR', // Will be updated based on resolution
          resolution: validatedData.resolutionNotes,
          adminNotes: validatedData.resolutionNotes,
          resolvedAt: new Date()
        }
      });

      // Update status based on resolution
      let finalStatus: DisputeStatus;
      switch (validatedData.resolution) {
        case 'BUYER_FAVOR':
          finalStatus = 'RESOLVED_BUYER_FAVOR';
          break;
        case 'SELLER_FAVOR':
          finalStatus = 'RESOLVED_SELLER_FAVOR';
          break;
        case 'NO_FAULT':
          finalStatus = 'CLOSED_NO_FAULT';
          break;
      }

      await prisma.dispute.update({
        where: { id: disputeId },
        data: { status: finalStatus }
      });

      // TODO: Update seller SRI if sriImpact is provided
      if (validatedData.sriImpact && validatedData.sriImpact > 0) {
        // Update seller SRI score
        await this.updateSellerSRI(dispute.sellerId, validatedData.sriImpact);
      }

      // TODO: Process refund if refundAmount is provided
      if (validatedData.refundAmount && validatedData.refundAmount > 0) {
        // Process refund
        await this.processRefund(dispute.orderId, validatedData.refundAmount);
      }

      const resolution: DisputeResolution = {
        disputeId,
        resolution: validatedData.resolution,
        resolutionNotes: validatedData.resolutionNotes,
        refundAmount: validatedData.refundAmount,
        sriImpact: validatedData.sriImpact,
        actionRequired: validatedData.actionRequired,
        resolvedBy: adminId,
        resolvedAt: new Date()
      };

      return {
        success: true,
        data: resolution
      };

    } catch (error) {
      console.error('Resolve dispute error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get dispute statistics
   */
  async getDisputeStats(): Promise<{ success: boolean; data?: DisputeStats; error?: string }> {
    try {
      const [
        totalDisputes,
        openDisputes,
        resolvedDisputes,
        disputesByType,
        disputesByStatus
      ] = await Promise.all([
        prisma.dispute.count(),
        prisma.dispute.count({
          where: { status: { in: ['OPEN', 'UNDER_REVIEW', 'AWAITING_EVIDENCE'] } }
        }),
        prisma.dispute.count({
          where: { status: { in: ['RESOLVED_BUYER_FAVOR', 'RESOLVED_SELLER_FAVOR', 'CLOSED_NO_FAULT'] } }
        }),
        prisma.dispute.groupBy({
          by: ['disputeType'],
          _count: { disputeType: true }
        }),
        prisma.dispute.groupBy({
          by: ['status'],
          _count: { status: true }
        })
      ]);

      // Calculate average resolution time
      const resolvedDisputesWithTime = await prisma.dispute.findMany({
        where: {
          status: { in: ['RESOLVED_BUYER_FAVOR', 'RESOLVED_SELLER_FAVOR', 'CLOSED_NO_FAULT'] },
          resolvedAt: { not: null }
        },
        select: {
          createdAt: true,
          resolvedAt: true
        }
      });

      const averageResolutionTime = resolvedDisputesWithTime.length > 0
        ? resolvedDisputesWithTime.reduce((sum, dispute) => {
            const resolutionTime = dispute.resolvedAt!.getTime() - dispute.createdAt.getTime();
            return sum + resolutionTime;
          }, 0) / resolvedDisputesWithTime.length / (1000 * 60 * 60 * 24) // Convert to days
        : 0;

      const stats: DisputeStats = {
        totalDisputes,
        openDisputes,
        resolvedDisputes,
        averageResolutionTime,
        disputesByType: disputesByType.reduce((acc, item) => {
          acc[item.disputeType] = item._count.disputeType;
          return acc;
        }, {} as { [key: string]: number }),
        disputesByStatus: disputesByStatus.reduce((acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        }, {} as { [key: string]: number })
      };

      return {
        success: true,
        data: stats
      };

    } catch (error) {
      console.error('Get dispute stats error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update seller SRI score
   */
  private async updateSellerSRI(sellerId: string, sriImpact: number): Promise<void> {
    try {
      // TODO: Implement SRI update logic
      console.log(`Updating SRI for seller ${sellerId} with impact ${sriImpact}`);
    } catch (error) {
      console.error('Update seller SRI error:', error);
    }
  }

  /**
   * Process refund
   */
  private async processRefund(orderId: string, refundAmount: number): Promise<void> {
    try {
      // TODO: Implement refund processing
      console.log(`Processing refund for order ${orderId} amount ${refundAmount}`);
    } catch (error) {
      console.error('Process refund error:', error);
    }
  }
}

export default DisputeService;
