// @ts-nocheck
import { Router } from 'express';
import EnterpriseUserService from '../../services/buyer/enterprise/EnterpriseUserService';
import { authenticateBuyer, requireEnterpriseBuyer } from '../../middleware/buyerAuth';

const router = Router();
const enterpriseService = new EnterpriseUserService();

/**
 * @route POST /api/buyer/enterprise/users
 * @desc Add user to enterprise account
 * @access Private (Enterprise only)
 */
router.post('/users', authenticateBuyer, requireEnterpriseBuyer, async (req, res) => {
  try {
    const enterpriseBuyerId = req.buyer?.id;
    
    if (!enterpriseBuyerId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
        error: 'NO_BUYER_ID'
      });
      return;
    }

    const result = await enterpriseService.addUser(enterpriseBuyerId, req.body);
    
    if (result.success) {
      res.status(201).json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to add user',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Add enterprise user controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR'
    });
  }
});

/**
 * @route GET /api/buyer/enterprise/users
 * @desc Get enterprise users
 * @access Private (Enterprise only)
 */
router.get('/users', authenticateBuyer, requireEnterpriseBuyer, async (req, res) => {
  try {
    const enterpriseBuyerId = req.buyer?.id;
    
    if (!enterpriseBuyerId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
        error: 'NO_BUYER_ID'
      });
      return;
    }

    const result = await enterpriseService.getEnterpriseUsers(enterpriseBuyerId);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to get enterprise users',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Get enterprise users controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR'
    });
  }
});

/**
 * @route PUT /api/buyer/enterprise/users/:id
 * @desc Update enterprise user
 * @access Private (Enterprise only)
 */
router.put('/users/:id', authenticateBuyer, requireEnterpriseBuyer, async (req, res) => {
  try {
    const enterpriseBuyerId = req.buyer?.id;
    const userId = req.params.id;
    
    if (!enterpriseBuyerId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
        error: 'NO_BUYER_ID'
      });
      return;
    }

    const result = await enterpriseService.updateUser(userId, enterpriseBuyerId, req.body);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to update user',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Update enterprise user controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR'
    });
  }
});

/**
 * @route DELETE /api/buyer/enterprise/users/:id
 * @desc Remove enterprise user
 * @access Private (Enterprise only)
 */
router.delete('/users/:id', authenticateBuyer, requireEnterpriseBuyer, async (req, res) => {
  try {
    const enterpriseBuyerId = req.buyer?.id;
    const userId = req.params.id;
    
    if (!enterpriseBuyerId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
        error: 'NO_BUYER_ID'
      });
      return;
    }

    const result = await enterpriseService.removeUser(userId, enterpriseBuyerId);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'User removed successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to remove user',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Remove enterprise user controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR'
    });
  }
});

/**
 * @route POST /api/buyer/enterprise/users/:id/spending-limits
 * @desc Set spending limits for user
 * @access Private (Enterprise only)
 */
router.post('/users/:id/spending-limits', authenticateBuyer, requireEnterpriseBuyer, async (req, res) => {
  try {
    const enterpriseBuyerId = req.buyer?.id;
    const userId = req.params.id;
    
    if (!enterpriseBuyerId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
        error: 'NO_BUYER_ID'
      });
      return;
    }

    const { monthlyLimit, perOrderLimit } = req.body;

    const result = await enterpriseService.setSpendingLimits(userId, enterpriseBuyerId, { monthlyLimit, perOrderLimit });
    
    if (result.success) {
      res.status(200).json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to set spending limits',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Set spending limits controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR'
    });
  }
});

/**
 * @route POST /api/buyer/enterprise/approval-workflows
 * @desc Create approval workflow
 * @access Private (Enterprise only)
 */
router.post('/approval-workflows', authenticateBuyer, requireEnterpriseBuyer, async (req, res) => {
  try {
    const enterpriseBuyerId = req.buyer?.id;
    
    if (!enterpriseBuyerId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
        error: 'NO_BUYER_ID'
      });
      return;
    }

    const result = await enterpriseService.createApprovalWorkflow(enterpriseBuyerId, req.body);
    
    if (result.success) {
      res.status(201).json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to create approval workflow',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Create approval workflow controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR'
    });
  }
});

/**
 * @route GET /api/buyer/enterprise/approval-workflows
 * @desc Get approval workflows
 * @access Private (Enterprise only)
 */
router.get('/approval-workflows', authenticateBuyer, requireEnterpriseBuyer, async (req, res) => {
  try {
    const enterpriseBuyerId = req.buyer?.id;
    
    if (!enterpriseBuyerId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
        error: 'NO_BUYER_ID'
      });
      return;
    }

    const result = await enterpriseService.getApprovalWorkflows(enterpriseBuyerId);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to get approval workflows',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Get approval workflows controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR'
    });
  }
});

export default router;
