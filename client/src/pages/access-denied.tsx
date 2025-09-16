import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

export default function AccessDeniedPage() {
  const auth = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md mx-auto p-6">
        <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
          <i className="fas fa-shield-alt text-2xl text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access this page.
          </p>
        </div>
        
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            Current role: <span className="font-medium text-foreground">{auth.getRoleDisplayName()}</span>
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Contact your administrator if you believe this is an error.
          </p>
        </div>
        
        <div className="flex gap-3 justify-center">
          <Button
            variant="secondary"
            onClick={() => window.history.back()}
            data-testid="button-go-back"
          >
            Go Back
          </Button>
          <Button
            onClick={() => window.location.href = '/'}
            data-testid="button-dashboard"
          >
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}