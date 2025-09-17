import { productionConfig } from './production-config';
import { productionLogger } from './production-logging';

// Alert types and severity levels
export enum AlertType {
  SYSTEM_ERROR = 'system_error',
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  SECURITY_INCIDENT = 'security_incident',
  DATABASE_ERROR = 'database_error',
  EXTERNAL_SERVICE_FAILURE = 'external_service_failure',
  HIGH_MEMORY_USAGE = 'high_memory_usage',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  CONFIGURATION_ERROR = 'configuration_error',
}

export enum AlertSeverity {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4,
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: Date;
  metadata: Record<string, any>;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface AlertRule {
  id: string;
  type: AlertType;
  condition: (data: any) => boolean;
  severity: AlertSeverity;
  title: string;
  messageTemplate: string;
  cooldownMs: number; // Prevent spam
  enabled: boolean;
}

class ProductionAlertManager {
  private static instance: ProductionAlertManager;
  private config = productionConfig.getConfig();
  private activeAlerts = new Map<string, Alert>();
  private alertHistory: Alert[] = [];
  private lastAlertTime = new Map<string, Date>();
  private alertRules: AlertRule[] = [];

  private constructor() {
    this.setupDefaultAlertRules();
    this.startAlertProcessing();
  }

  static getInstance(): ProductionAlertManager {
    if (!ProductionAlertManager.instance) {
      ProductionAlertManager.instance = new ProductionAlertManager();
    }
    return ProductionAlertManager.instance;
  }

  private setupDefaultAlertRules(): void {
    this.alertRules = [
      // System error alerts
      {
        id: 'high-error-rate',
        type: AlertType.SYSTEM_ERROR,
        condition: (data) => data.errorRate > 5, // More than 5 errors per minute
        severity: AlertSeverity.HIGH,
        title: 'High Error Rate Detected',
        messageTemplate: 'Error rate has exceeded threshold: {{errorRate}} errors/min',
        cooldownMs: 5 * 60 * 1000, // 5 minutes
        enabled: true,
      },
      
      // Performance alerts
      {
        id: 'slow-response-time',
        type: AlertType.PERFORMANCE_DEGRADATION,
        condition: (data) => data.avgResponseTime > 2000, // > 2 seconds
        severity: AlertSeverity.MEDIUM,
        title: 'Slow Response Time',
        messageTemplate: 'Average response time: {{avgResponseTime}}ms',
        cooldownMs: 10 * 60 * 1000, // 10 minutes
        enabled: true,
      },

      {
        id: 'high-memory-usage',
        type: AlertType.HIGH_MEMORY_USAGE,
        condition: (data) => data.memoryUsagePercent > 85,
        severity: AlertSeverity.HIGH,
        title: 'High Memory Usage',
        messageTemplate: 'Memory usage at {{memoryUsagePercent}}%',
        cooldownMs: 5 * 60 * 1000,
        enabled: true,
      },

      // Database alerts
      {
        id: 'database-connection-errors',
        type: AlertType.DATABASE_ERROR,
        condition: (data) => data.dbConnectionErrors > 3,
        severity: AlertSeverity.CRITICAL,
        title: 'Database Connection Issues',
        messageTemplate: '{{dbConnectionErrors}} database connection failures detected',
        cooldownMs: 2 * 60 * 1000, // 2 minutes
        enabled: true,
      },

      {
        id: 'slow-database-queries',
        type: AlertType.PERFORMANCE_DEGRADATION,
        condition: (data) => data.slowQueryCount > 10,
        severity: AlertSeverity.MEDIUM,
        title: 'Slow Database Queries',
        messageTemplate: '{{slowQueryCount}} slow queries detected (>1s)',
        cooldownMs: 15 * 60 * 1000,
        enabled: true,
      },

      // Security alerts
      {
        id: 'suspicious-activity',
        type: AlertType.SECURITY_INCIDENT,
        condition: (data) => data.suspiciousRequests > 50,
        severity: AlertSeverity.HIGH,
        title: 'Suspicious Activity Detected',
        messageTemplate: '{{suspiciousRequests}} suspicious requests from {{suspiciousIPs}} IPs',
        cooldownMs: 5 * 60 * 1000,
        enabled: true,
      },

      {
        id: 'rate-limit-threshold',
        type: AlertType.RATE_LIMIT_EXCEEDED,
        condition: (data) => data.rateLimitHits > 100,
        severity: AlertSeverity.MEDIUM,
        title: 'High Rate Limit Activity',
        messageTemplate: '{{rateLimitHits}} rate limit violations in the last hour',
        cooldownMs: 30 * 60 * 1000,
        enabled: true,
      },

      // External service alerts
      {
        id: 'openai-api-errors',
        type: AlertType.EXTERNAL_SERVICE_FAILURE,
        condition: (data) => data.openaiErrors > 5,
        severity: AlertSeverity.MEDIUM,
        title: 'OpenAI API Issues',
        messageTemplate: '{{openaiErrors}} OpenAI API failures detected',
        cooldownMs: 10 * 60 * 1000,
        enabled: true,
      },
    ];

    console.log(`🚨 Alert system initialized with ${this.alertRules.length} rules`);
  }

  private startAlertProcessing(): void {
    // Process alerts every minute
    setInterval(() => {
      this.processAlerts();
    }, 60 * 1000);

    // Cleanup old alerts every hour
    setInterval(() => {
      this.cleanupOldAlerts();
    }, 60 * 60 * 1000);
  }

  private async processAlerts(): Promise<void> {
    try {
      // Gather system metrics
      const metrics = await this.gatherSystemMetrics();
      
      // Check each alert rule
      for (const rule of this.alertRules) {
        if (!rule.enabled) continue;
        
        try {
          if (rule.condition(metrics)) {
            await this.triggerAlert(rule, metrics);
          }
        } catch (error) {
          productionLogger.logError(`Alert rule processing failed: ${rule.id}`, { error: error.message });
        }
      }
    } catch (error) {
      productionLogger.logError('Alert processing failed', { error: error.message });
    }
  }

  private async gatherSystemMetrics(): Promise<any> {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    // Basic system metrics
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    // Mock metrics collection - in production this would come from monitoring system
    return {
      timestamp: now,
      
      // System metrics
      memoryUsagePercent,
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      uptime: process.uptime(),
      
      // Performance metrics (would come from monitoring)
      avgResponseTime: Math.random() * 1000 + 200, // Mock data
      errorRate: Math.random() * 10, // Mock data
      slowQueryCount: Math.floor(Math.random() * 20), // Mock data
      
      // Database metrics (would come from database monitoring)
      dbConnectionErrors: Math.floor(Math.random() * 5), // Mock data
      dbQueryTime: Math.random() * 500 + 100, // Mock data
      
      // Security metrics (would come from security monitoring)
      suspiciousRequests: Math.floor(Math.random() * 100), // Mock data
      suspiciousIPs: Math.floor(Math.random() * 10), // Mock data
      rateLimitHits: Math.floor(Math.random() * 200), // Mock data
      
      // External service metrics
      openaiErrors: Math.floor(Math.random() * 8), // Mock data
    };
  }

  private async triggerAlert(rule: AlertRule, metrics: any): Promise<void> {
    const alertKey = rule.id;
    const now = new Date();
    
    // Check cooldown period
    const lastAlert = this.lastAlertTime.get(alertKey);
    if (lastAlert && (now.getTime() - lastAlert.getTime()) < rule.cooldownMs) {
      return; // Still in cooldown
    }

    // Create alert
    const alert: Alert = {
      id: this.generateAlertId(),
      type: rule.type,
      severity: rule.severity,
      title: rule.title,
      message: this.formatAlertMessage(rule.messageTemplate, metrics),
      timestamp: now,
      metadata: {
        ruleId: rule.id,
        metrics: this.sanitizeMetrics(metrics),
      },
      resolved: false,
    };

    // Store alert
    this.activeAlerts.set(alert.id, alert);
    this.alertHistory.push(alert);
    this.lastAlertTime.set(alertKey, now);

    // Send alert
    await this.sendAlert(alert);

    productionLogger.logWarn(`Alert triggered: ${alert.title}`, {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
    });
  }

  private formatAlertMessage(template: string, data: any): string {
    let message = template;
    
    // Replace placeholders like {{variable}}
    const placeholders = template.match(/\{\{(\w+)\}\}/g);
    if (placeholders) {
      for (const placeholder of placeholders) {
        const key = placeholder.replace(/\{\{|\}\}/g, '');
        const value = data[key] !== undefined ? data[key] : 'N/A';
        message = message.replace(placeholder, String(value));
      }
    }
    
    return message;
  }

  private sanitizeMetrics(metrics: any): any {
    // Remove sensitive data from metrics before storing
    const sanitized = { ...metrics };
    delete sanitized.sensitiveField; // Example
    return sanitized;
  }

  private async sendAlert(alert: Alert): Promise<void> {
    const alertData = {
      ...alert,
      environment: this.config.NODE_ENV,
      application: 'School in the Square Fundraising Platform',
      timestamp: alert.timestamp.toISOString(),
    };

    // Send to different channels based on severity
    if (alert.severity >= AlertSeverity.HIGH) {
      await this.sendCriticalAlert(alertData);
    } else {
      await this.sendStandardAlert(alertData);
    }
  }

  private async sendCriticalAlert(alert: any): Promise<void> {
    // Critical alerts should go to multiple channels
    await Promise.allSettled([
      this.sendToSlack(alert, true),
      this.sendToEmail(alert),
      this.sendToPagerDuty(alert),
    ]);
  }

  private async sendStandardAlert(alert: any): Promise<void> {
    // Standard alerts go to monitoring channels
    await Promise.allSettled([
      this.sendToSlack(alert, false),
      this.sendToMonitoringDashboard(alert),
    ]);
  }

  private async sendToSlack(alert: any, urgent: boolean): Promise<void> {
    try {
      // Slack webhook integration (mock implementation)
      const payload = {
        text: urgent ? `🚨 CRITICAL ALERT: ${alert.title}` : `⚠️ Alert: ${alert.title}`,
        attachments: [{
          color: this.getSlackColor(alert.severity),
          fields: [
            { title: 'Environment', value: alert.environment, short: true },
            { title: 'Type', value: alert.type, short: true },
            { title: 'Timestamp', value: alert.timestamp, short: true },
            { title: 'Message', value: alert.message, short: false },
          ],
        }],
      };

      // In production, this would make an actual HTTP request to Slack
      productionLogger.logInfo('Would send Slack alert', { payload });
    } catch (error) {
      productionLogger.logError('Failed to send Slack alert', { error: error.message });
    }
  }

  private async sendToEmail(alert: any): Promise<void> {
    try {
      const emailData = {
        to: process.env.ALERT_EMAIL || 'admin@schoolinthesquare.org',
        subject: `[${alert.environment.toUpperCase()}] ${alert.title}`,
        body: `
Alert Details:
- Type: ${alert.type}
- Severity: ${this.getSeverityText(alert.severity)}
- Time: ${alert.timestamp}
- Message: ${alert.message}

Environment: ${alert.environment}
Application: ${alert.application}

Please investigate immediately.
        `.trim(),
      };

      // In production, this would send an actual email
      productionLogger.logInfo('Would send email alert', { emailData });
    } catch (error) {
      productionLogger.logError('Failed to send email alert', { error: error.message });
    }
  }

  private async sendToPagerDuty(alert: any): Promise<void> {
    try {
      // PagerDuty integration (mock implementation)
      const payload = {
        routing_key: process.env.PAGERDUTY_ROUTING_KEY,
        event_action: 'trigger',
        dedup_key: alert.id,
        payload: {
          summary: alert.title,
          severity: this.getPagerDutySeverity(alert.severity),
          source: 'School in the Square Platform',
          timestamp: alert.timestamp,
          custom_details: alert.metadata,
        },
      };

      productionLogger.logInfo('Would send PagerDuty alert', { payload });
    } catch (error) {
      productionLogger.logError('Failed to send PagerDuty alert', { error: error.message });
    }
  }

  private async sendToMonitoringDashboard(alert: any): Promise<void> {
    try {
      // Send to monitoring dashboard/metrics system
      productionLogger.logInfo('Would send to monitoring dashboard', { alert });
    } catch (error) {
      productionLogger.logError('Failed to send to monitoring dashboard', { error: error.message });
    }
  }

  // Utility methods
  private getSlackColor(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.LOW: return 'good';
      case AlertSeverity.MEDIUM: return 'warning';
      case AlertSeverity.HIGH: return 'danger';
      case AlertSeverity.CRITICAL: return 'danger';
      default: return 'warning';
    }
  }

  private getSeverityText(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.LOW: return 'Low';
      case AlertSeverity.MEDIUM: return 'Medium';
      case AlertSeverity.HIGH: return 'High';
      case AlertSeverity.CRITICAL: return 'Critical';
      default: return 'Unknown';
    }
  }

  private getPagerDutySeverity(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.LOW: return 'info';
      case AlertSeverity.MEDIUM: return 'warning';
      case AlertSeverity.HIGH: return 'error';
      case AlertSeverity.CRITICAL: return 'critical';
      default: return 'warning';
    }
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private cleanupOldAlerts(): void {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Remove old alerts from history
    this.alertHistory = this.alertHistory.filter(alert => alert.timestamp > cutoff);
    
    // Remove resolved alerts from active alerts
    for (const [id, alert] of this.activeAlerts.entries()) {
      if (alert.resolved && alert.resolvedAt && alert.resolvedAt < cutoff) {
        this.activeAlerts.delete(id);
      }
    }

    productionLogger.logDebug('Alert cleanup completed', {
      activeAlerts: this.activeAlerts.size,
      historyCount: this.alertHistory.length,
    });
  }

  // Public methods
  public resolveAlert(alertId: string, resolvedBy: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      alert.resolvedBy = resolvedBy;
      
      productionLogger.logInfo(`Alert resolved: ${alert.title}`, {
        alertId,
        resolvedBy,
      });
      
      return true;
    }
    return false;
  }

  public getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
  }

  public getAlertHistory(hours: number = 24): Alert[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.alertHistory.filter(alert => alert.timestamp > cutoff);
  }

  public updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const ruleIndex = this.alertRules.findIndex(rule => rule.id === ruleId);
    if (ruleIndex >= 0) {
      this.alertRules[ruleIndex] = { ...this.alertRules[ruleIndex], ...updates };
      productionLogger.logInfo(`Alert rule updated: ${ruleId}`, updates);
      return true;
    }
    return false;
  }

  public getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }
}

// Export singleton instance
export const alertManager = ProductionAlertManager.getInstance();

// Export utility functions
export function triggerManualAlert(
  type: AlertType,
  severity: AlertSeverity,
  title: string,
  message: string,
  metadata?: Record<string, any>
): void {
  const alert: Alert = {
    id: `manual_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    type,
    severity,
    title,
    message,
    timestamp: new Date(),
    metadata: metadata || {},
    resolved: false,
  };

  alertManager['sendAlert'](alert);
}

export function resolveAlert(alertId: string, resolvedBy: string): boolean {
  return alertManager.resolveAlert(alertId, resolvedBy);
}