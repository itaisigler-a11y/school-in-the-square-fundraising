import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useUIMode } from "@/lib/ui-mode-context";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export function Header() {
  const [location] = useLocation();
  const { isSimpleMode, toggleMode } = useUIMode();
  const { user, getUserDisplayName, getRoleDisplayName, logout } = useAuth();

  const getPageTitle = () => {
    switch (location) {
      case "/": return "Dashboard";
      case "/donors": return "Donor Management";
      case "/campaigns": return "Campaign Management";
      case "/communications": return "Communications";
      case "/analytics": return "Analytics";
      case "/import": return "Data Import";
      default: return "Dashboard";
    }
  };

  const getPageDescription = () => {
    switch (location) {
      case "/": return "Welcome back! Here's your fundraising overview.";
      case "/donors": return "Manage donor profiles and track engagement.";
      case "/campaigns": return "Create and monitor fundraising campaigns.";
      case "/communications": return "Send emails and track donor communications.";
      case "/analytics": return "Analyze fundraising performance and trends.";
      case "/import": return "Import donor data from CSV and Excel files.";
      default: return "Welcome back! Here's your fundraising overview.";
    }
  };

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{getPageTitle()}</h1>
            <p className="text-sm text-muted-foreground">{getPageDescription()}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 px-3 py-2 h-auto" data-testid="button-user-menu">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.profileImageUrl} alt={getUserDisplayName()} />
                  <AvatarFallback data-testid="text-user-initials">
                    {getUserDisplayName().split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left hidden sm:block">
                  <div className="text-sm font-medium" data-testid="text-user-name">
                    {getUserDisplayName() || 'User'}
                  </div>
                  <div className="text-xs text-muted-foreground" data-testid="text-user-role">
                    {user?.jobTitle || getRoleDisplayName()}
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" data-testid="menu-user-dropdown">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem data-testid="menuitem-profile">
                <i className="fas fa-user mr-2 text-muted-foreground"></i>
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem data-testid="menuitem-preferences">
                <i className="fas fa-cog mr-2 text-muted-foreground"></i>
                Preferences
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} data-testid="menuitem-logout">
                <i className="fas fa-sign-out-alt mr-2 text-muted-foreground"></i>
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* UI Mode Toggle */}
          <div className="flex items-center gap-3 bg-muted/50 rounded-lg px-3 py-2">
            <span className="text-sm font-medium text-muted-foreground">
              {isSimpleMode ? "Simple" : "Advanced"}
            </span>
            <Switch
              checked={!isSimpleMode}
              onCheckedChange={toggleMode}
              data-testid="toggle-ui-mode"
              className="data-[state=checked]:bg-primary"
            />
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {isSimpleMode ? "Show all features" : "Simplified view"}
            </span>
          </div>
          
          {/* Date Range Selector - Only show in Advanced mode or Dashboard */}
          {(!isSimpleMode || location === "/") && (
            <Select defaultValue="30days">
              <SelectTrigger className="w-40" data-testid="select-date-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="90days">Last 90 days</SelectItem>
                <SelectItem value="year">This year</SelectItem>
                <SelectItem value="lastyear">Last year</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    </header>
  );
}
