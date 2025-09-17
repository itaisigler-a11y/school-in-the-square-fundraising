import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { sql } from 'drizzle-orm';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Database connection configuration with optimizations
const connectionConfig = {
  connectionString: process.env.DATABASE_URL!,
  // Connection pooling configuration
  max: 20, // Maximum number of connections
  min: 5,  // Minimum number of connections to maintain
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 5000, // Connection timeout
  allowExitOnIdle: true,
};

// Enhanced database pool with connection monitoring
export class DatabasePool {
  private pool: Pool;
  private db: ReturnType<typeof drizzle>;
  private connectionStats = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    errors: 0,
    lastError: null as Error | null,
  };

  constructor() {
    this.pool = new Pool(connectionConfig);
    this.db = drizzle({ client: this.pool, schema });
    this.setupConnectionMonitoring();
  }

  private setupConnectionMonitoring() {
    // Monitor connection events
    this.pool.on('connect', () => {
      this.connectionStats.totalConnections++;
      this.connectionStats.activeConnections++;
      console.log('✅ Database connection established', {
        total: this.connectionStats.totalConnections,
        active: this.connectionStats.activeConnections
      });
    });

    this.pool.on('remove', () => {
      this.connectionStats.activeConnections--;
      console.log('🔌 Database connection removed', {
        active: this.connectionStats.activeConnections
      });
    });

    this.pool.on('error', (err) => {
      this.connectionStats.errors++;
      this.connectionStats.lastError = err;
      console.error('❌ Database connection error:', err);
    });

    // Periodic connection health check
    setInterval(() => {
      this.logConnectionHealth();
    }, 60000); // Every minute
  }

  public getDatabase() {
    return this.db;
  }

  public getPool() {
    return this.pool;
  }

  public getConnectionStats() {
    return {
      ...this.connectionStats,
      pool: {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount,
      }
    };
  }

  private logConnectionHealth() {
    const stats = this.getConnectionStats();
    console.log('📊 Database connection health:', {
      active: stats.activeConnections,
      idle: stats.idleConnections,
      total: stats.totalConnections,
      errors: stats.errors,
      pool: stats.pool
    });

    // Alert if error rate is high
    if (stats.errors > 10) {
      console.warn('⚠️ High database error rate detected:', stats.errors);
    }

    // Alert if too many idle connections
    if (stats.pool.idleCount > 15) {
      console.warn('⚠️ High number of idle connections:', stats.pool.idleCount);
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const result = await this.db.execute(sql`SELECT 1 as health`);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  public async gracefulShutdown(): Promise<void> {
    console.log('🔄 Initiating graceful database shutdown...');
    try {
      await this.pool.end();
      console.log('✅ Database connections closed gracefully');
    } catch (error) {
      console.error('❌ Error during database shutdown:', error);
    }
  }
}

// Query performance monitoring
export class QueryPerformanceMonitor {
  private static slowQueryThreshold = 1000; // 1 second
  private static queryStats = new Map<string, {
    count: number;
    totalTime: number;
    avgTime: number;
    slowQueries: number;
    lastExecution: Date;
  }>();

  public static monitorQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    return queryFn()
      .then((result) => {
        const executionTime = Date.now() - startTime;
        this.recordQueryExecution(queryName, executionTime);
        
        if (executionTime > this.slowQueryThreshold) {
          console.warn(`🐌 Slow query detected: ${queryName} took ${executionTime}ms`);
        }
        
        return result;
      })
      .catch((error) => {
        const executionTime = Date.now() - startTime;
        this.recordQueryExecution(queryName, executionTime, true);
        console.error(`❌ Query failed: ${queryName} after ${executionTime}ms`, error);
        throw error;
      });
  }

  private static recordQueryExecution(
    queryName: string, 
    executionTime: number, 
    isError = false
  ) {
    const stats = this.queryStats.get(queryName) || {
      count: 0,
      totalTime: 0,
      avgTime: 0,
      slowQueries: 0,
      lastExecution: new Date(),
    };

    stats.count++;
    stats.totalTime += executionTime;
    stats.avgTime = stats.totalTime / stats.count;
    stats.lastExecution = new Date();

    if (executionTime > this.slowQueryThreshold) {
      stats.slowQueries++;
    }

    this.queryStats.set(queryName, stats);
  }

  public static getQueryStats() {
    const stats = Array.from(this.queryStats.entries()).map(([query, data]) => ({
      query,
      ...data,
      slowQueryPercentage: (data.slowQueries / data.count) * 100,
    }));

    return stats.sort((a, b) => b.avgTime - a.avgTime);
  }

  public static logPerformanceReport() {
    const stats = this.getQueryStats();
    console.log('📈 Query Performance Report:');
    console.table(stats.slice(0, 10)); // Top 10 slowest queries
  }
}

// Database index recommendations
export const indexRecommendations = {
  // Existing indexes are good, but here are additional recommendations:
  donors: [
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS donors_name_search_idx ON donors USING gin(to_tsvector(\'english\', first_name || \' \' || last_name))',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS donors_lifetime_value_idx ON donors (lifetime_value DESC)',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS donors_last_donation_idx ON donors (last_donation_date DESC)',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS donors_active_email_idx ON donors (is_active, email) WHERE email IS NOT NULL',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS donors_composite_search_idx ON donors (donor_type, engagement_level, gift_size_tier)',
  ],
  donations: [
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS donations_date_amount_idx ON donations (date DESC, amount DESC)',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS donations_donor_date_idx ON donations (donor_id, date DESC)',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS donations_campaign_date_idx ON donations (campaign_id, date DESC) WHERE campaign_id IS NOT NULL',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS donations_recurring_idx ON donations (is_recurring, recurring_frequency) WHERE is_recurring = true',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS donations_status_method_idx ON donations (status, payment_method)',
  ],
  campaigns: [
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS campaigns_date_range_idx ON campaigns (start_date, end_date)',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS campaigns_status_type_idx ON campaigns (status, campaign_type)',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS campaigns_goal_raised_idx ON campaigns (goal, raised)',
  ],
  communications: [
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS communications_recipient_idx ON communications (recipient_type, recipient_id)',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS communications_scheduled_idx ON communications (scheduled_at) WHERE scheduled_at IS NOT NULL',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS communications_status_type_idx ON communications (status, type)',
  ],
  audit_logs: [
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS audit_logs_user_action_idx ON audit_logs (user_id, action)',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS audit_logs_entity_idx ON audit_logs (entity_type, entity_id)',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS audit_logs_timestamp_idx ON audit_logs (timestamp DESC)',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS audit_logs_ip_idx ON audit_logs (ip_address) WHERE ip_address IS NOT NULL',
  ]
};

// Query optimization helpers
export class QueryOptimizer {
  public static async analyzeQuery(db: any, query: string): Promise<any> {
    try {
      const explainResult = await db.execute(sql`EXPLAIN ANALYZE ${sql.raw(query)}`);
      return explainResult.rows;
    } catch (error) {
      console.error('Query analysis failed:', error);
      return null;
    }
  }

  public static async getSlowQueries(db: any, limit = 10): Promise<any[]> {
    try {
      // This would require pg_stat_statements extension in production
      const result = await db.execute(sql`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          stddev_time,
          rows
        FROM pg_stat_statements 
        ORDER BY mean_time DESC 
        LIMIT ${limit}
      `);
      return result.rows;
    } catch (error) {
      console.warn('pg_stat_statements not available:', error.message);
      return [];
    }
  }

  public static async getTableSizes(db: any): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public'
        ORDER BY tablename, attname
      `);
      return result.rows;
    } catch (error) {
      console.error('Failed to get table statistics:', error);
      return [];
    }
  }
}

// Create and export the database instance
export const databasePool = new DatabasePool();
export const db = databasePool.getDatabase();
export const pool = databasePool.getPool();

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await databasePool.gracefulShutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await databasePool.gracefulShutdown();
  process.exit(0);
});

// Periodic performance reporting
setInterval(() => {
  QueryPerformanceMonitor.logPerformanceReport();
}, 300000); // Every 5 minutes