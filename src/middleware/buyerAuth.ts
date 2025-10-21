import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from "../utils/database";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        buyerId: string;
        email: string;
        buyerType: string;
        status: string;
      };
    }
  }
}

export interface BuyerAuthRequest extends Request {
  user?: {
    buyerId: string;
    email: string;
    buyerType: string;
    status: string;
  };
}

/**
 * Middleware to authenticate buyer JWT tokens
 */
export const authenticateBuyer = async (req: BuyerAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access token required',
        error: 'NO_TOKEN'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as { buyerId: string; type: string };
    
    if (decoded.type !== 'access') {
      res.status(401).json({
        success: false,
        message: 'Invalid token type',
        error: 'INVALID_TOKEN_TYPE'
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
        status: true
      }
    });

    if (!buyer) {
      res.status(401).json({
        success: false,
        message: 'Buyer not found',
        error: 'BUYER_NOT_FOUND'
      });
      return;
    }

    if (buyer.status !== 'ACTIVE') {
      res.status(401).json({
        success: false,
        message: 'Account is suspended or banned',
        error: 'ACCOUNT_INACTIVE'
      });
      return;
    }

    // Add buyer info to request
    req.user = {
      buyerId: buyer.id,
      email: buyer.email,
      buyerType: buyer.buyerType,
      status: buyer.status
    };

    next();
  } catch (error) {
    console.error('Buyer authentication error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        error: 'INVALID_TOKEN'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: 'AUTH_ERROR'
    });
  }
};

/**
 * Middleware to check if buyer is enterprise type
 */
export const requireEnterpriseBuyer = (req: BuyerAuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'NOT_AUTHENTICATED'
    });
    return;
  }

  if (req.user.buyerType !== 'ENTERPRISE') {
    res.status(403).json({
      success: false,
      message: 'Enterprise buyer access required',
      error: 'ENTERPRISE_REQUIRED'
    });
    return;
  }

  next();
};

/**
 * Middleware to check if buyer is individual type
 */
export const requireIndividualBuyer = (req: BuyerAuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'NOT_AUTHENTICATED'
    });
    return;
  }

  if (req.user.buyerType !== 'INDIVIDUAL') {
    res.status(403).json({
      success: false,
      message: 'Individual buyer access required',
      error: 'INDIVIDUAL_REQUIRED'
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
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

    const decoded = jwt.verify(token, JWT_SECRET) as { buyerId: string; type: string };
    
    if (decoded.type !== 'access') {
      // Invalid token type, continue without user info
      next();
      return;
    }

    const buyer = await prisma.buyer.findUnique({
      where: { id: decoded.buyerId },
      select: {
        id: true,
        email: true,
        buyerType: true,
        status: true
      }
    });

    if (buyer && buyer.status === 'ACTIVE') {
      req.user = {
        buyerId: buyer.id,
        email: buyer.email,
        buyerType: buyer.buyerType,
        status: buyer.status
      };
    }

    next();
  } catch (error) {
    // Token verification failed, continue without user info
    next();
  }
};

export default authenticateBuyer;
