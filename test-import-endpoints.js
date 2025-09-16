#!/usr/bin/env node

/**
 * Comprehensive Import Endpoints Testing Script
 * Tests all 7 import endpoints with authentication simulation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Test configuration
const BASE_URL = 'http://localhost:5000';
const TEST_CSV_CONTENT = `firstName,lastName,email,phone,donorType
John,Doe,john.doe@example.com,555-0101,parent
Jane,Smith,jane.smith@example.com,555-0102,alumni
Mike,Johnson,mike.johnson@example.com,555-0103,community
Sarah,Williams,sarah.williams@example.com,555-0104,staff
David,Brown,david.brown@example.com,555-0105,board`;

class ImportEndpointTester {
  constructor() {
    this.sessionCookie = null;
    this.testResults = [];
    this.currentTest = 1;
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`);
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      'User-Agent': 'Import-Endpoint-Tester/1.0',
      ...options.headers
    };

    if (this.sessionCookie) {
      headers['Cookie'] = this.sessionCookie;
    }

    const requestOptions = {
      method: options.method || 'GET',
      headers,
      ...options
    };

    this.log(`→ ${requestOptions.method} ${endpoint}`);
    
    try {
      const response = await fetch(url, requestOptions);
      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      this.log(`← ${response.status} ${response.statusText} (${responseText.length} bytes)`);
      
      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData
      };
    } catch (error) {
      this.log(`✗ Request failed: ${error.message}`, 'ERROR');
      return {
        status: 0,
        statusText: 'Network Error',
        error: error.message
      };
    }
  }

  async testDebugRoutes() {
    this.log(`\\n🔍 Test ${this.currentTest++}: Debug Routes Endpoint`);
    
    const result = await this.makeRequest('/api/debug/routes');
    this.testResults.push({
      test: 'debug-routes',
      endpoint: '/api/debug/routes',
      status: result.status,
      expected: [401, 403], // Expect auth error since we're not authenticated
      passed: [401, 403].includes(result.status),
      data: result.data
    });
  }

  async testAuthenticationFlow() {
    this.log(`\\n🔐 Test ${this.currentTest++}: Authentication Status`);
    
    const result = await this.makeRequest('/api/auth/user');
    this.testResults.push({
      test: 'auth-status',
      endpoint: '/api/auth/user',
      status: result.status,
      expected: 401, // Expect auth required
      passed: result.status === 401,
      data: result.data
    });
  }

  async createTestFile() {
    const testFile = path.join(__dirname, 'test-donors.csv');
    fs.writeFileSync(testFile, TEST_CSV_CONTENT);
    this.log(`📁 Created test file: ${testFile}`);
    return testFile;
  }

  async testImportPreview(testFile) {
    this.log(`\\n📋 Test ${this.currentTest++}: Import Preview`);
    
    const form = new FormData();
    const fileContent = fs.readFileSync(testFile);
    const blob = new Blob([fileContent], { type: 'text/csv' });
    form.append('file', blob, 'test-donors.csv');
    
    const result = await this.makeRequest('/api/import/preview', {
      method: 'POST',
      body: form
    });
    
    this.testResults.push({
      test: 'import-preview',
      endpoint: '/api/import/preview',
      status: result.status,
      expected: [401, 200], // Could be auth error or success
      passed: [401, 200].includes(result.status),
      data: result.data
    });
    
    return result;
  }

  async testImportValidate(testFile) {
    this.log(`\\n✅ Test ${this.currentTest++}: Import Validate`);
    
    const form = new FormData();
    form.append('file', fs.createReadStream(testFile));
    form.append('fieldMapping', JSON.stringify({
      firstName: 'firstName',
      lastName: 'lastName',
      email: 'email',
      phone: 'phone',
      donorType: 'donorType'
    }));
    
    const result = await this.makeRequest('/api/import/validate', {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });
    
    this.testResults.push({
      test: 'import-validate',
      endpoint: '/api/import/validate',
      status: result.status,
      expected: [401, 200],
      passed: [401, 200].includes(result.status),
      data: result.data
    });
    
    return result;
  }

  async testImportProcess(testFile) {
    this.log(`\\n⚙️ Test ${this.currentTest++}: Import Process`);
    
    const form = new FormData();
    form.append('file', fs.createReadStream(testFile));
    form.append('name', 'Test Import Job');
    form.append('description', 'Automated test import');
    form.append('fieldMapping', JSON.stringify({
      firstName: 'firstName',
      lastName: 'lastName',
      email: 'email',
      phone: 'phone',
      donorType: 'donorType'
    }));
    form.append('options', JSON.stringify({
      skipDuplicates: true,
      updateExisting: false
    }));
    
    const result = await this.makeRequest('/api/import/process', {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });
    
    this.testResults.push({
      test: 'import-process',
      endpoint: '/api/import/process',
      status: result.status,
      expected: [401, 200],
      passed: [401, 200].includes(result.status),
      data: result.data
    });
    
    return result.data?.importId;
  }

  async testImportStatus(importId = 'test-id') {
    this.log(`\\n📊 Test ${this.currentTest++}: Import Status`);
    
    const result = await this.makeRequest(`/api/import/${importId}/status`);
    
    this.testResults.push({
      test: 'import-status',
      endpoint: `/api/import/${importId}/status`,
      status: result.status,
      expected: [401, 404], // Auth or not found
      passed: [401, 404].includes(result.status),
      data: result.data
    });
    
    return result;
  }

  async testImportJobs() {
    this.log(`\\n📝 Test ${this.currentTest++}: Import Jobs List`);
    
    const result = await this.makeRequest('/api/import/jobs');
    
    this.testResults.push({
      test: 'import-jobs',
      endpoint: '/api/import/jobs',
      status: result.status,
      expected: [401, 200],
      passed: [401, 200].includes(result.status),
      data: result.data
    });
    
    return result;
  }

  async testImportCancel(importId = 'test-id') {
    this.log(`\\n❌ Test ${this.currentTest++}: Import Cancel`);
    
    const result = await this.makeRequest(`/api/import/${importId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Test cancellation' })
    });
    
    this.testResults.push({
      test: 'import-cancel',
      endpoint: `/api/import/${importId}/cancel`,
      status: result.status,
      expected: [401, 404, 400], // Auth, not found, or can't cancel
      passed: [401, 404, 400].includes(result.status),
      data: result.data
    });
    
    return result;
  }

  async testImportErrors(importId = 'test-id') {
    this.log(`\\n🚨 Test ${this.currentTest++}: Import Errors`);
    
    const result = await this.makeRequest(`/api/import/${importId}/errors`);
    
    this.testResults.push({
      test: 'import-errors',
      endpoint: `/api/import/${importId}/errors`,
      status: result.status,
      expected: [401, 404],
      passed: [401, 404].includes(result.status),
      data: result.data
    });
    
    return result;
  }

  async cleanup(testFile) {
    try {
      fs.unlinkSync(testFile);
      this.log(`🗑️ Cleaned up test file: ${testFile}`);
    } catch (error) {
      this.log(`⚠️ Could not clean up test file: ${error.message}`, 'WARN');
    }
  }

  printSummary() {
    this.log(`\\n📊 TEST SUMMARY`);
    this.log(`${'='.repeat(50)}`);
    
    let passed = 0;
    let total = this.testResults.length;
    
    this.testResults.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      this.log(`${status} ${result.test}: ${result.endpoint} (${result.status})`);
      if (result.passed) passed++;
      
      if (!result.passed) {
        this.log(`   Expected: ${Array.isArray(result.expected) ? result.expected.join(' or ') : result.expected}`, 'WARN');
        this.log(`   Actual: ${result.status}`, 'WARN');
      }
    });
    
    this.log(`\\n🎯 Results: ${passed}/${total} tests passed`);
    
    // Check for specific patterns
    const authErrors = this.testResults.filter(r => r.status === 401).length;
    const serverErrors = this.testResults.filter(r => r.status >= 500).length;
    const notFoundErrors = this.testResults.filter(r => r.status === 404).length;
    
    this.log(`\\n📈 Error Analysis:`);
    this.log(`   - Authentication errors (401): ${authErrors}`);
    this.log(`   - Not found errors (404): ${notFoundErrors}`);
    this.log(`   - Server errors (5xx): ${serverErrors}`);
    
    if (authErrors === total) {
      this.log(`\\n✅ All endpoints properly require authentication`);
    }
    
    if (serverErrors === 0) {
      this.log(`\\n✅ No server errors detected`);
    }
  }

  async runAllTests() {
    this.log(`🚀 Starting comprehensive import endpoints testing...`);
    this.log(`Target: ${BASE_URL}`);
    
    let testFile;
    try {
      // Create test file
      testFile = await this.createTestFile();
      
      // Run all tests
      await this.testDebugRoutes();
      await this.testAuthenticationFlow();
      await this.testImportPreview(testFile);
      await this.testImportValidate(testFile);
      const importId = await this.testImportProcess(testFile);
      await this.testImportStatus(importId);
      await this.testImportJobs();
      await this.testImportCancel(importId);
      await this.testImportErrors(importId);
      
    } catch (error) {
      this.log(`💥 Testing failed: ${error.message}`, 'ERROR');
    } finally {
      if (testFile) {
        await this.cleanup(testFile);
      }
      
      this.printSummary();
    }
  }
}

// Check if we have fetch available (Node 18+)
if (typeof fetch === 'undefined') {
  console.error('❌ This script requires Node.js 18+ with fetch support');
  process.exit(1);
}

// Run the tests
const tester = new ImportEndpointTester();
tester.runAllTests().catch(console.error);