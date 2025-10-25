import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/express';

// Extend Express Request type to include auth info from Clerk
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        sessionId?: string;
      };
    }
  }
}

/**
 * Middleware to verify Clerk authentication
 * Relies on clerkMiddleware() being used first
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // The clerkMiddleware() should have already populated req.auth
    if (!req.auth || !req.auth.userId) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Please sign in to access this resource' 
      });
    }

    // Optional: Check if user is in allowed list
    const allowedUserIds = process.env.ALLOWED_USER_IDS?.split(',').map(id => id.trim()).filter(Boolean);
    
    if (allowedUserIds && allowedUserIds.length > 0) {
      if (!allowedUserIds.includes(req.auth.userId)) {
        return res.status(403).json({ 
          error: 'Forbidden', 
          message: 'You do not have permission to access this resource' 
        });
      }
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Authentication failed' 
    });
  }
}
