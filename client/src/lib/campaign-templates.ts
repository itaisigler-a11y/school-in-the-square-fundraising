import { InsertCampaign } from "@shared/schema";

export interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  category: 'annual' | 'capital' | 'event' | 'special';
  icon: string;
  estimatedDuration: number; // in days
  suggestedGoalRange: {
    min: number;
    max: number;
  };
  template: Partial<InsertCampaign>;
  customFields?: {
    [key: string]: any;
  };
  guidance: {
    overview: string;
    bestPractices: string[];
    timeline: string;
    expectedOutcomes: string;
  };
  emailTemplates?: {
    [key: string]: {
      subject: string;
      content: string;
    };
  };
}

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: 'annual-fund',
    name: 'Annual Fund Campaign',
    description: 'Year-round fundraising for general operating expenses and educational programs',
    category: 'annual',
    icon: '🎓',
    estimatedDuration: 365,
    suggestedGoalRange: {
      min: 50000,
      max: 500000
    },
    template: {
      campaignType: 'annual',
      description: 'Our Annual Fund provides essential support for School in the Square\'s innovative educational programs, helping us maintain our commitment to student-centered learning and community engagement.',
      goal: '150000',
      // Set dates relative to school year
      startDate: getSchoolYearStart(),
      endDate: getSchoolYearEnd(),
      status: 'planned'
    },
    customFields: {
      fundingPriorities: [
        'Student scholarships and financial aid',
        'Technology and learning resources',
        'Teacher professional development',
        'Campus improvements and facilities',
        'Arts and enrichment programs'
      ],
      donorRecognitionLevels: [
        { name: 'Friends', min: 1, benefits: ['Thank you letter', 'Newsletter'] },
        { name: 'Supporters', min: 250, benefits: ['Recognition on website', 'Quarterly updates'] },
        { name: 'Champions', min: 1000, benefits: ['School calendar', 'Principal coffee meeting'] },
        { name: 'Leaders', min: 2500, benefits: ['Board meeting attendance', 'Private school tour'] },
        { name: 'Visionaries', min: 5000, benefits: ['Named recognition opportunity', 'Annual celebration invite'] }
      ]
    },
    guidance: {
      overview: 'The Annual Fund is the backbone of School in the Square\'s fundraising efforts, providing unrestricted funds that enable flexibility and innovation in our educational programs.',
      bestPractices: [
        'Launch campaign in early fall with back-to-school energy',
        'Create monthly giving options for sustained support',
        'Share regular updates with specific impact stories',
        'Recognize donors promptly and meaningfully',
        'End with strong year-end giving push before December 31st'
      ],
      timeline: 'Launch in September, maintain steady outreach through the school year, with major pushes in November and December',
      expectedOutcomes: 'Expect 60-80% of donations from returning donors, 20-40% from new donors, with average gift sizes ranging from $50-$2,500'
    },
    emailTemplates: {
      launch: {
        subject: '🌟 Join Our School Community: Annual Fund Launch',
        content: `Dear [Name],

As we begin another exciting school year at School in the Square, we invite you to join us in supporting the innovative education that makes our community so special.

Our Annual Fund directly supports:
• Small class sizes and personalized attention
• Project-based learning experiences
• Arts, music, and enrichment programs
• Teacher development and resources

Every gift, regardless of size, makes a meaningful difference in our students' educational journey.

Would you consider making a gift to support School in the Square today?

With gratitude,
[Your Name]`
      },
      reminder: {
        subject: 'Your Support Powers Student Success 📚',
        content: `Dear [Name],

Thanks to donors like you, our students are thriving! Here's what your Annual Fund support has accomplished so far this year:

• 95% of our students are exceeding grade-level expectations
• New STEM lab opened with hands-on learning stations
• 3 teachers completed advanced professional development
• Student art displayed in local community center

There's still time to join our school family in supporting these incredible achievements. Can we count on your support?

Best regards,
[Your Name]`
      }
    }
  },
  {
    id: 'capital-campaign',
    name: 'Capital Campaign',
    description: 'Major fundraising effort for significant facility improvements, expansion, or endowment',
    category: 'capital',
    icon: '🏗️',
    estimatedDuration: 1095, // 3 years
    suggestedGoalRange: {
      min: 500000,
      max: 5000000
    },
    template: {
      campaignType: 'capital',
      description: 'Our Capital Campaign will transform School in the Square\'s campus, creating state-of-the-art learning environments that will serve our students and community for generations to come.',
      goal: '2000000',
      startDate: getCurrentDate(),
      endDate: addDays(getCurrentDate(), 1095),
      status: 'planned'
    },
    customFields: {
      campaignPhases: [
        { name: 'Quiet Phase', goalPercentage: 60, description: 'Leadership and major gifts' },
        { name: 'Public Phase', goalPercentage: 35, description: 'Community-wide campaign' },
        { name: 'Victory Phase', goalPercentage: 5, description: 'Final push to goal' }
      ],
      projectComponents: [
        'New classroom building with flexible learning spaces',
        'Expanded library and maker space',
        'Athletic facilities and outdoor learning areas',
        'Technology infrastructure upgrades',
        'Sustainable energy systems'
      ],
      namingOpportunities: [
        { item: 'Classroom', amount: 25000 },
        { item: 'Library', amount: 100000 },
        { item: 'Maker Space', amount: 75000 },
        { item: 'Playground', amount: 50000 },
        { item: 'Garden', amount: 15000 }
      ]
    },
    guidance: {
      overview: 'A Capital Campaign is a multi-year effort to raise significant funds for major improvements. Success requires strong leadership, careful planning, and broad community engagement.',
      bestPractices: [
        'Secure 40-60% of goal in quiet phase before public launch',
        'Create compelling case statement with architectural renderings',
        'Establish campaign cabinet of key volunteer leaders',
        'Offer meaningful naming opportunities at various levels',
        'Plan celebration events at major milestones'
      ],
      timeline: '6-12 months planning, 18-24 months quiet phase, 12-18 months public phase',
      expectedOutcomes: 'Expect 80% of funds from top 20% of donors, with lead gifts of $100K+ being crucial to success'
    },
    emailTemplates: {
      launch: {
        subject: '🚀 Transforming Education: Capital Campaign Launch',
        content: `Dear [Name],

We are excited to share a vision that will transform education at School in the Square for generations to come.

Our Capital Campaign will create:
• Modern, flexible learning spaces designed for 21st-century education
• Expanded STEM facilities and maker spaces
• Outdoor classrooms and sustainable learning environments
• Enhanced arts and athletics facilities

This is more than a building project – it's an investment in our children's future and our community's strength.

We hope you'll join us in making this vision a reality.

Warmly,
[Your Name]`
      }
    }
  },
  {
    id: 'gala-fundraiser',
    name: 'Gala & Auction Fundraiser',
    description: 'Annual celebration event with dinner, entertainment, and auction to engage the community',
    category: 'event',
    icon: '🎭',
    estimatedDuration: 180, // 6 months planning
    suggestedGoalRange: {
      min: 25000,
      max: 200000
    },
    template: {
      campaignType: 'event',
      description: 'Join us for an evening of celebration, community, and support for School in the Square. Our annual gala brings together families, faculty, and friends to raise funds while enjoying great food, entertainment, and fellowship.',
      goal: '75000',
      startDate: getCurrentDate(),
      endDate: addDays(getCurrentDate(), 180),
      status: 'planned'
    },
    customFields: {
      eventComponents: [
        'Cocktail reception and networking',
        'Dinner with locally-sourced menu',
        'Student performances and presentations',
        'Silent auction with community donations',
        'Live auction with signature items',
        'Fund-a-need direct appeal'
      ],
      targetAudience: [
        'Current families and parents',
        'Alumni families',
        'Local business supporters',
        'Board members and major donors',
        'Community partners'
      ],
      revenueStreams: [
        { source: 'Ticket Sales', targetAmount: 20000 },
        { source: 'Silent Auction', targetAmount: 15000 },
        { source: 'Live Auction', targetAmount: 25000 },
        { source: 'Fund-a-Need', targetAmount: 10000 },
        { source: 'Sponsorships', targetAmount: 5000 }
      ]
    },
    guidance: {
      overview: 'A successful gala combines fundraising with community building, creating an engaging experience that donors will remember and want to repeat.',
      bestPractices: [
        'Form planning committee 6 months in advance',
        'Secure high-value auction items early through personal asks',
        'Create compelling fund-a-need with specific, tangible impact',
        'Use student performances to remind guests why they support the school',
        'Follow up promptly with thank you notes and impact reports'
      ],
      timeline: '6 months: planning and auction procurement, 3 months: marketing and ticket sales, 1 month: final details',
      expectedOutcomes: 'Well-executed galas typically raise $300-500 per attendee, with 60% from auction and 40% from tickets and appeals'
    },
    emailTemplates: {
      invitation: {
        subject: '🎉 Save the Date: School in the Square Gala',
        content: `Dear [Name],

You're invited to an evening of celebration and community at the School in the Square Annual Gala!

📅 Date: [Event Date]
🕕 Time: 6:00 PM
📍 Location: [Venue Name]

Join us for:
• Delicious dinner and cocktails
• Student performances showcasing our amazing talents
• Exciting auction with incredible items
• Opportunity to directly support our students

This year's funds will support [specific goal], making an immediate impact on our students' educational experience.

Tickets and sponsorship opportunities available at [website].

We can't wait to celebrate with you!

Warmly,
[Your Name]`
      }
    }
  },
  {
    id: 'parent-appreciation',
    name: 'Parent Appreciation Campaign',
    description: 'Targeted campaign recognizing parent volunteers while raising funds for specific programs',
    category: 'special',
    icon: '❤️',
    estimatedDuration: 60,
    suggestedGoalRange: {
      min: 10000,
      max: 75000
    },
    template: {
      campaignType: 'special',
      description: 'Celebrating the incredible parents who make School in the Square extraordinary while raising funds for programs that directly benefit our student community.',
      goal: '25000',
      startDate: getCurrentDate(),
      endDate: addDays(getCurrentDate(), 60),
      status: 'planned'
    },
    customFields: {
      recognitionElements: [
        'Parent volunteer spotlight in newsletter',
        'Thank you video from students',
        'Special parking spots for top volunteers',
        'Appreciation breakfast or coffee event',
        'Recognition at school assembly'
      ],
      fundingTargets: [
        'Field trip transportation and entrance fees',
        'Classroom supplies and materials',
        'Guest speakers and special programs',
        'Student celebration and recognition events',
        'Library books and digital resources'
      ]
    },
    guidance: {
      overview: 'This campaign combines gratitude with fundraising, recognizing parent contributions while asking for financial support.',
      bestPractices: [
        'Highlight specific parent volunteer contributions in communications',
        'Show direct connection between funds and student experiences',
        'Use student voices and artwork in campaign materials',
        'Make giving levels accessible to all families',
        'Plan appreciation event to celebrate both volunteers and donors'
      ],
      timeline: '2-3 weeks planning, 6-8 weeks active campaign, 1-2 weeks follow-up and recognition',
      expectedOutcomes: 'Expect high participation rate (70-80% of families) with smaller average gifts ($50-250) but strong community engagement'
    },
    emailTemplates: {
      launch: {
        subject: '💝 Celebrating Our Amazing Parent Community',
        content: `Dear School in the Square Families,

Our parent community makes our school extraordinary! From reading buddies to field trip chaperones, from fundraising events to classroom support – your involvement creates the magic that makes our school special.

As we celebrate your contributions, we have an opportunity to enhance our students' educational experience even further.

This campaign will fund:
• Enhanced field trip experiences for all grade levels
• Additional classroom supplies and learning materials  
• Special guest speakers and educational programs
• Student celebration and achievement recognition

Every family's support – whether through volunteering, giving, or both – makes a difference.

Thank you for being the heart of our school community!

With appreciation,
[Your Name]`
      }
    }
  },
  {
    id: 'summer-enrichment',
    name: 'Summer Program Fundraiser',
    description: 'Campaign to fund summer learning programs, camps, and educational opportunities',
    category: 'special',
    icon: '☀️',
    estimatedDuration: 90,
    suggestedGoalRange: {
      min: 15000,
      max: 100000
    },
    template: {
      campaignType: 'special',
      description: 'Ensuring every School in the Square student has access to enriching summer learning experiences, from academic support to creative exploration and outdoor adventures.',
      goal: '40000',
      startDate: getCurrentDate(),
      endDate: addDays(getCurrentDate(), 90),
      status: 'planned'
    },
    customFields: {
      programComponents: [
        'Academic bridge programs for transitioning students',
        'STEM exploration and maker camp',
        'Arts and creative expression workshops',
        'Outdoor education and nature programs',
        'Reading and literacy support programs'
      ],
      scholarshipLevels: [
        { name: 'Full Scholarship', amount: 500, description: 'Covers entire summer program' },
        { name: 'Partial Scholarship', amount: 250, description: 'Covers 50% of program costs' },
        { name: 'Activity Scholarship', amount: 100, description: 'Covers supplies and materials' }
      ]
    },
    guidance: {
      overview: 'Summer programs help prevent learning loss and provide enrichment opportunities that might not otherwise be accessible to all students.',
      bestPractices: [
        'Launch campaign in late winter/early spring for summer planning',
        'Highlight learning loss prevention and enrichment benefits',
        'Share testimonials from previous summer program participants',
        'Offer flexible giving options including scholarship sponsorships',
        'Partner with local businesses for program support or funding'
      ],
      timeline: 'February-March: campaign launch, April-May: intensive fundraising, June: program preparation',
      expectedOutcomes: 'Target mix of individual donations and potential business sponsorships, with focus on enabling program accessibility for all students'
    },
    emailTemplates: {
      launch: {
        subject: '🌞 Summer Learning Adventures Await!',
        content: `Dear [Name],

Summer learning at School in the Square keeps our students engaged, curious, and growing even when school is out!

This year's summer programs will offer:
• Hands-on STEM exploration and experiments
• Creative arts and expression workshops  
• Outdoor education and nature discovery
• Academic support for students who need extra help
• Leadership development and community service projects

Your support ensures that EVERY student can participate, regardless of their family's financial situation.

Will you help us make this summer extraordinary for our students?

With excitement for summer learning,
[Your Name]`
      }
    }
  }
];

// Helper functions for date calculations
function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

function addDays(dateString: string, days: number): string {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function getSchoolYearStart(): string {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  // School year starts in September
  if (currentMonth >= 8) { // September is month 8 (0-indexed)
    return new Date(currentYear, 8, 1).toISOString().split('T')[0];
  } else {
    return new Date(currentYear - 1, 8, 1).toISOString().split('T')[0];
  }
}

function getSchoolYearEnd(): string {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  // School year ends in June
  if (currentMonth >= 8) { // After September
    return new Date(currentYear + 1, 5, 30).toISOString().split('T')[0];
  } else {
    return new Date(currentYear, 5, 30).toISOString().split('T')[0];
  }
}

// Template selection helpers
export function getCampaignTemplateById(id: string): CampaignTemplate | undefined {
  return CAMPAIGN_TEMPLATES.find(template => template.id === id);
}

export function getCampaignTemplatesByCategory(category: CampaignTemplate['category']): CampaignTemplate[] {
  return CAMPAIGN_TEMPLATES.filter(template => template.category === category);
}

export function getPopularTemplates(): CampaignTemplate[] {
  // Return the most commonly used templates
  return CAMPAIGN_TEMPLATES.filter(template => 
    ['annual-fund', 'gala-fundraiser', 'parent-appreciation'].includes(template.id)
  );
}

// Goal calculation helpers
export function calculateSuggestedGoal(
  templateId: string,
  donorCount: number,
  averageGiftSize: number,
  adjustmentFactor: number = 1.2
): number {
  const template = getCampaignTemplateById(templateId);
  if (!template) return 0;
  
  const baseGoal = donorCount * averageGiftSize * adjustmentFactor;
  const { min, max } = template.suggestedGoalRange;
  
  // Keep within template's suggested range
  return Math.max(min, Math.min(max, Math.round(baseGoal / 1000) * 1000));
}

// Email template helpers
export function getEmailTemplate(templateId: string, emailType: string): { subject: string; content: string } | undefined {
  const template = getCampaignTemplateById(templateId);
  return template?.emailTemplates?.[emailType];
}

export function personalizeEmailTemplate(
  templateContent: string,
  personalizations: Record<string, string>
): string {
  let personalized = templateContent;
  Object.entries(personalizations).forEach(([key, value]) => {
    const placeholder = `[${key}]`;
    personalized = personalized.replace(new RegExp(placeholder, 'g'), value);
  });
  return personalized;
}