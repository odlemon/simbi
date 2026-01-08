// @ts-nocheck
import { Router } from 'express';
import { BuyerNotificationController } from '../../controllers/buyer/notifications/BuyerNotificationController';
import { authenticateBuyer } from '../../middleware/buyerAuth';

const router = Router();
const notificationController = new BuyerNotificationController();

/**
 * @route GET /api/buyer/notifications
 * @desc Get all notifications for the authenticated buyer
 * @access Private
 */
router.get('/', authenticateBuyer, notificationController.getNotifications.bind(notificationController));

/**
 * @route GET /api/buyer/notifications/unread-count
 * @desc Get unread notification count
 * @access Private
 */
router.get('/unread-count', authenticateBuyer, notificationController.getUnreadCount.bind(notificationController));

/**
 * @route PATCH /api/buyer/notifications/:id/read
 * @desc Mark notification as read
 * @access Private
 */
router.patch('/:id/read', authenticateBuyer, notificationController.markAsRead.bind(notificationController));

/**
 * @route PATCH /api/buyer/notifications/read-all
 * @desc Mark all notifications as read
 * @access Private
 */
router.patch('/read-all', authenticateBuyer, notificationController.markAllAsRead.bind(notificationController));

/**
 * @route DELETE /api/buyer/notifications/:id
 * @desc Delete a specific notification
 * @access Private
 */
router.delete('/:id', authenticateBuyer, notificationController.deleteNotification.bind(notificationController));

/**
 * @route DELETE /api/buyer/notifications/all
 * @desc Delete all notifications
 * @access Private
 */
router.delete('/all', authenticateBuyer, notificationController.deleteAllNotifications.bind(notificationController));

export default router;

