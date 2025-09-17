import { productionConfig } from './production-config';
import { triggerManualAlert, AlertType, AlertSeverity } from './production-alerts';

// Production logging levels and configuration
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  metadata?: Record<string, any>;
  requestId?: string;
  userId?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

class ProductionLogger {
  private static instance: ProductionLogger;
  private config = productionConfig.getConfig();
  private logLevel: LogLevel;
  private enabledFeatures: {
    requestTracking: boolean;
    performanceLogging: boolean;
    securityLogging: boolean;
    errorStacks: boolean;
  };

  private constructor() {
    this.logLevel = this.getLogLevelFromConfig();
    this.enabledFeatures = {
      requestTracking: this.config.ENABLE_DETAILED_LOGGING,
      performanceLogging: this.config.ENABLE_DETAILED_LOGGING,
      securityLogging: true, // Always enabled for security
      errorStacks: !this.config.NODE_ENV || this.config.NODE_ENV !== 'production',
    };

    this.setupProductionLogging();
  }

  static getInstance(): ProductionLogger {
    if (!ProductionLogger.instance) {
      ProductionLogger.instance = new ProductionLogger();
    }
    return ProductionLogger.instance;
  }

  private getLogLevelFromConfig(): LogLevel {
    const level = this.config.LOG_LEVEL.toLowerCase();
    switch (level) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  private setupProductionLogging(): void {
    if (this.config.NODE_ENV === 'production') {
      // Override console methods for production logging
      this.interceptConsole();
    }

    console.log(`📋 Production logging configured: Level=${this.config.LOG_LEVEL}, Features=${JSON.stringify(this.enabledFeatures)}`);
  }

  private interceptConsole(): void {
    const originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug,
    };

    // Intercept console.error for production error tracking
    console.error = (...args) => {
      this.logError(this.formatConsoleArgs(args));
      originalConsole.error(...args);
    };

    // Intercept console.warn
    console.warn = (...args) => {
      this.logWarn(this.formatConsoleArgs(args));
      originalConsole.warn(...args);
    };

    // Production info logging
    console.info = (...args) => {
      this.logInfo(this.formatConsoleArgs(args));
      originalConsole.info(...args);
    };
  }

  private formatConsoleArgs(args: any[]): string {
    return args.map(arg => {
      if (typeof arg === 'object') {
        return JSON.stringify(arg, this.createErrorReplacer(), 2);
      }
      return String(arg);
    }).join(' ');
  }

  private createErrorReplacer() {
    return (key: string, value: any) => {
      // Handle Error objects
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: this.enabledFeatures.errorStacks ? value.stack : '[REDACTED]',
        };
      }
      // Redact sensitive information
      if (typeof value === 'string' && this.isSensitiveField(key)) {
        return '[REDACTED]';
      }
      return value;
    };
  }

  private isSensitiveField(key: string): boolean {
    const sensitiveFields = [
      'password', 'secret', 'token', 'key', 'authorization',
      'cookie', 'session', 'ssn', 'email', 'phone', 'address'
    ];
    return sensitiveFields.some(field => key.toLowerCase().includes(field));
  }

  // Public logging methods
  logError(message: string, metadata?: Record<string, any>, error?: Error): void {
    if (this.logLevel >= LogLevel.ERROR) {
      const entry = this.createLogEntry('ERROR', message, metadata, error);
      this.writeLog(entry);
      
      // Additional error handling for production
      if (this.config.NODE_ENV === 'production') {
        this.handleProductionError(entry);
      }
    }
  }

  logWarn(message: string, metadata?: Record<string, any>): void {
    if (this.logLevel >= LogLevel.WARN) {
      const entry = this.createLogEntry('WARN', message, metadata);
      this.writeLog(entry);
    }
  }

  logInfo(message: string, metadata?: Record<string, any>): void {
    if (this.logLevel >= LogLevel.INFO) {
      const entry = this.createLogEntry('INFO', message, metadata);
      this.writeLog(entry);
    }
  }

  logDebug(message: string, metadata?: Record<string, any>): void {
    if (this.logLevel >= LogLevel.DEBUG) {
      const entry = this.createLogEntry('DEBUG', message, metadata);
      this.writeLog(entry);
    }
  }

  // Specialized logging methods
  logRequest(req: any, res: any, duration: number): void {
    if (!this.enabledFeatures.requestTracking) return;

    const metadata = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent')?.substring(0, 100),
      ip: req.ip,
      requestId: req.requestId,
      userId: req.user?.claims?.sub?.substring(0, 8) || 'anonymous',
    };

    const level = res.statusCode >= 400 ? 'WARN' : 'INFO';
    const message = `${req.method} ${req.path} ${res.statusCode} in ${duration}ms`;
    
    this.writeLog(this.createLogEntry(level, message, metadata));
  }

  logPerformance(operation: string, duration: number, metadata?: Record<string, any>): void {
    if (!this.enabledFeatures.performanceLogging) return;

    const performanceData = {
      operation,
      duration: `${duration}ms`,
      ...metadata,
    };

    const level = duration > 1000 ? 'WARN' : 'INFO';
    const message = `Performance: ${operation} completed in ${duration}ms`;
    
    this.writeLog(this.createLogEntry(level, message, performanceData));
  }

  logSecurity(event: string, severity: 'low' | 'medium' | 'high' | 'critical', metadata?: Record<string, any>): void {
    if (!this.enabledFeatures.securityLogging) return;

    const securityData = {
      event,
      severity,
      ...metadata,
    };

    const level = severity === 'critical' || severity === 'high' ? 'ERROR' : 'WARN';
    const message = `Security Event: ${event} (${severity})`;
    
    this.writeLog(this.createLogEntry(level, message, securityData));
  }

  logDatabaseQuery(query: string, duration: number, error?: Error): void {
    if (!this.enabledFeatures.performanceLogging) return;

    const queryData = {
      query: query.length > 200 ? query.substring(0, 200) + '...' : query,
      duration: `${duration}ms`,
      error: error ? {
        name: error.name,
        message: error.message,
      } : undefined,
    };

    const level = error ? 'ERROR' : (duration > 1000 ? 'WARN' : 'DEBUG');
    const message = error 
      ? `Database Query Failed: ${error.message}`
      : `Database Query completed in ${duration}ms`;
    
    this.writeLog(this.createLogEntry(level, message, queryData));
  }

  // Internal methods
  private createLogEntry(
    level: string, 
    message: string, 
    metadata?: Record<string, any>, 
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (metadata) {
      entry.metadata = this.sanitizeMetadata(metadata);
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: this.enabledFeatures.errorStacks ? error.stack : undefined,
        code: (error as any).code,
      };
    }

    return entry;
  }

  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (this.isSensitiveField(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = JSON.parse(JSON.stringify(value, this.createErrorReplacer()));
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private writeLog(entry: LogEntry): void {
    // In production, you might want to send logs to external service
    if (this.config.NODE_ENV === 'production') {
      this.writeProductionLog(entry);
    } else {
      this.writeDevelopmentLog(entry);
    }
  }

  private writeProductionLog(entry: LogEntry): void {
    // Structured logging for production (JSON format)
    const logLine = JSON.stringify(entry);
    
    // Write to appropriate stream based on level
    if (entry.level === 'ERROR') {
      process.stderr.write(logLine + '\n');
    } else {
      process.stdout.write(logLine + '\n');
    }

    // Send to external services if configured
    this.sendToExternalServices(entry);
  }

  private writeDevelopmentLog(entry: LogEntry): void {
    // Human-readable logging for development
    const timestamp = entry.timestamp;
    const level = entry.level.padEnd(5);
    const message = entry.message;
    
    let logLine = `${timestamp} [${level}] ${message}`;
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      logLine += `\n  Metadata: ${JSON.stringify(entry.metadata, null, 2)}`;
    }
    
    if (entry.error) {
      logLine += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack) {
        logLine += `\n  Stack: ${entry.error.stack}`;
      }
    }

    console.log(logLine);
  }

  private sendToExternalServices(entry: LogEntry): void {
    // Send critical errors to external monitoring (e.g., Sentry)
    if (entry.level === 'ERROR' && this.config.SENTRY_DSN) {
      this.sendToSentry(entry);
    }

    // Could also send to other services like DataDog, New Relic, etc.
  }

  private sendToSentry(entry: LogEntry): void {
    try {
      // Basic Sentry integration (would need actual Sentry SDK in production)
      const payload = {
        message: entry.message,
        level: entry.level.toLowerCase(),
        timestamp: entry.timestamp,
        extra: entry.metadata,
        exception: entry.error,
      };

      // This is a simplified example - in production use proper Sentry SDK
      console.log(`📤 Would send to Sentry: ${JSON.stringify(payload)}`);
    } catch (error) {
      // Don't let logging errors break the application
      console.error('Failed to send log to Sentry:', error);
    }
  }

  private handleProductionError(entry: LogEntry): void {
    // Additional production error handling
    if (entry.level === 'ERROR') {
      // Could trigger alerts, notifications, etc.
      this.triggerErrorAlert(entry);
    }
  }

  private triggerErrorAlert(entry: LogEntry): void {
    try {
      // Determine alert severity based on error context
      let severity = AlertSeverity.HIGH;
      let alertType = AlertType.SYSTEM_ERROR;
      
      // Analyze error patterns to determine appropriate severity
      const errorMessage = entry.message.toLowerCase();
      if (errorMessage.includes('database') || errorMessage.includes('connection')) {
        severity = AlertSeverity.CRITICAL;
        alertType = AlertType.DATABASE_ERROR;
      } else if (errorMessage.includes('security') || errorMessage.includes('unauthorized')) {
        severity = AlertSeverity.HIGH;
        alertType = AlertType.SECURITY_INCIDENT;
      } else if (errorMessage.includes('external') || errorMessage.includes('api')) {
        severity = AlertSeverity.MEDIUM;
        alertType = AlertType.EXTERNAL_SERVICE_FAILURE;
      }
      
      // Trigger alert for critical production errors
      triggerManualAlert(
        alertType,
        severity,
        `Production Error: ${entry.message.substring(0, 100)}`,
        entry.message,
        {
          level: entry.level,
          timestamp: entry.timestamp,
          requestId: entry.requestId,
          userId: entry.userId,
          error: entry.error ? {
            name: entry.error.name,
            message: entry.error.message,
            stack: entry.error.stack?.substring(0, 500) // Truncated for alert
          } : undefined,
          metadata: entry.metadata,
          source: 'production-logger'
        }
      );
    } catch (alertError) {
      // Don't let alert failures break the application
      console.error('Failed to trigger error alert:', alertError);
    }
  }

  // Utility methods
  createRequestLogger() {
    return (req: any, res: any, next: any) => {
      const startTime = Date.now();
      
      // Generate request ID for tracking
      req.requestId = Math.random().toString(36).substring(2, 15);
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        this.logRequest(req, res, duration);
      });

      next();
    };
  }

  measurePerformance<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    
    return fn()
      .then(result => {
        const duration = Date.now() - startTime;
        this.logPerformance(operation, duration, { success: true });
        return result;
      })
      .catch(error => {
        const duration = Date.now() - startTime;
        this.logPerformance(operation, duration, { success: false, error: error.message });
        throw error;
      });
  }
}

// Export singleton instance
export const productionLogger = ProductionLogger.getInstance();

// Export utility functions
export function createRequestLogger() {
  return productionLogger.createRequestLogger();
}

export function logError(message: string, metadata?: Record<string, any>, error?: Error) {
  productionLogger.logError(message, metadata, error);
}

export function logWarn(message: string, metadata?: Record<string, any>) {
  productionLogger.logWarn(message, metadata);
}

export function logInfo(message: string, metadata?: Record<string, any>) {
  productionLogger.logInfo(message, metadata);
}

export function logDebug(message: string, metadata?: Record<string, any>) {
  productionLogger.logDebug(message, metadata);
}

export function logSecurity(event: string, severity: 'low' | 'medium' | 'high' | 'critical', metadata?: Record<string, any>) {
  productionLogger.logSecurity(event, severity, metadata);
}

export function measurePerformance<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  return productionLogger.measurePerformance(operation, fn);
}