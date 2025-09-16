import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type UIMode = 'simple' | 'advanced';

interface UIModeContextType {
  mode: UIMode;
  isSimpleMode: boolean;
  isAdvancedMode: boolean;
  toggleMode: () => void;
  setMode: (mode: UIMode) => void;
}

const UIModeContext = createContext<UIModeContextType | undefined>(undefined);

interface UIModeProviderProps {
  children: ReactNode;
}

const UI_MODE_STORAGE_KEY = 'fundraising-ui-mode';

export function UIModeProvider({ children }: UIModeProviderProps) {
  const [mode, setModeState] = useState<UIMode>(() => {
    // Load mode from localStorage, default to 'simple'
    const saved = localStorage.getItem(UI_MODE_STORAGE_KEY);
    return (saved === 'advanced' ? 'advanced' : 'simple') as UIMode;
  });

  // Persist mode changes to localStorage
  useEffect(() => {
    localStorage.setItem(UI_MODE_STORAGE_KEY, mode);
  }, [mode]);

  const setMode = (newMode: UIMode) => {
    setModeState(newMode);
  };

  const toggleMode = () => {
    setModeState(current => current === 'simple' ? 'advanced' : 'simple');
  };

  const contextValue: UIModeContextType = {
    mode,
    isSimpleMode: mode === 'simple',
    isAdvancedMode: mode === 'advanced',
    toggleMode,
    setMode,
  };

  return (
    <UIModeContext.Provider value={contextValue}>
      {children}
    </UIModeContext.Provider>
  );
}

export function useUIMode(): UIModeContextType {
  const context = useContext(UIModeContext);
  if (context === undefined) {
    throw new Error('useUIMode must be used within a UIModeProvider');
  }
  return context;
}

// Hook for components that need to conditionally render based on mode
export function useSimpleModeFilter<T>(
  items: T[],
  simpleItems: T[],
  getKey: (item: T) => string
) {
  const { isSimpleMode } = useUIMode();
  
  if (isSimpleMode) {
    // Only return items that are in the simple list
    const simpleKeys = new Set(simpleItems.map(getKey));
    return items.filter(item => simpleKeys.has(getKey(item)));
  }
  
  return items;
}