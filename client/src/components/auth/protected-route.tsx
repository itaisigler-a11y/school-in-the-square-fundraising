import { ReactNode } from 'react';
import { Redirect } from 'wouter';
import { useAuth, WithRole } from '@/lib/auth-context';
import { UserRole, Permission } from '@shared/permissions';

interface ProtectedRouteProps {
  children: ReactNode;
  // Role-based protection
  roles?: UserRole[];
  requireAllRoles?: boolean;
  // Permission-based protection
  permissions?: Permission[];
  requireAllPermissions?: boolean;
  // Redirect options
  redirectTo?: string;
  // Fallback UI
  fallback?: ReactNode;
  // Loading component
  loading?: ReactNode;
}

export function ProtectedRoute({
  children,
  roles = [],
  requireAllRoles = false,
  permissions = [],
  requireAllPermissions = false,
  redirectTo = '/access-denied',
  fallback = null,
  loading = null,
}: ProtectedRouteProps) {
  const auth = useAuth();

  // Show loading state during authentication check
  if (auth.isLoading) {
    return (
      <>
        {loading || (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-4">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-muted-foreground">Checking permissions...</p>
            </div>
          </div>
        )}
      </>
    );
  }

  // Redirect to login if not authenticated
  if (!auth.isAuthenticated) {
    window.location.href = '/api/login';
    return null;
  }

  // Check role requirements
  if (roles.length > 0) {
    const hasRequiredRoles = requireAllRoles
      ? roles.every(role => auth.hasRole(role))
      : roles.some(role => auth.hasRole(role));

    if (!hasRequiredRoles) {
      return fallback ? <>{fallback}</> : <Redirect to={redirectTo} />;
    }
  }

  // Check permission requirements
  if (permissions.length > 0) {
    const hasRequiredPermissions = requireAllPermissions
      ? auth.hasAllPermissions(permissions)
      : auth.hasAnyPermission(permissions);

    if (!hasRequiredPermissions) {
      return fallback ? <>{fallback}</> : <Redirect to={redirectTo} />;
    }
  }

  // All checks passed, render the protected content
  return <>{children}</>;
}

// Convenient wrapper for admin-only routes
interface AdminRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  loading?: ReactNode;
}

export function AdminRoute({ children, fallback, loading }: AdminRouteProps) {
  return (
    <ProtectedRoute
      roles={['administrator']}
      fallback={fallback}
      loading={loading}
    >
      {children}
    </ProtectedRoute>
  );
}

// Convenient wrapper for staff-only routes (admin, development officer, finance)
interface StaffRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  loading?: ReactNode;
}

export function StaffRoute({ children, fallback, loading }: StaffRouteProps) {
  return (
    <ProtectedRoute
      roles={['administrator', 'development_officer', 'finance']}
      fallback={fallback}
      loading={loading}
    >
      {children}
    </ProtectedRoute>
  );
}

// Access denied page component
export function AccessDenied() {
  const auth = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md mx-auto p-6">
        <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
          <i className="fas fa-shield-alt text-2xl text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access this page.
          </p>
        </div>
        
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            Current role: <span className="font-medium text-foreground">{auth.getRoleDisplayName()}</span>
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Contact your administrator if you believe this is an error.
          </p>
        </div>
        
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
            data-testid="button-go-back"
          >
            Go Back
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            data-testid="button-dashboard"
          >
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook for programmatic navigation with permission checks
export function useProtectedNavigation() {
  const auth = useAuth();

  const navigateIfAllowed = (route: string, fallback?: () => void) => {
    if (auth.canAccessRoute(route)) {
      window.location.href = route;
    } else if (fallback) {
      fallback();
    } else {
      // Show toast or handle unauthorized navigation
      console.warn(`Navigation to ${route} denied for role: ${auth.user?.role}`);
    }
  };

  return {
    navigateIfAllowed,
    canNavigateTo: auth.canAccessRoute,
  };
}