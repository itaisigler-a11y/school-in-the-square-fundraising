import { Permission } from '@shared/permissions';

// User maturity levels based on data and activity
export type UserMaturityLevel = 'beginner' | 'active' | 'power_user';

// Navigation item visibility rules
export type NavigationVisibility = 'always' | 'progressive' | 'admin' | 'mobile_only' | 'desktop_only';

// Navigation item interface
export interface NavigationItem {
  id: string;
  label: string;
  icon: string; // FontAwesome class name
  path: string;
  visibility: NavigationVisibility;
  permissions?: Permission[];
  requiredMaturity?: UserMaturityLevel;
  requiredData?: {
    donors?: number;
    campaigns?: number;
    communications?: number;
  };
  badge?: string | number;
  children?: NavigationItem[];
  isNew?: boolean;
  description?: string;
}

// User activity data interface
export interface UserActivityData {
  donorCount: number;
  campaignCount: number;
  communicationCount: number;
  lastLoginDays: number;
  accountAgeDays: number;
  featuresUsed: string[];
}

// User maturity detection
export function getUserMaturityLevel(activityData: UserActivityData): UserMaturityLevel {
  const { donorCount, campaignCount, communicationCount, featuresUsed, accountAgeDays } = activityData;
  
  // Power user criteria
  if (
    donorCount >= 25 &&
    campaignCount >= 3 &&
    communicationCount >= 10 &&
    featuresUsed.length >= 8 &&
    accountAgeDays >= 7
  ) {
    return 'power_user';
  }
  
  // Active user criteria
  if (
    donorCount >= 6 &&
    (campaignCount >= 1 || communicationCount >= 3) &&
    featuresUsed.length >= 4 &&
    accountAgeDays >= 2
  ) {
    return 'active';
  }
  
  // Beginner
  return 'beginner';
}

// Check if user should see a navigation item
export function shouldShowNavigationItem(
  item: NavigationItem,
  userMaturity: UserMaturityLevel,
  activityData: UserActivityData,
  hasPermission: (permissions: Permission[]) => boolean,
  isSimpleMode: boolean,
  isMobile: boolean
): boolean {
  // Check device-specific visibility
  if (item.visibility === 'mobile_only' && !isMobile) return false;
  if (item.visibility === 'desktop_only' && isMobile) return false;
  
  // Check permissions
  if (item.permissions && !hasPermission(item.permissions)) return false;
  
  // Check visibility rules
  switch (item.visibility) {
    case 'always':
      return true;
    
    case 'admin':
      // Admin items handled by permissions check above
      return true;
    
    case 'progressive':
      // Check maturity requirements
      if (item.requiredMaturity) {
        const maturityOrder: UserMaturityLevel[] = ['beginner', 'active', 'power_user'];
        const requiredIndex = maturityOrder.indexOf(item.requiredMaturity);
        const currentIndex = maturityOrder.indexOf(userMaturity);
        if (currentIndex < requiredIndex) return false;
      }
      
      // Check data requirements
      if (item.requiredData) {
        const { donors, campaigns, communications } = item.requiredData;
        if (donors && activityData.donorCount < donors) return false;
        if (campaigns && activityData.campaignCount < campaigns) return false;
        if (communications && activityData.communicationCount < communications) return false;
      }
      
      // In simple mode, hide advanced features unless user has sufficient data
      if (isSimpleMode && userMaturity === 'beginner') return false;
      
      return true;
    
    default:
      return true;
  }
}

// Get navigation badge text
export function getNavigationBadge(item: NavigationItem, activityData: UserActivityData): string | number | undefined {
  if (item.badge) return item.badge;
  
  // Dynamic badges based on data
  switch (item.id) {
    case 'donors':
      return activityData.donorCount > 0 ? activityData.donorCount : undefined;
    case 'campaigns':
      return activityData.campaignCount > 0 ? activityData.campaignCount : undefined;
    case 'communications':
      return activityData.communicationCount > 0 ? activityData.communicationCount : undefined;
    default:
      return undefined;
  }
}

// Get contextual help text for navigation items
export function getNavigationHelp(item: NavigationItem, userMaturity: UserMaturityLevel): string | undefined {
  if (item.description) return item.description;
  
  // Contextual help based on maturity
  const helpText = {
    dashboard: {
      beginner: "Your fundraising overview and next steps",
      active: "Track campaign performance and donor engagement",
      power_user: "Advanced analytics and strategic insights"
    },
    donors: {
      beginner: "Manage your supporter contacts and information",
      active: "Track donor relationships and giving history",
      power_user: "Advanced donor analytics and segmentation"
    },
    campaigns: {
      beginner: "Create and manage your fundraising initiatives",
      active: "Track campaign progress and optimize performance",
      power_user: "Advanced campaign analytics and A/B testing"
    },
    communications: {
      beginner: "Send emails and updates to your supporters",
      active: "Manage email campaigns and track engagement",
      power_user: "Advanced communication automation and analytics"
    }
  };
  
  return helpText[item.id as keyof typeof helpText]?.[userMaturity];
}

// Feature discovery helpers
export interface FeatureDiscovery {
  id: string;
  title: string;
  description: string;
  icon: string;
  path: string;
  unlockCriteria: string;
  isUnlocked: boolean;
  isNew: boolean;
}

export function getFeatureDiscoveries(
  userMaturity: UserMaturityLevel,
  activityData: UserActivityData
): FeatureDiscovery[] {
  const discoveries: FeatureDiscovery[] = [];
  
  // Analytics unlock
  if (userMaturity === 'beginner' && activityData.donorCount >= 5) {
    discoveries.push({
      id: 'analytics',
      title: 'Analytics Dashboard',
      description: 'Track your fundraising performance with detailed analytics',
      icon: 'fas fa-chart-bar',
      path: '/analytics',
      unlockCriteria: 'Added 5+ donors',
      isUnlocked: activityData.donorCount >= 10,
      isNew: activityData.donorCount >= 5 && activityData.donorCount < 15
    });
  }
  
  // Segments unlock
  if (userMaturity !== 'power_user' && activityData.donorCount >= 15) {
    discoveries.push({
      id: 'segments',
      title: 'Donor Segments',
      description: 'Create targeted groups for personalized communications',
      icon: 'fas fa-layer-group',
      path: '/segments',
      unlockCriteria: 'Added 15+ donors',
      isUnlocked: activityData.donorCount >= 25,
      isNew: activityData.donorCount >= 15 && activityData.donorCount < 30
    });
  }
  
  // Advanced features unlock
  if (userMaturity === 'active' && activityData.campaignCount >= 2) {
    discoveries.push({
      id: 'advanced_tools',
      title: 'Advanced Tools',
      description: 'Access bulk operations, automation, and advanced reporting',
      icon: 'fas fa-cogs',
      path: '/settings',
      unlockCriteria: 'Created 2+ campaigns',
      isUnlocked: userMaturity === 'power_user',
      isNew: false
    });
  }
  
  return discoveries;
}

// Device detection utilities
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

export function isTabletDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= 768 && window.innerWidth < 1024;
}

export function isDesktopDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= 1024;
}

// Touch device detection
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// Keyboard shortcuts helper
export const KEYBOARD_SHORTCUTS = {
  SEARCH: { key: 'k', meta: true, description: 'Global search' },
  DASHBOARD: { key: '1', meta: true, description: 'Go to Dashboard' },
  DONORS: { key: '2', meta: true, description: 'Go to Donors' },
  CAMPAIGNS: { key: '3', meta: true, description: 'Go to Campaigns' },
  COMMUNICATIONS: { key: '4', meta: true, description: 'Go to Communications' },
  ADD_DONOR: { key: 'n', meta: true, description: 'Add new donor' },
  TOGGLE_SIDEBAR: { key: 'b', meta: true, description: 'Toggle sidebar' }
} as const;

// Accessibility helpers
export function getAriaLabel(item: NavigationItem, isActive: boolean): string {
  const activeText = isActive ? ', current page' : '';
  const badgeText = item.badge ? `, ${item.badge} items` : '';
  return `${item.label}${badgeText}${activeText}`;
}

export function getAriaDescribedBy(item: NavigationItem): string | undefined {
  return item.description ? `nav-help-${item.id}` : undefined;
}