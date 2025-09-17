import { Request, Response } from 'express';
import { db, pool } from './db';
import { sql } from 'drizzle-orm';
import { productionConfig } from './production-config';
import OpenAI from 'openai';
import { triggerManualAlert, AlertType, AlertSeverity } from './production-alerts';

// Health check status types
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheck {
  status: HealthStatus;
  message: string;
  timestamp: Date;
  responseTime: number;
  details?: any;
}

export interface ServiceHealth {
  database: HealthCheck;
  externalServices: {
    openai: HealthCheck;
  };
  system: HealthCheck;
  dependencies: HealthCheck;
}

export interface OverallHealth {
  status: HealthStatus;
  timestamp: Date;
  uptime: number;
  environment: string;
  version: string;
  services: ServiceHealth;
  summary: {
    healthy: number;
    degraded: number;
    unhealthy: number;
    total: number;
  };
}

class HealthCheckService {
  private static instance: HealthCheckService;
  private config = productionConfig.getConfig();
  private healthCheckTimeout: number;
  private externalServiceTimeout: number;

  private constructor() {
    this.healthCheckTimeout = this.config.HEALTH_CHECK_TIMEOUT_MS;
    this.externalServiceTimeout = this.config.EXTERNAL_SERVICE_TIMEOUT_MS;
  }

  static getInstance(): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService();
    }
    return HealthCheckService.instance;
  }

  // Comprehensive health check for all services
  async performHealthCheck(): Promise<OverallHealth> {
    const startTime = Date.now();
    const timestamp = new Date();

    try {
      // Run all health checks in parallel for better performance
      const [databaseHealth, systemHealth, dependenciesHealth, openaiHealth] = await Promise.allSettled([
        this.checkDatabaseHealth(),
        this.checkSystemHealth(),
        this.checkDependenciesHealth(),
        this.checkOpenAIHealth(),
      ]);

      const services: ServiceHealth = {
        database: this.getHealthCheckResult(databaseHealth),
        externalServices: {
          openai: this.getHealthCheckResult(openaiHealth),
        },
        system: this.getHealthCheckResult(systemHealth),
        dependencies: this.getHealthCheckResult(dependenciesHealth),
      };

      // Calculate overall status
      const allChecks = [
        services.database,
        services.system,
        services.dependencies,
        services.externalServices.openai,
      ];

      const summary = this.calculateSummary(allChecks);
      const overallStatus = this.determineOverallStatus(allChecks);

      const result: OverallHealth = {
        status: overallStatus,
        timestamp,
        uptime: process.uptime(),
        environment: this.config.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
        services,
        summary,
      };

      // Log health check results
      this.logHealthCheckResults(result);

      return result;
    } catch (error) {
      console.error('❌ Critical error during health check:', error);
      
      return {
        status: 'unhealthy',
        timestamp,
        uptime: process.uptime(),
        environment: this.config.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
        services: this.getEmergencyHealthState(),
        summary: { healthy: 0, degraded: 0, unhealthy: 4, total: 4 },
      };
    }
  }

  // Database health check with connection pool monitoring
  private async checkDatabaseHealth(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Test basic connectivity
      const result = await Promise.race([
        db.execute(sql`SELECT 1 as health, NOW() as timestamp`),
        this.createTimeout(this.healthCheckTimeout, 'Database health check timeout'),
      ]);

      const responseTime = Date.now() - startTime;

      // Additional checks for database pool health
      const poolInfo = this.getDatabasePoolInfo();
      
      if (responseTime > this.healthCheckTimeout * 0.8) {
        return {
          status: 'degraded',
          message: `Database responding slowly (${responseTime}ms)`,
          timestamp: new Date(),
          responseTime,
          details: {
            query: 'SELECT 1',
            pool: poolInfo,
            threshold: this.healthCheckTimeout,
          },
        };
      }

      return {
        status: 'healthy',
        message: 'Database is responsive',
        timestamp: new Date(),
        responseTime,
        details: {
          query: 'SELECT 1', 
          pool: poolInfo,
          result: result?.rows?.[0] || {},
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Database connection failed: ${error.message}`,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        details: {
          error: error.message,
          code: error.code || 'UNKNOWN',
          pool: this.getDatabasePoolInfo(),
        },
      };
    }
  }

  // OpenAI API health check
  private async checkOpenAIHealth(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    if (!this.config.OPENAI_API_KEY) {
      return {
        status: 'healthy',
        message: 'OpenAI API not configured (optional service)',
        timestamp: new Date(),
        responseTime: 0,
        details: { configured: false },
      };
    }

    try {
      const openai = new OpenAI({ apiKey: this.config.OPENAI_API_KEY });
      
      // Make a minimal API call to test connectivity
      const response = await Promise.race([
        openai.models.list({ limit: 1 }),
        this.createTimeout(this.externalServiceTimeout, 'OpenAI API timeout'),
      ]);

      const responseTime = Date.now() - startTime;

      if (responseTime > this.externalServiceTimeout * 0.8) {
        return {
          status: 'degraded',
          message: `OpenAI API responding slowly (${responseTime}ms)`,
          timestamp: new Date(),
          responseTime,
          details: {
            configured: true,
            modelsCount: response.data?.length || 0,
            threshold: this.externalServiceTimeout,
          },
        };
      }

      return {
        status: 'healthy',
        message: 'OpenAI API is responsive',
        timestamp: new Date(),
        responseTime,
        details: {
          configured: true,
          modelsCount: response.data?.length || 0,
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Check if it's an authentication error vs connectivity
      const isAuthError = error.message?.includes('401') || error.message?.includes('auth');
      
      return {
        status: isAuthError ? 'degraded' : 'unhealthy',
        message: `OpenAI API error: ${error.message}`,
        timestamp: new Date(),
        responseTime,
        details: {
          configured: true,
          error: error.message,
          isAuthError,
        },
      };
    }
  }

  // System resource health check
  private async checkSystemHealth(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Memory health assessment
      const memoryThresholds = {
        warning: 500 * 1024 * 1024, // 500MB
        critical: 1000 * 1024 * 1024, // 1GB
      };

      const heapUsed = memoryUsage.heapUsed;
      let status: HealthStatus = 'healthy';
      let message = 'System resources are healthy';

      if (heapUsed > memoryThresholds.critical) {
        status = 'unhealthy';
        message = `Critical memory usage: ${Math.round(heapUsed / 1024 / 1024)}MB`;
      } else if (heapUsed > memoryThresholds.warning) {
        status = 'degraded';
        message = `High memory usage: ${Math.round(heapUsed / 1024 / 1024)}MB`;
      }

      return {
        status,
        message,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        details: {
          memory: {
            heapUsed: Math.round(heapUsed / 1024 / 1024),
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            external: Math.round(memoryUsage.external / 1024 / 1024),
            rss: Math.round(memoryUsage.rss / 1024 / 1024),
          },
          uptime: process.uptime(),
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `System health check failed: ${error.message}`,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        details: { error: error.message },
      };
    }
  }

  // Dependencies and configuration health check
  private async checkDependenciesHealth(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const issues: string[] = [];
      const config = this.config;

      // Check critical environment variables
      if (!config.DATABASE_URL) {
        issues.push('DATABASE_URL not configured');
      }

      if (!config.SESSION_SECRET || config.SESSION_SECRET.length < 32) {
        issues.push('SESSION_SECRET is missing or too short');
      }

      if (config.NODE_ENV === 'production' && (!config.ALLOWED_ORIGINS || config.ALLOWED_ORIGINS.length === 0)) {
        issues.push('ALLOWED_ORIGINS not configured for production');
      }

      // Check if configuration validation worked
      try {
        productionConfig.getConfig();
      } catch (error) {
        issues.push(`Configuration validation failed: ${error.message}`);
      }

      const status: HealthStatus = issues.length === 0 ? 'healthy' : 
                                  issues.length < 3 ? 'degraded' : 'unhealthy';

      return {
        status,
        message: issues.length === 0 ? 'All dependencies are healthy' : `Issues: ${issues.join(', ')}`,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        details: {
          issues,
          environment: config.NODE_ENV,
          configValidated: true,
          criticalVarsSet: {
            DATABASE_URL: !!config.DATABASE_URL,
            SESSION_SECRET: !!config.SESSION_SECRET,
            ALLOWED_ORIGINS: config.ALLOWED_ORIGINS.length > 0,
          },
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Dependencies check failed: ${error.message}`,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        details: { error: error.message },
      };
    }
  }

  // Readiness check (lighter than full health check)
  async performReadinessCheck(): Promise<{ ready: boolean; message: string; checks: any }> {
    try {
      // Quick checks for readiness
      const [dbCheck, configCheck] = await Promise.allSettled([
        this.quickDatabaseCheck(),
        this.quickConfigCheck(),
      ]);

      const dbReady = dbCheck.status === 'fulfilled' && dbCheck.value;
      const configReady = configCheck.status === 'fulfilled' && configCheck.value;

      const ready = dbReady && configReady;

      return {
        ready,
        message: ready ? 'Service is ready' : 'Service not ready',
        checks: {
          database: dbReady,
          configuration: configReady,
        },
      };
    } catch (error) {
      return {
        ready: false,
        message: `Readiness check failed: ${error.message}`,
        checks: {
          database: false,
          configuration: false,
        },
      };
    }
  }

  // Liveness check (minimal check to verify process is alive)
  performLivenessCheck(): { alive: boolean; uptime: number; timestamp: Date } {
    return {
      alive: true,
      uptime: process.uptime(),
      timestamp: new Date(),
    };
  }

  // Helper methods
  private async quickDatabaseCheck(): Promise<boolean> {
    try {
      await db.execute(sql`SELECT 1`);
      return true;
    } catch {
      return false;
    }
  }

  private quickConfigCheck(): boolean {
    try {
      const config = productionConfig.getConfig();
      return !!(config.DATABASE_URL && config.SESSION_SECRET);
    } catch {
      return false;
    }
  }

  private getDatabasePoolInfo() {
    try {
      // Pool info might not be directly accessible, provide basic info
      return {
        connected: true,
        url: this.config.DATABASE_URL ? '[CONFIGURED]' : '[NOT CONFIGURED]',
      };
    } catch {
      return { connected: false };
    }
  }

  private createTimeout(ms: number, message: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }

  private getHealthCheckResult(settledResult: PromiseSettledResult<HealthCheck>): HealthCheck {
    if (settledResult.status === 'fulfilled') {
      return settledResult.value;
    } else {
      return {
        status: 'unhealthy',
        message: `Health check failed: ${settledResult.reason?.message || 'Unknown error'}`,
        timestamp: new Date(),
        responseTime: 0,
        details: { error: settledResult.reason },
      };
    }
  }

  private calculateSummary(checks: HealthCheck[]) {
    const summary = { healthy: 0, degraded: 0, unhealthy: 0, total: checks.length };
    
    checks.forEach(check => {
      summary[check.status]++;
    });

    return summary;
  }

  private determineOverallStatus(checks: HealthCheck[]): HealthStatus {
    const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
    const degradedCount = checks.filter(c => c.status === 'degraded').length;

    if (unhealthyCount > 0) return 'unhealthy';
    if (degradedCount > 0) return 'degraded';
    return 'healthy';
  }

  private getEmergencyHealthState(): ServiceHealth {
    const errorCheck: HealthCheck = {
      status: 'unhealthy',
      message: 'Emergency state - health check failed',
      timestamp: new Date(),
      responseTime: 0,
    };

    return {
      database: errorCheck,
      system: errorCheck,
      dependencies: errorCheck,
      externalServices: { openai: errorCheck },
    };
  }

  private logHealthCheckResults(health: OverallHealth): void {
    const { status, summary } = health;
    
    if (status === 'healthy') {
      console.log(`✅ Health check passed: ${summary.healthy}/${summary.total} services healthy`);
    } else if (status === 'degraded') {
      console.warn(`⚠️  Health check degraded: ${summary.degraded} services degraded, ${summary.unhealthy} unhealthy`);
      // Trigger alert for degraded services
      this.triggerHealthAlert(status, health);
    } else {
      console.error(`❌ Health check failed: ${summary.unhealthy} services unhealthy`);
      // Trigger critical alert for unhealthy services
      this.triggerHealthAlert(status, health);
    }

    // Log details for unhealthy services only
    Object.entries(health.services).forEach(([serviceName, service]) => {
      if (typeof service === 'object' && 'status' in service) {
        if (service.status !== 'healthy') {
          console.warn(`   ${serviceName}: ${service.status} - ${service.message}`);
        }
      } else {
        // Handle nested services like externalServices
        Object.entries(service).forEach(([subServiceName, subService]) => {
          if (subService.status !== 'healthy') {
            console.warn(`   ${serviceName}.${subServiceName}: ${subService.status} - ${subService.message}`);
          }
        });
      }
    });
  }

  private triggerHealthAlert(status: HealthStatus, health: OverallHealth): void {
    try {
      const unhealthyServices = this.getUnhealthyServices(health);
      const severity = status === 'unhealthy' ? AlertSeverity.CRITICAL : AlertSeverity.HIGH;
      const alertType = status === 'unhealthy' ? AlertType.SYSTEM_ERROR : AlertType.PERFORMANCE_DEGRADATION;
      
      const title = status === 'unhealthy' 
        ? 'Critical System Health Failure' 
        : 'System Health Degradation Detected';
      
      const message = `Health check ${status}: ${health.summary.unhealthy} unhealthy, ${health.summary.degraded} degraded services. Affected: ${unhealthyServices.join(', ')}`;
      
      triggerManualAlert(
        alertType,
        severity,
        title,
        message,
        {
          healthStatus: status,
          summary: health.summary,
          unhealthyServices,
          environment: health.environment,
          uptime: health.uptime,
          checkTimestamp: health.timestamp.toISOString(),
        }
      );
    } catch (error) {
      console.error('Failed to trigger health alert:', error);
    }
  }

  private getUnhealthyServices(health: OverallHealth): string[] {
    const unhealthy: string[] = [];
    
    Object.entries(health.services).forEach(([serviceName, service]) => {
      if (typeof service === 'object' && 'status' in service) {
        if (service.status !== 'healthy') {
          unhealthy.push(serviceName);
        }
      } else {
        // Handle nested services like externalServices
        Object.entries(service).forEach(([subServiceName, subService]) => {
          if (subService.status !== 'healthy') {
            unhealthy.push(`${serviceName}.${subServiceName}`);
          }
        });
      }
    });
    
    return unhealthy;
  }
}

// Export singleton instance
export const healthCheckService = HealthCheckService.getInstance();

// Express middleware for health endpoints
export function createHealthEndpoints() {
  return {
    // Comprehensive health check endpoint
    health: async (req: Request, res: Response) => {
      try {
        const health = await healthCheckService.performHealthCheck();
        
        // Set appropriate HTTP status based on health
        const statusCode = health.status === 'healthy' ? 200 :
                          health.status === 'degraded' ? 200 : 503;
        
        res.status(statusCode).json(health);
      } catch (error) {
        console.error('Health check endpoint error:', error);
        res.status(503).json({
          status: 'unhealthy',
          message: 'Health check failed',
          timestamp: new Date().toISOString(),
          error: error.message,
        });
      }
    },

    // Kubernetes-style readiness probe
    ready: async (req: Request, res: Response) => {
      try {
        const readiness = await healthCheckService.performReadinessCheck();
        
        if (readiness.ready) {
          res.status(200).json(readiness);
        } else {
          res.status(503).json(readiness);
        }
      } catch (error) {
        res.status(503).json({
          ready: false,
          message: `Readiness check failed: ${error.message}`,
          checks: {},
        });
      }
    },

    // Kubernetes-style liveness probe
    live: (req: Request, res: Response) => {
      try {
        const liveness = healthCheckService.performLivenessCheck();
        res.status(200).json(liveness);
      } catch (error) {
        res.status(503).json({
          alive: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    },
  };
}