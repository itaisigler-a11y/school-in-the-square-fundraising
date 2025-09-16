// Role-based access control permissions and role mappings
export type UserRole = 'administrator' | 'development_officer' | 'finance';

// Define all possible permissions in the system
export const PERMISSIONS = {
  // Donor Management
  DONORS_VIEW: 'donors:view',
  DONORS_CREATE: 'donors:create',
  DONORS_EDIT: 'donors:edit',
  DONORS_DELETE: 'donors:delete',
  DONORS_EXPORT: 'donors:export',
  DONORS_IMPORT: 'donors:import',
  
  // Campaign Management
  CAMPAIGNS_VIEW: 'campaigns:view',
  CAMPAIGNS_CREATE: 'campaigns:create',
  CAMPAIGNS_EDIT: 'campaigns:edit',
  CAMPAIGNS_DELETE: 'campaigns:delete',
  CAMPAIGNS_ANALYTICS: 'campaigns:analytics',
  
  // Donation Management
  DONATIONS_VIEW: 'donations:view',
  DONATIONS_CREATE: 'donations:create',
  DONATIONS_EDIT: 'donations:edit',
  DONATIONS_DELETE: 'donations:delete',
  DONATIONS_PROCESS: 'donations:process',
  
  // Communications
  COMMUNICATIONS_VIEW: 'communications:view',
  COMMUNICATIONS_SEND: 'communications:send',
  COMMUNICATIONS_TEMPLATES: 'communications:templates',
  COMMUNICATIONS_BULK: 'communications:bulk',
  
  // Analytics and Reporting
  ANALYTICS_VIEW: 'analytics:view',
  ANALYTICS_ADVANCED: 'analytics:advanced',
  ANALYTICS_EXPORT: 'analytics:export',
  REPORTS_GENERATE: 'reports:generate',
  REPORTS_CUSTOM: 'reports:custom',
  
  // Financial Data
  FINANCIAL_VIEW: 'financial:view',
  FINANCIAL_EDIT: 'financial:edit',
  FINANCIAL_RECONCILE: 'financial:reconcile',
  FINANCIAL_REPORTS: 'financial:reports',
  
  // System Administration
  ADMIN_USERS: 'admin:users',
  ADMIN_SETTINGS: 'admin:settings',
  ADMIN_AUDIT: 'admin:audit',
  ADMIN_BACKUP: 'admin:backup',
  ADMIN_INTEGRATIONS: 'admin:integrations',
  
  // Data Management
  DATA_IMPORT: 'data:import',
  DATA_EXPORT: 'data:export',
  DATA_BULK_EDIT: 'data:bulk_edit',
  DATA_CLEANUP: 'data:cleanup',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Role-based permission mappings
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // Administrator - Full access to everything
  administrator: Object.values(PERMISSIONS),
  
  // Development Officer - Focus on fundraising, donor management, campaigns
  development_officer: [
    PERMISSIONS.DONORS_VIEW,
    PERMISSIONS.DONORS_CREATE,
    PERMISSIONS.DONORS_EDIT,
    PERMISSIONS.DONORS_EXPORT,
    PERMISSIONS.DONORS_IMPORT,
    PERMISSIONS.CAMPAIGNS_VIEW,
    PERMISSIONS.CAMPAIGNS_CREATE,
    PERMISSIONS.CAMPAIGNS_EDIT,
    PERMISSIONS.CAMPAIGNS_ANALYTICS,
    PERMISSIONS.DONATIONS_VIEW,
    PERMISSIONS.DONATIONS_CREATE,
    PERMISSIONS.DONATIONS_EDIT,
    PERMISSIONS.COMMUNICATIONS_VIEW,
    PERMISSIONS.COMMUNICATIONS_SEND,
    PERMISSIONS.COMMUNICATIONS_TEMPLATES,
    PERMISSIONS.COMMUNICATIONS_BULK,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.ANALYTICS_ADVANCED,
    PERMISSIONS.REPORTS_GENERATE,
    PERMISSIONS.DATA_IMPORT,
    PERMISSIONS.DATA_EXPORT,
    PERMISSIONS.DATA_BULK_EDIT,
  ],
  
  // Finance - Focus on financial data, donations, reporting
  finance: [
    PERMISSIONS.DONORS_VIEW,
    PERMISSIONS.DONATIONS_VIEW,
    PERMISSIONS.DONATIONS_CREATE,
    PERMISSIONS.DONATIONS_EDIT,
    PERMISSIONS.DONATIONS_PROCESS,
    PERMISSIONS.CAMPAIGNS_VIEW,
    PERMISSIONS.FINANCIAL_VIEW,
    PERMISSIONS.FINANCIAL_EDIT,
    PERMISSIONS.FINANCIAL_RECONCILE,
    PERMISSIONS.FINANCIAL_REPORTS,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.REPORTS_GENERATE,
    PERMISSIONS.REPORTS_CUSTOM,
    PERMISSIONS.DATA_EXPORT,
  ],
  
  // Note: Removed volunteer role - all users default to development_officer with appropriate permissions
};

// Navigation items and their required permissions
export const NAVIGATION_PERMISSIONS = {
  '/': [] as Permission[], // Dashboard - accessible to all authenticated users
  '/donors': [PERMISSIONS.DONORS_VIEW] as Permission[],
  '/campaigns': [PERMISSIONS.CAMPAIGNS_VIEW] as Permission[],
  '/communications': [PERMISSIONS.COMMUNICATIONS_VIEW] as Permission[],
  '/analytics': [PERMISSIONS.ANALYTICS_VIEW] as Permission[],
  '/import': [PERMISSIONS.DATA_IMPORT] as Permission[],
  '/settings/users': [PERMISSIONS.ADMIN_USERS] as Permission[],
  '/settings': [PERMISSIONS.ADMIN_SETTINGS] as Permission[],
};

// Utility functions for permission checking
export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[userRole]?.includes(permission) || false;
}

export function hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission));
}

export function hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(userRole, permission));
}

export function canAccessRoute(userRole: UserRole, route: string): boolean {
  const requiredPermissions = NAVIGATION_PERMISSIONS[route as keyof typeof NAVIGATION_PERMISSIONS];
  if (!requiredPermissions) {
    return false; // Unknown routes are not accessible
  }
  
  // If no permissions required, allow access (like dashboard)
  if (requiredPermissions.length === 0) {
    return true;
  }
  
  // Check if user has any of the required permissions
  return hasAnyPermission(userRole, requiredPermissions);
}

export function getRoleDisplayName(role: UserRole): string {
  const roleNames = {
    administrator: 'Administrator',
    development_officer: 'Development Officer',
    finance: 'Finance',
  };
  return roleNames[role];
}

export function isAdminRole(role: UserRole): boolean {
  return role === 'administrator';
}

export function isStaffRole(role: UserRole): boolean {
  return ['administrator', 'development_officer', 'finance'].includes(role);
}