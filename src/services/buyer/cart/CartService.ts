// @ts-nocheck

import { z } from 'zod';
import { prisma } from "../../../utils/database";
import { CommercePricingService } from "../../admin/settings/CommercePricingService";

// Validation schemas
const addToCartSchema = z.object({
  inventoryId: z.string().uuid(),
  quantity: z.number().int().min(1)
});

const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0) // Allow 0 to delete item
});

const removeFromCartSchema = z.object({
  cartItemId: z.string().uuid()
});

export interface CartItemResult {
  id: string;
  inventoryId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    oemPartNumber: string;
    manufacturer: string;
    imageUrls: string[] | null;
    category: string;
    subcategory: string;
  };
  seller: {
    id: string;
    businessName: string;
  };
  pricing: {
    sellerPrice: number;
    currency: string;
    commission: number;
    displayPrice: number;
    totalPrice: number; // quantity * displayPrice
  };
  stock: {
    available: number;
    inStock: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CartResult {
  id: string;
  buyerId: string;
  items: CartItemResult[];
  summary: {
    itemCount: number;
    totalItems: number;
    subtotal: number;
    totalCommission: number;
    totalAmount: number;
    currency: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class CartService {
  private commercePricing = new CommercePricingService();

  /**
   * Get or create cart for buyer
   */
  private async getOrCreateCart(buyerId: string) {
    let cart = await prisma.cart.findUnique({
      where: { buyerId }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { buyerId }
      });
    }

    return cart;
  }

  /**
   * Add item to cart
   */
  async addToCart(buyerId: string, data: z.infer<typeof addToCartSchema>): Promise<{ success: boolean; message: string; data?: CartResult; error?: string }> {
    try {
      // Validate input
      const validatedData = addToCartSchema.parse(data);

      // Get or create cart
      const cart = await this.getOrCreateCart(buyerId);

      // Check if inventory exists and is active
      const inventory = await prisma.sellerInventory.findUnique({
        where: { id: validatedData.inventoryId },
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
      });

      if (!inventory) {
        return {
          success: false,
          message: 'Product not found',
          error: 'PRODUCT_NOT_FOUND'
        };
      }

      if (!inventory.isActive) {
        return {
          success: false,
          message: 'Product is not available',
          error: 'PRODUCT_INACTIVE'
        };
      }

      if (!inventory.seller.isEligible) {
        return {
          success: false,
          message: 'Seller is not eligible',
          error: 'SELLER_NOT_ELIGIBLE'
        };
      }

      if (inventory.quantity < validatedData.quantity) {
        return {
          success: false,
          message: `Insufficient stock. Available: ${inventory.quantity}`,
          error: 'INSUFFICIENT_STOCK'
        };
      }

      // Check if item already exists in cart
      const existingItem = await prisma.cartItem.findUnique({
        where: {
          cartId_inventoryId: {
            cartId: cart.id,
            inventoryId: validatedData.inventoryId
          }
        }
      });

      let cartItem;
      if (existingItem) {
        // Update quantity
        cartItem = await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + validatedData.quantity },
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
                    businessName: true
                  }
                }
              }
            }
          }
        });
      } else {
        // Create new cart item
        cartItem = await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            inventoryId: validatedData.inventoryId,
            quantity: validatedData.quantity
          },
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
                    businessName: true
                  }
                }
              }
            }
          }
        });
      }

      // Return updated cart
      return await this.getCart(buyerId);

    } catch (error) {
      console.error('Add to cart error:', error);
      return {
        success: false,
        message: 'Failed to add item to cart',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get cart with all items
   */
  async getCart(buyerId: string): Promise<{ success: boolean; message: string; data?: CartResult; error?: string }> {
    try {
      const pricingSnapshot = await this.commercePricing.getSnapshot();
      const cart = await this.getOrCreateCart(buyerId);

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
                    businessName: true
                  }
                }
              }
            }
          },
        orderBy: { createdAt: 'desc' }
      });

      // Transform cart items
      const items: CartItemResult[] = cartItems.map(item => {
        const commissionRate = this.commercePricing.getEffectiveProductCommissionRate(
          item.inventory.masterProduct.name,
          pricingSnapshot
        );
        const commission = item.inventory.sellerPrice * commissionRate;
        const displayPrice = item.inventory.sellerPrice + commission;

        return {
          id: item.id,
          inventoryId: item.inventory.id,
          quantity: item.quantity,
          product: {
            id: item.inventory.masterProduct.id,
            name: item.inventory.masterProduct.name,
            oemPartNumber: item.inventory.masterProduct.oemPartNumber,
            manufacturer: item.inventory.masterProduct.manufacturer,
            imageUrls: item.inventory.masterProduct.imageUrls as string[] | null,
            category: item.inventory.masterProduct.category.name,
            subcategory: item.inventory.masterProduct.category.name // Subcategory is same as category for now
          },
          seller: {
            id: item.inventory.seller.id,
            businessName: item.inventory.seller.businessName
          },
          pricing: {
            sellerPrice: item.inventory.sellerPrice,
            currency: item.inventory.currency,
            commission: commission,
            displayPrice: displayPrice,
            totalPrice: displayPrice * item.quantity
          },
          stock: {
            available: item.inventory.quantity,
            inStock: item.inventory.quantity >= item.quantity
          },
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        };
      });

      // Calculate summary
      const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
      const subtotal = items.reduce((sum, item) => sum + (item.pricing.sellerPrice * item.quantity), 0);
      const totalCommission = items.reduce((sum, item) => sum + (item.pricing.commission * item.quantity), 0);
      const totalAmount = items.reduce((sum, item) => sum + item.pricing.totalPrice, 0);

      const cartResult: CartResult = {
        id: cart.id,
        buyerId: cart.buyerId,
        items,
        summary: {
          itemCount: items.length,
          totalItems,
          subtotal,
          totalCommission,
          totalAmount,
          currency: items[0]?.pricing.currency || 'USD'
        },
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt
      };

      return {
        success: true,
        message: 'Cart retrieved successfully',
        data: cartResult
      };

    } catch (error) {
      console.error('Get cart error:', error);
      return {
        success: false,
        message: 'Failed to retrieve cart',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(buyerId: string, cartItemId: string, data: z.infer<typeof updateCartItemSchema>): Promise<{ success: boolean; message: string; data?: CartResult; error?: string }> {
    try {
      // Validate input
      const validatedData = updateCartItemSchema.parse(data);

      const cart = await this.getOrCreateCart(buyerId);

      // Check if cart item belongs to this buyer's cart
      const cartItem = await prisma.cartItem.findUnique({
        where: { id: cartItemId },
        include: {
          cart: true,
          inventory: true
        }
      });

      if (!cartItem) {
        return {
          success: false,
          message: 'Cart item not found',
          error: 'CART_ITEM_NOT_FOUND'
        };
      }

      if (cartItem.cart.buyerId !== buyerId) {
        return {
          success: false,
          message: 'Unauthorized',
          error: 'UNAUTHORIZED'
        };
      }

      // If quantity is 0, remove the item from cart
      if (validatedData.quantity === 0) {
        await prisma.cartItem.delete({
          where: { id: cartItemId }
        });
        
        const cartResult = await this.getCart(buyerId);
        return {
          success: true,
          message: 'Item removed from cart',
          data: cartResult.data
        };
      }

      // Check stock availability
      if (cartItem.inventory.quantity < validatedData.quantity) {
        return {
          success: false,
          message: `Insufficient stock. Available: ${cartItem.inventory.quantity}`,
          error: 'INSUFFICIENT_STOCK'
        };
      }

      // Update quantity
      await prisma.cartItem.update({
        where: { id: cartItemId },
        data: { quantity: validatedData.quantity }
      });

      // Return updated cart
      return await this.getCart(buyerId);

    } catch (error) {
      console.error('Update cart item error:', error);
      return {
        success: false,
        message: 'Failed to update cart item',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(buyerId: string, cartItemId: string): Promise<{ success: boolean; message: string; data?: CartResult; error?: string }> {
    try {
      const cart = await this.getOrCreateCart(buyerId);

      // Check if cart item belongs to this buyer's cart
      const cartItem = await prisma.cartItem.findUnique({
        where: { id: cartItemId },
        include: {
          cart: true
        }
      });

      if (!cartItem) {
        return {
          success: false,
          message: 'Cart item not found',
          error: 'CART_ITEM_NOT_FOUND'
        };
      }

      if (cartItem.cart.buyerId !== buyerId) {
        return {
          success: false,
          message: 'Unauthorized',
          error: 'UNAUTHORIZED'
        };
      }

      // Remove item
      await prisma.cartItem.delete({
        where: { id: cartItemId }
      });

      // Return updated cart
      return await this.getCart(buyerId);

    } catch (error) {
      console.error('Remove from cart error:', error);
      return {
        success: false,
        message: 'Failed to remove item from cart',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Clear entire cart
   */
  async clearCart(buyerId: string): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const cart = await this.getOrCreateCart(buyerId);

      // Delete all cart items
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id }
      });

      return {
        success: true,
        message: 'Cart cleared successfully'
      };

    } catch (error) {
      console.error('Clear cart error:', error);
      return {
        success: false,
        message: 'Failed to clear cart',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get cart items for order creation
   */
  async getCartItemsForOrder(buyerId: string): Promise<{ success: boolean; items?: any[]; error?: string }> {
    try {
      const cart = await this.getOrCreateCart(buyerId);

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
          error: 'Cart is empty'
        };
      }

      // Validate all items are in stock
      const outOfStockItems = cartItems.filter(item => 
        item.inventory.quantity < item.quantity || !item.inventory.isActive
      );

      if (outOfStockItems.length > 0) {
        return {
          success: false,
          error: `Some items are out of stock or unavailable`
        };
      }

      // Format items for order creation
      const items = cartItems.map(cartItem => ({
        inventoryId: cartItem.inventory.id,
        quantity: cartItem.quantity,
        sellerId: cartItem.inventory.seller.id
      }));

      return {
        success: true,
        items
      };

    } catch (error) {
      console.error('Get cart items for order error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export default CartService;

