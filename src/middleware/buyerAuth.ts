// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from "../utils/database";
import { logger } from "../utils/logger";
import { envConfig } from "../utils/env";

// Extend Express Request type to include buyer
declare global {
  namespace Express {
    interface Request {
      buyer?: {
        id: string;
        email: string;
        buyerType: string;
        status: string;
        firstName: string;
        lastName: string;
      };
    }
  }
}

export interface BuyerAuthRequest extends Request {
  buyer?: {
    id: string;
    email: string;
    buyerType: string;
    status: string;
    firstName: string;
    lastName: string;
  };
}

interface BuyerJwtPayload {
  buyerId: string;
  email: string;
  buyerType: string;
  status: string;
  firstName: string;
  lastName: string;
  type: string;
}

/**
 * Middleware to authenticate buyer JWT tokens
 */
export const authenticateBuyer = async (req: BuyerAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Authentication required. No token provided.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    const jwtSecret = envConfig.get("JWT_SECRET");
    if (!jwtSecret) {
      logger.error("JWT_SECRET not configured");
      res.status(500).json({
        success: false,
        message: "Server configuration error",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const decoded = jwt.verify(token, jwtSecret as string) as BuyerJwtPayload;

    // Check if token is for buyer
    if (decoded.type !== 'access') {
      res.status(401).json({
        success: false,
        message: "Invalid token type",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Verify buyer exists and is active
    const buyer = await prisma.buyer.findUnique({
      where: { id: decoded.buyerId },
      select: {
        id: true,
        email: true,
        buyerType: true,
        status: true,
        firstName: true,
        lastName: true
      }
    });

    if (!buyer) {
      res.status(401).json({
        success: false,
        message: "Buyer not found",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (buyer.status !== 'ACTIVE') {
      res.status(401).json({
        success: false,
        message: "Account is suspended or banned",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Attach buyer data to request
    req.buyer = {
      id: buyer.id,
      email: buyer.email,
      buyerType: buyer.buyerType,
      status: buyer.status,
      firstName: buyer.firstName,
      lastName: buyer.lastName
    };

    logger.info("Buyer authenticated", {
      buyerId: buyer.id,
      email: buyer.email,
      buyerType: buyer.buyerType,
    });

    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      res.status(401).json({
        success: false,
        message: "Token has expired. Please login again.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (error.name === "JsonWebTokenError") {
      res.status(401).json({
        success: false,
        message: "Invalid token. Authentication failed.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    logger.error("Buyer authentication error", {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: "Authentication error occurred",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Middleware to check if buyer is enterprise type
 */
export const requireEnterpriseBuyer = (req: BuyerAuthRequest, res: Response, next: NextFunction): void => {
  if (!req.buyer) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (req.buyer.buyerType !== 'ENTERPRISE') {
    res.status(403).json({
      success: false,
      message: "Enterprise buyer access required",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
};

/**
 * Middleware to check if buyer is individual type
 */
export const requireIndividualBuyer = (req: BuyerAuthRequest, res: Response, next: NextFunction): void => {
  if (!req.buyer) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (req.buyer.buyerType !== 'INDIVIDUAL') {
    res.status(403).json({
      success: false,
      message: "Individual buyer access required",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalBuyerAuth = async (req: BuyerAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user info
      next();
      return;
    }

    const token = authHeader.substring(7);
    const jwtSecret = envConfig.get("JWT_SECRET");

    if (!jwtSecret) {
      next();
      return;
    }

    const decoded = jwt.verify(token, jwtSecret as string) as BuyerJwtPayload;
    
    if (decoded.type !== 'access') {
      next();
      return;
    }

    const buyer = await prisma.buyer.findUnique({
      where: { id: decoded.buyerId },
      select: {
        id: true,
        email: true,
        buyerType: true,
        status: true,
        firstName: true,
        lastName: true
      }
    });

    if (buyer && buyer.status === 'ACTIVE') {
      req.buyer = {
        id: buyer.id,
        email: buyer.email,
        buyerType: buyer.buyerType,
        status: buyer.status,
        firstName: buyer.firstName,
        lastName: buyer.lastName
      };
    }

    next();
  } catch (error) {
    // Token verification failed, continue without user info
    next();
  }
};

export default authenticateBuyer;