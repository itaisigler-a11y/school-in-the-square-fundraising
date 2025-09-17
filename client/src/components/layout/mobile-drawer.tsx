import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useMobileNavigation } from "@/stores/navigation-store";
import { NAVIGATION_CONFIG } from "@/lib/navigation-config";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import logoUrl from "@assets/image_1758026275177.png";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const [location] = useLocation();
  const auth = useAuth();

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Body scroll lock when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Filter navigation items based on permissions
  const visibleItems = NAVIGATION_CONFIG.filter(item => 
    !item.permissions || auth.hasAnyPermission(item.permissions)
  );

  if (!auth.isAuthenticated) return null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden"
          onClick={onClose}
          data-testid="mobile-drawer-backdrop"
        />
      )}
      
      {/* Drawer */}
      <div 
        className={cn(
          "fixed top-0 left-0 h-full w-80 bg-white z-50 lg:hidden",
          "transform transition-transform duration-300 ease-in-out",
          "border-r border-school-blue-200 shadow-2xl",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        data-testid="mobile-drawer"
        role="navigation"
        aria-label="Mobile navigation menu"
      >
        {/* Header */}
        <div className="p-6 border-b border-school-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center bg-school-blue-500 rounded-lg shadow-school">
                <img 
                  src={logoUrl} 
                  alt="School in the Square Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h2 className="text-lg font-bold text-school-blue-900">School in the Square</h2>
                <p className="text-sm text-school-blue-600">Fundraising Platform</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-school-blue-600 hover:bg-school-blue-50"
              data-testid="button-close-drawer"
              aria-label="Close navigation menu"
            >
              <i className="fas fa-times text-lg" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <nav className="p-4 space-y-2" role="navigation">
            {visibleItems.map((item) => {
              const isActive = item.path === '/' ? location === '/' : location.startsWith(item.path);
              
              return (
                <Link
                  key={item.id}
                  href={item.path}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                    "text-base font-medium focus:outline-none focus:ring-2 focus:ring-school-blue-500",
                    isActive
                      ? "bg-school-blue-500 text-white shadow-school-md"
                      : "text-school-blue-700 hover:bg-school-blue-50"
                  )}
                  data-testid={`mobile-nav-${item.id}`}
                  aria-label={`${item.label}${isActive ? ' (current page)' : ''}`}
                >
                  <i className={`${item.icon} w-5 h-5`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-school-blue-200">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-10 w-10 ring-2 ring-school-blue-200">
              <AvatarImage src={auth.user?.profileImageUrl} alt={auth.getUserDisplayName()} />
              <AvatarFallback className="bg-school-blue-500 text-white font-semibold text-sm">
                {auth.getUserDisplayName().split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-school-blue-900 truncate">
                {auth.getUserDisplayName() || 'User'}
              </p>
              <p className="text-xs text-school-blue-600 truncate">
                {auth.user?.jobTitle || auth.getRoleDisplayName()}
              </p>
            </div>
          </div>
          
          <Button
            variant="outline"
            onClick={() => {
              auth.logout();
              onClose();
            }}
            className="w-full border-school-blue-200 text-school-blue-700 hover:bg-school-blue-50"
            data-testid="button-logout-mobile"
          >
            <i className="fas fa-sign-out-alt mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </>
  );
}

// Hook for mobile drawer state management
export function useMobileDrawer() {
  const { isOpen, open, close, toggle } = useMobileNavigation();
  
  return {
    isOpen,
    open,
    close,
    toggle
  };
}

// Mobile drawer trigger button component
export function MobileDrawerTrigger() {
  const { open } = useMobileNavigation();
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={open}
      className="lg:hidden text-school-blue-600 hover:bg-school-blue-50"
      data-testid="button-open-drawer"
      aria-label="Open navigation menu"
    >
      <i className="fas fa-bars text-lg" />
    </Button>
  );
}