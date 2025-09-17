import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { ProfileCompletionModal } from "@/components/auth/profile-completion-modal";
import { PERMISSIONS } from "@shared/permissions";
import { 
  SkipLinks, 
  AccessibleLoadingSpinner, 
  usePageTitle,
  useFocusTrap,
  useReducedMotion
} from "@/lib/accessibility-utils";
import { isMobileDevice, isDesktopDevice } from "@/lib/navigation-utils";
// Page Components
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Donors from "@/pages/donors";
import Segments from "@/pages/segments";
import Campaigns from "@/pages/campaigns";
import Communications from "@/pages/communications";
import Analytics from "@/pages/analytics";
import ImportPage from "@/pages/import";
import AccessDeniedPage from "@/pages/access-denied";
import NotFound from "@/pages/not-found";

// Navigation Components
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileBottomNav, QuickActionButton } from "@/components/layout/mobile-bottom-nav";
import { MobileDrawer, useMobileDrawer } from "@/components/layout/mobile-drawer";

import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

// Enhanced loading component with accessibility
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-school-blue-500 rounded-xl flex items-center justify-center mx-auto shadow-school">
          <span className="text-white font-bold text-xl">S²</span>
        </div>
        <AccessibleLoadingSpinner label="Loading School in the Square Fundraising Platform" />
        <p className="text-school-blue-600 font-medium">Loading your fundraising platform...</p>
        <p className="text-school-blue-500 text-sm">Setting up your personalized experience</p>
      </div>
    </div>
  );
}

// Main authenticated application layout
function AuthenticatedApp() {
  const { user, needsProfileCompletion } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const { isOpen: isMobileDrawerOpen, close: closeMobileDrawer } = useMobileDrawer();

  // Focus trap for mobile drawer
  const drawerFocusTrapRef = useFocusTrap(isMobileDrawerOpen);

  return (
    <>
      {/* Skip Links for Accessibility */}
      <SkipLinks />
      
      {/* Mobile Drawer */}
      <div ref={drawerFocusTrapRef}>
        <MobileDrawer isOpen={isMobileDrawerOpen} onClose={closeMobileDrawer} />
      </div>

      {/* Main Application Layout */}
      <div className="flex h-screen bg-school-blue-50">
        {/* Desktop Sidebar - Hidden on Mobile */}
        {isDesktopDevice() && <Sidebar />}
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <Header />
          
          {/* Main Content */}
          <main 
            id="main-content" 
            className={cn(
              "flex-1 overflow-auto bg-school-blue-50",
              // Add padding for mobile bottom navigation
              isMobileDevice() && "pb-20"
            )}
            role="main"
            aria-label="Main content"
          >
            {/* Profile Completion Modal */}
            <ProfileCompletionModal 
              isOpen={needsProfileCompletion} 
              user={user || {}} 
            />

            {/* Content Container */}
            <div className="min-h-full">
              {/* Route Content */}
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/donors">
                  <ProtectedRoute permissions={[PERMISSIONS.DONORS_VIEW]}>
                    <Donors />
                  </ProtectedRoute>
                </Route>
                <Route path="/segments">
                  <ProtectedRoute permissions={[PERMISSIONS.DONORS_VIEW]}>
                    <Segments />
                  </ProtectedRoute>
                </Route>
                <Route path="/campaigns">
                  <ProtectedRoute permissions={[PERMISSIONS.CAMPAIGNS_VIEW]}>
                    <Campaigns />
                  </ProtectedRoute>
                </Route>
                <Route path="/communications">
                  <ProtectedRoute permissions={[PERMISSIONS.COMMUNICATIONS_VIEW]}>
                    <Communications />
                  </ProtectedRoute>
                </Route>
                <Route path="/analytics">
                  <ProtectedRoute permissions={[PERMISSIONS.ANALYTICS_VIEW]}>
                    <Analytics />
                  </ProtectedRoute>
                </Route>
                <Route path="/import">
                  <ProtectedRoute permissions={[PERMISSIONS.DATA_IMPORT]}>
                    <ImportPage />
                  </ProtectedRoute>
                </Route>
                <Route path="/access-denied" component={AccessDeniedPage} />
                <Route component={NotFound} />
              </Switch>
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Navigation - Only shown on mobile devices */}
      {isMobileDevice() && (
        <>
          <MobileBottomNav />
          <QuickActionButton />
        </>
      )}
    </>
  );
}

// Main Router Component
function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading screen while authenticating
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Show landing page for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen">
        <Switch>
          <Route path="/" component={Landing} />
          <Route component={Landing} />
        </Switch>
      </div>
    );
  }

  // Show main authenticated application
  return <AuthenticatedApp />;
}

// Context Providers Wrapper
function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

// Main App Component
function App() {
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  // Initialize navigation system
  useEffect(() => {
    // Set up navigation system after mount
    const timer = setTimeout(() => {
      setIsNavigationReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Set global app title for accessibility
  usePageTitle("Fundraising Platform", "School in the Square donor and campaign management system");

  return (
    <AppProviders>
      <div className="app-container">
        {/* Global Toast Container */}
        <Toaster />
        
        {/* Main Router */}
        {isNavigationReady ? <Router /> : <LoadingScreen />}
      </div>
    </AppProviders>
  );
}

export default App;