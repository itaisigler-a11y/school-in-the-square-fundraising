import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';

// In-memory cache with TTL support
class MemoryCache {
  private cache = new Map<string, { data: any; expires: number }>();
  private defaultTTL = 300000; // 5 minutes default

  set(key: string, data: any, ttl?: number): void {
    const expires = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data, expires });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [, item] of this.cache.entries()) {
      if (now > item.expires) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      memoryUsage: JSON.stringify([...this.cache.entries()]).length,
    };
  }
}

// Global cache instance
export const cache = new MemoryCache();

// Periodic cleanup
setInterval(() => {
  cache.cleanup();
}, 60000); // Every minute

// Cache configuration for different types of data
export const cacheConfig = {
  dashboard: {
    metrics: { ttl: 300000 }, // 5 minutes
    donationTrends: { ttl: 600000 }, // 10 minutes
    recentDonors: { ttl: 60000 }, // 1 minute
    donorSegments: { ttl: 300000 }, // 5 minutes
  },
  donors: {
    list: { ttl: 180000 }, // 3 minutes
    details: { ttl: 300000 }, // 5 minutes
    search: { ttl: 120000 }, // 2 minutes
  },
  campaigns: {
    list: { ttl: 300000 }, // 5 minutes
    details: { ttl: 180000 }, // 3 minutes
    analytics: { ttl: 600000 }, // 10 minutes
  },
  static: {
    userPermissions: { ttl: 900000 }, // 15 minutes
    segmentDefinitions: { ttl: 600000 }, // 10 minutes
    templates: { ttl: 1800000 }, // 30 minutes
  },
  ai: {
    donorInsights: { ttl: 3600000 }, // 1 hour
    campaignSuggestions: { ttl: 1800000 }, // 30 minutes
  }
};

// Cache key generators
export const cacheKeys = {
  dashboardMetrics: () => 'dashboard:metrics',
  donationTrends: (months: number) => `dashboard:trends:${months}`,
  recentDonors: (limit: number) => `dashboard:recent-donors:${limit}`,
  donorSegments: () => 'dashboard:donor-segments',
  
  donorList: (params: any) => {
    const hash = createHash('md5').update(JSON.stringify(params)).digest('hex');
    return `donors:list:${hash}`;
  },
  donorDetails: (id: string) => `donors:details:${id}`,
  donorSearch: (query: string, filters: any) => {
    const hash = createHash('md5').update(JSON.stringify({ query, filters })).digest('hex');
    return `donors:search:${hash}`;
  },
  
  campaignList: (params: any) => {
    const hash = createHash('md5').update(JSON.stringify(params)).digest('hex');
    return `campaigns:list:${hash}`;
  },
  campaignDetails: (id: string) => `campaigns:details:${id}`,
  campaignAnalytics: (id: string) => `campaigns:analytics:${id}`,
  
  userPermissions: (userId: string) => `user:permissions:${userId}`,
  segmentDefinitions: () => 'segments:definitions',
  templates: (type?: string) => type ? `templates:${type}` : 'templates:all',
  
  aiDonorInsights: (donorId: string) => `ai:donor-insights:${donorId}`,
  aiCampaignSuggestions: (campaignId: string) => `ai:campaign-suggestions:${campaignId}`,
};

// Cache middleware factory
export function cacheMiddleware(
  keyGenerator: (req: Request) => string,
  ttl?: number,
  condition?: (req: Request) => boolean
) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip caching if condition is not met
    if (condition && !condition(req)) {
      return next();
    }

    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = keyGenerator(req);
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      console.log(`🚀 Cache hit: ${cacheKey}`);
      res.set('X-Cache', 'HIT');
      res.set('X-Cache-Key', cacheKey);
      return res.json(cachedData);
    }

    // Intercept response
    const originalJson = res.json;
    res.json = function(data: any) {
      // Only cache successful responses
      if (res.statusCode === 200) {
        cache.set(cacheKey, data, ttl);
        console.log(`💾 Cache miss, storing: ${cacheKey}`);
        res.set('X-Cache', 'MISS');
        res.set('X-Cache-Key', cacheKey);
      }
      return originalJson.call(this, data);
    };

    next();
  };
}

// Cache invalidation helpers
export const cacheInvalidation = {
  // Invalidate all cache entries matching a pattern
  invalidatePattern(pattern: string): number {
    let invalidated = 0;
    const regex = new RegExp(pattern);
    
    for (const [key] of cache['cache'].entries()) {
      if (regex.test(key)) {
        cache.delete(key);
        invalidated++;
      }
    }
    
    console.log(`🗑️ Invalidated ${invalidated} cache entries matching: ${pattern}`);
    return invalidated;
  },

  // Invalidate donor-related caches
  invalidateDonor(donorId?: string): void {
    if (donorId) {
      cache.delete(cacheKeys.donorDetails(donorId));
      cache.delete(cacheKeys.aiDonorInsights(donorId));
    }
    
    // Invalidate lists and search results
    this.invalidatePattern('^donors:(list|search):');
    this.invalidatePattern('^dashboard:');
  },

  // Invalidate campaign-related caches
  invalidateCampaign(campaignId?: string): void {
    if (campaignId) {
      cache.delete(cacheKeys.campaignDetails(campaignId));
      cache.delete(cacheKeys.campaignAnalytics(campaignId));
      cache.delete(cacheKeys.aiCampaignSuggestions(campaignId));
    }
    
    this.invalidatePattern('^campaigns:(list|search):');
    this.invalidatePattern('^dashboard:');
  },

  // Invalidate donation-related caches
  invalidateDonation(): void {
    this.invalidatePattern('^dashboard:');
    this.invalidatePattern('^campaigns:analytics:');
    this.invalidatePattern('^donors:(list|search):');
  },

  // Invalidate communication-related caches
  invalidateCommunication(): void {
    this.invalidatePattern('^dashboard:');
  },

  // Invalidate user-related caches
  invalidateUser(userId?: string): void {
    if (userId) {
      cache.delete(cacheKeys.userPermissions(userId));
    }
  },

  // Clear all caches
  clearAll(): void {
    cache.clear();
    console.log('🧹 All caches cleared');
  }
};

// Cache warming strategies
export const cacheWarming = {
  // Warm dashboard caches
  async warmDashboard(storage: any): Promise<void> {
    try {
      console.log('🔥 Warming dashboard caches...');
      
      const metrics = await storage.getDashboardMetrics();
      cache.set(cacheKeys.dashboardMetrics(), metrics, cacheConfig.dashboard.metrics.ttl);
      
      const trends = await storage.getDonationTrends(6);
      cache.set(cacheKeys.donationTrends(6), trends, cacheConfig.dashboard.donationTrends.ttl);
      
      const recentDonors = await storage.getRecentDonors(5);
      cache.set(cacheKeys.recentDonors(5), recentDonors, cacheConfig.dashboard.recentDonors.ttl);
      
      const segments = await storage.getDonorSegmentStats();
      cache.set(cacheKeys.donorSegments(), segments, cacheConfig.dashboard.donorSegments.ttl);
      
      console.log('✅ Dashboard caches warmed');
    } catch (error) {
      console.error('❌ Failed to warm dashboard caches:', error);
    }
  },

  // Warm static data caches
  async warmStaticData(storage: any): Promise<void> {
    try {
      console.log('🔥 Warming static data caches...');
      
      const segmentDefinitions = await storage.getSegmentDefinitions({});
      cache.set(cacheKeys.segmentDefinitions(), segmentDefinitions, cacheConfig.static.segmentDefinitions.ttl);
      
      console.log('✅ Static data caches warmed');
    } catch (error) {
      console.error('❌ Failed to warm static data caches:', error);
    }
  }
};

// Response compression based on content
export function shouldCompress(req: Request, res: Response): boolean {
  // Don't compress small responses
  const contentLength = res.get('Content-Length');
  if (contentLength && parseInt(contentLength) < 1024) {
    return false;
  }

  // Don't compress already compressed content
  const contentEncoding = res.get('Content-Encoding');
  if (contentEncoding) {
    return false;
  }

  // Compress JSON and text responses
  const contentType = res.get('Content-Type') || '';
  return contentType.includes('application/json') || 
         contentType.includes('text/') ||
         contentType.includes('application/javascript');
}

// ETags for conditional requests
export function generateETag(data: any): string {
  return createHash('md5').update(JSON.stringify(data)).digest('hex');
}

export function etagMiddleware(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json;
  
  res.json = function(data: any) {
    if (res.statusCode === 200) {
      const etag = generateETag(data);
      res.set('ETag', `"${etag}"`);
      
      // Check if client has current version
      const clientETag = req.get('If-None-Match');
      if (clientETag === `"${etag}"`) {
        return res.status(304).end();
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}

// Cache monitoring and metrics
export function getCacheMetrics() {
  const stats = cache.getStats();
  return {
    ...stats,
    hitRate: stats.validEntries / (stats.validEntries + stats.expiredEntries) * 100 || 0,
    memoryUsageMB: stats.memoryUsage / (1024 * 1024),
  };
}

// Cache health check
export function cacheHealthCheck(): { healthy: boolean; details: any } {
  try {
    const testKey = 'health-check';
    const testData = { timestamp: Date.now() };
    
    cache.set(testKey, testData, 1000);
    const retrieved = cache.get(testKey);
    cache.delete(testKey);
    
    const healthy = retrieved && retrieved.timestamp === testData.timestamp;
    
    return {
      healthy,
      details: {
        canWrite: true,
        canRead: !!retrieved,
        canDelete: true,
        stats: getCacheMetrics(),
      }
    };
  } catch (error) {
    return {
      healthy: false,
      details: { error: error.message }
    };
  }
}

// Cache debugging utilities
export const cacheDebug = {
  listKeys(): string[] {
    return Array.from(cache['cache'].keys());
  },
  
  inspectKey(key: string): any {
    const item = cache['cache'].get(key);
    if (!item) return null;
    
    return {
      key,
      data: item.data,
      expires: new Date(item.expires),
      timeToExpire: item.expires - Date.now(),
      size: JSON.stringify(item.data).length,
    };
  },
  
  getKeysByPattern(pattern: string): string[] {
    const regex = new RegExp(pattern);
    return this.listKeys().filter(key => regex.test(key));
  }
};