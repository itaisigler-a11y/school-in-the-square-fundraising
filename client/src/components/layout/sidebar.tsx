import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { isDesktopDevice } from "@/lib/navigation-utils";
import { PERMISSIONS } from "@shared/permissions";
import logoUrl from "@assets/image_1758026275177.png";

// Simplified navigation configuration
const NAVIGATION_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'fas fa-tachometer-alt',
    path: '/',
    description: 'Your fundraising overview'
  },
  {
    id: 'donors',
    label: 'Donors',
    icon: 'fas fa-users',
    path: '/donors',
    permissions: [PERMISSIONS.DONORS_VIEW],
    description: 'Manage donor relationships'
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    icon: 'fas fa-bullhorn',
    path: '/campaigns',
    permissions: [PERMISSIONS.CAMPAIGNS_VIEW],
    description: 'Create and track campaigns'
  },
  {
    id: 'communications',
    label: 'Communications',
    icon: 'fas fa-envelope',
    path: '/communications',
    permissions: [PERMISSIONS.COMMUNICATIONS_VIEW],
    description: 'Email and outreach'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: 'fas fa-chart-bar',
    path: '/analytics',
    permissions: [PERMISSIONS.ANALYTICS_VIEW],
    description: 'Performance insights'
  },
  {
    id: 'segments',
    label: 'Segments',
    icon: 'fas fa-layer-group',
    path: '/segments',
    permissions: [PERMISSIONS.DONORS_VIEW],
    description: 'Organize donor groups'
  },
  {
    id: 'import',
    label: 'Import Data',
    icon: 'fas fa-upload',
    path: '/import',
    permissions: [PERMISSIONS.DATA_IMPORT],
    description: 'Import from files'
  }
];

export function Sidebar() {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });
  
  const auth = useAuth();

  const toggleCollapsed = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    localStorage.setItem('sidebar-collapsed', newCollapsed.toString());
  };

  // Filter navigation items based on permissions
  const visibleNavigationItems = NAVIGATION_ITEMS.filter(item => 
    !item.permissions || auth.hasAnyPermission(item.permissions)
  );

  // Don't render on mobile (mobile drawer handles mobile navigation)
  if (!isDesktopDevice()) return null;

  return (
    <aside 
      id="navigation"
      className={cn(
        "bg-school-blue-500 border-r border-school-blue-400 h-screen fixed left-0 top-0 z-30 transition-all duration-300",
        "lg:relative lg:translate-x-0",
        isCollapsed ? "w-20" : "w-80"
      )}
      data-testid="sidebar"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex flex-col h-full">
        {/* Header - Enhanced Logo and Branding */}
        <div className="p-6 border-b border-school-blue-400/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 transition-all duration-300">
              {/* Significantly Larger Logo for Better Branding */}
              <div className={cn(
                "flex items-center justify-center bg-white rounded-xl shadow-school-lg border-2 border-school-gold-200 transition-all duration-300",
                isCollapsed ? "w-12 h-12" : "w-20 h-20"
              )}>
                <img 
                  src={logoUrl} 
                  alt="School in the Square Logo" 
                  className="w-full h-full object-contain p-1"
                />
              </div>
              {!isCollapsed && (
                <div className="flex flex-col">
                  <h3 className="text-school-heading font-bold text-white leading-tight">School in the Square</h3>
                  <p className="text-school-body text-school-blue-200 font-medium">Fundraising Platform</p>
                </div>
              )}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleCollapsed}
                  className="text-white hover:bg-school-blue-400/30 hidden lg:flex rounded-lg"
                  data-testid="button-toggle-collapse"
                  aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  <i className={`fas ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <nav className="p-4 space-y-2" role="navigation">
            {visibleNavigationItems.map((item) => {
              const isActive = item.path === '/' ? location === '/' : location.startsWith(item.path);
              
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.path}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium",
                        "min-h-[48px] focus:outline-none focus:ring-2 focus:ring-school-gold-500 focus:ring-offset-2 focus:ring-offset-school-blue-500",
                        isActive
                          ? "bg-school-gold-500 text-school-blue-900 shadow-school-gold"
                          : "text-school-blue-100 hover:text-white hover:bg-school-blue-400/30"
                      )}
                      data-testid={`nav-${item.id}`}
                      aria-label={`${item.label}${isActive ? ' (current page)' : ''}`}
                    >
                      <div className="relative">
                        <i className={`${item.icon} w-5 h-5`} />
                      </div>
                      {!isCollapsed && <span className="text-school-body font-medium">{item.label}</span>}
                    </Link>
                  </TooltipTrigger>
                  {(isCollapsed || item.description) && (
                    <TooltipContent side="right" className="max-w-xs">
                      {isCollapsed ? item.label : item.description}
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-school-blue-400/20 space-y-3">
          {/* User & Sign Out */}
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={auth.logout}
                    data-testid="button-logout"
                    className="text-school-blue-200 hover:text-white hover:bg-school-blue-400/30 rounded-lg"
                    aria-label="Sign out"
                  >
                    <i className="fas fa-sign-out-alt" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Sign Out
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-school-blue-400/30 rounded-lg flex items-center justify-center">
                  <span className="text-school-small font-semibold text-white">
                    {auth.getUserDisplayName().split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-school-body font-semibold text-white truncate">
                    {auth.getUserDisplayName() || 'User'}
                  </p>
                  <p className="text-school-small text-school-blue-300 truncate">
                    {auth.user?.jobTitle || auth.getRoleDisplayName()}
                  </p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                onClick={auth.logout}
                className="w-full justify-start text-school-blue-200 hover:text-white hover:bg-school-blue-400/30"
                data-testid="button-logout"
              >
                <i className="fas fa-sign-out-alt mr-3" />
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}