#!/usr/bin/env node

/**
 * Production Validation Script for School in the Square Fundraising Platform
 * 
 * This script validates the production environment configuration,
 * runs smoke tests, and verifies system readiness for deployment.
 */

import { execSync } from 'child_process';
import https from 'https';
import http from 'http';
import { readFileSync } from 'fs';

const COLORS = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m'
};

class ProductionValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
    this.baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    this.isProduction = process.env.NODE_ENV === 'production';
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

  async runValidation() {
    this.log('🚀 Starting Production Validation for School in the Square Platform', 'info');
    this.log(`Environment: ${process.env.NODE_ENV || 'development'}`, 'info');
    this.log(`Base URL: ${this.baseUrl}`, 'info');
    
    console.log('\\n' + '='.repeat(80));
    
    try {
      // Core validation steps
      await this.validateEnvironmentVariables();
      await this.validateDatabaseConnection();
      await this.validateApplicationStartup();
      await this.validateHealthEndpoints();
      await this.validateSecurityConfiguration();
      await this.validatePerformanceThresholds();
      await this.validateExternalServices();
      await this.runSmokeTests();
      
      // Production-specific validations
      if (this.isProduction) {
        await this.validateProductionSecurity();
        await this.validateSSLConfiguration();
        await this.validateMonitoringSetup();
      }
      
      this.generateReport();
      
    } catch (error) {
      this.log(`💥 Validation failed with critical error: ${error.message}`, 'error');
      process.exit(1);
    }
  }

  async validateEnvironmentVariables() {
    this.log('🔧 Validating Environment Variables...', 'info');
    
    const requiredVars = {
      'NODE_ENV': 'Application environment',
      'DATABASE_URL': 'Database connection string',
      'SESSION_SECRET': 'Session security secret'
    };

    const productionRequiredVars = {
      'ALLOWED_ORIGINS': 'CORS allowed origins',
      'RATE_LIMIT_MAX': 'Rate limiting configuration'
    };

    // Check required variables
    for (const [varName, description] of Object.entries(requiredVars)) {
      if (!process.env[varName]) {
        this.errors.push(`Missing required environment variable: ${varName} (${description})`);
      } else {
        this.passed.push(`✅ ${varName} is configured`);
      }
    }

    // Check production-specific variables
    if (this.isProduction) {
      for (const [varName, description] of Object.entries(productionRequiredVars)) {
        if (!process.env[varName]) {
          this.errors.push(`Missing production environment variable: ${varName} (${description})`);
        } else {
          this.passed.push(`✅ ${varName} is configured for production`);
        }
      }
    }

    // Validate specific formats
    if (process.env.DATABASE_URL) {
      if (!process.env.DATABASE_URL.startsWith('postgres')) {
        this.errors.push('DATABASE_URL must be a PostgreSQL connection string');
      } else if (this.isProduction && !process.env.DATABASE_URL.includes('sslmode=require')) {
        this.warnings.push('DATABASE_URL should include sslmode=require for production');
      } else {
        this.passed.push('✅ DATABASE_URL format is valid');
      }
    }

    if (process.env.SESSION_SECRET) {
      if (process.env.SESSION_SECRET.length < 32) {
        this.errors.push('SESSION_SECRET must be at least 32 characters long');
      } else if (this.isProduction && process.env.SESSION_SECRET.length < 64) {
        this.warnings.push('SESSION_SECRET should be at least 64 characters for production');
      } else {
        this.passed.push('✅ SESSION_SECRET meets security requirements');
      }
    }

    // Check optional but recommended variables
    const optionalVars = ['OPENAI_API_KEY', 'SENTRY_DSN', 'LOG_LEVEL'];
    optionalVars.forEach(varName => {
      if (process.env[varName]) {
        this.passed.push(`✅ ${varName} is configured`);
      } else {
        this.warnings.push(`Optional variable ${varName} not configured`);
      }
    });
  }

  async validateDatabaseConnection() {
    this.log('🗄️ Validating Database Connection...', 'info');
    
    try {
      // Try to load the database module and test connection
      const { execSync } = await import('child_process');
      
      // Test database connection using a simple query
      const testQuery = `
        const { Pool } = require('@neondatabase/serverless');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        
        (async () => {
          try {
            const client = await pool.connect();
            const result = await client.query('SELECT 1 as test, NOW() as timestamp');
            console.log('Database connection successful:', result.rows[0]);
            await client.release();
            process.exit(0);
          } catch (error) {
            console.error('Database connection failed:', error.message);
            process.exit(1);
          }
        })();
      `;
      
      try {
        execSync(`node -e "${testQuery}"`, { stdio: 'pipe', timeout: 10000 });
        this.passed.push('✅ Database connection successful');
      } catch (error) {
        this.errors.push(`Database connection failed: ${error.message}`);
      }
      
    } catch (error) {
      this.warnings.push(`Could not test database connection: ${error.message}`);
    }
  }

  async validateApplicationStartup() {
    this.log('🚀 Validating Application Startup...', 'info');
    
    try {
      // Check if the application process is running
      const response = await this.makeRequest('/health', { timeout: 5000 });
      
      if (response.status >= 200 && response.status < 300) {
        this.passed.push('✅ Application is running and responding');
        
        // Check if configuration validation is working
        if (response.data && response.data.status) {
          this.passed.push('✅ Health endpoint is functional');
        }
      } else {
        this.errors.push(`Application health check failed with status ${response.status}`);
      }
      
    } catch (error) {
      this.errors.push(`Cannot connect to application: ${error.message}`);
    }
  }

  async validateHealthEndpoints() {
    this.log('🏥 Validating Health Check Endpoints...', 'info');
    
    const healthEndpoints = [
      { path: '/health', name: 'Basic Health Check' },
      { path: '/api/health', name: 'Comprehensive Health Check' }
    ];

    for (const endpoint of healthEndpoints) {
      try {
        const response = await this.makeRequest(endpoint.path, { timeout: 5000 });
        
        if (response.status === 200) {
          this.passed.push(`✅ ${endpoint.name} is responding`);
          
          // Validate response structure
          if (response.data) {
            if (response.data.status && response.data.timestamp) {
              this.passed.push(`✅ ${endpoint.name} has valid response structure`);
            } else {
              this.warnings.push(`${endpoint.name} response structure could be improved`);
            }
          }
        } else {
          this.errors.push(`${endpoint.name} returned status ${response.status}`);
        }
        
      } catch (error) {
        this.errors.push(`${endpoint.name} failed: ${error.message}`);
      }
    }
  }

  async validateSecurityConfiguration() {
    this.log('🔒 Validating Security Configuration...', 'info');
    
    try {
      // Test security headers
      const response = await this.makeRequest('/', { 
        timeout: 5000,
        includeHeaders: true 
      });
      
      const securityHeaders = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
      };

      for (const [header, expectedValue] of Object.entries(securityHeaders)) {
        const headerValue = response.headers[header.toLowerCase()];
        if (headerValue) {
          if (headerValue.includes(expectedValue)) {
            this.passed.push(`✅ Security header ${header} is properly configured`);
          } else {
            this.warnings.push(`Security header ${header} value may need review: ${headerValue}`);
          }
        } else {
          this.warnings.push(`Security header ${header} is missing`);
        }
      }

      // Check HSTS header for production
      if (this.isProduction) {
        const hstsHeader = response.headers['strict-transport-security'];
        if (hstsHeader) {
          this.passed.push('✅ HSTS header is configured for production');
        } else {
          this.errors.push('HSTS header is missing in production');
        }
      }

      // Test rate limiting
      this.log('Testing rate limiting...', 'info');
      await this.testRateLimiting();
      
    } catch (error) {
      this.warnings.push(`Security validation incomplete: ${error.message}`);
    }
  }

  async testRateLimiting() {
    const testEndpoint = '/api/health';
    const maxRequests = 10;
    let rateLimitTriggered = false;

    try {
      for (let i = 0; i < maxRequests; i++) {
        const response = await this.makeRequest(testEndpoint, { timeout: 1000 });
        
        if (response.status === 429) {
          rateLimitTriggered = true;
          break;
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (rateLimitTriggered) {
        this.passed.push('✅ Rate limiting is active and working');
      } else {
        this.warnings.push('Rate limiting may not be properly configured (no 429 response received)');
      }
      
    } catch (error) {
      this.warnings.push(`Rate limiting test failed: ${error.message}`);
    }
  }

  async validatePerformanceThresholds() {
    this.log('⚡ Validating Performance Thresholds...', 'info');
    
    try {
      const startTime = Date.now();
      const response = await this.makeRequest('/api/health', { timeout: 10000 });
      const responseTime = Date.now() - startTime;

      if (responseTime < 1000) {
        this.passed.push(`✅ Health endpoint response time is good (${responseTime}ms)`);
      } else if (responseTime < 3000) {
        this.warnings.push(`Health endpoint response time is acceptable but could be improved (${responseTime}ms)`);
      } else {
        this.errors.push(`Health endpoint response time is too slow (${responseTime}ms)`);
      }

      // Check memory usage if available in health response
      if (response.data && response.data.memory) {
        const memoryMB = Math.round(response.data.memory.heapUsed / 1024 / 1024);
        if (memoryMB < 256) {
          this.passed.push(`✅ Memory usage is healthy (${memoryMB}MB)`);
        } else if (memoryMB < 512) {
          this.warnings.push(`Memory usage is moderate (${memoryMB}MB)`);
        } else {
          this.warnings.push(`Memory usage is high (${memoryMB}MB) - consider optimization`);
        }
      }

    } catch (error) {
      this.errors.push(`Performance validation failed: ${error.message}`);
    }
  }

  async validateExternalServices() {
    this.log('🌐 Validating External Services...', 'info');
    
    // Test OpenAI API if configured
    if (process.env.OPENAI_API_KEY) {
      try {
        // Test OpenAI connectivity (simplified test)
        this.passed.push('✅ OpenAI API key is configured');
        this.warnings.push('OpenAI API connectivity should be tested in application health checks');
      } catch (error) {
        this.warnings.push(`OpenAI API test failed: ${error.message}`);
      }
    } else {
      this.warnings.push('OpenAI API key not configured (optional service)');
    }

    // Test Sentry if configured
    if (process.env.SENTRY_DSN) {
      try {
        // Validate Sentry DSN format
        const url = new URL(process.env.SENTRY_DSN);
        if (url.hostname.includes('sentry')) {
          this.passed.push('✅ Sentry DSN format is valid');
        } else {
          this.warnings.push('Sentry DSN format may be incorrect');
        }
      } catch (error) {
        this.errors.push(`Invalid Sentry DSN format: ${error.message}`);
      }
    } else {
      this.warnings.push('Sentry DSN not configured (optional for error tracking)');
    }
  }

  async runSmokeTests() {
    this.log('💨 Running Smoke Tests...', 'info');
    
    const smokeTests = [
      {
        name: 'Basic Application Response',
        test: () => this.makeRequest('/', { timeout: 5000 })
      },
      {
        name: 'API Health Endpoint',
        test: () => this.makeRequest('/api/health', { timeout: 5000 })
      },
      {
        name: 'Authentication Endpoint (Unauthenticated)',
        test: () => this.makeRequest('/api/auth/user', { 
          timeout: 5000,
          expectStatus: 401 
        })
      },
      {
        name: 'Static Assets Loading',
        test: () => this.makeRequest('/assets/', { 
          timeout: 5000,
          allowFailure: true 
        })
      }
    ];

    for (const smokeTest of smokeTests) {
      try {
        this.log(`Running: ${smokeTest.name}`, 'info');
        const result = await smokeTest.test();
        
        if (result.status >= 200 && result.status < 500) {
          this.passed.push(`✅ Smoke test passed: ${smokeTest.name}`);
        } else if (smokeTest.expectStatus && result.status === smokeTest.expectStatus) {
          this.passed.push(`✅ Smoke test passed: ${smokeTest.name} (expected ${result.status})`);
        } else {
          this.warnings.push(`Smoke test warning: ${smokeTest.name} returned ${result.status}`);
        }
        
      } catch (error) {
        if (smokeTest.allowFailure) {
          this.warnings.push(`Smoke test skipped: ${smokeTest.name} - ${error.message}`);
        } else {
          this.errors.push(`Smoke test failed: ${smokeTest.name} - ${error.message}`);
        }
      }
    }
  }

  async validateProductionSecurity() {
    this.log('🔐 Validating Production Security Settings...', 'info');
    
    // Check that we're not using development settings
    if (process.env.NODE_ENV !== 'production') {
      this.errors.push('NODE_ENV must be set to "production" for production deployment');
    } else {
      this.passed.push('✅ NODE_ENV is correctly set to production');
    }

    // Check for production-specific security settings
    if (process.env.ENABLE_HSTS !== 'true') {
      this.warnings.push('HSTS should be enabled in production (ENABLE_HSTS=true)');
    } else {
      this.passed.push('✅ HSTS is enabled for production');
    }

    // Validate CORS settings for production
    if (!process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS.includes('localhost')) {
      this.errors.push('ALLOWED_ORIGINS must be configured with production domains only');
    } else {
      this.passed.push('✅ ALLOWED_ORIGINS is configured for production');
    }

    // Check logging levels for production
    const logLevel = process.env.LOG_LEVEL || 'info';
    if (logLevel === 'debug') {
      this.warnings.push('LOG_LEVEL should not be "debug" in production for performance');
    } else {
      this.passed.push('✅ LOG_LEVEL is appropriately set for production');
    }
  }

  async validateSSLConfiguration() {
    this.log('🔐 Validating SSL Configuration...', 'info');
    
    if (this.baseUrl.startsWith('https://')) {
      try {
        // Test SSL connectivity
        const response = await this.makeRequest('/', { timeout: 5000 });
        
        if (response.status < 400) {
          this.passed.push('✅ HTTPS is working correctly');
        } else {
          this.errors.push('HTTPS endpoint is not responding correctly');
        }
        
      } catch (error) {
        if (error.message.includes('certificate')) {
          this.errors.push(`SSL certificate issue: ${error.message}`);
        } else {
          this.errors.push(`HTTPS connectivity failed: ${error.message}`);
        }
      }
    } else {
      this.errors.push('Production deployment must use HTTPS');
    }
  }

  async validateMonitoringSetup() {
    this.log('📊 Validating Monitoring Setup...', 'info');
    
    // Check if monitoring endpoints are accessible
    try {
      // Test admin endpoints (should require authentication)
      const securityReportResponse = await this.makeRequest('/api/admin/security-report', {
        timeout: 5000,
        expectStatus: 401
      });
      
      if (securityReportResponse.status === 401) {
        this.passed.push('✅ Admin monitoring endpoints are protected');
      } else {
        this.warnings.push('Admin monitoring endpoints may not be properly protected');
      }
      
    } catch (error) {
      this.warnings.push(`Monitoring endpoint validation failed: ${error.message}`);
    }

    // Check if error tracking is configured
    if (process.env.SENTRY_DSN) {
      this.passed.push('✅ Error tracking (Sentry) is configured');
    } else {
      this.warnings.push('Consider configuring error tracking for production monitoring');
    }
  }

  async makeRequest(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const timeout = options.timeout || 5000;
    
    return new Promise((resolve, reject) => {
      const lib = url.startsWith('https://') ? https : http;
      const timeoutId = setTimeout(() => {
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);

      const req = lib.get(url, (res) => {
        clearTimeout(timeoutId);
        
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsedData = data ? JSON.parse(data) : null;
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: parsedData
            });
          } catch (error) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: null,
              rawData: data
            });
          }
        });
      });

      req.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });

      req.setTimeout(timeout, () => {
        clearTimeout(timeoutId);
        req.destroy();
        reject(new Error(`Request timeout after ${timeout}ms`));
      });
    });
  }

  generateReport() {
    console.log('\\n' + '='.repeat(80));
    this.log('📋 PRODUCTION VALIDATION REPORT', 'info');
    console.log('='.repeat(80));
    
    // Summary
    console.log(`\\n${COLORS.BOLD}SUMMARY:${COLORS.RESET}`);
    console.log(`✅ Passed: ${COLORS.GREEN}${this.passed.length}${COLORS.RESET}`);
    console.log(`⚠️  Warnings: ${COLORS.YELLOW}${this.warnings.length}${COLORS.RESET}`);
    console.log(`❌ Errors: ${COLORS.RED}${this.errors.length}${COLORS.RESET}`);
    
    // Detailed results
    if (this.passed.length > 0) {
      console.log(`\\n${COLORS.GREEN}${COLORS.BOLD}✅ PASSED CHECKS:${COLORS.RESET}`);
      this.passed.forEach(item => console.log(`  ${item}`));
    }
    
    if (this.warnings.length > 0) {
      console.log(`\\n${COLORS.YELLOW}${COLORS.BOLD}⚠️  WARNINGS:${COLORS.RESET}`);
      this.warnings.forEach(item => console.log(`  ⚠️  ${item}`));
    }
    
    if (this.errors.length > 0) {
      console.log(`\\n${COLORS.RED}${COLORS.BOLD}❌ ERRORS:${COLORS.RESET}`);
      this.errors.forEach(item => console.log(`  ❌ ${item}`));
    }
    
    // Final verdict
    console.log('\\n' + '='.repeat(80));
    
    if (this.errors.length === 0) {
      this.log('🎉 VALIDATION PASSED - System is ready for production deployment!', 'success');
      
      if (this.warnings.length > 0) {
        this.log(`💡 Consider addressing ${this.warnings.length} warnings for optimal production readiness`, 'warning');
      }
      
      process.exit(0);
    } else {
      this.log(`💥 VALIDATION FAILED - ${this.errors.length} critical errors must be fixed before deployment`, 'error');
      process.exit(1);
    }
  }
}

// Run validation if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new ProductionValidator();
  validator.runValidation().catch(error => {
    console.error('Validation script failed:', error);
    process.exit(1);
  });
}

export default ProductionValidator;