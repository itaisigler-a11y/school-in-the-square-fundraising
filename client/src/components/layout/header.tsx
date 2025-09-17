import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
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
import { MobileDrawerTrigger } from "@/components/layout/mobile-drawer";
import { isMobileDevice } from "@/lib/navigation-utils";
import { cn } from "@/lib/utils";
import logoUrl from "@assets/image_1758026275177.png";

export function Header() {
  const [location] = useLocation();
  const { user, getUserDisplayName, getRoleDisplayName, logout } = useAuth();

  // Simple page titles without complexity
  const getPageTitle = () => {
    switch (location) {
      case "/": return "Dashboard";
      case "/donors": return "Donors";
      case "/campaigns": return "Campaigns";
      case "/communications": return "Communications";
      case "/analytics": return "Analytics";
      case "/segments": return "Segments";
      case "/import": return "Import Data";
      case "/settings": return "Settings";
      default: return "Dashboard";
    }
  };

  const getPageDescription = () => {
    switch (location) {
      case "/": return "Your fundraising overview and key metrics";
      case "/donors": return "Manage donor profiles and relationships";
      case "/campaigns": return "Create and track fundraising campaigns";
      case "/communications": return "Email communications and templates";
      case "/analytics": return "Performance insights and reports";
      case "/segments": return "Organize donors into targeted groups";
      case "/import": return "Import donor data from files";
      case "/settings": return "Account and system settings";
      default: return "School in the Square Fundraising Platform";
    }
  };

  return (
    <header className="bg-white border-b border-school-blue-200 shadow-school sticky top-0 z-20">
      <div className="px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center gap-4 sm:gap-6 min-w-0 flex-1">
            {/* Mobile Menu Trigger */}
            <div className="lg:hidden">
              <MobileDrawerTrigger />
            </div>

            {/* School Logo and Branding - Prominently Displayed */}
            <div className="flex items-center gap-3 sm:gap-4 hidden lg:flex">
              <div className="w-16 h-16 xl:w-20 xl:h-20 flex items-center justify-center bg-white rounded-xl shadow-school border border-school-blue-100">
                <img 
                  src={logoUrl} 
                  alt="School in the Square Logo" 
                  className="w-full h-full object-contain p-1"
                />
              </div>
              <div className="flex flex-col">
                <h2 className="text-school-subheading font-bold text-school-blue-900 leading-tight">
                  School in the Square
                </h2>
                <p className="text-school-small text-school-blue-600 font-medium">
                  Fundraising Platform
                </p>
              </div>
            </div>

            {/* Page Title & Description */}
            <div className="min-w-0 flex-1">
              <h1 className="text-school-heading text-school-blue-900 font-bold tracking-tight truncate">
                {getPageTitle()}
              </h1>
              
              <p className="text-school-body text-school-blue-600 leading-tight hidden sm:block">
                {getPageDescription()}
              </p>
            </div>
          </div>
          
          {/* Right Section - User Profile Only */}
          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center gap-2 lg:gap-3 px-2 lg:px-4 py-2 lg:py-3 h-auto rounded-lg hover:bg-school-blue-50 hover:border-school-blue-200 border border-transparent transition-all duration-200" 
                  data-testid="button-user-menu"
                >
                  <Avatar className="h-8 w-8 lg:h-9 lg:w-9 ring-2 ring-school-blue-100">
                    <AvatarImage src={user?.profileImageUrl} alt={getUserDisplayName()} />
                    <AvatarFallback className="bg-school-blue-500 text-white font-semibold text-sm" data-testid="text-user-initials">
                      {getUserDisplayName().split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden lg:block">
                    <div className="text-sm lg:text-base font-semibold text-school-blue-900 truncate max-w-32" data-testid="text-user-name">
                      {getUserDisplayName() || 'User'}
                    </div>
                    <div className="text-xs lg:text-sm text-school-blue-600 truncate max-w-32" data-testid="text-user-role">
                      {user?.jobTitle || getRoleDisplayName()}
                    </div>
                  </div>
                  <i className="fas fa-chevron-down text-xs text-school-blue-400 hidden lg:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 lg:w-64 border-school-blue-200 shadow-school-lg" data-testid="menu-user-dropdown">
                <DropdownMenuLabel className="text-sm lg:text-base font-semibold text-school-blue-900">
                  My Account
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-school-blue-100" />
                
                <DropdownMenuItem className="text-school-blue-700 hover:bg-school-blue-50 hover:text-school-blue-900 cursor-pointer" data-testid="menuitem-profile">
                  <i className="fas fa-user mr-3 text-school-blue-500 w-4" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="text-school-blue-700 hover:bg-school-blue-50 hover:text-school-blue-900 cursor-pointer" data-testid="menuitem-preferences">
                  <i className="fas fa-cog mr-3 text-school-blue-500 w-4" />
                  Preferences
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className="bg-school-blue-100" />
                <DropdownMenuItem onClick={logout} className="text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer" data-testid="menuitem-logout">
                  <i className="fas fa-sign-out-alt mr-3 text-red-500 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Logo and Description */}
        <div className="lg:hidden mt-3 flex items-center gap-3">
          <div className="w-12 h-12 flex items-center justify-center bg-white rounded-lg shadow-school border border-school-blue-100">
            <img 
              src={logoUrl} 
              alt="School in the Square Logo" 
              className="w-full h-full object-contain p-1"
            />
          </div>
          <div className="flex flex-col flex-1">
            <h2 className="text-school-body font-bold text-school-blue-900">
              School in the Square
            </h2>
            <p className="text-school-small text-school-blue-600 hidden sm:block">
              {getPageDescription()}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

// Simple hook for header state management without complexity  
export function useHeaderContext() {
  const [location] = useLocation();
  
  return {
    currentPage: location
  };
}