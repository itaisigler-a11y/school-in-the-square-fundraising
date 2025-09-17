#!/usr/bin/env node

/**
 * Production Validation Script
 * Validates that all production requirements are met before deployment
 */

import { validateProductionConfig } from '../server/production-config.js';
import { spawn } from 'child_process';

console.log('🔍 Starting production validation...\n');

const validationChecks = [
  {
    name: 'Production Configuration',
    check: async () => {
      try {
        validateProductionConfig();
        return { success: true, message: 'All required environment variables are set' };
      } catch (error) {
        return { success: false, message: error.message };
      }
    }
  },
  {
    name: 'TypeScript Compilation',
    check: async () => {
      return new Promise((resolve) => {
        const tsc = spawn('npx', ['tsc', '--noEmit'], { stdio: 'pipe' });
        let output = '';
        let errorOutput = '';
        
        tsc.stdout.on('data', (data) => output += data.toString());
        tsc.stderr.on('data', (data) => errorOutput += data.toString());
        
        tsc.on('close', (code) => {
          if (code === 0) {
            resolve({ success: true, message: 'TypeScript compilation successful' });
          } else {
            resolve({ success: false, message: `TypeScript errors:\n${errorOutput}` });
          }
        });
      });
    }
  },
  {
    name: 'Critical Dependencies',
    check: async () => {
      const criticalDeps = [
        'express', 'drizzle-orm', '@neondatabase/serverless',
        'helmet', 'cors', 'express-rate-limit'
      ];
      
      try {
        for (const dep of criticalDeps) {
          await import(dep);
        }
        return { success: true, message: `All ${criticalDeps.length} critical dependencies available` };
      } catch (error) {
        return { success: false, message: `Missing critical dependency: ${error.message}` };
      }
    }
  }
];

// Run all validation checks
async function runValidation() {
  let allPassed = true;
  
  for (const check of validationChecks) {
    process.stdout.write(`📋 ${check.name}... `);
    
    try {
      const result = await check.check();
      if (result.success) {
        console.log(`✅ PASSED`);
        console.log(`   ${result.message}\n`);
      } else {
        console.log(`❌ FAILED`);
        console.log(`   ${result.message}\n`);
        allPassed = false;
      }
    } catch (error) {
      console.log(`❌ ERROR`);
      console.log(`   ${error.message}\n`);
      allPassed = false;
    }
  }
  
  if (allPassed) {
    console.log('✅ All production validation checks passed!');
    console.log('🚀 Application is ready for production deployment\n');
    process.exit(0);
  } else {
    console.log('❌ Production validation failed!');
    console.log('🛑 Application is NOT ready for production deployment\n');
    process.exit(1);
  }
}

runValidation().catch(error => {
  console.error('💥 Validation script error:', error);
  process.exit(1);
});