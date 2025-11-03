// @ts-nocheck
import { Router } from 'express';
import { DriverController } from '../../../controllers/admin/drivers/DriverController';
import { authenticateAdmin } from '../../../middleware/authenticate';
import { requireAnyAdmin } from '../../../middleware/rbac';

const router = Router();
const controller = new DriverController();

// Driver management endpoints
router.post('/', authenticateAdmin, requireAnyAdmin, controller.createDriver.bind(controller));
router.get('/', authenticateAdmin, requireAnyAdmin, controller.getAllDrivers.bind(controller));
router.get('/:id', authenticateAdmin, requireAnyAdmin, controller.getDriverById.bind(controller));
router.patch('/:id/status', authenticateAdmin, requireAnyAdmin, controller.updateDriverStatus.bind(controller));

export default router;

