import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  requireAuth,
  requireRole,
  requirePermission,
  requireAllPermissions,
  requireAdmin,
  requireStaff,
  requireDonorAccess,
  requireDonorEdit,
  requireCampaignAccess,
  requireCampaignEdit,
  requireFinancialAccess,
  requireAnalyticsAccess
} from "./auth-middleware";
import { 
  insertDonorSchema, 
  insertCampaignSchema, 
  insertDonationSchema,
  insertCommunicationSchema,
  insertSegmentDefinitionSchema,
  insertWorkflowSchema,
  insertExperimentSchema,
  insertGrantSchema,
  insertTemplateSchema,
  insertDonorScoreSchema,
  insertAttributionSchema,
  donorSearchSchema,
  campaignSearchSchema,
  donationSearchSchema,
  communicationSearchSchema,
  segmentSearchSchema,
  workflowSearchSchema,
  experimentSearchSchema,
  grantSearchSchema,
  templateSearchSchema,
  importJobSearchSchema,
  auditLogSearchSchema,
  aiDonationAppealSchema,
  aiSubjectLinesSchema,
  aiGrantOutlineSchema,
  aiCSVAnalysisSchema,
  aiImportProcessSchema,
  aiImportPreviewSchema
} from "@shared/schema";
import { aiService } from "./ai-service";
import { z } from "zod";
import multer from "multer";
import * as XLSX from "xlsx";
import Papa from "papaparse";

// Route registry for debugging
const registeredRoutes: Array<{method: string, path: string, middleware: string[]}> = [];

// Route registration helper with logging
function registerRoute(app: Express, method: string, path: string, ...handlers: any[]) {
  const middlewareNames = handlers.slice(0, -1).map(h => h.name || 'anonymous');
  registeredRoutes.push({ method: method.toUpperCase(), path, middleware: middlewareNames });
  
  // Add import route logging wrapper for /api/import/* routes
  if (path.startsWith('/api/import')) {
    const originalHandler = handlers[handlers.length - 1];
    const wrappedHandler = async (req: any, res: any, next: any) => {
      const requestId = Math.random().toString(36).substr(2, 9);
      console.log(`[IMPORT:${requestId}] → ${method.toUpperCase()} ${path} - Entry`);
      const startTime = Date.now();
      
      try {
        await originalHandler(req, res, next);
        const duration = Date.now() - startTime;
        console.log(`[IMPORT:${requestId}] ← ${method.toUpperCase()} ${path} - Exit (${duration}ms, status: ${res.statusCode})`);
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[IMPORT:${requestId}] ✗ ${method.toUpperCase()} ${path} - Error (${duration}ms):`, error);
        throw error;
      }
    };
    handlers[handlers.length - 1] = wrappedHandler;
  }
  
  // Use proper Express API
  switch (method.toLowerCase()) {
    case 'get':
      app.get(path, ...handlers);
      break;
    case 'post':
      app.post(path, ...handlers);
      break;
    case 'put':
      app.put(path, ...handlers);
      break;
    case 'delete':
      app.delete(path, ...handlers);
      break;
    case 'patch':
      app.patch(path, ...handlers);
      break;
    default:
      throw new Error(`Unsupported HTTP method: ${method}`);
  }
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(csv|xlsx|xls)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV, XLS, and XLSX files are allowed.'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('🚀 Starting route registration...');
  
  // Auth middleware
  await setupAuth(app);

  // Debug routes (admin only)
  registerRoute(app, 'get', '/api/debug/routes', requireAuth, requireAdmin, async (req, res) => {
    try {
      const routeInfo = {
        totalRoutes: registeredRoutes.length,
        importRoutes: registeredRoutes.filter(r => r.path.startsWith('/api/import')),
        allRoutes: registeredRoutes.sort((a, b) => a.path.localeCompare(b.path)),
        serverInfo: {
          nodeVersion: process.version,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: new Date().toISOString()
        }
      };
      res.json(routeInfo);
    } catch (error) {
      console.error('Error fetching debug routes:', error);
      res.status(500).json({ message: 'Failed to fetch route information' });
    }
  });

  // Auth routes
  registerRoute(app, 'get', '/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user profile (including job title for profile completion)
  registerRoute(app, 'patch', '/api/auth/user/profile', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { firstName, lastName, jobTitle } = req.body;
      
      // Validate input
      if (!firstName || !lastName || !jobTitle) {
        return res.status(400).json({ 
          message: "First name, last name, and job title are required",
          code: "VALIDATION_ERROR" 
        });
      }

      // Update user profile
      const updatedUser = await storage.upsertUser({
        id: userId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        jobTitle: jobTitle.trim(),
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Dashboard metrics
  registerRoute(app, 'get', '/api/dashboard/metrics', requireAuth, async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  registerRoute(app, 'get', '/api/dashboard/donation-trends', requireAuth, async (req, res) => {
    try {
      const months = parseInt(req.query.months as string) || 6;
      const trends = await storage.getDonationTrends(months);
      res.json(trends);
    } catch (error) {
      console.error("Error fetching donation trends:", error);
      res.status(500).json({ message: "Failed to fetch donation trends" });
    }
  });

  registerRoute(app, 'get', '/api/dashboard/recent-donors', requireAuth, requireDonorAccess, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const recentDonors = await storage.getRecentDonors(limit);
      res.json(recentDonors);
    } catch (error) {
      console.error("Error fetching recent donors:", error);
      res.status(500).json({ message: "Failed to fetch recent donors" });
    }
  });

  registerRoute(app, 'get', '/api/dashboard/donor-segments', requireAuth, requireDonorAccess, async (req, res) => {
    try {
      const segments = await storage.getDonorSegmentStats();
      res.json(segments);
    } catch (error) {
      console.error("Error fetching donor segments:", error);
      res.status(500).json({ message: "Failed to fetch donor segments" });
    }
  });

  // Communications routes
  registerRoute(app, 'get', '/api/communications', requireAuth, requirePermission('communications:view'), async (req, res) => {
    try {
      const params = communicationSearchSchema.parse(req.query);
      const communications = await storage.getCommunications(params);
      res.json(communications);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid query parameters", errors: error.errors });
      }
      console.error("Error fetching communications:", error);
      res.status(500).json({ message: "Failed to fetch communications" });
    }
  });

  registerRoute(app, 'get', '/api/communications/:id', requireAuth, requirePermission('communications:view'), async (req, res) => {
    try {
      const communication = await storage.getCommunication(req.params.id);
      if (!communication) {
        return res.status(404).json({ message: "Communication not found" });
      }
      res.json(communication);
    } catch (error) {
      console.error("Error fetching communication:", error);
      res.status(500).json({ message: "Failed to fetch communication" });
    }
  });

  registerRoute(app, 'post', '/api/communications', requireAuth, requirePermission('communications:send'), async (req, res) => {
    try {
      const communicationData = insertCommunicationSchema.parse(req.body);
      const communication = await storage.createCommunication(communicationData);
      res.status(201).json(communication);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid communication data", errors: error.errors });
      }
      console.error("Error creating communication:", error);
      res.status(500).json({ message: "Failed to create communication" });
    }
  });

  registerRoute(app, 'put', '/api/communications/:id', requireAuth, requirePermission('communications:edit'), async (req, res) => {
    try {
      const communicationData = insertCommunicationSchema.partial().parse(req.body);
      const communication = await storage.updateCommunication(req.params.id, communicationData);
      res.json(communication);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid communication data", errors: error.errors });
      }
      console.error("Error updating communication:", error);
      res.status(500).json({ message: "Failed to update communication" });
    }
  });

  registerRoute(app, 'delete', '/api/communications/:id', requireAuth, requirePermission('communications:delete'), async (req, res) => {
    try {
      await storage.deleteCommunication(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting communication:", error);
      res.status(500).json({ message: "Failed to delete communication" });
    }
  });

  // AI Content Generation routes
  registerRoute(app, 'post', '/api/ai/donation-appeal', requireAuth, requirePermission('communications:send'), async (req: any, res) => {
    try {
      const requestData = aiDonationAppealSchema.parse(req.body);
      const userId = req.user.claims.sub;
      
      // Get donor information
      const donor = await storage.getDonor(requestData.donorId);
      if (!donor) {
        return res.status(404).json({ message: "Donor not found" });
      }

      // Get campaign information if provided
      let campaign = undefined;
      if (requestData.campaignId) {
        campaign = await storage.getCampaign(requestData.campaignId);
        if (!campaign) {
          return res.status(404).json({ message: "Campaign not found" });
        }
      }

      // Generate donation appeal using AI service with comprehensive audit logging
      const result = await aiService.generateDonationAppeal({
        donor,
        campaign,
        tone: requestData.tone,
        variations: requestData.variations,
        userId,
        storage
      });

      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      
      // Handle rate limiting errors
      if (error.message?.includes('Rate limit exceeded')) {
        return res.status(429).json({ message: error.message });
      }
      
      console.error("Error generating donation appeal:", error);
      res.status(500).json({ message: "Failed to generate donation appeal" });
    }
  });

  registerRoute(app, 'post', '/api/ai/subject-lines', requireAuth, requirePermission('communications:send'), async (req: any, res) => {
    try {
      const requestData = aiSubjectLinesSchema.parse(req.body);
      const userId = req.user.claims.sub;
      
      // Get donor information if provided
      let donor = undefined;
      if (requestData.donorId) {
        donor = await storage.getDonor(requestData.donorId);
        if (!donor) {
          return res.status(404).json({ message: "Donor not found" });
        }
      }

      // Generate subject lines using AI service with comprehensive audit logging
      const result = await aiService.generateSubjectLines({
        content: requestData.content,
        campaignType: requestData.campaignType,
        donor,
        variations: requestData.variations,
        userId,
        storage
      });

      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      
      // Handle rate limiting errors
      if (error.message?.includes('Rate limit exceeded')) {
        return res.status(429).json({ message: error.message });
      }
      
      console.error("Error generating subject lines:", error);
      res.status(500).json({ message: "Failed to generate subject lines" });
    }
  });

  registerRoute(app, 'post', '/api/ai/grant-outline', requireAuth, requirePermission('grants:edit'), async (req: any, res) => {
    try {
      const requestData = aiGrantOutlineSchema.parse(req.body);
      const userId = req.user.claims.sub;
      
      // Get grant information if provided
      let grantInfo: any = {
        grantorName: requestData.grantorName,
        type: requestData.grantType
      };
      
      if (requestData.grantId) {
        const grant = await storage.getGrant(requestData.grantId);
        if (!grant) {
          return res.status(404).json({ message: "Grant not found" });
        }
        grantInfo = grant;
      }

      // Generate grant outline using AI service with comprehensive audit logging
      const result = await aiService.generateGrantOutline({
        grantInfo,
        projectDescription: requestData.projectDescription,
        requestedAmount: requestData.requestedAmount,
        userId,
        storage
      });

      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      
      // Handle rate limiting errors
      if (error.message?.includes('Rate limit exceeded')) {
        return res.status(429).json({ message: error.message });
      }
      
      console.error("Error generating grant outline:", error);
      res.status(500).json({ message: "Failed to generate grant outline" });
    }
  });

  // Analytics routes
  registerRoute(app, 'get', '/api/analytics/overview', requireAuth, requireAnalyticsAccess, async (req, res) => {
    try {
      const { period = '12months', comparison = 'previous' } = req.query;
      
      // Get basic metrics from dashboard
      const metrics = await storage.getDashboardMetrics();
      
      // For now, return mock data with some real data mixed in
      const analyticsData = {
        totalRaised: metrics.totalRaised,
        totalRaisedChange: 23, // Mock change percentage
        activeDonors: metrics.donorCount,
        activeDonorsChange: 15,
        averageGift: metrics.averageGiftSize,
        averageGiftChange: 8,
        retentionRate: Math.round(metrics.donorRetention),
        retentionRateChange: 5,
        trends: await storage.getDonationTrends(12)
      };
      
      res.json(analyticsData);
    } catch (error) {
      console.error("Error fetching analytics overview:", error);
      res.status(500).json({ message: "Failed to fetch analytics overview" });
    }
  });

  registerRoute(app, 'get', '/api/analytics/performance', requireAuth, requireAnalyticsAccess, async (req, res) => {
    try {
      const { period = '12months' } = req.query;
      
      // Mock performance data for now
      const performanceData = {
        campaignEfficiency: 87,
        donorAcquisitionCost: 45,
        lifetimeValue: 2450,
        conversionRate: 12.5
      };
      
      res.json(performanceData);
    } catch (error) {
      console.error("Error fetching performance metrics:", error);
      res.status(500).json({ message: "Failed to fetch performance metrics" });
    }
  });

  registerRoute(app, 'get', '/api/analytics/donors', requireAuth, requirePermission('analytics:view', 'donors:view'), async (req, res) => {
    try {
      const { period = '12months', comparison = 'previous' } = req.query;
      
      // For now, return mock donor analytics data
      const donorAnalytics = {
        newDonors: 47,
        returningDonors: 132,
        avgLifetimeValue: 2450,
        monthlyRetention: 68,
        topDonors: [], // Could fetch from storage in the future
        acquisitionChannels: [
          { channel: "Website", count: 45, percentage: 38 },
          { channel: "Email Campaign", count: 32, percentage: 27 },
          { channel: "Events", count: 28, percentage: 24 },
          { channel: "Referrals", count: 13, percentage: 11 }
        ]
      };
      
      res.json(donorAnalytics);
    } catch (error) {
      console.error("Error fetching donor analytics:", error);
      res.status(500).json({ message: "Failed to fetch donor analytics" });
    }
  });

  registerRoute(app, 'get', '/api/analytics/campaigns', requireAuth, requirePermission('analytics:view', 'campaigns:view'), async (req, res) => {
    try {
      const { period = '12months', comparison = 'previous' } = req.query;
      
      // Get campaigns from storage
      const campaignsResult = await storage.getCampaigns({});
      
      // Mock campaign analytics based on real campaigns
      const campaignAnalytics = {
        totalCampaigns: campaignsResult.campaigns.length,
        activeCampaigns: campaignsResult.campaigns.filter(c => c.status === 'active').length,
        completedCampaigns: campaignsResult.campaigns.filter(c => c.status === 'completed').length,
        totalRaised: campaignsResult.campaigns.reduce((sum, c) => sum + (c.raisedAmount || 0), 0),
        avgROI: 425,
        campaigns: campaignsResult.campaigns
      };
      
      res.json(campaignAnalytics);
    } catch (error) {
      console.error("Error fetching campaign analytics:", error);
      res.status(500).json({ message: "Failed to fetch campaign analytics" });
    }
  });

  registerRoute(app, 'get', '/api/analytics/top-donors', requireAuth, requirePermission('analytics:view', 'donors:view'), async (req, res) => {
    try {
      const { period = '12months' } = req.query;
      
      // Get recent donors as a proxy for top donors
      const recentDonors = await storage.getRecentDonors(10);
      
      res.json(recentDonors);
    } catch (error) {
      console.error("Error fetching top donors:", error);
      res.status(500).json({ message: "Failed to fetch top donors" });
    }
  });

  registerRoute(app, 'get', '/api/analytics/cohort', requireAuth, requireAnalyticsAccess, async (req, res) => {
    try {
      const { period = '12months' } = req.query;
      
      // Mock cohort analysis data
      const cohortData = {
        firstYearRetention: 72,
        secondYearRetention: 58,
        longTermRetention: 45
      };
      
      res.json(cohortData);
    } catch (error) {
      console.error("Error fetching cohort analysis:", error);
      res.status(500).json({ message: "Failed to fetch cohort analysis" });
    }
  });

  // Donor management routes
  registerRoute(app, 'get', '/api/donors', requireAuth, requireDonorAccess, async (req, res) => {
    try {
      const params = donorSearchSchema.parse(req.query);
      const result = await storage.getDonors(params);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid query parameters", errors: error.errors });
      }
      console.error("Error fetching donors:", error);
      res.status(500).json({ message: "Failed to fetch donors" });
    }
  });

  registerRoute(app, 'get', '/api/donors/:id', requireAuth, requireDonorAccess, async (req, res) => {
    try {
      const donor = await storage.getDonor(req.params.id);
      if (!donor) {
        return res.status(404).json({ message: "Donor not found" });
      }
      res.json(donor);
    } catch (error) {
      console.error("Error fetching donor:", error);
      res.status(500).json({ message: "Failed to fetch donor" });
    }
  });

  registerRoute(app, 'post', '/api/donors', requireAuth, requirePermission('donors:create'), async (req, res) => {
    try {
      const donorData = insertDonorSchema.parse(req.body);
      
      // Check for duplicates
      const duplicates = await storage.findDuplicateDonors(
        donorData.email,
        donorData.firstName,
        donorData.lastName
      );
      
      if (duplicates.length > 0) {
        return res.status(400).json({ 
          message: "Potential duplicate donor found",
          duplicates: duplicates
        });
      }
      
      const donor = await storage.createDonor(donorData);
      res.status(201).json(donor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid donor data", errors: error.errors });
      }
      console.error("Error creating donor:", error);
      res.status(500).json({ message: "Failed to create donor" });
    }
  });

  registerRoute(app, 'put', '/api/donors/:id', requireAuth, requireDonorEdit, async (req, res) => {
    try {
      const donorData = insertDonorSchema.partial().parse(req.body);
      const donor = await storage.updateDonor(req.params.id, donorData);
      res.json(donor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid donor data", errors: error.errors });
      }
      console.error("Error updating donor:", error);
      res.status(500).json({ message: "Failed to update donor" });
    }
  });

  registerRoute(app, 'delete', '/api/donors/:id', requireAuth, requirePermission('donors:delete'), async (req, res) => {
    try {
      await storage.deleteDonor(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting donor:", error);
      res.status(500).json({ message: "Failed to delete donor" });
    }
  });

  // Campaign management routes
  registerRoute(app, 'get', '/api/campaigns', requireAuth, requireCampaignAccess, async (req, res) => {
    try {
      const params = campaignSearchSchema.parse(req.query);
      const result = await storage.getCampaigns(params);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid query parameters", errors: error.errors });
      }
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  registerRoute(app, 'get', '/api/campaigns/:id', requireAuth, requireCampaignAccess, async (req, res) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      console.error("Error fetching campaign:", error);
      res.status(500).json({ message: "Failed to fetch campaign" });
    }
  });

  registerRoute(app, 'post', '/api/campaigns', requireAuth, requirePermission('campaigns:create'), async (req, res) => {
    try {
      const campaignData = insertCampaignSchema.parse(req.body);
      const campaign = await storage.createCampaign(campaignData);
      res.status(201).json(campaign);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid campaign data", errors: error.errors });
      }
      console.error("Error creating campaign:", error);
      res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  registerRoute(app, 'put', '/api/campaigns/:id', requireAuth, requireCampaignEdit, async (req, res) => {
    try {
      const campaignData = insertCampaignSchema.partial().parse(req.body);
      const campaign = await storage.updateCampaign(req.params.id, campaignData);
      res.json(campaign);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid campaign data", errors: error.errors });
      }
      console.error("Error updating campaign:", error);
      res.status(500).json({ message: "Failed to update campaign" });
    }
  });

  registerRoute(app, 'delete', '/api/campaigns/:id', requireAuth, requirePermission('campaigns:delete'), async (req, res) => {
    try {
      await storage.deleteCampaign(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting campaign:", error);
      res.status(500).json({ message: "Failed to delete campaign" });
    }
  });

  // Donation management routes
  registerRoute(app, 'get', '/api/donations', requireAuth, requirePermission('donations:view'), async (req, res) => {
    try {
      const params = donationSearchSchema.parse(req.query);
      const result = await storage.getDonations(params);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid query parameters", errors: error.errors });
      }
      console.error("Error fetching donations:", error);
      res.status(500).json({ message: "Failed to fetch donations" });
    }
  });

  registerRoute(app, 'get', '/api/donations/:id', requireAuth, requirePermission('donations:view'), async (req, res) => {
    try {
      const donation = await storage.getDonation(req.params.id);
      if (!donation) {
        return res.status(404).json({ message: "Donation not found" });
      }
      res.json(donation);
    } catch (error) {
      console.error("Error fetching donation:", error);
      res.status(500).json({ message: "Failed to fetch donation" });
    }
  });

  registerRoute(app, 'post', '/api/donations', requireAuth, requirePermission('donations:create'), async (req, res) => {
    try {
      const donationData = insertDonationSchema.parse(req.body);
      const donation = await storage.createDonation(donationData);
      res.status(201).json(donation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid donation data", errors: error.errors });
      }
      console.error("Error creating donation:", error);
      res.status(500).json({ message: "Failed to create donation" });
    }
  });

  registerRoute(app, 'put', '/api/donations/:id', requireAuth, requirePermission('donations:edit'), async (req, res) => {
    try {
      const donationData = insertDonationSchema.partial().parse(req.body);
      const donation = await storage.updateDonation(req.params.id, donationData);
      res.json(donation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid donation data", errors: error.errors });
      }
      console.error("Error updating donation:", error);
      res.status(500).json({ message: "Failed to update donation" });
    }
  });

  registerRoute(app, 'delete', '/api/donations/:id', requireAuth, requirePermission('donations:delete'), async (req, res) => {
    try {
      await storage.deleteDonation(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting donation:", error);
      res.status(500).json({ message: "Failed to delete donation" });
    }
  });

  // Data import routes
  registerRoute(app, 'post', '/api/import/preview', requireAuth, requirePermission('data:import'), upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const file = req.file;
      let data: any[] = [];
      
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        // Parse CSV
        const csvText = file.buffer.toString('utf-8');
        const parseResult = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        data = parseResult.data;
      } else if (file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
        // Parse Excel
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(sheet);
      }

      // Return first 10 rows for preview
      const preview = data.slice(0, 10);
      const headers = Object.keys(data[0] || {});
      
      res.json({
        fileName: file.originalname,
        fileSize: file.size,
        totalRows: data.length,
        headers: headers,
        preview: preview,
      });
    } catch (error) {
      console.error("Error processing file:", error);
      res.status(500).json({ message: "Failed to process file" });
    }
  });

  registerRoute(app, 'post', '/api/import/process', requireAuth, requirePermission('data:import'), upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = req.user?.claims?.sub;
      const file = req.file;
      
      // Enhanced security validation
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        return res.status(413).json({ message: "File too large. Maximum size is 50MB." });
      }
      
      const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (!allowedTypes.includes(file.mimetype) && !file.originalname.match(/\.(csv|xlsx|xls)$/)) {
        return res.status(400).json({ message: "Invalid file type. Only CSV, XLS, and XLSX files are allowed." });
      }
      
      const fieldMapping = JSON.parse(req.body.fieldMapping || '{}');
      const options = JSON.parse(req.body.options || '{}');
      const jobName = req.body.name || `Import: ${file.originalname}`;
      const description = req.body.description || `Import donor data from ${file.originalname}`;
      
      // Create comprehensive import job
      const importJob = await storage.createImportJob({
        name: jobName,
        description: description,
        fileName: file.originalname,
        fileSize: file.size,
        fileType: file.originalname.split('.').pop()?.toLowerCase() || 'csv',
        targetEntity: 'donors',
        fieldMapping: fieldMapping,
        deduplicationStrategy: options.skipDuplicates ? 'skip' : 
                             options.updateExisting ? 'update' : 'create_new',
        createdBy: userId,
      });
      
      // Start background processing
      startBackgroundImportJob(importJob.id, file.buffer, file.originalname);
      
      // Create audit log
      await storage.createAuditLog({
        action: 'import_started',
        entityType: 'import_job',
        entityId: importJob.id,
        userId: userId,
        metadata: {
          fileName: file.originalname,
          fileSize: file.size,
          targetEntity: 'donors',
        }
      });

      res.json({ 
        importId: importJob.id,
        jobName: importJob.name,
        status: importJob.status
      });
    } catch (error) {
      console.error("Error starting import:", error);
      res.status(500).json({ message: "Failed to start import" });
    }
  });

  registerRoute(app, 'get', '/api/import/:id/status', requireAuth, requirePermission('data:import'), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const importJob = await storage.getImportJob(req.params.id);
      
      if (!importJob || importJob.createdBy !== userId) {
        return res.status(404).json({ message: "Import job not found or access denied" });
      }
      
      // Calculate progress percentage
      const progress = importJob.totalRows > 0 ? 
        Math.round((importJob.processedRows / importJob.totalRows) * 100) : 0;
      
      // Calculate estimated time remaining
      let estimatedTimeRemaining = null;
      if (importJob.startedAt && importJob.processedRows > 0 && importJob.status === 'processing') {
        const elapsedTime = (Date.now() - importJob.startedAt.getTime()) / 1000; // seconds
        const rate = importJob.processedRows / elapsedTime; // rows per second
        const remainingRows = importJob.totalRows - importJob.processedRows;
        estimatedTimeRemaining = Math.round(remainingRows / rate);
      }
      
      res.json({
        ...importJob,
        progress,
        estimatedTimeRemaining,
        // Limit error details for performance
        errors: importJob.errors?.slice(-100), // Only return last 100 errors
        warnings: importJob.warnings?.slice(-50), // Only return last 50 warnings
      });
    } catch (error) {
      console.error("Error fetching import status:", error);
      res.status(500).json({ message: "Failed to fetch import status" });
    }
  });

  // Cancel import job endpoint
  registerRoute(app, 'post', '/api/import/:id/cancel', requireAuth, requirePermission('data:import'), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const importJob = await storage.getImportJob(req.params.id);
      
      if (!importJob || importJob.createdBy !== userId) {
        return res.status(404).json({ message: "Import job not found or access denied" });
      }
      
      if (!['pending', 'processing'].includes(importJob.status)) {
        return res.status(400).json({ message: "Cannot cancel job that is already completed, failed, or cancelled" });
      }
      
      const reason = req.body.reason || 'Cancelled by user';
      await storage.cancelImportJob(importJob.id, reason);
      
      // Create audit log
      await storage.createAuditLog({
        action: 'import_cancelled',
        entityType: 'import_job',
        entityId: importJob.id,
        userId: userId,
        metadata: {
          fileName: importJob.fileName,
          reason: reason,
          processedRows: importJob.processedRows,
          totalRows: importJob.totalRows,
        }
      });
      
      res.json({ message: "Import job cancelled successfully" });
    } catch (error) {
      console.error("Error cancelling import:", error);
      res.status(500).json({ message: "Failed to cancel import" });
    }
  });

  // ==================================================
  // AI-POWERED IMPORT ENDPOINTS (CRITICAL FEATURE)
  // ==================================================

  // AI analyzes CSV and returns intelligent field mappings - ZERO manual mapping required
  registerRoute(app, 'post', '/api/import/ai-analyze', requireAuth, requirePermission('data:import'), upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = req.user?.claims?.sub;
      const file = req.file;
      
      // Enhanced security validation
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        return res.status(413).json({ message: "File too large. Maximum size is 50MB." });
      }
      
      const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (!allowedTypes.includes(file.mimetype) && !file.originalname.match(/\.(csv|xlsx|xls)$/)) {
        return res.status(400).json({ message: "Invalid file type. Only CSV, XLS, and XLSX files are allowed." });
      }

      let data: any[] = [];
      let headers: string[] = [];
      
      // Parse file based on type
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        const csvText = file.buffer.toString('utf-8');
        const parseResult = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        data = parseResult.data;
        headers = parseResult.meta.fields || [];
      } else if (file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(sheet);
        headers = Object.keys(data[0] || {});
      }

      if (!data.length) {
        return res.status(400).json({ message: "File contains no data" });
      }

      // Use AI service to analyze CSV and generate intelligent field mappings
      const analysisResult = await aiService.analyzeCSVForImport({
        headers,
        sampleData: data.slice(0, 10), // Send first 10 rows for analysis
        fileName: file.originalname,
        userId,
        storage
      });

      // Include basic file info
      const response = {
        fileName: file.originalname,
        fileSize: file.size,
        totalRows: data.length,
        headers,
        preview: data.slice(0, 5), // Return first 5 rows for preview
        aiAnalysis: analysisResult
      };

      res.json(response);
    } catch (error) {
      console.error("Error in AI CSV analysis:", error);
      res.status(500).json({ 
        message: "Failed to analyze CSV file", 
        error: error.message 
      });
    }
  });

  // AI processes and imports data automatically - ZERO configuration required
  registerRoute(app, 'post', '/api/import/ai-process', requireAuth, requirePermission('data:import'), upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = req.user?.claims?.sub;
      const file = req.file;
      
      // Parse options with defaults
      const options = req.body.options ? JSON.parse(req.body.options) : {
        skipDuplicates: true,
        sendWelcomeEmail: false,
        updateExisting: false
      };

      let data: any[] = [];
      let headers: string[] = [];
      
      // Parse file based on type
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        const csvText = file.buffer.toString('utf-8');
        const parseResult = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        data = parseResult.data;
        headers = parseResult.meta.fields || [];
      } else if (file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(sheet);
        headers = Object.keys(data[0] || {});
      }

      if (!data.length) {
        return res.status(400).json({ message: "File contains no data" });
      }

      // Generate AI field mappings automatically
      const analysisResult = await aiService.analyzeCSVForImport({
        headers,
        sampleData: data.slice(0, 10),
        fileName: file.originalname,
        userId,
        storage
      });

      // Convert AI field mappings to traditional format for existing import system
      const traditionalMapping: Record<string, string> = {};
      Object.entries(analysisResult.fieldMappings).forEach(([csvField, mapping]: [string, any]) => {
        if (mapping.dbField && mapping.dbField !== 'skip' && mapping.dbField !== 'fullName') {
          traditionalMapping[mapping.dbField] = csvField;
        } else if (mapping.dbField === 'fullName') {
          // Handle name splitting in the existing system
          traditionalMapping['firstName'] = csvField;
          traditionalMapping['lastName'] = csvField;
        }
      });

      // Create comprehensive import job with AI-generated mappings
      const jobName = req.body.name || `AI Import: ${file.originalname}`;
      const description = req.body.description || `AI-powered import of donor data from ${file.originalname}`;
      
      const importJob = await storage.createImportJob({
        name: jobName,
        description: description,
        fileName: file.originalname,
        fileSize: file.size,
        fileType: file.originalname.split('.').pop()?.toLowerCase() || 'csv',
        targetEntity: 'donors',
        fieldMapping: traditionalMapping,
        deduplicationStrategy: options.skipDuplicates ? 'skip' : 
                             options.updateExisting ? 'update' : 'create_new',
        createdBy: userId,
      });
      
      // Start background processing
      startBackgroundImportJob(importJob.id, file.buffer, file.originalname);
      
      // Create audit log
      await storage.createAuditLog({
        action: 'import_started',
        entityType: 'import_job',
        entityId: importJob.id,
        userId: userId,
        metadata: {
          fileName: file.originalname,
          fileSize: file.size,
          targetEntity: 'donors',
          aiGenerated: true,
          mappingCount: Object.keys(traditionalMapping).length,
          overallConfidence: analysisResult.overallConfidence
        }
      });

      res.json({ 
        importId: importJob.id,
        jobName: importJob.name,
        status: importJob.status,
        aiAnalysis: {
          fieldMappings: analysisResult.fieldMappings,
          overallConfidence: analysisResult.overallConfidence,
          requiredFieldsCovered: analysisResult.requiredFieldsCovered
        }
      });
    } catch (error) {
      console.error("Error in AI import processing:", error);
      res.status(500).json({ 
        message: "Failed to process AI import", 
        error: error.message 
      });
    }
  });
  
  // Get import jobs list
  registerRoute(app, 'get', '/api/import/jobs', requireAuth, requirePermission('data:import'), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
      
      const jobs = await storage.getImportJobs(userId, limit);
      
      // Calculate progress for each job
      const jobsWithProgress = jobs.map(job => ({
        ...job,
        progress: job.totalRows > 0 ? Math.round((job.processedRows / job.totalRows) * 100) : 0,
        // Remove large arrays for list view performance
        errors: undefined,
        warnings: undefined,
        summary: job.summary ? {
          ...job.summary,
          hasErrors: (job.errors?.length || 0) > 0,
          hasWarnings: (job.warnings?.length || 0) > 0,
        } : undefined,
      }));
      
      res.json(jobsWithProgress);
    } catch (error) {
      console.error("Error fetching import jobs:", error);
      res.status(500).json({ message: "Failed to fetch import jobs" });
    }
  });

  // Validation and dry-run endpoint (enhanced security)
  registerRoute(app, 'post', '/api/import/validate', requireAuth, requirePermission('data:import'), upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const file = req.file;
      const fieldMapping = JSON.parse(req.body.fieldMapping || '{}');
      const options = JSON.parse(req.body.options || '{}');
      
      let data: any[] = [];
      
      // Parse file
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        const csvText = file.buffer.toString('utf-8');
        const parseResult = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        data = parseResult.data;
      } else if (file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(sheet);
      }

      // Validation results structure
      const validationResults = {
        summary: {
          totalRows: data.length,
          validRows: 0,
          errorRows: 0,
          warningRows: 0,
          duplicateRows: 0,
          newRecords: 0,
          updateRecords: 0
        },
        results: [],
        fieldStatistics: {}
      };

      const fieldStats: Record<string, any> = {};
      Object.keys(fieldMapping).forEach(dbField => {
        fieldStats[dbField] = {
          totalCount: 0,
          validCount: 0,
          emptyCount: 0,
          uniqueValues: new Set(),
          valueFrequency: {}
        };
      });

      // Validate each row (limit to first 100 for performance)
      for (let i = 0; i < Math.min(data.length, 100); i++) {
        const row = data[i];
        
        // Map fields according to field mapping
        const mappedData: any = {};
        for (const [dbField, csvField] of Object.entries(fieldMapping)) {
          if (row[csvField] !== undefined && row[csvField] !== '') {
            mappedData[dbField] = row[csvField];
          }
        }

        // Validate required fields and data quality
        const errors: string[] = [];
        const warnings: string[] = [];
        
        if (!mappedData.firstName) errors.push('First name is required');
        if (!mappedData.lastName) errors.push('Last name is required');
        
        // Email validation
        if (mappedData.email) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(mappedData.email)) {
            errors.push('Invalid email format');
          }
        } else {
          warnings.push('Email address not provided');
        }

        // Phone validation  
        if (mappedData.phone) {
          const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
          if (!phoneRegex.test(mappedData.phone.replace(/[\s\-\(\)]/g, ''))) {
            warnings.push('Invalid phone number format');
          }
        }

        // Check for duplicates using advanced detection
        const duplicates = await storage.findAdvancedDuplicates(mappedData, ['exact_email', 'exact_phone', 'fuzzy_name']);
        
        let action = 'create';
        if (errors.length > 0) {
          action = 'skip';
          validationResults.summary.errorRows++;
        } else if (duplicates.length > 0) {
          validationResults.summary.duplicateRows++;
          if (duplicates.some(d => d.confidence === 'high')) {
            action = options.skipDuplicates ? 'skip' : 
                     options.updateExisting ? 'update' : 'manual_review';
            if (action === 'update') validationResults.summary.updateRecords++;
          } else {
            action = 'manual_review';
          }
        } else {
          validationResults.summary.validRows++;
          validationResults.summary.newRecords++;
        }

        if (warnings.length > 0) {
          validationResults.summary.warningRows++;
        }

        // Update field statistics
        Object.keys(fieldMapping).forEach(dbField => {
          const value = mappedData[dbField];
          const stats = fieldStats[dbField];
          
          stats.totalCount++;
          if (value && value.toString().trim()) {
            stats.validCount++;
            stats.uniqueValues.add(value);
            stats.valueFrequency[value] = (stats.valueFrequency[value] || 0) + 1;
          } else {
            stats.emptyCount++;
          }
        });

        validationResults.results.push({
          rowIndex: i + 1,
          originalData: row,
          mappedData,
          errors,
          warnings,
          duplicates: duplicates.slice(0, 3), // Limit to top 3 matches
          action
        });
      }

      // Convert field statistics to final format
      Object.keys(fieldStats).forEach(field => {
        const stats = fieldStats[field];
        const valueFreq = stats.valueFrequency as Record<string, number> || {};
        const commonValues = Object.entries(valueFreq)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 5)
          .map(([value, count]) => ({ value, count: count as number }));

        validationResults.fieldStatistics[field] = {
          totalCount: stats.totalCount,
          validCount: stats.validCount,
          emptyCount: stats.emptyCount,
          uniqueValues: stats.uniqueValues.size,
          commonValues
        };
      });

      res.json(validationResults);
    } catch (error) {
      console.error("Error validating import data:", error);
      res.status(500).json({ message: "Failed to validate import data" });
    }
  });

  // Get detailed error report for import job
  registerRoute(app, 'get', '/api/import/:id/errors', requireAuth, requirePermission('data:import'), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const importJob = await storage.getImportJob(req.params.id);
      
      if (!importJob || importJob.createdBy !== userId) {
        return res.status(404).json({ message: "Import job not found or access denied" });
      }
      
      // Get comprehensive error report
      const errorReport = {
        jobInfo: {
          id: importJob.id,
          name: importJob.name,
          fileName: importJob.fileName,
          status: importJob.status,
          createdAt: importJob.createdAt,
          completedAt: importJob.completedAt,
        },
        summary: {
          totalRows: importJob.totalRows || 0,
          processedRows: importJob.processedRows || 0,
          successfulRows: importJob.successfulRows || 0,
          errorRows: importJob.errorRows || 0,
          skippedRows: importJob.skippedRows || 0,
          warningCount: (importJob.warnings as any[])?.length || 0,
          errorCount: (importJob.errors as any[])?.length || 0,
        },
        errors: importJob.errors || [],
        warnings: importJob.warnings || [],
        fieldMapping: importJob.fieldMapping,
        deduplicationStrategy: importJob.deduplicationStrategy,
      };
      
      // Set appropriate headers for CSV download if requested
      if (req.query.format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="import-errors-${importJob.id}.csv"`);
        
        // Convert errors to CSV format
        const errors = importJob.errors as any[] || [];
        if (errors.length === 0) {
          return res.send('No errors found\n');
        }
        
        // Create CSV header
        const csvHeaders = ['Row Number', 'Error Message', 'Original Data'];
        let csvContent = csvHeaders.join(',') + '\n';
        
        // Add error rows
        errors.forEach(error => {
          const row = error.row || '';
          const message = (error.error || '').replace(/"/g, '""');
          const data = JSON.stringify(error.data || {}).replace(/"/g, '""');
          csvContent += `"${row}","${message}","${data}"\n`;
        });
        
        return res.send(csvContent);
      }
      
      // Return JSON format by default
      res.json(errorReport);
    } catch (error) {
      console.error("Error fetching import errors:", error);
      res.status(500).json({ message: "Failed to fetch import errors" });
    }
  });
  
  // Legacy data imports endpoint (for backwards compatibility)
  registerRoute(app, 'get', '/api/data-imports', requireAuth, requirePermission('data:import'), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      // Return import jobs in legacy format for compatibility
      const importJobs = await storage.getImportJobs(userId, 50);
      
      const legacyFormat = importJobs.map(job => ({
        id: job.id,
        fileName: job.fileName,
        fileSize: job.fileSize,
        status: job.status,
        totalRows: job.totalRows || 0,
        successfulRows: job.successfulRows || 0,
        errorRows: job.errorRows || 0,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      }));
      
      res.json(legacyFormat);
    } catch (error) {
      console.error("Error fetching legacy imports:", error);
      res.status(500).json({ message: "Failed to fetch imports" });
    }
  });

  // Segment management routes
  registerRoute(app, 'get', '/api/segments', requireAuth, requireDonorAccess, async (req, res) => {
    try {
      const segments = await storage.getSegments();
      res.json(segments);
    } catch (error) {
      console.error("Error fetching segments:", error);
      res.status(500).json({ message: "Failed to fetch segments" });
    }
  });

  // Advanced Segment Definition routes
  registerRoute(app, 'get', '/api/segment-definitions', requireAuth, requireDonorAccess, async (req: any, res) => {
    try {
      const {
        search,
        createdBy,
        tags,
        page = 1,
        limit = 25
      } = req.query;

      const params = {
        search,
        createdBy,
        tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
        page: parseInt(page),
        limit: parseInt(limit)
      };

      const result = await storage.getSegmentDefinitions(params);
      res.json(result);
    } catch (error) {
      console.error("Error fetching segment definitions:", error);
      res.status(500).json({ message: "Failed to fetch segment definitions" });
    }
  });

  registerRoute(app, 'get', '/api/segment-definitions/:id', requireAuth, requireDonorAccess, async (req, res) => {
    try {
      const { id } = req.params;
      const segmentDefinition = await storage.getSegmentDefinition(id);
      
      if (!segmentDefinition) {
        return res.status(404).json({ message: "Segment definition not found" });
      }

      res.json(segmentDefinition);
    } catch (error) {
      console.error("Error fetching segment definition:", error);
      res.status(500).json({ message: "Failed to fetch segment definition" });
    }
  });

  registerRoute(app, 'post', '/api/segment-definitions', requireAuth, requireDonorEdit, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const segmentDefinitionData = {
        ...req.body,
        createdBy: userId
      };

      // Validate the request body
      const validatedData = insertSegmentDefinitionSchema.parse(segmentDefinitionData);
      
      const newSegmentDefinition = await storage.createSegmentDefinition(validatedData);
      
      // Log audit entry
      await storage.createAuditLog({
        userId,
        action: 'create',
        entity: 'segment_definition',
        entityId: newSegmentDefinition.id,
        details: { name: newSegmentDefinition.name },
      });

      res.status(201).json(newSegmentDefinition);
    } catch (error) {
      console.error("Error creating segment definition:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid segment definition data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create segment definition" });
    }
  });

  registerRoute(app, 'put', '/api/segment-definitions/:id', requireAuth, requireDonorEdit, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Check if segment definition exists and user has permission to edit
      const existingSegment = await storage.getSegmentDefinition(id);
      if (!existingSegment) {
        return res.status(404).json({ message: "Segment definition not found" });
      }

      // Allow editing if user is admin or the creator
      const user = await storage.getUser(userId);
      if (existingSegment.createdBy !== userId && user?.role !== 'administrator') {
        return res.status(403).json({ message: "Not authorized to edit this segment" });
      }

      // Validate the request body
      const validatedData = insertSegmentDefinitionSchema.partial().parse(req.body);
      
      const updatedSegmentDefinition = await storage.updateSegmentDefinition(id, validatedData);
      
      // Log audit entry
      await storage.createAuditLog({
        userId,
        action: 'update',
        entity: 'segment_definition',
        entityId: id,
        details: { name: updatedSegmentDefinition.name },
      });

      res.json(updatedSegmentDefinition);
    } catch (error) {
      console.error("Error updating segment definition:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid segment definition data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update segment definition" });
    }
  });

  registerRoute(app, 'delete', '/api/segment-definitions/:id', requireAuth, requireDonorEdit, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Check if segment definition exists and user has permission to delete
      const existingSegment = await storage.getSegmentDefinition(id);
      if (!existingSegment) {
        return res.status(404).json({ message: "Segment definition not found" });
      }

      // Allow deleting if user is admin or the creator
      const user = await storage.getUser(userId);
      if (existingSegment.createdBy !== userId && user?.role !== 'administrator') {
        return res.status(403).json({ message: "Not authorized to delete this segment" });
      }

      await storage.deleteSegmentDefinition(id);
      
      // Log audit entry
      await storage.createAuditLog({
        userId,
        action: 'delete',
        entity: 'segment_definition',
        entityId: id,
        details: { name: existingSegment.name },
      });

      res.json({ message: "Segment definition deleted successfully" });
    } catch (error) {
      console.error("Error deleting segment definition:", error);
      res.status(500).json({ message: "Failed to delete segment definition" });
    }
  });

  registerRoute(app, 'get', '/api/segment-definitions/:id/donors', requireAuth, requireDonorAccess, async (req, res) => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 25 } = req.query;

      const result = await storage.getSegmentDefinitionDonors(
        id,
        parseInt(page as string),
        parseInt(limit as string)
      );
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching segment donors:", error);
      if (error.message === 'Segment definition not found') {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to fetch segment donors" });
    }
  });

  registerRoute(app, 'post', '/api/segment-definitions/:id/refresh', requireAuth, requireDonorAccess, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      const refreshedSegment = await storage.refreshSegmentDefinition(id);
      
      // Log audit entry
      await storage.createAuditLog({
        userId,
        action: 'update',
        entity: 'segment_definition',
        entityId: id,
        details: { action: 'refresh', estimatedCount: refreshedSegment.estimatedCount },
      });

      res.json(refreshedSegment);
    } catch (error) {
      console.error("Error refreshing segment definition:", error);
      if (error.message === 'Segment definition not found') {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to refresh segment definition" });
    }
  });

  registerRoute(app, 'post', '/api/segment-definitions/preview', requireAuth, requireDonorAccess, async (req, res) => {
    try {
      const { filterQuery, includeCount = true, includeSample = true } = req.body;
      
      // Validate query structure
      if (!filterQuery || typeof filterQuery !== 'object') {
        return res.status(400).json({ message: "Invalid filter query" });
      }

      const result: any = {};
      
      if (includeCount) {
        result.count = await storage.calculateSegmentCount(filterQuery);
      }
      
      if (includeSample) {
        const sampleResult = await storage.executeSegmentQuery(filterQuery);
        result.sample = {
          donors: sampleResult.donors.slice(0, 5), // Return first 5 donors as sample
          total: sampleResult.total
        };
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error previewing segment:", error);
      res.status(500).json({ 
        message: "Failed to preview segment", 
        error: error.message 
      });
    }
  });

  registerRoute(app, 'post', '/api/segment-definitions/validate-query', requireAuth, requireDonorAccess, async (req, res) => {
    try {
      const { filterQuery } = req.body;
      
      if (!filterQuery || typeof filterQuery !== 'object') {
        return res.status(400).json({ 
          valid: false, 
          error: "Invalid filter query structure" 
        });
      }

      // Try to build SQL condition to validate query structure
      try {
        await storage.calculateSegmentCount(filterQuery);
        res.json({ valid: true });
      } catch (validationError) {
        res.json({ 
          valid: false, 
          error: validationError.message 
        });
      }
    } catch (error) {
      console.error("Error validating segment query:", error);
      res.status(500).json({ 
        valid: false, 
        error: "Failed to validate query" 
      });
    }
  });

  // ==================================================
  // WORKFLOWS CRUD ROUTES
  // ==================================================
  registerRoute(app, 'get', '/api/workflows', requireAuth, requirePermission('workflows:view'), async (req, res) => {
    try {
      const params = workflowSearchSchema.parse(req.query);
      const workflows = await storage.getWorkflows(params);
      res.json(workflows);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid query parameters", errors: error.errors });
      }
      console.error("Error fetching workflows:", error);
      res.status(500).json({ message: "Failed to fetch workflows" });
    }
  });

  registerRoute(app, 'get', '/api/workflows/:id', requireAuth, requirePermission('workflows:view'), async (req, res) => {
    try {
      const workflow = await storage.getWorkflow(req.params.id);
      if (!workflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }
      res.json(workflow);
    } catch (error) {
      console.error("Error fetching workflow:", error);
      res.status(500).json({ message: "Failed to fetch workflow" });
    }
  });

  registerRoute(app, 'post', '/api/workflows', requireAuth, requirePermission('workflows:create'), async (req: any, res) => {
    try {
      const workflowData = insertWorkflowSchema.parse({
        ...req.body,
        createdBy: req.user.claims.sub
      });
      const workflow = await storage.createWorkflow(workflowData);
      
      // Audit log
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'create',
        entityType: 'workflow',
        entityId: workflow.id,
        details: { workflowName: workflow.name, status: workflow.status }
      });
      
      res.status(201).json(workflow);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid workflow data", errors: error.errors });
      }
      console.error("Error creating workflow:", error);
      res.status(500).json({ message: "Failed to create workflow" });
    }
  });

  registerRoute(app, 'put', '/api/workflows/:id', requireAuth, requirePermission('workflows:edit'), async (req: any, res) => {
    try {
      const workflowData = insertWorkflowSchema.partial().parse(req.body);
      const workflow = await storage.updateWorkflow(req.params.id, workflowData);
      
      // Audit log
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'update',
        entityType: 'workflow',
        entityId: workflow.id,
        details: { changes: workflowData }
      });
      
      res.json(workflow);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid workflow data", errors: error.errors });
      }
      console.error("Error updating workflow:", error);
      res.status(500).json({ message: "Failed to update workflow" });
    }
  });

  registerRoute(app, 'delete', '/api/workflows/:id', requireAuth, requirePermission('workflows:delete'), async (req: any, res) => {
    try {
      await storage.deleteWorkflow(req.params.id);
      
      // Audit log
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'delete',
        entityType: 'workflow',
        entityId: req.params.id,
        details: {}
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting workflow:", error);
      res.status(500).json({ message: "Failed to delete workflow" });
    }
  });

  // ==================================================
  // EXPERIMENTS CRUD ROUTES
  // ==================================================
  registerRoute(app, 'get', '/api/experiments', requireAuth, requirePermission('experiments:view'), async (req, res) => {
    try {
      const params = experimentSearchSchema.parse(req.query);
      const experiments = await storage.getExperiments(params);
      res.json(experiments);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid query parameters", errors: error.errors });
      }
      console.error("Error fetching experiments:", error);
      res.status(500).json({ message: "Failed to fetch experiments" });
    }
  });

  registerRoute(app, 'get', '/api/experiments/:id', requireAuth, requirePermission('experiments:view'), async (req, res) => {
    try {
      const experiment = await storage.getExperiment(req.params.id);
      if (!experiment) {
        return res.status(404).json({ message: "Experiment not found" });
      }
      res.json(experiment);
    } catch (error) {
      console.error("Error fetching experiment:", error);
      res.status(500).json({ message: "Failed to fetch experiment" });
    }
  });

  registerRoute(app, 'post', '/api/experiments', requireAuth, requirePermission('experiments:create'), async (req: any, res) => {
    try {
      const experimentData = insertExperimentSchema.parse({
        ...req.body,
        createdBy: req.user.claims.sub
      });
      const experiment = await storage.createExperiment(experimentData);
      
      // Audit log
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'create',
        entityType: 'experiment',
        entityId: experiment.id,
        details: { experimentName: experiment.name, status: experiment.status }
      });
      
      res.status(201).json(experiment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid experiment data", errors: error.errors });
      }
      console.error("Error creating experiment:", error);
      res.status(500).json({ message: "Failed to create experiment" });
    }
  });

  registerRoute(app, 'put', '/api/experiments/:id', requireAuth, requirePermission('experiments:edit'), async (req: any, res) => {
    try {
      const experimentData = insertExperimentSchema.partial().parse(req.body);
      const experiment = await storage.updateExperiment(req.params.id, experimentData);
      
      // Audit log
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'update',
        entityType: 'experiment',
        entityId: experiment.id,
        details: { changes: experimentData }
      });
      
      res.json(experiment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid experiment data", errors: error.errors });
      }
      console.error("Error updating experiment:", error);
      res.status(500).json({ message: "Failed to update experiment" });
    }
  });

  registerRoute(app, 'delete', '/api/experiments/:id', requireAuth, requirePermission('experiments:delete'), async (req: any, res) => {
    try {
      await storage.deleteExperiment(req.params.id);
      
      // Audit log
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'delete',
        entityType: 'experiment',
        entityId: req.params.id,
        details: {}
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting experiment:", error);
      res.status(500).json({ message: "Failed to delete experiment" });
    }
  });

  // ==================================================
  // GRANTS CRUD ROUTES
  // ==================================================
  registerRoute(app, 'get', '/api/grants', requireAuth, requirePermission('grants:view'), async (req, res) => {
    try {
      const params = grantSearchSchema.parse(req.query);
      const grants = await storage.getGrants(params);
      res.json(grants);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid query parameters", errors: error.errors });
      }
      console.error("Error fetching grants:", error);
      res.status(500).json({ message: "Failed to fetch grants" });
    }
  });

  registerRoute(app, 'get', '/api/grants/:id', requireAuth, requirePermission('grants:view'), async (req, res) => {
    try {
      const grant = await storage.getGrant(req.params.id);
      if (!grant) {
        return res.status(404).json({ message: "Grant not found" });
      }
      res.json(grant);
    } catch (error) {
      console.error("Error fetching grant:", error);
      res.status(500).json({ message: "Failed to fetch grant" });
    }
  });

  registerRoute(app, 'post', '/api/grants', requireAuth, requirePermission('grants:create'), async (req: any, res) => {
    try {
      const grantData = insertGrantSchema.parse({
        ...req.body,
        createdBy: req.user.claims.sub
      });
      const grant = await storage.createGrant(grantData);
      
      // Audit log
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'create',
        entityType: 'grant',
        entityId: grant.id,
        details: { grantName: grant.title, amount: grant.amount, status: grant.status }
      });
      
      res.status(201).json(grant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid grant data", errors: error.errors });
      }
      console.error("Error creating grant:", error);
      res.status(500).json({ message: "Failed to create grant" });
    }
  });

  registerRoute(app, 'put', '/api/grants/:id', requireAuth, requirePermission('grants:edit'), async (req: any, res) => {
    try {
      const grantData = insertGrantSchema.partial().parse(req.body);
      const grant = await storage.updateGrant(req.params.id, grantData);
      
      // Audit log
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'update',
        entityType: 'grant',
        entityId: grant.id,
        details: { changes: grantData }
      });
      
      res.json(grant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid grant data", errors: error.errors });
      }
      console.error("Error updating grant:", error);
      res.status(500).json({ message: "Failed to update grant" });
    }
  });

  registerRoute(app, 'delete', '/api/grants/:id', requireAuth, requirePermission('grants:delete'), async (req: any, res) => {
    try {
      await storage.deleteGrant(req.params.id);
      
      // Audit log
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'delete',
        entityType: 'grant',
        entityId: req.params.id,
        details: {}
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting grant:", error);
      res.status(500).json({ message: "Failed to delete grant" });
    }
  });

  // ==================================================
  // TEMPLATES CRUD ROUTES
  // ==================================================
  registerRoute(app, 'get', '/api/templates', requireAuth, requirePermission('templates:view'), async (req, res) => {
    try {
      const params = templateSearchSchema.parse(req.query);
      const templates = await storage.getTemplates(params);
      res.json(templates);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid query parameters", errors: error.errors });
      }
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  registerRoute(app, 'get', '/api/templates/:id', requireAuth, requirePermission('templates:view'), async (req, res) => {
    try {
      const template = await storage.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching template:", error);
      res.status(500).json({ message: "Failed to fetch template" });
    }
  });

  registerRoute(app, 'post', '/api/templates', requireAuth, requirePermission('templates:create'), async (req: any, res) => {
    try {
      const templateData = insertTemplateSchema.parse({
        ...req.body,
        createdBy: req.user.claims.sub
      });
      const template = await storage.createTemplate(templateData);
      
      // Audit log
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'create',
        entityType: 'template',
        entityId: template.id,
        details: { templateName: template.name, type: template.type }
      });
      
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid template data", errors: error.errors });
      }
      console.error("Error creating template:", error);
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  registerRoute(app, 'put', '/api/templates/:id', requireAuth, requirePermission('templates:edit'), async (req: any, res) => {
    try {
      const templateData = insertTemplateSchema.partial().parse(req.body);
      const template = await storage.updateTemplate(req.params.id, templateData);
      
      // Audit log
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'update',
        entityType: 'template',
        entityId: template.id,
        details: { changes: templateData }
      });
      
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid template data", errors: error.errors });
      }
      console.error("Error updating template:", error);
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  registerRoute(app, 'delete', '/api/templates/:id', requireAuth, requirePermission('templates:delete'), async (req: any, res) => {
    try {
      await storage.deleteTemplate(req.params.id);
      
      // Audit log
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'delete',
        entityType: 'template',
        entityId: req.params.id,
        details: {}
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ message: "Failed to delete template" });
    }
  });

  // ==================================================
  // DONOR SCORES CRUD ROUTES
  // ==================================================
  registerRoute(app, 'get', '/api/donor-scores', requireAuth, requirePermission('donors:view'), async (req, res) => {
    try {
      const params = {
        donorId: req.query.donorId as string,
        scoreType: req.query.scoreType as string,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      };
      const donorScores = await storage.getDonorScores(params);
      res.json(donorScores);
    } catch (error) {
      console.error("Error fetching donor scores:", error);
      res.status(500).json({ message: "Failed to fetch donor scores" });
    }
  });

  registerRoute(app, 'get', '/api/donor-scores/:id', requireAuth, requirePermission('donors:view'), async (req, res) => {
    try {
      const donorScore = await storage.getDonorScore(req.params.id);
      if (!donorScore) {
        return res.status(404).json({ message: "Donor score not found" });
      }
      res.json(donorScore);
    } catch (error) {
      console.error("Error fetching donor score:", error);
      res.status(500).json({ message: "Failed to fetch donor score" });
    }
  });

  registerRoute(app, 'post', '/api/donor-scores', requireAuth, requirePermission('donors:edit'), async (req: any, res) => {
    try {
      const donorScoreData = insertDonorScoreSchema.parse(req.body);
      const donorScore = await storage.createDonorScore(donorScoreData);
      
      // Audit log
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'create',
        entityType: 'donor_score',
        entityId: donorScore.id,
        details: { donorId: donorScore.donorId, scoreType: donorScore.scoreType, score: donorScore.score }
      });
      
      res.status(201).json(donorScore);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid donor score data", errors: error.errors });
      }
      console.error("Error creating donor score:", error);
      res.status(500).json({ message: "Failed to create donor score" });
    }
  });

  registerRoute(app, 'put', '/api/donor-scores/:id', requireAuth, requirePermission('donors:edit'), async (req: any, res) => {
    try {
      const donorScoreData = insertDonorScoreSchema.partial().parse(req.body);
      const donorScore = await storage.updateDonorScore(req.params.id, donorScoreData);
      
      // Audit log
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'update',
        entityType: 'donor_score',
        entityId: donorScore.id,
        details: { changes: donorScoreData }
      });
      
      res.json(donorScore);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid donor score data", errors: error.errors });
      }
      console.error("Error updating donor score:", error);
      res.status(500).json({ message: "Failed to update donor score" });
    }
  });

  registerRoute(app, 'delete', '/api/donor-scores/:id', requireAuth, requirePermission('donors:edit'), async (req: any, res) => {
    try {
      await storage.deleteDonorScore(req.params.id);
      
      // Audit log
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'delete',
        entityType: 'donor_score',
        entityId: req.params.id,
        details: {}
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting donor score:", error);
      res.status(500).json({ message: "Failed to delete donor score" });
    }
  });

  // ==================================================
  // ATTRIBUTION CRUD ROUTES
  // ==================================================
  registerRoute(app, 'get', '/api/attributions', requireAuth, requireAnalyticsAccess, async (req, res) => {
    try {
      const params = {
        donorId: req.query.donorId as string,
        donationId: req.query.donationId as string,
        campaignId: req.query.campaignId as string,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      };
      const attributions = await storage.getAttributions(params);
      res.json(attributions);
    } catch (error) {
      console.error("Error fetching attributions:", error);
      res.status(500).json({ message: "Failed to fetch attributions" });
    }
  });

  registerRoute(app, 'get', '/api/attributions/:id', requireAuth, requireAnalyticsAccess, async (req, res) => {
    try {
      const attribution = await storage.getAttribution(req.params.id);
      if (!attribution) {
        return res.status(404).json({ message: "Attribution not found" });
      }
      res.json(attribution);
    } catch (error) {
      console.error("Error fetching attribution:", error);
      res.status(500).json({ message: "Failed to fetch attribution" });
    }
  });

  registerRoute(app, 'post', '/api/attributions', requireAuth, requirePermission('analytics:edit'), async (req: any, res) => {
    try {
      const attributionData = insertAttributionSchema.parse(req.body);
      const attribution = await storage.createAttribution(attributionData);
      
      // Audit log
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'create',
        entityType: 'attribution',
        entityId: attribution.id,
        details: { donorId: attribution.donorId, campaignId: attribution.campaignId }
      });
      
      res.status(201).json(attribution);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid attribution data", errors: error.errors });
      }
      console.error("Error creating attribution:", error);
      res.status(500).json({ message: "Failed to create attribution" });
    }
  });

  registerRoute(app, 'put', '/api/attributions/:id', requireAuth, requirePermission('analytics:edit'), async (req: any, res) => {
    try {
      const attributionData = insertAttributionSchema.partial().parse(req.body);
      const attribution = await storage.updateAttribution(req.params.id, attributionData);
      
      // Audit log
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'update',
        entityType: 'attribution',
        entityId: attribution.id,
        details: { changes: attributionData }
      });
      
      res.json(attribution);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid attribution data", errors: error.errors });
      }
      console.error("Error updating attribution:", error);
      res.status(500).json({ message: "Failed to update attribution" });
    }
  });

  registerRoute(app, 'delete', '/api/attributions/:id', requireAuth, requirePermission('analytics:edit'), async (req: any, res) => {
    try {
      await storage.deleteAttribution(req.params.id);
      
      // Audit log
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'delete',
        entityType: 'attribution',
        entityId: req.params.id,
        details: {}
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting attribution:", error);
      res.status(500).json({ message: "Failed to delete attribution" });
    }
  });

  // ==================================================
  // AUDIT LOGS READ-ONLY ROUTES
  // ==================================================
  registerRoute(app, 'get', '/api/audit-logs', requireAuth, requireAdmin, async (req, res) => {
    try {
      const params = auditLogSearchSchema.parse(req.query);
      const auditLogs = await storage.getAuditLogs(params);
      res.json(auditLogs);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid query parameters", errors: error.errors });
      }
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  registerRoute(app, 'get', '/api/audit-logs/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const auditLog = await storage.getAuditLog(req.params.id);
      if (!auditLog) {
        return res.status(404).json({ message: "Audit log not found" });
      }
      res.json(auditLog);
    } catch (error) {
      console.error("Error fetching audit log:", error);
      res.status(500).json({ message: "Failed to fetch audit log" });
    }
  });

  const httpServer = createServer(app);
  
  // Log successful route registration
  console.log(`✅ Routes registered successfully:`);
  console.log(`   - Total routes: ${registeredRoutes.length}`);
  console.log(`   - Import routes: ${registeredRoutes.filter(r => r.path.startsWith('/api/import')).length}`);
  console.log(`   - Debug endpoint available at: /api/debug/routes`);
  
  // Log import routes specifically
  const importRoutes = registeredRoutes.filter(r => r.path.startsWith('/api/import'));
  console.log('📋 Import endpoints registered:');
  importRoutes.forEach(route => {
    console.log(`   ${route.method} ${route.path}`);
  });
  
  // Initialize background worker
  console.log('🔧 Background import worker initialized');
  
  return httpServer;
}

// Enhanced background import job processor
async function startBackgroundImportJob(
  jobId: string,
  fileBuffer: Buffer,
  fileName: string
) {
  // Process in background (don't await)
  processImportJobAsync(jobId, fileBuffer, fileName).catch(error => {
    console.error(`Background import job ${jobId} failed:`, error);
  });
}

async function processImportJobAsync(
  jobId: string,
  fileBuffer: Buffer,
  fileName: string
) {
  try {
    // Start the job
    await storage.startImportJob(jobId);
    
    // Process with chunked batches for memory efficiency and transaction safety
    await storage.processImportJobInBatches(jobId, fileBuffer, fileName, 100); // 100 rows per batch
    
  } catch (error) {
    console.error(`Import job ${jobId} processing failed:`, error);
    
    // Update job status to failed if not already handled
    try {
      const job = await storage.getImportJob(jobId);
      if (job && !['completed', 'cancelled', 'failed'].includes(job.status)) {
        await storage.updateImportJob(jobId, {
          status: 'failed',
          completedAt: new Date(),
          errors: [{
            error: error instanceof Error ? error.message : 'Unknown processing error',
            timestamp: new Date().toISOString(),
          }]
        });
      }
    } catch (updateError) {
      console.error(`Failed to update job ${jobId} status:`, updateError);
    }
  }
}

// Legacy background processing function (deprecated)
async function processDataImport(
  file: Express.Multer.File,
  fieldMapping: Record<string, string>,
  options: any,
  importId: string,
  userId: string
) {
  try {
    let data: any[] = [];
    
    // Parse file
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      const csvText = file.buffer.toString('utf-8');
      const parseResult = Papa.parse(csvText, { header: true, skipEmptyLines: true });
      data = parseResult.data;
    } else {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_json(sheet);
    }

    await storage.updateDataImport(importId, {
      totalRows: data.length,
      processedRows: 0,
    });

    let successfulRows = 0;
    let errorRows = 0;
    const errors: any[] = [];

    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i];
        
        // Map fields according to field mapping
        const donorData: any = {};
        for (const [dbField, csvField] of Object.entries(fieldMapping)) {
          if (row[csvField]) {
            donorData[dbField] = row[csvField];
          }
        }

        // Validate required fields
        if (!donorData.firstName || !donorData.lastName) {
          errors.push({
            row: i + 1,
            error: "Missing required fields: firstName or lastName",
            data: row,
          });
          errorRows++;
          continue;
        }

        // Check for duplicates if option is enabled
        if (options.skipDuplicates) {
          const duplicates = await storage.findDuplicateDonors(
            donorData.email,
            donorData.firstName,
            donorData.lastName
          );
          
          if (duplicates.length > 0) {
            errors.push({
              row: i + 1,
              error: "Duplicate donor found",
              data: row,
            });
            errorRows++;
            continue;
          }
        }

        // Create donor
        await storage.createDonor(donorData);
        successfulRows++;

      } catch (error) {
        errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : "Unknown error",
          data: data[i],
        });
        errorRows++;
      }

      // Update progress every 10 rows
      if (i % 10 === 0) {
        await storage.updateDataImport(importId, {
          processedRows: i + 1,
          successfulRows,
          errorRows,
        });
      }
    }

    // Final update
    await storage.updateDataImport(importId, {
      processedRows: data.length,
      successfulRows,
      errorRows,
      status: 'completed',
      errors,
      completedAt: new Date(),
    });

  } catch (error) {
    console.error("Error processing import:", error);
    await storage.updateDataImport(importId, {
      status: 'failed',
      errors: [{ error: error instanceof Error ? error.message : "Processing failed" }],
      completedAt: new Date(),
    });
  }
}
