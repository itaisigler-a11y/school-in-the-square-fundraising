import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NavigationState {
  // Basic navigation state
  isMobileNavOpen: boolean;
  isDesktopSidebarCollapsed: boolean;
  
  // Actions
  setMobileNavOpen: (open: boolean) => void;
  toggleDesktopSidebar: () => void;
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set) => ({
      // Initial state
      isMobileNavOpen: false,
      isDesktopSidebarCollapsed: false,
      
      // Actions
      setMobileNavOpen: (open) => set({ isMobileNavOpen: open }),
      
      toggleDesktopSidebar: () => set((state) => ({
        isDesktopSidebarCollapsed: !state.isDesktopSidebarCollapsed
      }))
    }),
    {
      name: 'navigation-store',
      // Only persist user preferences
      partialize: (state) => ({
        isDesktopSidebarCollapsed: state.isDesktopSidebarCollapsed
      }),
    }
  )
);

// Hook for mobile navigation state
export function useMobileNavigation() {
  const { 
    isMobileNavOpen, 
    setMobileNavOpen 
  } = useNavigationStore();
  
  return {
    isOpen: isMobileNavOpen,
    open: () => setMobileNavOpen(true),
    close: () => setMobileNavOpen(false),
    toggle: () => setMobileNavOpen(!isMobileNavOpen)
  };
}