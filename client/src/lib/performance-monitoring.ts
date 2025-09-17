import { useEffect, useRef, useState } from 'react';

// Performance monitoring utilities for the frontend
export class PerformanceMonitor {
  private static metrics = new Map<string, {
    count: number;
    total: number;
    min: number;
    max: number;
    avg: number;
  }>();

  // Measure function execution time
  static measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    return fn().finally(() => {
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
    });
  }

  // Measure synchronous function execution time
  static measure<T>(name: string, fn: () => T): T {
    const start = performance.now();
    try {
      return fn();
    } finally {
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
    }
  }

  private static recordMetric(name: string, duration: number) {
    const existing = this.metrics.get(name);
    if (existing) {
      existing.count++;
      existing.total += duration;
      existing.min = Math.min(existing.min, duration);
      existing.max = Math.max(existing.max, duration);
      existing.avg = existing.total / existing.count;
    } else {
      this.metrics.set(name, {
        count: 1,
        total: duration,
        min: duration,
        max: duration,
        avg: duration,
      });
    }

    // Log slow operations
    if (duration > 100) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
    }
  }

  static getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  static clearMetrics() {
    this.metrics.clear();
  }

  // Report performance to console
  static reportPerformance() {
    console.table(Object.fromEntries(
      Array.from(this.metrics.entries()).map(([name, metrics]) => [
        name,
        {
          ...metrics,
          avg: parseFloat(metrics.avg.toFixed(2)),
          min: parseFloat(metrics.min.toFixed(2)),
          max: parseFloat(metrics.max.toFixed(2)),
        }
      ])
    ));
  }
}

// Hook for measuring component render performance
export function useRenderPerformance(componentName: string) {
  const renderCount = useRef(0);
  const startTime = useRef(performance.now());

  useEffect(() => {
    renderCount.current++;
    const renderTime = performance.now() - startTime.current;
    
    PerformanceMonitor.recordMetric(`${componentName}_render`, renderTime);
    
    // Log excessive re-renders
    if (renderCount.current > 10) {
      console.warn(`Component ${componentName} has rendered ${renderCount.current} times`);
    }

    startTime.current = performance.now();
  });

  return renderCount.current;
}

// Hook for monitoring bundle size and loading performance
export function useBundlePerformance() {
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    bundleSize: 0,
    resourceCount: 0,
    cacheHitRate: 0,
  });

  useEffect(() => {
    // Measure initial load performance
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      const loadTime = navigation.loadEventEnd - navigation.navigationStart;
      
      // Estimate bundle size from transferred resources
      const resources = performance.getEntriesByType('resource');
      const bundleSize = resources
        .filter(r => r.name.includes('.js') || r.name.includes('.css'))
        .reduce((total, r) => total + (r as any).transferSize || 0, 0);

      const cacheHits = resources.filter(r => (r as any).transferSize === 0).length;
      const cacheHitRate = resources.length > 0 ? (cacheHits / resources.length) * 100 : 0;

      setMetrics({
        loadTime,
        bundleSize,
        resourceCount: resources.length,
        cacheHitRate,
      });
    }
  }, []);

  return metrics;
}

// Hook for monitoring memory usage
export function useMemoryMonitoring() {
  const [memoryInfo, setMemoryInfo] = useState({
    usedJSHeapSize: 0,
    totalJSHeapSize: 0,
    jsHeapSizeLimit: 0,
  });

  useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMemoryInfo({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        });

        // Warn about high memory usage
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        if (usagePercent > 80) {
          console.warn(`High memory usage detected: ${usagePercent.toFixed(1)}%`);
        }
      }
    };

    // Update memory info every 60 seconds (reduced frequency)
    const interval = setInterval(updateMemoryInfo, 60000);
    updateMemoryInfo(); // Initial measurement

    return () => {
      clearInterval(interval);
    };
  }, []);

  return memoryInfo;
}

// Error boundary with performance tracking
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return function PerformanceTrackedComponent(props: P) {
    const renderCount = useRenderPerformance(componentName);
    
    useEffect(() => {
      // Track component mount time
      const mountTime = performance.now();
      return () => {
        // Track component unmount time
        const unmountTime = performance.now();
        PerformanceMonitor.recordMetric(`${componentName}_lifetime`, unmountTime - mountTime);
      };
    }, []);

    return <Component {...props} />;
  };
}

// Resource loading optimizer
export function optimizeResourceLoading() {
  // Preload critical resources
  const preloadCriticalResources = () => {
    const criticalCSS = document.querySelector('link[rel="stylesheet"]');
    if (criticalCSS) {
      criticalCSS.setAttribute('rel', 'preload');
      criticalCSS.setAttribute('as', 'style');
    }
  };

  // Lazy load non-critical images
  const lazyLoadImages = () => {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset.src;
          if (src) {
            img.src = src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        }
      });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  };

  // Prefetch likely navigation targets
  const prefetchLikelyPages = () => {
    const linkObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const link = entry.target as HTMLAnchorElement;
          const href = link.href;
          if (href && !link.dataset.prefetched) {
            const linkElement = document.createElement('link');
            linkElement.rel = 'prefetch';
            linkElement.href = href;
            document.head.appendChild(linkElement);
            link.dataset.prefetched = 'true';
          }
        }
      });
    });

    document.querySelectorAll('a[href^="/"]').forEach(link => {
      linkObserver.observe(link);
    });
  };

  return {
    preloadCriticalResources,
    lazyLoadImages,
    prefetchLikelyPages,
  };
}

// Web Vitals monitoring
export function useWebVitals() {
  const [vitals, setVitals] = useState({
    fcp: 0, // First Contentful Paint
    lcp: 0, // Largest Contentful Paint
    fid: 0, // First Input Delay
    cls: 0, // Cumulative Layout Shift
  });

  useEffect(() => {
    // This would typically use the web-vitals library
    // For now, we'll use Performance Observer API directly
    
    if ('PerformanceObserver' in window) {
      // Measure FCP
      const fcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            setVitals(prev => ({ ...prev, fcp: entry.startTime }));
          }
        }
      });
      fcpObserver.observe({ entryTypes: ['paint'] });

      // Measure LCP
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        setVitals(prev => ({ ...prev, lcp: lastEntry.startTime }));
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Measure CLS
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        setVitals(prev => ({ ...prev, cls: clsValue }));
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      return () => {
        fcpObserver.disconnect();
        lcpObserver.disconnect();
        clsObserver.disconnect();
      };
    }
  }, []);

  return vitals;
}

// Performance budget monitoring
export const performanceBudget = {
  // Time budgets (in milliseconds)
  maxPageLoadTime: 3000,
  maxComponentRenderTime: 16, // One frame at 60fps
  maxAPIResponseTime: 1000,
  
  // Size budgets (in bytes)  
  maxBundleSize: 512 * 1024, // 512KB
  maxImageSize: 100 * 1024,  // 100KB
  maxCSSSize: 50 * 1024,     // 50KB
  
  // Count budgets
  maxHTTPRequests: 50,
  maxDOMNodes: 1500,
  
  // Check if metrics are within budget
  checkBudget(metrics: any) {
    const violations = [];
    
    if (metrics.loadTime > this.maxPageLoadTime) {
      violations.push(`Page load time (${metrics.loadTime}ms) exceeds budget (${this.maxPageLoadTime}ms)`);
    }
    
    if (metrics.bundleSize > this.maxBundleSize) {
      violations.push(`Bundle size (${metrics.bundleSize}B) exceeds budget (${this.maxBundleSize}B)`);
    }
    
    if (metrics.resourceCount > this.maxHTTPRequests) {
      violations.push(`HTTP requests (${metrics.resourceCount}) exceed budget (${this.maxHTTPRequests})`);
    }
    
    return violations;
  }
};

// Export performance data for monitoring
export function exportPerformanceData() {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const resources = performance.getEntriesByType('resource');
  
  return {
    timestamp: new Date().toISOString(),
    navigation: {
      loadTime: navigation?.loadEventEnd - navigation?.navigationStart || 0,
      domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.navigationStart || 0,
      firstByte: navigation?.responseStart - navigation?.requestStart || 0,
    },
    resources: {
      count: resources.length,
      totalSize: resources.reduce((total, r) => total + ((r as any).transferSize || 0), 0),
      cached: resources.filter(r => (r as any).transferSize === 0).length,
    },
    memory: (performance as any).memory || {},
    customMetrics: PerformanceMonitor.getMetrics(),
  };
}