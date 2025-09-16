import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, Clock, Heart, DollarSign, UserPlus } from "lucide-react";
import type { SegmentQuery } from "@shared/schema";

export interface SmartSegmentTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
  estimatedCount?: string;
  query: SegmentQuery;
}

// Pre-built smart segment templates
export const SMART_SEGMENT_TEMPLATES: SmartSegmentTemplate[] = [
  {
    id: "major-donors",
    name: "Major Donors",
    description: "High-value donors with lifetime giving over $5,000",
    icon: DollarSign,
    category: "Giving Capacity",
    estimatedCount: "~50 donors",
    query: {
      combinator: "and",
      rules: [
        {
          id: "1",
          field: "lifetimeValue",
          operator: "greater_than_or_equal",
          value: 5000
        },
        {
          id: "2", 
          field: "giftSizeTier",
          operator: "in",
          value: ["major", "principal"]
        }
      ]
    }
  },
  {
    id: "lapsed-donors",
    name: "Lapsed Donors",
    description: "Previous donors who haven't given in over 18 months",
    icon: Clock,
    category: "Re-engagement",
    estimatedCount: "~120 donors",
    query: {
      combinator: "and",
      rules: [
        {
          id: "1",
          field: "lastDonationDate",
          operator: "not_in_last_days",
          value: 548 // 18 months in days
        },
        {
          id: "2",
          field: "totalDonations", 
          operator: "greater_than",
          value: 0
        },
        {
          id: "3",
          field: "engagementLevel",
          operator: "equals",
          value: "lapsed"
        }
      ]
    }
  },
  {
    id: "new-parents",
    name: "New Parents", 
    description: "Parents who joined the school community in the last 2 years",
    icon: UserPlus,
    category: "Relationship",
    estimatedCount: "~85 donors",
    query: {
      combinator: "and",
      rules: [
        {
          id: "1",
          field: "donorType",
          operator: "equals",
          value: "parent"
        },
        {
          id: "2",
          field: "createdAt",
          operator: "in_last_days",
          value: 730 // 2 years in days
        },
        {
          id: "3",
          field: "engagementLevel",
          operator: "in",
          value: ["new", "active"]
        }
      ]
    }
  },
  {
    id: "engaged-alumni",
    name: "Engaged Alumni",
    description: "Alumni who actively support the school through giving and engagement",
    icon: TrendingUp,
    category: "Relationship",
    estimatedCount: "~75 donors", 
    query: {
      combinator: "and",
      rules: [
        {
          id: "1",
          field: "donorType",
          operator: "equals",
          value: "alumni"
        },
        {
          id: "2",
          field: "engagementLevel",
          operator: "in",
          value: ["active", "engaged"]
        },
        {
          id: "3",
          field: "lastDonationDate",
          operator: "in_last_days",
          value: 365 // Last year
        }
      ]
    }
  },
  {
    id: "frequent-small-donors",
    name: "Frequent Small Donors",
    description: "Loyal donors who give smaller amounts regularly",
    icon: Heart,
    category: "Giving Capacity",
    estimatedCount: "~200 donors",
    query: {
      combinator: "and",
      rules: [
        {
          id: "1",
          field: "totalDonations",
          operator: "greater_than_or_equal",
          value: 3
        },
        {
          id: "2",
          field: "averageGiftSize",
          operator: "less_than_or_equal",
          value: 500
        },
        {
          id: "3",
          field: "giftSizeTier",
          operator: "in",
          value: ["grassroots", "mid_level"]
        }
      ]
    }
  },
  {
    id: "at-risk-donors",
    name: "At-Risk Donors",
    description: "Previously active donors showing signs of disengagement",
    icon: Users,
    category: "Re-engagement", 
    estimatedCount: "~45 donors",
    query: {
      combinator: "and",
      rules: [
        {
          id: "1",
          field: "engagementLevel",
          operator: "equals",
          value: "at_risk"
        },
        {
          id: "2",
          field: "lastDonationDate",
          operator: "in_last_days",
          value: 548 // 18 months
        },
        {
          id: "3",
          field: "lifetimeValue",
          operator: "greater_than",
          value: 1000
        }
      ]
    }
  },
  {
    id: "board-foundation-givers",
    name: "Board & Foundation Donors",
    description: "High-capacity institutional and board member donors",
    icon: DollarSign,
    category: "Giving Capacity",
    estimatedCount: "~25 donors",
    query: {
      combinator: "and",
      rules: [
        {
          id: "1",
          field: "donorType",
          operator: "in",
          value: ["board", "foundation", "business"]
        },
        {
          id: "2",
          field: "lifetimeValue",
          operator: "greater_than",
          value: 2500
        }
      ]
    }
  },
  {
    id: "email-engaged",
    name: "Email Engaged",
    description: "Donors who actively engage with email communications",
    icon: TrendingUp,
    category: "Communication",
    estimatedCount: "~300 donors",
    query: {
      combinator: "and",
      rules: [
        {
          id: "1",
          field: "emailOptIn",
          operator: "equals",
          value: true
        },
        {
          id: "2",
          field: "preferredContactMethod",
          operator: "equals",
          value: "email"
        },
        {
          id: "3",
          field: "engagementLevel",
          operator: "in",
          value: ["active", "engaged"]
        }
      ]
    }
  }
];

// Group templates by category
export const TEMPLATE_CATEGORIES = Array.from(
  new Set(SMART_SEGMENT_TEMPLATES.map(t => t.category))
);

interface SegmentTemplatesProps {
  onSelectTemplate: (template: SmartSegmentTemplate) => void;
  selectedCategory?: string;
  onCategoryChange?: (category: string | undefined) => void;
}

export function SegmentTemplates({ 
  onSelectTemplate, 
  selectedCategory, 
  onCategoryChange 
}: SegmentTemplatesProps) {
  const filteredTemplates = selectedCategory
    ? SMART_SEGMENT_TEMPLATES.filter(t => t.category === selectedCategory)
    : SMART_SEGMENT_TEMPLATES;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Smart Segment Templates</h3>
        <p className="text-sm text-muted-foreground">
          Get started quickly with pre-built segments for common donor groups
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={!selectedCategory ? "default" : "outline"}
          size="sm"
          onClick={() => onCategoryChange?.(undefined)}
          data-testid="category-all"
        >
          All Categories
        </Button>
        {TEMPLATE_CATEGORIES.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => onCategoryChange?.(category)}
            data-testid={`category-${category.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <Card 
            key={template.id} 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onSelectTemplate(template)}
            data-testid={`template-${template.id}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <template.icon className="w-5 h-5 text-primary" />
                <Badge variant="secondary" className="text-xs">
                  {template.category}
                </Badge>
              </div>
              <CardTitle className="text-base">{template.name}</CardTitle>
              <CardDescription className="text-sm">
                {template.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {template.estimatedCount && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Estimated size:
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {template.estimatedCount}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No templates found for the selected category.</p>
        </div>
      )}
    </div>
  );
}

export default SegmentTemplates;