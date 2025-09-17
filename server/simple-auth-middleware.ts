import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { 
  UserRole, 
  Permission,
  hasPermission, 
  hasAnyPermission, 
  hasAllPermissions 
} from '@shared/permissions';
import { isSimpleAuthenticated } from './simpleAuth';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      userRole?: UserRole;
      userId?: string;
    }
  }
}

// Simplified authentication middleware for single-user mode
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Use the simple authentication middleware to ensure user is authenticated
    await new Promise<void>((resolve, reject) => {
      isSimpleAuthenticated(req, res, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // At this point, req.user should be populated by isSimpleAuthenticated
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ 
        message: "Authentication required",
        code: "AUTH_REQUIRED" 
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ 
        message: "Account is inactive",
        code: "ACCOUNT_INACTIVE" 
      });
    }

    // Add user info to request for other middleware
    req.userId = user.id;
    req.userRole = user.role;

    // Log access for audit trail
    await logAccess(req, user);

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ 
      message: "Authentication error",
      code: "AUTH_ERROR" 
    });
  }
}

// Role-based access control middleware (unchanged from original)
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

// Permission-based access control middleware (unchanged from original)
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

// Convenience middleware for common role combinations
export const requireAdmin = requireRole('administrator');
export const requireStaff = requireRole('administrator', 'development_officer', 'finance');

// Resource-specific middleware
export const requireDonorAccess = requirePermission('donors:view');
export const requireDonorEdit = requirePermission('donors:edit');
export const requireCampaignAccess = requirePermission('campaigns:view');
export const requireCampaignEdit = requirePermission('campaigns:edit');
export const requireFinancialAccess = requirePermission('financial:view');
export const requireAnalyticsAccess = requirePermission('analytics:view');

// Simplified access logging for single-user mode
async function logAccess(req: Request, userData: any) {
  try {
    const auditData = {
      userId: userData.id,
      action: 'api_access' as const,
      entityType: 'system',
      entityId: req.path || 'unknown',
      details: {
        endpoint: req.path,
        method: req.method,
      },
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

// Rate limiting by role (simplified for single-user mode)
export function rateLimitByRole() {
  const limits = {
    administrator: 1000, // requests per hour
    development_officer: 500,
    finance: 300,
  };

  return (req: Request, res: Response, next: NextFunction) => {
    // For single-user mode, rate limiting is less critical
    // Just pass through for now
    next();
  };
}

// Middleware to check if user owns the resource
export function requireOwnership(userIdParam: string = 'userId') {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestedUserId = req.params[userIdParam];
    const currentUserId = req.userId;

    // Admins can access any user's data
    if (req.userRole === 'administrator') {
      return next();
    }

    // In single-user mode, this is usually always true
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