import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/express';

// Extend Express Request type to include auth info
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        sessionId: string;
      };
      user?: any;
    }
  }
}

/**
 * Middleware to verify Clerk authentication
 * Checks if the user is authenticated via Clerk session token
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Get the session token from the Authorization header or cookie
    const sessionToken = req.headers.authorization?.replace('Bearer ', '') || 
                        req.cookies?.__session;

    if (!sessionToken) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'No authentication token provided' 
      });
    }

    // Verify the session token with Clerk
    const session = await clerkClient.sessions.verifySession(sessionToken, sessionToken);
    
    if (!session) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Invalid or expired session' 
      });
    }

    // Attach auth info to request
    req.auth = {
      userId: session.userId,
      sessionId: session.id
    };

    // Optional: Check if user is in allowed list
    const allowedUserIds = process.env.ALLOWED_USER_IDS?.split(',').map(id => id.trim()).filter(Boolean);
    
    if (allowedUserIds && allowedUserIds.length > 0) {
      if (!allowedUserIds.includes(session.userId)) {
        return res.status(403).json({ 
          error: 'Forbidden', 
          message: 'You do not have permission to access this resource' 
        });
      }
    }

    // Optionally fetch full user details
    try {
      req.user = await clerkClient.users.getUser(session.userId);
    } catch (error) {
      console.error('Error fetching user details:', error);
      // Continue even if user details fetch fails
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

/**
 * Optional middleware for routes that work with or without auth
 * Populates req.auth if authenticated, but doesn't block if not
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '') || 
                        req.cookies?.__session;

    if (sessionToken) {
      const session = await clerkClient.sessions.verifySession(sessionToken, sessionToken);
      
      if (session) {
        req.auth = {
          userId: session.userId,
          sessionId: session.id
        };
      }
    }
  } catch (error) {
    // Silently fail - this is optional auth
    console.log('Optional auth failed:', error);
  }
  
  next();
}
