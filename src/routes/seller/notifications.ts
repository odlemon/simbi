// @ts-nocheck
import { Router } from 'express';
import { SellerNotificationController } from '../../controllers/seller/notifications/SellerNotificationController';
import { authenticateSellerOrStaff } from '../../middleware/authenticateSellerOrStaff';

const router = Router();
const notificationController = new SellerNotificationController();

/**
 * @route GET /api/seller/notifications
 * @desc Get all notifications for the authenticated seller or staff member
 * @access Private (Seller or Staff)
 */
router.get('/', authenticateSellerOrStaff, notificationController.getNotifications.bind(notificationController));

/**
 * @route GET /api/seller/notifications/unread-count
 * @desc Get unread notification count
 * @access Private (Seller or Staff)
 */
router.get('/unread-count', authenticateSellerOrStaff, notificationController.getUnreadCount.bind(notificationController));

/**
 * @route PATCH /api/seller/notifications/:id/read
 * @desc Mark notification as read
 * @access Private (Seller or Staff)
 */
router.patch('/:id/read', authenticateSellerOrStaff, notificationController.markAsRead.bind(notificationController));

/**
 * @route PATCH /api/seller/notifications/read-all
 * @desc Mark all notifications as read
 * @access Private (Seller or Staff)
 */
router.patch('/read-all', authenticateSellerOrStaff, notificationController.markAllAsRead.bind(notificationController));

/**
 * @route DELETE /api/seller/notifications/:id
 * @desc Delete a specific notification
 * @access Private (Seller or Staff)
 */
router.delete('/:id', authenticateSellerOrStaff, notificationController.deleteNotification.bind(notificationController));

/**
 * @route DELETE /api/seller/notifications/all
 * @desc Delete all notifications
 * @access Private (Seller or Staff)
 */
router.delete('/all', authenticateSellerOrStaff, notificationController.deleteAllNotifications.bind(notificationController));

export default router;

