// Accessibility utilities for WCAG 2.1 AA compliance
import { useEffect, useRef, useState, useCallback } from 'react';

// Focus management utilities
export function useFocusManagement() {
  const focusRef = useRef<HTMLElement | null>(null);
  const [focusVisible, setFocusVisible] = useState(false);

  // Detect if user is navigating with keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setFocusVisible(true);
      }
    };

    const handleMouseDown = () => {
      setFocusVisible(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  const setFocus = (element: HTMLElement) => {
    focusRef.current = element;
    element.focus();
  };

  const trapFocus = (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }

      if (e.key === 'Escape') {
        // Allow escape to close modal/drawer
        const closeButton = container.querySelector('[data-close]') as HTMLElement;
        if (closeButton) closeButton.click();
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  };

  return { focusVisible, setFocus, trapFocus, focusRef };
}

// Screen reader utilities
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Clean up after announcement with proper error handling
  const timeoutId = setTimeout(() => {
    try {
      if (announcement.parentNode) {
        document.body.removeChild(announcement);
      }
    } catch (error) {
      console.warn('Failed to remove announcement element:', error);
    }
  }, 1000);
  
  // Return cleanup function for immediate cleanup if needed
  return () => {
    clearTimeout(timeoutId);
    try {
      if (announcement.parentNode) {
        document.body.removeChild(announcement);
      }
    } catch (error) {
      // Element already removed, ignore error
    }
  };
}

// Hook for reduced motion preferences
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

// Color contrast utility for dynamic themes
export function getContrastRatio(color1: string, color2: string): number {
  // Simplified contrast calculation
  // In production, use a proper color contrast library
  const getLuminance = (color: string) => {
    // Simple RGB extraction (works for hex colors)
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    const sRGB = [r, g, b].map(c => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  };

  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

// ARIA utilities
export function useAriaDescribedBy(id: string, content: string) {
  useEffect(() => {
    const element = document.getElementById(id);
    if (!element) {
      const description = document.createElement('div');
      description.id = id;
      description.className = 'sr-only';
      description.textContent = content;
      document.body.appendChild(description);

      return () => {
        const el = document.getElementById(id);
        if (el) document.body.removeChild(el);
      };
    }
  }, [id, content]);

  return id;
}

// Hook for managing form accessibility
export function useFormAccessibility() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [announceErrors, setAnnounceErrors] = useState(false);

  const validateField = useCallback((fieldName: string, value: any, rules: any[]) => {
    // Basic validation - extend as needed
    const fieldErrors: string[] = [];
    
    rules.forEach(rule => {
      if (rule.required && (!value || value.toString().trim() === '')) {
        fieldErrors.push(`${fieldName} is required`);
      }
      if (rule.minLength && value && value.toString().length < rule.minLength) {
        fieldErrors.push(`${fieldName} must be at least ${rule.minLength} characters`);
      }
      if (rule.email && value && !/^\S+@\S+\.\S+$/.test(value)) {
        fieldErrors.push(`${fieldName} must be a valid email address`);
      }
    });

    if (fieldErrors.length > 0) {
      setErrors(prev => ({ ...prev, [fieldName]: fieldErrors[0] }));
      return false;
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
      return true;
    }
  }, []);

  // Announce errors to screen readers when they change
  useEffect(() => {
    if (announceErrors && Object.keys(errors).length > 0) {
      const errorMessages = Object.values(errors).join('. ');
      announceToScreenReader(`Form validation errors: ${errorMessages}`, 'assertive');
    }
  }, [errors, announceErrors]);

  const getFieldProps = (fieldName: string) => ({
    'aria-invalid': !!errors[fieldName],
    'aria-describedby': errors[fieldName] ? `${fieldName}-error` : undefined,
  });

  const getErrorProps = (fieldName: string) => ({
    id: `${fieldName}-error`,
    role: 'alert',
    'aria-live': 'polite',
  });

  return {
    errors,
    validateField,
    getFieldProps,
    getErrorProps,
    setAnnounceErrors
  };
}

// Hook for managing page titles for screen readers
export function usePageTitle(title: string, description?: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} - School in the Square Fundraising Platform`;

    // Announce page change to screen readers
    announceToScreenReader(
      `Navigated to ${title}${description ? `. ${description}` : ''}`,
      'polite'
    );

    return () => {
      document.title = previousTitle;
    };
  }, [title, description]);
}

// Accessible breadcrumb navigation configuration
export const breadcrumbClasses = {
  nav: "flex",
  list: "flex items-center space-x-2",
  item: "flex items-center",
  separator: "fas fa-chevron-right text-school-blue-400 mx-2",
  current: "text-school-blue-600 font-medium",
  link: "text-school-blue-500 hover:text-school-blue-700 transition-colors"
};

// Skip Links Component for accessibility
export function SkipLinks() {
  return (
    <>
      <a
        href="#main-content"
        className="skip-link"
        data-testid="skip-main"
      >
        Skip to main content
      </a>
      <a
        href="#navigation"
        className="skip-link"
        data-testid="skip-nav"
      >
        Skip to navigation
      </a>
    </>
  );
}

// Accessible Loading Spinner Component
export function AccessibleLoadingSpinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="flex justify-center items-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-school-blue-600"></div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

// Focus trap utility for modals and drawers
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    previousFocusRef.current = document.activeElement as HTMLElement;

    const focusableElements = container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (firstElement) {
      firstElement.focus();
    }

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (focusableElements.length === 1) {
          e.preventDefault();
          return;
        }

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);

    return () => {
      container.removeEventListener('keydown', handleTabKey);
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isActive]);

  return containerRef;
}