import { PERMISSIONS } from '@shared/permissions';

export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  permissions?: string[];
  description?: string;
  children?: NavigationItem[];
}

// Simplified core navigation structure
export const NAVIGATION_CONFIG: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'fas fa-tachometer-alt',
    path: '/',
    description: 'Your fundraising overview and key metrics'
  },
  {
    id: 'donors',
    label: 'Donors',
    icon: 'fas fa-users',
    path: '/donors',
    permissions: [PERMISSIONS.DONORS_VIEW],
    description: 'Manage your supporter contacts and relationships'
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    icon: 'fas fa-bullhorn',
    path: '/campaigns',
    permissions: [PERMISSIONS.CAMPAIGNS_VIEW],
    description: 'Create and manage fundraising campaigns'
  },
  {
    id: 'communications',
    label: 'Communications',
    icon: 'fas fa-envelope',
    path: '/communications',
    permissions: [PERMISSIONS.COMMUNICATIONS_VIEW],
    description: 'Send emails and track engagement with supporters'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: 'fas fa-chart-bar',
    path: '/analytics',
    permissions: [PERMISSIONS.ANALYTICS_VIEW],
    description: 'Track fundraising performance with detailed analytics'
  },
  {
    id: 'segments',
    label: 'Segments',
    icon: 'fas fa-layer-group',
    path: '/segments',
    permissions: [PERMISSIONS.DONORS_VIEW],
    description: 'Create targeted groups for personalized communications'
  },
  {
    id: 'import',
    label: 'Import Data',
    icon: 'fas fa-upload',
    path: '/import',
    permissions: [PERMISSIONS.DATA_IMPORT],
    description: 'Import donor data from spreadsheets'
  }
];

// Mobile-specific navigation for bottom tabs
export const MOBILE_BOTTOM_NAV: NavigationItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: 'fas fa-home',
    path: '/',
    description: 'Dashboard overview'
  },
  {
    id: 'donors-mobile',
    label: 'Donors',
    icon: 'fas fa-users',
    path: '/donors',
    permissions: [PERMISSIONS.DONORS_VIEW],
    description: 'View and manage donors'
  },
  {
    id: 'campaigns-mobile',
    label: 'Campaigns',
    icon: 'fas fa-bullhorn',
    path: '/campaigns',
    permissions: [PERMISSIONS.CAMPAIGNS_VIEW],
    description: 'Manage fundraising campaigns'
  },
  {
    id: 'communications-mobile',
    label: 'Email',
    icon: 'fas fa-envelope',
    path: '/communications',
    permissions: [PERMISSIONS.COMMUNICATIONS_VIEW],
    description: 'Send and manage emails'
  },
  {
    id: 'analytics-mobile',
    label: 'Analytics',
    icon: 'fas fa-chart-bar',
    path: '/analytics',
    permissions: [PERMISSIONS.ANALYTICS_VIEW],
    description: 'View analytics and reports'
  }
];

// Breadcrumb configuration for navigation paths
export const BREADCRUMB_CONFIG: Record<string, NavigationItem[]> = {
  '/donors': [
    { id: 'home', label: 'Home', icon: 'fas fa-home', path: '/' },
    { id: 'donors', label: 'Donors', icon: 'fas fa-users', path: '/donors' }
  ],
  '/campaigns': [
    { id: 'home', label: 'Home', icon: 'fas fa-home', path: '/' },
    { id: 'campaigns', label: 'Campaigns', icon: 'fas fa-bullhorn', path: '/campaigns' }
  ],
  '/communications': [
    { id: 'home', label: 'Home', icon: 'fas fa-home', path: '/' },
    { id: 'communications', label: 'Communications', icon: 'fas fa-envelope', path: '/communications' }
  ],
  '/analytics': [
    { id: 'home', label: 'Home', icon: 'fas fa-home', path: '/' },
    { id: 'analytics', label: 'Analytics', icon: 'fas fa-chart-bar', path: '/analytics' }
  ],
  '/segments': [
    { id: 'home', label: 'Home', icon: 'fas fa-home', path: '/' },
    { id: 'segments', label: 'Segments', icon: 'fas fa-layer-group', path: '/segments' }
  ],
  '/import': [
    { id: 'home', label: 'Home', icon: 'fas fa-home', path: '/' },
    { id: 'import', label: 'Import Data', icon: 'fas fa-upload', path: '/import' }
  ]
};