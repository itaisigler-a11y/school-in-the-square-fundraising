// Navigation animations and performance optimizations
import { useRef, useEffect, useState, useCallback } from 'react';
import { useReducedMotion } from "@/lib/accessibility-utils";
import { cn } from "@/lib/utils";

// Animation configuration based on user preferences
export function useNavigationAnimations() {
  const prefersReducedMotion = useReducedMotion();
  
  return {
    // Sidebar animations
    sidebar: {
      enter: prefersReducedMotion 
        ? "transition-transform duration-0" 
        : "transition-transform duration-300 ease-out",
      exit: prefersReducedMotion 
        ? "transition-transform duration-0" 
        : "transition-transform duration-200 ease-in"
    },
    
    // Mobile drawer animations  
    drawer: {
      overlay: prefersReducedMotion
        ? "transition-opacity duration-0"
        : "transition-opacity duration-300 ease-out",
      panel: prefersReducedMotion
        ? "transition-transform duration-0"
        : "transition-transform duration-300 ease-out transform-gpu"
    },
    
    // Bottom navigation animations
    bottomNav: {
      item: prefersReducedMotion
        ? "transition-colors duration-0"
        : "transition-all duration-200 ease-out",
      indicator: prefersReducedMotion
        ? "transition-transform duration-0"
        : "transition-transform duration-300 ease-out transform-gpu"
    },
    
    // Feature discovery animations
    modal: {
      overlay: prefersReducedMotion
        ? "transition-opacity duration-0"
        : "transition-opacity duration-400 ease-out",
      content: prefersReducedMotion
        ? "transition-all duration-0"
        : "transition-all duration-400 ease-out transform-gpu"
    },
    
    // Navigation item hover/focus animations
    navItem: prefersReducedMotion
      ? "transition-colors duration-0"
      : "transition-all duration-150 ease-out hover:scale-105 transform-gpu",
      
    // Loading animations
    loading: prefersReducedMotion
      ? ""
      : "animate-pulse",
    
    // Achievement celebration
    celebration: prefersReducedMotion
      ? "transition-all duration-0"
      : "animate-in slide-in-from-right duration-500 transform-gpu"
  };
}

// Performance optimized scroll utilities
export function usePerformantScroll() {
  const handleSmoothScroll = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  };

  // Throttled scroll handler for performance
  const createThrottledScrollHandler = (callback: () => void, delay: number = 16) => {
    let timeoutId: NodeJS.Timeout | null = null;
    let lastExecTime = 0;
    
    return () => {
      const currentTime = Date.now();
      
      if (currentTime - lastExecTime > delay) {
        callback();
        lastExecTime = currentTime;
      } else {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          callback();
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  };

  return { handleSmoothScroll, createThrottledScrollHandler };
}

// Navigation state transitions with performance optimization
export const NavigationTransitions = {
  // Mobile drawer slide animations
  mobileDrawer: {
    initial: { x: "-100%", opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: "-100%", opacity: 0 },
    transition: { 
      type: "spring", 
      stiffness: 300, 
      damping: 30,
      mass: 0.8
    }
  },
  
  // Bottom navigation slide up
  bottomNavigation: {
    initial: { y: 100, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: 100, opacity: 0 },
    transition: { 
      type: "spring", 
      stiffness: 400, 
      damping: 25 
    }
  },
  
  // Feature discovery modal
  discoveryModal: {
    initial: { scale: 0.9, opacity: 0, y: 20 },
    animate: { scale: 1, opacity: 1, y: 0 },
    exit: { scale: 0.9, opacity: 0, y: 20 },
    transition: { 
      type: "spring", 
      stiffness: 500, 
      damping: 30 
    }
  },
  
  // Achievement celebration
  achievement: {
    initial: { x: 400, opacity: 0, scale: 0.8 },
    animate: { x: 0, opacity: 1, scale: 1 },
    exit: { x: 400, opacity: 0, scale: 0.8 },
    transition: { 
      type: "spring", 
      stiffness: 300, 
      damping: 25 
    }
  },
  
  // Navigation item activation
  navItemActive: {
    scale: 1.05,
    transition: { 
      type: "spring", 
      stiffness: 400, 
      damping: 20 
    }
  },
  
  // Page transition
  pageTransition: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.2, ease: "easeOut" }
  }
};

// CSS custom properties for consistent animations
export const navigationAnimationStyles = `
  :root {
    --nav-timing-fast: 150ms;
    --nav-timing-normal: 300ms;
    --nav-timing-slow: 500ms;
    --nav-easing-standard: cubic-bezier(0.4, 0.0, 0.2, 1);
    --nav-easing-decelerate: cubic-bezier(0.0, 0.0, 0.2, 1);
    --nav-easing-accelerate: cubic-bezier(0.4, 0.0, 1, 1);
  }

  /* Mobile-optimized transforms */
  .nav-transform-gpu {
    transform: translateZ(0);
    will-change: transform;
  }

  /* Smooth navigation transitions */
  .nav-transition-fast {
    transition: all var(--nav-timing-fast) var(--nav-easing-standard);
  }
  
  .nav-transition-normal {
    transition: all var(--nav-timing-normal) var(--nav-easing-standard);
  }
  
  .nav-transition-slow {
    transition: all var(--nav-timing-slow) var(--nav-easing-standard);
  }

  /* Navigation item hover effects */
  .nav-item-hover {
    transition: all var(--nav-timing-fast) var(--nav-easing-standard);
  }
  
  .nav-item-hover:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  }

  /* Mobile touch feedback */
  .nav-touch-feedback:active {
    transform: scale(0.98);
    transition: transform 100ms var(--nav-easing-accelerate);
  }

  /* Loading shimmer effect */
  .nav-shimmer {
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.2) 20%,
      rgba(255, 255, 255, 0.5) 60%,
      rgba(255, 255, 255, 0)
    );
    animation: shimmer 2s infinite;
  }
  
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  /* Reduced motion preferences */
  @media (prefers-reduced-motion: reduce) {
    .nav-transition-fast,
    .nav-transition-normal,
    .nav-transition-slow,
    .nav-item-hover,
    .nav-touch-feedback {
      transition: none !important;
      animation: none !important;
    }
    
    .nav-shimmer {
      animation: none !important;
    }
  }
`;

// Performance monitoring utilities
export class NavigationPerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  // Track navigation timing
  startTiming(operation: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!this.metrics.has(operation)) {
        this.metrics.set(operation, []);
      }
      
      const timings = this.metrics.get(operation)!;
      timings.push(duration);
      
      // Keep only last 10 measurements
      if (timings.length > 10) {
        timings.shift();
      }
      
      // Log slow operations in development
      if (duration > 100 && process.env.NODE_ENV === 'development') {
        console.warn(`Slow navigation operation: ${operation} took ${duration.toFixed(2)}ms`);
      }
    };
  }

  // Get average timing for operation
  getAverageTiming(operation: string): number {
    const timings = this.metrics.get(operation);
    if (!timings || timings.length === 0) return 0;
    
    return timings.reduce((sum, time) => sum + time, 0) / timings.length;
  }

  // Get performance report
  getPerformanceReport(): Record<string, number> {
    const report: Record<string, number> = {};
    
    Array.from(this.metrics.entries()).forEach(([operation, timings]) => {
      if (timings.length > 0) {
        report[operation] = this.getAverageTiming(operation);
      }
    });
    
    return report;
  }
}

// Global performance monitor instance
export const navigationPerformanceMonitor = new NavigationPerformanceMonitor();

// Intersection Observer for performance-optimized visibility detection
export function useIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  useEffect(() => {
    observerRef.current = new IntersectionObserver(callback, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options
    });
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [callback, options]);
  
  const observe = (element: Element) => {
    if (observerRef.current) {
      observerRef.current.observe(element);
    }
  };
  
  const unobserve = (element: Element) => {
    if (observerRef.current) {
      observerRef.current.unobserve(element);
    }
  };
  
  return { observe, unobserve };
}

// Lazy loading utility for navigation components
export function useLazyNavigation() {
  const [loadedComponents, setLoadedComponents] = useState<Set<string>>(new Set());
  
  const loadComponent = useCallback((componentId: string) => {
    if (!loadedComponents.has(componentId)) {
      setLoadedComponents(prev => new Set([...Array.from(prev), componentId]));
    }
  }, [loadedComponents]);
  
  const isComponentLoaded = useCallback((componentId: string) => {
    return loadedComponents.has(componentId);
  }, [loadedComponents]);
  
  return { loadComponent, isComponentLoaded };
}

// Touch gesture utilities for mobile navigation
export interface TouchGestureConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
}

export function useTouchGestures(config: TouchGestureConfig) {
  const { threshold = 50 } = config;
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    
    // Determine swipe direction
    if (Math.max(absDeltaX, absDeltaY) > threshold) {
      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (deltaX > 0) {
          config.onSwipeRight?.();
        } else {
          config.onSwipeLeft?.();
        }
      } else {
        // Vertical swipe
        if (deltaY > 0) {
          config.onSwipeDown?.();
        } else {
          config.onSwipeUp?.();
        }
      }
    }
    
    setTouchStart(null);
  };
  
  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd
  };
}

// Animation utility classes
export const animationClasses = {
  // Entrance animations
  slideInLeft: "animate-in slide-in-from-left duration-300",
  slideInRight: "animate-in slide-in-from-right duration-300", 
  slideInUp: "animate-in slide-in-from-bottom duration-300",
  slideInDown: "animate-in slide-in-from-top duration-300",
  fadeIn: "animate-in fade-in duration-300",
  scaleIn: "animate-in zoom-in duration-300",
  
  // Exit animations
  slideOutLeft: "animate-out slide-out-to-left duration-200",
  slideOutRight: "animate-out slide-out-to-right duration-200",
  slideOutUp: "animate-out slide-out-to-top duration-200", 
  slideOutDown: "animate-out slide-out-to-bottom duration-200",
  fadeOut: "animate-out fade-out duration-200",
  scaleOut: "animate-out zoom-out duration-200",
  
  // Interaction animations
  hoverScale: "hover:scale-105 transition-transform duration-150",
  hoverLift: "hover:-translate-y-1 hover:shadow-lg transition-all duration-150",
  activePress: "active:scale-95 transition-transform duration-75",
  
  // Mobile optimized
  touchFeedback: "active:scale-98 transition-transform duration-100",
  mobileHover: "hover:bg-school-blue-50 transition-colors duration-150",
  
  // Loading states
  pulse: "animate-pulse",
  spin: "animate-spin",
  bounce: "animate-bounce"
} as const;

// Utility to combine animation classes based on conditions
export function getAnimationClasses(
  base: string,
  conditions: Record<string, boolean>
): string {
  const classes = [base];
  
  Object.entries(conditions).forEach(([className, condition]) => {
    if (condition) {
      classes.push(className);
    }
  });
  
  return cn(...classes);
}