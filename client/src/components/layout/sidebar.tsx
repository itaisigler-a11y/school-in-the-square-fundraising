import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useUIMode } from "@/lib/ui-mode-context";
import { NAVIGATION_PERMISSIONS } from "@shared/permissions";
import logoUrl from "@assets/image_1758026275177.png";

export function Sidebar() {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });
  const auth = useAuth();
  const { isSimpleMode } = useUIMode();

  const toggleCollapsed = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    localStorage.setItem('sidebar-collapsed', newCollapsed.toString());
  };

  // Close mobile sidebar when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location]);

  const allNavigationItems = [
    { name: "Dashboard", href: "/", icon: "fas fa-tachometer-alt" },
    { name: "Donors", href: "/donors", icon: "fas fa-users" },
    { name: "Segments", href: "/segments", icon: "fas fa-layer-group" },
    { name: "Campaigns", href: "/campaigns", icon: "fas fa-bullhorn" },
    { name: "Communications", href: "/communications", icon: "fas fa-envelope" },
    { name: "Analytics", href: "/analytics", icon: "fas fa-chart-bar" },
    { name: "Import Data", href: "/import", icon: "fas fa-upload" },
  ];

  // Define which items are available in Simple Mode
  const simpleNavItems = ["/", "/donors", "/import", "/segments"];
  
  // Filter navigation items based on user permissions and UI mode
  const navigation = allNavigationItems.filter(item => {
    const hasPermission = auth.isAuthenticated && auth.canAccessRoute(item.href);
    const isAvailableInMode = isSimpleMode ? simpleNavItems.includes(item.href) : true;
    return hasPermission && isAvailableInMode;
  });

  const allSettingsItems = [
    { name: "User Management", href: "/settings/users", icon: "fas fa-user-shield" },
    { name: "System Settings", href: "/settings", icon: "fas fa-cog" },
  ];

  // Filter settings items based on user permissions and UI mode (settings only in advanced mode)
  const settings = allSettingsItems.filter(item => {
    const hasPermission = auth.isAuthenticated && auth.canAccessRoute(item.href);
    return hasPermission && !isSimpleMode; // Hide settings in Simple Mode
  });

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile toggle button */}
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        data-testid="button-toggle-sidebar"
      >
        <i className="fas fa-bars"></i>
      </Button>

      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-sidebar border-r border-sidebar-border h-screen fixed left-0 top-0 z-50 transition-all duration-300",
          "lg:relative lg:translate-x-0",
          isCollapsed && !isMobileOpen ? "w-20" : "w-80",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        data-testid="sidebar"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-sidebar-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-center transition-all duration-300">
                <div className="w-12 h-12 flex items-center justify-center">
                  <img 
                    src={logoUrl} 
                    alt="School in the Square Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleCollapsed}
                className="text-sidebar-foreground hover:bg-sidebar-accent hidden lg:flex"
                data-testid="button-toggle-collapse"
              >
                <i className={`fas ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
              </Button>
            </div>
            
            {/* Close button for mobile */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden absolute top-4 right-4"
              onClick={() => setIsMobileOpen(false)}
              data-testid="button-close-sidebar"
            >
              <i className="fas fa-times"></i>
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                  location === item.href
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
                data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <i className={`${item.icon} w-5`}></i>
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            ))}
            
            {/* Show settings section only when there are settings items (Advanced Mode) */}
            {settings.length > 0 && (
              <div className="pt-4 border-t border-border">
                <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Settings
                </p>
                {settings.map((item) => (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                      location === item.href
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                    data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <i className={`${item.icon} w-5`}></i>
                    <span>{item.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </nav>

          {/* User Profile - Clean minimal logout */}
          <div className="p-4 border-t border-border">
            {isCollapsed ? (
              <div className="flex justify-center">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={auth.logout}
                  data-testid="button-logout"
                  className="text-sidebar-foreground hover:bg-sidebar-accent"
                >
                  <i className="fas fa-sign-out-alt"></i>
                </Button>
              </div>
            ) : (
              <div className="flex justify-center">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={auth.logout}
                  data-testid="button-logout"
                  className="text-sidebar-foreground hover:bg-sidebar-accent flex items-center gap-2"
                >
                  <i className="fas fa-sign-out-alt"></i>
                  <span>Sign Out</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
