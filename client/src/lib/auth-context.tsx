import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  UserRole, 
  Permission, 
  hasPermission, 
  hasAnyPermission, 
  hasAllPermissions, 
  canAccessRoute,
  getRoleDisplayName,
  isAdminRole,
  isStaffRole 
} from '@shared/permissions';

// User interface based on schema
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  profileImageUrl?: string;
  role: UserRole;
  permissions: Record<string, any>;
  lastLogin?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthContextType {
  // User data
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsProfileCompletion: boolean;
  
  // Role checking functions
  hasRole: (role: UserRole) => boolean;
  hasRoles: (roles: UserRole[]) => boolean;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  canAccessRoute: (route: string) => boolean;
  
  // Convenience functions
  isAdmin: () => boolean;
  isStaff: () => boolean;
  getRoleDisplayName: () => string;
  getUserDisplayName: () => string;
  
  // Auth actions
  logout: () => void;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  
  const { 
    data: userData, 
    isLoading, 
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Update user state when query data changes
  useEffect(() => {
    if (userData) {
      setUser(userData as User);
    } else if (error) {
      setUser(null);
    }
  }, [userData, error]);

  // Role checking functions
  const hasRoleFn = (role: UserRole): boolean => {
    return user?.role === role;
  };

  const hasRolesFn = (roles: UserRole[]): boolean => {
    return user ? roles.includes(user.role) : false;
  };

  const hasPermissionFn = (permission: Permission): boolean => {
    if (!user) return false;
    return hasPermission(user.role, permission);
  };

  const hasAnyPermissionFn = (permissions: Permission[]): boolean => {
    if (!user) return false;
    return hasAnyPermission(user.role, permissions);
  };

  const hasAllPermissionsFn = (permissions: Permission[]): boolean => {
    if (!user) return false;
    return hasAllPermissions(user.role, permissions);
  };

  const canAccessRouteFn = (route: string): boolean => {
    if (!user) return false;
    return canAccessRoute(user.role, route);
  };

  // Convenience functions
  const isAdminFn = (): boolean => {
    return user ? isAdminRole(user.role) : false;
  };

  const isStaffFn = (): boolean => {
    return user ? isStaffRole(user.role) : false;
  };

  const getRoleDisplayNameFn = (): string => {
    return user ? getRoleDisplayName(user.role) : '';
  };

  const getUserDisplayNameFn = (): string => {
    if (!user) return '';
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email || '';
  };

  // Profile completion detection
  const needsProfileCompletion = !!user && (!user.firstName || !user.lastName || !user.jobTitle);

  // Auth actions
  const logout = (): void => {
    window.location.href = '/api/logout';
  };

  const refresh = (): void => {
    refetch();
  };

  const contextValue: AuthContextType = {
    // User data
    user,
    isLoading,
    isAuthenticated: !!user,
    needsProfileCompletion,
    
    // Role checking functions
    hasRole: hasRoleFn,
    hasRoles: hasRolesFn,
    hasPermission: hasPermissionFn,
    hasAnyPermission: hasAnyPermissionFn,
    hasAllPermissions: hasAllPermissionsFn,
    canAccessRoute: canAccessRouteFn,
    
    // Convenience functions
    isAdmin: isAdminFn,
    isStaff: isStaffFn,
    getRoleDisplayName: getRoleDisplayNameFn,
    getUserDisplayName: getUserDisplayNameFn,
    
    // Auth actions
    logout,
    refresh,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Higher-order component for role-based rendering
interface WithRoleProps {
  children: ReactNode;
  roles?: UserRole[];
  permissions?: Permission[];
  requireAll?: boolean;
  fallback?: ReactNode;
}

export function WithRole({ 
  children, 
  roles = [], 
  permissions = [], 
  requireAll = false,
  fallback = null 
}: WithRoleProps) {
  const auth = useAuth();

  if (!auth.isAuthenticated) {
    return <>{fallback}</>;
  }

  // Check roles
  if (roles.length > 0) {
    const hasRequiredRole = requireAll 
      ? roles.every(role => auth.hasRole(role))
      : roles.some(role => auth.hasRole(role));
    
    if (!hasRequiredRole) {
      return <>{fallback}</>;
    }
  }

  // Check permissions
  if (permissions.length > 0) {
    const hasRequiredPermissions = requireAll
      ? auth.hasAllPermissions(permissions)
      : auth.hasAnyPermission(permissions);
    
    if (!hasRequiredPermissions) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

// Hook for checking if current user can perform an action
export function usePermissions() {
  const auth = useAuth();
  
  return {
    canView: (resource: string) => {
      // Convert resource to permission format (e.g., 'donors' -> 'donors:view')
      const permission = `${resource}:view` as Permission;
      return auth.hasPermission(permission);
    },
    canCreate: (resource: string) => {
      const permission = `${resource}:create` as Permission;
      return auth.hasPermission(permission);
    },
    canEdit: (resource: string) => {
      const permission = `${resource}:edit` as Permission;
      return auth.hasPermission(permission);
    },
    canDelete: (resource: string) => {
      const permission = `${resource}:delete` as Permission;
      return auth.hasPermission(permission);
    },
    hasAccess: auth.hasPermission,
    hasAnyAccess: auth.hasAnyPermission,
    hasAllAccess: auth.hasAllPermissions,
  };
}