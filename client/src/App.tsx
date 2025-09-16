import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { UIModeProvider } from "@/lib/ui-mode-context";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { ProfileCompletionModal } from "@/components/auth/profile-completion-modal";
import { PERMISSIONS } from "@shared/permissions";
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
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

function Router() {
  const { isAuthenticated, isLoading, needsProfileCompletion, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-primary-foreground font-bold text-lg">S²</span>
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-auto">
          {/* Profile Completion Modal */}
          <ProfileCompletionModal 
            isOpen={needsProfileCompletion} 
            user={user || {}} 
          />
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
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UIModeProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </UIModeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
