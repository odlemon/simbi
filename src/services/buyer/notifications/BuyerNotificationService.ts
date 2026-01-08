import { prisma } from '../../../utils/database';
import { logger } from '../../../utils/logger';

export class BuyerNotificationService {
  /**
   * Create a notification for a buyer
   */
  async createNotification(
    buyerId: string,
    type: string,
    title: string,
    message: string,
    orderId?: string,
    returnId?: string
  ): Promise<void> {
    try {
      await prisma.buyerNotification.create({
        data: {
          buyerId,
          type,
          title,
          message,
          orderId: orderId || null,
          returnId: returnId || null,
        },
      });

      logger.info('Buyer notification created', {
        buyerId,
        type,
        title,
        orderId,
        returnId,
      });
    } catch (error: any) {
      logger.error('Error creating buyer notification', {
        error: error.message,
        buyerId,
        type,
        title,
        orderId,
        returnId,
      });
      // Don't throw - notifications are not critical
    }
  }

  /**
   * Get all notifications for a buyer (unread first)
   */
  async getNotifications(
    buyerId: string,
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
      const unreadCount = await prisma.buyerNotification.count({
        where: { buyerId, isRead: false },
      });

      // Get total count
      const total = await prisma.buyerNotification.count({
        where: { buyerId },
      });

      // Get notifications (unread first, then by date)
      const notifications = await prisma.buyerNotification.findMany({
        where: { buyerId },
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
      logger.error('Error fetching buyer notifications', {
        error: error.message,
        buyerId,
      });
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(buyerId: string, notificationId: string): Promise<void> {
    try {
      // Verify notification belongs to buyer
      const notification = await prisma.buyerNotification.findFirst({
        where: {
          id: notificationId,
          buyerId,
        },
      });

      if (!notification) {
        throw new Error('Notification not found or does not belong to buyer');
      }

      await prisma.buyerNotification.update({
        where: { id: notificationId },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      logger.info('Buyer notification marked as read', {
        buyerId,
        notificationId,
      });
    } catch (error: any) {
      logger.error('Error marking buyer notification as read', {
        error: error.message,
        buyerId,
        notificationId,
      });
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(buyerId: string): Promise<void> {
    try {
      await prisma.buyerNotification.updateMany({
        where: { buyerId, isRead: false },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      logger.info('All buyer notifications marked as read', {
        buyerId,
      });
    } catch (error: any) {
      logger.error('Error marking all buyer notifications as read', {
        error: error.message,
        buyerId,
      });
      throw error;
    }
  }

  /**
   * Get unread count
   */
  async getUnreadCount(buyerId: string): Promise<number> {
    try {
      return await prisma.buyerNotification.count({
        where: { buyerId, isRead: false },
      });
    } catch (error: any) {
      logger.error('Error getting buyer unread count', {
        error: error.message,
        buyerId,
      });
      return 0;
    }
  }

  /**
   * Delete a specific notification
   */
  async deleteNotification(buyerId: string, notificationId: string): Promise<void> {
    try {
      // Verify notification belongs to buyer
      const notification = await prisma.buyerNotification.findFirst({
        where: {
          id: notificationId,
          buyerId,
        },
      });

      if (!notification) {
        throw new Error('Notification not found or does not belong to buyer');
      }

      await prisma.buyerNotification.delete({
        where: { id: notificationId },
      });

      logger.info('Buyer notification deleted', {
        buyerId,
        notificationId,
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        // Record not found
        throw new Error('Notification not found');
      }
      logger.error('Error deleting buyer notification', {
        error: error.message,
        buyerId,
        notificationId,
      });
      throw error;
    }
  }

  /**
   * Delete all notifications
   */
  async deleteAllNotifications(buyerId: string): Promise<number> {
    try {
      const result = await prisma.buyerNotification.deleteMany({
        where: { buyerId },
      });

      logger.info('All buyer notifications deleted', {
        buyerId,
        count: result.count,
      });

      return result.count;
    } catch (error: any) {
      logger.error('Error deleting all buyer notifications', {
        error: error.message,
        buyerId,
      });
      throw error;
    }
  }
}

