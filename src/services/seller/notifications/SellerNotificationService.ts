import { prisma } from '../../../utils/database';
import { logger } from '../../../utils/logger';

export class SellerNotificationService {
  /**
   * Create a notification for a seller
   */
  async createNotification(
    sellerId: string,
    type: string,
    title: string,
    message: string,
    orderId?: string,
    returnId?: string
  ): Promise<void> {
    try {
      await prisma.sellerNotification.create({
        data: {
          sellerId,
          type,
          title,
          message,
          orderId: orderId || null,
          returnId: returnId || null,
        },
      });

      logger.info('Seller notification created', {
        sellerId,
        type,
        title,
        orderId,
        returnId,
      });
    } catch (error: any) {
      logger.error('Error creating seller notification', {
        error: error.message,
        sellerId,
        type,
        title,
        orderId,
        returnId,
      });
      // Don't throw - notifications are not critical
    }
  }

  /**
   * Get all notifications for a seller (unread first)
   */
  async getNotifications(
    sellerId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    notifications: Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      orderId: string | null;
      returnId: string | null;
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
      const unreadCount = await prisma.sellerNotification.count({
        where: { sellerId, isRead: false },
      });

      // Get total count
      const total = await prisma.sellerNotification.count({
        where: { sellerId },
      });

      // Get notifications (unread first, then by date)
      const notifications = await prisma.sellerNotification.findMany({
        where: { sellerId },
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
          returnId: n.returnId,
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
      logger.error('Error fetching seller notifications', {
        error: error.message,
        sellerId,
      });
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(sellerId: string, notificationId: string): Promise<void> {
    try {
      // Verify notification belongs to seller
      const notification = await prisma.sellerNotification.findFirst({
        where: {
          id: notificationId,
          sellerId,
        },
      });

      if (!notification) {
        throw new Error('Notification not found or does not belong to seller');
      }

      await prisma.sellerNotification.update({
        where: { id: notificationId },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      logger.info('Seller notification marked as read', {
        sellerId,
        notificationId,
      });
    } catch (error: any) {
      logger.error('Error marking seller notification as read', {
        error: error.message,
        sellerId,
        notificationId,
      });
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(sellerId: string): Promise<void> {
    try {
      await prisma.sellerNotification.updateMany({
        where: { sellerId, isRead: false },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      logger.info('All seller notifications marked as read', {
        sellerId,
      });
    } catch (error: any) {
      logger.error('Error marking all seller notifications as read', {
        error: error.message,
        sellerId,
      });
      throw error;
    }
  }

  /**
   * Get unread count
   */
  async getUnreadCount(sellerId: string): Promise<number> {
    try {
      return await prisma.sellerNotification.count({
        where: { sellerId, isRead: false },
      });
    } catch (error: any) {
      logger.error('Error getting seller unread count', {
        error: error.message,
        sellerId,
      });
      return 0;
    }
  }

  /**
   * Delete a specific notification
   */
  async deleteNotification(sellerId: string, notificationId: string): Promise<void> {
    try {
      // Verify notification belongs to seller
      const notification = await prisma.sellerNotification.findFirst({
        where: {
          id: notificationId,
          sellerId,
        },
      });

      if (!notification) {
        throw new Error('Notification not found or does not belong to seller');
      }

      await prisma.sellerNotification.delete({
        where: { id: notificationId },
      });

      logger.info('Seller notification deleted', {
        sellerId,
        notificationId,
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        // Record not found
        throw new Error('Notification not found');
      }
      logger.error('Error deleting seller notification', {
        error: error.message,
        sellerId,
        notificationId,
      });
      throw error;
    }
  }

  /**
   * Delete all notifications
   */
  async deleteAllNotifications(sellerId: string): Promise<number> {
    try {
      const result = await prisma.sellerNotification.deleteMany({
        where: { sellerId },
      });

      logger.info('All seller notifications deleted', {
        sellerId,
        count: result.count,
      });

      return result.count;
    } catch (error: any) {
      logger.error('Error deleting all seller notifications', {
        error: error.message,
        sellerId,
      });
      throw error;
    }
  }
}

