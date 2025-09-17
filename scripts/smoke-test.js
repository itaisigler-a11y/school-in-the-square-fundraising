#!/usr/bin/env node

/**
 * Smoke Test Script
 * Basic connectivity and functionality tests for production deployment
 */

const BASE_URL = process.env.SMOKE_TEST_URL || 'http://localhost:5000';

console.log(`🔥 Starting smoke tests against: ${BASE_URL}\n`);

const smokeTests = [
  {
    name: 'Application Health Check',
    test: async () => {
      const response = await fetch(`${BASE_URL}/healthz`);
      const data = await response.json();
      
      if (response.status !== 200) {
        throw new Error(`Health check returned ${response.status}`);
      }
      
      if (data.status !== 'healthy') {
        throw new Error(`Application status: ${data.status} (unhealthy services: ${data.summary?.unhealthy || 'unknown'})`);
      }
      
      return `Status: ${data.status}, Services: ${data.summary.healthy}/${data.summary.total} healthy`;
    }
  },
  {
    name: 'Readiness Check',
    test: async () => {
      const response = await fetch(`${BASE_URL}/readyz`);
      const data = await response.json();
      
      if (response.status !== 200 || !data.ready) {
        throw new Error(`Service not ready: ${data.message || 'Unknown error'}`);
      }
      
      return `Service ready: ${data.message}`;
    }
  },
  {
    name: 'Liveness Check',
    test: async () => {
      const response = await fetch(`${BASE_URL}/livez`);
      const data = await response.json();
      
      if (response.status !== 200 || !data.alive) {
        throw new Error(`Service not alive`);
      }
      
      return `Service alive, uptime: ${Math.round(data.uptime)}s`;
    }
  },
  {
    name: 'Frontend Assets',
    test: async () => {
      const response = await fetch(`${BASE_URL}/`);
      
      if (response.status !== 200) {
        throw new Error(`Frontend returned ${response.status}`);
      }
      
      const html = await response.text();
      if (!html.includes('<title>') || html.length < 100) {
        throw new Error('Frontend appears to be broken or empty');
      }
      
      return `Frontend loads correctly (${html.length} chars)`;
    }
  },
  {
    name: 'API Responsiveness',
    test: async () => {
      const start = Date.now();
      const response = await fetch(`${BASE_URL}/api/auth/user`);
      const duration = Date.now() - start;
      
      // We expect 401 for unauthenticated requests, that's normal
      if (response.status !== 401) {
        throw new Error(`Unexpected auth response: ${response.status}`);
      }
      
      if (duration > 5000) {
        throw new Error(`API too slow: ${duration}ms`);
      }
      
      return `API responsive (${duration}ms)`;
    }
  }
];

// Run all smoke tests
async function runSmokeTests() {
  let allPassed = true;
  
  // Import fetch dynamically for Node.js compatibility
  if (typeof fetch === 'undefined') {
    global.fetch = (await import('node-fetch')).default;
  }
  
  for (const test of smokeTests) {
    process.stdout.write(`🔥 ${test.name}... `);
    
    try {
      const result = await test.test();
      console.log(`✅ PASSED`);
      console.log(`   ${result}\n`);
    } catch (error) {
      console.log(`❌ FAILED`);
      console.log(`   ${error.message}\n`);
      allPassed = false;
    }
  }
  
  if (allPassed) {
    console.log('✅ All smoke tests passed!');
    console.log('🚀 Application is responding correctly\n');
    process.exit(0);
  } else {
    console.log('❌ Smoke tests failed!');
    console.log('🛑 Application has connectivity or functionality issues\n');
    process.exit(1);
  }
}

runSmokeTests().catch(error => {
  console.error('💥 Smoke test error:', error);
  process.exit(1);
});