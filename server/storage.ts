import {
  users,
  donors,
  campaigns,
  donations,
  segments,
  segmentDefinitions,
  communications,
  dataImports,
  importJobs,
  auditLogs,
  workflows,
  experiments,
  grants,
  templates,
  donorScores,
  attributions,
  type User,
  type UpsertUser,
  type Donor,
  type InsertDonor,
  type Campaign,
  type InsertCampaign,
  type Donation,
  type InsertDonation,
  type Segment,
  type InsertSegment,
  type SegmentDefinition,
  type InsertSegmentDefinition,
  type Communication,
  type InsertCommunication,
  type DataImport,
  type ImportJob,
  type Workflow,
  type InsertWorkflow,
  type Experiment,
  type InsertExperiment,
  type Grant,
  type InsertGrant,
  type Template,
  type InsertTemplate,
  type DonorScore,
  type InsertDonorScore,
  type Attribution,
  type InsertAttribution,
  type AuditLog,
  type SegmentQuery,
  type SegmentRule,
  type SegmentGroup,
  type SegmentSearch,
  insertImportJobSchema,
  insertAuditLogSchema,
} from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { eq, and, or, like, desc, asc, sql, count, sum, avg, isNull } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Donor operations
  getDonors(params: {
    search?: string;
    donorType?: string;
    engagementLevel?: string;
    giftSizeTier?: string;
    page?: number;
    limit?: number;
  }): Promise<{ donors: Donor[]; total: number }>;
  getDonor(id: string): Promise<Donor | undefined>;
  createDonor(donor: InsertDonor): Promise<Donor>;
  updateDonor(id: string, donor: Partial<InsertDonor>): Promise<Donor>;
  deleteDonor(id: string): Promise<void>;
  
  // Campaign operations
  getCampaigns(params: {
    search?: string;
    status?: string;
    campaignType?: string;
    page?: number;
    limit?: number;
  }): Promise<{ campaigns: Campaign[]; total: number }>;
  getCampaign(id: string): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, campaign: Partial<InsertCampaign>): Promise<Campaign>;
  deleteCampaign(id: string): Promise<void>;
  
  // Donation operations
  getDonations(params: {
    search?: string;
    donorId?: string;
    campaignId?: string;
    paymentMethod?: string;
    startDate?: Date;
    endDate?: Date;
    minAmount?: number;
    maxAmount?: number;
    page?: number;
    limit?: number;
  }): Promise<{ donations: (Donation & { donor: Donor; campaign?: Campaign })[]; total: number }>;
  getDonation(id: string): Promise<(Donation & { donor: Donor; campaign?: Campaign }) | undefined>;
  createDonation(donation: InsertDonation): Promise<Donation>;
  updateDonation(id: string, donation: Partial<InsertDonation>): Promise<Donation>;
  deleteDonation(id: string): Promise<void>;
  
  // Analytics operations
  getDashboardMetrics(dateRange?: { start: Date; end: Date }): Promise<{
    totalRaised: number;
    donorRetention: number;
    averageGiftSize: number;
    campaignROI: number;
    donorCount: number;
    activeCampaigns: number;
  }>;
  
  getDonationTrends(months: number): Promise<Array<{ month: string; amount: number }>>;
  getRecentDonors(limit: number): Promise<Array<Donation & { donor: Donor }>>;
  getDonorSegmentStats(): Promise<Array<{
    segment: string;
    count: number;
    change: number;
  }>>;
  
  // Segment operations
  getSegments(): Promise<Segment[]>;
  createSegment(segment: InsertSegment): Promise<Segment>;
  updateSegment(id: string, segment: Partial<InsertSegment>): Promise<Segment>;
  deleteSegment(id: string): Promise<void>;
  
  // Segment Definition operations (advanced segments)
  getSegmentDefinitions(params: SegmentSearch): Promise<{ segmentDefinitions: SegmentDefinition[]; total: number }>;
  getSegmentDefinition(id: string): Promise<SegmentDefinition | undefined>;
  createSegmentDefinition(segmentDefinition: InsertSegmentDefinition): Promise<SegmentDefinition>;
  updateSegmentDefinition(id: string, segmentDefinition: Partial<InsertSegmentDefinition>): Promise<SegmentDefinition>;
  deleteSegmentDefinition(id: string): Promise<void>;
  executeSegmentQuery(query: SegmentQuery): Promise<{ donors: Donor[]; total: number }>;
  calculateSegmentCount(query: SegmentQuery): Promise<number>;
  refreshSegmentDefinition(id: string): Promise<SegmentDefinition>;
  getSegmentDefinitionDonors(id: string, page?: number, limit?: number): Promise<{ donors: Donor[]; total: number }>;
  
  // Communication operations
  getCommunications(params: {
    search?: string;
    type?: string;
    status?: string;
    donorId?: string;
    segmentId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ communications: Communication[]; total: number }>;
  getCommunication(id: string): Promise<Communication | undefined>;
  createCommunication(communication: InsertCommunication): Promise<Communication>;
  updateCommunication(id: string, communication: Partial<InsertCommunication>): Promise<Communication>;
  deleteCommunication(id: string): Promise<void>;
  
  // Data import operations (legacy)
  createDataImport(importData: Omit<DataImport, 'id' | 'createdAt' | 'completedAt'>): Promise<DataImport>;
  updateDataImport(id: string, updates: Partial<DataImport>): Promise<DataImport>;
  getDataImports(userId: string): Promise<DataImport[]>;
  
  // Import Job operations (new background job system)
  createImportJob(jobData: z.infer<typeof insertImportJobSchema>): Promise<ImportJob>;
  updateImportJob(id: string, updates: Partial<ImportJob>): Promise<ImportJob>;
  getImportJob(id: string): Promise<ImportJob | undefined>;
  getImportJobs(userId: string, limit?: number): Promise<ImportJob[]>;
  startImportJob(id: string): Promise<void>;
  cancelImportJob(id: string, reason?: string): Promise<void>;
  
  // Duplicate detection
  findDuplicateDonors(email?: string, firstName?: string, lastName?: string): Promise<Donor[]>;
  findAdvancedDuplicates(candidate: Record<string, any>, strategies?: string[]): Promise<Array<{
    donor: Donor;
    matchScore: number;
    matchReasons: string[];
    confidence: 'high' | 'medium' | 'low';
  }>>;
  
  // Workflow operations
  getWorkflows(params: {
    search?: string;
    status?: string;
    triggerType?: string;
    createdBy?: string;
    page?: number;
    limit?: number;
  }): Promise<{ workflows: Workflow[]; total: number }>;
  getWorkflow(id: string): Promise<Workflow | undefined>;
  createWorkflow(workflow: InsertWorkflow): Promise<Workflow>;
  updateWorkflow(id: string, workflow: Partial<InsertWorkflow>): Promise<Workflow>;
  deleteWorkflow(id: string): Promise<void>;
  
  // Experiment operations
  getExperiments(params: {
    search?: string;
    status?: string;
    targetSegmentId?: string;
    createdBy?: string;
    page?: number;
    limit?: number;
  }): Promise<{ experiments: Experiment[]; total: number }>;
  getExperiment(id: string): Promise<Experiment | undefined>;
  createExperiment(experiment: InsertExperiment): Promise<Experiment>;
  updateExperiment(id: string, experiment: Partial<InsertExperiment>): Promise<Experiment>;
  deleteExperiment(id: string): Promise<void>;
  
  // Grant operations
  getGrants(params: {
    search?: string;
    status?: string;
    type?: string;
    campaignId?: string;
    assignedTo?: string;
    page?: number;
    limit?: number;
  }): Promise<{ grants: Grant[]; total: number }>;
  getGrant(id: string): Promise<Grant | undefined>;
  createGrant(grant: InsertGrant): Promise<Grant>;
  updateGrant(id: string, grant: Partial<InsertGrant>): Promise<Grant>;
  deleteGrant(id: string): Promise<void>;
  
  // Template operations
  getTemplates(params: {
    search?: string;
    type?: string;
    createdBy?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ templates: Template[]; total: number }>;
  getTemplate(id: string): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: string, template: Partial<InsertTemplate>): Promise<Template>;
  deleteTemplate(id: string): Promise<void>;
  
  // Donor Score operations
  getDonorScores(params: {
    donorId?: string;
    scoreType?: string;
    page?: number;
    limit?: number;
  }): Promise<{ donorScores: DonorScore[]; total: number }>;
  getDonorScore(id: string): Promise<DonorScore | undefined>;
  createDonorScore(donorScore: InsertDonorScore): Promise<DonorScore>;
  updateDonorScore(id: string, donorScore: Partial<InsertDonorScore>): Promise<DonorScore>;
  deleteDonorScore(id: string): Promise<void>;
  
  // Attribution operations
  getAttributions(params: {
    donorId?: string;
    donationId?: string;
    campaignId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ attributions: Attribution[]; total: number }>;
  getAttribution(id: string): Promise<Attribution | undefined>;
  createAttribution(attribution: InsertAttribution): Promise<Attribution>;
  updateAttribution(id: string, attribution: Partial<InsertAttribution>): Promise<Attribution>;
  deleteAttribution(id: string): Promise<void>;
  
  // Audit log operations (viewing only)
  getAuditLogs(params: {
    search?: string;
    action?: string;
    entityType?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ auditLogs: AuditLog[]; total: number }>;
  getAuditLog(id: string): Promise<AuditLog | undefined>;
  
  // Audit logging
  createAuditLog(auditLog: z.infer<typeof insertAuditLogSchema>): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Donor operations
  async getDonors(params: {
    search?: string;
    donorType?: string;
    engagementLevel?: string;
    giftSizeTier?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 25));
    const offset = (page - 1) * limit;
    let whereConditions: any[] = [eq(donors.isActive, true)];

    if (params.search) {
      whereConditions.push(
        or(
          like(donors.firstName, `%${params.search}%`),
          like(donors.lastName, `%${params.search}%`),
          like(donors.email, `%${params.search}%`)
        )
      );
    }

    if (params.donorType) {
      whereConditions.push(eq(donors.donorType, params.donorType as any));
    }

    if (params.engagementLevel) {
      whereConditions.push(eq(donors.engagementLevel, params.engagementLevel as any));
    }

    if (params.giftSizeTier) {
      whereConditions.push(eq(donors.giftSizeTier, params.giftSizeTier as any));
    }

    const whereClause = whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0];

    const [donorList, totalCount] = await Promise.all([
      db.select().from(donors).where(whereClause).limit(limit).offset(offset).orderBy(desc(donors.createdAt)),
      db.select({ count: count() }).from(donors).where(whereClause),
    ]);

    return {
      donors: donorList,
      total: totalCount[0].count,
    };
  }

  async getDonor(id: string): Promise<Donor | undefined> {
    const [donor] = await db.select().from(donors).where(eq(donors.id, id));
    return donor;
  }

  async createDonor(donor: InsertDonor): Promise<Donor> {
    const [newDonor] = await db.insert(donors).values(donor).returning();
    return newDonor;
  }

  async updateDonor(id: string, donor: Partial<InsertDonor>): Promise<Donor> {
    const [updatedDonor] = await db
      .update(donors)
      .set({ ...donor, updatedAt: new Date() })
      .where(eq(donors.id, id))
      .returning();
    return updatedDonor;
  }

  async deleteDonor(id: string): Promise<void> {
    await db.update(donors).set({ isActive: false }).where(eq(donors.id, id));
  }

  // Campaign operations
  async getCampaigns(params: {
    search?: string;
    status?: string;
    campaignType?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 25));
    const offset = (page - 1) * limit;
    let whereConditions: any[] = [eq(campaigns.isActive, true)];

    if (params.search) {
      whereConditions.push(like(campaigns.name, `%${params.search}%`));
    }

    if (params.status) {
      whereConditions.push(eq(campaigns.status, params.status));
    }

    if (params.campaignType) {
      whereConditions.push(eq(campaigns.campaignType, params.campaignType));
    }

    const whereClause = whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0];

    const [campaignList, totalCount] = await Promise.all([
      db.select().from(campaigns).where(whereClause).limit(limit).offset(offset).orderBy(desc(campaigns.createdAt)),
      db.select({ count: count() }).from(campaigns).where(whereClause),
    ]);

    return {
      campaigns: campaignList,
      total: totalCount[0].count,
    };
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign;
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [newCampaign] = await db.insert(campaigns).values(campaign).returning();
    return newCampaign;
  }

  async updateCampaign(id: string, campaign: Partial<InsertCampaign>): Promise<Campaign> {
    const [updatedCampaign] = await db
      .update(campaigns)
      .set({ ...campaign, updatedAt: new Date() })
      .where(eq(campaigns.id, id))
      .returning();
    return updatedCampaign;
  }

  async deleteCampaign(id: string): Promise<void> {
    await db.update(campaigns).set({ isActive: false }).where(eq(campaigns.id, id));
  }

  // Donation operations
  async getDonations(params: {
    search?: string;
    donorId?: string;
    campaignId?: string;
    paymentMethod?: string;
    startDate?: Date;
    endDate?: Date;
    minAmount?: number;
    maxAmount?: number;
    page?: number;
    limit?: number;
  } = {}) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 25));
    const offset = (page - 1) * limit;
    let whereConditions: any[] = [];

    if (params.search) {
      whereConditions.push(
        or(
          like(donors.firstName, `%${params.search}%`),
          like(donors.lastName, `%${params.search}%`),
          like(donors.email, `%${params.search}%`),
          like(campaigns.name, `%${params.search}%`)
        )
      );
    }

    if (params.donorId) {
      whereConditions.push(eq(donations.donorId, params.donorId));
    }

    if (params.campaignId) {
      whereConditions.push(eq(donations.campaignId, params.campaignId));
    }

    if (params.paymentMethod) {
      whereConditions.push(eq(donations.paymentMethod, params.paymentMethod));
    }

    if (params.startDate) {
      whereConditions.push(sql`${donations.date} >= ${params.startDate}`);
    }

    if (params.endDate) {
      whereConditions.push(sql`${donations.date} <= ${params.endDate}`);
    }

    if (params.minAmount) {
      whereConditions.push(sql`${donations.amount} >= ${params.minAmount}`);
    }

    if (params.maxAmount) {
      whereConditions.push(sql`${donations.amount} <= ${params.maxAmount}`);
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [donationList, totalCount] = await Promise.all([
      db
        .select({
          donation: donations,
          donor: donors,
          campaign: campaigns,
        })
        .from(donations)
        .leftJoin(donors, eq(donations.donorId, donors.id))
        .leftJoin(campaigns, eq(donations.campaignId, campaigns.id))
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(donations.date)),
      db.select({ count: count() }).from(donations).where(whereClause),
    ]);

    return {
      donations: donationList.map(row => ({
        ...row.donation,
        donor: row.donor!,
        campaign: row.campaign || undefined,
      })),
      total: totalCount[0].count,
    };
  }

  async getDonation(id: string): Promise<(Donation & { donor: Donor; campaign?: Campaign }) | undefined> {
    const [result] = await db
      .select({
        donation: donations,
        donor: donors,
        campaign: campaigns,
      })
      .from(donations)
      .leftJoin(donors, eq(donations.donorId, donors.id))
      .leftJoin(campaigns, eq(donations.campaignId, campaigns.id))
      .where(eq(donations.id, id));

    if (!result) return undefined;

    return {
      ...result.donation,
      donor: result.donor!,
      campaign: result.campaign || undefined,
    };
  }

  async createDonation(donation: InsertDonation): Promise<Donation> {
    const [newDonation] = await db.insert(donations).values(donation).returning();
    
    // Update donor analytics
    await this.updateDonorAnalytics(donation.donorId);
    
    // Update campaign raised amount if campaign exists
    if (donation.campaignId) {
      await this.updateCampaignRaised(donation.campaignId);
    }
    
    return newDonation;
  }

  async updateDonation(id: string, donation: Partial<InsertDonation>): Promise<Donation> {
    const [updatedDonation] = await db
      .update(donations)
      .set({ ...donation, updatedAt: new Date() })
      .where(eq(donations.id, id))
      .returning();
    
    // Update donor analytics if donor changed
    if (donation.donorId) {
      await this.updateDonorAnalytics(donation.donorId);
    }
    
    // Update campaign raised amount if campaign changed  
    if (donation.campaignId) {
      await this.updateCampaignRaised(donation.campaignId);
    }
    
    return updatedDonation;
  }

  async deleteDonation(id: string): Promise<void> {
    // Get donation details before deletion for analytics update
    const donation = await this.getDonation(id);
    
    // Soft delete the donation
    await db.delete(donations).where(eq(donations.id, id));
    
    // Update analytics
    if (donation) {
      await this.updateDonorAnalytics(donation.donorId);
      if (donation.campaignId) {
        await this.updateCampaignRaised(donation.campaignId);
      }
    }
  }

  // Analytics operations
  async getDashboardMetrics(dateRange?: { start: Date; end: Date }) {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31);
    
    const start = dateRange?.start || startOfYear;
    const end = dateRange?.end || endOfYear;

    // Get current period metrics
    const currentMetrics = await db
      .select({
        totalRaised: sum(donations.amount),
        donorCount: count(sql`DISTINCT ${donations.donorId}`),
        averageGiftSize: avg(donations.amount),
      })
      .from(donations)
      .where(and(
        sql`${donations.date} >= ${start}`,
        sql`${donations.date} <= ${end}`
      ));

    // Get previous period for comparison (same duration, previous period)
    const periodDuration = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - periodDuration);
    const prevEnd = new Date(end.getTime() - periodDuration);

    const previousMetrics = await db
      .select({
        totalRaised: sum(donations.amount),
        donorCount: count(sql`DISTINCT ${donations.donorId}`),
      })
      .from(donations)
      .where(and(
        sql`${donations.date} >= ${prevStart}`,
        sql`${donations.date} <= ${prevEnd}`
      ));

    // Calculate retention rate (donors who gave this year and last year)
    const retentionQuery = await db
      .select({
        currentDonors: count(sql`DISTINCT ${donations.donorId}`),
      })
      .from(donations)
      .where(and(
        sql`${donations.date} >= ${start}`,
        sql`${donations.date} <= ${end}`,
        sql`${donations.donorId} IN (
          SELECT DISTINCT donor_id FROM donations 
          WHERE date >= ${prevStart} AND date <= ${prevEnd}
        )`
      ));

    const currentTotal = Number(currentMetrics[0].totalRaised || 0);
    const previousTotal = Number(previousMetrics[0].totalRaised || 0);
    const currentDonorCount = Number(currentMetrics[0].donorCount || 0);
    const previousDonorCount = Number(previousMetrics[0].donorCount || 0);
    const retainedDonors = Number(retentionQuery[0].currentDonors || 0);

    const donorRetention = previousDonorCount > 0 ? (retainedDonors / previousDonorCount) * 100 : 0;
    
    // Calculate real aggregate campaign ROI
    const campaignTotalsQuery = await db
      .select({
        totalRaised: sum(campaigns.raised),
        totalCost: sum(campaigns.campaignCost),
      })
      .from(campaigns)
      .where(eq(campaigns.status, 'active'));
    
    const totals = campaignTotalsQuery[0];
    const totalRaisedCampaigns = Number(totals?.totalRaised || 0);
    const totalCostCampaigns = Number(totals?.totalCost || 0);
    
    let campaignROI = 0;
    if (totalCostCampaigns > 0) {
      campaignROI = ((totalRaisedCampaigns - totalCostCampaigns) / totalCostCampaigns) * 100;
    } else if (totalRaisedCampaigns > 0) {
      // Estimate 20% cost ratio if no costs are tracked
      const estimatedCosts = totalRaisedCampaigns * 0.20;
      campaignROI = ((totalRaisedCampaigns - estimatedCosts) / estimatedCosts) * 100;
    }

    // Get active campaigns count
    const activeCampaignsCount = await db
      .select({ count: count() })
      .from(campaigns)
      .where(eq(campaigns.status, 'active'));

    return {
      totalRaised: currentTotal,
      donorRetention: Math.round(donorRetention * 10) / 10,
      averageGiftSize: Math.round(Number(currentMetrics[0].averageGiftSize || 0)),
      campaignROI: campaignROI,
      donorCount: currentDonorCount,
      activeCampaigns: Number(activeCampaignsCount[0].count),
    };
  }

  async getDonationTrends(months: number) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - months);

    const trends = await db
      .select({
        month: sql`TO_CHAR(${donations.date}, 'Mon')`,
        amount: sum(donations.amount),
      })
      .from(donations)
      .where(and(
        sql`${donations.date} >= ${startDate}`,
        sql`${donations.date} <= ${endDate}`
      ))
      .groupBy(sql`TO_CHAR(${donations.date}, 'Mon'), EXTRACT(MONTH FROM ${donations.date})`)
      .orderBy(sql`EXTRACT(MONTH FROM ${donations.date})`);

    return trends.map(trend => ({
      month: trend.month as string,
      amount: Number(trend.amount || 0),
    }));
  }

  async getRecentDonors(limit: number) {
    const recentDonations = await db
      .select({
        donation: donations,
        donor: donors,
      })
      .from(donations)
      .leftJoin(donors, eq(donations.donorId, donors.id))
      .orderBy(desc(donations.createdAt))
      .limit(limit);

    return recentDonations.map(row => ({
      ...row.donation,
      donor: row.donor!,
    }));
  }

  async getDonorSegmentStats() {
    const currentDate = new Date();
    const thirtyDaysAgo = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(currentDate.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Get current segment counts (using actual engagement levels from the database)
    const currentStats = await db
      .select({
        engagementLevel: donors.engagementLevel,
        count: count(),
      })
      .from(donors)
      .where(eq(donors.isActive, true))
      .groupBy(donors.engagementLevel);

    // For previous period, we'll use a simpler approach that tracks actual stored engagement levels
    // from 30 days ago by looking at when donors were last updated to have those engagement levels
    // Since we don't have historical snapshots, we'll estimate based on donation patterns
    
    // Get donation patterns for the previous period (30-60 days ago)
    const donorActivityInPrevPeriod = await db
      .select({
        donorId: donations.donorId,
        firstDonation: sql`MIN(${donations.date})`.as('first_donation'),
        lastDonation: sql`MAX(${donations.date})`.as('last_donation'),
      })
      .from(donations)
      .where(
        sql`${donations.date} >= ${sixtyDaysAgo} AND ${donations.date} < ${thirtyDaysAgo}`
      )
      .groupBy(donations.donorId);

    // Classify donors based on their previous period activity
    const classifyDonorEngagement = (firstDonation: string, lastDonation: string) => {
      const first = new Date(firstDonation);
      const last = new Date(lastDonation);
      const daysSinceFirst = (sixtyDaysAgo.getTime() - first.getTime()) / (24 * 60 * 60 * 1000);
      const daysSinceLast = (thirtyDaysAgo.getTime() - last.getTime()) / (24 * 60 * 60 * 1000);

      if (daysSinceFirst <= 30) return 'new';
      if (daysSinceLast <= 30) return 'active';
      if (daysSinceLast <= 90) return 'engaged';
      if (daysSinceLast <= 180) return 'at_risk';
      return 'lapsed';
    };

    // Count previous period segments
    const previousSegmentCounts = new Map<string, number>();
    const allEngagementLevels = ['new', 'active', 'engaged', 'at_risk', 'lapsed'];
    
    // Initialize all counts to 0
    allEngagementLevels.forEach(level => previousSegmentCounts.set(level, 0));

    // Count donors by their previous period classification
    for (const activity of donorActivityInPrevPeriod) {
      const engagement = classifyDonorEngagement(
        activity.firstDonation as string,
        activity.lastDonation as string
      );
      previousSegmentCounts.set(engagement, (previousSegmentCounts.get(engagement) || 0) + 1);
    }

    // Map current stats and calculate changes
    return allEngagementLevels.map(level => {
      const currentStat = currentStats.find(stat => stat.engagementLevel === level);
      const currentCount = Number(currentStat?.count || 0);
      const previousCount = previousSegmentCounts.get(level) || 0;
      
      // Calculate percentage change
      let change = 0;
      if (previousCount > 0) {
        change = Math.round(((currentCount - previousCount) / previousCount) * 100);
      } else if (currentCount > 0) {
        change = 100; // New segment with donors
      }

      return {
        segment: level,
        count: currentCount,
        change: change,
      };
    }).filter(stat => stat.count > 0 || stat.change !== 0); // Only return segments with data
  }

  // Segment operations
  async getSegments(): Promise<Segment[]> {
    return await db.select().from(segments).where(eq(segments.isActive, true));
  }

  async createSegment(segment: InsertSegment): Promise<Segment> {
    const [newSegment] = await db.insert(segments).values(segment).returning();
    return newSegment;
  }

  async updateSegment(id: string, segment: Partial<InsertSegment>): Promise<Segment> {
    const [updatedSegment] = await db
      .update(segments)
      .set({ ...segment, updatedAt: new Date() })
      .where(eq(segments.id, id))
      .returning();
    return updatedSegment;
  }

  async deleteSegment(id: string): Promise<void> {
    await db.update(segments).set({ isActive: false }).where(eq(segments.id, id));
  }

  // Segment Definition operations (advanced segments)
  async getSegmentDefinitions(params: SegmentSearch): Promise<{ segmentDefinitions: SegmentDefinition[]; total: number }> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 25));
    const offset = (page - 1) * limit;
    let whereConditions: any[] = [eq(segmentDefinitions.isActive, true)];

    if (params.search) {
      whereConditions.push(
        or(
          like(segmentDefinitions.name, `%${params.search}%`),
          like(segmentDefinitions.description, `%${params.search}%`)
        )
      );
    }

    if (params.createdBy) {
      whereConditions.push(eq(segmentDefinitions.createdBy, params.createdBy));
    }

    if (params.tags && params.tags.length > 0) {
      // Use PostgreSQL JSONB contains operator for tag filtering
      whereConditions.push(
        sql`${segmentDefinitions.tags}::jsonb ?| array[${params.tags.map(tag => `'${tag}'`).join(',')}]`
      );
    }

    const whereClause = whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0];

    const [segmentList, totalCount] = await Promise.all([
      db.select().from(segmentDefinitions).where(whereClause).limit(limit).offset(offset).orderBy(desc(segmentDefinitions.createdAt)),
      db.select({ count: count() }).from(segmentDefinitions).where(whereClause),
    ]);

    return {
      segmentDefinitions: segmentList,
      total: totalCount[0].count,
    };
  }

  async getSegmentDefinition(id: string): Promise<SegmentDefinition | undefined> {
    const [segmentDefinition] = await db.select().from(segmentDefinitions).where(eq(segmentDefinitions.id, id));
    return segmentDefinition;
  }

  async createSegmentDefinition(segmentDefinition: InsertSegmentDefinition): Promise<SegmentDefinition> {
    // Generate SQL query from the filter criteria
    const sqlQuery = this.generateSQLFromSegmentQuery(segmentDefinition.filterQuery as SegmentQuery);
    
    // Calculate initial donor count
    const estimatedCount = await this.calculateSegmentCount(segmentDefinition.filterQuery as SegmentQuery);
    
    const [newSegmentDefinition] = await db
      .insert(segmentDefinitions)
      .values({
        ...segmentDefinition,
        sqlQuery,
        estimatedCount,
        lastCalculated: new Date(),
      })
      .returning();
    
    return newSegmentDefinition;
  }

  async updateSegmentDefinition(id: string, segmentDefinition: Partial<InsertSegmentDefinition>): Promise<SegmentDefinition> {
    let updateData = { ...segmentDefinition, updatedAt: new Date() } as any;
    
    // If filter query is updated, regenerate SQL and recalculate count
    if (segmentDefinition.filterQuery) {
      updateData.sqlQuery = this.generateSQLFromSegmentQuery(segmentDefinition.filterQuery as SegmentQuery);
      updateData.estimatedCount = await this.calculateSegmentCount(segmentDefinition.filterQuery as SegmentQuery);
      updateData.lastCalculated = new Date();
    }
    
    const [updatedSegmentDefinition] = await db
      .update(segmentDefinitions)
      .set(updateData)
      .where(eq(segmentDefinitions.id, id))
      .returning();
    
    return updatedSegmentDefinition;
  }

  async deleteSegmentDefinition(id: string): Promise<void> {
    await db.update(segmentDefinitions).set({ isActive: false }).where(eq(segmentDefinitions.id, id));
  }

  async executeSegmentQuery(query: SegmentQuery): Promise<{ donors: Donor[]; total: number }> {
    const sqlCondition = this.buildSQLCondition(query);
    const whereClause = and(eq(donors.isActive, true), sqlCondition);
    
    const [donorList, totalCount] = await Promise.all([
      db.select().from(donors).where(whereClause).orderBy(desc(donors.createdAt)),
      db.select({ count: count() }).from(donors).where(whereClause),
    ]);

    return {
      donors: donorList,
      total: totalCount[0].count,
    };
  }

  async calculateSegmentCount(query: SegmentQuery): Promise<number> {
    const sqlCondition = this.buildSQLCondition(query);
    const whereClause = and(eq(donors.isActive, true), sqlCondition);
    
    const [result] = await db.select({ count: count() }).from(donors).where(whereClause);
    return result.count;
  }

  async refreshSegmentDefinition(id: string): Promise<SegmentDefinition> {
    const segmentDefinition = await this.getSegmentDefinition(id);
    if (!segmentDefinition) {
      throw new Error('Segment definition not found');
    }

    const estimatedCount = await this.calculateSegmentCount(segmentDefinition.filterQuery as SegmentQuery);
    
    const [updatedSegment] = await db
      .update(segmentDefinitions)
      .set({ 
        estimatedCount, 
        lastCalculated: new Date(),
        updatedAt: new Date()
      })
      .where(eq(segmentDefinitions.id, id))
      .returning();

    return updatedSegment;
  }

  async getSegmentDefinitionDonors(id: string, page = 1, limit = 25): Promise<{ donors: Donor[]; total: number }> {
    const segmentDefinition = await this.getSegmentDefinition(id);
    if (!segmentDefinition) {
      throw new Error('Segment definition not found');
    }

    const offset = (page - 1) * limit;
    const sqlCondition = this.buildSQLCondition(segmentDefinition.filterQuery as SegmentQuery);
    const whereClause = and(eq(donors.isActive, true), sqlCondition);
    
    const [donorList, totalCount] = await Promise.all([
      db.select().from(donors).where(whereClause).limit(limit).offset(offset).orderBy(desc(donors.createdAt)),
      db.select({ count: count() }).from(donors).where(whereClause),
    ]);

    return {
      donors: donorList,
      total: totalCount[0].count,
    };
  }

  // Dynamic SQL query generation engine
  private generateSQLFromSegmentQuery(query: SegmentQuery): string {
    return `SELECT * FROM donors WHERE is_active = true AND (${this.buildSQLConditionString(query)})`;
  }

  private buildSQLCondition(query: SegmentQuery): any {
    return this.processCriteria(query);
  }

  private buildSQLConditionString(query: SegmentQuery): string {
    const condition = this.processCriteriaString(query);
    return query.not ? `NOT (${condition})` : condition;
  }

  private processCriteria(criteria: SegmentQuery | SegmentGroup): any {
    if ('rules' in criteria) {
      const conditions = criteria.rules.map(rule => {
        if ('field' in rule) {
          return this.buildRuleCondition(rule as SegmentRule);
        } else {
          return this.processCriteria(rule as SegmentGroup);
        }
      });

      const combined = criteria.combinator === 'and' ? and(...conditions) : or(...conditions);
      return criteria.not ? sql`NOT (${combined})` : combined;
    }
    
    throw new Error('Invalid criteria structure');
  }

  private processCriteriaString(criteria: SegmentQuery | SegmentGroup): string {
    if ('rules' in criteria) {
      const conditions = criteria.rules.map(rule => {
        if ('field' in rule) {
          return this.buildRuleConditionString(rule as SegmentRule);
        } else {
          return `(${this.processCriteriaString(rule as SegmentGroup)})`;
        }
      });

      const combined = conditions.join(` ${criteria.combinator.toUpperCase()} `);
      return criteria.not ? `NOT (${combined})` : combined;
    }
    
    throw new Error('Invalid criteria structure');
  }

  private buildRuleCondition(rule: SegmentRule): any {
    const field = this.getFieldMapping(rule.field);
    const value = rule.value;

    switch (rule.operator) {
      case 'equals':
        return eq(field, value as any);
      case 'not_equals':
        return sql`${field} != ${value}`;
      case 'greater_than':
        return sql`${field} > ${value}`;
      case 'less_than':
        return sql`${field} < ${value}`;
      case 'greater_than_or_equal':
        return sql`${field} >= ${value}`;
      case 'less_than_or_equal':
        return sql`${field} <= ${value}`;
      case 'contains':
        return like(field, `%${value}%`);
      case 'not_contains':
        return sql`${field} NOT LIKE '%${value}%'`;
      case 'in':
        return sql`${field} = ANY(${JSON.stringify(value)})`;
      case 'not_in':
        return sql`${field} != ALL(${JSON.stringify(value)})`;
      case 'between':
        const [min, max] = value as [number, number];
        return sql`${field} BETWEEN ${min} AND ${max}`;
      case 'is_null':
        return isNull(field);
      case 'is_not_null':
        return sql`${field} IS NOT NULL`;
      case 'in_last_days':
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - (value as number));
        return sql`${field} >= ${daysAgo.toISOString().split('T')[0]}`;
      case 'not_in_last_days':
        const daysAgoNot = new Date();
        daysAgoNot.setDate(daysAgoNot.getDate() - (value as number));
        return sql`${field} < ${daysAgoNot.toISOString().split('T')[0]}`;
      default:
        throw new Error(`Unsupported operator: ${rule.operator}`);
    }
  }

  private buildRuleConditionString(rule: SegmentRule): string {
    const field = rule.field;
    const value = rule.value;

    switch (rule.operator) {
      case 'equals':
        return `${field} = '${value}'`;
      case 'not_equals':
        return `${field} != '${value}'`;
      case 'greater_than':
        return `${field} > ${value}`;
      case 'less_than':
        return `${field} < ${value}`;
      case 'greater_than_or_equal':
        return `${field} >= ${value}`;
      case 'less_than_or_equal':
        return `${field} <= ${value}`;
      case 'contains':
        return `${field} LIKE '%${value}%'`;
      case 'not_contains':
        return `${field} NOT LIKE '%${value}%'`;
      case 'in':
        return `${field} IN (${(value as any[]).map(v => `'${v}'`).join(', ')})`;
      case 'not_in':
        return `${field} NOT IN (${(value as any[]).map(v => `'${v}'`).join(', ')})`;
      case 'between':
        const [min, max] = value as [number, number];
        return `${field} BETWEEN ${min} AND ${max}`;
      case 'is_null':
        return `${field} IS NULL`;
      case 'is_not_null':
        return `${field} IS NOT NULL`;
      case 'in_last_days':
        return `${field} >= CURRENT_DATE - INTERVAL '${value} days'`;
      case 'not_in_last_days':
        return `${field} < CURRENT_DATE - INTERVAL '${value} days'`;
      default:
        throw new Error(`Unsupported operator: ${rule.operator}`);
    }
  }

  private getFieldMapping(fieldName: string): any {
    const fieldMap: Record<string, any> = {
      // Basic donor fields
      'firstName': donors.firstName,
      'lastName': donors.lastName,
      'email': donors.email,
      'phone': donors.phone,
      'city': donors.city,
      'state': donors.state,
      'zipCode': donors.zipCode,
      'country': donors.country,
      
      // School-specific fields
      'donorType': donors.donorType,
      'studentName': donors.studentName,
      'gradeLevel': donors.gradeLevel,
      'alumniYear': donors.alumniYear,
      'graduationYear': donors.graduationYear,
      
      // Engagement and analytics
      'engagementLevel': donors.engagementLevel,
      'giftSizeTier': donors.giftSizeTier,
      'lifetimeValue': donors.lifetimeValue,
      'averageGiftSize': donors.averageGiftSize,
      'totalDonations': donors.totalDonations,
      'lastDonationDate': donors.lastDonationDate,
      'firstDonationDate': donors.firstDonationDate,
      
      // Communication preferences
      'emailOptIn': donors.emailOptIn,
      'phoneOptIn': donors.phoneOptIn,
      'mailOptIn': donors.mailOptIn,
      'preferredContactMethod': donors.preferredContactMethod,
      
      // System fields
      'createdAt': donors.createdAt,
      'updatedAt': donors.updatedAt,
    };

    const field = fieldMap[fieldName];
    if (!field) {
      throw new Error(`Unknown field: ${fieldName}`);
    }
    return field;
  }

  // Communication operations
  async getCommunications(params: {
    search?: string;
    type?: string;
    status?: string;
    donorId?: string;
    segmentId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ communications: Communication[]; total: number }> {
    const { search, type, status, donorId, segmentId, startDate, endDate, page, limit } = params;
    const pageNum = Math.max(1, page ?? 1);
    const limitNum = Math.min(100, Math.max(1, limit ?? 25));
    const offset = (pageNum - 1) * limitNum;
    
    let whereConditions: any[] = [];

    if (search) {
      whereConditions.push(
        or(
          like(communications.subject, `%${search}%`),
          like(communications.content, `%${search}%`)
        )
      );
    }

    if (type) {
      whereConditions.push(eq(communications.type, type));
    }

    if (status) {
      whereConditions.push(eq(communications.status, status));
    }

    if (donorId) {
      whereConditions.push(eq(communications.donorId, donorId));
    }

    if (segmentId) {
      whereConditions.push(eq(communications.segmentId, segmentId));
    }

    if (startDate) {
      whereConditions.push(sql`${communications.createdAt} >= ${startDate}`);
    }

    if (endDate) {
      whereConditions.push(sql`${communications.createdAt} <= ${endDate}`);
    }

    const whereClause = whereConditions.length > 0 
      ? (whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0])
      : undefined;

    const [communicationList, totalCount] = await Promise.all([
      db.select()
        .from(communications)
        .where(whereClause)
        .limit(limitNum)
        .offset(offset)
        .orderBy(desc(communications.createdAt)),
      db.select({ count: count() })
        .from(communications)
        .where(whereClause),
    ]);

    return {
      communications: communicationList,
      total: totalCount[0].count,
    };
  }

  async createCommunication(communication: InsertCommunication): Promise<Communication> {
    const [newCommunication] = await db.insert(communications).values(communication).returning();
    return newCommunication;
  }

  async getCommunication(id: string): Promise<Communication | undefined> {
    const [communication] = await db.select().from(communications).where(eq(communications.id, id));
    return communication;
  }

  async updateCommunication(id: string, communication: Partial<InsertCommunication>): Promise<Communication> {
    const [updatedCommunication] = await db
      .update(communications)
      .set({ ...communication, updatedAt: new Date() })
      .where(eq(communications.id, id))
      .returning();
    return updatedCommunication;
  }

  async deleteCommunication(id: string): Promise<void> {
    await db.delete(communications).where(eq(communications.id, id));
  }

  // Data import operations
  async createDataImport(importData: Omit<DataImport, 'id' | 'createdAt' | 'completedAt'>): Promise<DataImport> {
    const [newImport] = await db.insert(dataImports).values(importData).returning();
    return newImport;
  }

  async updateDataImport(id: string, updates: Partial<DataImport>): Promise<DataImport> {
    const [updatedImport] = await db
      .update(dataImports)
      .set(updates)
      .where(eq(dataImports.id, id))
      .returning();
    return updatedImport;
  }

  async getDataImports(userId: string): Promise<DataImport[]> {
    return await db
      .select()
      .from(dataImports)
      .where(eq(dataImports.userId, userId))
      .orderBy(desc(dataImports.createdAt));
  }

  // Duplicate detection
  async findDuplicateDonors(email?: string, firstName?: string, lastName?: string): Promise<Donor[]> {
    if (!email && !firstName && !lastName) return [];

    const conditions: any[] = [];

    // Check for email duplicates
    if (email) {
      conditions.push(and(eq(donors.isActive, true), eq(donors.email, email)));
    }

    // Check for name duplicates
    if (firstName && lastName) {
      conditions.push(
        and(
          eq(donors.isActive, true),
          eq(donors.firstName, firstName),
          eq(donors.lastName, lastName)
        )
      );
    }

    if (conditions.length === 0) return [];

    const whereClause = conditions.length === 1 ? conditions[0] : or(...conditions);
    return await db.select().from(donors).where(whereClause);
  }

  async findAdvancedDuplicates(candidate: Record<string, any>, strategies: string[] = ['exact_email', 'exact_phone', 'name_address', 'fuzzy_name']): Promise<Array<{
    donor: Donor;
    matchScore: number;
    matchReasons: string[];
    confidence: 'high' | 'medium' | 'low';
  }>> {
    const matches: Array<{
      donor: Donor;
      matchScore: number;
      matchReasons: string[];
      confidence: 'high' | 'medium' | 'low';
    }> = [];

    // Thresholds for matching
    const thresholds = { high: 0.9, medium: 0.7, low: 0.5 };

    // Phase 1: Fast exact matches using database queries
    const exactMatches = await this.findExactMatches(candidate);
    for (const donor of exactMatches) {
      const match = this.calculateDuplicateMatch(candidate, donor, ['exact_email', 'exact_phone']);
      if (match.matchScore >= thresholds.low) {
        matches.push(match);
      }
    }

    // Phase 2: Name-based matches with address filtering
    if (strategies.includes('name_address') || strategies.includes('fuzzy_name')) {
      const nameMatches = await this.findNameBasedMatches(candidate);
      for (const donor of nameMatches) {
        // Skip if already found in exact matches
        if (exactMatches.some(existing => existing.id === donor.id)) continue;
        
        const match = this.calculateDuplicateMatch(candidate, donor, strategies.filter(s => s !== 'exact_email' && s !== 'exact_phone'));
        if (match.matchScore >= thresholds.low) {
          matches.push(match);
        }
      }
    }

    // Phase 3: Student name matches (school-specific)
    if (strategies.includes('student_name') && candidate.studentName) {
      const studentMatches = await this.findStudentNameMatches(candidate.studentName);
      for (const donor of studentMatches) {
        // Skip if already found
        if (matches.some(existing => existing.donor.id === donor.id)) continue;
        
        const match = this.calculateDuplicateMatch(candidate, donor, ['student_name']);
        if (match.matchScore >= thresholds.low) {
          matches.push(match);
        }
      }
    }

    // Sort by match score (highest first) and limit to top 10 matches
    return matches.sort((a, b) => b.matchScore - a.matchScore).slice(0, 10);
  }

  private calculateDuplicateMatch(candidate: Record<string, any>, donor: Donor, strategies: string[]): {
    donor: Donor;
    matchScore: number;
    matchReasons: string[];
    confidence: 'high' | 'medium' | 'low';
  } {
    let totalScore = 0;
    let totalWeight = 0;
    const matchReasons: string[] = [];

    for (const strategy of strategies) {
      const result = this.applyMatchingStrategy(strategy, candidate, donor);
      if (result.score > 0) {
        totalScore += result.score * result.weight;
        totalWeight += result.weight;
        matchReasons.push(...result.reasons);
      }
    }

    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    const confidence = finalScore >= 0.9 ? 'high' : finalScore >= 0.7 ? 'medium' : 'low';

    return {
      donor,
      matchScore: finalScore,
      matchReasons,
      confidence
    };
  }

  private applyMatchingStrategy(strategy: string, candidate: Record<string, any>, donor: Donor): {
    score: number;
    weight: number;
    reasons: string[];
  } {
    switch (strategy) {
      case 'exact_email':
        return this.exactEmailMatch(candidate, donor);
      case 'exact_phone':
        return this.exactPhoneMatch(candidate, donor);
      case 'name_address':
        return this.nameAddressMatch(candidate, donor);
      case 'fuzzy_name':
        return this.fuzzyNameMatch(candidate, donor);
      case 'student_name':
        return this.studentNameMatch(candidate, donor);
      default:
        return { score: 0, weight: 0, reasons: [] };
    }
  }

  private exactEmailMatch(candidate: Record<string, any>, donor: Donor) {
    if (!candidate.email || !donor.email) {
      return { score: 0, weight: 0, reasons: [] };
    }

    const match = this.normalizeEmail(candidate.email) === this.normalizeEmail(donor.email);
    return {
      score: match ? 1.0 : 0,
      weight: 3,
      reasons: match ? ['Exact email match'] : []
    };
  }

  private exactPhoneMatch(candidate: Record<string, any>, donor: Donor) {
    if (!candidate.phone || !donor.phone) {
      return { score: 0, weight: 0, reasons: [] };
    }

    const match = this.normalizePhone(candidate.phone) === this.normalizePhone(donor.phone);
    return {
      score: match ? 1.0 : 0,
      weight: 2.5,
      reasons: match ? ['Exact phone match'] : []
    };
  }

  private nameAddressMatch(candidate: Record<string, any>, donor: Donor) {
    const nameScore = this.calculateNameSimilarity(candidate, donor);
    const addressScore = this.calculateAddressSimilarity(candidate, donor);

    if (nameScore < 0.8 || addressScore < 0.7) {
      return { score: 0, weight: 0, reasons: [] };
    }

    const combinedScore = (nameScore * 0.6) + (addressScore * 0.4);
    const reasons = [];
    
    if (nameScore > 0.9) reasons.push('Very similar name');
    if (addressScore > 0.9) reasons.push('Very similar address');

    return {
      score: combinedScore,
      weight: 2,
      reasons
    };
  }

  private fuzzyNameMatch(candidate: Record<string, any>, donor: Donor) {
    const similarity = this.calculateNameSimilarity(candidate, donor);
    
    if (similarity < 0.8) {
      return { score: 0, weight: 0, reasons: [] };
    }

    const reasons = [];
    if (similarity > 0.95) reasons.push('Very similar full name');
    else if (similarity > 0.9) reasons.push('Similar full name');
    
    return {
      score: similarity,
      weight: 1.5,
      reasons
    };
  }

  private studentNameMatch(candidate: Record<string, any>, donor: Donor) {
    if (!candidate.studentName || !donor.studentName) {
      return { score: 0, weight: 0, reasons: [] };
    }

    const similarity = this.calculateStringSimilarity(
      candidate.studentName.toLowerCase(),
      donor.studentName.toLowerCase()
    );

    if (similarity < 0.9) {
      return { score: 0, weight: 0, reasons: [] };
    }

    return {
      score: similarity,
      weight: 2,
      reasons: ['Same student name']
    };
  }

  private calculateNameSimilarity(candidate: Record<string, any>, donor: Donor): number {
    const firstNameSim = this.calculateStringSimilarity(
      candidate.firstName?.toLowerCase() || '',
      donor.firstName?.toLowerCase() || ''
    );
    
    const lastNameSim = this.calculateStringSimilarity(
      candidate.lastName?.toLowerCase() || '',
      donor.lastName?.toLowerCase() || ''
    );

    return (firstNameSim * 0.4) + (lastNameSim * 0.6);
  }

  private calculateAddressSimilarity(candidate: Record<string, any>, donor: Donor): number {
    let score = 0;
    let components = 0;

    if (candidate.address && donor.address) {
      score += this.calculateStringSimilarity(
        candidate.address.toLowerCase(),
        donor.address.toLowerCase()
      ) * 0.4;
      components += 0.4;
    }

    if (candidate.city && donor.city) {
      score += (candidate.city.toLowerCase() === donor.city.toLowerCase() ? 1 : 0) * 0.3;
      components += 0.3;
    }

    if (candidate.zipCode && donor.zipCode) {
      score += (candidate.zipCode === donor.zipCode ? 1 : 0) * 0.3;
      components += 0.3;
    }

    return components > 0 ? score / components : 0;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (!str1 || !str2) return 0;

    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1.0;

    const distance = this.levenshteinDistance(str1, str2);
    return 1 - (distance / maxLength);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  // Helper methods
  private async updateDonorAnalytics(donorId: string) {
    const donorStats = await db
      .select({
        totalDonations: count(),
        lifetimeValue: sum(donations.amount),
        averageGiftSize: avg(donations.amount),
        lastDonationDate: sql`MAX(${donations.date})`,
        firstDonationDate: sql`MIN(${donations.date})`,
      })
      .from(donations)
      .where(eq(donations.donorId, donorId));

    const stats = donorStats[0];
    if (stats) {
      await db
        .update(donors)
        .set({
          totalDonations: Number(stats.totalDonations),
          lifetimeValue: stats.lifetimeValue?.toString() || "0.00",
          averageGiftSize: stats.averageGiftSize?.toString() || "0.00",
          lastDonationDate: stats.lastDonationDate as string,
          firstDonationDate: stats.firstDonationDate as string,
          updatedAt: new Date(),
        })
        .where(eq(donors.id, donorId));
    }
  }

  private async updateCampaignRaised(campaignId: string) {
    const campaignStats = await db
      .select({
        raised: sum(donations.amount),
        donorCount: count(sql`DISTINCT ${donations.donorId}`),
      })
      .from(donations)
      .where(eq(donations.campaignId, campaignId));

    const stats = campaignStats[0];
    if (stats) {
      // Get current campaign to access cost data
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, campaignId));

      if (campaign) {
        const raisedAmount = Number(stats.raised || 0);
        const campaignCost = Number(campaign.campaignCost || 0);
        
        // Calculate ROI: ((Revenue - Cost) / Cost) * 100
        // If no cost is set, assume a default cost ratio for estimation
        let roi = 0;
        let costPerDollarRaised = 0;
        
        if (campaignCost > 0 && raisedAmount > 0) {
          roi = ((raisedAmount - campaignCost) / campaignCost) * 100;
          costPerDollarRaised = campaignCost / raisedAmount;
        } else if (raisedAmount > 0) {
          // Use industry standard of ~20% cost ratio for fundraising
          const estimatedCost = raisedAmount * 0.20;
          roi = ((raisedAmount - estimatedCost) / estimatedCost) * 100;
          costPerDollarRaised = 0.20;
        }

        await db
          .update(campaigns)
          .set({
            raised: stats.raised?.toString() || "0.00",
            donorCount: Number(stats.donorCount),
            roi: roi.toFixed(2),
            costPerDollarRaised: costPerDollarRaised.toFixed(4),
            updatedAt: new Date(),
          })
          .where(eq(campaigns.id, campaignId));
      }
    }
  }
  
  // Fast exact match queries - Phase 1 of duplicate detection
  private async findExactMatches(candidate: Record<string, any>): Promise<Donor[]> {
    const conditions = [];
    
    // Exact email match (highest priority)
    if (candidate.email) {
      conditions.push(
        db.select().from(donors)
          .where(and(
            eq(donors.isActive, true),
            eq(donors.email, this.normalizeEmail(candidate.email))
          ))
      );
    }
    
    // Exact phone match
    if (candidate.phone) {
      conditions.push(
        db.select().from(donors)
          .where(and(
            eq(donors.isActive, true),
            eq(donors.phone, this.normalizePhone(candidate.phone))
          ))
      );
    }
    
    if (conditions.length === 0) return [];
    
    // Execute all exact match queries in parallel
    const results = await Promise.all(conditions);
    
    // Deduplicate results
    const uniqueMatches = new Map<string, Donor>();
    results.flat().forEach(donor => {
      uniqueMatches.set(donor.id, donor);
    });
    
    return Array.from(uniqueMatches.values());
  }
  
  private async findNameBasedMatches(candidate: Record<string, any>): Promise<Donor[]> {
    if (!candidate.firstName || !candidate.lastName) return [];
    
    const conditions = [];
    
    // Exact name match
    conditions.push(
      db.select().from(donors)
        .where(and(
          eq(donors.isActive, true),
          eq(donors.firstName, candidate.firstName),
          eq(donors.lastName, candidate.lastName)
        ))
    );
    
    // Name with same ZIP (high confidence)
    if (candidate.zipCode) {
      conditions.push(
        db.select().from(donors)
          .where(and(
            eq(donors.isActive, true),
            eq(donors.zipCode, candidate.zipCode),
            or(
              and(
                eq(donors.firstName, candidate.firstName),
                like(donors.lastName, `%${candidate.lastName}%`)
              ),
              and(
                like(donors.firstName, `%${candidate.firstName}%`),
                eq(donors.lastName, candidate.lastName)
              )
            )
          ))
      );
    }
    
    // Similar names in same city (medium confidence)
    if (candidate.city) {
      conditions.push(
        db.select().from(donors)
          .where(and(
            eq(donors.isActive, true),
            eq(donors.city, candidate.city),
            or(
              like(donors.firstName, `${candidate.firstName}%`),
              like(donors.lastName, `${candidate.lastName}%`)
            )
          ))
          .limit(20) // Limit fuzzy matches to prevent performance issues
      );
    }
    
    if (conditions.length === 0) return [];
    
    const results = await Promise.all(conditions);
    
    // Deduplicate and limit results
    const uniqueMatches = new Map<string, Donor>();
    results.flat().forEach(donor => {
      uniqueMatches.set(donor.id, donor);
    });
    
    return Array.from(uniqueMatches.values()).slice(0, 50); // Limit for performance
  }
  
  private async findStudentNameMatches(studentName: string): Promise<Donor[]> {
    return await db.select().from(donors)
      .where(and(
        eq(donors.isActive, true),
        eq(donors.studentName, studentName)
      ))
      .limit(10);
  }

  // Import Job operations implementation
  async createImportJob(jobData: z.infer<typeof insertImportJobSchema>): Promise<ImportJob> {
    const [newJob] = await db.insert(importJobs).values(jobData).returning();
    return newJob;
  }

  async updateImportJob(id: string, updates: Partial<ImportJob>): Promise<ImportJob> {
    const [updatedJob] = await db
      .update(importJobs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(importJobs.id, id))
      .returning();
    return updatedJob;
  }

  async getImportJob(id: string): Promise<ImportJob | undefined> {
    const [job] = await db.select().from(importJobs).where(eq(importJobs.id, id));
    return job;
  }

  async getImportJobs(userId: string, limit: number = 50): Promise<ImportJob[]> {
    return await db
      .select()
      .from(importJobs)
      .where(eq(importJobs.createdBy, userId))
      .orderBy(desc(importJobs.createdAt))
      .limit(limit);
  }

  async startImportJob(id: string): Promise<void> {
    await db
      .update(importJobs)
      .set({
        status: 'processing',
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(importJobs.id, id));
  }

  async cancelImportJob(id: string, reason?: string): Promise<void> {
    const errors = reason ? [{ error: `Job cancelled: ${reason}`, timestamp: new Date().toISOString() }] : [];
    
    await db
      .update(importJobs)
      .set({
        status: 'cancelled',
        errors: errors,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(importJobs.id, id));
  }

  // Chunked import processing with transaction safety
  async processImportJobInBatches(
    jobId: string, 
    fileBuffer: Buffer, 
    fileName: string,
    batchSize: number = 100
  ): Promise<void> {
    const job = await this.getImportJob(jobId);
    if (!job) throw new Error(`Import job ${jobId} not found`);
    
    try {
      // Parse file data
      const data = await this.parseFileBuffer(fileBuffer, fileName);
      
      await this.updateImportJob(jobId, {
        totalRows: data.length,
        status: 'processing',
      });
      
      // Process data in batches for memory efficiency and transaction safety
      let processedRows = 0;
      let successfulRows = 0;
      let errorRows = 0;
      let skippedRows = 0;
      const errors: any[] = [];
      const warnings: any[] = [];
      
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const batchResults = await this.processBatchWithTransaction(batch, job, i);
        
        processedRows += batch.length;
        successfulRows += batchResults.successful;
        errorRows += batchResults.errors.length;
        skippedRows += batchResults.skipped;
        errors.push(...batchResults.errors);
        warnings.push(...batchResults.warnings);
        
        // Update progress every batch
        await this.updateImportJob(jobId, {
          processedRows,
          successfulRows,
          errorRows,
          skippedRows,
          errors: errors.slice(-1000), // Keep only last 1000 errors for memory
          warnings: warnings.slice(-500), // Keep only last 500 warnings
        });
        
        // Check if job was cancelled
        const currentJob = await this.getImportJob(jobId);
        if (currentJob?.status === 'cancelled') {
          throw new Error('Import job was cancelled');
        }
      }
      
      // Final job completion
      await this.updateImportJob(jobId, {
        status: 'completed',
        completedAt: new Date(),
        summary: {
          totalRows: data.length,
          processedRows,
          successfulRows,
          errorRows,
          skippedRows,
          batchesProcessed: Math.ceil(data.length / batchSize),
          completionTime: new Date().toISOString()
        }
      });
      
      // Create audit log
      await this.createAuditLog({
        action: 'import_completed',
        entityType: 'import_job',
        entityId: jobId,
        userId: job.createdBy,
        metadata: {
          fileName: job.fileName,
          totalRows: data.length,
          successfulRows,
          errorRows,
          skippedRows
        }
      });
      
    } catch (error) {
      await this.updateImportJob(jobId, {
        status: 'failed',
        completedAt: new Date(),
        errors: [{ 
          error: error instanceof Error ? error.message : 'Processing failed',
          timestamp: new Date().toISOString()
        }]
      });
      
      await this.createAuditLog({
        action: 'import_failed',
        entityType: 'import_job',
        entityId: jobId,
        userId: job.createdBy,
        metadata: {
          fileName: job.fileName,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      
      throw error;
    }
  }
  
  private async processBatchWithTransaction(
    batch: any[], 
    job: ImportJob, 
    batchStartIndex: number
  ): Promise<{
    successful: number;
    skipped: number;
    errors: any[];
    warnings: any[];
  }> {
    let successful = 0;
    let skipped = 0;
    const errors: any[] = [];
    const warnings: any[] = [];
    
    // Use a transaction for the entire batch
    try {
      for (let i = 0; i < batch.length; i++) {
        const rowIndex = batchStartIndex + i;
        const row = batch[i];
        
        try {
          // Map fields according to field mapping
          const donorData: any = {};
          const fieldMapping = job.fieldMapping as Record<string, string>;
          for (const [dbField, csvField] of Object.entries(fieldMapping)) {
            if (row[csvField] !== undefined && row[csvField] !== '') {
              donorData[dbField] = this.sanitizeValue(row[csvField]); // CSV injection protection
            }
          }
          
          // Validate required fields
          if (!donorData.firstName || !donorData.lastName) {
            errors.push({
              row: rowIndex + 1,
              error: 'Missing required fields: firstName or lastName',
              data: row,
            });
            continue;
          }
          
          // Advanced duplicate detection
          const duplicates = await this.findAdvancedDuplicates(donorData, [
            'exact_email', 'exact_phone', 'name_address', 'fuzzy_name'
          ]);
          
          // Handle duplicates based on strategy
          if (duplicates.length > 0) {
            const highConfidenceMatch = duplicates.find(d => d.confidence === 'high');
            
            if (job.deduplicationStrategy === 'skip') {
              skipped++;
              warnings.push({
                row: rowIndex + 1,
                warning: `Duplicate found (${highConfidenceMatch ? 'high' : 'medium'} confidence), skipped`,
                duplicateInfo: duplicates[0],
              });
              continue;
            } else if (job.deduplicationStrategy === 'update' && highConfidenceMatch) {
              await this.updateDonor(highConfidenceMatch.donor.id, donorData);
              successful++;
              warnings.push({
                row: rowIndex + 1,
                warning: 'Updated existing donor record',
                duplicateInfo: duplicates[0],
              });
              continue;
            }
          }
          
          // Create new donor
          await this.createDonor({
            ...donorData,
            donorType: donorData.donorType || 'community',
            engagementLevel: 'new',
            giftSizeTier: 'grassroots',
            emailOptIn: true,
            phoneOptIn: false,
            mailOptIn: true,
            preferredContactMethod: 'email',
            isActive: true,
          });
          successful++;
          
        } catch (rowError) {
          errors.push({
            row: rowIndex + 1,
            error: rowError instanceof Error ? rowError.message : 'Unknown error',
            data: row,
          });
        }
      }
    } catch (batchError) {
      // If entire batch fails, mark all as errors
      for (let i = 0; i < batch.length; i++) {
        errors.push({
          row: batchStartIndex + i + 1,
          error: `Batch processing failed: ${batchError instanceof Error ? batchError.message : 'Unknown error'}`,
          data: batch[i],
        });
      }
    }
    
    return { successful, skipped, errors, warnings };
  }
  
  private async parseFileBuffer(buffer: Buffer, fileName: string): Promise<any[]> {
    if (fileName.endsWith('.csv')) {
      const Papa = require('papaparse');
      const csvText = buffer.toString('utf-8');
      const parseResult = Papa.parse(csvText, { header: true, skipEmptyLines: true });
      return parseResult.data;
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const XLSX = require('xlsx');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json(sheet);
    }
    throw new Error('Unsupported file format');
  }
  
  // CSV injection protection
  private sanitizeValue(value: any): any {
    if (typeof value !== 'string') return value;
    
    // Remove dangerous characters that could lead to CSV injection
    if (value.match(/^[=+\-@].*$/)) {
      return "'" + value; // Prefix with single quote to neutralize
    }
    return value;
  }

  // Workflow operations (stub implementations)
  async getWorkflows(params: { search?: string; status?: string; triggerType?: string; createdBy?: string; page?: number; limit?: number; }): Promise<{ workflows: Workflow[]; total: number }> {
    return { workflows: [], total: 0 };
  }
  async getWorkflow(id: string): Promise<Workflow | undefined> { return undefined; }
  async createWorkflow(workflow: InsertWorkflow): Promise<Workflow> { 
    const [newWorkflow] = await db.insert(workflows).values(workflow).returning();
    return newWorkflow;
  }
  async updateWorkflow(id: string, workflow: Partial<InsertWorkflow>): Promise<Workflow> {
    const [updated] = await db.update(workflows).set(workflow).where(eq(workflows.id, id)).returning();
    return updated;
  }
  async deleteWorkflow(id: string): Promise<void> { await db.delete(workflows).where(eq(workflows.id, id)); }

  // Experiment operations (stub implementations)
  async getExperiments(params: { search?: string; status?: string; targetSegmentId?: string; createdBy?: string; page?: number; limit?: number; }): Promise<{ experiments: Experiment[]; total: number }> {
    return { experiments: [], total: 0 };
  }
  async getExperiment(id: string): Promise<Experiment | undefined> { return undefined; }
  async createExperiment(experiment: InsertExperiment): Promise<Experiment> {
    const [newExperiment] = await db.insert(experiments).values(experiment).returning();
    return newExperiment;
  }
  async updateExperiment(id: string, experiment: Partial<InsertExperiment>): Promise<Experiment> {
    const [updated] = await db.update(experiments).set(experiment).where(eq(experiments.id, id)).returning();
    return updated;
  }
  async deleteExperiment(id: string): Promise<void> { await db.delete(experiments).where(eq(experiments.id, id)); }

  // Grant operations (stub implementations)
  async getGrants(params: { search?: string; status?: string; type?: string; campaignId?: string; assignedTo?: string; page?: number; limit?: number; }): Promise<{ grants: Grant[]; total: number }> {
    return { grants: [], total: 0 };
  }
  async getGrant(id: string): Promise<Grant | undefined> { return undefined; }
  async createGrant(grant: InsertGrant): Promise<Grant> {
    const [newGrant] = await db.insert(grants).values(grant).returning();
    return newGrant;
  }
  async updateGrant(id: string, grant: Partial<InsertGrant>): Promise<Grant> {
    const [updated] = await db.update(grants).set(grant).where(eq(grants.id, id)).returning();
    return updated;
  }
  async deleteGrant(id: string): Promise<void> { await db.delete(grants).where(eq(grants.id, id)); }

  // Template operations (stub implementations)
  async getTemplates(params: { search?: string; type?: string; createdBy?: string; isActive?: boolean; page?: number; limit?: number; }): Promise<{ templates: Template[]; total: number }> {
    return { templates: [], total: 0 };
  }
  async getTemplate(id: string): Promise<Template | undefined> { return undefined; }
  async createTemplate(template: InsertTemplate): Promise<Template> {
    const [newTemplate] = await db.insert(templates).values(template).returning();
    return newTemplate;
  }
  async updateTemplate(id: string, template: Partial<InsertTemplate>): Promise<Template> {
    const [updated] = await db.update(templates).set(template).where(eq(templates.id, id)).returning();
    return updated;
  }
  async deleteTemplate(id: string): Promise<void> { await db.delete(templates).where(eq(templates.id, id)); }

  // Donor Score operations (stub implementations)
  async getDonorScores(params: { donorId?: string; scoreType?: string; page?: number; limit?: number; }): Promise<{ donorScores: DonorScore[]; total: number }> {
    return { donorScores: [], total: 0 };
  }
  async getDonorScore(id: string): Promise<DonorScore | undefined> { return undefined; }
  async createDonorScore(donorScore: InsertDonorScore): Promise<DonorScore> {
    const [newScore] = await db.insert(donorScores).values(donorScore).returning();
    return newScore;
  }
  async updateDonorScore(id: string, donorScore: Partial<InsertDonorScore>): Promise<DonorScore> {
    const [updated] = await db.update(donorScores).set(donorScore).where(eq(donorScores.id, id)).returning();
    return updated;
  }
  async deleteDonorScore(id: string): Promise<void> { await db.delete(donorScores).where(eq(donorScores.id, id)); }

  // Attribution operations (stub implementations)
  async getAttributions(params: { donorId?: string; donationId?: string; campaignId?: string; page?: number; limit?: number; }): Promise<{ attributions: Attribution[]; total: number }> {
    return { attributions: [], total: 0 };
  }
  async getAttribution(id: string): Promise<Attribution | undefined> { return undefined; }
  async createAttribution(attribution: InsertAttribution): Promise<Attribution> {
    const [newAttribution] = await db.insert(attributions).values(attribution).returning();
    return newAttribution;
  }
  async updateAttribution(id: string, attribution: Partial<InsertAttribution>): Promise<Attribution> {
    const [updated] = await db.update(attributions).set(attribution).where(eq(attributions.id, id)).returning();
    return updated;
  }
  async deleteAttribution(id: string): Promise<void> { await db.delete(attributions).where(eq(attributions.id, id)); }

  // Audit log operations (viewing only)
  async getAuditLogs(params: { search?: string; action?: string; entityType?: string; userId?: string; startDate?: Date; endDate?: Date; page?: number; limit?: number; }): Promise<{ auditLogs: AuditLog[]; total: number }> {
    return { auditLogs: [], total: 0 };
  }
  async getAuditLog(id: string): Promise<AuditLog | undefined> { return undefined; }

  // Audit logging
  async createAuditLog(auditLogData: z.infer<typeof insertAuditLogSchema>): Promise<void> {
    try {
      await db.insert(auditLogs).values(auditLogData);
    } catch (error) {
      console.error('Error creating audit log:', error);
      // Don't fail the request due to audit logging errors
    }
  }
}

export const storage = new DatabaseStorage();
