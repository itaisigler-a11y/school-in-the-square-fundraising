import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { 
  UserRole, 
  Permission,
  hasPermission, 
  hasAnyPermission, 
  hasAllPermissions 
} from '@shared/permissions';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      userRole?: UserRole;
      userId?: string;
    }
  }
}

// Enhanced authentication middleware that also loads user role
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Development bypass for localhost testing - SECURITY: Only in development
    const isLocalhost = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
    const isDevelopment = process.env.NODE_ENV === 'development';
    const bypassEnabled = process.env.DEV_AUTH_BYPASS === 'true';
    
    if (isLocalhost && isDevelopment && bypassEnabled) {
      // Security warning for development bypass
      console.warn('🚨 SECURITY: Development authentication bypass active');
      
      // Create a mock authenticated user for development
      req.userId = 'dev-user-42713029';
      req.userRole = 'development_officer';
      
      // Create mock user if it doesn't exist
      try {
        let userData = await storage.getUser('dev-user-42713029');
        if (!userData) {
          await storage.upsertUser({
            id: 'dev-user-42713029',
            email: 'dev@localhost.dev',
            firstName: 'Dev',
            lastName: 'User',
            jobTitle: 'Development Officer',
            role: 'development_officer',
          });
          userData = await storage.getUser('dev-user-42713029');
        }
        
        // Log development access
        console.log('🔓 Development authentication bypass for localhost');
        return next();
      } catch (error) {
        console.error('Error creating development user:', error);
      }
    }

    const user = req.user as any;

    if (!req.isAuthenticated() || !user.expires_at) {
      return res.status(401).json({ 
        message: "Authentication required",
        code: "AUTH_REQUIRED" 
      });
    }

    const now = Math.floor(Date.now() / 1000);
    if (now > user.expires_at) {
      return res.status(401).json({ 
        message: "Token expired",
        code: "TOKEN_EXPIRED" 
      });
    }

    // Load user data including role
    const userId = user.claims.sub;
    const userData = await storage.getUser(userId);
    
    if (!userData) {
      return res.status(401).json({ 
        message: "User not found",
        code: "USER_NOT_FOUND" 
      });
    }

    if (!userData.isActive) {
      return res.status(403).json({ 
        message: "Account is inactive",
        code: "ACCOUNT_INACTIVE" 
      });
    }

    // Add user info to request
    req.userId = userId;
    req.userRole = userData.role;

    // Log access for audit trail
    await logAccess(req, userData);

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ 
      message: "Authentication error",
      code: "AUTH_ERROR" 
    });
  }
}

// Role-based authorization middleware
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userRole) {
      return res.status(401).json({ 
        message: "Authentication required",
        code: "AUTH_REQUIRED" 
      });
    }

    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ 
        message: `Insufficient permissions. Required roles: ${roles.join(', ')}`,
        code: "INSUFFICIENT_ROLE",
        required: roles,
        current: req.userRole
      });
    }

    next();
  };
}

// Permission-based authorization middleware
export function requirePermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userRole) {
      return res.status(401).json({ 
        message: "Authentication required",
        code: "AUTH_REQUIRED" 
      });
    }

    const hasRequiredPermissions = permissions.some(permission => 
      hasPermission(req.userRole!, permission)
    );

    if (!hasRequiredPermissions) {
      return res.status(403).json({ 
        message: `Insufficient permissions. Required: ${permissions.join(' or ')}`,
        code: "INSUFFICIENT_PERMISSION",
        required: permissions,
        role: req.userRole
      });
    }

    next();
  };
}

// Require all specified permissions (AND logic)
export function requireAllPermissions(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userRole) {
      return res.status(401).json({ 
        message: "Authentication required",
        code: "AUTH_REQUIRED" 
      });
    }

    const hasAllRequired = hasAllPermissions(req.userRole, permissions);

    if (!hasAllRequired) {
      return res.status(403).json({ 
        message: `Insufficient permissions. Required: ${permissions.join(' and ')}`,
        code: "INSUFFICIENT_PERMISSION",
        required: permissions,
        role: req.userRole
      });
    }

    next();
  };
}

// Admin-only middleware
export const requireAdmin = requireRole('administrator');

// Staff-only middleware (admin, development officer, finance)
export const requireStaff = requireRole('administrator', 'development_officer', 'finance');

// Resource-based middleware factories
export const requireDonorAccess = requirePermission('donors:view');
export const requireDonorEdit = requirePermission('donors:edit');
export const requireCampaignAccess = requirePermission('campaigns:view');
export const requireCampaignEdit = requirePermission('campaigns:edit');
export const requireFinancialAccess = requirePermission('financial:view');
export const requireAnalyticsAccess = requirePermission('analytics:view');

// Audit logging function
async function logAccess(req: Request, userData: any) {
  try {
    // Create audit log entry
    const auditData = {
      action: 'view' as const,
      entityType: 'api_endpoint',
      entityId: req.path,
      userId: userData.id,
      userEmail: userData.email,
      ipAddress: req.ip || req.connection.remoteAddress || '',
      userAgent: req.get('User-Agent') || '',
      requestMethod: req.method,
      requestUrl: req.path,
      metadata: {
        userRole: userData.role,
        timestamp: new Date().toISOString(),
      }
    };

    // Save to audit table
    await storage.createAuditLog(auditData);
    
    // Also log to console for development debugging
    console.log('API Access:', {
      userId: userData.id,
      userRole: userData.role,
      action: 'api_access',
      resource: req.path,
      method: req.method,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error logging access:', error);
    // Don't fail the request due to audit logging errors
  }
}

// Optional: Rate limiting by role
export function rateLimitByRole() {
  const limits = {
    administrator: 1000, // requests per hour
    development_officer: 500,
    finance: 300,
    volunteer: 100,
  };

  return (req: Request, res: Response, next: NextFunction) => {
    // Implementation would track requests per user/role
    // For now, just pass through
    next();
  };
}

// Middleware to check if user owns the resource (for user-specific endpoints)
export function requireOwnership(userIdParam: string = 'userId') {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestedUserId = req.params[userIdParam];
    const currentUserId = req.userId;

    // Admins can access any user's data
    if (req.userRole === 'administrator') {
      return next();
    }

    // Users can only access their own data
    if (currentUserId !== requestedUserId) {
      return res.status(403).json({ 
        message: "Access denied. You can only access your own data.",
        code: "OWNERSHIP_REQUIRED" 
      });
    }

    next();
  };
}

// Conditional middleware - only apply if condition is met
export function conditionalAuth(condition: (req: Request) => boolean, middleware: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (condition(req)) {
      return middleware(req, res, next);
    }
    next();
  };
}