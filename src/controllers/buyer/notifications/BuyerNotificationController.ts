// @ts-nocheck
import { Response } from 'express';
import { AuthenticatedRequest } from '../../../types';
import { BuyerNotificationService } from '../../../services/buyer/notifications/BuyerNotificationService';
import { logger } from '../../../utils/logger';

export class BuyerNotificationController {
  private notificationService: BuyerNotificationService;

  constructor() {
    this.notificationService = new BuyerNotificationService();
  }

  /**
   * GET /api/buyer/notifications
   * Get all notifications for the authenticated buyer
   */
  async getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.buyer?.id;
      
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_BUYER_ID',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await this.notificationService.getNotifications(buyerId, page, limit);

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Error fetching buyer notifications', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /api/buyer/notifications/unread-count
   * Get unread notification count
   */
  async getUnreadCount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.buyer?.id;
      
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_BUYER_ID',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const count = await this.notificationService.getUnreadCount(buyerId);

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
   * PATCH /api/buyer/notifications/:id/read
   * Mark notification as read
   */
  async markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.buyer?.id;
      
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_BUYER_ID',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { id } = req.params;

      await this.notificationService.markAsRead(buyerId, id);

      res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      const statusCode = error.message === 'Notification not found or does not belong to buyer' ? 404 : 500;
      logger.error('Error marking notification as read', { error: error.message });
      res.status(statusCode).json({
        success: false,
        message: error.message === 'Notification not found or does not belong to buyer'
          ? 'Notification not found'
          : 'Failed to mark notification as read',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * PATCH /api/buyer/notifications/read-all
   * Mark all notifications as read
   */
  async markAllAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.buyer?.id;
      
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_BUYER_ID',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      await this.notificationService.markAllAsRead(buyerId);

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
   * DELETE /api/buyer/notifications/:id
   * Delete a specific notification
   */
  async deleteNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.buyer?.id;
      
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_BUYER_ID',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { id } = req.params;

      await this.notificationService.deleteNotification(buyerId, id);

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
   * DELETE /api/buyer/notifications/all
   * Delete all notifications
   */
  async deleteAllNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.buyer?.id;
      
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_BUYER_ID',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const deletedCount = await this.notificationService.deleteAllNotifications(buyerId);

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

