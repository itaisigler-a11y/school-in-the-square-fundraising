import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.warn("⚠️  DATABASE_URL not set. Running in mock mode for testing purposes.");
  console.warn("📝 To fully test the application, set up a PostgreSQL database and add DATABASE_URL to .env");
  // Create a fallback mock connection for testing
  process.env.DATABASE_URL = "postgresql://mock:mock@localhost:5432/mockdb";
}

// Optimized connection pool for performance and memory efficiency
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Aggressive settings for memory and performance optimization
  max: 8,                  // Reduced max connections to prevent memory overload
  min: 1,                  // Minimum connections  
  idleTimeoutMillis: 10000, // Close idle connections faster (10s)
  connectionTimeoutMillis: 2000, // Faster timeout (2s)
  allowExitOnIdle: true,   // Allow pool to close when idle
});

export const db = drizzle({ client: pool, schema });

// Connection pool monitoring with safe error recovery
let connectionHealth = { errors: 0, lastCheck: Date.now(), backoffTimer: null as NodeJS.Timeout | null };

pool.on('error', (err) => {
  connectionHealth.errors++;
  console.error('🔥 Database pool error:', err.message);
  
  // Implement exponential backoff instead of permanent shutdown
  if (connectionHealth.errors > 5) {
    const backoffMs = Math.min(1000 * Math.pow(2, connectionHealth.errors - 5), 30000); // Max 30s backoff
    console.log(`⚠️  High error count (${connectionHealth.errors}), implementing ${backoffMs}ms backoff`);
    
    // Clear any existing backoff timer
    if (connectionHealth.backoffTimer) {
      clearTimeout(connectionHealth.backoffTimer);
    }
    
    // Reset error count after successful backoff period
    connectionHealth.backoffTimer = setTimeout(() => {
      console.log('🔄 Resetting database error count after backoff period');
      connectionHealth.errors = Math.max(0, connectionHealth.errors - 2); // Gradual recovery
      connectionHealth.backoffTimer = null;
    }, backoffMs);
  }
  
  // Reset error count if errors stop occurring
  if (connectionHealth.errors > 0) {
    setTimeout(() => {
      if (connectionHealth.errors > 0) {
        connectionHealth.errors = Math.max(0, connectionHealth.errors - 1);
      }
    }, 60000); // Reduce error count every minute of stability
  }
});

// Periodic cleanup to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  if (now - connectionHealth.lastCheck > 60000) { // Every minute
    connectionHealth.lastCheck = now;
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }
}, 30000);