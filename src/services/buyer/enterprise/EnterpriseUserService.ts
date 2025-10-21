// @ts-nocheck

import { z } from 'zod';
import { prisma } from "../../../utils/database";



// Validation schemas
const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['MASTER_ADMIN', 'REQUESTER', 'APPROVER', 'VIEWER']),
  spendingLimit: z.number().optional(),
  isActive: z.boolean().optional().default(true)
});

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z.enum(['MASTER_ADMIN', 'REQUESTER', 'APPROVER', 'VIEWER']).optional(),
  spendingLimit: z.number().optional(),
  isActive: z.boolean().optional()
});

const createApprovalWorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  conditions: z.object({
    minAmount: z.number().optional(),
    maxAmount: z.number().optional(),
    categories: z.array(z.string()).optional(),
    costCenters: z.array(z.string()).optional()
  }),
  approvers: z.array(z.string()).min(1),
  isActive: z.boolean().optional().default(true)
});

export interface EnterpriseUserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: EnterpriseUserRole;
  spendingLimit?: number;
  monthlySpent: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalWorkflow {
  id: string;
  name: string;
  description: string;
  conditions: {
    minAmount?: number;
    maxAmount?: number;
    categories?: string[];
    costCenters?: string[];
  };
  approvers: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SpendingLimit {
  userId: string;
  monthlyLimit: number;
  currentSpent: number;
  remainingLimit: number;
  resetDate: Date;
}

export class EnterpriseUserService {
  /**
   * Add user to enterprise account
   */
  async addUser(enterpriseBuyerId: string, userData: z.infer<typeof createUserSchema>): Promise<{ success: boolean; data?: EnterpriseUserData; error?: string }> {
    try {
      const validatedData = createUserSchema.parse(userData);

      // Check if email already exists
      const existingUser = await prisma.enterpriseUser.findUnique({
        where: { email: validatedData.email }
      });

      if (existingUser) {
        return {
          success: false,
          error: 'EMAIL_ALREADY_EXISTS'
        };
      }

      // Create enterprise user
      const user = await prisma.enterpriseUser.create({
        data: {
          enterpriseBuyerId,
          email: validatedData.email,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          role: validatedData.role,
          spendingLimit: validatedData.spendingLimit,
          isActive: validatedData.isActive
        }
      });

      return {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          spendingLimit: user.spendingLimit,
          monthlySpent: 0, // TODO: Calculate from orders
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      };

    } catch (error) {
      console.error('Add enterprise user error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get enterprise users
   */
  async getEnterpriseUsers(enterpriseBuyerId: string): Promise<{ success: boolean; data?: EnterpriseUserData[]; error?: string }> {
    try {
      const users = await prisma.enterpriseUser.findMany({
        where: { enterpriseBuyerId },
        orderBy: { createdAt: 'desc' }
      });

      const userData = users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        spendingLimit: user.spendingLimit,
        monthlySpent: 0, // TODO: Calculate from orders
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }));

      return {
        success: true,
        data: userData
      };

    } catch (error) {
      console.error('Get enterprise users error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update enterprise user
   */
  async updateUser(userId: string, enterpriseBuyerId: string, userData: z.infer<typeof updateUserSchema>): Promise<{ success: boolean; data?: EnterpriseUserData; error?: string }> {
    try {
      const validatedData = updateUserSchema.parse(userData);

      // Check if user exists and belongs to enterprise
      const existingUser = await prisma.enterpriseUser.findFirst({
        where: {
          id: userId,
          enterpriseBuyerId
        }
      });

      if (!existingUser) {
        return {
          success: false,
          error: 'USER_NOT_FOUND'
        };
      }

      // Update user
      const user = await prisma.enterpriseUser.update({
        where: { id: userId },
        data: validatedData
      });

      return {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          spendingLimit: user.spendingLimit,
          monthlySpent: 0, // TODO: Calculate from orders
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      };

    } catch (error) {
      console.error('Update enterprise user error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Remove enterprise user
   */
  async removeUser(userId: string, enterpriseBuyerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if user exists and belongs to enterprise
      const existingUser = await prisma.enterpriseUser.findFirst({
        where: {
          id: userId,
          enterpriseBuyerId
        }
      });

      if (!existingUser) {
        return {
          success: false,
          error: 'USER_NOT_FOUND'
        };
      }

      // Delete user
      await prisma.enterpriseUser.delete({
        where: { id: userId }
      });

      return {
        success: true
      };

    } catch (error) {
      console.error('Remove enterprise user error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Set spending limits for user
   */
  async setSpendingLimits(userId: string, enterpriseBuyerId: string, limits: { monthlyLimit: number; perOrderLimit?: number }): Promise<{ success: boolean; data?: SpendingLimit; error?: string }> {
    try {
      // Check if user exists and belongs to enterprise
      const existingUser = await prisma.enterpriseUser.findFirst({
        where: {
          id: userId,
          enterpriseBuyerId
        }
      });

      if (!existingUser) {
        return {
          success: false,
          error: 'USER_NOT_FOUND'
        };
      }

      // Update spending limits
      const user = await prisma.enterpriseUser.update({
        where: { id: userId },
        data: {
          spendingLimit: limits.monthlyLimit
        }
      });

      // TODO: Calculate current spending from orders
      const currentSpent = 0;
      const resetDate = new Date();
      resetDate.setMonth(resetDate.getMonth() + 1);
      resetDate.setDate(1);

      return {
        success: true,
        data: {
          userId: user.id,
          monthlyLimit: limits.monthlyLimit,
          currentSpent,
          remainingLimit: limits.monthlyLimit - currentSpent,
          resetDate
        }
      };

    } catch (error) {
      console.error('Set spending limits error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check user permissions
   */
  async checkPermissions(userId: string, action: string): Promise<{ success: boolean; allowed: boolean; error?: string }> {
    try {
      const user = await prisma.enterpriseUser.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return {
          success: false,
          allowed: false,
          error: 'USER_NOT_FOUND'
        };
      }

      if (!user.isActive) {
        return {
          success: false,
          allowed: false,
          error: 'USER_INACTIVE'
        };
      }

      // Define permissions by role
      const permissions: { [key: string]: string[] } = {
        'MASTER_ADMIN': ['*'], // All permissions
        'APPROVER': ['approve_orders', 'view_orders', 'view_reports'],
        'REQUESTER': ['create_orders', 'view_orders', 'view_own_orders'],
        'VIEWER': ['view_orders', 'view_reports']
      };

      const userPermissions = permissions[user.role] || [];
      const allowed = userPermissions.includes('*') || userPermissions.includes(action);

      return {
        success: true,
        allowed
      };

    } catch (error) {
      console.error('Check permissions error:', error);
      return {
        success: false,
        allowed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create approval workflow
   */
  async createApprovalWorkflow(enterpriseBuyerId: string, workflowData: z.infer<typeof createApprovalWorkflowSchema>): Promise<{ success: boolean; data?: ApprovalWorkflow; error?: string }> {
    try {
      const validatedData = createApprovalWorkflowSchema.parse(workflowData);

      // Create approval workflow
      const workflow = await prisma.approvalWorkflow.create({
        data: {
          enterpriseBuyerId,
          name: validatedData.name,
          description: validatedData.description,
          conditions: validatedData.conditions,
          approvers: validatedData.approvers,
          isActive: validatedData.isActive
        }
      });

      return {
        success: true,
        data: {
          id: workflow.id,
          name: workflow.name,
          description: workflow.description || '',
          conditions: workflow.conditions as any,
          approvers: workflow.approvers as string[],
          isActive: workflow.isActive,
          createdAt: workflow.createdAt,
          updatedAt: workflow.updatedAt
        }
      };

    } catch (error) {
      console.error('Create approval workflow error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get approval workflows
   */
  async getApprovalWorkflows(enterpriseBuyerId: string): Promise<{ success: boolean; data?: ApprovalWorkflow[]; error?: string }> {
    try {
      const workflows = await prisma.approvalWorkflow.findMany({
        where: { enterpriseBuyerId },
        orderBy: { createdAt: 'desc' }
      });

      const workflowData = workflows.map(workflow => ({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description || '',
        conditions: workflow.conditions as any,
        approvers: workflow.approvers as string[],
        isActive: workflow.isActive,
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt
      }));

      return {
        success: true,
        data: workflowData
      };

    } catch (error) {
      console.error('Get approval workflows error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process approval request
   */
  async processApproval(requestId: string, approverId: string, decision: 'APPROVE' | 'REJECT', notes?: string): Promise<{ success: boolean; error?: string }> {
    try {
      // TODO: Implement approval processing
      // This would involve updating approval requests and triggering next steps

      return {
        success: true
      };

    } catch (error) {
      console.error('Process approval error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export default EnterpriseUserService;
