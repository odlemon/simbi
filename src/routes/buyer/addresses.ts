// @ts-nocheck
import { Router } from 'express';
import BuyerAddressController from '../../controllers/buyer/BuyerAddressController';
import { authenticateBuyer } from '../../middleware/buyerAuth';

const router = Router();
const addressController = new BuyerAddressController();

/**
 * @route POST /api/buyer/addresses
 * @desc Create a new address
 * @access Private
 */
router.post('/', authenticateBuyer, addressController.createAddress.bind(addressController));

/**
 * @route GET /api/buyer/addresses
 * @desc Get all addresses for buyer
 * @access Private
 */
router.get('/', authenticateBuyer, addressController.getAddresses.bind(addressController));

/**
 * @route GET /api/buyer/addresses/default
 * @desc Get default address
 * @access Private
 */
router.get('/default', authenticateBuyer, addressController.getDefaultAddress.bind(addressController));

/**
 * @route GET /api/buyer/addresses/:id
 * @desc Get address by ID
 * @access Private
 */
router.get('/:id', authenticateBuyer, addressController.getAddressById.bind(addressController));

/**
 * @route PUT /api/buyer/addresses/:id
 * @desc Update address
 * @access Private
 */
router.put('/:id', authenticateBuyer, addressController.updateAddress.bind(addressController));

/**
 * @route DELETE /api/buyer/addresses/:id
 * @desc Delete address
 * @access Private
 */
router.delete('/:id', authenticateBuyer, addressController.deleteAddress.bind(addressController));

/**
 * @route POST /api/buyer/addresses/:id/set-default
 * @desc Set address as default
 * @access Private
 */
router.post('/:id/set-default', authenticateBuyer, addressController.setDefaultAddress.bind(addressController));

export default router;
