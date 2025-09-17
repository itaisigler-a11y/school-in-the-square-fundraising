#!/usr/bin/env node

/**
 * Startup Validation Script for School in the Square Fundraising Platform
 * 
 * This script runs during application startup to validate that all
 * systems are properly configured and ready for operation.
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

const COLORS = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m'
};

class StartupValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isStaging = process.env.NODE_ENV === 'staging';
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      error: COLORS.RED,
      warning: COLORS.YELLOW,
      success: COLORS.GREEN,
      info: COLORS.BLUE
    };
    
    console.log(`${colors[type]}[${timestamp}] ${message}${COLORS.RESET}`);
  }

  async validateStartup() {
    this.log('🚀 Running Startup Validation for School in the Square Platform', 'info');
    this.log(`Environment: ${process.env.NODE_ENV || 'development'}`, 'info');
    
    console.log('\\n' + '='.repeat(60));
    
    try {
      // Critical validations that must pass before startup
      await this.validateCriticalSystems();
      
      // Secondary validations (warnings are acceptable)
      await this.validateSecondaryRequirements();
      
      // Environment-specific validations
      if (this.isProduction) {
        await this.validateProductionRequirements();
      } else if (this.isStaging) {
        await this.validateStagingRequirements();
      }
      
      this.generateStartupReport();
      
    } catch (error) {
      this.log(`💥 Startup validation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async validateCriticalSystems() {
    this.log('🔧 Validating Critical Systems...', 'info');
    
    // Node.js version check
    await this.validateNodeVersion();
    
    // Required environment variables
    await this.validateRequiredEnvironmentVariables();
    
    // Database connectivity
    await this.validateDatabaseConnectivity();
    
    // Configuration integrity
    await this.validateConfigurationIntegrity();
    
    // Essential file presence
    await this.validateEssentialFiles();
  }

  async validateSecondaryRequirements() {
    this.log('⚙️ Validating Secondary Requirements...', 'info');
    
    // Optional services
    await this.validateOptionalServices();
    
    // Performance settings
    await this.validatePerformanceSettings();
    
    // Security configurations
    await this.validateSecurityConfigurations();
    
    // Monitoring setup
    await this.validateMonitoringSetup();
  }

  async validateProductionRequirements() {
    this.log('🔒 Validating Production-Specific Requirements...', 'info');
    
    // Production security
    await this.validateProductionSecurity();
    
    // Performance optimizations
    await this.validateProductionPerformance();
    
    // Monitoring and alerting
    await this.validateProductionMonitoring();
  }

  async validateStagingRequirements() {
    this.log('🧪 Validating Staging-Specific Requirements...', 'info');
    
    // Staging can be more lenient but should still be secure
    await this.validateStagingSecurity();
  }

  async validateNodeVersion() {
    try {
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
      
      if (majorVersion >= 18) {
        this.passed.push(`✅ Node.js version ${nodeVersion} is supported`);
      } else {
        this.errors.push(`Node.js version ${nodeVersion} is not supported. Minimum required: 18.x`);
      }
    } catch (error) {
      this.errors.push(`Cannot determine Node.js version: ${error.message}`);
    }
  }

  async validateRequiredEnvironmentVariables() {
    const requiredVars = [
      {
        name: 'DATABASE_URL',
        description: 'Database connection string',
        validator: (value) => {
          if (!value) return 'DATABASE_URL is required';
          if (!value.startsWith('postgres')) return 'DATABASE_URL must be a PostgreSQL connection string';
          return null;
        }
      },
      {
        name: 'SESSION_SECRET',
        description: 'Session security secret',
        validator: (value) => {
          if (!value) return 'SESSION_SECRET is required';
          if (value.length < 32) return 'SESSION_SECRET must be at least 32 characters';
          if (this.isProduction && value.length < 64) return 'SESSION_SECRET should be at least 64 characters in production';
          return null;
        }
      }
    ];

    for (const envVar of requiredVars) {
      const value = process.env[envVar.name];
      const error = envVar.validator(value);
      
      if (error) {
        this.errors.push(`Environment variable validation failed: ${error}`);
      } else {
        this.passed.push(`✅ ${envVar.name} is properly configured`);
      }
    }

    // Production-specific required variables
    if (this.isProduction) {
      const productionRequiredVars = ['ALLOWED_ORIGINS'];
      
      for (const varName of productionRequiredVars) {
        if (!process.env[varName]) {
          this.errors.push(`Production environment variable missing: ${varName}`);
        } else {
          this.passed.push(`✅ ${varName} is configured for production`);
        }
      }
    }
  }

  async validateDatabaseConnectivity() {
    try {
      // Test database connection
      const testQuery = `
        const { Pool } = require('@neondatabase/serverless');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        
        (async () => {
          try {
            const client = await pool.connect();
            const result = await client.query('SELECT 1 as test, version() as pg_version');
            console.log(JSON.stringify({ success: true, result: result.rows[0] }));
            await client.release();
            await pool.end();
          } catch (error) {
            console.log(JSON.stringify({ success: false, error: error.message }));
          }
        })();
      `;
      
      const output = execSync(`node -e "${testQuery}"`, { 
        encoding: 'utf8',
        timeout: 10000
      });
      
      const result = JSON.parse(output.trim());
      
      if (result.success) {
        this.passed.push('✅ Database connectivity verified');
        if (result.result && result.result.pg_version) {
          this.passed.push(`✅ PostgreSQL version: ${result.result.pg_version.split(' ')[1]}`);
        }
      } else {
        this.errors.push(`Database connectivity failed: ${result.error}`);
      }
      
    } catch (error) {
      this.errors.push(`Database connectivity test failed: ${error.message}`);
    }
  }

  async validateConfigurationIntegrity() {
    try {
      // Test production configuration loading
      const configTest = `
        try {
          const { validateProductionConfig } = require('./server/production-config.js');
          const config = validateProductionConfig();
          console.log(JSON.stringify({ success: true, environment: config.NODE_ENV }));
        } catch (error) {
          console.log(JSON.stringify({ success: false, error: error.message }));
        }
      `;
      
      const output = execSync(`node -e "${configTest}"`, { 
        encoding: 'utf8',
        timeout: 5000,
        cwd: process.cwd()
      });
      
      const result = JSON.parse(output.trim());
      
      if (result.success) {
        this.passed.push(`✅ Configuration validation successful for ${result.environment}`);
      } else {
        this.errors.push(`Configuration validation failed: ${result.error}`);
      }
      
    } catch (error) {
      this.warnings.push(`Configuration integrity test failed: ${error.message}`);
    }
  }

  async validateEssentialFiles() {
    const essentialFiles = [
      'package.json',
      'server/index.ts',
      'server/production-config.ts',
      'server/health-check-service.ts',
      'shared/schema.ts'
    ];

    for (const file of essentialFiles) {
      if (existsSync(file)) {
        this.passed.push(`✅ Essential file present: ${file}`);
      } else {
        this.errors.push(`Essential file missing: ${file}`);
      }
    }

    // Check package.json integrity
    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
      
      if (packageJson.name && packageJson.version) {
        this.passed.push(`✅ Package.json valid: ${packageJson.name}@${packageJson.version}`);
      } else {
        this.warnings.push('Package.json missing name or version');
      }
      
      // Check critical dependencies
      const criticalDeps = ['express', 'drizzle-orm', '@neondatabase/serverless'];
      const missingDeps = criticalDeps.filter(dep => !packageJson.dependencies[dep]);
      
      if (missingDeps.length === 0) {
        this.passed.push('✅ Critical dependencies present');
      } else {
        this.errors.push(`Critical dependencies missing: ${missingDeps.join(', ')}`);
      }
      
    } catch (error) {
      this.errors.push(`Package.json validation failed: ${error.message}`);
    }
  }

  async validateOptionalServices() {
    // OpenAI API
    if (process.env.OPENAI_API_KEY) {
      if (process.env.OPENAI_API_KEY.startsWith('sk-')) {
        this.passed.push('✅ OpenAI API key format is valid');
      } else {
        this.warnings.push('OpenAI API key format may be invalid');
      }
    } else {
      this.warnings.push('OpenAI API key not configured (optional)');
    }

    // Sentry DSN
    if (process.env.SENTRY_DSN) {
      try {
        new URL(process.env.SENTRY_DSN);
        this.passed.push('✅ Sentry DSN format is valid');
      } catch {
        this.warnings.push('Sentry DSN format is invalid');
      }
    } else {
      this.warnings.push('Sentry DSN not configured (optional for error tracking)');
    }
  }

  async validatePerformanceSettings() {
    const performanceSettings = {
      RATE_LIMIT_MAX: { 
        default: this.isProduction ? 50 : 1000,
        validator: (val) => parseInt(val) > 0
      },
      QUERY_TIMEOUT_MS: {
        default: 30000,
        validator: (val) => parseInt(val) >= 5000 && parseInt(val) <= 60000
      },
      CACHE_TTL_SECONDS: {
        default: this.isProduction ? 600 : 300,
        validator: (val) => parseInt(val) >= 60
      }
    };

    for (const [setting, config] of Object.entries(performanceSettings)) {
      const value = process.env[setting];
      
      if (value) {
        if (config.validator(value)) {
          this.passed.push(`✅ Performance setting ${setting}: ${value}`);
        } else {
          this.warnings.push(`Performance setting ${setting} value may be suboptimal: ${value}`);
        }
      } else {
        this.warnings.push(`Performance setting ${setting} using default: ${config.default}`);
      }
    }
  }

  async validateSecurityConfigurations() {
    // Log level check
    const logLevel = process.env.LOG_LEVEL || 'info';
    if (this.isProduction && logLevel === 'debug') {
      this.warnings.push('Debug logging enabled in production - consider changing for performance');
    } else {
      this.passed.push(`✅ Log level appropriately set: ${logLevel}`);
    }

    // HSTS check for production
    if (this.isProduction) {
      const hstsEnabled = process.env.ENABLE_HSTS === 'true';
      if (hstsEnabled) {
        this.passed.push('✅ HSTS enabled for production');
      } else {
        this.warnings.push('HSTS not enabled for production');
      }
    }

    // CORS configuration
    if (process.env.ALLOWED_ORIGINS) {
      const origins = process.env.ALLOWED_ORIGINS.split(',');
      const hasLocalhost = origins.some(origin => origin.includes('localhost'));
      
      if (this.isProduction && hasLocalhost) {
        this.warnings.push('CORS configuration includes localhost in production');
      } else {
        this.passed.push(`✅ CORS configured with ${origins.length} origins`);
      }
    }
  }

  async validateMonitoringSetup() {
    // Check if monitoring files exist
    const monitoringFiles = [
      'server/monitoring-setup.ts',
      'server/production-logging.ts',
      'server/production-alerts.ts'
    ];

    let monitoringFilesPresent = 0;
    for (const file of monitoringFiles) {
      if (existsSync(file)) {
        monitoringFilesPresent++;
      }
    }

    if (monitoringFilesPresent === monitoringFiles.length) {
      this.passed.push('✅ Monitoring infrastructure files present');
    } else {
      this.warnings.push(`Some monitoring files missing: ${monitoringFilesPresent}/${monitoringFiles.length} present`);
    }
  }

  async validateProductionSecurity() {
    // Ensure NODE_ENV is production
    if (process.env.NODE_ENV !== 'production') {
      this.errors.push('NODE_ENV must be "production" for production deployment');
    }

    // Check session secret strength
    const sessionSecret = process.env.SESSION_SECRET;
    if (sessionSecret && sessionSecret.length < 64) {
      this.warnings.push('SESSION_SECRET should be at least 64 characters for production');
    }

    // Validate CORS for production
    const allowedOrigins = process.env.ALLOWED_ORIGINS;
    if (!allowedOrigins) {
      this.errors.push('ALLOWED_ORIGINS must be configured for production');
    } else if (allowedOrigins.includes('localhost') || allowedOrigins.includes('127.0.0.1')) {
      this.errors.push('ALLOWED_ORIGINS should not include localhost/127.0.0.1 in production');
    }

    // Check if HTTPS is enforced
    if (process.env.ENABLE_HSTS !== 'true') {
      this.warnings.push('HSTS should be enabled in production');
    }
  }

  async validateProductionPerformance() {
    // Check rate limiting for production
    const rateLimit = parseInt(process.env.RATE_LIMIT_MAX || '100');
    if (rateLimit > 200) {
      this.warnings.push('Rate limit is quite high for production - consider tightening');
    }

    // Check if detailed logging is disabled
    if (process.env.ENABLE_DETAILED_LOGGING === 'true') {
      this.warnings.push('Detailed logging enabled in production - may impact performance');
    }

    // Check cache settings
    const cacheTTL = parseInt(process.env.CACHE_TTL_SECONDS || '300');
    if (cacheTTL < 300) {
      this.warnings.push('Cache TTL is quite low for production - consider increasing');
    }
  }

  async validateProductionMonitoring() {
    // Check if error tracking is configured
    if (!process.env.SENTRY_DSN) {
      this.warnings.push('Error tracking (Sentry) not configured for production');
    }

    // Check if monitoring is properly configured
    const monitoringChecks = [
      process.env.LOG_LEVEL,
      process.env.HEALTH_CHECK_TIMEOUT_MS,
      process.env.EXTERNAL_SERVICE_TIMEOUT_MS
    ];

    const configuredChecks = monitoringChecks.filter(Boolean).length;
    if (configuredChecks < 2) {
      this.warnings.push('Monitoring configuration appears incomplete');
    }
  }

  async validateStagingSecurity() {
    // Staging should still be secure but can be more lenient
    const allowedOrigins = process.env.ALLOWED_ORIGINS;
    if (allowedOrigins && allowedOrigins.includes('localhost')) {
      this.warnings.push('Staging environment includes localhost in ALLOWED_ORIGINS');
    }
  }

  generateStartupReport() {
    console.log('\\n' + '='.repeat(60));
    this.log('📋 STARTUP VALIDATION REPORT', 'info');
    console.log('='.repeat(60));
    
    // Summary
    console.log(`\\n${COLORS.BOLD}SUMMARY:${COLORS.RESET}`);
    console.log(`✅ Passed: ${COLORS.GREEN}${this.passed.length}${COLORS.RESET}`);
    console.log(`⚠️  Warnings: ${COLORS.YELLOW}${this.warnings.length}${COLORS.RESET}`);
    console.log(`❌ Errors: ${COLORS.RED}${this.errors.length}${COLORS.RESET}`);
    
    // Show details only if there are issues
    if (this.warnings.length > 0) {
      console.log(`\\n${COLORS.YELLOW}${COLORS.BOLD}⚠️  WARNINGS:${COLORS.RESET}`);
      this.warnings.forEach(item => console.log(`  ⚠️  ${item}`));
    }
    
    if (this.errors.length > 0) {
      console.log(`\\n${COLORS.RED}${COLORS.BOLD}❌ ERRORS:${COLORS.RESET}`);
      this.errors.forEach(item => console.log(`  ❌ ${item}`));
    }
    
    // Final verdict
    console.log('\\n' + '='.repeat(60));
    
    if (this.errors.length === 0) {
      this.log('✅ STARTUP VALIDATION PASSED - Application ready to start!', 'success');
      
      if (this.warnings.length > 0) {
        this.log(`💡 ${this.warnings.length} warnings - consider reviewing for optimal operation`, 'warning');
      }
    } else {
      this.log(`💥 STARTUP VALIDATION FAILED - ${this.errors.length} critical errors prevent startup`, 'error');
      throw new Error(`Startup validation failed with ${this.errors.length} errors`);
    }
  }
}

// Export for use in other modules
export default StartupValidator;

// Run validation if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new StartupValidator();
  validator.validateStartup().catch(error => {
    console.error('Startup validation failed:', error.message);
    process.exit(1);
  });
}