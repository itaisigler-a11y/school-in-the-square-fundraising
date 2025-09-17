import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  integer,
  boolean,
  uuid,
  date,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User roles enum
export const userRoleEnum = pgEnum('user_role', ['administrator', 'development_officer', 'finance', 'volunteer']);

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  jobTitle: varchar("job_title"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").notNull().default("development_officer"),
  permissions: jsonb("permissions").default({}),
  lastLogin: timestamp("last_login"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Donor relationship types
export const donorTypeEnum = pgEnum('donor_type', ['parent', 'alumni', 'community', 'staff', 'board', 'foundation', 'business']);
export const engagementLevelEnum = pgEnum('engagement_level', ['new', 'active', 'engaged', 'at_risk', 'lapsed']);
export const giftSizeTierEnum = pgEnum('gift_size_tier', ['grassroots', 'mid_level', 'major', 'principal']);

// New enums for additional entities
export const workflowStatusEnum = pgEnum('workflow_status', ['draft', 'active', 'paused', 'completed', 'cancelled']);
export const workflowTriggerTypeEnum = pgEnum('workflow_trigger_type', ['donation', 'signup', 'event', 'date', 'engagement']);
export const workflowActionTypeEnum = pgEnum('workflow_action_type', ['email', 'sms', 'task', 'segment', 'tag', 'score_update']);
export const experimentStatusEnum = pgEnum('experiment_status', ['draft', 'running', 'paused', 'completed', 'cancelled']);
export const grantStatusEnum = pgEnum('grant_status', ['prospect', 'applied', 'under_review', 'approved', 'funded', 'rejected', 'reported']);
export const grantTypeEnum = pgEnum('grant_type', ['foundation', 'government', 'corporate', 'individual', 'crowdfunding']);
export const importJobStatusEnum = pgEnum('import_job_status', ['pending', 'processing', 'validating', 'importing', 'completed', 'failed', 'cancelled']);
export const templateTypeEnum = pgEnum('template_type', ['email', 'sms', 'letter', 'receipt', 'thank_you', 'newsletter']);
export const auditActionTypeEnum = pgEnum('audit_action_type', ['create', 'update', 'delete', 'login', 'logout', 'export', 'import', 'view', 'api_access', 'import_started', 'import_completed', 'import_failed', 'import_cancelled', 'ai_donation_appeal', 'ai_subject_lines', 'ai_grant_outline', 'ai_content_generation']);

// Donors table
export const donors = pgTable("donors", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").unique(),
  phone: varchar("phone"),
  address: text("address"),
  city: varchar("city"),
  state: varchar("state"),
  zipCode: varchar("zip_code"),
  country: varchar("country").default("USA"),
  
  // School-specific fields
  donorType: donorTypeEnum("donor_type").notNull().default('community'),
  studentName: varchar("student_name"),
  gradeLevel: varchar("grade_level"),
  alumniYear: integer("alumni_year"),
  graduationYear: integer("graduation_year"),
  
  // Engagement and analytics
  engagementLevel: engagementLevelEnum("engagement_level").notNull().default('new'),
  giftSizeTier: giftSizeTierEnum("gift_size_tier").notNull().default('grassroots'),
  lifetimeValue: decimal("lifetime_value", { precision: 10, scale: 2 }).default("0.00"),
  averageGiftSize: decimal("average_gift_size", { precision: 10, scale: 2 }).default("0.00"),
  totalDonations: integer("total_donations").default(0),
  lastDonationDate: date("last_donation_date"),
  firstDonationDate: date("first_donation_date"),
  
  // Communication preferences
  emailOptIn: boolean("email_opt_in").default(true),
  phoneOptIn: boolean("phone_opt_in").default(false),
  mailOptIn: boolean("mail_opt_in").default(true),
  preferredContactMethod: varchar("preferred_contact_method").default("email"),
  
  // System fields
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  tags: jsonb("tags").default([]),
  customFields: jsonb("custom_fields").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("donors_email_idx").on(table.email),
  index("donors_type_idx").on(table.donorType),
  index("donors_engagement_idx").on(table.engagementLevel),
  index("donors_tier_idx").on(table.giftSizeTier),
]);

// Campaigns table
export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  goal: decimal("goal", { precision: 12, scale: 2 }).notNull(),
  raised: decimal("raised", { precision: 12, scale: 2 }).default("0.00"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: varchar("status").notNull().default("planned"), // planned, active, completed, cancelled
  campaignType: varchar("campaign_type").notNull().default("general"), // annual, capital, special, event
  
  // Segment targeting
  segmentId: uuid("segment_id").references(() => segmentDefinitions.id),
  
  // Analytics
  donorCount: integer("donor_count").default(0),
  campaignCost: decimal("campaign_cost", { precision: 12, scale: 2 }).default("0.00"),
  costPerDollarRaised: decimal("cost_per_dollar_raised", { precision: 5, scale: 4 }).default("0.0000"),
  roi: decimal("roi", { precision: 8, scale: 2 }).default("0.00"),
  
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Donations table
export const donations = pgTable("donations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  donorId: uuid("donor_id").notNull().references(() => donors.id),
  campaignId: uuid("campaign_id").references(() => campaigns.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  paymentMethod: varchar("payment_method").notNull().default("check"), // check, credit_card, bank_transfer, cash, online
  isRecurring: boolean("is_recurring").default(false),
  recurringFrequency: varchar("recurring_frequency"), // monthly, quarterly, annually
  
  // Processing details
  transactionId: varchar("transaction_id"),
  status: varchar("status").notNull().default("completed"), // pending, completed, failed, refunded
  
  // Acknowledgment
  thankYouSent: boolean("thank_you_sent").default(false),
  thankYouSentAt: timestamp("thank_you_sent_at"),
  receiptSent: boolean("receipt_sent").default(false),
  receiptSentAt: timestamp("receipt_sent_at"),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("donations_donor_idx").on(table.donorId),
  index("donations_campaign_idx").on(table.campaignId),
  index("donations_date_idx").on(table.date),
  index("donations_amount_idx").on(table.amount),
]);

// Donor segments table
export const segments = pgTable("segments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  criteria: jsonb("criteria").notNull(), // Filter criteria as JSON
  donorCount: integer("donor_count").default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Communications table
export const communications = pgTable("communications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  donorId: uuid("donor_id").references(() => donors.id),
  segmentId: uuid("segment_id").references(() => segments.id),
  type: varchar("type").notNull(), // email, phone, mail, text
  subject: varchar("subject"),
  content: text("content"),
  status: varchar("status").notNull().default("draft"), // draft, sent, delivered, opened, clicked, failed
  
  // Engagement tracking
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("communications_donor_idx").on(table.donorId),
  index("communications_type_idx").on(table.type),
  index("communications_status_idx").on(table.status),
]);

// Data imports table
export const dataImports = pgTable("data_imports", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  fileName: varchar("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  totalRows: integer("total_rows").notNull(),
  processedRows: integer("processed_rows").default(0),
  successfulRows: integer("successful_rows").default(0),
  errorRows: integer("error_rows").default(0),
  status: varchar("status").notNull().default("processing"), // processing, completed, failed
  fieldMapping: jsonb("field_mapping").notNull(),
  errors: jsonb("errors").default([]),
  options: jsonb("options").default({}),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Segment definitions table - Saved donor filter queries and segments
export const segmentDefinitions = pgTable("segment_definitions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  filterQuery: jsonb("filter_query").notNull(), // Complex query filters as JSON
  sqlQuery: text("sql_query"), // Generated SQL for performance
  estimatedCount: integer("estimated_count").default(0),
  lastCalculated: timestamp("last_calculated"),
  isAutoUpdated: boolean("is_auto_updated").default(true),
  tags: jsonb("tags").default([]),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("segment_definitions_name_idx").on(table.name),
  index("segment_definitions_created_by_idx").on(table.createdBy),
]);

// Workflows table - Automated donor journey workflows with triggers and actions
export const workflows = pgTable("workflows", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  status: workflowStatusEnum("status").notNull().default('draft'),
  triggerType: workflowTriggerTypeEnum("trigger_type").notNull(),
  triggerConfig: jsonb("trigger_config").notNull(), // Trigger configuration
  actions: jsonb("actions").notNull(), // Array of actions to execute
  conditions: jsonb("conditions").default([]), // Conditions to check before execution
  
  // Execution tracking
  totalExecutions: integer("total_executions").default(0),
  successfulExecutions: integer("successful_executions").default(0),
  failedExecutions: integer("failed_executions").default(0),
  lastExecuted: timestamp("last_executed"),
  
  // Settings
  isActive: boolean("is_active").notNull().default(true),
  priority: integer("priority").default(0),
  maxExecutions: integer("max_executions"), // Limit total executions
  
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("workflows_status_idx").on(table.status),
  index("workflows_trigger_type_idx").on(table.triggerType),
  index("workflows_created_by_idx").on(table.createdBy),
]);

// Experiments table - A/B testing campaigns with variants and metrics
export const experiments = pgTable("experiments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  hypothesis: text("hypothesis"),
  status: experimentStatusEnum("status").notNull().default('draft'),
  
  // Experiment configuration
  targetSegmentId: uuid("target_segment_id").references(() => segments.id),
  trafficSplit: decimal("traffic_split", { precision: 5, scale: 2 }).default("50.00"), // Percentage for variant A
  variants: jsonb("variants").notNull(), // Array of variant configurations
  
  // Success metrics
  primaryMetric: varchar("primary_metric").notNull(), // donation_amount, conversion_rate, etc.
  secondaryMetrics: jsonb("secondary_metrics").default([]),
  
  // Results tracking
  totalParticipants: integer("total_participants").default(0),
  variantAParticipants: integer("variant_a_participants").default(0),
  variantBParticipants: integer("variant_b_participants").default(0),
  results: jsonb("results").default({}),
  statisticalSignificance: decimal("statistical_significance", { precision: 5, scale: 4 }),
  
  // Timeline
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  duration: integer("duration"), // Duration in days
  
  createdBy: varchar("created_by").notNull().references(() => users.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("experiments_status_idx").on(table.status),
  index("experiments_target_segment_idx").on(table.targetSegmentId),
  index("experiments_created_by_idx").on(table.createdBy),
]);

// Grants table - Grant proposal tracking with deadlines and status
export const grants = pgTable("grants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  grantorName: varchar("grantor_name").notNull(),
  grantorContact: jsonb("grantor_contact").default({}), // Contact information
  
  // Grant details
  type: grantTypeEnum("type").notNull(),
  status: grantStatusEnum("status").notNull().default('prospect'),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  requestedAmount: decimal("requested_amount", { precision: 12, scale: 2 }),
  awardedAmount: decimal("awarded_amount", { precision: 12, scale: 2 }),
  
  // Important dates
  applicationDeadline: date("application_deadline"),
  decisionDate: date("decision_date"),
  projectStartDate: date("project_start_date"),
  projectEndDate: date("project_end_date"),
  reportingDeadline: date("reporting_deadline"),
  
  // Tracking
  probability: decimal("probability", { precision: 5, scale: 2 }), // Likelihood of success %
  attachments: jsonb("attachments").default([]), // File references
  notes: text("notes"),
  tags: jsonb("tags").default([]),
  
  // Relationships
  campaignId: uuid("campaign_id").references(() => campaigns.id),
  assignedTo: varchar("assigned_to").references(() => users.id),
  
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("grants_status_idx").on(table.status),
  index("grants_type_idx").on(table.type),
  index("grants_deadline_idx").on(table.applicationDeadline),
  index("grants_assigned_to_idx").on(table.assignedTo),
]);

// Import jobs table - Advanced file import processing with mapping and results
export const importJobs = pgTable("import_jobs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  
  // File details
  fileName: varchar("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: varchar("file_type").notNull(), // csv, xlsx, json
  fileUrl: varchar("file_url"), // Object storage URL
  
  // Processing configuration
  targetEntity: varchar("target_entity").notNull(), // donors, donations, campaigns
  fieldMapping: jsonb("field_mapping").notNull(),
  transformRules: jsonb("transform_rules").default([]),
  validationRules: jsonb("validation_rules").default([]),
  deduplicationStrategy: varchar("deduplication_strategy").default("skip"), // skip, update, create_new
  
  // Progress tracking
  status: importJobStatusEnum("status").notNull().default('pending'),
  totalRows: integer("total_rows").default(0),
  processedRows: integer("processed_rows").default(0),
  successfulRows: integer("successful_rows").default(0),
  skippedRows: integer("skipped_rows").default(0),
  errorRows: integer("error_rows").default(0),
  
  // Results
  errors: jsonb("errors").default([]),
  warnings: jsonb("warnings").default([]),
  summary: jsonb("summary").default({}),
  
  // Timeline
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  estimatedDuration: integer("estimated_duration"), // in seconds
  
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("import_jobs_status_idx").on(table.status),
  index("import_jobs_target_entity_idx").on(table.targetEntity),
  index("import_jobs_created_by_idx").on(table.createdBy),
]);

// Templates table - Email/SMS templates with merge tag support
export const templates = pgTable("templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  type: templateTypeEnum("type").notNull(),
  
  // Content
  subject: varchar("subject"), // For email templates
  htmlContent: text("html_content"),
  textContent: text("text_content").notNull(),
  
  // Merge tags and personalization
  availableMergeTags: jsonb("available_merge_tags").default([]),
  personalizations: jsonb("personalizations").default({}),
  
  // Metadata
  category: varchar("category"), // thank_you, receipt, newsletter, etc.
  tags: jsonb("tags").default([]),
  
  // Usage tracking
  usageCount: integer("usage_count").default(0),
  lastUsed: timestamp("last_used"),
  
  // Settings
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").notNull().default(true),
  
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("templates_type_idx").on(table.type),
  index("templates_category_idx").on(table.category),
  index("templates_created_by_idx").on(table.createdBy),
]);

// Donor scores table - Predictive scoring with RFM analysis and capacity indicators
export const donorScores = pgTable("donor_scores", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  donorId: uuid("donor_id").notNull().references(() => donors.id),
  
  // RFM Analysis
  recencyScore: integer("recency_score").notNull(), // 1-5 scale
  frequencyScore: integer("frequency_score").notNull(), // 1-5 scale
  monetaryScore: integer("monetary_score").notNull(), // 1-5 scale
  rfmSegment: varchar("rfm_segment").notNull(), // Champions, Loyal, etc.
  
  // Predictive scores
  givingCapacity: decimal("giving_capacity", { precision: 12, scale: 2 }),
  propensityScore: decimal("propensity_score", { precision: 5, scale: 4 }), // 0-1 likelihood
  churnRisk: decimal("churn_risk", { precision: 5, scale: 4 }), // 0-1 risk score
  nextGiftPredictor: decimal("next_gift_predictor", { precision: 10, scale: 2 }),
  
  // Engagement scores
  emailEngagement: decimal("email_engagement", { precision: 5, scale: 4 }),
  eventAttendance: decimal("event_attendance", { precision: 5, scale: 4 }),
  volunteerEngagement: decimal("volunteer_engagement", { precision: 5, scale: 4 }),
  
  // Wealth indicators
  wealthRating: integer("wealth_rating"), // 1-10 scale
  wealthConfidence: decimal("wealth_confidence", { precision: 5, scale: 4 }),
  estimatedCapacity: decimal("estimated_capacity", { precision: 12, scale: 2 }),
  
  // Model metadata
  modelVersion: varchar("model_version").notNull(),
  calculatedAt: timestamp("calculated_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("donor_scores_donor_idx").on(table.donorId),
  index("donor_scores_rfm_segment_idx").on(table.rfmSegment),
  index("donor_scores_propensity_idx").on(table.propensityScore),
  index("donor_scores_churn_risk_idx").on(table.churnRisk),
]);

// Attribution table - Channel and source tracking for donations
export const attributions = pgTable("attributions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  donationId: uuid("donation_id").notNull().references(() => donations.id),
  donorId: uuid("donor_id").notNull().references(() => donors.id),
  
  // Attribution data
  firstTouchSource: varchar("first_touch_source"), // email, website, event, social
  firstTouchMedium: varchar("first_touch_medium"), // organic, paid, referral
  firstTouchCampaign: varchar("first_touch_campaign"),
  firstTouchDate: timestamp("first_touch_date"),
  
  lastTouchSource: varchar("last_touch_source"),
  lastTouchMedium: varchar("last_touch_medium"), 
  lastTouchCampaign: varchar("last_touch_campaign"),
  lastTouchDate: timestamp("last_touch_date"),
  
  // Multi-touch attribution
  touchPoints: jsonb("touch_points").default([]), // Array of all touchpoints
  attributionModel: varchar("attribution_model").default("last_touch"), // first_touch, last_touch, linear, time_decay
  attributionWeights: jsonb("attribution_weights").default({}),
  
  // UTM parameters
  utmSource: varchar("utm_source"),
  utmMedium: varchar("utm_medium"),
  utmCampaign: varchar("utm_campaign"),
  utmTerm: varchar("utm_term"),
  utmContent: varchar("utm_content"),
  
  // Device and technical data
  deviceType: varchar("device_type"), // desktop, mobile, tablet
  browser: varchar("browser"),
  operatingSystem: varchar("operating_system"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  
  // Geographic data
  country: varchar("country"),
  region: varchar("region"),
  city: varchar("city"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("attributions_donation_idx").on(table.donationId),
  index("attributions_donor_idx").on(table.donorId),
  index("attributions_first_source_idx").on(table.firstTouchSource),
  index("attributions_last_source_idx").on(table.lastTouchSource),
]);

// Audit logs table - System audit trail for compliance
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Action details
  action: auditActionTypeEnum("action").notNull(),
  entityType: varchar("entity_type").notNull(), // donors, donations, campaigns, etc.
  entityId: varchar("entity_id").notNull(),
  
  // User information
  userId: varchar("user_id").references(() => users.id),
  userEmail: varchar("user_email"),
  sessionId: varchar("session_id"),
  
  // Change tracking
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  changedFields: jsonb("changed_fields").default([]),
  
  // Request metadata
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  requestMethod: varchar("request_method"),
  requestUrl: varchar("request_url"),
  
  // Context
  reason: text("reason"), // User-provided reason for sensitive operations
  metadata: jsonb("metadata").default({}),
  
  // Compliance fields
  isHighRisk: boolean("is_high_risk").default(false),
  requiresApproval: boolean("requires_approval").default(false),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("audit_logs_action_idx").on(table.action),
  index("audit_logs_entity_idx").on(table.entityType, table.entityId),
  index("audit_logs_user_idx").on(table.userId),
  index("audit_logs_created_at_idx").on(table.createdAt),
  index("audit_logs_high_risk_idx").on(table.isHighRisk),
]);

// Relations
export const donorsRelations = relations(donors, ({ many }) => ({
  donations: many(donations),
  communications: many(communications),
}));

export const campaignsRelations = relations(campaigns, ({ many }) => ({
  donations: many(donations),
}));

export const donationsRelations = relations(donations, ({ one }) => ({
  donor: one(donors, {
    fields: [donations.donorId],
    references: [donors.id],
  }),
  campaign: one(campaigns, {
    fields: [donations.campaignId],
    references: [campaigns.id],
  }),
}));

export const communicationsRelations = relations(communications, ({ one }) => ({
  donor: one(donors, {
    fields: [communications.donorId],
    references: [donors.id],
  }),
  segment: one(segments, {
    fields: [communications.segmentId],
    references: [segments.id],
  }),
}));

// New entity relations
export const segmentDefinitionsRelations = relations(segmentDefinitions, ({ one }) => ({
  createdBy: one(users, {
    fields: [segmentDefinitions.createdBy],
    references: [users.id],
  }),
}));

export const workflowsRelations = relations(workflows, ({ one }) => ({
  createdBy: one(users, {
    fields: [workflows.createdBy],
    references: [users.id],
  }),
}));

export const experimentsRelations = relations(experiments, ({ one }) => ({
  targetSegment: one(segments, {
    fields: [experiments.targetSegmentId],
    references: [segments.id],
  }),
  createdBy: one(users, {
    fields: [experiments.createdBy],
    references: [users.id],
  }),
}));

export const grantsRelations = relations(grants, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [grants.campaignId],
    references: [campaigns.id],
  }),
  assignedTo: one(users, {
    fields: [grants.assignedTo],
    references: [users.id],
  }),
}));

export const importJobsRelations = relations(importJobs, ({ one }) => ({
  createdBy: one(users, {
    fields: [importJobs.createdBy],
    references: [users.id],
  }),
}));

export const templatesRelations = relations(templates, ({ one }) => ({
  createdBy: one(users, {
    fields: [templates.createdBy],
    references: [users.id],
  }),
}));

export const donorScoresRelations = relations(donorScores, ({ one }) => ({
  donor: one(donors, {
    fields: [donorScores.donorId],
    references: [donors.id],
  }),
}));

export const attributionsRelations = relations(attributions, ({ one }) => ({
  donation: one(donations, {
    fields: [attributions.donationId],
    references: [donations.id],
  }),
  donor: one(donors, {
    fields: [attributions.donorId],
    references: [donors.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [auditLogs.approvedBy],
    references: [users.id],
  }),
}));

// Enhanced existing relations to include new entities
export const usersRelations = relations(users, ({ many }) => ({
  segmentDefinitions: many(segmentDefinitions),
  workflows: many(workflows),
  experiments: many(experiments),
  grantsAssigned: many(grants, { relationName: 'assignedTo' }),
  importJobs: many(importJobs),
  templates: many(templates),
  auditLogs: many(auditLogs, { relationName: 'user' }),
  auditLogsApproved: many(auditLogs, { relationName: 'approvedBy' }),
}));

export const donorsRelationsEnhanced = relations(donors, ({ many, one }) => ({
  donations: many(donations),
  communications: many(communications),
  donorScores: many(donorScores),
  attributions: many(attributions),
}));

export const donationsRelationsEnhanced = relations(donations, ({ one, many }) => ({
  donor: one(donors, {
    fields: [donations.donorId],
    references: [donors.id],
  }),
  campaign: one(campaigns, {
    fields: [donations.campaignId],
    references: [campaigns.id],
  }),
  attributions: many(attributions),
}));

export const campaignsRelationsEnhanced = relations(campaigns, ({ many }) => ({
  donations: many(donations),
  grants: many(grants),
}));

export const segmentsRelationsEnhanced = relations(segments, ({ many }) => ({
  communications: many(communications),
  experiments: many(experiments),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  permissions: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
});

// Additional type alias for backward compatibility
export type InsertUser = z.infer<typeof insertUserSchema>;

export const insertDonorSchema = createInsertSchema(donors).omit({
  id: true,
  lifetimeValue: true,
  averageGiftSize: true,
  totalDonations: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  raised: true,
  donorCount: true,
  costPerDollarRaised: true,
  roi: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDonationSchema = createInsertSchema(donations).omit({
  id: true,
  thankYouSent: true,
  thankYouSentAt: true,
  receiptSent: true,
  receiptSentAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSegmentSchema = createInsertSchema(segments).omit({
  id: true,
  donorCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommunicationSchema = createInsertSchema(communications).omit({
  id: true,
  sentAt: true,
  deliveredAt: true,
  openedAt: true,
  clickedAt: true,
  createdAt: true,
  updatedAt: true,
});

// New entity insert schemas
export const insertSegmentDefinitionSchema = createInsertSchema(segmentDefinitions).omit({
  id: true,
  estimatedCount: true,
  lastCalculated: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkflowSchema = createInsertSchema(workflows).omit({
  id: true,
  totalExecutions: true,
  successfulExecutions: true,
  failedExecutions: true,
  lastExecuted: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExperimentSchema = createInsertSchema(experiments).omit({
  id: true,
  totalParticipants: true,
  variantAParticipants: true,
  variantBParticipants: true,
  results: true,
  statisticalSignificance: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGrantSchema = createInsertSchema(grants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertImportJobSchema = createInsertSchema(importJobs).omit({
  id: true,
  totalRows: true,
  processedRows: true,
  successfulRows: true,
  skippedRows: true,
  errorRows: true,
  errors: true,
  warnings: true,
  summary: true,
  startedAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  usageCount: true,
  lastUsed: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDonorScoreSchema = createInsertSchema(donorScores).omit({
  id: true,
  calculatedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAttributionSchema = createInsertSchema(attributions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertDonor = z.infer<typeof insertDonorSchema>;
export type Donor = typeof donors.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertDonation = z.infer<typeof insertDonationSchema>;
export type Donation = typeof donations.$inferSelect;
export type InsertSegment = z.infer<typeof insertSegmentSchema>;
export type Segment = typeof segments.$inferSelect;
export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;
export type Communication = typeof communications.$inferSelect;
export type DataImport = typeof dataImports.$inferSelect;

// New entity types
export type InsertSegmentDefinition = z.infer<typeof insertSegmentDefinitionSchema>;
export type SegmentDefinition = typeof segmentDefinitions.$inferSelect;
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;
export type Workflow = typeof workflows.$inferSelect;
export type InsertExperiment = z.infer<typeof insertExperimentSchema>;
export type Experiment = typeof experiments.$inferSelect;
export type InsertGrant = z.infer<typeof insertGrantSchema>;
export type Grant = typeof grants.$inferSelect;
export type InsertImportJob = z.infer<typeof insertImportJobSchema>;
export type ImportJob = typeof importJobs.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templates.$inferSelect;
export type InsertDonorScore = z.infer<typeof insertDonorScoreSchema>;
export type DonorScore = typeof donorScores.$inferSelect;
export type InsertAttribution = z.infer<typeof insertAttributionSchema>;
export type Attribution = typeof attributions.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// Additional validation schemas
export const donorSearchSchema = z.object({
  search: z.string().optional(),
  donorType: z.enum(['parent', 'alumni', 'community', 'staff', 'board', 'foundation', 'business']).optional(),
  engagementLevel: z.enum(['new', 'active', 'engaged', 'at_risk', 'lapsed']).optional(),
  giftSizeTier: z.enum(['grassroots', 'mid_level', 'major', 'principal']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
});

export const campaignSearchSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['planned', 'active', 'completed', 'cancelled']).optional(),
  campaignType: z.enum(['annual', 'capital', 'special', 'event']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
});

// Segment query builder schemas
export const segmentRuleSchema = z.object({
  id: z.string(),
  field: z.string(), // e.g., "lifetimeValue", "lastDonationDate", "donorType"
  operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal', 'contains', 'not_contains', 'in', 'not_in', 'between', 'is_null', 'is_not_null', 'in_last_days', 'not_in_last_days']),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number()]))]).optional(),
  valueType: z.enum(['string', 'number', 'boolean', 'date', 'array']).optional(),
});

export const segmentGroupSchema: z.ZodType<{
  id: string;
  combinator: 'and' | 'or';
  rules: (z.infer<typeof segmentRuleSchema> | z.infer<typeof segmentGroupSchema>)[];
  not?: boolean;
}> = z.object({
  id: z.string(),
  combinator: z.enum(['and', 'or']),
  rules: z.array(z.lazy(() => z.union([segmentRuleSchema, segmentGroupSchema]))),
  not: z.boolean().optional(),
});

export const segmentQuerySchema = z.object({
  combinator: z.enum(['and', 'or']),
  rules: z.array(z.union([segmentRuleSchema, segmentGroupSchema])),
  not: z.boolean().optional(),
});

export const segmentSearchSchema = z.object({
  search: z.string().optional(),
  createdBy: z.string().optional(),
  tags: z.array(z.string()).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
});

// Additional search schemas for missing entities
export const donationSearchSchema = z.object({
  search: z.string().optional(),
  donorId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  paymentMethod: z.enum(['check', 'credit_card', 'bank_transfer', 'cash', 'online']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
});

export const communicationSearchSchema = z.object({
  search: z.string().optional(),
  type: z.enum(['email', 'sms', 'letter', 'phone', 'meeting']).optional(),
  status: z.enum(['draft', 'scheduled', 'sent', 'delivered', 'opened', 'clicked', 'failed']).optional(),
  donorId: z.string().uuid().optional(),
  segmentId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
});

export const workflowSearchSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled']).optional(),
  triggerType: z.enum(['donation', 'signup', 'event', 'date', 'engagement']).optional(),
  createdBy: z.string().uuid().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
});

export const experimentSearchSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['draft', 'running', 'paused', 'completed', 'cancelled']).optional(),
  targetSegmentId: z.string().uuid().optional(),
  createdBy: z.string().uuid().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
});

export const grantSearchSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['prospect', 'applied', 'under_review', 'approved', 'funded', 'rejected', 'reported']).optional(),
  type: z.enum(['foundation', 'government', 'corporate', 'individual', 'crowdfunding']).optional(),
  campaignId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
});

export const templateSearchSchema = z.object({
  search: z.string().optional(),
  type: z.enum(['email', 'sms', 'letter', 'receipt', 'thank_you', 'newsletter']).optional(),
  createdBy: z.string().uuid().optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
});

export const importJobSearchSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['pending', 'processing', 'validating', 'importing', 'completed', 'failed', 'cancelled']).optional(),
  targetEntity: z.string().optional(),
  createdBy: z.string().uuid().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
});

export const auditLogSearchSchema = z.object({
  search: z.string().optional(),
  action: z.enum(['create', 'update', 'delete', 'login', 'logout', 'export', 'import', 'view', 'import_started', 'import_completed', 'import_failed', 'import_cancelled']).optional(),
  entityType: z.string().optional(),
  userId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
});

// Enhanced segment definition schema with validation
export const segmentDefinitionCreateSchema = insertSegmentDefinitionSchema.extend({
  filterQuery: segmentQuerySchema,
  tags: z.array(z.string()).optional(),
});

export const segmentDefinitionUpdateSchema = segmentDefinitionCreateSchema.partial();

// Types for segment criteria
export type SegmentRule = z.infer<typeof segmentRuleSchema>;
export type SegmentGroup = z.infer<typeof segmentGroupSchema>;
export type SegmentQuery = z.infer<typeof segmentQuerySchema>;
export type SegmentSearch = z.infer<typeof segmentSearchSchema>;
export type SegmentDefinitionCreate = z.infer<typeof segmentDefinitionCreateSchema>;
export type SegmentDefinitionUpdate = z.infer<typeof segmentDefinitionUpdateSchema>;

// AI Content Generation Schemas
export const aiDonationAppealSchema = z.object({
  donorId: z.string().uuid(),
  campaignId: z.string().uuid().optional(),
  tone: z.enum(['professional', 'warm', 'urgent', 'gratitude']).optional(),
  variations: z.number().int().min(1).max(5).optional(),
});

export const aiSubjectLinesSchema = z.object({
  content: z.string().min(10, "Content must be at least 10 characters"),
  campaignType: z.string().optional(),
  donorId: z.string().uuid().optional(),
  variations: z.number().int().min(1).max(8).optional(),
});

export const aiGrantOutlineSchema = z.object({
  grantId: z.string().uuid().optional(),
  grantorName: z.string().min(1, "Grantor name is required"),
  grantType: z.enum(['foundation', 'government', 'corporate', 'individual', 'crowdfunding']),
  projectDescription: z.string().min(50, "Project description must be at least 50 characters"),
  requestedAmount: z.number().positive("Requested amount must be positive"),
});

// AI Import Schemas
export const aiCSVAnalysisSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  headers: z.array(z.string()).min(1, "Headers are required"),
  sampleData: z.array(z.record(z.any())).min(1, "Sample data is required"),
});

export const aiImportProcessSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  fieldMappings: z.record(z.object({
    dbField: z.string(),
    confidence: z.number().min(0).max(1),
    dataType: z.string(),
    cleaningNeeded: z.array(z.string()),
    examples: z.array(z.string()),
  })).optional(),
  cleaningStrategy: z.object({
    nameProcessing: z.enum(['split', 'keep_combined', 'manual_review']),
    phoneFormatting: z.enum(['standard', 'international', 'mixed']),
    dateFormat: z.enum(['US', 'EU', 'ISO', 'mixed']),
    addressHandling: z.enum(['standard', 'international', 'complex']),
  }).optional(),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    sendWelcomeEmail: z.boolean().default(false),
    updateExisting: z.boolean().default(false),
    validateOnly: z.boolean().default(false),
  }).default({}),
});

export const aiImportPreviewSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  previewCount: z.number().min(1).max(100).default(10),
});

export type AiDonationAppeal = z.infer<typeof aiDonationAppealSchema>;
export type AiSubjectLines = z.infer<typeof aiSubjectLinesSchema>;
export type AiGrantOutline = z.infer<typeof aiGrantOutlineSchema>;
export type AiCSVAnalysis = z.infer<typeof aiCSVAnalysisSchema>;
export type AiImportProcess = z.infer<typeof aiImportProcessSchema>;
export type AiImportPreview = z.infer<typeof aiImportPreviewSchema>;
