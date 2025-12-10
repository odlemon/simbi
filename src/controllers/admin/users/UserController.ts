// @ts-nocheck
import { Request, Response } from "express";
import { logger } from "../../../utils/logger";
import { UserManagementService } from "../../../services/admin/users/UserManagementService";

export class UserController {
  private userService: UserManagementService;

  constructor() {
    this.userService = new UserManagementService();
  }

  /**
   * GET /api/admin/users
   * Get all users (sellers and buyers) with pagination and filters
   */
  getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const userType = req.query.userType as "seller" | "buyer" | "all" | undefined;
      const sortBy = (req.query.sortBy as string) || "createdAt";
      const sortOrder = (req.query.sortOrder as "asc" | "desc") || "desc";

      const filters = {
        search,
        status,
        userType: userType || "all",
      };

      const result = await this.userService.getAllUsers({
        page,
        limit,
        filters,
        sortBy,
        sortOrder,
      });

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error fetching all users", {
        error: error.message,
        stack: error.stack,
      });

      res.status(500).json({
        success: false,
        message: "Failed to fetch users",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  };
}









