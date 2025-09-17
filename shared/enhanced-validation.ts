import { z } from 'zod';

// Enhanced validation with security considerations
export const secureStringSchema = z.string()
  .trim()
  .max(1000, 'String too long') // Prevent DoS
  .refine(
    (val) => !/[<>\"'&]/.test(val), 
    'String contains potentially dangerous characters'
  );

export const secureTextSchema = z.string()
  .trim()
  .max(10000, 'Text too long')
  .refine(
    (val) => !/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(val),
    'Text contains script tags'
  );

export const secureEmailSchema = z.string()
  .email('Invalid email format')
  .toLowerCase()
  .max(254, 'Email too long') // RFC 5321 limit
  .refine(
    (val) => !/[<>\"'&]/.test(val),
    'Email contains invalid characters'
  );

export const securePhoneSchema = z.string()
  .regex(/^[\+]?[1-9][\d\s\-\(\)]{0,20}$/, 'Invalid phone format')
  .transform((val) => val.replace(/[^\d+]/g, ''))
  .refine(
    (val) => val.length >= 7 && val.length <= 15,
    'Phone number must be 7-15 digits'
  );

export const secureUrlSchema = z.string()
  .url('Invalid URL format')
  .max(2048, 'URL too long')
  .refine(
    (val) => /^https?:\/\//.test(val),
    'Only HTTP/HTTPS URLs allowed'
  );

export const secureUuidSchema = z.string()
  .uuid('Invalid UUID format')
  .length(36, 'UUID must be exactly 36 characters');

export const secureDateSchema = z.union([
  z.string().datetime(),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  z.date()
]).transform((val) => {
  if (typeof val === 'string') {
    const date = new Date(val);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    return date;
  }
  return val;
});

export const secureAmountSchema = z.number()
  .positive('Amount must be positive')
  .max(1000000, 'Amount too large')
  .multipleOf(0.01, 'Amount can only have 2 decimal places');

export const securePaginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const secureSearchSchema = z.object({
  search: z.string()
    .trim()
    .max(500, 'Search term too long')
    .optional()
    .refine(
      (val) => !val || !/[<>\"'&]/.test(val),
      'Search contains invalid characters'
    ),
  ...securePaginationSchema.shape,
});

// File upload validation schemas
export const fileUploadSchema = z.object({
  filename: z.string()
    .min(1, 'Filename required')
    .max(255, 'Filename too long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid filename characters'),
  mimetype: z.enum([
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ], { errorMap: () => ({ message: 'Only CSV, XLS, and XLSX files allowed' }) }),
  size: z.number()
    .positive('File size must be positive')
    .max(50 * 1024 * 1024, 'File too large (max 50MB)'),
});

// Enhanced donor validation with security
export const enhancedDonorSchema = z.object({
  firstName: secureStringSchema.min(1, 'First name required').max(50),
  lastName: secureStringSchema.min(1, 'Last name required').max(50),
  email: secureEmailSchema.optional(),
  phone: securePhoneSchema.optional(),
  address: secureStringSchema.max(200).optional(),
  city: secureStringSchema.max(100).optional(),
  state: secureStringSchema.max(50).optional(),
  zipCode: z.string()
    .regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format')
    .optional(),
  country: secureStringSchema.max(50).default('USA'),
  
  // School-specific fields
  donorType: z.enum(['parent', 'alumni', 'community', 'staff', 'board', 'foundation', 'business']),
  studentName: secureStringSchema.max(100).optional(),
  gradeLevel: z.string()
    .regex(/^(K|[1-9]|1[0-2])$/, 'Invalid grade level')
    .optional(),
  alumniYear: z.number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 10)
    .optional(),
  graduationYear: z.number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 20)
    .optional(),
  
  // Communication preferences
  emailOptIn: z.boolean().default(true),
  phoneOptIn: z.boolean().default(false),
  mailOptIn: z.boolean().default(true),
  preferredContactMethod: z.enum(['email', 'phone', 'mail']).default('email'),
  
  // System fields
  notes: secureTextSchema.optional(),
  tags: z.array(secureStringSchema.max(50)).max(20).default([]),
  customFields: z.record(z.string().max(100), z.any()).optional().default({}),
});

// Enhanced campaign validation
export const enhancedCampaignSchema = z.object({
  name: secureStringSchema.min(1, 'Campaign name required').max(200),
  description: secureTextSchema.optional(),
  goal: secureAmountSchema,
  startDate: secureDateSchema,
  endDate: secureDateSchema,
  status: z.enum(['planned', 'active', 'completed', 'cancelled']).default('planned'),
  campaignType: z.enum(['annual', 'capital', 'special', 'event']).default('general'),
  segmentId: secureUuidSchema.optional(),
}).refine(
  (data) => data.endDate >= data.startDate,
  { message: 'End date must be after start date', path: ['endDate'] }
);

// Enhanced donation validation
export const enhancedDonationSchema = z.object({
  donorId: secureUuidSchema,
  campaignId: secureUuidSchema.optional(),
  amount: secureAmountSchema,
  date: secureDateSchema,
  paymentMethod: z.enum(['check', 'credit_card', 'bank_transfer', 'cash', 'online']),
  isRecurring: z.boolean().default(false),
  recurringFrequency: z.enum(['monthly', 'quarterly', 'annually']).optional(),
  transactionId: secureStringSchema.max(100).optional(),
  status: z.enum(['pending', 'completed', 'failed', 'refunded']).default('completed'),
  notes: secureTextSchema.optional(),
}).refine(
  (data) => {
    if (data.isRecurring && !data.recurringFrequency) {
      return false;
    }
    return true;
  },
  { message: 'Recurring frequency required for recurring donations', path: ['recurringFrequency'] }
);

// Enhanced communication validation
export const enhancedCommunicationSchema = z.object({
  type: z.enum(['email', 'sms', 'letter', 'phone', 'meeting']),
  subject: secureStringSchema.max(200).optional(),
  content: secureTextSchema.min(1, 'Content required'),
  recipientType: z.enum(['individual', 'segment', 'campaign']),
  recipientId: secureUuidSchema.optional(),
  segmentId: secureUuidSchema.optional(),
  campaignId: secureUuidSchema.optional(),
  scheduledAt: secureDateSchema.optional(),
  status: z.enum(['draft', 'scheduled', 'sent', 'delivered', 'opened', 'clicked', 'failed']).default('draft'),
  metadata: z.record(z.string().max(100), z.any()).optional().default({}),
}).refine(
  (data) => {
    if (data.recipientType === 'individual' && !data.recipientId) {
      return false;
    }
    if (data.recipientType === 'segment' && !data.segmentId) {
      return false;
    }
    if (data.recipientType === 'campaign' && !data.campaignId) {
      return false;
    }
    return true;
  },
  { message: 'Appropriate recipient ID required based on recipient type' }
);

// Enhanced AI validation schemas
export const enhancedAiDonationAppealSchema = z.object({
  donorId: secureUuidSchema,
  campaignId: secureUuidSchema.optional(),
  tone: z.enum(['professional', 'warm', 'urgent', 'gratitude']).default('warm'),
  variations: z.number().int().min(1).max(5).default(3),
  context: secureTextSchema.max(1000).optional(),
});

export const enhancedAiSubjectLinesSchema = z.object({
  content: secureTextSchema.min(10, 'Content must be at least 10 characters').max(5000),
  campaignType: secureStringSchema.max(50).optional(),
  donorId: secureUuidSchema.optional(),
  variations: z.number().int().min(1).max(8).default(5),
  style: z.enum(['direct', 'personal', 'curiosity', 'benefit']).optional(),
});

export const enhancedAiGrantOutlineSchema = z.object({
  grantId: secureUuidSchema.optional(),
  grantorName: secureStringSchema.min(1, 'Grantor name required').max(200),
  grantType: z.enum(['foundation', 'government', 'corporate', 'individual', 'crowdfunding']),
  projectDescription: secureTextSchema.min(50, 'Project description must be at least 50 characters').max(2000),
  requestedAmount: secureAmountSchema,
  projectDuration: z.number().int().min(1).max(60).optional(), // months
  focusAreas: z.array(secureStringSchema.max(100)).max(10).optional(),
});

// Rate limiting validation
export const rateLimitedRequestSchema = z.object({
  clientId: secureStringSchema.max(100).optional(),
  requestId: secureUuidSchema.optional(),
  timestamp: z.number().int().positive(),
});

// Bulk operation schemas
export const bulkOperationSchema = z.object({
  operation: z.enum(['create', 'update', 'delete']),
  entities: z.array(z.any()).min(1).max(1000), // Limit bulk operations
  options: z.object({
    skipValidation: z.boolean().default(false),
    continueOnError: z.boolean().default(false),
    validateOnly: z.boolean().default(false),
  }).optional(),
});

// Export validation schemas
export const exportRequestSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'json']),
  entityType: z.enum(['donors', 'campaigns', 'donations', 'communications']),
  filters: z.record(z.any()).optional(),
  fields: z.array(secureStringSchema.max(50)).max(50).optional(),
  limit: z.number().int().min(1).max(10000).default(1000),
});

// Session validation
export const sessionValidationSchema = z.object({
  userId: secureUuidSchema,
  sessionId: secureStringSchema.max(255),
  userAgent: secureStringSchema.max(500).optional(),
  ipAddress: z.string().ip().optional(),
  lastActivity: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
});

// Audit log validation
export const auditLogSchema = z.object({
  action: z.enum(['create', 'update', 'delete', 'login', 'logout', 'export', 'import', 'view']),
  entityType: secureStringSchema.max(50),
  entityId: secureStringSchema.max(100).optional(),
  userId: secureUuidSchema,
  userEmail: secureEmailSchema,
  ipAddress: z.string().ip().optional(),
  userAgent: secureStringSchema.max(500).optional(),
  requestMethod: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional(),
  requestUrl: secureStringSchema.max(2048).optional(),
  changes: z.record(z.any()).optional(),
  metadata: z.record(z.string().max(100), z.any()).optional(),
});

// User profile validation
export const userProfileUpdateSchema = z.object({
  firstName: secureStringSchema.min(1).max(50).optional(),
  lastName: secureStringSchema.min(1).max(50).optional(),
  jobTitle: secureStringSchema.max(100).optional(),
  email: secureEmailSchema.optional(),
  profileImageUrl: secureUrlSchema.optional(),
  preferences: z.record(z.string().max(50), z.any()).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

// Password validation (if implementing password auth)
export const passwordSchema = z.string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/, 'Password must contain uppercase letter')
  .regex(/[a-z]/, 'Password must contain lowercase letter')
  .regex(/[0-9]/, 'Password must contain number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain special character')
  .refine(
    (val) => !/(.)\1{2,}/.test(val),
    'Password cannot contain repeated characters'
  );

// API key validation
export const apiKeySchema = z.string()
  .regex(/^sk-[a-zA-Z0-9]{32,}$/, 'Invalid API key format')
  .max(200, 'API key too long');

// Environment validation schemas
export const environmentConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url('Invalid database URL'),
  SESSION_SECRET: z.string().min(32, 'Session secret too short'),
  OPENAI_API_KEY: apiKeySchema.optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  REPLIT_DOMAINS: z.string().min(1, 'Replit domains required'),
});

// Helper functions for validation
export function validateAndSanitizeInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.warn(`Validation failed${context ? ` for ${context}` : ''}:`, error.errors);
      throw new Error(`Invalid input${context ? ` for ${context}` : ''}: ${error.errors[0]?.message}`);
    }
    throw error;
  }
}

export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function sanitizeForDatabase(input: string): string {
  return input
    .replace(/[\x00\x08\x09\x1a\n\r"'\\\%]/g, ''); // Remove dangerous chars
}

export function validateFileUpload(file: Express.Multer.File): void {
  const validatedFile = fileUploadSchema.parse({
    filename: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
  });
  
  // Additional checks
  if (file.buffer && file.buffer.length !== file.size) {
    throw new Error('File size mismatch');
  }
  
  // Check file signatures (magic numbers)
  const magicNumbers = {
    'text/csv': [0x2C], // Comma (simplified check)
    'application/vnd.ms-excel': [0xD0, 0xCF, 0x11, 0xE0],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [0x50, 0x4B]
  };
  
  const signature = magicNumbers[file.mimetype as keyof typeof magicNumbers];
  if (signature && file.buffer) {
    const fileSignature = Array.from(file.buffer.slice(0, signature.length));
    if (!signature.every((byte, index) => byte === fileSignature[index])) {
      throw new Error('File signature does not match declared type');
    }
  }
}