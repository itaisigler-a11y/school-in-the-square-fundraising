// Mobile touch accessibility audit and enhancements for WCAG 2.1 AA compliance
import { useEffect, useState, useCallback } from 'react';

// WCAG 2.1 AA minimum touch target sizes
export const TOUCH_TARGET_SIZES = {
  MINIMUM: 44, // 44px minimum for WCAG AA
  RECOMMENDED: 48, // 48px recommended for better usability
  LARGE: 56, // Large touch targets for better accessibility
  EXTRA_LARGE: 64 // Extra large for users with motor impairments
} as const;

// Touch target audit interface
interface TouchTargetAudit {
  element: HTMLElement;
  width: number;
  height: number;
  area: number;
  meetsMinimum: boolean;
  meetsRecommended: boolean;
  selector: string;
  role: string;
  hasLabel: boolean;
  isSpacedProperly: boolean;
}

// Hook for touch target size auditing
export function useTouchTargetAudit() {
  const [auditResults, setAuditResults] = useState<TouchTargetAudit[]>([]);

  const auditTouchTargets = useCallback(() => {
    if (typeof window === 'undefined') return;

    const interactiveElements = document.querySelectorAll(
      'button, a, input, select, textarea, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"]), summary'
    );

    const results: TouchTargetAudit[] = [];

    interactiveElements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      const rect = htmlElement.getBoundingClientRect();
      
      // getBoundingClientRect() already includes padding, border, and content
      // No need to double-count padding - use dimensions as-is
      const effectiveWidth = rect.width;
      const effectiveHeight = rect.height;
      const area = effectiveWidth * effectiveHeight;

      const audit: TouchTargetAudit = {
        element: htmlElement,
        width: effectiveWidth,
        height: effectiveHeight,
        area,
        meetsMinimum: effectiveWidth >= TOUCH_TARGET_SIZES.MINIMUM && effectiveHeight >= TOUCH_TARGET_SIZES.MINIMUM,
        meetsRecommended: effectiveWidth >= TOUCH_TARGET_SIZES.RECOMMENDED && effectiveHeight >= TOUCH_TARGET_SIZES.RECOMMENDED,
        selector: getElementSelector(htmlElement),
        role: htmlElement.getAttribute('role') || htmlElement.tagName.toLowerCase(),
        hasLabel: hasAccessibleLabel(htmlElement),
        isSpacedProperly: checkSpacing(htmlElement)
      };

      results.push(audit);
    });

    setAuditResults(results);
    return results;
  }, []);

  useEffect(() => {
    // Run audit on mount and when DOM changes
    auditTouchTargets();
    
    // Set up mutation observer for dynamic content
    const observer = new MutationObserver(() => {
      setTimeout(auditTouchTargets, 100); // Debounce
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'role']
    });

    return () => observer.disconnect();
  }, [auditTouchTargets]);

  const getFailingTargets = useCallback(() => {
    return auditResults.filter(result => !result.meetsMinimum);
  }, [auditResults]);

  const getRecommendationFailures = useCallback(() => {
    return auditResults.filter(result => result.meetsMinimum && !result.meetsRecommended);
  }, [auditResults]);

  const getFailingTargetsWithDetails = useCallback(() => {
    return auditResults.filter(result => !result.meetsMinimum).map(result => ({
      ...result,
      remediation: generateRemediationCSS(result),
      severity: result.width < 24 || result.height < 24 ? 'critical' : 'high'
    }));
  }, [auditResults]);

  const getCriticalFailures = useCallback(() => {
    return auditResults.filter(result => 
      result.width < 24 || result.height < 24 || // Severely undersized
      (!result.hasLabel && !result.meetsMinimum) // Both size and accessibility issues
    );
  }, [auditResults]);

  return {
    auditResults,
    auditTouchTargets,
    getFailingTargets,
    getFailingTargetsWithDetails,
    getCriticalFailures,
    getRecommendationFailures
  };
}

function getElementSelector(element: HTMLElement): string {
  if (element.id) return `#${element.id}`;
  if (element.getAttribute('data-testid')) return `[data-testid="${element.getAttribute('data-testid')}"]`;
  if (element.className) return `.${element.className.split(' ')[0]}`;
  return element.tagName.toLowerCase();
}

function hasAccessibleLabel(element: HTMLElement): boolean {
  // Check for various accessibility labeling methods
  return !!(
    element.getAttribute('aria-label') ||
    element.getAttribute('aria-labelledby') ||
    element.getAttribute('title') ||
    element.textContent?.trim() ||
    (element.tagName === 'INPUT' && element.getAttribute('placeholder')) ||
    (element.tagName === 'IMG' && element.getAttribute('alt'))
  );
}

// Generate CSS remediation suggestions for failing touch targets
function generateRemediationCSS(audit: TouchTargetAudit): string {
  const { width, height, selector } = audit;
  const minSize = TOUCH_TARGET_SIZES.MINIMUM;
  
  const suggestions: string[] = [];
  
  if (width < minSize || height < minSize) {
    const paddingNeeded = Math.max(0, (minSize - Math.min(width, height)) / 2);
    suggestions.push(`${selector} { min-width: ${minSize}px; min-height: ${minSize}px; padding: ${paddingNeeded}px; }`);
  }
  
  if (!audit.isSpacedProperly) {
    suggestions.push(`${selector} { margin: 8px; }`);
  }
  
  if (!audit.hasLabel) {
    suggestions.push(`/* Add aria-label or accessible text to ${selector} */`);
  }
  
  return suggestions.join('\n');
}

function checkSpacing(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const siblings = Array.from(element.parentNode?.children || [])
    .filter(child => child !== element && child instanceof HTMLElement) as HTMLElement[];

  // Check if element has adequate spacing from adjacent interactive elements
  const minSpacing = 8; // 8px minimum spacing
  
  return siblings.every(sibling => {
    const siblingRect = sibling.getBoundingClientRect();
    
    // Check if elements are horizontally or vertically adjacent
    const horizontalDistance = Math.min(
      Math.abs(rect.right - siblingRect.left),
      Math.abs(siblingRect.right - rect.left)
    );
    
    const verticalDistance = Math.min(
      Math.abs(rect.bottom - siblingRect.top),
      Math.abs(siblingRect.bottom - rect.top)
    );
    
    // Elements should have minimum spacing if they're adjacent
    const isAdjacent = 
      (horizontalDistance < 10 && Math.abs(rect.top - siblingRect.top) < rect.height) ||
      (verticalDistance < 10 && Math.abs(rect.left - siblingRect.left) < rect.width);
    
    return !isAdjacent || (horizontalDistance >= minSpacing && verticalDistance >= minSpacing);
  });
}

// Touch gesture accessibility enhancements
export function useTouchGestureAccessibility() {
  const [gestureAnnouncements, setGestureAnnouncements] = useState<string[]>([]);

  const announceGesture = useCallback((gesture: string, result?: string) => {
    const announcement = result ? `${gesture}: ${result}` : gesture;
    setGestureAnnouncements(prev => [...prev.slice(-4), announcement]); // Keep last 5 announcements
    
    // Announce to screen readers
    const liveRegion = document.getElementById('aria-live-polite');
    if (liveRegion) {
      liveRegion.textContent = announcement;
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    }
  }, []);

  const handleSwipe = useCallback((direction: 'left' | 'right' | 'up' | 'down', callback?: () => void) => {
    announceGesture(`Swiped ${direction}`);
    callback?.();
  }, [announceGesture]);

  const handlePinch = useCallback((scale: number, callback?: () => void) => {
    const action = scale > 1 ? 'zoomed in' : 'zoomed out';
    announceGesture(`Pinch gesture: ${action}`);
    callback?.();
  }, [announceGesture]);

  const handleLongPress = useCallback((callback?: () => void) => {
    announceGesture('Long press detected');
    callback?.();
  }, [announceGesture]);

  return {
    gestureAnnouncements,
    announceGesture,
    handleSwipe,
    handlePinch,
    handleLongPress
  };
}

// Touch-friendly component wrapper
interface TouchAccessibleProps {
  children: React.ReactNode;
  onActivate?: () => void;
  label?: string;
  description?: string;
  minSize?: keyof typeof TOUCH_TARGET_SIZES;
  spacing?: 'tight' | 'normal' | 'loose';
}

export function TouchAccessible({
  children,
  onActivate,
  label,
  description,
  minSize = 'RECOMMENDED',
  spacing = 'normal'
}: TouchAccessibleProps) {
  const targetSize = TOUCH_TARGET_SIZES[minSize];
  const spacingMap = {
    tight: '0.25rem',
    normal: '0.5rem',
    loose: '1rem'
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onActivate?.();
        }
      }}
      aria-label={label}
      aria-describedby={description ? `desc-${Math.random().toString(36).substr(2, 9)}` : undefined}
      style={{
        minWidth: `${targetSize}px`,
        minHeight: `${targetSize}px`,
        margin: spacingMap[spacing],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        outline: 'none',
        borderRadius: '0.375rem',
        transition: 'all 0.2s ease'
      }}
      className="focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-95 touch-manipulation"
    >
      {children}
      {description && (
        <span id={`desc-${Math.random().toString(36).substr(2, 9)}`} className="sr-only">
          {description}
        </span>
      )}
    </div>
  );
}

// Mobile screen reader navigation helpers
export function useMobileScreenReader() {
  const [isVoiceOverActive, setIsVoiceOverActive] = useState(false);
  const [isTalkBackActive, setIsTalkBackActive] = useState(false);

  useEffect(() => {
    // Detect mobile screen readers
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);

    // Basic screen reader detection (not foolproof)
    const hasScreenReader = 
      'speechSynthesis' in window ||
      'webkitSpeechSynthesis' in window ||
      window.navigator.userAgent.includes('JAWS') ||
      window.navigator.userAgent.includes('NVDA');

    if (isIOS && hasScreenReader) {
      setIsVoiceOverActive(true);
    } else if (isAndroid && hasScreenReader) {
      setIsTalkBackActive(true);
    }
  }, []);

  const announcePageChange = useCallback((pageName: string) => {
    const announcement = `Navigated to ${pageName}`;
    setTimeout(() => {
      const liveRegion = document.getElementById('aria-live-polite');
      if (liveRegion) {
        liveRegion.textContent = announcement;
      }
    }, 100);
  }, []);

  const announceStatusChange = useCallback((status: string) => {
    const liveRegion = document.getElementById('aria-live-assertive');
    if (liveRegion) {
      liveRegion.textContent = status;
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 2000);
    }
  }, []);

  return {
    isVoiceOverActive,
    isTalkBackActive,
    announcePageChange,
    announceStatusChange
  };
}

// Responsive touch target utility classes for WCAG 2.1 AA compliance
export const TOUCH_TARGET_CLASSES = {
  // Core size classes
  minimum: `min-h-[44px] min-w-[44px]`,
  recommended: `min-h-[48px] min-w-[48px]`,
  large: `min-h-[56px] min-w-[56px]`,
  extraLarge: `min-h-[64px] min-w-[64px]`,
  
  // Spacing utilities
  spacing: {
    tight: 'p-1',
    normal: 'p-2',
    loose: 'p-4'
  },
  
  // Interactive element fixes
  interactive: {
    button: 'min-h-[44px] min-w-[44px] p-2 touch-manipulation',
    link: 'min-h-[44px] inline-block py-2 px-1 touch-manipulation',
    icon: 'min-h-[44px] min-w-[44px] p-3 touch-manipulation'
  },
  
  // Remediation classes
  remediation: {
    undersized: 'min-h-[44px] min-w-[44px] p-2',
    spacing: 'm-2',
    focus: 'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2'
  }
};

// CSS utility generator for failing touch targets
export function generateTouchTargetFix(element: HTMLElement): string {
  const rect = element.getBoundingClientRect();
  const classes: string[] = [];
  
  if (rect.width < TOUCH_TARGET_SIZES.MINIMUM || rect.height < TOUCH_TARGET_SIZES.MINIMUM) {
    classes.push(TOUCH_TARGET_CLASSES.minimum);
  }
  
  // Add appropriate spacing
  if (!checkSpacing(element)) {
    classes.push(TOUCH_TARGET_CLASSES.remediation.spacing);
  }
  
  // Ensure focus visibility
  classes.push(TOUCH_TARGET_CLASSES.remediation.focus);
  
  return classes.join(' ');
}

// Development-only touch target visualization
export function TouchTargetDebugger() {
  const { auditResults } = useTouchTargetAudit();

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed top-4 right-4 bg-black/80 text-white p-4 rounded-lg max-w-sm z-50">
      <h3 className="font-bold mb-2">Touch Target Audit</h3>
      <div className="text-sm space-y-1">
        <p>Total targets: {auditResults.length}</p>
        <p className="text-red-300">
          Failing minimum: {auditResults.filter(r => !r.meetsMinimum).length}
        </p>
        <p className="text-yellow-300">
          Below recommended: {auditResults.filter(r => r.meetsMinimum && !r.meetsRecommended).length}
        </p>
        <p className="text-green-300">
          Meeting standards: {auditResults.filter(r => r.meetsRecommended).length}
        </p>
      </div>
    </div>
  );
}