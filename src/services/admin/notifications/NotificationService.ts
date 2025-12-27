import { prisma } from '../../../utils/database';
import { logger } from '../../../utils/logger';

export class NotificationService {
  /**
   * Create a notification for admins
   */
  async createNotification(
    type: string,
    title: string,
    message: string,
    orderId?: string
  ): Promise<void> {
    try {
      await prisma.adminNotification.create({
        data: {
          type,
          title,
          message,
          orderId: orderId || null,
        },
      });

      logger.info('Admin notification created', {
        type,
        title,
        orderId,
      });
    } catch (error: any) {
      logger.error('Error creating admin notification', {
        error: error.message,
        type,
        title,
        orderId,
      });
      // Don't throw - notifications are not critical
    }
  }

  /**
   * Get all notifications (unread first)
   */
  async getNotifications(page: number = 1, limit: number = 50): Promise<{
    notifications: Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      orderId: string | null;
      isRead: boolean;
      readAt: Date | null;
      createdAt: Date;
      order?: {
        id: string;
        orderNumber: string;
        totalAmount: number;
        status: string;
      };
    }>;
    unreadCount: number;
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      // Get unread count
      const unreadCount = await prisma.adminNotification.count({
        where: { isRead: false },
      });

      // Get total count
      const total = await prisma.adminNotification.count();

      // Get notifications (unread first, then by date)
      const notifications = await prisma.adminNotification.findMany({
        skip,
        take: limit,
        orderBy: [
          { isRead: 'asc' }, // Unread first
          { createdAt: 'desc' }, // Then newest first
        ],
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              status: true,
            },
          },
        },
      });

      return {
        notifications: notifications.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          orderId: n.orderId,
          isRead: n.isRead,
          readAt: n.readAt,
          createdAt: n.createdAt,
          order: n.order
            ? {
                id: n.order.id,
                orderNumber: n.order.orderNumber,
                totalAmount: n.order.totalAmount,
                status: n.order.status,
              }
            : undefined,
        })),
        unreadCount,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      logger.error('Error fetching notifications', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await prisma.adminNotification.update({
        where: { id: notificationId },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      logger.info('Notification marked as read', {
        notificationId,
      });
    } catch (error: any) {
      logger.error('Error marking notification as read', {
        error: error.message,
        notificationId,
      });
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      await prisma.adminNotification.updateMany({
        where: { isRead: false },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      logger.info('All notifications marked as read');
    } catch (error: any) {
      logger.error('Error marking all notifications as read', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get unread count
   */
  async getUnreadCount(): Promise<number> {
    try {
      return await prisma.adminNotification.count({
        where: { isRead: false },
      });
    } catch (error: any) {
      logger.error('Error getting unread count', {
        error: error.message,
      });
      return 0;
    }
  }

  /**
   * Delete a specific notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await prisma.adminNotification.delete({
        where: { id: notificationId },
      });

      logger.info('Notification deleted', {
        notificationId,
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        // Record not found
        throw new Error('Notification not found');
      }
      logger.error('Error deleting notification', {
        error: error.message,
        notificationId,
      });
      throw error;
    }
  }

  /**
   * Delete all notifications
   */
  async deleteAllNotifications(): Promise<number> {
    try {
      const result = await prisma.adminNotification.deleteMany({});

      logger.info('All notifications deleted', {
        count: result.count,
      });

      return result.count;
    } catch (error: any) {
      logger.error('Error deleting all notifications', {
        error: error.message,
      });
      throw error;
    }
  }
}

