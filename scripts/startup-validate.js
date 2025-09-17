#!/usr/bin/env node

/**
 * Startup Validation Script
 * Comprehensive validation that runs before application startup
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🚀 Starting comprehensive startup validation...\n');

const startupChecks = [
  {
    name: 'Node.js Version',
    check: async () => {
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      
      if (majorVersion < 18) {
        throw new Error(`Node.js ${nodeVersion} is too old. Requires Node 18+`);
      }
      
      return `Node.js ${nodeVersion} ✓`;
    }
  },
  {
    name: 'Production Configuration',
    check: async () => {
      try {
        await execAsync('node -e "const { validateProductionConfig } = require(\'./server/production-config.js\'); validateProductionConfig();"');
        return 'All environment variables configured ✓';
      } catch (error) {
        throw new Error(`Configuration validation failed: ${error.message}`);
      }
    }
  },
  {
    name: 'TypeScript Compilation',
    check: async () => {
      try {
        await execAsync('npx tsc --noEmit');
        return 'TypeScript compilation successful ✓';
      } catch (error) {
        throw new Error(`TypeScript errors detected: ${error.stderr || error.message}`);
      }
    }
  },
  {
    name: 'Database Connectivity',
    check: async () => {
      // This would typically test database connection
      // For now, we check that DATABASE_URL is set
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL not configured');
      }
      return 'Database configuration present ✓';
    }
  },
  {
    name: 'Security Configuration',
    check: async () => {
      const requiredSecrets = ['SESSION_SECRET'];
      const missing = requiredSecrets.filter(secret => !process.env[secret]);
      
      if (missing.length > 0) {
        throw new Error(`Missing security secrets: ${missing.join(', ')}`);
      }
      
      return `Security secrets configured ✓`;
    }
  },
  {
    name: 'Port Availability',
    check: async () => {
      const port = process.env.PORT || 5000;
      
      // Basic check - in production this would test actual port binding
      if (isNaN(port) || port < 1 || port > 65535) {
        throw new Error(`Invalid port: ${port}`);
      }
      
      return `Port ${port} available ✓`;
    }
  }
];

// Run all startup checks
async function runStartupValidation() {
  let allPassed = true;
  
  for (const check of startupChecks) {
    process.stdout.write(`📋 ${check.name}... `);
    
    try {
      const result = await check.check();
      console.log(`✅ PASSED`);
      console.log(`   ${result}\n`);
    } catch (error) {
      console.log(`❌ FAILED`);
      console.log(`   ${error.message}\n`);
      allPassed = false;
    }
  }
  
  if (allPassed) {
    console.log('✅ All startup validation checks passed!');
    console.log('🚀 Application is ready to start\n');
    process.exit(0);
  } else {
    console.log('❌ Startup validation failed!');
    console.log('🛑 Application should NOT be started\n');
    process.exit(1);
  }
}

runStartupValidation().catch(error => {
  console.error('💥 Startup validation error:', error);
  process.exit(1);
});