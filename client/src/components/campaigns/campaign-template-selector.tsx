import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CAMPAIGN_TEMPLATES, 
  CampaignTemplate, 
  getCampaignTemplatesByCategory,
  getPopularTemplates 
} from '@/lib/campaign-templates';
import {
  Calendar,
  DollarSign,
  Users,
  Clock,
  Target,
  TrendingUp,
  Star,
  Info,
  ChevronRight,
  CheckCircle
} from 'lucide-react';

interface CampaignTemplateSelectorProps {
  onSelectTemplate: (template: CampaignTemplate) => void;
  onCustomCampaign: () => void;
  className?: string;
}

export function CampaignTemplateSelector({ 
  onSelectTemplate, 
  onCustomCampaign,
  className 
}: CampaignTemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplate | null>(null);
  const [activeCategory, setActiveCategory] = useState<'popular' | 'annual' | 'capital' | 'event' | 'special'>('popular');

  const popularTemplates = getPopularTemplates();
  const annualTemplates = getCampaignTemplatesByCategory('annual');
  const capitalTemplates = getCampaignTemplatesByCategory('capital');
  const eventTemplates = getCampaignTemplatesByCategory('event');
  const specialTemplates = getCampaignTemplatesByCategory('special');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDuration = (days: number) => {
    if (days >= 365) {
      const years = Math.round(days / 365 * 10) / 10;
      return `${years} year${years !== 1 ? 's' : ''}`;
    } else if (days >= 30) {
      const months = Math.round(days / 30);
      return `${months} month${months !== 1 ? 's' : ''}`;
    } else {
      return `${days} day${days !== 1 ? 's' : ''}`;
    }
  };

  const TemplateCard = ({ template }: { template: CampaignTemplate }) => (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-school-blue-300 ${
        selectedTemplate?.id === template.id ? 'ring-2 ring-school-blue-500 border-school-blue-500' : ''
      }`}
      onClick={() => setSelectedTemplate(selectedTemplate?.id === template.id ? null : template)}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-lg">
          <span className="text-2xl">{template.icon}</span>
          <div>
            <div className="font-semibold text-school-blue-900 dark:text-white">
              {template.name}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {template.category}
              </Badge>
              {template.id === 'annual-fund' && (
                <Badge variant="default" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">
                  <Star className="w-3 h-3 mr-1" />
                  Most Popular
                </Badge>
              )}
            </div>
          </div>
          {selectedTemplate?.id === template.id && (
            <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-school-blue-600 dark:text-school-blue-300 line-clamp-2">
          {template.description}
        </p>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-school-blue-500" />
            <span className="text-school-blue-700 dark:text-school-blue-300">
              {formatDuration(template.estimatedDuration)}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-school-blue-500" />
            <span className="text-school-blue-700 dark:text-school-blue-300">
              {formatCurrency(template.suggestedGoalRange.min)} - {formatCurrency(template.suggestedGoalRange.max)}
            </span>
          </div>
        </div>
        
        {selectedTemplate?.id === template.id && (
          <div className="mt-4 pt-4 border-t border-school-blue-200 dark:border-school-blue-700 space-y-3">
            <div>
              <h4 className="font-medium text-school-blue-900 dark:text-white mb-2">
                Campaign Overview
              </h4>
              <p className="text-sm text-school-blue-600 dark:text-school-blue-400">
                {template.guidance.overview}
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-school-blue-900 dark:text-white mb-2">
                Expected Timeline
              </h4>
              <p className="text-sm text-school-blue-600 dark:text-school-blue-400">
                {template.guidance.timeline}
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-school-blue-900 dark:text-white mb-2">
                Best Practices
              </h4>
              <ul className="text-sm text-school-blue-600 dark:text-school-blue-400 space-y-1">
                {template.guidance.bestPractices.slice(0, 3).map((practice, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">•</span>
                    {practice}
                  </li>
                ))}
              </ul>
            </div>
            
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                onSelectTemplate(template);
              }}
              className="w-full bg-school-blue-600 hover:bg-school-blue-700 text-white"
              data-testid={`select-template-${template.id}`}
            >
              Use This Template
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-school-blue-900 dark:text-white">
          Choose a Campaign Template
        </h2>
        <p className="text-school-blue-600 dark:text-school-blue-400 max-w-2xl mx-auto">
          Start with a proven template designed specifically for school fundraising, 
          or create a custom campaign from scratch.
        </p>
      </div>

      {/* Template Categories */}
      <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as any)}>
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="popular" className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            <span className="hidden sm:inline">Popular</span>
          </TabsTrigger>
          <TabsTrigger value="annual" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Annual</span>
          </TabsTrigger>
          <TabsTrigger value="capital" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Capital</span>
          </TabsTrigger>
          <TabsTrigger value="event" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Events</span>
          </TabsTrigger>
          <TabsTrigger value="special" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">Special</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="popular" className="space-y-4">
          <div className="mb-4">
            <Alert>
              <Star className="h-4 w-4" />
              <AlertDescription>
                These are the most commonly used templates by schools like yours. 
                They have been refined based on successful campaigns and best practices.
              </AlertDescription>
            </Alert>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {popularTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="annual" className="space-y-4">
          <div className="mb-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Annual Fund campaigns provide steady, unrestricted revenue for your school's 
                ongoing operations and programs throughout the academic year.
              </AlertDescription>
            </Alert>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {annualTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="capital" className="space-y-4">
          <div className="mb-4">
            <Alert>
              <TrendingUp className="h-4 w-4" />
              <AlertDescription>
                Capital campaigns raise major funds for significant improvements like 
                building projects, major equipment, or endowment funds over multiple years.
              </AlertDescription>
            </Alert>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {capitalTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="event" className="space-y-4">
          <div className="mb-4">
            <Alert>
              <Users className="h-4 w-4" />
              <AlertDescription>
                Event-based campaigns combine fundraising with community engagement 
                through galas, auctions, fun runs, and other special events.
              </AlertDescription>
            </Alert>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {eventTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="special" className="space-y-4">
          <div className="mb-4">
            <Alert>
              <Target className="h-4 w-4" />
              <AlertDescription>
                Special purpose campaigns target specific needs, programs, or opportunities 
                with focused messaging and shorter timeframes.
              </AlertDescription>
            </Alert>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {specialTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Separator />

      {/* Custom Campaign Option */}
      <Card className="border-dashed border-2 border-school-blue-300 bg-school-blue-50 dark:bg-school-blue-900/20 hover:border-school-blue-400 transition-colors">
        <CardContent className="text-center py-8">
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 bg-school-blue-100 dark:bg-school-blue-800 rounded-full flex items-center justify-center">
              <Target className="w-6 h-6 text-school-blue-600 dark:text-school-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-school-blue-900 dark:text-white">
                Create Custom Campaign
              </h3>
              <p className="text-school-blue-600 dark:text-school-blue-400 mt-2">
                Need something different? Start from scratch with a blank campaign 
                and customize every aspect to fit your specific needs.
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={onCustomCampaign}
              className="border-school-blue-600 text-school-blue-600 hover:bg-school-blue-600 hover:text-white"
              data-testid="button-custom-campaign"
            >
              Start Custom Campaign
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}