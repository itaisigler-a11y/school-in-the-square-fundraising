import OpenAI from "openai";
import type { Donor, Campaign, Grant } from "@shared/schema";
import { createHash } from "crypto";

/*
Using the OpenAI integration blueprint:
- the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
- Using response_format: { type: "json_object" } for structured outputs
- Requesting output in JSON format in prompts
*/

// Rate limiting configuration
interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  maxTokensPerRequest: number;
}

const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  maxRequestsPerMinute: 10,
  maxRequestsPerHour: 100,
  maxTokensPerRequest: 4000,
};

// Request tracking for rate limiting
const requestCounts = {
  minute: new Map<string, { count: number; resetTime: number }>(),
  hour: new Map<string, { count: number; resetTime: number }>(),
};

class AIService {
  private openai: OpenAI;
  private rateLimits: RateLimitConfig;

  constructor(rateLimits: RateLimitConfig = DEFAULT_RATE_LIMITS) {
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OPENAI_API_KEY environment variable not found. AI features will be disabled.");
      this.openai = null as any; // AI features disabled
    } else {
      this.openai = new OpenAI({ 
        apiKey: process.env.OPENAI_API_KEY 
      });
    }
    this.rateLimits = rateLimits;
  }

  // Rate limiting check
  private checkRateLimit(userId: string): void {
    const now = Date.now();
    
    // Check minute limit
    const minuteKey = `${userId}:${Math.floor(now / 60000)}`;
    const minuteData = requestCounts.minute.get(minuteKey);
    if (minuteData && minuteData.count >= this.rateLimits.maxRequestsPerMinute) {
      throw new Error("Rate limit exceeded: too many requests per minute");
    }

    // Check hour limit
    const hourKey = `${userId}:${Math.floor(now / 3600000)}`;
    const hourData = requestCounts.hour.get(hourKey);
    if (hourData && hourData.count >= this.rateLimits.maxRequestsPerHour) {
      throw new Error("Rate limit exceeded: too many requests per hour");
    }

    // Increment counters
    requestCounts.minute.set(minuteKey, {
      count: (minuteData?.count || 0) + 1,
      resetTime: now + 60000,
    });

    requestCounts.hour.set(hourKey, {
      count: (hourData?.count || 0) + 1,
      resetTime: now + 3600000,
    });

    // Cleanup old entries
    this.cleanupRateLimitData();
  }

  private cleanupRateLimitData(): void {
    const now = Date.now();
    
    for (const [key, data] of requestCounts.minute.entries()) {
      if (data.resetTime < now) {
        requestCounts.minute.delete(key);
      }
    }

    for (const [key, data] of requestCounts.hour.entries()) {
      if (data.resetTime < now) {
        requestCounts.hour.delete(key);
      }
    }
  }

  // Cost tracking helper
  private calculateCost(tokens: number, model: string = "gpt-5"): { tokensUsed: number; estimatedCostUSD: number } {
    // GPT-5 pricing (estimated - adjust based on actual OpenAI pricing)
    const costPerToken = 0.00002; // $0.02 per 1K tokens
    return {
      tokensUsed: tokens,
      estimatedCostUSD: (tokens * costPerToken)
    };
  }

  // Create audit trail helper
  private async logAIUsage(params: {
    userId: string;
    action: 'ai_donation_appeal' | 'ai_subject_lines' | 'ai_grant_outline' | 'ai_csv_analysis' | 'ai_data_processing' | 'ai_field_mapping';
    inputData: any;
    outputData?: any;
    tokensUsed?: number;
    cost?: number;
    success: boolean;
    error?: string;
    storage: any;
  }): Promise<void> {
    try {
      // Hash input data to avoid storing PII
      const inputHash = createHash('sha256').update(JSON.stringify(params.inputData)).digest('hex');
      
      await params.storage.createAuditLog({
        action: params.action,
        entityType: 'ai_service',
        entityId: inputHash.substring(0, 16), // Use hash prefix as entity ID
        userId: params.userId,
        userEmail: '', // Will be filled by storage layer
        ipAddress: '', // Will be filled by request context
        userAgent: '', // Will be filled by request context
        details: {
          inputHash,
          tokensUsed: params.tokensUsed,
          estimatedCost: params.cost,
          success: params.success,
          error: params.error,
          outputSummary: params.outputData ? {
            itemsGenerated: Array.isArray(params.outputData.appeals) ? params.outputData.appeals.length : 
                          Array.isArray(params.outputData.subjectLines) ? params.outputData.subjectLines.length :
                          params.outputData.outline ? 1 : 0
          } : null
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to create AI usage audit log:', error);
      // Don't throw - audit logging shouldn't break AI functionality
    }
  }

  // Generate personalized donation appeals
  async generateDonationAppeal(params: {
    donor: Donor;
    campaign?: Campaign;
    tone?: 'professional' | 'warm' | 'urgent' | 'gratitude';
    variations?: number;
    userId: string;
    storage?: any;
  }): Promise<{
    appeals: Array<{
      content: string;
      subject?: string;
      tone: string;
      keyPoints: string[];
    }>;
    donorInsights: {
      segment: string;
      engagementLevel: string;
      suggestedApproach: string;
    };
  }> {
    if (!this.openai) {
      return {
        appeals: [{
          content: "AI features are currently disabled. Please configure OPENAI_API_KEY to use AI-generated appeals.",
          subject: "Manual Appeal Required",
          tone: params.tone || 'warm',
          keyPoints: ["AI features disabled", "Manual content needed"]
        }],
        donorInsights: {
          segment: params.donor.donorType || 'unknown',
          engagementLevel: params.donor.engagementLevel || 'unknown',
          suggestedApproach: "Manual approach required"
        }
      };
    }
    this.checkRateLimit(params.userId);
    
    const startTime = Date.now();
    let tokensUsed = 0;
    let estimatedCost = 0;
    
    try {
      const donorContext = this.buildDonorContext(params.donor);
      const campaignContext = params.campaign ? this.buildCampaignContext(params.campaign) : '';
      const tone = params.tone || 'warm';
      const variations = Math.min(params.variations || 3, 5);

      const systemPrompt = `You are an expert fundraising consultant for School in the Square, a progressive educational institution. Create personalized donation appeals that are compelling, authentic, and respectful.

School Context:
- Mission: Progressive education focused on student-centered learning
- Values: Innovation, community, equity, environmental responsibility
- Programs: Academic excellence, arts integration, environmental sustainability

Guidelines:
- Be authentic and personal, not manipulative
- Connect donor's relationship to specific school impact
- Use appropriate tone for the donor relationship
- Include specific giving suggestions when appropriate
- Reference School in the Square mission and values naturally

Respond with JSON in this exact format:
{
  "appeals": [
    {
      "content": "Full appeal text",
      "subject": "Email subject line",
      "tone": "tone used",
      "keyPoints": ["key point 1", "key point 2"]
    }
  ],
  "donorInsights": {
    "segment": "donor segment analysis",
    "engagementLevel": "current engagement assessment", 
    "suggestedApproach": "recommended outreach strategy"
  }
}`;

      const userPrompt = `Create ${variations} personalized donation appeal variations for this donor:

${donorContext}

${campaignContext}

Requested tone: ${tone}

Generate appeals that:
1. Reference their specific connection to School in the Square
2. Use their giving history to inform the ask amount
3. Connect to current school needs or campaign goals
4. Maintain ${tone} tone throughout
5. Include compelling subject lines for email outreach`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: this.rateLimits.maxTokensPerRequest,
        temperature: 0.7,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      // Calculate cost and log usage
      tokensUsed = response.usage?.total_tokens || 0;
      const costInfo = this.calculateCost(tokensUsed);
      estimatedCost = costInfo.estimatedCostUSD;
      
      // Validate response structure
      if (!result.appeals || !Array.isArray(result.appeals)) {
        throw new Error("Invalid response format from AI service");
      }

      // Log successful AI usage
      if (params.storage) {
        await this.logAIUsage({
          userId: params.userId,
          action: 'ai_donation_appeal',
          inputData: { donorId: params.donor.id, tone: params.tone, variations },
          outputData: result,
          tokensUsed,
          cost: estimatedCost,
          success: true,
          storage: params.storage
        });
      }

      return result;
    } catch (error) {
      console.error("Error generating donation appeal:", error);
      
      // Log failed AI usage
      if (params.storage) {
        await this.logAIUsage({
          userId: params.userId,
          action: 'ai_donation_appeal',
          inputData: { donorId: params.donor.id, tone: params.tone, variations },
          tokensUsed,
          cost: estimatedCost,
          success: false,
          error: error.message,
          storage: params.storage
        });
      }
      
      throw new Error(`Failed to generate donation appeal: ${error.message}`);
    }
  }

  // Generate email subject line variations
  async generateSubjectLines(params: {
    content: string;
    campaignType?: string;
    donor?: Donor;
    variations?: number;
    userId: string;
    storage?: any;
  }): Promise<{
    subjectLines: Array<{
      text: string;
      style: string;
      predictedPerformance: 'high' | 'medium' | 'low';
      reasoning: string;
    }>;
  }> {
    this.checkRateLimit(params.userId);
    
    const startTime = Date.now();
    let tokensUsed = 0;
    let estimatedCost = 0;

    try {
      const variations = Math.min(params.variations || 5, 8);
      const donorContext = params.donor ? this.buildDonorContext(params.donor) : '';

      const systemPrompt = `You are an email marketing expert specializing in nonprofit fundraising. Create compelling subject lines that increase open rates while maintaining authenticity.

Guidelines:
- Keep subject lines 30-50 characters when possible
- Use personalization appropriately 
- Create urgency without being manipulative
- Reference School in the Square naturally
- Vary styles: direct, personal, curiosity-driven, benefit-focused

Respond with JSON in this exact format:
{
  "subjectLines": [
    {
      "text": "Subject line text",
      "style": "style description",
      "predictedPerformance": "high/medium/low",
      "reasoning": "why this should perform well/poorly"
    }
  ]
}`;

      const userPrompt = `Create ${variations} email subject line variations for this content:

Email Content Preview:
${params.content.substring(0, 500)}...

Campaign Type: ${params.campaignType || 'general fundraising'}

${donorContext}

Generate subject lines with different approaches:
- Personal/relationship-focused
- Urgency/deadline-driven  
- Benefit/impact-focused
- Curiosity/question-based
- Direct/straightforward`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
        temperature: 0.8,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      // Calculate cost and log usage
      tokensUsed = response.usage?.total_tokens || 0;
      const costInfo = this.calculateCost(tokensUsed);
      estimatedCost = costInfo.estimatedCostUSD;
      
      if (!result.subjectLines || !Array.isArray(result.subjectLines)) {
        throw new Error("Invalid response format from AI service");
      }
      
      // Log successful AI usage
      if (params.storage) {
        await this.logAIUsage({
          userId: params.userId,
          action: 'ai_subject_lines',
          inputData: { contentLength: params.content.length, campaignType: params.campaignType, variations },
          outputData: result,
          tokensUsed,
          cost: estimatedCost,
          success: true,
          storage: params.storage
        });
      }

      return result;
    } catch (error) {
      console.error("Error generating subject lines:", error);
      
      // Log failed AI usage
      if (params.storage) {
        await this.logAIUsage({
          userId: params.userId,
          action: 'ai_subject_lines',
          inputData: { contentLength: params.content.length, campaignType: params.campaignType, variations },
          tokensUsed,
          cost: estimatedCost,
          success: false,
          error: error.message,
          storage: params.storage
        });
      }
      
      throw new Error(`Failed to generate subject lines: ${error.message}`);
    }
  }

  // Generate grant proposal outlines
  async generateGrantOutline(params: {
    grantInfo: Partial<Grant>;
    projectDescription: string;
    requestedAmount: number;
    userId: string;
    storage?: any;
  }): Promise<{
    outline: {
      executiveSummary: string;
      problemStatement: string;
      projectDescription: string;
      methodology: string[];
      budget: {
        category: string;
        amount: number;
        justification: string;
      }[];
      evaluation: string;
      sustainability: string;
    };
    recommendations: string[];
  }> {
    this.checkRateLimit(params.userId);
    
    const startTime = Date.now();
    let tokensUsed = 0;
    let estimatedCost = 0;

    try {
      const systemPrompt = `You are a professional grant writer with expertise in educational funding. Create comprehensive grant proposal outlines that are compelling and well-structured.

School Context:
- School in the Square: Progressive educational institution
- Focus: Student-centered learning, innovation, community engagement
- Values: Equity, environmental responsibility, academic excellence

Respond with JSON in this exact format:
{
  "outline": {
    "executiveSummary": "2-3 paragraph executive summary",
    "problemStatement": "Clear problem/need statement",
    "projectDescription": "Detailed project description",
    "methodology": ["step 1", "step 2", "step 3"],
    "budget": [
      {
        "category": "budget category",
        "amount": dollar_amount,
        "justification": "justification text"
      }
    ],
    "evaluation": "evaluation and assessment plan",
    "sustainability": "long-term sustainability plan"
  },
  "recommendations": ["tip 1", "tip 2", "tip 3"]
}`;

      const userPrompt = `Create a grant proposal outline for:

Grant Type: ${params.grantInfo.type || 'foundation'}
Grantor: ${params.grantInfo.grantorName || 'Foundation/Agency'}
Requested Amount: $${params.requestedAmount.toLocaleString()}

Project Description:
${params.projectDescription}

Generate a comprehensive outline that includes:
1. Compelling executive summary highlighting School in the Square impact
2. Clear problem statement with supporting data
3. Detailed project methodology and timeline
4. Realistic budget breakdown with justifications
5. Evaluation metrics and success indicators
6. Sustainability and long-term impact plan`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: this.rateLimits.maxTokensPerRequest,
        temperature: 0.6,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      // Calculate cost and log usage
      tokensUsed = response.usage?.total_tokens || 0;
      const costInfo = this.calculateCost(tokensUsed);
      estimatedCost = costInfo.estimatedCostUSD;
      
      if (!result.outline) {
        throw new Error("Invalid response format from AI service");
      }
      
      // Log successful AI usage
      if (params.storage) {
        await this.logAIUsage({
          userId: params.userId,
          action: 'ai_grant_outline',
          inputData: { 
            grantorName: params.grantInfo.grantorName, 
            grantType: params.grantInfo.type, 
            requestedAmount: params.requestedAmount,
            descriptionLength: params.projectDescription.length
          },
          outputData: result,
          tokensUsed,
          cost: estimatedCost,
          success: true,
          storage: params.storage
        });
      }

      return result;
    } catch (error) {
      console.error("Error generating grant outline:", error);
      
      // Log failed AI usage
      if (params.storage) {
        await this.logAIUsage({
          userId: params.userId,
          action: 'ai_grant_outline',
          inputData: { 
            grantorName: params.grantInfo.grantorName, 
            grantType: params.grantInfo.type, 
            requestedAmount: params.requestedAmount,
            descriptionLength: params.projectDescription.length
          },
          tokensUsed,
          cost: estimatedCost,
          success: false,
          error: error.message,
          storage: params.storage
        });
      }
      
      throw new Error(`Failed to generate grant outline: ${error.message}`);
    }
  }

  // Helper methods for building context
  private buildDonorContext(donor: Donor): string {
    const context = [
      `Donor: ${donor.firstName} ${donor.lastName}`,
      `Type: ${donor.donorType}`,
      `Engagement Level: ${donor.engagementLevel}`,
      `Gift Tier: ${donor.giftSizeTier}`,
    ];

    if (donor.lifetimeValue && parseFloat(donor.lifetimeValue) > 0) {
      context.push(`Lifetime Value: $${parseFloat(donor.lifetimeValue).toLocaleString()}`);
    }

    if (donor.totalDonations && donor.totalDonations > 0) {
      context.push(`Total Donations: ${donor.totalDonations}`);
    }

    if (donor.averageGiftSize && parseFloat(donor.averageGiftSize) > 0) {
      context.push(`Average Gift: $${parseFloat(donor.averageGiftSize).toLocaleString()}`);
    }

    if (donor.studentName) {
      context.push(`Student: ${donor.studentName}`);
    }

    if (donor.gradeLevel) {
      context.push(`Grade Level: ${donor.gradeLevel}`);
    }

    if (donor.alumniYear) {
      context.push(`Alumni Class: ${donor.alumniYear}`);
    }

    if (donor.lastDonationDate) {
      context.push(`Last Donation: ${donor.lastDonationDate}`);
    }

    return context.join('\n');
  }

  private buildCampaignContext(campaign: Campaign): string {
    const context = [
      `\nCampaign: ${campaign.name}`,
      `Type: ${campaign.campaignType}`,
      `Goal: $${parseFloat(campaign.goal).toLocaleString()}`,
      `Status: ${campaign.status}`,
    ];

    if (campaign.description) {
      context.push(`Description: ${campaign.description}`);
    }

    if (campaign.raised && parseFloat(campaign.raised) > 0) {
      const progress = (parseFloat(campaign.raised) / parseFloat(campaign.goal)) * 100;
      context.push(`Progress: $${parseFloat(campaign.raised).toLocaleString()} (${progress.toFixed(1)}%)`);
    }

    if (campaign.startDate && campaign.endDate) {
      context.push(`Timeline: ${campaign.startDate} to ${campaign.endDate}`);
    }

    return context.join('\n');
  }

  // AI-Powered CSV Analysis and Import Processing
  async analyzeCSVForImport(params: {
    headers: string[];
    sampleData: any[];
    fileName: string;
    userId: string;
    storage?: any;
  }): Promise<{
    fieldMappings: {
      [csvColumn: string]: {
        dbField: string;
        confidence: number;
        dataType: string;
        cleaningNeeded: string[];
        examples: string[];
      };
    };
    overallConfidence: number;
    requiredFieldsCovered: boolean;
    dataQualityIssues: string[];
    cleaningStrategy: {
      nameProcessing: 'split' | 'keep_combined' | 'manual_review';
      phoneFormatting: 'standard' | 'international' | 'mixed';
      dateFormat: 'US' | 'EU' | 'ISO' | 'mixed';
      addressHandling: 'standard' | 'international' | 'complex';
    };
  }> {
    if (!this.openai) {
      return this.getFallbackCSVAnalysis(params.headers, params.sampleData);
    }
    
    this.checkRateLimit(params.userId);
    
    const startTime = Date.now();
    let tokensUsed = 0;
    let estimatedCost = 0;
    
    try {
      // Build donor schema context for AI
      const donorSchemaContext = `
Available Database Fields for School in the Square Fundraising Platform:

REQUIRED FIELDS:
- firstName (string) - Donor's first name
- lastName (string) - Donor's last name

CONTACT INFORMATION:
- email (string) - Email address
- phone (string) - Phone number  
- address (string) - Street address
- city (string) - City name
- state (string) - State/Province  
- zipCode (string) - ZIP/Postal code
- country (string) - Country (defaults to USA)

SCHOOL-SPECIFIC FIELDS:
- donorType (enum) - Options: parent, alumni, community, staff, board, foundation, business
- studentName (string) - Name of associated student
- gradeLevel (string) - Student's grade level
- alumniYear (integer) - Year of alumni graduation
- graduationYear (integer) - Graduation year

ENGAGEMENT & ANALYTICS:
- engagementLevel (enum) - Options: new, active, engaged, at_risk, lapsed
- giftSizeTier (enum) - Options: grassroots, mid_level, major, principal
- lifetimeValue (decimal) - Total lifetime giving
- averageGiftSize (decimal) - Average gift amount
- totalDonations (integer) - Number of donations
- lastDonationDate (date) - Date of most recent gift
- firstDonationDate (date) - Date of first gift

COMMUNICATION PREFERENCES:
- emailOptIn (boolean) - Email permission
- phoneOptIn (boolean) - Phone permission  
- mailOptIn (boolean) - Mail permission
- preferredContactMethod (string) - Options: email, phone, mail

ADDITIONAL FIELDS:
- notes (text) - Additional notes/comments
- tags (json array) - Categorization tags
- customFields (json object) - Custom data storage
`;

      const systemPrompt = `You are an expert data analyst for School in the Square, a progressive educational institution. Analyze CSV data to automatically map fields to our donor database schema with high precision.

Your task:
1. Map CSV columns to database fields with confidence scores
2. Detect data types and cleaning requirements
3. Identify data quality issues
4. Suggest processing strategies

Be precise and confident. This system handles real donor data imports with zero manual intervention required.

Respond with JSON in this exact format:
{
  "fieldMappings": {
    "CSV_Column_Name": {
      "dbField": "database_field_name",
      "confidence": 0.95,
      "dataType": "string|number|date|boolean|email|phone",
      "cleaningNeeded": ["standardize_phone", "split_name", "parse_date"],
      "examples": ["sample", "values", "from_column"]
    }
  },
  "overallConfidence": 0.92,
  "requiredFieldsCovered": true,
  "dataQualityIssues": ["Missing email addresses in 15% of records"],
  "cleaningStrategy": {
    "nameProcessing": "split",
    "phoneFormatting": "standard", 
    "dateFormat": "US",
    "addressHandling": "standard"
  }
}`;

      const userPrompt = `Analyze this CSV data for automatic import into our donor database:

File: ${params.fileName}
Headers: ${JSON.stringify(params.headers)}

Sample Data (first 3 rows):
${JSON.stringify(params.sampleData.slice(0, 3), null, 2)}

${donorSchemaContext}

Requirements:
- Map every relevant CSV column to appropriate database field
- firstName and lastName are REQUIRED - if there's a combined name field, note it needs splitting
- Assign confidence scores (0.0-1.0) based on header similarity and data content
- Identify cleaning needed: phone formatting, date parsing, name splitting, etc.
- Flag data quality issues: missing data, invalid formats, inconsistencies
- Choose processing strategies based on detected patterns

Focus on accuracy - this will import real donor data automatically.`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: this.rateLimits.maxTokensPerRequest,
        temperature: 0.1, // Low temperature for consistent, precise analysis
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      // Calculate cost and log usage
      tokensUsed = response.usage?.total_tokens || 0;
      const costInfo = this.calculateCost(tokensUsed);
      estimatedCost = costInfo.estimatedCostUSD;

      // Validate and enhance the AI response
      const enhancedResult = this.enhanceCSVAnalysis(result, params.headers, params.sampleData);
      
      // Log AI usage for audit trail
      if (params.storage) {
        await this.logAIUsage({
          userId: params.userId,
          action: 'ai_csv_analysis',
          inputData: {
            fileName: params.fileName,
            headerCount: params.headers.length,
            sampleRowCount: params.sampleData.length
          },
          outputData: {
            mappingsGenerated: Object.keys(enhancedResult.fieldMappings).length,
            overallConfidence: enhancedResult.overallConfidence,
            requiredFieldsCovered: enhancedResult.requiredFieldsCovered
          },
          tokensUsed,
          cost: estimatedCost,
          success: true,
          storage: params.storage
        });
      }

      return enhancedResult;
      
    } catch (error) {
      console.error('AI CSV analysis failed:', error);
      
      // Log the error
      if (params.storage) {
        await this.logAIUsage({
          userId: params.userId,
          action: 'ai_csv_analysis',
          inputData: {
            fileName: params.fileName,
            headerCount: params.headers.length
          },
          tokensUsed,
          cost: estimatedCost,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          storage: params.storage
        });
      }
      
      // Return fallback analysis
      return this.getFallbackCSVAnalysis(params.headers, params.sampleData);
    }
  }

  // Enhance AI analysis with validation and fallback logic
  private enhanceCSVAnalysis(aiResult: any, headers: string[], sampleData: any[]): any {
    const enhanced = { ...aiResult };
    
    // Ensure required fields are detected or flagged
    const mappedFields = Object.values(enhanced.fieldMappings || {}).map((m: any) => m.dbField);
    const hasFirstName = mappedFields.includes('firstName');
    const hasLastName = mappedFields.includes('lastName');
    
    if (!hasFirstName || !hasLastName) {
      // Check for combined name field
      const nameFields = headers.filter(h => 
        h.toLowerCase().match(/\b(name|full.*name|donor.*name|contact.*name)\b/)
      );
      
      if (nameFields.length > 0 && !enhanced.fieldMappings[nameFields[0]]) {
        enhanced.fieldMappings[nameFields[0]] = {
          dbField: 'fullName', // Special field for splitting
          confidence: 0.85,
          dataType: 'string',
          cleaningNeeded: ['split_name'],
          examples: sampleData.slice(0, 3).map(row => row[nameFields[0]]).filter(Boolean)
        };
      }
    }
    
    // Validate confidence scores
    Object.keys(enhanced.fieldMappings || {}).forEach(csvField => {
      const mapping = enhanced.fieldMappings[csvField];
      if (mapping.confidence > 1.0) mapping.confidence = 1.0;
      if (mapping.confidence < 0.0) mapping.confidence = 0.0;
    });
    
    // Calculate overall confidence if missing
    if (!enhanced.overallConfidence) {
      const confidences = Object.values(enhanced.fieldMappings || {}).map((m: any) => m.confidence);
      enhanced.overallConfidence = confidences.length > 0 
        ? confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length 
        : 0.5;
    }
    
    // Check required fields coverage
    enhanced.requiredFieldsCovered = hasFirstName && hasLastName;
    
    return enhanced;
  }

  // Fallback CSV analysis when AI is unavailable
  private getFallbackCSVAnalysis(headers: string[], sampleData: any[]): any {
    const fieldMappings: any = {};
    
    headers.forEach(header => {
      const lowerHeader = header.toLowerCase().replace(/[\s\-_]/g, '');
      let dbField = '';
      let confidence = 0.7;
      let dataType = 'string';
      let cleaningNeeded: string[] = [];
      
      // Basic pattern matching for common fields
      if (['firstname', 'fname', 'first'].some(pattern => lowerHeader.includes(pattern))) {
        dbField = 'firstName';
        confidence = 0.9;
      } else if (['lastname', 'lname', 'last', 'surname'].some(pattern => lowerHeader.includes(pattern))) {
        dbField = 'lastName';
        confidence = 0.9;
      } else if (['fullname', 'name', 'donorname'].some(pattern => lowerHeader === pattern)) {
        dbField = 'fullName';
        cleaningNeeded.push('split_name');
        confidence = 0.8;
      } else if (['email', 'emailaddress'].some(pattern => lowerHeader === pattern)) {
        dbField = 'email';
        dataType = 'email';
        confidence = 0.95;
      } else if (['phone', 'phonenumber', 'telephone'].some(pattern => lowerHeader.includes(pattern))) {
        dbField = 'phone';
        dataType = 'phone';
        cleaningNeeded.push('standardize_phone');
        confidence = 0.9;
      } else if (['address', 'streetaddress'].some(pattern => lowerHeader.includes(pattern))) {
        dbField = 'address';
        confidence = 0.85;
      }
      
      if (dbField) {
        fieldMappings[header] = {
          dbField,
          confidence,
          dataType,
          cleaningNeeded,
          examples: sampleData.slice(0, 3).map(row => row[header]).filter(Boolean)
        };
      }
    });
    
    const mappedFields = Object.values(fieldMappings).map((m: any) => m.dbField);
    
    return {
      fieldMappings,
      overallConfidence: 0.7,
      requiredFieldsCovered: mappedFields.includes('firstName') && mappedFields.includes('lastName'),
      dataQualityIssues: ['AI analysis unavailable - using basic pattern matching'],
      cleaningStrategy: {
        nameProcessing: 'split',
        phoneFormatting: 'standard',
        dateFormat: 'US',
        addressHandling: 'standard'
      }
    };
  }

  // AI-Powered Data Processing and Cleaning
  async processDataRowWithAI(params: {
    rowData: any;
    fieldMappings: any;
    cleaningStrategy: any;
    rowIndex: number;
    userId: string;
    storage?: any;
  }): Promise<{
    cleanedData: any;
    warnings: string[];
    errors: string[];
    confidence: number;
  }> {
    if (!this.openai) {
      return this.getFallbackDataProcessing(params);
    }
    
    this.checkRateLimit(params.userId);
    
    try {
      const systemPrompt = `You are a data cleaning specialist for School in the Square fundraising platform. Clean and standardize donor data for database import.

Requirements:
- Split full names into firstName and lastName intelligently
- Standardize phone numbers to digits only (remove formatting)
- Validate and clean email addresses
- Parse dates to YYYY-MM-DD format
- Detect and standardize donor types and engagement levels
- Flag any data quality issues

Respond with JSON in this exact format:
{
  "cleanedData": {
    "firstName": "John",
    "lastName": "Smith",
    "email": "john.smith@email.com",
    "phone": "5551234567"
  },
  "warnings": ["Phone number format was non-standard"],
  "errors": ["Invalid email format"],
  "confidence": 0.95
}`;

      const userPrompt = `Clean this donor data row for import:

Raw Data: ${JSON.stringify(params.rowData)}
Field Mappings: ${JSON.stringify(params.fieldMappings)}
Cleaning Strategy: ${JSON.stringify(params.cleaningStrategy)}
Row Index: ${params.rowIndex}

Apply these transformations:
1. Map fields according to fieldMappings
2. Clean and standardize all data
3. Split names if needed
4. Validate required fields (firstName, lastName)
5. Flag any issues or concerns

Return cleaned data ready for database insertion.`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1000,
        temperature: 0.1,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      // Validate and enhance the cleaned data
      return this.validateCleanedData(result, params.rowData);
      
    } catch (error) {
      console.error('AI data processing failed for row:', params.rowIndex, error);
      return this.getFallbackDataProcessing(params);
    }
  }

  // Fallback data processing when AI is unavailable
  private getFallbackDataProcessing(params: any): any {
    const cleaned: any = {};
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Apply basic field mappings
    Object.entries(params.fieldMappings).forEach(([csvField, mapping]: [string, any]) => {
      const value = params.rowData[csvField];
      if (value && value.toString().trim()) {
        if (mapping.dbField === 'fullName') {
          // Split full name
          const parts = value.toString().trim().split(/\s+/);
          cleaned.firstName = parts[0] || '';
          cleaned.lastName = parts.slice(1).join(' ') || '';
          if (!cleaned.lastName) {
            warnings.push('Name appears to have only one part');
          }
        } else if (mapping.dataType === 'phone') {
          // Clean phone number
          cleaned[mapping.dbField] = value.toString().replace(/\D/g, '');
        } else if (mapping.dataType === 'email') {
          // Basic email validation
          const email = value.toString().trim().toLowerCase();
          if (email.includes('@') && email.includes('.')) {
            cleaned[mapping.dbField] = email;
          } else {
            errors.push(`Invalid email format: ${email}`);
          }
        } else {
          cleaned[mapping.dbField] = value.toString().trim();
        }
      }
    });
    
    // Validate required fields
    if (!cleaned.firstName) {
      errors.push('Missing required field: firstName');
    }
    if (!cleaned.lastName) {
      errors.push('Missing required field: lastName');
    }
    
    return {
      cleanedData: cleaned,
      warnings,
      errors,
      confidence: errors.length === 0 ? 0.8 : 0.4
    };
  }

  // Validate and post-process cleaned data
  private validateCleanedData(result: any, originalData: any): any {
    const cleaned = result.cleanedData || {};
    const warnings = [...(result.warnings || [])];
    const errors = [...(result.errors || [])];
    
    // Ensure required fields
    if (!cleaned.firstName && !cleaned.lastName) {
      errors.push('Missing required fields: firstName and lastName');
    }
    
    // Validate email format
    if (cleaned.email && !cleaned.email.includes('@')) {
      errors.push('Invalid email format');
      delete cleaned.email;
    }
    
    // Validate phone number (digits only)
    if (cleaned.phone) {
      const phoneDigits = cleaned.phone.toString().replace(/\D/g, '');
      if (phoneDigits.length < 10) {
        warnings.push('Phone number may be incomplete');
      }
      cleaned.phone = phoneDigits;
    }
    
    // Calculate confidence based on data quality
    let confidence = result.confidence || 0.8;
    if (errors.length > 0) confidence = Math.max(0.2, confidence - 0.3);
    if (warnings.length > 0) confidence = Math.max(0.4, confidence - 0.1);
    
    return {
      cleanedData: cleaned,
      warnings,
      errors,
      confidence
    };
  }
}

export const aiService = new AIService();
export type { RateLimitConfig };