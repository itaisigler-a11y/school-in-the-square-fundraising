import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { 
  setupSecurityMiddleware, 
  applyRouteSpecificSecurity,
  securityErrorHandler,
  requestSizeLimits
} from "./security-middleware";
import { 
  securityMonitoringMiddleware,
  createMonitoringEndpoints 
} from "./monitoring-setup";
import { cache, cacheWarming } from "./caching-strategy";
import { storage } from "./storage";
import { validateProductionConfig, productionConfig } from "./production-config";
import { productionLogger, createRequestLogger, logInfo, logError, logWarn } from "./production-logging";
import { alertManager } from "./production-alerts";

const app = express();

// EMERGENCY: Add compression first for memory optimization
app.use(compression({
  threshold: 1024, // Only compress responses > 1KB
  level: 6, // Moderate compression for balance of speed/size
  filter: (req, res) => {
    // Don't compress if no-transform cache control header is set
    if (req.headers['cache-control'] && req.headers['cache-control'].includes('no-transform')) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// EMERGENCY: Request throttling for suspicious activity (87 requests from 6 IPs)
const emergencyRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Very restrictive due to suspicious activity
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip for authenticated users and health checks
    return req.user || req.path.includes('/health') || req.path.includes('/monitoring');
  }
});

app.use('/api', emergencyRateLimit);

// Setup comprehensive security middleware first
setupSecurityMiddleware(app);

// Add security monitoring
app.use(securityMonitoringMiddleware);

// Body parsing with size limits
app.use(express.json(requestSizeLimits.json));
app.use(express.urlencoded(requestSizeLimits.urlencoded));

// Production request logging middleware with structured logging
app.use(createRequestLogger());

(async () => {
  // Initialize production systems
  logInfo('Production logger initialized', { 
    environment: process.env.NODE_ENV,
    logLevel: process.env.LOG_LEVEL || 'info'
  });
  
  // Initialize alert manager
  logInfo('Alert manager initialized', {
    alertRules: alertManager.getAlertRules().length,
    environment: process.env.NODE_ENV
  });
  
  // Validate production configuration before starting
  logInfo('Validating production configuration...', { stage: 'startup' });
  validateProductionConfig();
  
  const server = await registerRoutes(app);

  // Apply route-specific security after routes are registered
  applyRouteSpecificSecurity(app);

  // Setup monitoring endpoints
  createMonitoringEndpoints(app);

  // Warm caches on startup
  setTimeout(async () => {
    try {
      await productionLogger.measurePerformance('cache-warming-dashboard', 
        () => cacheWarming.warmDashboard(storage));
      await productionLogger.measurePerformance('cache-warming-static', 
        () => cacheWarming.warmStaticData(storage));
      logInfo('Initial cache warming completed', { 
        stage: 'startup',
        caches: ['dashboard', 'static-data']
      });
    } catch (error) {
      logError('Cache warming failed during startup', { 
        stage: 'startup',
        operation: 'cache-warming'
      }, error);
    }
  }, 5000); // Wait 5 seconds after startup

  // EMERGENCY: Global error handler with memory cleanup
  app.use((error: any, req: Request, res: Response, next: NextFunction) => {
    // Force garbage collection on critical errors
    if (global.gc && (error.code === 'ENOMEM' || error.message?.includes('memory'))) {
      console.log('🚨 Emergency GC triggered by memory error');
      global.gc();
    }
    
    // Log error with context
    console.error('🔥 Server error:', {
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    // Use security-aware error handler
    securityErrorHandler(error, req, res, next);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    logInfo(`Application started successfully`, {
      port,
      host: "0.0.0.0",
      environment: process.env.NODE_ENV || 'development',
      stage: 'startup-complete'
    });
    log(`serving on port ${port}`); // Keep vite logging for development
  });
})();
