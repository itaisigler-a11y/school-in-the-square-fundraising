# School in the Square - Production Deployment Guide

## Overview

This guide covers the complete production deployment process for the School in the Square fundraising management platform. The platform is designed to be deployment-ready with comprehensive monitoring, security, and operational features.

## Table of Contents

1. [Pre-Deployment Requirements](#pre-deployment-requirements)
2. [Environment Configuration](#environment-configuration)
3. [Security Configuration](#security-configuration)
4. [Database Setup](#database-setup)
5. [Deployment Steps](#deployment-steps)
6. [Health Checks and Monitoring](#health-checks-and-monitoring)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance Procedures](#maintenance-procedures)
9. [Rollback Procedures](#rollback-procedures)

## Pre-Deployment Requirements

### System Requirements

- **Node.js**: Version 20.x or higher
- **Database**: PostgreSQL 13+ (Neon recommended for cloud deployment)
- **Memory**: Minimum 512MB RAM, recommended 1GB+
- **Storage**: Minimum 1GB available space
- **Network**: HTTPS capability for production deployment

### Required Accounts and Services

- **Database**: Neon PostgreSQL instance or equivalent
- **Domain**: Production domain with SSL certificate
- **Monitoring** (Optional but recommended):
  - Sentry account for error tracking
  - Slack workspace for alerts
  - Email service for notifications

### Deployment Platform Support

This application supports deployment on:
- **Replit** (Primary platform)
- **Vercel**
- **Netlify**
- **Railway**
- **Docker containers**
- **Traditional VPS/dedicated servers**

## Environment Configuration

### Required Environment Variables

Copy `.env.example` to `.env` and configure the following:

#### Core Configuration

```bash
# Application Environment
NODE_ENV=production
PORT=5000

# Database (Required)
DATABASE_URL=postgresql://username:password@hostname:port/database?sslmode=require

# Security (Required)
SESSION_SECRET=your-64-character-random-string-for-production-security
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

#### External Services

```bash
# OpenAI API (Optional)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Error Tracking (Optional)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

#### Performance and Monitoring

```bash
# Logging Configuration
LOG_LEVEL=warn
ENABLE_DETAILED_LOGGING=false

# Performance Tuning
RATE_LIMIT_MAX=50
RATE_LIMIT_WINDOW_MS=900000
QUERY_TIMEOUT_MS=30000
CACHE_TTL_SECONDS=600

# Health Check Configuration
HEALTH_CHECK_TIMEOUT_MS=3000
EXTERNAL_SERVICE_TIMEOUT_MS=8000

# Security Headers
ENABLE_HSTS=true
CSP_REPORT_URI=https://your-domain.com/csp-report
```

### Environment Variable Validation

The application includes automatic environment validation. On startup, you'll see:

```
✅ Production configuration validated for production environment
🔧 Production Configuration Summary:
   Environment: production
   Database: ✅ Configured
   Session Secret: ✅ Configured
   ...
```

### Generating Secure Secrets

For SESSION_SECRET, generate a secure 64-character string:

```bash
# Method 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Method 2: Using OpenSSL
openssl rand -hex 64

# Method 3: Using online generator (ensure it's from a trusted source)
```

## Security Configuration

### SSL/TLS Requirements

**CRITICAL**: Never deploy to production without HTTPS.

- Obtain valid SSL certificate for your domain
- Configure your hosting platform to enforce HTTPS
- Verify `ENABLE_HSTS=true` in production environment

### CORS Configuration

Configure `ALLOWED_ORIGINS` with your exact production domains:

```bash
# Single domain
ALLOWED_ORIGINS=https://fundraising.schoolinthesquare.org

# Multiple domains (comma-separated)
ALLOWED_ORIGINS=https://fundraising.schoolinthesquare.org,https://www.fundraising.schoolinthesquare.org
```

### Security Headers

The application automatically configures security headers:

- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection

### Rate Limiting

Production rate limits are automatically stricter:

- General endpoints: 50 requests per 15 minutes
- Authentication endpoints: 5 requests per 5 minutes
- API endpoints: 200 requests per 15 minutes

## Database Setup

### PostgreSQL Configuration

1. **Create Production Database**:
   ```sql
   CREATE DATABASE school_fundraising_prod;
   CREATE USER fundraising_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE school_fundraising_prod TO fundraising_user;
   ```

2. **Configure Connection String**:
   ```bash
   DATABASE_URL=postgresql://fundraising_user:secure_password@hostname:5432/school_fundraising_prod?sslmode=require
   ```

3. **Run Database Migrations**:
   ```bash
   npm run db:push
   ```

### Database Security

- Always use SSL connections (`sslmode=require`)
- Use strong passwords for database users
- Restrict database access to application servers only
- Enable database connection pooling (configured automatically)

## Deployment Steps

### Step 1: Pre-Deployment Checklist

- [ ] Environment variables configured and validated
- [ ] Database created and accessible
- [ ] SSL certificate obtained and configured
- [ ] Domain DNS configured
- [ ] Monitoring services configured (if using)

### Step 2: Code Preparation

```bash
# 1. Install dependencies
npm install

# 2. Run build process
npm run build

# 3. Run configuration validation
npm run check

# 4. Test database connection
npm run db:push --dry-run
```

### Step 3: Deploy to Production

#### Replit Deployment

1. **Configure Environment**:
   - Add all environment variables in Replit's "Secrets" tab
   - Ensure `NODE_ENV=production`

2. **Deploy**:
   - Push code to Replit
   - The application will start automatically
   - Monitor logs for successful startup

#### Vercel Deployment

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Configure environment variables
vercel env add NODE_ENV production
vercel env add DATABASE_URL [your-database-url]
vercel env add SESSION_SECRET [your-session-secret]
# ... add other variables

# 3. Deploy
vercel --prod
```

#### Docker Deployment

```dockerfile
# Use provided Dockerfile or create one:
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

### Step 4: Post-Deployment Verification

1. **Health Check**:
   ```bash
   curl https://yourdomain.com/health
   ```

2. **API Verification**:
   ```bash
   curl https://yourdomain.com/api/health
   ```

3. **Security Headers Check**:
   ```bash
   curl -I https://yourdomain.com
   ```

## Health Checks and Monitoring

### Available Health Endpoints

- **`/health`**: Basic health check (bypasses authentication)
- **`/api/health`**: Comprehensive health check with metrics
- **`/ready`**: Kubernetes-style readiness probe
- **`/live`**: Kubernetes-style liveness probe

### Health Check Response Examples

#### Healthy Response (`/api/health`):
```json
{
  "status": "healthy",
  "timestamp": "2025-09-16T23:26:15.000Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0",
  "services": {
    "database": {
      "status": "healthy",
      "message": "Database is responsive",
      "responseTime": 45
    },
    "externalServices": {
      "openai": {
        "status": "healthy",
        "message": "OpenAI API is responsive"
      }
    }
  }
}
```

#### Degraded Response:
```json
{
  "status": "degraded",
  "services": {
    "database": {
      "status": "degraded",
      "message": "Database responding slowly (1200ms)"
    }
  }
}
```

### Monitoring Integration

#### Basic Monitoring Setup

1. **Configure uptime monitoring** (Pingdom, UptimeRobot, etc.):
   - Monitor: `https://yourdomain.com/health`
   - Check interval: 1-5 minutes
   - Alert on non-200 responses

2. **Database monitoring**:
   - Monitor database connection pool
   - Track query performance
   - Set up alerts for connection errors

#### Advanced Monitoring (Optional)

1. **Error Tracking with Sentry**:
   ```bash
   SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
   ```

2. **Performance Monitoring**:
   - Response time tracking
   - Memory usage monitoring
   - Database query performance

3. **Security Monitoring**:
   - Failed authentication attempts
   - Suspicious request patterns
   - Rate limit violations

## Troubleshooting

### Common Issues

#### 1. Application Won't Start

**Symptoms**: Process exits immediately or fails to bind to port

**Solutions**:
```bash
# Check configuration validation
npm run check

# Verify environment variables
node -e "console.log(process.env.NODE_ENV, process.env.DATABASE_URL ? 'DB_SET' : 'DB_MISSING')"

# Check port availability
netstat -tulpn | grep :5000
```

#### 2. Database Connection Failures

**Symptoms**: Health check shows database unhealthy

**Solutions**:
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check connection string format
echo $DATABASE_URL

# Verify SSL requirements
# Ensure connection string includes: ?sslmode=require
```

#### 3. Authentication Issues

**Symptoms**: Users can't log in, session errors

**Solutions**:
- Verify `SESSION_SECRET` is set and consistent
- Check `ALLOWED_ORIGINS` includes your domain
- Ensure cookies are being set (check browser dev tools)

#### 4. High Memory Usage

**Symptoms**: Application crashes with out-of-memory errors

**Solutions**:
```bash
# Monitor memory usage
curl https://yourdomain.com/health | jq '.memory'

# Check for memory leaks in logs
grep "High memory usage" logs/

# Consider increasing server memory or optimizing queries
```

#### 5. Performance Issues

**Symptoms**: Slow response times, timeouts

**Solutions**:
- Check database query performance
- Review performance metrics in health endpoint
- Consider enabling database query optimization
- Check external service response times

### Debug Mode

For temporary debugging in production:

1. **Enable detailed logging** (temporarily):
   ```bash
   ENABLE_DETAILED_LOGGING=true
   LOG_LEVEL=debug
   ```

2. **Check performance metrics**:
   ```bash
   curl https://yourdomain.com/api/admin/performance-report
   ```

3. **Review security events**:
   ```bash
   curl https://yourdomain.com/api/admin/security-report
   ```

**⚠️ Important**: Disable detailed logging after debugging to avoid performance impact.

## Maintenance Procedures

### Regular Maintenance

#### Daily

- [ ] Check application health status
- [ ] Monitor error rates and performance
- [ ] Review security alerts

#### Weekly

- [ ] Review performance reports
- [ ] Check database performance and optimize slow queries
- [ ] Update dependencies (if needed)
- [ ] Review user feedback and error reports

#### Monthly

- [ ] Security audit and review
- [ ] Performance optimization review
- [ ] Backup verification
- [ ] Disaster recovery testing

### Database Maintenance

```bash
# Database performance analysis
npm run db:analyze

# Update database statistics
npm run db:vacuum

# Check database size and growth
psql $DATABASE_URL -c "
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

### Security Updates

1. **Regular dependency updates**:
   ```bash
   npm audit
   npm update
   ```

2. **Security patches**:
   - Monitor security advisories
   - Test updates in staging first
   - Apply critical security patches promptly

3. **SSL certificate renewal**:
   - Monitor certificate expiration
   - Renew certificates before expiry
   - Test HTTPS functionality after renewal

### Performance Optimization

1. **Database optimization**:
   - Regular VACUUM and ANALYZE
   - Index optimization
   - Query performance review

2. **Application optimization**:
   - Memory usage monitoring
   - Cache effectiveness review
   - API response time optimization

## Rollback Procedures

### Emergency Rollback

If critical issues occur:

1. **Immediate Actions**:
   ```bash
   # Revert to previous version
   git checkout [previous-stable-commit]
   
   # Redeploy immediately
   [platform-specific deploy command]
   ```

2. **Communication**:
   - Notify stakeholders
   - Update status page (if available)
   - Document the issue

### Planned Rollback

1. **Preparation**:
   - Identify stable previous version
   - Backup current database state
   - Prepare rollback environment variables

2. **Database Considerations**:
   - If database schema changed, prepare migration rollback
   - Backup before any rollback
   - Test rollback in staging environment

3. **Execution**:
   ```bash
   # 1. Put application in maintenance mode (if supported)
   # 2. Backup current state
   # 3. Rollback application code
   # 4. Rollback database if needed
   # 5. Verify functionality
   # 6. Remove maintenance mode
   ```

## Support and Contact

### Internal Team Contacts

- **Technical Lead**: [Contact Information]
- **Database Administrator**: [Contact Information]
- **Security Team**: [Contact Information]

### External Services

- **Hosting Platform Support**: [Platform-specific support]
- **Database Provider**: [Database provider support]
- **Domain/SSL Provider**: [Provider support]

### Emergency Procedures

1. **Critical System Failure**:
   - Immediate escalation to technical lead
   - Communication to stakeholders
   - Implementation of emergency procedures

2. **Security Incident**:
   - Immediate containment
   - Security team notification
   - Incident documentation and follow-up

---

## Additional Resources

- [Security Configuration Guide](./SECURITY_CONFIGURATION.md)
- [Performance Optimization Guide](./PERFORMANCE_GUIDE.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [User Management Guide](./USER_MANAGEMENT.md)

---

*Last Updated: September 16, 2025*
*Version: 1.0.0*