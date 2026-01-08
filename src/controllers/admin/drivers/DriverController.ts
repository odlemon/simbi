// @ts-nocheck
import { Request, Response } from 'express';
import { prisma } from '../../../utils/database';
import { AuthenticatedRequest } from '../../../middleware/authenticate';

export class DriverController {
  /**
   * Create a new driver
   * POST /api/admin/drivers
   */
  async createDriver(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { firstName, lastName, phoneNumber, email, licenseNumber, vehicleType, vehiclePlate, notes } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !phoneNumber) {
        res.status(400).json({
          success: false,
          message: 'FirstName, lastName, and phoneNumber are required',
          error: 'MISSING_FIELDS'
        });
        return;
      }

      // Check if phone number already exists
      const existingDriverByPhone = await prisma.driver.findUnique({
        where: { phoneNumber }
      });

      if (existingDriverByPhone) {
        res.status(400).json({
          success: false,
          message: 'Driver with this phone number already exists',
          error: 'DUPLICATE_PHONE',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check if license number already exists (if provided)
      if (licenseNumber) {
        const existingDriverByLicense = await prisma.driver.findUnique({
          where: { licenseNumber }
        });

        if (existingDriverByLicense) {
          res.status(400).json({
            success: false,
            message: 'Driver with this license number already exists',
            error: 'DUPLICATE_LICENSE',
            timestamp: new Date().toISOString()
          });
          return;
        }
      }

      // Create driver
      const driver = await prisma.driver.create({
        data: {
          firstName,
          lastName,
          phoneNumber,
          email,
          licenseNumber,
          vehicleType,
          vehiclePlate,
          notes,
          status: 'AVAILABLE'
        }
      });

      res.status(201).json({
        success: true,
        message: 'Driver created successfully',
        data: driver,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Create driver error:', error);
      
      // Handle unique constraint violations with better error messages
      if (error.code === 'P2002') {
        const target = error.meta?.target;
        if (Array.isArray(target)) {
          if (target.includes('licenseNumber')) {
            res.status(400).json({
              success: false,
              message: 'Driver with this license number already exists',
              error: 'DUPLICATE_LICENSE',
              timestamp: new Date().toISOString()
            });
            return;
          }
          if (target.includes('phoneNumber')) {
            res.status(400).json({
              success: false,
              message: 'Driver with this phone number already exists',
              error: 'DUPLICATE_PHONE',
              timestamp: new Date().toISOString()
            });
            return;
          }
        }
        res.status(400).json({
          success: false,
          message: 'A driver with this information already exists',
          error: 'DUPLICATE_ENTRY',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create driver',
        error: error.message || 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get all drivers
   * GET /api/admin/drivers
   */
  async getAllDrivers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { status, search } = req.query;

      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (search) {
        where.OR = [
          { firstName: { contains: search as string, mode: 'insensitive' } },
          { lastName: { contains: search as string, mode: 'insensitive' } },
          { phoneNumber: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      const drivers = await prisma.driver.findMany({
        where,
        include: {
          _count: {
            select: {
              orders: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.status(200).json({
        success: true,
        message: 'Drivers retrieved successfully',
        data: drivers,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Get drivers error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve drivers',
        error: error.message || 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get driver by ID
   * GET /api/admin/drivers/:id
   */
  async getDriverById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const driver = await prisma.driver.findUnique({
        where: { id },
        include: {
          orders: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              totalAmount: true,
              dispatchedAt: true
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 10
          },
          _count: {
            select: {
              orders: true
            }
          }
        }
      });

      if (!driver) {
        res.status(404).json({
          success: false,
          message: 'Driver not found',
          error: 'DRIVER_NOT_FOUND'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Driver retrieved successfully',
        data: driver,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Get driver error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve driver',
        error: error.message || 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Update driver status
   * PATCH /api/admin/drivers/:id/status
   */
  async updateDriverStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['AVAILABLE', 'UNAVAILABLE', 'ON_DELIVERY', 'OFF_DUTY'].includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Invalid status. Must be AVAILABLE, UNAVAILABLE, ON_DELIVERY, or OFF_DUTY',
          error: 'INVALID_STATUS'
        });
        return;
      }

      const driver = await prisma.driver.update({
        where: { id },
        data: { status }
      });

      res.status(200).json({
        success: true,
        message: 'Driver status updated successfully',
        data: driver,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Update driver status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update driver status',
        error: error.message || 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }
}

