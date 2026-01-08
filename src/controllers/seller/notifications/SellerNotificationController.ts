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

      const result = await this.notificationService.getNotifications(sellerId, page, limit);

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
      
      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_SELLER_ID',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const count = await this.notificationService.getUnreadCount(sellerId);

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

      await this.notificationService.markAsRead(sellerId, id);

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
      
      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_SELLER_ID',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      await this.notificationService.markAllAsRead(sellerId);

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

      await this.notificationService.deleteNotification(sellerId, id);

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
      
      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_SELLER_ID',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const deletedCount = await this.notificationService.deleteAllNotifications(sellerId);

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

