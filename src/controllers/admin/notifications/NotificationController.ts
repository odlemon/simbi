import { Response } from 'express';
import { AuthenticatedRequest } from '../../../types';
import { NotificationService } from '../../../services/admin/notifications/NotificationService';
import { logger } from '../../../utils/logger';

export class NotificationController {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * GET /api/admin/notifications
   * Get all notifications
   */
  async getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await this.notificationService.getNotifications(page, limit);

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Error fetching notifications', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /api/admin/notifications/unread-count
   * Get unread notification count
   */
  async getUnreadCount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const count = await this.notificationService.getUnreadCount();

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
   * PATCH /api/admin/notifications/:id/read
   * Mark notification as read
   */
  async markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await this.notificationService.markAsRead(id);

      res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Error marking notification as read', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * PATCH /api/admin/notifications/read-all
   * Mark all notifications as read
   */
  async markAllAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      await this.notificationService.markAllAsRead();

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
   * DELETE /api/admin/notifications/:id
   * Delete a specific notification
   */
  async deleteNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await this.notificationService.deleteNotification(id);

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
   * DELETE /api/admin/notifications/all
   * Delete all notifications
   */
  async deleteAllNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const deletedCount = await this.notificationService.deleteAllNotifications();

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

