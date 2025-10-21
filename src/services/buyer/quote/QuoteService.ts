
import { z } from 'zod';
import { prisma } from "../../../utils/database";



// Validation schemas
const createQuoteRequestSchema = z.object({
  productId: z.string(),
  quantity: z.number().min(1),
  message: z.string().optional(),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  expectedDeliveryDate: z.string().optional()
});

const respondToQuoteSchema = z.object({
  quoteId: z.string(),
  price: z.number().min(0),
  availability: z.enum(['IN_STOCK', 'OUT_OF_STOCK', 'BACKORDER']),
  estimatedDelivery: z.string().optional(),
  message: z.string().optional(),
  validUntil: z.string().optional()
});

const acceptQuoteSchema = z.object({
  quoteId: z.string(),
  notes: z.string().optional()
});

export interface QuoteRequest {
  id: string;
  productId: string;
  buyerId: string;
  sellerId: string;
  quantity: number;
  message?: string;
  urgency: string;
  expectedDeliveryDate?: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  product: {
    partNumber: string;
    description: string;
    make: string;
    model: string;
    year: number;
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
  quote?: {
    id: string;
    price: number;
    availability: string;
    estimatedDelivery?: Date;
    message?: string;
    validUntil?: Date;
    respondedAt: Date;
  };
}

export interface QuoteResponse {
  id: string;
  quoteRequestId: string;
  price: number;
  availability: string;
  estimatedDelivery?: Date;
  message?: string;
  validUntil?: Date;
  status: string;
  respondedAt: Date;
  seller: {
    businessName: string;
    email: string;
    phoneNumber: string;
  };
}

export interface QuoteStats {
  totalRequests: number;
  pendingRequests: number;
  respondedRequests: number;
  acceptedQuotes: number;
  averageResponseTime: number;
  requestsByUrgency: { [key: string]: number };
  requestsByStatus: { [key: string]: number };
}

export class QuoteService {
  /**
   * Create a quote request
   */
  async createQuoteRequest(buyerId: string, requestData: z.infer<typeof createQuoteRequestSchema>): Promise<{ success: boolean; data?: QuoteRequest; error?: string }> {
    try {
      const validatedData = createQuoteRequestSchema.parse(requestData);

      // Get product details
      const product = await prisma.masterProduct.findUnique({
        where: { id: validatedData.productId },
        include: {
          sellerInventory: {
            where: {
              stock: { gt: 0 },
              seller: {
                isEligible: true,
                sriScore: { gte: 70 }
              }
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
          }
        }
      });

      if (!product) {
        return {
          success: false,
          error: 'PRODUCT_NOT_FOUND'
        };
      }

      // Find the best seller (highest SRI score)
      const bestSeller = product.sellerInventory
        .sort((a, b) => b.seller.sriScore - a.seller.sriScore)[0];

      if (!bestSeller) {
        return {
          success: false,
          error: 'NO_ELIGIBLE_SELLERS'
        };
      }

      // Create quote request
      const quoteRequest = await prisma.quoteRequest.create({
        data: {
          productId: validatedData.productId,
          buyerId,
          sellerId: bestSeller.seller.id,
          quantity: validatedData.quantity,
          message: validatedData.message,
          urgency: validatedData.urgency,
          expectedDeliveryDate: validatedData.expectedDeliveryDate ? new Date(validatedData.expectedDeliveryDate) : null,
          status: 'PENDING'
        },
        include: {
          product: {
            select: {
              partNumber: true,
              description: true,
              make: true,
              model: true,
              year: true
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
        data: quoteRequest
      };

    } catch (error) {
      console.error('Create quote request error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get quote requests for buyer
   */
  async getBuyerQuoteRequests(buyerId: string, page: number = 1, limit: number = 20): Promise<{ success: boolean; data?: QuoteRequest[]; total?: number; error?: string }> {
    try {
      const skip = (page - 1) * limit;

      const [requests, total] = await Promise.all([
        prisma.quoteRequest.findMany({
          where: { buyerId },
          include: {
            product: {
              select: {
                partNumber: true,
                description: true,
                make: true,
                model: true,
                year: true
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
            },
            quote: {
              select: {
                id: true,
                price: true,
                availability: true,
                estimatedDelivery: true,
                message: true,
                validUntil: true,
                respondedAt: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.quoteRequest.count({
          where: { buyerId }
        })
      ]);

      return {
        success: true,
        data: requests,
        total
      };

    } catch (error) {
      console.error('Get buyer quote requests error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get quote requests for seller
   */
  async getSellerQuoteRequests(sellerId: string, page: number = 1, limit: number = 20): Promise<{ success: boolean; data?: QuoteRequest[]; total?: number; error?: string }> {
    try {
      const skip = (page - 1) * limit;

      const [requests, total] = await Promise.all([
        prisma.quoteRequest.findMany({
          where: { sellerId },
          include: {
            product: {
              select: {
                partNumber: true,
                description: true,
                make: true,
                model: true,
                year: true
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
            },
            quote: {
              select: {
                id: true,
                price: true,
                availability: true,
                estimatedDelivery: true,
                message: true,
                validUntil: true,
                respondedAt: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.quoteRequest.count({
          where: { sellerId }
        })
      ]);

      return {
        success: true,
        data: requests,
        total
      };

    } catch (error) {
      console.error('Get seller quote requests error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Respond to quote request (seller)
   */
  async respondToQuote(sellerId: string, responseData: z.infer<typeof respondToQuoteSchema>): Promise<{ success: boolean; data?: QuoteResponse; error?: string }> {
    try {
      const validatedData = respondToQuoteSchema.parse(responseData);

      // Verify quote request exists and belongs to seller
      const quoteRequest = await prisma.quoteRequest.findFirst({
        where: {
          id: validatedData.quoteId,
          sellerId
        }
      });

      if (!quoteRequest) {
        return {
          success: false,
          error: 'QUOTE_REQUEST_NOT_FOUND'
        };
      }

      // Create quote response
      const quote = await prisma.quoteResponse.create({
        data: {
          quoteRequestId: validatedData.quoteId,
          price: validatedData.price,
          availability: validatedData.availability,
          estimatedDelivery: validatedData.estimatedDelivery ? new Date(validatedData.estimatedDelivery) : null,
          message: validatedData.message,
          validUntil: validatedData.validUntil ? new Date(validatedData.validUntil) : null,
          status: 'PENDING'
        },
        include: {
          seller: {
            select: {
              businessName: true,
              email: true,
              contactNumber: true
            }
          }
        }
      });

      // Update quote request status
      await prisma.quoteRequest.update({
        where: { id: validatedData.quoteId },
        data: { status: 'RESPONDED' }
      });

      return {
        success: true,
        data: quote
      };

    } catch (error) {
      console.error('Respond to quote error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Accept quote (buyer)
   */
  async acceptQuote(buyerId: string, acceptData: z.infer<typeof acceptQuoteSchema>): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const validatedData = acceptQuoteSchema.parse(acceptData);

      // Verify quote exists and belongs to buyer
      const quote = await prisma.quoteResponse.findFirst({
        where: {
          id: validatedData.quoteId,
          quoteRequest: {
            buyerId
          }
        }
      });

      if (!quote) {
        return {
          success: false,
          error: 'QUOTE_NOT_FOUND'
        };
      }

      // Update quote status
      await prisma.quoteResponse.update({
        where: { id: validatedData.quoteId },
        data: { status: 'ACCEPTED' }
      });

      // Update quote request status
      await prisma.quoteRequest.update({
        where: { id: quote.quoteRequestId },
        data: { status: 'ACCEPTED' }
      });

      // TODO: Create order from accepted quote
      const orderData = await this.createOrderFromQuote(quote.id);

      return {
        success: true,
        data: {
          quoteId: quote.id,
          orderData
        }
      };

    } catch (error) {
      console.error('Accept quote error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get quote statistics
   */
  async getQuoteStats(): Promise<{ success: boolean; data?: QuoteStats; error?: string }> {
    try {
      const [
        totalRequests,
        pendingRequests,
        respondedRequests,
        acceptedQuotes,
        requestsByUrgency,
        requestsByStatus
      ] = await Promise.all([
        prisma.quoteRequest.count(),
        prisma.quoteRequest.count({
          where: { status: 'PENDING' }
        }),
        prisma.quoteRequest.count({
          where: { status: 'RESPONDED' }
        }),
        prisma.quoteRequest.count({
          where: { status: 'ACCEPTED' }
        }),
        prisma.quoteRequest.groupBy({
          by: ['urgency'],
          _count: { urgency: true }
        }),
        prisma.quoteRequest.groupBy({
          by: ['status'],
          _count: { status: true }
        })
      ]);

      // Calculate average response time
      const respondedRequestsWithTime = await prisma.quoteRequest.findMany({
        where: {
          status: 'RESPONDED',
          quote: {
            respondedAt: { not: null }
          }
        },
        include: {
          quote: {
            select: {
              respondedAt: true
            }
          }
        }
      });

      const averageResponseTime = respondedRequestsWithTime.length > 0
        ? respondedRequestsWithTime.reduce((sum, request) => {
            const responseTime = request.quote!.respondedAt.getTime() - request.createdAt.getTime();
            return sum + responseTime;
          }, 0) / respondedRequestsWithTime.length / (1000 * 60 * 60) // Convert to hours
        : 0;

      const stats: QuoteStats = {
        totalRequests,
        pendingRequests,
        respondedRequests,
        acceptedQuotes,
        averageResponseTime,
        requestsByUrgency: requestsByUrgency.reduce((acc, item) => {
          acc[item.urgency] = item._count.urgency;
          return acc;
        }, {} as { [key: string]: number }),
        requestsByStatus: requestsByStatus.reduce((acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        }, {} as { [key: string]: number })
      };

      return {
        success: true,
        data: stats
      };

    } catch (error) {
      console.error('Get quote stats error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create order from accepted quote
   */
  private async createOrderFromQuote(quoteId: string): Promise<any> {
    try {
      // TODO: Implement order creation from quote
      console.log(`Creating order from quote ${quoteId}`);
      return { orderId: 'mock-order-id' };
    } catch (error) {
      console.error('Create order from quote error:', error);
      throw error;
    }
  }
}

export default QuoteService;
