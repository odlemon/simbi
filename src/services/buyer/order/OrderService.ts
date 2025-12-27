// @ts-nocheck

import { z } from 'zod';
import { prisma } from "../../../utils/database";
import { logger } from "../../../utils/logger";
import { CouponService } from "../../CouponService";



// Validation schemas
const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string(), // Can be either seller inventory ID or master product ID
    quantity: z.number().min(1)
    // sellerId and unitPrice will be determined from the product lookup
  })).min(1),
  shippingAddressId: z.string(),
  poNumber: z.string().optional(),
  costCenter: z.string().optional(),
  notes: z.string().optional(),
  couponCode: z.string().optional() // Optional coupon code
});

const createOrderFromCartSchema = z.object({
  shippingAddressId: z.string().optional(), // Optional - will use default address if not provided
  poNumber: z.string().optional(), // Optional - can be auto-generated for commercial buyers
  costCenter: z.string().optional(),
  notes: z.string().optional(),
  couponCode: z.string().optional() // Optional coupon code
});

const reorderFromOrderSchema = z.object({
  shippingAddressId: z.string().optional(), // Optional - will use original address if not provided
  poNumber: z.string().optional(), // Optional - can be auto-generated for commercial buyers
  costCenter: z.string().optional(),
  notes: z.string().optional(),
  couponCode: z.string().optional() // Optional coupon code
});

const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING_PAYMENT', 'PAYMENT_FAILED', 'AWAITING_SELLER_ACCEPTANCE', 'SELLER_REJECTED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED', 'DISPUTED', 'REFUNDED', 'PARTIALLY_REFUNDED']),
  notes: z.string().optional()
});

export interface OrderData {
  buyerId: string;
  items: OrderItemData[];
  shippingAddressId: string;
  poNumber?: string;
  costCenter?: string;
  notes?: string;
  couponCode?: string;
}

export interface OrderItemData {
  productId: string; // Can be either seller inventory ID or master product ID
  quantity: number;
  // sellerId and unitPrice will be determined from the product lookup
}

export interface OrderResult {
  success: boolean;
  message: string;
  data?: Order;
  error?: string;
}

export interface OrderTracking {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  payment?: {
    amount: number;
    currency: Currency;
    paymentMethod: string;
    status: PaymentStatus;
    paidAt: Date | null;
    partialPayments: Array<{
      amount: number;
      date: string;
      notes: string | null;
    }>;
  } | null;
  paymentSummary?: {
    orderTotal: number;
    amountPaid: number;
    remainingBalance: number;
    isFullyPaid: boolean;
    isPartiallyPaid: boolean;
  };
  items: OrderItemInfo[];
  shipping: ShippingInfo;
  timeline: OrderTimelineEvent[];
  totalAmount: number;
  currency: Currency;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItemInfo {
  id: string;
  productName: string;
  partNumber: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  sellerName: string;
}

export interface ShippingInfo {
  address: string;
  trackingNumber?: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  carrier?: string;
}

export interface OrderTimelineEvent {
  status: string;
  timestamp: Date;
  description: string;
  actor: string;
}

export interface CommissionBreakdown {
  subtotal: number;
  commission: number;
  total: number;
  currency: string;
  commissionRate: number;
}

export class OrderService {
  private couponService: CouponService;

  constructor() {
    this.couponService = new CouponService();
  }

  /**
   * Get commission rate based on product category
   */
  private getCommissionRate(productName: string): number {
    // Simple commission rate logic - can be enhanced
    const name = productName.toLowerCase();
    if (name.includes('brake') || name.includes('filter')) {
      return 0.10; // 10% for brake parts and filters
    } else if (name.includes('engine') || name.includes('transmission')) {
      return 0.15; // 15% for engine and transmission parts
    } else {
      return 0.12; // 12% default
    }
  }

  /**
   * Create a new order
   */
  async createOrder(orderData: OrderData): Promise<OrderResult> {
    try {
      // Validate input
      const validatedData = createOrderSchema.parse({
        items: orderData.items,
        shippingAddressId: orderData.shippingAddressId,
        poNumber: orderData.poNumber,
        costCenter: orderData.costCenter,
        notes: orderData.notes,
        couponCode: orderData.couponCode
      });

      // Generate order number
      const orderNumber = await this.generateOrderNumber();

      // Process each item to get seller and pricing info
      const processedItems = await Promise.all(
        validatedData.items.map(async (item) => {
          // Try to find the product in seller listings
          const sellerListing = await prisma.sellerInventory.findFirst({
            where: {
              OR: [
                { id: item.productId }, // Try as seller inventory ID
                { masterProductId: item.productId } // Try as master product ID
              ],
              quantity: { gte: item.quantity },
              isActive: true,
              seller: {
                isEligible: true,
                sriScore: { gte: 70 }
              }
            },
            include: {
              masterProduct: {
                select: {
                  id: true,
                  name: true,
                  oemPartNumber: true
                }
              },
              seller: {
                select: {
                  id: true,
                  businessName: true
                }
              }
            }
          });

          if (!sellerListing) {
            throw new Error(`Product ${item.productId} not found in seller listings or insufficient stock`);
          }

          // Calculate commission and display price
          const commissionRate = this.getCommissionRate(sellerListing.masterProduct.name);
          const commission = sellerListing.sellerPrice * commissionRate;
          const displayPrice = sellerListing.sellerPrice + commission;

          return {
            inventoryId: sellerListing.id,
            sellerId: sellerListing.sellerId,
            productName: sellerListing.masterProduct.name,
            partNumber: sellerListing.masterProduct.oemPartNumber,
            quantity: item.quantity,
            unitPrice: sellerListing.sellerPrice,
            displayPrice: displayPrice,
            commission: commission,
            sellerName: sellerListing.seller.businessName
          };
        })
      );

      // Verify buyer exists
      const buyer = await prisma.buyer.findUnique({
        where: { id: orderData.buyerId },
        select: { id: true, email: true, status: true }
      });
      
      if (!buyer) {
        throw new Error(`Buyer ${orderData.buyerId} not found`);
      }
      
      // Verify address exists and belongs to buyer
      const address = await prisma.buyerAddress.findUnique({
        where: { id: validatedData.shippingAddressId },
        select: { id: true, buyerId: true, fullName: true }
      });
      
      if (!address) {
        throw new Error(`Address ${validatedData.shippingAddressId} not found`);
      }
      
      if (address.buyerId !== orderData.buyerId) {
        throw new Error(`Address ${validatedData.shippingAddressId} does not belong to buyer ${orderData.buyerId}`);
      }

      // Group items by seller - IMPORTANT: Split orders by supplier
      const itemsBySeller = new Map<string, typeof processedItems>();
      
      for (const item of processedItems) {
        // Verify seller exists and is eligible
        const seller = await prisma.seller.findUnique({
          where: { id: item.sellerId },
          select: { id: true, businessName: true, isEligible: true }
        });
        
        if (!seller) {
          throw new Error(`Seller ${item.sellerId} not found`);
        }
        
        if (!seller.isEligible) {
          throw new Error(`Seller ${item.sellerId} is not eligible`);
        }

        // Group items by seller
        const sellerItems = itemsBySeller.get(item.sellerId) || [];
        sellerItems.push(item);
        itemsBySeller.set(item.sellerId, sellerItems);
      }

      // Calculate total order amount (across all sellers) for coupon validation
      let totalOrderSubtotal = 0;
      const sellerTotals = new Map<string, number>();
      
      for (const [sellerId, sellerItems] of itemsBySeller.entries()) {
        const sellerSubtotal = sellerItems.reduce((sum, item) => sum + (item.displayPrice * item.quantity), 0);
        sellerTotals.set(sellerId, sellerSubtotal);
        totalOrderSubtotal += sellerSubtotal;
      }

      // Validate coupon if provided
      let couponValidation: any = null;
      let totalDiscountAmount = 0;
      
      if (validatedData.couponCode) {
        // Get product IDs (inventory IDs) for coupon validation
        const productIds = processedItems.map(item => item.inventoryId);
        
        // Validate coupon against total order amount
        // For product-specific coupons, we need to check if the product is in the order
        couponValidation = await this.couponService.validateCoupon(
          validatedData.couponCode,
          orderData.buyerId,
          totalOrderSubtotal,
          undefined, // Will validate per seller order
          productIds,
          undefined // No category IDs needed
        );

        if (!couponValidation.isValid) {
          return {
            success: false,
            message: couponValidation.error || "Invalid coupon code",
            error: "INVALID_COUPON"
          };
        }

        // For product-specific coupons, discount will be calculated per seller order
        // We just need to validate the coupon is valid here
        totalDiscountAmount = 0; // Will be calculated per seller order based on matching products
      }

      // Create one order per seller (grouped by supplier)
      const orders = await Promise.all(
        Array.from(itemsBySeller.entries()).map(async ([sellerId, sellerItems]) => {
          // Calculate totals for this seller's order
          const sellerSubtotal = sellerItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
          const sellerCommission = sellerItems.reduce((sum, item) => sum + (item.commission * item.quantity), 0);
          const sellerTotalBeforeDiscount = sellerItems.reduce((sum, item) => sum + (item.displayPrice * item.quantity), 0);
          
          // Calculate discount for this seller's order
          let sellerDiscountAmount = 0;
          if (couponValidation && couponValidation.isValid) {
            // For product-specific coupons, check if this seller has the product
            if (couponValidation.coupon.couponType === 'PRODUCT_SPECIFIC') {
              const applicableProducts = (couponValidation.coupon.applicableProducts as string[]) || [];
              const sellerHasProduct = sellerItems.some(item => 
                applicableProducts.includes(item.inventoryId)
              );
              
              if (sellerHasProduct && couponValidation.coupon.sellerId === sellerId) {
                // Calculate discount only for items that match the coupon product
                const matchingItems = sellerItems.filter(item => 
                  applicableProducts.includes(item.inventoryId)
                );
                const matchingItemsTotal = matchingItems.reduce(
                  (sum, item) => sum + (item.displayPrice * item.quantity), 
                  0
                );
                
                // Calculate discount for matching items only
                const discountResult = this.couponService.calculateDiscount(
                  couponValidation.coupon,
                  matchingItemsTotal
                );
                sellerDiscountAmount = discountResult.discountAmount;
              } else {
                sellerDiscountAmount = 0; // This seller's order doesn't qualify
              }
            } else {
              // Should not happen for seller-created coupons, but handle gracefully
              sellerDiscountAmount = 0;
            }
          }
          
          const sellerTotal = sellerTotalBeforeDiscount - sellerDiscountAmount;

          // Generate unique order number for this seller
          const sellerOrderNumber = await this.generateOrderNumber();

          // Create order for this seller
          const order = await prisma.order.create({
            data: {
              orderNumber: sellerOrderNumber,
              buyerId: orderData.buyerId,
              sellerId: sellerId,
              addressId: validatedData.shippingAddressId,
              poNumber: validatedData.poNumber,
              costCenter: validatedData.costCenter,
              subtotal: sellerSubtotal,
              shippingCost: 0, // TODO: Calculate shipping cost
              platformCommission: sellerCommission,
              discountAmount: sellerDiscountAmount,
              couponCode: couponValidation?.isValid ? couponValidation.coupon.code : null,
              totalAmount: sellerTotal,
              currency: 'USD', // TODO: Get from buyer preferences
              status: 'PENDING_PAYMENT',
              paymentStatus: 'PENDING'
            },
            include: {
              seller: {
                select: {
                  id: true,
                  businessName: true
                }
              },
              items: true
            }
          });

          // Create order items for this seller's order
          const orderItems = await Promise.all(
            sellerItems.map(async (item) => {
              return prisma.orderItem.create({
                data: {
                  orderId: order.id,
                  inventoryId: item.inventoryId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  displayPrice: item.displayPrice,
                  commission: item.commission
                }
              });
            })
          );

          return {
            ...order,
            items: orderItems,
            discountAmount: sellerDiscountAmount // Include in returned object
          };
        })
      );

      // Send email notifications to sellers and check for low stock
      for (const order of orders) {
        try {
          // Get seller information for email
          const seller = await prisma.seller.findUnique({
            where: { id: order.sellerId },
            select: {
              id: true,
              email: true,
              businessName: true
            }
          });

          if (seller) {
            // Get order items with product names
            const orderItems = await prisma.orderItem.findMany({
              where: { orderId: order.id },
              include: {
                inventory: {
                  include: {
                    masterProduct: {
                      select: {
                        name: true
                      }
                    }
                  }
                }
              }
            });

            // Format order items for email
            const emailOrderItems = orderItems.map(item => ({
              productName: item.inventory.masterProduct.name,
              quantity: item.quantity
            }));

            // Send new order email to seller
            const { emailService } = await import('../../EmailService');
            
            await emailService.sendNewOrderEmail(
              seller.email,
              seller.businessName,
              order.orderNumber,
              order.id,
              emailOrderItems,
              order.totalAmount,
              order.currency || 'USD'
            );

            logger.info('New order email sent to seller', {
              orderId: order.id,
              orderNumber: order.orderNumber,
              sellerEmail: seller.email,
              sellerId: seller.id
            });

            // Check for low stock items and send alert if needed
            // Get order items from database to check current stock levels
            const orderItemsFromDb = await prisma.orderItem.findMany({
              where: { orderId: order.id },
              include: {
                inventory: {
                  include: {
                    masterProduct: {
                      select: {
                        name: true
                      }
                    }
                  }
                }
              }
            });

            const lowStockItems: Array<{
              productName: string;
              currentQuantity: number;
              lowStockThreshold: number;
              inventoryId: string;
            }> = [];

            for (const item of orderItemsFromDb) {
              // Check if current quantity is at or below threshold
              if (item.inventory.quantity <= item.inventory.lowStockThreshold) {
                lowStockItems.push({
                  productName: item.inventory.masterProduct.name,
                  currentQuantity: item.inventory.quantity,
                  lowStockThreshold: item.inventory.lowStockThreshold,
                  inventoryId: item.inventory.id
                });
              }
            }

            // Send low stock alert if any items are low
            if (lowStockItems.length > 0) {
              await emailService.sendLowStockAlertEmail(
                seller.email,
                seller.businessName,
                lowStockItems
              );

              logger.info('Low stock alert email sent to seller', {
                sellerId: seller.id,
                sellerEmail: seller.email,
                lowStockItemsCount: lowStockItems.length,
                orderId: order.id
              });
            }
          }
        } catch (emailError: any) {
          // Log error but don't fail the order creation
          logger.error('Failed to send seller notification emails', {
            orderId: order.id,
            sellerId: order.sellerId,
            error: emailError.message
          });
        }
      }

      // Record coupon usage if coupon was applied and discount was actually given
      if (couponValidation && couponValidation.isValid) {
        // Find the order that actually got the discount
        const orderWithDiscount = orders.find((order: any) => order.discountAmount > 0);
        if (orderWithDiscount) {
          const totalDiscount = orders.reduce((sum: number, order: any) => sum + (order.discountAmount || 0), 0);
          
          // Only record if discount was actually applied (greater than 0)
          if (totalDiscount > 0) {
            try {
              await this.couponService.recordCouponUsage(
                couponValidation.coupon.id,
                orderWithDiscount.id,
                orderData.buyerId,
                totalDiscount,
                totalOrderSubtotal,
                totalOrderSubtotal - totalDiscount
              );
              console.log('✅ Coupon usage recorded successfully', {
                couponId: couponValidation.coupon.id,
                orderId: orderWithDiscount.id,
                discountAmount: totalDiscount
              });
            } catch (error: any) {
              console.error('❌ Error recording coupon usage:', error.message);
              // Don't fail the order if coupon usage recording fails
            }
          }
        }
      }

      return {
        success: true,
        message: `Order created successfully with ${orders.length} order(s) from ${orders.length} supplier(s)`,
        data: {
          orders: orders.map(order => ({
            id: order.id,
            orderNumber: order.orderNumber,
            sellerId: order.sellerId,
            sellerName: order.seller.businessName,
            totalAmount: order.totalAmount,
            itemCount: order.items.length,
            status: order.status
          })),
          totalOrders: orders.length,
          totalAmount: orders.reduce((sum, order) => sum + order.totalAmount, 0)
        }
      };

    } catch (error) {
      console.error('Create order error:', error);
      return {
        success: false,
        message: 'Failed to create order',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Reorder items from a previous order
   * Creates a new order with the same items from an existing order
   */
  async reorderFromOrder(
    buyerId: string,
    orderId: string,
    data: z.infer<typeof reorderFromOrderSchema> = {}
  ): Promise<OrderResult> {
    try {
      // Validate input
      const validatedData = reorderFromOrderSchema.parse(data);

      // Get the original order with all items
      const originalOrder = await prisma.order.findFirst({
        where: {
          id: orderId,
          buyerId: buyerId // Ensure order belongs to buyer
        },
        include: {
          items: {
            include: {
              inventory: {
                include: {
                  masterProduct: true,
                  seller: {
                    select: {
                      id: true,
                      businessName: true,
                      isEligible: true,
                      sriScore: true
                    }
                  }
                }
              }
            }
          },
          shippingAddress: true,
          buyer: {
            select: {
              id: true,
              email: true,
              status: true,
              buyerType: true,
              companyName: true,
              registrationNumber: true,
              addresses: {
                where: { isDefault: true },
                take: 1
              }
            }
          }
        }
      });

      if (!originalOrder) {
        return {
          success: false,
          message: 'Order not found or does not belong to you',
          error: 'ORDER_NOT_FOUND'
        };
      }

      if (originalOrder.items.length === 0) {
        return {
          success: false,
          message: 'Original order has no items to reorder',
          error: 'ORDER_EMPTY'
        };
      }

      // Determine shipping address - use provided one, or original, or buyer's default
      let shippingAddressId = validatedData.shippingAddressId;
      if (!shippingAddressId) {
        // Use original order's address if available, otherwise buyer's default
        shippingAddressId = originalOrder.addressId || originalOrder.buyer.addresses[0]?.id;
      }

      if (!shippingAddressId) {
        return {
          success: false,
          message: 'Shipping address is required. Please provide a shipping address.',
          error: 'SHIPPING_ADDRESS_REQUIRED'
        };
      }

      // Verify the shipping address belongs to the buyer
      const address = await prisma.buyerAddress.findUnique({
        where: { id: shippingAddressId },
        select: { id: true, buyerId: true }
      });

      if (!address || address.buyerId !== buyerId) {
        return {
          success: false,
          message: 'Shipping address not found or does not belong to you',
          error: 'INVALID_ADDRESS'
        };
      }

      // Convert order items to order creation format
      const orderItems = originalOrder.items.map(item => ({
        productId: item.inventoryId, // Use inventoryId from order item
        quantity: item.quantity
      }));

      // Check for unavailable items
      const unavailableItems: string[] = [];
      for (const item of originalOrder.items) {
        const inventory = await prisma.sellerInventory.findUnique({
          where: { id: item.inventoryId },
          select: {
            id: true,
            quantity: true,
            isActive: true,
            seller: {
              select: {
                isEligible: true,
                sriScore: true
              }
            }
          }
        });

        if (!inventory) {
          unavailableItems.push(`${item.inventory.masterProduct.name} (Product no longer available)`);
        } else if (!inventory.isActive) {
          unavailableItems.push(`${item.inventory.masterProduct.name} (Product is inactive)`);
        } else if (inventory.quantity < item.quantity) {
          unavailableItems.push(`${item.inventory.masterProduct.name} (Only ${inventory.quantity} available, requested ${item.quantity})`);
        } else if (!inventory.seller.isEligible || inventory.seller.sriScore < 70) {
          unavailableItems.push(`${item.inventory.masterProduct.name} (Seller no longer eligible)`);
        }
      }

      // If some items are unavailable, return error with details
      if (unavailableItems.length > 0) {
        return {
          success: false,
          message: 'Some items from the original order are no longer available',
          error: 'ITEMS_UNAVAILABLE',
          data: {
            unavailableItems,
            availableItems: originalOrder.items.length - unavailableItems.length,
            totalItems: originalOrder.items.length
          }
        };
      }

      // Generate PO number if not provided (for commercial buyers)
      let poNumber = validatedData.poNumber;
      if (!poNumber && originalOrder.buyer.buyerType === 'COMMERCIAL') {
        const companyIdentifier = originalOrder.buyer.companyName || 
                                  originalOrder.buyer.registrationNumber || 
                                  buyerId.substring(0, 8);
        const timestamp = Date.now();
        poNumber = `PO-${companyIdentifier.toUpperCase().replace(/\s+/g, '-')}-${timestamp}`;
      }

      // Create new order using existing createOrder method
      const orderData: OrderData = {
        buyerId,
        items: orderItems,
        shippingAddressId: shippingAddressId,
        poNumber: poNumber || originalOrder.poNumber || undefined,
        costCenter: validatedData.costCenter || originalOrder.costCenter || undefined,
        notes: validatedData.notes || `Reordered from order ${originalOrder.orderNumber}`,
        couponCode: validatedData.couponCode || undefined
      };

      const orderResult = await this.createOrder(orderData);

      if (orderResult.success) {
        return {
          success: true,
          message: `Order recreated successfully from order ${originalOrder.orderNumber}`,
          data: {
            ...orderResult.data,
            originalOrderNumber: originalOrder.orderNumber,
            originalOrderId: originalOrder.id
          }
        };
      } else {
        return orderResult;
      }

    } catch (error) {
      console.error('Reorder from order error:', error);
      return {
        success: false,
        message: 'Failed to reorder items',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create order from cart - automatically groups items by seller
   * Uses buyer's default address and stored data if not provided
   */
  async createOrderFromCart(buyerId: string, data: z.infer<typeof createOrderFromCartSchema> = {}): Promise<OrderResult> {
    try {
      // Validate input (all fields are optional now)
      const validatedData = createOrderFromCartSchema.parse(data);

      // Get buyer with addresses
      const buyer = await prisma.buyer.findUnique({
        where: { id: buyerId },
        include: {
          addresses: {
            where: { isDefault: true },
            orderBy: { createdAt: 'asc' },
            take: 1
          }
        }
      });

      if (!buyer) {
        return {
          success: false,
          message: 'Buyer not found',
          error: 'BUYER_NOT_FOUND'
        };
      }

      // Get default shipping address
      let shippingAddressId = validatedData.shippingAddressId;
      
      if (!shippingAddressId) {
        // Use default address if available
        if (buyer.addresses && buyer.addresses.length > 0) {
          shippingAddressId = buyer.addresses[0].id;
        } else {
          // Try to get any address
          const anyAddress = await prisma.buyerAddress.findFirst({
            where: { buyerId },
            orderBy: { createdAt: 'asc' }
          });
          
          if (!anyAddress) {
            return {
              success: false,
              message: 'No shipping address found. Please add an address to your profile.',
              error: 'NO_ADDRESS'
            };
          }
          
          shippingAddressId = anyAddress.id;
        }
      }

      // Verify address belongs to buyer
      const address = await prisma.buyerAddress.findFirst({
        where: {
          id: shippingAddressId,
          buyerId
        }
      });

      if (!address) {
        return {
          success: false,
          message: 'Shipping address not found or does not belong to you',
          error: 'INVALID_ADDRESS'
        };
      }

      // Get cart items
      const cart = await prisma.cart.findUnique({
        where: { buyerId }
      });

      if (!cart) {
        return {
          success: false,
          message: 'Cart not found',
          error: 'CART_NOT_FOUND'
        };
      }

      const cartItems = await prisma.cartItem.findMany({
        where: { cartId: cart.id },
        include: {
          inventory: {
            include: {
              masterProduct: {
                include: {
                  category: true
                }
              },
              seller: {
                select: {
                  id: true,
                  businessName: true,
                  isEligible: true,
                  sriScore: true
                }
              }
            }
          }
        }
      });

      if (cartItems.length === 0) {
        return {
          success: false,
          message: 'Cart is empty',
          error: 'CART_EMPTY'
        };
      }

      // Validate all items are in stock
      const outOfStockItems = cartItems.filter(item => 
        item.inventory.quantity < item.quantity || !item.inventory.isActive
      );

      if (outOfStockItems.length > 0) {
        return {
          success: false,
          message: 'Some items are out of stock or unavailable',
          error: 'OUT_OF_STOCK'
        };
      }

      // Convert cart items to order items format
      const orderItems = cartItems.map(cartItem => ({
        productId: cartItem.inventory.id, // Use inventoryId from cart
        quantity: cartItem.quantity
      }));

      // Use buyer's stored data if not provided
      // For commercial buyers, can use registration number or company name for PO generation
      let poNumber = validatedData.poNumber;
      if (!poNumber && buyer.buyerType === 'COMMERCIAL') {
        // Auto-generate PO number from company info if available
        const companyIdentifier = buyer.companyName || buyer.registrationNumber || buyer.id.substring(0, 8);
        const timestamp = Date.now();
        poNumber = `PO-${companyIdentifier.toUpperCase().replace(/\s+/g, '-')}-${timestamp}`;
      }

      // Create order using existing createOrder method (it will group by seller)
      const orderData: OrderData = {
        buyerId,
        items: orderItems,
        shippingAddressId: shippingAddressId,
        poNumber: poNumber,
        costCenter: validatedData.costCenter || undefined,
        notes: validatedData.notes || undefined,
        couponCode: validatedData.couponCode || undefined
      };

      const orderResult = await this.createOrder(orderData);

      // Remove ordered items from cart after successful order creation
      if (orderResult.success) {
        // Get all inventory IDs that were successfully ordered
        const orderedInventoryIds = orderItems.map(item => item.productId);
        
        // Remove only the items that were successfully ordered from the cart
        await prisma.cartItem.deleteMany({
          where: {
            cartId: cart.id,
            inventoryId: {
              in: orderedInventoryIds
            }
          }
        });
      }

      return orderResult;

    } catch (error) {
      console.error('Create order from cart error:', error);
      return {
        success: false,
        message: 'Failed to create order from cart',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string, buyerId: string): Promise<OrderResult> {
    try {
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          buyerId
        },
        include: {
          items: {
            include: {
              inventory: {
                include: {
                  masterProduct: true
                }
              }
            }
          },
          shippingAddress: true,
          buyer: true,
          seller: true
        }
      });

      if (!order) {
        return {
          success: false,
          message: 'Order not found',
          error: 'ORDER_NOT_FOUND'
        };
      }

      return {
        success: true,
        data: order
      };

    } catch (error) {
      console.error('Get order error:', error);
      return {
        success: false,
        message: 'Failed to get order',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get comprehensive order history for buyer with all order data
   */
  async getOrderHistory(buyerId: string, page: number = 1, limit: number = 20): Promise<{ success: boolean; data?: any[]; total?: number; error?: string }> {
    try {
      const skip = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where: { buyerId },
          include: {
            // Payment information
            payment: {
              select: {
                id: true,
                amount: true,
                currency: true,
                paymentMethod: true,
                status: true,
                gatewayProvider: true,
                gatewayTransactionId: true,
                paidAt: true,
                failedAt: true,
                failureReason: true,
                refundedAt: true,
                refundAmount: true,
                metadata: true
              }
            },
            // Order items with full product details
            items: {
              include: {
                inventory: {
                  include: {
                    masterProduct: {
                      include: {
                        category: {
                          select: {
                            id: true,
                            name: true,
                            description: true
                          }
                        }
                      }
                    },
                    seller: {
                      select: {
                        id: true,
                        businessName: true,
                        email: true,
                        contactNumber: true
                      }
                    }
                  }
                }
              }
            },
            // Shipping address
            shippingAddress: {
              select: {
                id: true,
                fullName: true,
                addressLine1: true,
                addressLine2: true,
                city: true,
                province: true,
                postalCode: true,
                phoneNumber: true,
                isDefault: true
              }
            },
            // Seller information
            seller: {
              select: {
                id: true,
                businessName: true,
                email: true,
                contactNumber: true,
                businessAddress: true,
                isEligible: true,
                sriScore: true
              }
            },
            // Driver information (if dispatched)
            driver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                vehicleType: true,
                vehiclePlate: true,
                status: true
              }
            },
            // Shipment information
            shipment: {
              include: {
                carrier: {
                  select: {
                    id: true,
                    name: true,
                    contactPhone: true
                  }
                }
              }
            },
            // Coupon usage (if coupon was applied)
            couponUsage: {
              select: {
                id: true,
                discountAmount: true,
                orderTotal: true,
                orderTotalAfterDiscount: true,
                usedAt: true,
                coupon: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    description: true,
                    discountType: true,
                    discountValue: true
                  }
                }
              }
            },
            // Buyer information
            buyer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                companyName: true,
                buyerType: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.order.count({
          where: { buyerId }
        })
      ]);

      // Format orders with all data
      const formattedOrders = orders.map(order => ({
        // Order basic information
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        currency: order.currency,
        
        // Pricing breakdown
        pricing: {
          subtotal: order.subtotal,
          shippingCost: order.shippingCost,
          platformCommission: order.platformCommission,
          discountAmount: order.discountAmount || 0,
          totalAmount: order.totalAmount,
          exchangeRate: order.exchangeRate,
          exchangeRateTimestamp: order.exchangeRateTimestamp
        },
        
        // Coupon information
        coupon: order.couponCode ? {
          code: order.couponCode,
          discountAmount: order.discountAmount || 0,
          usage: order.couponUsage ? {
            discountAmount: order.couponUsage.discountAmount,
            orderTotal: order.couponUsage.orderTotal,
            orderTotalAfterDiscount: order.couponUsage.orderTotalAfterDiscount,
            usedAt: order.couponUsage.usedAt,
            couponDetails: order.couponUsage.coupon
          } : null
        } : null,
        
        // Order items with full details
        items: order.items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          displayPrice: item.displayPrice,
          commission: item.commission,
          product: {
            inventoryId: item.inventory.id,
            sellerSku: item.inventory.sellerSku,
            productName: item.inventory.masterProduct.name,
            oemPartNumber: item.inventory.masterProduct.oemPartNumber,
            manufacturer: item.inventory.masterProduct.manufacturer,
            category: item.inventory.masterProduct.category ? {
              id: item.inventory.masterProduct.category.id,
              name: item.inventory.masterProduct.category.name,
              description: item.inventory.masterProduct.category.description
            } : null
          },
          seller: {
            id: item.inventory.seller.id,
            businessName: item.inventory.seller.businessName,
            email: item.inventory.seller.email,
            contactNumber: item.inventory.seller.contactNumber
          }
        })),
        
        // Seller information
        seller: {
          id: order.seller.id,
          businessName: order.seller.businessName,
          email: order.seller.email,
          contactNumber: order.seller.contactNumber,
          businessAddress: order.seller.businessAddress,
          isEligible: order.seller.isEligible,
          sriScore: order.seller.sriScore
        },
        
        // Shipping information
        shipping: {
          address: order.shippingAddress,
          estimatedDeliveryDate: order.estimatedDeliveryDate,
          actualDeliveryDate: order.actualDeliveryDate
        },
        
        // Payment information
        payment: order.payment ? {
          id: order.payment.id,
          amount: order.payment.amount,
          currency: order.payment.currency,
          paymentMethod: order.payment.paymentMethod,
          status: order.payment.status,
          gatewayProvider: order.payment.gatewayProvider,
          gatewayTransactionId: order.payment.gatewayTransactionId,
          paidAt: order.payment.paidAt,
          failedAt: order.payment.failedAt,
          failureReason: order.payment.failureReason,
          refundedAt: order.payment.refundedAt,
          refundAmount: order.payment.refundAmount,
          metadata: order.payment.metadata
        } : null,
        
        // Shipment/tracking information
        shipment: order.shipment ? {
          id: order.shipment.id,
          trackingNumber: order.shipment.trackingNumber,
          carrier: order.shipment.carrier ? {
            id: order.shipment.carrier.id,
            name: order.shipment.carrier.name,
            contactPhone: order.shipment.carrier.contactPhone
          } : null,
          status: order.shipment.status,
          estimatedDelivery: order.shipment.estimatedDelivery,
          actualDelivery: order.shipment.actualDelivery,
          weight: order.shipment.weight,
          length: order.shipment.length,
          width: order.shipment.width,
          height: order.shipment.height,
          trackingHistory: order.shipment.trackingHistory,
          createdAt: order.shipment.createdAt
        } : null,
        
        // Driver information (if dispatched)
        driver: order.driver ? {
          id: order.driver.id,
          firstName: order.driver.firstName,
          lastName: order.driver.lastName,
          phoneNumber: order.driver.phoneNumber,
          vehicleType: order.driver.vehicleType,
          vehiclePlate: order.driver.vehiclePlate,
          status: order.driver.status
        } : null,
        
        // Order metadata
        metadata: {
          poNumber: order.poNumber,
          costCenter: order.costCenter,
          sellerAcceptedAt: order.sellerAcceptedAt,
          sellerRejectedAt: order.sellerRejectedAt,
          rejectionReason: order.rejectionReason,
          dispatchNotes: order.dispatchNotes,
          dispatchedAt: order.dispatchedAt,
          dispatchedBy: order.dispatchedBy,
          ipAddress: order.ipAddress,
          userAgent: order.userAgent
        },
        
        // Timestamps
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      }));

      return {
        success: true,
        data: formattedOrders,
        total
      };

    } catch (error) {
      console.error('Get order history error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get orders for buyer (simplified version - kept for backward compatibility)
   */
  async getBuyerOrders(buyerId: string, page: number = 1, limit: number = 20): Promise<{ success: boolean; data?: Order[]; total?: number; error?: string }> {
    try {
      const skip = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where: { buyerId },
          include: {
            payment: true, // Include payment information
            items: {
              include: {
                inventory: {
                  include: {
                    masterProduct: true
                  }
                }
              }
            },
            shippingAddress: true,
            seller: true
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.order.count({
          where: { buyerId }
        })
      ]);

      return {
        success: true,
        data: orders,
        total
      };

    } catch (error) {
      console.error('Get buyer orders error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, buyerId: string, statusData: z.infer<typeof updateOrderStatusSchema>): Promise<OrderResult> {
    try {
      // Validate input
      const validatedData = updateOrderStatusSchema.parse(statusData);

      // Check if order exists and belongs to buyer
      const existingOrder = await prisma.order.findFirst({
        where: {
          id: orderId,
          buyerId
        }
      });

      if (!existingOrder) {
        return {
          success: false,
          message: 'Order not found',
          error: 'ORDER_NOT_FOUND'
        };
      }

      // Update order status
      const order = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: validatedData.status,
          updatedAt: new Date()
        }
      });

      return {
        success: true,
        message: 'Order status updated successfully',
        data: order
      };

    } catch (error) {
      console.error('Update order status error:', error);
      return {
        success: false,
        message: 'Failed to update order status',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Track order
   */
  async trackOrder(orderId: string, buyerId: string): Promise<{ success: boolean; data?: OrderTracking; error?: string }> {
    try {
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          buyerId
        },
        include: {
          payment: true, // Include payment information for tracking
          items: {
            include: {
              inventory: {
                include: {
                  masterProduct: true
                }
              }
            }
          },
          shippingAddress: true,
          shipment: true,
          buyer: true,
          seller: true
        }
      });

      if (!order) {
        return {
          success: false,
          error: 'ORDER_NOT_FOUND'
        };
      }

      const tracking: OrderTracking = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        payment: order.payment ? {
          amount: order.payment.amount,
          currency: order.payment.currency,
          paymentMethod: order.payment.paymentMethod,
          status: order.payment.status,
          paidAt: order.payment.paidAt,
          partialPayments: order.payment.metadata ? (order.payment.metadata as any).partialPayments || [] : []
        } : null,
        paymentSummary: {
          orderTotal: order.totalAmount,
          amountPaid: order.payment?.amount || 0,
          remainingBalance: order.totalAmount - (order.payment?.amount || 0),
          isFullyPaid: order.paymentStatus === 'COMPLETED',
          isPartiallyPaid: order.paymentStatus === 'PARTIAL'
        },
        items: order.items.map(item => ({
          id: item.id,
          productName: item.inventory.masterProduct.description,
          partNumber: item.inventory.masterProduct.partNumber,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotalUsd,
          sellerName: order.seller.businessName
        })),
        shipping: {
          address: `${order.shippingAddress.addressLine1}, ${order.shippingAddress.city}`,
          trackingNumber: order.shipment?.trackingNumber,
          estimatedDelivery: order.estimatedDeliveryDate,
          actualDelivery: order.actualDeliveryDate,
          carrier: order.shipment?.carrier?.name
        },
        timeline: await this.getOrderTimeline(order.id),
        totalAmount: order.totalAmount,
        currency: order.currency,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      };

      return {
        success: true,
        data: tracking
      };

    } catch (error) {
      console.error('Track order error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Calculate commission for order items
   */
  async calculateCommission(orderItems: OrderItemData[]): Promise<CommissionBreakdown> {
    try {
      let subtotal = 0;
      let totalCommission = 0;

      for (const item of orderItems) {
        const lineTotal = item.quantity * item.unitPrice;
        subtotal += lineTotal;
        
        // Calculate commission (10% default, TODO: get from category)
        const commission = lineTotal * 0.1;
        totalCommission += commission;
      }

      return {
        subtotal,
        commission: totalCommission,
        total: subtotal + totalCommission,
        currency: 'USD',
        commissionRate: 0.1
      };

    } catch (error) {
      console.error('Calculate commission error:', error);
      return {
        subtotal: 0,
        commission: 0,
        total: 0,
        currency: 'USD',
        commissionRate: 0
      };
    }
  }

  /**
   * Cancel order - handles refunds based on order stage and payment status
   */
  async cancelOrder(orderId: string, buyerId: string, reason?: string): Promise<OrderResult> {
    try {
      // Get order with payment details
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          buyerId
        },
        include: {
          payment: true
        }
      });

      if (!order) {
        return {
          success: false,
          message: 'Order not found',
          error: 'ORDER_NOT_FOUND'
        };
      }

      // Check if order can be cancelled based on status
      const cancellableStatuses = [
        'PENDING_PAYMENT',
        'PAYMENT_FAILED',
        'AWAITING_SELLER_ACCEPTANCE',
        'SELLER_REJECTED',
        'AWAITING_PAYMENT',
        'PROCESSING'
      ];

      const nonCancellableStatuses = [
        'DELIVERED',
        'CANCELLED',
        'REFUNDED',
        'PARTIALLY_REFUNDED',
        'DISPUTED'
      ];

      if (nonCancellableStatuses.includes(order.status)) {
        return {
          success: false,
          message: `Order cannot be cancelled. Current status: ${order.status}`,
          error: 'ORDER_CANNOT_BE_CANCELLED'
        };
      }

      if (!cancellableStatuses.includes(order.status)) {
        // For SHIPPED orders, allow cancellation but may require admin approval
        if (order.status === 'SHIPPED') {
          return {
            success: false,
            message: 'Order has been shipped. Please contact support to cancel.',
            error: 'ORDER_ALREADY_SHIPPED'
          };
        }
      }

      // Check if payment was made (to inform buyer about refund process)
      const paymentStatus = order.paymentStatus;
      const hasPayment = order.payment && (
        paymentStatus === 'COMPLETED' || 
        paymentStatus === 'PARTIAL'
      );

      let refundInfo = null;
      
      if (hasPayment && order.payment) {
        // Determine refund amount for information purposes only
        let refundAmount = 0;
        if (paymentStatus === 'COMPLETED') {
          refundAmount = order.totalAmount;
        } else if (paymentStatus === 'PARTIAL') {
          refundAmount = order.payment.amount || 0;
        }
        
        refundInfo = {
          refundRequired: true,
          refundAmount: refundAmount,
          currency: order.currency
        };
      }

      // Simply cancel the order - refunds handled manually by admin
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date()
        },
        include: {
          payment: true
        }
      });

      // Prepare response message
      let message = 'Order cancelled successfully';
      if (refundInfo) {
        message += `. A refund of ${refundInfo.refundAmount} ${refundInfo.currency} may be processed. Please contact support for refund details.`;
      }

      return {
        success: true,
        message,
        data: {
          ...updatedOrder,
          cancellationDetails: {
            refundInfo: refundInfo,
            cancelledAt: new Date(),
            reason: reason || null
          }
        }
      };

    } catch (error) {
      console.error('Cancel order error:', error);
      return {
        success: false,
        message: 'Failed to cancel order',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate unique order number
   */
  private async generateOrderNumber(): Promise<string> {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  /**
   * Calculate order totals
   */
  private async calculateOrderTotals(items: OrderItemData[]): Promise<{ subtotal: number; commission: number; total: number }> {
    let subtotal = 0;
    let totalCommission = 0;

    for (const item of items) {
      const lineTotal = item.quantity * item.unitPrice;
      subtotal += lineTotal;
      
      // Calculate commission (10% default)
      const commission = lineTotal * 0.1;
      totalCommission += commission;
    }

    return {
      subtotal,
      commission: totalCommission,
      total: subtotal + totalCommission
    };
  }

  /**
   * Get order timeline events
   */
  private async getOrderTimeline(orderId: string): Promise<OrderTimelineEvent[]> {
    // TODO: Implement order timeline tracking
    return [
      {
        status: 'ORDER_CREATED',
        timestamp: new Date(),
        description: 'Order was created',
        actor: 'System'
      }
    ];
  }

  /**
   * Sync payment status between buyer and seller
   * This method checks if a seller has recorded a cash payment
   */
  async syncPaymentStatus(orderId: string): Promise<OrderResult> {
    try {
      // Get order with payment details
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          payment: true,
          buyer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      if (!order) {
        return {
          success: false,
          message: "Order not found",
          error: "ORDER_NOT_FOUND"
        };
      }

      // If payment exists and is completed, update order status
      if (order.payment && order.payment.status === 'COMPLETED') {
        // Update order status to AWAITING_SELLER_ACCEPTANCE if it's still PENDING_PAYMENT
        if (order.status === 'PENDING_PAYMENT') {
          await prisma.order.update({
            where: { id: orderId },
            data: {
              status: 'AWAITING_SELLER_ACCEPTANCE',
              updatedAt: new Date()
            }
          });

          // Activity log removed - ActivityLog is admin-only model
          // Payment activity is already tracked in Payment and Order models

          return {
            success: true,
            message: "Payment status synced successfully",
            data: {
              ...order,
              status: 'AWAITING_SELLER_ACCEPTANCE'
            }
          };
        }
      }

      return {
        success: true,
        message: "Payment status is up to date",
        data: order
      };

    } catch (error: any) {
      return {
        success: false,
        message: "Failed to sync payment status",
        error: error.message
      };
    }
  }

  /**
   * Get order with payment status for buyer
   */
  async getOrderWithPaymentStatus(orderId: string, buyerId: string): Promise<OrderResult> {
    try {
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          buyerId: buyerId
        },
        include: {
          payment: true, // Full payment details including partial payment history
          items: {
            include: {
              inventory: {
                include: {
                  masterProduct: true
                }
              }
            }
          },
          shippingAddress: true,
          seller: {
            select: {
              id: true,
              businessName: true
            }
          }
        }
      });

      if (!order) {
        return {
          success: false,
          message: "Order not found",
          error: "ORDER_NOT_FOUND"
        };
      }

      // Sync payment status
      const syncResult = await this.syncPaymentStatus(orderId);
      if (syncResult.success && syncResult.data) {
        return {
          success: true,
          message: "Order retrieved successfully",
          data: syncResult.data
        };
      }

      return {
        success: true,
        message: "Order retrieved successfully",
        data: order
      };

    } catch (error: any) {
      return {
        success: false,
        message: "Failed to get order with payment status",
        error: error.message
      };
    }
  }

  /**
   * Get payment details for a specific order
   */
  async getOrderPaymentDetails(orderId: string, buyerId: string): Promise<{ success: boolean; data?: any; message?: string; error?: string }> {
    try {
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          buyerId: buyerId
        },
        include: {
          payment: true,
          seller: {
            select: {
              id: true,
              businessName: true
            }
          }
        }
      });

      if (!order) {
        return {
          success: false,
          message: "Order not found",
          error: "ORDER_NOT_FOUND"
        };
      }

      // Extract payment history from metadata
      const partialPayments = order.payment?.metadata 
        ? (order.payment.metadata as any).partialPayments || [] 
        : [];

      const paidAmount = order.payment?.amount || 0;
      const totalToBePaid = order.totalAmount;
      const remainingBalance = totalToBePaid - paidAmount;

      // Format payment history
      const paymentHistory = partialPayments.map((pp: any) => ({
        amount: pp.amount,
        date: pp.date,
        notes: pp.notes || null,
        recordedBy: pp.recordedBy || null
      }));

      // Format payment details
      const paymentData = {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          currency: order.currency,
          createdAt: order.createdAt
        },
        payment: {
          totalToBePaid: totalToBePaid,
          paid: paidAmount,
          remaining: remainingBalance,
          isFullyPaid: order.paymentStatus === 'COMPLETED',
          isPartiallyPaid: order.paymentStatus === 'PARTIAL',
          hasNoPayment: !order.payment || order.paymentStatus === 'PENDING'
        },
        paymentDetails: order.payment ? {
          id: order.payment.id,
          status: order.payment.status,
          paymentMethod: order.payment.paymentMethod,
          paidAt: order.payment.paidAt,
          currency: order.payment.currency
        } : null,
        paymentHistory: paymentHistory,
        seller: order.seller
      };

      return {
        success: true,
        data: paymentData,
        message: "Payment details retrieved successfully"
      };

    } catch (error: any) {
      return {
        success: false,
        message: "Failed to get payment details",
        error: error.message
      };
    }
  }
}

export default OrderService;
