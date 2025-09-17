import { z } from 'zod';
import crypto from 'crypto';

// Production environment validation schema
const productionEnvSchema = z.object({
  // Core Application Settings
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('5000'),
  
  // Database Configuration
  DATABASE_URL: z.string().url().refine(
    (url) => url.startsWith('postgres://') || url.startsWith('postgresql://'),
    'DATABASE_URL must be a valid PostgreSQL connection string'
  ),
  
  // Security Configuration
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters long'),
  ALLOWED_ORIGINS: z.string().optional().transform((val) => val?.split(',') || []),
  
  // External Service API Keys
  OPENAI_API_KEY: z.string().optional().refine(
    (key) => !key || key.startsWith('sk-'),
    'OPENAI_API_KEY must start with sk- if provided'
  ),
  
  // Monitoring and Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  ENABLE_DETAILED_LOGGING: z.string().transform(val => val === 'true').default('false'),
  SENTRY_DSN: z.string().url().optional(),
  
  // Performance Configuration
  RATE_LIMIT_MAX: z.string().regex(/^\d+$/).transform(Number).default('100'),
  RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).transform(Number).default('900000'), // 15 minutes
  QUERY_TIMEOUT_MS: z.string().regex(/^\d+$/).transform(Number).default('30000'),
  
  // Cache Configuration
  CACHE_TTL_SECONDS: z.string().regex(/^\d+$/).transform(Number).default('300'), // 5 minutes
  ENABLE_CACHE_WARMING: z.string().transform(val => val === 'true').default('true'),
  
  // Health Check Configuration
  HEALTH_CHECK_TIMEOUT_MS: z.string().regex(/^\d+$/).transform(Number).default('5000'),
  EXTERNAL_SERVICE_TIMEOUT_MS: z.string().regex(/^\d+$/).transform(Number).default('10000'),
  
  // Security Headers
  ENABLE_HSTS: z.string().transform(val => val === 'true').default('true'),
  CSP_REPORT_URI: z.string().url().optional(),
  
  // Replit-specific (optional)
  REPL_ID: z.string().optional(),
  REPL_SLUG: z.string().optional(),
  REPL_OWNER: z.string().optional(),
});

export type ProductionConfig = z.infer<typeof productionEnvSchema>;

// Production-safe environment defaults
const productionDefaults = {
  NODE_ENV: 'production',
  PORT: '5000',
  LOG_LEVEL: 'warn',
  ENABLE_DETAILED_LOGGING: 'false',
  RATE_LIMIT_MAX: '50', // Stricter in production
  RATE_LIMIT_WINDOW_MS: '900000', // 15 minutes
  CACHE_TTL_SECONDS: '600', // 10 minutes
  ENABLE_CACHE_WARMING: 'true',
  HEALTH_CHECK_TIMEOUT_MS: '3000',
  EXTERNAL_SERVICE_TIMEOUT_MS: '8000',
  ENABLE_HSTS: 'true',
};

// Staging environment defaults (more lenient than production)
const stagingDefaults = {
  NODE_ENV: 'staging',
  LOG_LEVEL: 'info',
  ENABLE_DETAILED_LOGGING: 'true',
  RATE_LIMIT_MAX: '200',
  HEALTH_CHECK_TIMEOUT_MS: '5000',
  EXTERNAL_SERVICE_TIMEOUT_MS: '10000',
};

// Development environment defaults (most lenient)
const developmentDefaults = {
  NODE_ENV: 'development',
  LOG_LEVEL: 'debug',
  ENABLE_DETAILED_LOGGING: 'true',
  RATE_LIMIT_MAX: '1000',
  HEALTH_CHECK_TIMEOUT_MS: '10000',
  EXTERNAL_SERVICE_TIMEOUT_MS: '15000',
  ENABLE_HSTS: 'false',
};

class ProductionConfigManager {
  private static instance: ProductionConfigManager;
  private config: ProductionConfig;
  private isValidated = false;

  private constructor() {
    this.config = this.loadAndValidateConfig();
  }

  static getInstance(): ProductionConfigManager {
    if (!ProductionConfigManager.instance) {
      ProductionConfigManager.instance = new ProductionConfigManager();
    }
    return ProductionConfigManager.instance;
  }

  private loadAndValidateConfig(): ProductionConfig {
    try {
      // Apply environment-specific defaults
      const envDefaults = this.getEnvironmentDefaults(process.env.NODE_ENV);
      const mergedEnv = { ...envDefaults, ...process.env };
      
      // Validate the configuration
      const config = productionEnvSchema.parse(mergedEnv);
      
      // Additional production-specific validation
      this.validateProductionRequirements(config);
      
      this.isValidated = true;
      console.log(`✅ Production configuration validated for ${config.NODE_ENV} environment`);
      
      return config;
    } catch (error) {
      console.error('❌ Production configuration validation failed:', error);
      
      if (error instanceof z.ZodError) {
        console.error('Configuration errors:');
        error.errors.forEach(err => {
          console.error(`  - ${err.path.join('.')}: ${err.message}`);
        });
      }
      
      throw new Error(`Production configuration validation failed: ${error.message}`);
    }
  }

  private getEnvironmentDefaults(env?: string) {
    switch (env) {
      case 'production':
        return productionDefaults;
      case 'staging':
        return { ...productionDefaults, ...stagingDefaults };
      case 'development':
      default:
        return { ...productionDefaults, ...stagingDefaults, ...developmentDefaults };
    }
  }

  private validateProductionRequirements(config: ProductionConfig): void {
    const errors: string[] = [];

    // Production-specific validations
    if (config.NODE_ENV === 'production') {
      if (!config.SESSION_SECRET || config.SESSION_SECRET.length < 64) {
        errors.push('SESSION_SECRET must be at least 64 characters in production');
      }

      if (!config.ALLOWED_ORIGINS || config.ALLOWED_ORIGINS.length === 0) {
        errors.push('ALLOWED_ORIGINS must be specified in production');
      }

      // Validate session secret entropy in production
      if (config.SESSION_SECRET && this.isWeakSecret(config.SESSION_SECRET)) {
        errors.push('SESSION_SECRET appears to be weak or predictable');
      }

      // Ensure secure rate limiting in production
      if (config.RATE_LIMIT_MAX > 200) {
        console.warn('⚠️  Rate limit is quite high for production environment');
      }
    }

    // Cross-environment validations
    if (config.QUERY_TIMEOUT_MS > 60000) {
      console.warn('⚠️  Query timeout is very high, consider optimizing database queries');
    }

    if (config.HEALTH_CHECK_TIMEOUT_MS > config.EXTERNAL_SERVICE_TIMEOUT_MS) {
      errors.push('Health check timeout should not exceed external service timeout');
    }

    if (errors.length > 0) {
      throw new Error(`Production validation failed:\n${errors.join('\n')}`);
    }
  }

  private isWeakSecret(secret: string): boolean {
    // Check for common weak patterns
    const weakPatterns = [
      /^(.)\1+$/, // Repeated characters
      /^(012|123|abc|test|secret|password)/i, // Common prefixes
      /^[a-z]+$/, // Only lowercase
      /^[A-Z]+$/, // Only uppercase  
      /^\d+$/, // Only numbers
    ];

    return weakPatterns.some(pattern => pattern.test(secret));
  }

  // Generate a secure session secret for development
  static generateSecureSecret(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  // Get validated configuration
  getConfig(): ProductionConfig {
    if (!this.isValidated) {
      throw new Error('Configuration not validated. Call validateConfig() first.');
    }
    return this.config;
  }

  // Get specific config value with type safety
  get<K extends keyof ProductionConfig>(key: K): ProductionConfig[K] {
    return this.getConfig()[key];
  }

  // Check if we're in production
  isProduction(): boolean {
    return this.get('NODE_ENV') === 'production';
  }

  // Check if we're in staging
  isStaging(): boolean {
    return this.get('NODE_ENV') === 'staging';
  }

  // Check if we're in development
  isDevelopment(): boolean {
    return this.get('NODE_ENV') === 'development';
  }

  // Get environment-appropriate log level
  getLogLevel(): string {
    return this.get('LOG_LEVEL');
  }

  // Get database configuration
  getDatabaseConfig() {
    return {
      url: this.get('DATABASE_URL'),
      queryTimeout: this.get('QUERY_TIMEOUT_MS'),
    };
  }

  // Get security configuration
  getSecurityConfig() {
    return {
      sessionSecret: this.get('SESSION_SECRET'),
      allowedOrigins: this.get('ALLOWED_ORIGINS'),
      enableHSTS: this.get('ENABLE_HSTS'),
      cspReportUri: this.get('CSP_REPORT_URI'),
    };
  }

  // Get rate limiting configuration
  getRateLimitConfig() {
    return {
      max: this.get('RATE_LIMIT_MAX'),
      windowMs: this.get('RATE_LIMIT_WINDOW_MS'),
    };
  }

  // Get monitoring configuration
  getMonitoringConfig() {
    return {
      logLevel: this.get('LOG_LEVEL'),
      enableDetailedLogging: this.get('ENABLE_DETAILED_LOGGING'),
      sentryDsn: this.get('SENTRY_DSN'),
    };
  }

  // Get health check configuration
  getHealthCheckConfig() {
    return {
      healthCheckTimeout: this.get('HEALTH_CHECK_TIMEOUT_MS'),
      externalServiceTimeout: this.get('EXTERNAL_SERVICE_TIMEOUT_MS'),
    };
  }

  // Get cache configuration
  getCacheConfig() {
    return {
      ttlSeconds: this.get('CACHE_TTL_SECONDS'),
      enableWarming: this.get('ENABLE_CACHE_WARMING'),
    };
  }

  // Print configuration summary (safe for logging)
  logConfigSummary(): void {
    const config = this.getConfig();
    console.log('🔧 Production Configuration Summary:');
    console.log(`   Environment: ${config.NODE_ENV}`);
    console.log(`   Port: ${config.PORT}`);
    console.log(`   Log Level: ${config.LOG_LEVEL}`);
    console.log(`   Rate Limit: ${config.RATE_LIMIT_MAX} requests per ${config.RATE_LIMIT_WINDOW_MS}ms`);
    console.log(`   Cache TTL: ${config.CACHE_TTL_SECONDS} seconds`);
    console.log(`   Health Check Timeout: ${config.HEALTH_CHECK_TIMEOUT_MS}ms`);
    console.log(`   HSTS Enabled: ${config.ENABLE_HSTS}`);
    console.log(`   Allowed Origins: ${config.ALLOWED_ORIGINS.length} configured`);
    
    // Don't log sensitive values, just their presence
    console.log(`   Database: ${config.DATABASE_URL ? '✅ Configured' : '❌ Missing'}`);
    console.log(`   Session Secret: ${config.SESSION_SECRET ? '✅ Configured' : '❌ Missing'}`);
    console.log(`   OpenAI API: ${config.OPENAI_API_KEY ? '✅ Configured' : '⚠️  Optional'}`);
    console.log(`   Sentry DSN: ${config.SENTRY_DSN ? '✅ Configured' : '⚠️  Optional'}`);
  }
}

// Export singleton instance
export const productionConfig = ProductionConfigManager.getInstance();

// Export validation function for startup
export function validateProductionConfig(): ProductionConfig {
  try {
    const config = productionConfig.getConfig();
    productionConfig.logConfigSummary();
    return config;
  } catch (error) {
    console.error('💥 Production configuration validation failed on startup');
    throw error;
  }
}

// Export utilities
export { ProductionConfigManager };