import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import { createHash } from 'crypto';
import { requireAuth, requireAdmin } from './auth-middleware';

// Security and performance monitoring system
export class SecurityMonitor {
  private static instance: SecurityMonitor;
  private securityEvents: SecurityEvent[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private suspiciousIPs = new Map<string, SuspiciousActivity>();
  private readonly maxEvents = 10000;
  private readonly maxMetrics = 5000;

  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  // Record security events
  recordSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      ...event,
    };

    this.securityEvents.push(securityEvent);
    
    // Keep only recent events to prevent memory leaks
    if (this.securityEvents.length > this.maxEvents) {
      this.securityEvents = this.securityEvents.slice(-this.maxEvents);
    }

    // Log critical security events immediately
    if (event.severity === 'critical' || event.severity === 'high') {
      console.error('🚨 SECURITY ALERT:', securityEvent);
    }

    // Track suspicious IPs
    this.trackSuspiciousIP(event.ipAddress, event.type);
  }

  // Record performance metrics
  recordPerformanceMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): void {
    const performanceMetric: PerformanceMetric = {
      id: this.generateId(),
      timestamp: new Date(),
      ...metric,
    };

    this.performanceMetrics.push(performanceMetric);
    
    // Keep only recent metrics
    if (this.performanceMetrics.length > this.maxMetrics) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.maxMetrics);
    }

    // Alert on performance issues
    if (metric.value > metric.threshold) {
      console.warn(`⚠️ Performance threshold exceeded: ${metric.name} (${metric.value} > ${metric.threshold})`);
    }
  }

  private trackSuspiciousIP(ipAddress: string, eventType: string): void {
    const existing = this.suspiciousIPs.get(ipAddress);
    if (existing) {
      existing.eventCount++;
      existing.eventTypes.add(eventType);
      existing.lastSeen = new Date();
      
      // Mark as suspicious if multiple event types or high frequency
      if (existing.eventTypes.size > 3 || existing.eventCount > 10) {
        existing.isSuspicious = true;
        console.warn(`🚨 Suspicious IP detected: ${ipAddress} (${existing.eventCount} events, ${existing.eventTypes.size} types)`);
      }
    } else {
      this.suspiciousIPs.set(ipAddress, {
        firstSeen: new Date(),
        lastSeen: new Date(),
        eventCount: 1,
        eventTypes: new Set([eventType]),
        isSuspicious: false,
      });
    }
  }

  // Get security report
  getSecurityReport(hours: number = 24): SecurityReport {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentEvents = this.securityEvents.filter(e => e.timestamp > since);
    
    const eventsByType = this.groupBy(recentEvents, 'type');
    const eventsBySeverity = this.groupBy(recentEvents, 'severity');
    const eventsByIP = this.groupBy(recentEvents, 'ipAddress');
    
    const topSuspiciousIPs = Array.from(this.suspiciousIPs.entries())
      .filter(([, activity]) => activity.isSuspicious)
      .sort((a, b) => b[1].eventCount - a[1].eventCount)
      .slice(0, 10);

    return {
      timeRange: { start: since, end: new Date() },
      totalEvents: recentEvents.length,
      eventsByType,
      eventsBySeverity,
      topOffendingIPs: Object.entries(eventsByIP)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
      suspiciousIPs: topSuspiciousIPs.map(([ip, activity]) => ({
        ip,
        ...activity,
        eventTypes: Array.from(activity.eventTypes),
      })),
      recommendations: this.generateRecommendations(recentEvents),
    };
  }

  // Get performance report
  getPerformanceReport(hours: number = 24): PerformanceReport {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentMetrics = this.performanceMetrics.filter(m => m.timestamp > since);
    
    const metricsByName = this.groupMetricsByName(recentMetrics);
    const thresholdViolations = recentMetrics.filter(m => m.value > m.threshold);
    
    return {
      timeRange: { start: since, end: new Date() },
      totalMetrics: recentMetrics.length,
      metricsByName,
      thresholdViolations: thresholdViolations.length,
      slowestOperations: recentMetrics
        .sort((a, b) => b.value - a.value)
        .slice(0, 10),
      averageResponseTime: this.calculateAverage(
        recentMetrics.filter(m => m.name.includes('response_time')).map(m => m.value)
      ),
      recommendations: this.generatePerformanceRecommendations(recentMetrics),
    };
  }

  private generateId(): string {
    return createHash('md5').update(`${Date.now()}-${Math.random()}`).digest('hex');
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((acc, item) => {
      const groupKey = String(item[key]);
      acc[groupKey] = (acc[groupKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupMetricsByName(metrics: PerformanceMetric[]): Record<string, MetricSummary> {
    const grouped = metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric.value);
      return acc;
    }, {} as Record<string, number[]>);

    return Object.fromEntries(
      Object.entries(grouped).map(([name, values]) => [
        name,
        {
          count: values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          avg: this.calculateAverage(values),
          p95: this.calculatePercentile(values, 95),
        },
      ])
    );
  }

  private calculateAverage(numbers: number[]): number {
    return numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
  }

  private calculatePercentile(numbers: number[], percentile: number): number {
    const sorted = numbers.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  private generateRecommendations(events: SecurityEvent[]): string[] {
    const recommendations: string[] = [];
    const eventsByType = this.groupBy(events, 'type');
    
    if (eventsByType['brute_force'] > 10) {
      recommendations.push('Consider implementing CAPTCHA or account lockout mechanisms');
    }
    
    if (eventsByType['sql_injection'] > 0) {
      recommendations.push('Review and strengthen SQL injection protection');
    }
    
    if (eventsByType['xss_attempt'] > 0) {
      recommendations.push('Audit input sanitization and output encoding');
    }
    
    if (eventsByType['rate_limit_exceeded'] > 50) {
      recommendations.push('Consider adjusting rate limiting thresholds');
    }

    return recommendations;
  }

  private generatePerformanceRecommendations(metrics: PerformanceMetric[]): string[] {
    const recommendations: string[] = [];
    const avgResponseTime = this.calculateAverage(
      metrics.filter(m => m.name.includes('response_time')).map(m => m.value)
    );
    
    if (avgResponseTime > 1000) {
      recommendations.push('Average response time is high - consider database optimization');
    }
    
    const slowQueries = metrics.filter(m => m.name.includes('query') && m.value > 500);
    if (slowQueries.length > 0) {
      recommendations.push('Multiple slow database queries detected - review indexing');
    }
    
    const highMemoryUsage = metrics.filter(m => m.name.includes('memory') && m.value > 80);
    if (highMemoryUsage.length > 0) {
      recommendations.push('High memory usage detected - investigate memory leaks');
    }

    return recommendations;
  }

  // Clear old data
  cleanup(maxAge: number = 7 * 24 * 60 * 60 * 1000): void { // 7 days
    const cutoff = new Date(Date.now() - maxAge);
    
    this.securityEvents = this.securityEvents.filter(e => e.timestamp > cutoff);
    this.performanceMetrics = this.performanceMetrics.filter(m => m.timestamp > cutoff);
    
    // Clean up suspicious IPs older than maxAge
    for (const [ip, activity] of this.suspiciousIPs.entries()) {
      if (activity.lastSeen < cutoff) {
        this.suspiciousIPs.delete(ip);
      }
    }
    
    console.log('🧹 Monitoring data cleanup completed');
  }
}

// Middleware for automated security monitoring
export function securityMonitoringMiddleware(req: Request, res: Response, next: NextFunction): void {
  const monitor = SecurityMonitor.getInstance();
  const startTime = performance.now();
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    { pattern: /\.\./g, type: 'path_traversal' },
    { pattern: /<script/gi, type: 'xss_attempt' },
    { pattern: /union.*select/gi, type: 'sql_injection' },
    { pattern: /javascript:/gi, type: 'javascript_injection' },
    { pattern: /eval\(/gi, type: 'code_injection' },
  ];

  const fullUrl = req.originalUrl || req.url;
  const requestBody = JSON.stringify(req.body || {});
  const queryParams = JSON.stringify(req.query || {});

  for (const { pattern, type } of suspiciousPatterns) {
    if (pattern.test(fullUrl) || pattern.test(requestBody) || pattern.test(queryParams)) {
      monitor.recordSecurityEvent({
        type,
        severity: 'high',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || '',
        url: fullUrl,
        method: req.method,
        details: { pattern: pattern.source, location: 'request' },
      });
    }
  }

  // Monitor response
  res.on('finish', () => {
    const responseTime = performance.now() - startTime;
    
    // Record performance metric
    monitor.recordPerformanceMetric({
      name: `response_time_${req.method}_${req.route?.path || 'unknown'}`,
      value: responseTime,
      unit: 'ms',
      threshold: 1000,
      metadata: {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
      },
    });

    // Record security events for error responses
    if (res.statusCode >= 400) {
      const severity = res.statusCode >= 500 ? 'medium' : 'low';
      monitor.recordSecurityEvent({
        type: `http_${res.statusCode}`,
        severity,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || '',
        url: fullUrl,
        method: req.method,
        details: { statusCode: res.statusCode, responseTime },
      });
    }
  });

  next();
}

// Health check endpoint
export function createHealthCheckEndpoint() {
  return (req: Request, res: Response) => {
    const monitor = SecurityMonitor.getInstance();
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      security: {
        recentEvents: monitor.getSecurityReport(1).totalEvents,
        suspiciousIPs: monitor.getSecurityReport(1).suspiciousIPs.length,
      },
      performance: {
        averageResponseTime: monitor.getPerformanceReport(1).averageResponseTime,
        thresholdViolations: monitor.getPerformanceReport(1).thresholdViolations,
      },
    };

    res.json(healthData);
  };
}

// Administrative endpoints for monitoring - SECURED
export function createMonitoringEndpoints(app: any): void {
  
  // Security report endpoint (admin only) - PROTECTED
  app.get('/api/admin/security-report', requireAuth, requireAdmin, (req: Request, res: Response) => {
    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const monitor = SecurityMonitor.getInstance();
      const report = monitor.getSecurityReport(hours);
      
      // Log admin access to security reports
      const userId = (req as any).user?.claims?.sub || 'unknown';
      console.log(`🔒 Admin security report accessed by user: ${userId.substring(0, 8)} for ${hours}h period`);
      
      res.json(report);
    } catch (error) {
      console.error('Error generating security report:', error);
      res.status(500).json({ error: 'Failed to generate security report' });
    }
  });

  // Performance report endpoint (admin only) - PROTECTED
  app.get('/api/admin/performance-report', requireAuth, requireAdmin, (req: Request, res: Response) => {
    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const monitor = SecurityMonitor.getInstance();
      const report = monitor.getPerformanceReport(hours);
      
      // Log admin access to performance reports
      const userId = (req as any).user?.claims?.sub || 'unknown';
      console.log(`📊 Admin performance report accessed by user: ${userId.substring(0, 8)} for ${hours}h period`);
      
      res.json(report);
    } catch (error) {
      console.error('Error generating performance report:', error);
      res.status(500).json({ error: 'Failed to generate performance report' });
    }
  });

  // Health check endpoints are now registered in routes.ts
  // using createHealthEndpoints() from health-check-service.ts
  
  console.log('🔒 Monitoring endpoints secured with admin authentication');
}

// Types
interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  ipAddress: string;
  userAgent: string;
  url: string;
  method: string;
  details: Record<string, any>;
}

interface PerformanceMetric {
  id: string;
  timestamp: Date;
  name: string;
  value: number;
  unit: string;
  threshold: number;
  metadata: Record<string, any>;
}

interface SuspiciousActivity {
  firstSeen: Date;
  lastSeen: Date;
  eventCount: number;
  eventTypes: Set<string>;
  isSuspicious: boolean;
}

interface SecurityReport {
  timeRange: { start: Date; end: Date };
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  topOffendingIPs: [string, number][];
  suspiciousIPs: Array<{
    ip: string;
    firstSeen: Date;
    lastSeen: Date;
    eventCount: number;
    eventTypes: string[];
    isSuspicious: boolean;
  }>;
  recommendations: string[];
}

interface PerformanceReport {
  timeRange: { start: Date; end: Date };
  totalMetrics: number;
  metricsByName: Record<string, MetricSummary>;
  thresholdViolations: number;
  slowestOperations: PerformanceMetric[];
  averageResponseTime: number;
  recommendations: string[];
}

interface MetricSummary {
  count: number;
  min: number;
  max: number;
  avg: number;
  p95: number;
}

// Periodic cleanup
setInterval(() => {
  SecurityMonitor.getInstance().cleanup();
}, 24 * 60 * 60 * 1000); // Daily cleanup

export default SecurityMonitor;