// @ts-nocheck
import { Router } from 'express';
import { SellerNotificationController } from '../../controllers/seller/notifications/SellerNotificationController';
import { authenticateSeller } from '../../middleware/authenticateSeller';

const router = Router();
const notificationController = new SellerNotificationController();

/**
 * @route GET /api/seller/notifications
 * @desc Get all notifications for the authenticated seller
 * @access Private
 */
router.get('/', authenticateSeller, notificationController.getNotifications.bind(notificationController));

/**
 * @route GET /api/seller/notifications/unread-count
 * @desc Get unread notification count
 * @access Private
 */
router.get('/unread-count', authenticateSeller, notificationController.getUnreadCount.bind(notificationController));

/**
 * @route PATCH /api/seller/notifications/:id/read
 * @desc Mark notification as read
 * @access Private
 */
router.patch('/:id/read', authenticateSeller, notificationController.markAsRead.bind(notificationController));

/**
 * @route PATCH /api/seller/notifications/read-all
 * @desc Mark all notifications as read
 * @access Private
 */
router.patch('/read-all', authenticateSeller, notificationController.markAllAsRead.bind(notificationController));

/**
 * @route DELETE /api/seller/notifications/:id
 * @desc Delete a specific notification
 * @access Private
 */
router.delete('/:id', authenticateSeller, notificationController.deleteNotification.bind(notificationController));

/**
 * @route DELETE /api/seller/notifications/all
 * @desc Delete all notifications
 * @access Private
 */
router.delete('/all', authenticateSeller, notificationController.deleteAllNotifications.bind(notificationController));

export default router;

