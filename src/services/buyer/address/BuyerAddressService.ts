
import { z } from 'zod';
import { prisma } from "../../../utils/database";



// Validation schemas
const createAddressSchema = z.object({
  fullName: z.string().min(1),
  phoneNumber: z.string().min(10),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  province: z.string().min(1),
  postalCode: z.string().optional(),
  isDefault: z.boolean().optional().default(false),
});

const updateAddressSchema = z.object({
  fullName: z.string().min(1).optional(),
  phoneNumber: z.string().min(10).optional(),
  addressLine1: z.string().min(1).optional(),
  addressLine2: z.string().optional(),
  city: z.string().min(1).optional(),
  province: z.string().min(1).optional(),
  postalCode: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export interface AddressResult {
  success: boolean;
  message: string;
  data?: BuyerAddress;
  error?: string;
}

export interface AddressListResult {
  success: boolean;
  data?: BuyerAddress[];
  error?: string;
}

export class BuyerAddressService {
  /**
   * Create a new address for buyer
   */
  async createAddress(buyerId: string, data: z.infer<typeof createAddressSchema>): Promise<AddressResult> {
    try {
      // Validate input
      const validatedData = createAddressSchema.parse(data);

      // If this is set as default, unset other default addresses
      if (validatedData.isDefault) {
        await prisma.buyerAddress.updateMany({
          where: { buyerId },
          data: { isDefault: false }
        });
      }

      // Create address
      const address = await prisma.buyerAddress.create({
        data: {
          buyerId,
          ...validatedData
        }
      });

      return {
        success: true,
        message: 'Address created successfully',
        data: address
      };

    } catch (error) {
      console.error('Create address error:', error);
      return {
        success: false,
        message: 'Failed to create address',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all addresses for buyer
   */
  async getAddresses(buyerId: string): Promise<AddressListResult> {
    try {
      const addresses = await prisma.buyerAddress.findMany({
        where: { buyerId },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      return {
        success: true,
        data: addresses
      };

    } catch (error) {
      console.error('Get addresses error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get address by ID
   */
  async getAddressById(buyerId: string, addressId: string): Promise<AddressResult> {
    try {
      const address = await prisma.buyerAddress.findFirst({
        where: {
          id: addressId,
          buyerId
        }
      });

      if (!address) {
        return {
          success: false,
          message: 'Address not found',
          error: 'ADDRESS_NOT_FOUND'
        };
      }

      return {
        success: true,
        data: address
      };

    } catch (error) {
      console.error('Get address by ID error:', error);
      return {
        success: false,
        message: 'Failed to get address',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update address
   */
  async updateAddress(buyerId: string, addressId: string, data: z.infer<typeof updateAddressSchema>): Promise<AddressResult> {
    try {
      // Validate input
      const validatedData = updateAddressSchema.parse(data);

      // Check if address exists and belongs to buyer
      const existingAddress = await prisma.buyerAddress.findFirst({
        where: {
          id: addressId,
          buyerId
        }
      });

      if (!existingAddress) {
        return {
          success: false,
          message: 'Address not found',
          error: 'ADDRESS_NOT_FOUND'
        };
      }

      // If setting as default, unset other default addresses
      if (validatedData.isDefault) {
        await prisma.buyerAddress.updateMany({
          where: { buyerId },
          data: { isDefault: false }
        });
      }

      // Update address
      const address = await prisma.buyerAddress.update({
        where: { id: addressId },
        data: validatedData
      });

      return {
        success: true,
        message: 'Address updated successfully',
        data: address
      };

    } catch (error) {
      console.error('Update address error:', error);
      return {
        success: false,
        message: 'Failed to update address',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete address
   */
  async deleteAddress(buyerId: string, addressId: string): Promise<AddressResult> {
    try {
      // Check if address exists and belongs to buyer
      const existingAddress = await prisma.buyerAddress.findFirst({
        where: {
          id: addressId,
          buyerId
        }
      });

      if (!existingAddress) {
        return {
          success: false,
          message: 'Address not found',
          error: 'ADDRESS_NOT_FOUND'
        };
      }

      // Delete address
      await prisma.buyerAddress.delete({
        where: { id: addressId }
      });

      return {
        success: true,
        message: 'Address deleted successfully'
      };

    } catch (error) {
      console.error('Delete address error:', error);
      return {
        success: false,
        message: 'Failed to delete address',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Set default address
   */
  async setDefaultAddress(buyerId: string, addressId: string): Promise<AddressResult> {
    try {
      // Check if address exists and belongs to buyer
      const existingAddress = await prisma.buyerAddress.findFirst({
        where: {
          id: addressId,
          buyerId
        }
      });

      if (!existingAddress) {
        return {
          success: false,
          message: 'Address not found',
          error: 'ADDRESS_NOT_FOUND'
        };
      }

      // Unset all default addresses
      await prisma.buyerAddress.updateMany({
        where: { buyerId },
        data: { isDefault: false }
      });

      // Set this address as default
      const address = await prisma.buyerAddress.update({
        where: { id: addressId },
        data: { isDefault: true }
      });

      return {
        success: true,
        message: 'Default address updated successfully',
        data: address
      };

    } catch (error) {
      console.error('Set default address error:', error);
      return {
        success: false,
        message: 'Failed to set default address',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get default address
   */
  async getDefaultAddress(buyerId: string): Promise<AddressResult> {
    try {
      const address = await prisma.buyerAddress.findFirst({
        where: {
          buyerId,
          isDefault: true
        }
      });

      if (!address) {
        return {
          success: false,
          message: 'No default address found',
          error: 'NO_DEFAULT_ADDRESS'
        };
      }

      return {
        success: true,
        data: address
      };

    } catch (error) {
      console.error('Get default address error:', error);
      return {
        success: false,
        message: 'Failed to get default address',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export default BuyerAddressService;
