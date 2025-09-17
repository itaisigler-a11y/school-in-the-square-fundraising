import helmet from 'helmet';
import cors from 'cors';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import slowDown from 'express-slow-down';
import compression from 'compression';
import { Request, Response, NextFunction, Express } from 'express';
import { z } from 'zod';
import { triggerManualAlert, AlertType, AlertSeverity } from './production-alerts';

// Security configuration based on environment
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

// CORS configuration
export const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    
    // In development, allow localhost and Replit domains
    if (isDevelopment) {
      const devOrigins = [
        'http://localhost:5000',
        'http://127.0.0.1:5000',
        /\.repl\.co$/,
        /\.replit\.dev$/,
        /\.replit\.app$/
      ];
      
      const isDevOriginAllowed = devOrigins.some(pattern => {
        if (typeof pattern === 'string') {
          return origin === pattern;
        }
        return pattern.test(origin);
      });
      
      if (isDevOriginAllowed) {
        return callback(null, true);
      }
    }
    
    // Check production allowed origins
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS: Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin', 
    'X-Requested-With', 
    'Content-Type', 
    'Accept', 
    'Authorization',
    'X-Api-Key',
    'X-Csrf-Token'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24 hours
};

// Security headers configuration
export const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", ...(isDevelopment ? ["'unsafe-eval'", "'unsafe-inline'"] : [])],
      connectSrc: ["'self'", "https://api.openai.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: isProduction ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false, // Allows images from external sources
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
};

// Rate limiting configurations
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 100, // More lenient in development
  message: {
    error: 'Too many requests',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise IP with IPv6 support
    return (req as any).userId || ipKeyGenerator(req) || 'anonymous';
  },
  skip: (req: Request) => {
    // Skip rate limiting for health checks and static assets
    return req.path === '/health' || req.path.startsWith('/assets/');
  }
});

// Stricter rate limiting for authentication endpoints
export const authRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: isDevelopment ? 50 : 5, // Very strict for auth endpoints
  message: {
    error: 'Too many authentication attempts',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// API endpoint rate limiting
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 500 : 200,
  message: {
    error: 'API rate limit exceeded',
    code: 'API_RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return (req as any).userId || ipKeyGenerator(req) || 'anonymous';
  }
});

// Slow down for expensive operations
export const expensiveOperationSlowDown = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: isDevelopment ? 10 : 5,
  delayMs: () => 500,
  maxDelayMs: 10000,
  skipSuccessfulRequests: true,
});

// Request size limits
export const requestSizeLimits = {
  json: { limit: '10mb' },
  urlencoded: { limit: '10mb', extended: true },
  raw: { limit: '50mb' }, // For file uploads
};

// Input sanitization middleware
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  try {
    // Recursively sanitize object properties
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        // Remove potentially dangerous characters
        return obj
          .replace(/[<>]/g, '') // Remove HTML brackets
          .replace(/javascript:/gi, '') // Remove javascript: protocol
          .replace(/on\w+=/gi, '') // Remove event handlers
          .trim();
      }
      
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      
      if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          // Skip potentially dangerous keys
          if (!key.match(/^[a-zA-Z0-9_-]+$/)) {
            continue;
          }
          sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
      }
      
      return obj;
    };

    // Sanitize request body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    console.error('Input sanitization error:', error);
    res.status(400).json({
      error: 'Invalid input data',
      code: 'INVALID_INPUT'
    });
  }
}

// Request validation middleware factory
export function validateRequest<T>(schema: z.ZodSchema<T>, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      const validatedData = schema.parse(data);
      req[source] = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }
      
      console.error('Validation middleware error:', error);
      res.status(500).json({
        error: 'Internal validation error',
        code: 'VALIDATION_INTERNAL_ERROR'
      });
    }
  };
}

// Security audit middleware - logs security-relevant events
export function securityAudit(req: Request, res: Response, next: NextFunction) {
  const securityContext = {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer'),
    method: req.method,
    path: req.path,
    userId: (req as any).userId,
    timestamp: new Date().toISOString(),
  };

  // Log potentially suspicious activities
  const suspiciousPatterns = [
    /\.\./,  // Path traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /javascript:/i,  // JavaScript protocol
    /eval\(/i,  // Code injection
  ];

  const fullUrl = req.originalUrl || req.url;
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(fullUrl) || 
    pattern.test(JSON.stringify(req.body || {})) ||
    pattern.test(JSON.stringify(req.query || {}))
  );

  if (isSuspicious) {
    console.warn('🚨 Suspicious request detected:', {
      ...securityContext,
      body: req.body,
      query: req.query,
      url: fullUrl
    });
  }

  // Add security headers to response
  res.set({
    'X-Request-ID': Math.random().toString(36).substring(2),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });

  next();
}

// Error handling middleware for security
export function securityErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // Don't leak internal error details in production
  const isDevelopmentMode = isDevelopment;
  
  // Log the full error for debugging
  console.error('Security Error:', {
    error: err.message,
    stack: isDevelopmentMode ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).userId
  });

  // Determine appropriate error response
  let statusCode = err.statusCode || err.status || 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';

  if (statusCode === 400) {
    message = 'Bad request';
    code = 'BAD_REQUEST';
  } else if (statusCode === 401) {
    message = 'Unauthorized';
    code = 'UNAUTHORIZED';
  } else if (statusCode === 403) {
    message = 'Forbidden';
    code = 'FORBIDDEN';
  } else if (statusCode === 404) {
    message = 'Not found';
    code = 'NOT_FOUND';
  } else if (statusCode === 429) {
    message = 'Too many requests';
    code = 'RATE_LIMITED';
  }

  const errorResponse: any = {
    error: message,
    code,
    timestamp: new Date().toISOString()
  };

  // Include more details in development
  if (isDevelopmentMode) {
    errorResponse.details = err.message;
    if (err.errors) {
      errorResponse.validationErrors = err.errors;
    }
  }

  res.status(statusCode).json(errorResponse);
}

// Compression middleware configuration
export const compressionOptions = {
  filter: (req: Request, res: Response) => {
    // Don't compress responses if this request has a 'x-no-compression' header
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // fallback to standard filter function
    return compression.filter(req, res);
  },
  threshold: 1024, // Only compress responses larger than 1KB
  level: 6, // Compression level (1-9)
};

// Health check endpoint - bypasses most security measures
export function healthCheck(req: Request, res: Response) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
}

// Setup all security middleware
export function setupSecurityMiddleware(app: Express) {
  // Trust proxy (for rate limiting and IP detection)
  app.set('trust proxy', 1);

  // Compression (should be early in the chain)
  app.use(compression(compressionOptions));

  // Security headers
  app.use(helmet(helmetOptions));

  // CORS configuration
  app.use(cors(corsOptions));

  // Health check endpoint (before rate limiting)
  app.get('/health', healthCheck);

  // General rate limiting
  app.use(generalRateLimit);

  // Security audit logging
  app.use(securityAudit);

  // Input sanitization (before body parsing)
  app.use(sanitizeInput);

  console.log('🔒 Security middleware configured successfully');
}

// Apply specific rate limits to certain routes
export function applyRouteSpecificSecurity(app: Express) {
  // Authentication endpoints
  app.use('/api/login', authRateLimit);
  app.use('/api/callback', authRateLimit);
  app.use('/api/logout', authRateLimit);

  // API endpoints
  app.use('/api/', apiRateLimit);

  // Expensive operations (imports, AI)
  app.use('/api/import', expensiveOperationSlowDown);
  app.use('/api/ai', expensiveOperationSlowDown);

  console.log('🚨 Route-specific security configured');
}