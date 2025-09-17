// Enhanced keyboard navigation and shortcut management for accessibility
import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { announceToScreenReader } from './accessibility-utils';

// Comprehensive keyboard shortcuts configuration with safe, non-reserved combinations
export const KEYBOARD_SHORTCUTS = {
  // Global navigation shortcuts (using Alt+Shift combinations to avoid browser conflicts)
  DASHBOARD: { keys: ['Alt+Shift+1'], description: 'Go to Dashboard', action: '/' },
  DONORS: { keys: ['Alt+Shift+2'], description: 'Go to Donors', action: '/donors' },
  CAMPAIGNS: { keys: ['Alt+Shift+3'], description: 'Go to Campaigns', action: '/campaigns' },
  COMMUNICATIONS: { keys: ['Alt+Shift+4'], description: 'Go to Communications', action: '/communications' },
  ANALYTICS: { keys: ['Alt+Shift+5'], description: 'Go to Analytics', action: '/analytics' },
  
  // UI shortcuts (using Alt+Shift combinations)
  SEARCH: { keys: ['Alt+Shift+F'], description: 'Global search', action: 'search' },
  TOGGLE_SIDEBAR: { keys: ['Alt+Shift+S'], description: 'Toggle sidebar', action: 'sidebar' },
  ADD_DONOR: { keys: ['Alt+Shift+D'], description: 'Add new donor', action: 'add-donor' },
  
  // Accessibility shortcuts (keeping Alt combinations for skip links)
  SKIP_TO_MAIN: { keys: ['Alt+m'], description: 'Skip to main content', action: 'skip-main' },
  SKIP_TO_NAV: { keys: ['Alt+n'], description: 'Skip to navigation', action: 'skip-nav' },
  HELP: { keys: ['Alt+Shift+H', 'F1'], description: 'Show keyboard shortcuts help', action: 'help' },
  
  // Form shortcuts (safe combinations only)
  SAVE: { keys: ['Alt+Shift+Enter'], description: 'Save current form', action: 'save' },
  CANCEL: { keys: ['Escape'], description: 'Cancel current action', action: 'cancel' },
  
  // Table/List navigation
  ARROW_UP: { keys: ['ArrowUp'], description: 'Navigate up in list', action: 'nav-up' },
  ARROW_DOWN: { keys: ['ArrowDown'], description: 'Navigate down in list', action: 'nav-down' },
  ENTER: { keys: ['Enter', 'Space'], description: 'Activate selected item', action: 'activate' }
} as const;

export type KeyboardShortcutAction = typeof KEYBOARD_SHORTCUTS[keyof typeof KEYBOARD_SHORTCUTS]['action'];

// Hook for global keyboard shortcuts
export function useGlobalKeyboardShortcuts() {
  const [, setLocation] = useLocation();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const { key, metaKey, ctrlKey, altKey, shiftKey, target } = event;
    
    // Only activate shortcuts when focus is within our app shell (not in input fields)
    const targetElement = target as HTMLElement;
    const isInInputField = targetElement?.tagName === 'INPUT' || 
                          targetElement?.tagName === 'TEXTAREA' || 
                          targetElement?.contentEditable === 'true';
    
    // Don't interfere with typing in form fields
    if (isInInputField) return;
    
    // Create key combination string
    const keyCombo = [
      altKey && 'Alt',
      (metaKey || ctrlKey) && (metaKey ? 'Meta' : 'Ctrl'),
      shiftKey && 'Shift',
      key
    ].filter(Boolean).join('+');

    // Find matching shortcut
    const shortcut = Object.values(KEYBOARD_SHORTCUTS).find(s => 
      s.keys.includes(keyCombo)
    );

    if (!shortcut) return;

    // Only prevent default for our non-reserved shortcuts
    // Don't prevent reserved browser shortcuts like Ctrl+S, Ctrl+1-9, etc.
    const isReservedShortcut = (
      (ctrlKey || metaKey) && /^[1-9]$/.test(key) || // Browser tab switching
      (ctrlKey || metaKey) && key === 's' ||         // Save page
      (ctrlKey || metaKey) && key === 'r' ||         // Refresh
      (ctrlKey || metaKey) && key === 'w' ||         // Close tab
      (ctrlKey || metaKey) && key === 't' ||         // New tab
      (ctrlKey || metaKey) && key === 'n'            // New window
    );

    if (!isReservedShortcut) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Handle the shortcut action
    handleShortcutAction(shortcut.action, setLocation);
    
    // Announce to screen reader with better context
    announceToScreenReader(`Keyboard shortcut activated: ${shortcut.description}`, 'polite');
  }, [setLocation]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Handle shortcut actions
function handleShortcutAction(action: string, setLocation: (path: string) => void) {
  switch (action) {
    case '/':
    case '/donors':
    case '/campaigns':
    case '/communications':
    case '/analytics':
      setLocation(action);
      break;
      
    case 'search':
      // Focus search input if available
      const searchInput = document.querySelector('input[type="search"], [data-testid*="search"]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
      break;
      
    case 'sidebar':
      // Toggle sidebar
      const sidebarToggle = document.querySelector('[data-testid="sidebar-toggle"]') as HTMLButtonElement;
      if (sidebarToggle) {
        sidebarToggle.click();
      }
      break;
      
    case 'add-donor':
      // Navigate to add donor or open modal
      const addDonorButton = document.querySelector('[data-testid*="add-donor"], [data-testid*="create-donor"]') as HTMLButtonElement;
      if (addDonorButton) {
        addDonorButton.click();
      } else {
        setLocation('/donors?new=true');
      }
      break;
      
    case 'skip-main':
      const mainContent = document.getElementById('main-content') || document.querySelector('main');
      if (mainContent) {
        (mainContent as HTMLElement).focus();
        (mainContent as HTMLElement).scrollIntoView({ behavior: 'smooth' });
      }
      break;
      
    case 'skip-nav':
      const navigation = document.getElementById('navigation') || document.querySelector('nav');
      if (navigation) {
        (navigation as HTMLElement).focus();
        (navigation as HTMLElement).scrollIntoView({ behavior: 'smooth' });
      }
      break;
      
    case 'help':
      // Show keyboard shortcuts help modal
      showKeyboardShortcutsHelp();
      break;
      
    case 'save':
      // Find and click save button in current form
      const saveButton = document.querySelector('form button[type="submit"], [data-testid*="save"], [data-testid*="submit"]') as HTMLButtonElement;
      if (saveButton && !saveButton.disabled) {
        saveButton.click();
      }
      break;
      
    case 'cancel':
      // Find and click cancel button or close modal
      const cancelButton = document.querySelector('[data-testid*="cancel"], [data-testid*="close"], [aria-label*="close"]') as HTMLButtonElement;
      if (cancelButton) {
        cancelButton.click();
      }
      break;
  }
}

// Enhanced focus management for complex components
export function useEnhancedFocusManagement() {
  const containerRef = useRef<HTMLElement>(null);
  const focusableElementsRef = useRef<HTMLElement[]>([]);
  const currentFocusIndexRef = useRef(-1);

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    
    const selector = [
      'button:not([disabled]):not([tabindex="-1"])',
      'a[href]:not([tabindex="-1"])',
      'input:not([disabled]):not([tabindex="-1"])',
      'select:not([disabled]):not([tabindex="-1"])',
      'textarea:not([disabled]):not([tabindex="-1"])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
      'summary'
    ].join(', ');
    
    return Array.from(containerRef.current.querySelectorAll(selector)) as HTMLElement[];
  }, []);

  const updateFocusableElements = useCallback(() => {
    focusableElementsRef.current = getFocusableElements();
  }, [getFocusableElements]);

  const focusElement = useCallback((index: number, announce = true) => {
    const elements = focusableElementsRef.current;
    if (index >= 0 && index < elements.length) {
      const element = elements[index];
      element.focus();
      currentFocusIndexRef.current = index;
      
      if (announce) {
        // Announce focused element to screen reader
        const elementText = element.textContent || element.getAttribute('aria-label') || element.getAttribute('title') || 'Interactive element';
        announceToScreenReader(`Focused: ${elementText}`, 'polite');
      }
    }
  }, []);

  const focusNext = useCallback(() => {
    const elements = focusableElementsRef.current;
    const nextIndex = (currentFocusIndexRef.current + 1) % elements.length;
    focusElement(nextIndex);
  }, [focusElement]);

  const focusPrevious = useCallback(() => {
    const elements = focusableElementsRef.current;
    const prevIndex = currentFocusIndexRef.current <= 0 
      ? elements.length - 1 
      : currentFocusIndexRef.current - 1;
    focusElement(prevIndex);
  }, [focusElement]);

  const focusFirst = useCallback(() => {
    focusElement(0);
  }, [focusElement]);

  const focusLast = useCallback(() => {
    focusElement(focusableElementsRef.current.length - 1);
  }, [focusElement]);

  // Handle arrow key navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const { key, target } = event;
    
    // Only handle if focus is within our container
    if (!containerRef.current?.contains(target as Node)) return;
    
    switch (key) {
      case 'ArrowDown':
        event.preventDefault();
        focusNext();
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusPrevious();
        break;
      case 'Home':
        event.preventDefault();
        focusFirst();
        break;
      case 'End':
        event.preventDefault();
        focusLast();
        break;
    }
  }, [focusNext, focusPrevious, focusFirst, focusLast]);

  useEffect(() => {
    updateFocusableElements();
    
    // Set up observers for dynamic content
    const observer = new MutationObserver(updateFocusableElements);
    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['disabled', 'tabindex', 'hidden']
      });
    }

    return () => observer.disconnect();
  }, [updateFocusableElements]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      return () => container.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown]);

  return {
    containerRef,
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    focusElement,
    updateFocusableElements
  };
}

// Enhanced keyboard shortcuts help modal with better screen reader support
function showKeyboardShortcutsHelp() {
  // Create accessible help modal with all keyboard shortcuts
  const helpContent = Object.entries(KEYBOARD_SHORTCUTS)
    .map(([name, shortcut]) => ({
      name: name.replace(/_/g, ' ').toLowerCase(),
      keys: shortcut.keys[0], // Show primary key combination
      description: shortcut.description,
      category: getShortcutCategory(name)
    }))
    .sort((a, b) => a.category.localeCompare(b.category));

  // Group shortcuts by category for better organization
  const groupedShortcuts = helpContent.reduce((groups, shortcut) => {
    const category = shortcut.category;
    if (!groups[category]) groups[category] = [];
    groups[category].push(shortcut);
    return groups;
  }, {} as Record<string, typeof helpContent>);

  // Create modal content
  const modalContent = Object.entries(groupedShortcuts)
    .map(([category, shortcuts]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      shortcuts
    }));

  // Store for access by modal components
  (window as any).keyboardShortcutsHelp = modalContent;
  
  // Announce to screen reader
  announceToScreenReader('Keyboard shortcuts help opened. Press Tab to navigate shortcuts, or Escape to close.', 'polite');
  
  // Trigger modal display event for components to listen to
  const event = new CustomEvent('show-keyboard-help', { detail: modalContent });
  document.dispatchEvent(event);
}

function getShortcutCategory(shortcutName: string): string {
  if (['DASHBOARD', 'DONORS', 'CAMPAIGNS', 'COMMUNICATIONS', 'ANALYTICS'].includes(shortcutName)) {
    return 'navigation';
  } else if (['SEARCH', 'TOGGLE_SIDEBAR', 'ADD_DONOR'].includes(shortcutName)) {
    return 'ui';
  } else if (['SKIP_TO_MAIN', 'SKIP_TO_NAV', 'HELP'].includes(shortcutName)) {
    return 'accessibility';
  } else if (['SAVE', 'CANCEL'].includes(shortcutName)) {
    return 'forms';
  } else {
    return 'general';
  }
}

// Roving tabindex management for lists and grids
export function useRovingTabindex(orientation: 'horizontal' | 'vertical' | 'grid' = 'vertical') {
  const { containerRef, focusNext, focusPrevious, focusFirst, focusLast } = useEnhancedFocusManagement();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const { key } = event;
    
    let handled = false;
    
    if (orientation === 'horizontal' || orientation === 'grid') {
      if (key === 'ArrowLeft') {
        focusPrevious();
        handled = true;
      } else if (key === 'ArrowRight') {
        focusNext();
        handled = true;
      }
    }
    
    if (orientation === 'vertical' || orientation === 'grid') {
      if (key === 'ArrowUp') {
        focusPrevious();
        handled = true;
      } else if (key === 'ArrowDown') {
        focusNext();
        handled = true;
      }
    }
    
    if (key === 'Home') {
      focusFirst();
      handled = true;
    } else if (key === 'End') {
      focusLast();
      handled = true;
    }
    
    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, [orientation, focusNext, focusPrevious, focusFirst, focusLast]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      return () => container.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown]);

  return containerRef;
}

// Focus trap for modals and overlays with enhanced features
export function useEnhancedFocusTrap(isActive: boolean, autoFocus = true) {
  const containerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const firstFocusableRef = useRef<HTMLElement | null>(null);
  const lastFocusableRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    
    // Store previous focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Find focusable elements
    const focusableElements = container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled]), [contenteditable="true"]'
    ) as NodeListOf<HTMLElement>;

    if (focusableElements.length === 0) return;

    firstFocusableRef.current = focusableElements[0];
    lastFocusableRef.current = focusableElements[focusableElements.length - 1];

    // Auto focus first element
    if (autoFocus && firstFocusableRef.current) {
      firstFocusableRef.current.focus();
    }

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (focusableElements.length === 1) {
        e.preventDefault();
        return;
      }

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusableRef.current) {
          e.preventDefault();
          lastFocusableRef.current?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusableRef.current) {
          e.preventDefault();
          firstFocusableRef.current?.focus();
        }
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Find close button or trigger escape action
        const closeButton = container.querySelector('[data-close], [aria-label*="close"], [data-testid*="close"]') as HTMLElement;
        if (closeButton) {
          closeButton.click();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    container.addEventListener('keydown', handleEscape);

    return () => {
      container.removeEventListener('keydown', handleTabKey);
      container.removeEventListener('keydown', handleEscape);
      
      // Restore previous focus
      if (previousFocusRef.current && document.body.contains(previousFocusRef.current)) {
        previousFocusRef.current.focus();
      }
    };
  }, [isActive, autoFocus]);

  return containerRef;
}