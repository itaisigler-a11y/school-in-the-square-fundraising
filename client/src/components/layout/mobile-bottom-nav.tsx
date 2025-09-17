import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { PERMISSIONS } from "@shared/permissions";
import { isMobileDevice } from "@/lib/navigation-utils";

// Simplified mobile navigation items
const MOBILE_NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'fas fa-tachometer-alt',
    path: '/'
  },
  {
    id: 'donors',
    label: 'Donors',
    icon: 'fas fa-users',
    path: '/donors',
    permissions: [PERMISSIONS.DONORS_VIEW]
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    icon: 'fas fa-bullhorn',
    path: '/campaigns',
    permissions: [PERMISSIONS.CAMPAIGNS_VIEW]
  },
  {
    id: 'communications',
    label: 'Messages',
    icon: 'fas fa-envelope',
    path: '/communications',
    permissions: [PERMISSIONS.COMMUNICATIONS_VIEW]
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: 'fas fa-chart-bar',
    path: '/analytics',
    permissions: [PERMISSIONS.ANALYTICS_VIEW]
  }
];

export function MobileBottomNav() {
  const [location] = useLocation();
  const auth = useAuth();
  
  // Don't render on desktop or if user isn't authenticated
  if (!isMobileDevice() || !auth.isAuthenticated) return null;

  // Filter navigation items based on permissions
  const visibleItems = MOBILE_NAV_ITEMS.filter(item => 
    !item.permissions || auth.hasAnyPermission(item.permissions)
  );

  return (
    <>
      {/* Safe area spacer for devices with home indicator */}
      <div className="h-20 lg:hidden" />
      
      {/* Bottom Navigation */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-school-blue-200 shadow-school-lg"
        role="navigation"
        aria-label="Mobile navigation"
        data-testid="mobile-bottom-nav"
      >
        <div className="px-2 pt-2 pb-safe-bottom">
          <div className="flex items-center justify-around">
            {visibleItems.map((item) => {
              const isActive = item.path === '/' ? location === '/' : location.startsWith(item.path);
              
              return (
                <Link
                  key={item.id}
                  href={item.path}
                  className="flex-1 flex flex-col items-center py-2 px-1 transition-all duration-200"
                  data-testid={`mobile-nav-${item.id}`}
                  aria-label={`${item.label}${isActive ? ' (current page)' : ''}`}
                >
                  {/* Icon container with active state */}
                  <div 
                    className={cn(
                      "w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200",
                      isActive 
                        ? "bg-school-blue-500 text-white shadow-school-md" 
                        : "text-school-blue-600"
                    )}
                  >
                    <i className={`${item.icon} text-lg`} />
                  </div>
                  
                  {/* Label */}
                  <span 
                    className={cn(
                      "text-xs font-medium mt-1 transition-colors duration-200 leading-tight",
                      isActive 
                        ? "text-school-blue-500" 
                        : "text-school-blue-600"
                    )}
                  >
                    {item.label}
                  </span>
                  
                  {/* Active indicator */}
                  {isActive && (
                    <div className="w-4 h-0.5 bg-school-blue-500 rounded-full mt-1" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}

// Simplified quick action button - single add button only
export function QuickActionButton() {
  const auth = useAuth();
  
  // Don't render on desktop or if user can't create donors
  if (!isMobileDevice() || !auth.isAuthenticated || !auth.hasPermission(PERMISSIONS.DONORS_CREATE)) {
    return null;
  }

  return (
    <Link href="/donors?action=add">
      <button
        className="fixed bottom-28 right-4 z-40 lg:hidden w-14 h-14 rounded-full shadow-school-lg bg-school-blue-500 hover:bg-school-blue-600 border-4 border-white transition-all duration-200 hover:scale-110"
        data-testid="quick-action-add-donor"
        aria-label="Add new donor"
      >
        <i className="fas fa-plus text-lg text-white" />
      </button>
    </Link>
  );
}