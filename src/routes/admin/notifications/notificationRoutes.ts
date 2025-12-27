// @ts-nocheck
import { Router } from 'express';
import { NotificationController } from '../../../controllers/admin/notifications/NotificationController';
import { authenticateAdmin } from '../../../middleware/authenticate';
import { requireAnyAdmin } from '../../../middleware/rbac';

const router = Router();
const controller = new NotificationController();

// Get all notifications
router.get('/', authenticateAdmin, requireAnyAdmin, controller.getNotifications.bind(controller));

// Get unread count
router.get('/unread-count', authenticateAdmin, requireAnyAdmin, controller.getUnreadCount.bind(controller));

// Mark notification as read
router.patch('/:id/read', authenticateAdmin, requireAnyAdmin, controller.markAsRead.bind(controller));

// Mark all notifications as read
router.patch('/read-all', authenticateAdmin, requireAnyAdmin, controller.markAllAsRead.bind(controller));

// Delete all notifications (must come before /:id route)
router.delete('/all', authenticateAdmin, requireAnyAdmin, controller.deleteAllNotifications.bind(controller));

// Delete a specific notification
router.delete('/:id', authenticateAdmin, requireAnyAdmin, controller.deleteNotification.bind(controller));

export default router;

