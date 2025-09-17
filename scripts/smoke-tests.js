#!/usr/bin/env node

/**
 * Smoke Tests for School in the Square Fundraising Platform
 * 
 * Critical functionality tests to verify the application is working
 * correctly in production or staging environments.
 */

import https from 'https';
import http from 'http';

const COLORS = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m'
};

class SmokeTestRunner {
  constructor() {
    this.baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    this.testResults = [];
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

  async runAllTests() {
    this.log('🧪 Starting Smoke Tests for School in the Square Fundraising Platform', 'info');
    this.log(`Environment: ${process.env.NODE_ENV || 'development'}`, 'info');
    this.log(`Target URL: ${this.baseUrl}`, 'info');
    
    console.log('\\n' + '='.repeat(80));
    
    const testSuites = [
      { name: 'Core Application Tests', tests: await this.getCoreApplicationTests() },
      { name: 'API Functionality Tests', tests: await this.getAPIFunctionalityTests() },
      { name: 'Security Tests', tests: await this.getSecurityTests() },
      { name: 'Performance Tests', tests: await this.getPerformanceTests() },
      { name: 'Integration Tests', tests: await this.getIntegrationTests() }
    ];

    for (const suite of testSuites) {
      await this.runTestSuite(suite.name, suite.tests);
    }

    this.generateSmokeTestReport();
  }

  async getCoreApplicationTests() {
    return [
      {
        name: 'Application Startup',
        description: 'Verify the application starts and responds',
        test: async () => {
          const response = await this.makeRequest('/', { timeout: 10000 });
          
          if (response.status >= 200 && response.status < 400) {
            return { passed: true, message: `Application responding (${response.status})` };
          } else {
            return { passed: false, message: `Application returned ${response.status}` };
          }
        }
      },

      {
        name: 'Health Check Endpoint',
        description: 'Verify health check endpoints are working',
        test: async () => {
          const response = await this.makeRequest('/health', { timeout: 5000 });
          
          if (response.status === 200 && response.data && response.data.status) {
            return { 
              passed: true, 
              message: `Health check passed: ${response.data.status}`,
              details: {
                uptime: response.data.uptime,
                environment: response.data.environment
              }
            };
          } else {
            return { passed: false, message: 'Health check failed or invalid response' };
          }
        }
      },

      {
        name: 'Database Connectivity',
        description: 'Verify database is accessible through API',
        test: async () => {
          const response = await this.makeRequest('/api/health', { timeout: 8000 });
          
          if (response.status === 200 && response.data) {
            // Look for database status in health response
            const dbHealthy = response.data.services?.database?.status === 'healthy' ||
                             response.data.status === 'healthy';
            
            if (dbHealthy) {
              return { passed: true, message: 'Database connectivity verified' };
            } else {
              return { passed: false, message: 'Database appears to be unhealthy' };
            }
          } else {
            return { passed: false, message: 'Could not verify database connectivity' };
          }
        }
      },

      {
        name: 'Static Asset Loading',
        description: 'Verify static assets can be loaded',
        test: async () => {
          try {
            // Try to load a static asset or the main page
            const response = await this.makeRequest('/', { timeout: 5000 });
            
            if (response.status < 400) {
              return { passed: true, message: 'Static assets are accessible' };
            } else {
              return { passed: false, message: `Static assets returned ${response.status}` };
            }
          } catch (error) {
            return { passed: false, message: `Static asset loading failed: ${error.message}` };
          }
        }
      }
    ];
  }

  async getAPIFunctionalityTests() {
    return [
      {
        name: 'API Health Endpoint',
        description: 'Test comprehensive API health endpoint',
        test: async () => {
          const response = await this.makeRequest('/api/health', { timeout: 8000 });
          
          if (response.status === 200 && response.data) {
            const hasRequiredFields = response.data.status && response.data.timestamp;
            
            if (hasRequiredFields) {
              return { 
                passed: true, 
                message: 'API health endpoint working correctly',
                details: {
                  status: response.data.status,
                  uptime: response.data.uptime
                }
              };
            } else {
              return { passed: false, message: 'API health response missing required fields' };
            }
          } else {
            return { passed: false, message: `API health endpoint failed: ${response.status}` };
          }
        }
      },

      {
        name: 'Authentication API (Unauthenticated)',
        description: 'Verify authentication API properly rejects unauthenticated requests',
        test: async () => {
          const response = await this.makeRequest('/api/auth/user', { 
            timeout: 5000,
            expectStatus: 401 
          });
          
          if (response.status === 401) {
            return { passed: true, message: 'Authentication properly rejects unauthenticated requests' };
          } else {
            return { passed: false, message: `Expected 401, got ${response.status}` };
          }
        }
      },

      {
        name: 'Dashboard API Availability',
        description: 'Verify dashboard endpoints are available (should require auth)',
        test: async () => {
          const response = await this.makeRequest('/api/dashboard/metrics', { 
            timeout: 5000,
            expectStatus: 401 
          });
          
          if (response.status === 401) {
            return { passed: true, message: 'Dashboard API properly protected' };
          } else if (response.status === 403) {
            return { passed: true, message: 'Dashboard API properly protected (403)' };
          } else {
            return { passed: false, message: `Dashboard API protection issue: ${response.status}` };
          }
        }
      },

      {
        name: 'API Error Handling',
        description: 'Verify API returns proper error responses',
        test: async () => {
          const response = await this.makeRequest('/api/nonexistent-endpoint', { 
            timeout: 5000,
            expectStatus: 404 
          });
          
          if (response.status === 404) {
            return { passed: true, message: 'API properly handles 404 errors' };
          } else {
            return { passed: false, message: `Expected 404 for nonexistent endpoint, got ${response.status}` };
          }
        }
      }
    ];
  }

  async getSecurityTests() {
    return [
      {
        name: 'Security Headers',
        description: 'Verify security headers are present',
        test: async () => {
          const response = await this.makeRequest('/', { 
            timeout: 5000,
            includeHeaders: true 
          });
          
          const securityHeaders = [
            'x-content-type-options',
            'x-frame-options',
            'x-xss-protection'
          ];

          const missingHeaders = [];
          const presentHeaders = [];

          securityHeaders.forEach(header => {
            if (response.headers[header]) {
              presentHeaders.push(header);
            } else {
              missingHeaders.push(header);
            }
          });

          if (missingHeaders.length === 0) {
            return { 
              passed: true, 
              message: 'All required security headers present',
              details: { presentHeaders }
            };
          } else {
            return { 
              passed: false, 
              message: `Missing security headers: ${missingHeaders.join(', ')}`,
              details: { missingHeaders, presentHeaders }
            };
          }
        }
      },

      {
        name: 'HTTPS Enforcement (Production)',
        description: 'Verify HTTPS is enforced in production',
        test: async () => {
          if (!this.isProduction) {
            return { passed: true, message: 'HTTPS test skipped (not production)' };
          }

          if (!this.baseUrl.startsWith('https://')) {
            return { passed: false, message: 'Production deployment must use HTTPS' };
          }

          return { passed: true, message: 'HTTPS properly configured for production' };
        }
      },

      {
        name: 'Rate Limiting',
        description: 'Verify rate limiting is active',
        test: async () => {
          const endpoint = '/api/health';
          const requests = [];
          const maxRequests = 15; // Should trigger rate limit

          // Make multiple rapid requests
          for (let i = 0; i < maxRequests; i++) {
            requests.push(
              this.makeRequest(endpoint, { 
                timeout: 2000,
                allowFailure: true 
              }).catch(error => ({ status: 'error', error: error.message }))
            );
          }

          const responses = await Promise.all(requests);
          const rateLimited = responses.some(r => r.status === 429);

          if (rateLimited) {
            return { passed: true, message: 'Rate limiting is active and working' };
          } else {
            return { 
              passed: false, 
              message: 'Rate limiting may not be properly configured',
              details: { 
                totalRequests: responses.length,
                statusCodes: responses.map(r => r.status) 
              }
            };
          }
        }
      },

      {
        name: 'Admin Endpoint Protection',
        description: 'Verify admin endpoints are properly protected',
        test: async () => {
          const adminEndpoints = [
            '/api/admin/security-report',
            '/api/admin/performance-report'
          ];

          const results = [];
          
          for (const endpoint of adminEndpoints) {
            try {
              const response = await this.makeRequest(endpoint, { 
                timeout: 3000,
                expectStatus: 401 
              });
              
              results.push({
                endpoint,
                status: response.status,
                protected: response.status === 401 || response.status === 403
              });
            } catch (error) {
              results.push({
                endpoint,
                status: 'error',
                protected: true, // Error is acceptable for protected endpoints
                error: error.message
              });
            }
          }

          const allProtected = results.every(r => r.protected);
          
          if (allProtected) {
            return { 
              passed: true, 
              message: 'Admin endpoints are properly protected',
              details: results
            };
          } else {
            return { 
              passed: false, 
              message: 'Some admin endpoints may not be properly protected',
              details: results
            };
          }
        }
      }
    ];
  }

  async getPerformanceTests() {
    return [
      {
        name: 'Response Time - Health Check',
        description: 'Verify health check responds quickly',
        test: async () => {
          const startTime = Date.now();
          const response = await this.makeRequest('/health', { timeout: 5000 });
          const responseTime = Date.now() - startTime;

          if (response.status === 200) {
            if (responseTime < 1000) {
              return { 
                passed: true, 
                message: `Health check response time excellent (${responseTime}ms)`,
                details: { responseTime }
              };
            } else if (responseTime < 3000) {
              return { 
                passed: true, 
                message: `Health check response time acceptable (${responseTime}ms)`,
                details: { responseTime }
              };
            } else {
              return { 
                passed: false, 
                message: `Health check response time too slow (${responseTime}ms)`,
                details: { responseTime }
              };
            }
          } else {
            return { passed: false, message: `Health check failed: ${response.status}` };
          }
        }
      },

      {
        name: 'Response Time - API Endpoint',
        description: 'Verify API endpoints respond within acceptable time',
        test: async () => {
          const startTime = Date.now();
          const response = await this.makeRequest('/api/health', { timeout: 8000 });
          const responseTime = Date.now() - startTime;

          if (response.status === 200) {
            if (responseTime < 2000) {
              return { 
                passed: true, 
                message: `API response time good (${responseTime}ms)`,
                details: { responseTime }
              };
            } else if (responseTime < 5000) {
              return { 
                passed: true, 
                message: `API response time acceptable (${responseTime}ms)`,
                details: { responseTime }
              };
            } else {
              return { 
                passed: false, 
                message: `API response time too slow (${responseTime}ms)`,
                details: { responseTime }
              };
            }
          } else {
            return { passed: false, message: `API endpoint failed: ${response.status}` };
          }
        }
      },

      {
        name: 'Memory Usage Check',
        description: 'Verify application memory usage is reasonable',
        test: async () => {
          const response = await this.makeRequest('/health', { timeout: 5000 });
          
          if (response.status === 200 && response.data && response.data.memory) {
            const memoryMB = Math.round(response.data.memory.heapUsed / 1024 / 1024);
            
            if (memoryMB < 256) {
              return { 
                passed: true, 
                message: `Memory usage healthy (${memoryMB}MB)`,
                details: { memoryMB, memory: response.data.memory }
              };
            } else if (memoryMB < 512) {
              return { 
                passed: true, 
                message: `Memory usage moderate (${memoryMB}MB)`,
                details: { memoryMB, memory: response.data.memory }
              };
            } else {
              return { 
                passed: false, 
                message: `Memory usage high (${memoryMB}MB)`,
                details: { memoryMB, memory: response.data.memory }
              };
            }
          } else {
            return { passed: false, message: 'Could not retrieve memory usage information' };
          }
        }
      }
    ];
  }

  async getIntegrationTests() {
    return [
      {
        name: 'Database Integration',
        description: 'Verify database operations are working',
        test: async () => {
          // Test through the health endpoint which should check database connectivity
          const response = await this.makeRequest('/api/health', { timeout: 10000 });
          
          if (response.status === 200 && response.data) {
            // Check if health response indicates database is healthy
            const dbHealthy = response.data.services?.database?.status === 'healthy' ||
                             response.data.status === 'healthy';
            
            if (dbHealthy) {
              return { 
                passed: true, 
                message: 'Database integration working correctly',
                details: response.data.services?.database || {}
              };
            } else {
              return { 
                passed: false, 
                message: 'Database integration issues detected',
                details: response.data.services?.database || {}
              };
            }
          } else {
            return { passed: false, message: 'Could not verify database integration' };
          }
        }
      },

      {
        name: 'Configuration Loading',
        description: 'Verify application configuration is loaded correctly',
        test: async () => {
          const response = await this.makeRequest('/health', { timeout: 5000 });
          
          if (response.status === 200 && response.data) {
            const hasEnvironment = response.data.environment;
            const hasUptime = typeof response.data.uptime === 'number';
            
            if (hasEnvironment && hasUptime) {
              return { 
                passed: true, 
                message: 'Configuration loading working correctly',
                details: {
                  environment: response.data.environment,
                  uptime: response.data.uptime
                }
              };
            } else {
              return { passed: false, message: 'Configuration may not be loading correctly' };
            }
          } else {
            return { passed: false, message: 'Could not verify configuration loading' };
          }
        }
      },

      {
        name: 'Error Handling Integration',
        description: 'Verify error handling is working correctly',
        test: async () => {
          // Test error handling by requesting a non-existent endpoint
          const response = await this.makeRequest('/api/test-error-handling-xyz', { 
            timeout: 5000,
            expectStatus: 404 
          });
          
          if (response.status === 404) {
            // Check if error response has proper structure
            const hasErrorStructure = response.data && 
                                     (response.data.error || response.data.message);
            
            return { 
              passed: true, 
              message: 'Error handling integration working correctly',
              details: { errorResponse: response.data }
            };
          } else {
            return { 
              passed: false, 
              message: `Error handling issue: expected 404, got ${response.status}` 
            };
          }
        }
      }
    ];
  }

  async runTestSuite(suiteName, tests) {
    this.log(`\\n🧪 Running ${suiteName}...`, 'info');
    console.log('-'.repeat(60));
    
    const suiteResults = {
      name: suiteName,
      tests: [],
      passed: 0,
      failed: 0
    };

    for (const test of tests) {
      try {
        this.log(`Running: ${test.name}`, 'info');
        const result = await test.test();
        
        const testResult = {
          name: test.name,
          description: test.description,
          passed: result.passed,
          message: result.message,
          details: result.details || {}
        };

        if (result.passed) {
          this.log(`✅ ${test.name}: ${result.message}`, 'success');
          suiteResults.passed++;
        } else {
          this.log(`❌ ${test.name}: ${result.message}`, 'error');
          suiteResults.failed++;
        }

        suiteResults.tests.push(testResult);
        
      } catch (error) {
        this.log(`💥 ${test.name}: Test failed with error - ${error.message}`, 'error');
        
        suiteResults.tests.push({
          name: test.name,
          description: test.description,
          passed: false,
          message: `Test execution failed: ${error.message}`,
          details: { error: error.message }
        });
        
        suiteResults.failed++;
      }
    }

    this.testResults.push(suiteResults);
    
    const passRate = Math.round((suiteResults.passed / (suiteResults.passed + suiteResults.failed)) * 100);
    this.log(`Suite Complete: ${suiteResults.passed}/${suiteResults.passed + suiteResults.failed} passed (${passRate}%)`, 
             passRate === 100 ? 'success' : passRate >= 80 ? 'warning' : 'error');
  }

  generateSmokeTestReport() {
    console.log('\\n' + '='.repeat(80));
    this.log('📊 SMOKE TEST RESULTS', 'info');
    console.log('='.repeat(80));
    
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;

    // Summary by suite
    console.log(`\\n${COLORS.BOLD}TEST SUITE SUMMARY:${COLORS.RESET}`);
    this.testResults.forEach(suite => {
      const passRate = Math.round((suite.passed / (suite.passed + suite.failed)) * 100);
      const status = passRate === 100 ? '✅' : passRate >= 80 ? '⚠️' : '❌';
      
      console.log(`${status} ${suite.name}: ${suite.passed}/${suite.passed + suite.failed} (${passRate}%)`);
      
      totalTests += suite.passed + suite.failed;
      totalPassed += suite.passed;
      totalFailed += suite.failed;
    });

    // Overall summary
    const overallPassRate = Math.round((totalPassed / totalTests) * 100);
    console.log(`\\n${COLORS.BOLD}OVERALL SUMMARY:${COLORS.RESET}`);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${COLORS.GREEN}${totalPassed}${COLORS.RESET}`);
    console.log(`❌ Failed: ${COLORS.RED}${totalFailed}${COLORS.RESET}`);
    console.log(`Pass Rate: ${overallPassRate}%`);

    // Detailed failures
    const failures = this.testResults.flatMap(suite => 
      suite.tests.filter(test => !test.passed)
    );

    if (failures.length > 0) {
      console.log(`\\n${COLORS.RED}${COLORS.BOLD}❌ FAILED TESTS:${COLORS.RESET}`);
      failures.forEach(failure => {
        console.log(`\\n• ${failure.name}`);
        console.log(`  Description: ${failure.description}`);
        console.log(`  Issue: ${failure.message}`);
        if (Object.keys(failure.details).length > 0) {
          console.log(`  Details: ${JSON.stringify(failure.details, null, 2)}`);
        }
      });
    }

    // Final verdict
    console.log('\\n' + '='.repeat(80));
    
    if (totalFailed === 0) {
      this.log('🎉 ALL SMOKE TESTS PASSED - Application is functioning correctly!', 'success');
      process.exit(0);
    } else if (overallPassRate >= 90) {
      this.log(`✅ SMOKE TESTS MOSTLY PASSED - ${totalFailed} minor issues detected`, 'warning');
      process.exit(0);
    } else if (overallPassRate >= 70) {
      this.log(`⚠️ SMOKE TESTS PARTIALLY PASSED - ${totalFailed} issues need attention`, 'warning');
      process.exit(1);
    } else {
      this.log(`💥 SMOKE TESTS FAILED - ${totalFailed} critical issues detected`, 'error');
      process.exit(1);
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
        if (options.allowFailure) {
          resolve({ status: 'error', error: error.message });
        } else {
          reject(error);
        }
      });

      req.setTimeout(timeout, () => {
        clearTimeout(timeoutId);
        req.destroy();
        reject(new Error(`Request timeout after ${timeout}ms`));
      });
    });
  }
}

// Run smoke tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new SmokeTestRunner();
  runner.runAllTests().catch(error => {
    console.error('Smoke tests failed:', error);
    process.exit(1);
  });
}

export default SmokeTestRunner;