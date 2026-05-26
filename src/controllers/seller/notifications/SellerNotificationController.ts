// @ts-nocheck
import { Response } from 'express';
import { AuthenticatedRequest } from '../../../types';
import { SellerNotificationService } from '../../../services/seller/notifications/SellerNotificationService';
import { logger } from '../../../utils/logger';

export class SellerNotificationController {
  private notificationService: SellerNotificationService;

  constructor() {
    this.notificationService = new SellerNotificationService();
  }

  /**
   * GET /api/seller/notifications
   * Get all notifications for the authenticated seller
   */
  async getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller?.id;
      const staffId = req.staff?.id; // Get staff ID if it's a staff member
      
      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_SELLER_ID',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      // Pass staffId if it's a staff member - this will filter to show only their notifications
      const result = await this.notificationService.getNotifications(sellerId, page, limit, staffId);

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Error fetching seller notifications', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /api/seller/notifications/unread-count
   * Get unread notification count
   */
  async getUnreadCount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller?.id;
      const staffId = req.staff?.id; // Get staff ID if it's a staff member
      
      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_SELLER_ID',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Pass staffId if it's a staff member
      const count = await this.notificationService.getUnreadCount(sellerId, staffId);

      res.status(200).json({
        success: true,
        data: {
          unreadCount: count,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Error fetching unread count', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch unread count',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * PATCH /api/seller/notifications/:id/read
   * Mark notification as read
   */
  async markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller?.id;
      const staffId = req.staff?.id; // Get staff ID if it's a staff member
      
      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_SELLER_ID',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { id } = req.params;

      // Pass staffId if it's a staff member
      await this.notificationService.markAsRead(sellerId, id, staffId);

      res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      const statusCode = error.message === 'Notification not found or does not belong to seller' ? 404 : 500;
      logger.error('Error marking notification as read', { error: error.message });
      res.status(statusCode).json({
        success: false,
        message: error.message === 'Notification not found or does not belong to seller'
          ? 'Notification not found'
          : 'Failed to mark notification as read',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * PATCH /api/seller/notifications/read-all
   * Mark all notifications as read
   */
  async markAllAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller?.id;
      const staffId = req.staff?.id; // Get staff ID if it's a staff member
      
      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_SELLER_ID',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Pass staffId if it's a staff member
      await this.notificationService.markAllAsRead(sellerId, staffId);

      res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Error marking all notifications as read', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to mark all notifications as read',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * DELETE /api/seller/notifications/:id
   * Delete a specific notification
   */
  async deleteNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller?.id;
      const staffId = req.staff?.id; // Get staff ID if it's a staff member
      
      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_SELLER_ID',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { id } = req.params;

      // Pass staffId if it's a staff member
      await this.notificationService.deleteNotification(sellerId, id, staffId);

      res.status(200).json({
        success: true,
        message: 'Notification deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      const statusCode = error.message === 'Notification not found' ? 404 : 500;
      logger.error('Error deleting notification', { error: error.message });
      res.status(statusCode).json({
        success: false,
        message: error.message === 'Notification not found' 
          ? 'Notification not found' 
          : 'Failed to delete notification',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * DELETE /api/seller/notifications/all
   * Delete all notifications
   */
  async deleteAllNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller?.id;
      const staffId = req.staff?.id; // Get staff ID if it's a staff member
      
      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_SELLER_ID',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Pass staffId if it's a staff member
      const deletedCount = await this.notificationService.deleteAllNotifications(sellerId, staffId);

      res.status(200).json({
        success: true,
        message: `Successfully deleted ${deletedCount} notification(s)`,
        data: {
          deletedCount,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Error deleting all notifications', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to delete all notifications',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

