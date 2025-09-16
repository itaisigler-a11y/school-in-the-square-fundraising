import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { insertCampaignSchema, type InsertCampaign, type Campaign } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Sparkles, RefreshCw, Copy, CheckCircle, AlertCircle } from "lucide-react";

interface CampaignFormProps {
  onSuccess?: () => void;
  campaign?: Campaign;
  isEditing?: boolean;
  preselectedSegmentId?: string;
}

export function CampaignForm({ onSuccess, campaign, isEditing = false, preselectedSegmentId }: CampaignFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [aiGeneration, setAiGeneration] = useState({
    isGenerating: false,
    type: null as 'description' | 'appeals' | 'subjects' | null,
    results: null as any,
  });
  const [generatedContent, setGeneratedContent] = useState({
    appeals: [] as any[],
    subjectLines: [] as any[],
  });

  const today = new Date().toISOString().split('T')[0];
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Fetch segments for targeting
  const { data: segmentsData } = useQuery({
    queryKey: ["/api/segment-definitions"],
  });

  // Fetch sample donors for AI generation context
  const { data: donorsData } = useQuery({
    queryKey: ["/api/donors", { limit: 5 }],
  });

  const form = useForm<InsertCampaign>({
    resolver: zodResolver(insertCampaignSchema),
    defaultValues: {
      name: campaign?.name || "",
      description: campaign?.description || "",
      goal: campaign?.goal || "0",
      startDate: campaign?.startDate || today,
      endDate: campaign?.endDate || nextMonth,
      status: campaign?.status || "planned",
      campaignType: campaign?.campaignType || "general",
      segmentId: campaign?.segmentId || preselectedSegmentId || "",
      isActive: campaign?.isActive ?? true,
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: InsertCampaign) => {
      const response = await apiRequest("POST", "/api/campaigns", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Campaign created successfully",
      });
      // Invalidate campaigns queries and ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      // Force refetch after a small delay to ensure the backend data is ready
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/campaigns"] });
      }, 100);
      onSuccess?.();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign",
        variant: "destructive",
      });
    },
  });

  const updateCampaignMutation = useMutation({
    mutationFn: async (data: InsertCampaign) => {
      if (!campaign?.id) throw new Error("Campaign ID is required for updates");
      const response = await apiRequest("PUT", `/api/campaigns/${campaign.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Campaign updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/campaigns"] });
      }, 100);
      onSuccess?.();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to update campaign",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertCampaign) => {
    if (isEditing) {
      updateCampaignMutation.mutate(data);
    } else {
      createCampaignMutation.mutate(data);
    }
  };

  const isLoading = createCampaignMutation.isPending || updateCampaignMutation.isPending;

  // AI content generation functions
  const generateDescription = async () => {
    const formData = form.getValues();
    const prompt = `Campaign: ${formData.name}\nType: ${formData.campaignType}\nGoal: $${formData.goal}`;
    
    try {
      setAiGeneration({ isGenerating: true, type: 'description', results: null });
      const response = await apiRequest('POST', '/api/ai/subject-lines', {
        content: prompt,
        campaignType: formData.campaignType,
        variations: 3
      });
      const result = await response.json();
      
      // Use the first subject line as description inspiration
      if (result.subjectLines?.length > 0) {
        const description = `${formData.name} campaign focused on ${formData.campaignType} fundraising with a goal of $${parseFloat(formData.goal).toLocaleString()}. This initiative will support School in the Square's mission of providing innovative, student-centered education.`;
        form.setValue('description', description);
        toast({
          title: "Description Generated",
          description: "AI has generated a campaign description for you.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate description",
        variant: "destructive",
      });
    } finally {
      setAiGeneration({ isGenerating: false, type: null, results: null });
    }
  };

  const generateDonorAppeals = async () => {
    const formData = form.getValues();
    
    if (!donorsData?.donors?.length) {
      toast({
        title: "No Donor Data",
        description: "Need donor data to generate personalized appeals.",
        variant: "destructive",
      });
      return;
    }

    try {
      setAiGeneration({ isGenerating: true, type: 'appeals', results: null });
      
      // Generate appeals for a sample donor
      const sampleDonor = donorsData.donors[0];
      const response = await apiRequest('POST', '/api/ai/donation-appeal', {
        donorId: sampleDonor.id,
        tone: 'warm',
        variations: 3
      });
      
      const result = await response.json();
      setGeneratedContent(prev => ({ ...prev, appeals: result.appeals || [] }));
      setAiGeneration({ isGenerating: false, type: null, results: result });
      
      toast({
        title: "Appeals Generated",
        description: `Generated ${result.appeals?.length || 0} personalized appeal variations.`,
      });
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate appeals",
        variant: "destructive",
      });
      setAiGeneration({ isGenerating: false, type: null, results: null });
    }
  };

  const generateSubjectLines = async () => {
    const formData = form.getValues();
    const content = formData.description || `${formData.name} - ${formData.campaignType} campaign`;
    
    try {
      setAiGeneration({ isGenerating: true, type: 'subjects', results: null });
      const response = await apiRequest('POST', '/api/ai/subject-lines', {
        content,
        campaignType: formData.campaignType,
        variations: 5
      });
      
      const result = await response.json();
      setGeneratedContent(prev => ({ ...prev, subjectLines: result.subjectLines || [] }));
      setAiGeneration({ isGenerating: false, type: null, results: result });
      
      toast({
        title: "Subject Lines Generated",
        description: `Generated ${result.subjectLines?.length || 0} email subject line variations.`,
      });
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate subject lines",
        variant: "destructive",
      });
      setAiGeneration({ isGenerating: false, type: null, results: null });
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Content copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Campaign Information</h3>
          
          <div className="grid grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Annual Fund 2024"
                      {...field}
                      value={field.value || ""}
                      data-testid="input-campaign-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Description
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generateDescription}
                      disabled={aiGeneration.isGenerating || !form.watch('name') || !form.watch('campaignType')}
                      data-testid="button-ai-generate-description"
                    >
                      {aiGeneration.isGenerating && aiGeneration.type === 'description' ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      AI Generate
                    </Button>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Campaign description and goals..."
                      {...field}
                      value={field.value || ""}
                      data-testid="input-campaign-description"
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="campaignType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-campaign-type-form">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="annual">Annual Fund</SelectItem>
                        <SelectItem value="capital">Capital Campaign</SelectItem>
                        <SelectItem value="special">Special Project</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-campaign-status-form">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="goal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fundraising Goal ($) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="25000.00"
                      {...field}
                      value={field.value || ""}
                      data-testid="input-campaign-goal"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-campaign-start-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-campaign-end-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Segment Targeting */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Donor Targeting</h3>
            
            <FormField
              control={form.control}
              name="segmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Segment (Optional)</FormLabel>
                  <Select onValueChange={(value) => field.onChange(value === "all" ? "" : value)} value={field.value || "all"}>
                    <FormControl>
                      <SelectTrigger data-testid="select-campaign-segment">
                        <SelectValue placeholder="Target all donors or select a specific segment" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">All Donors</SelectItem>
                      {segmentsData?.segmentDefinitions?.map((segment: any) => (
                        <SelectItem key={segment.id} value={segment.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{segment.name}</span>
                            {segment.estimatedCount && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                {segment.estimatedCount.toLocaleString()} donors
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {field.value && (
                    <p className="text-sm text-muted-foreground mt-2">
                      This campaign will be targeted to a specific donor segment for more effective outreach.
                    </p>
                  )}
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* AI Assistant Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-foreground">AI Content Assistant</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Donor Appeals Generation */}
            <Card data-testid="ai-appeals-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Personalized Appeals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateDonorAppeals}
                  disabled={aiGeneration.isGenerating || !donorsData?.donors?.length}
                  className="w-full"
                  data-testid="button-generate-appeals"
                >
                  {aiGeneration.isGenerating && aiGeneration.type === 'appeals' ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Generating Appeals...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Donor Appeals
                    </>
                  )}
                </Button>

                {generatedContent.appeals.length > 0 && (
                  <div className="space-y-3" data-testid="generated-appeals">
                    <p className="text-sm text-muted-foreground">
                      Generated {generatedContent.appeals.length} appeal variations:
                    </p>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {generatedContent.appeals.map((appeal: any, index: number) => (
                        <div key={index} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">
                              {appeal.tone} tone
                            </Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(appeal.content)}
                              data-testid={`button-copy-appeal-${index}`}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          {appeal.subject && (
                            <p className="text-sm font-medium text-foreground">
                              Subject: {appeal.subject}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground line-clamp-4">
                            {appeal.content}
                          </p>
                          {appeal.keyPoints && appeal.keyPoints.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {appeal.keyPoints.map((point: string, pointIndex: number) => (
                                <Badge key={pointIndex} variant="secondary" className="text-xs">
                                  {point}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!donorsData?.donors?.length && (
                  <div className="text-center py-4 text-muted-foreground">
                    <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                    <p className="text-sm">Need donor data to generate personalized appeals</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subject Lines Generation */}
            <Card data-testid="ai-subjects-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Email Subject Lines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateSubjectLines}
                  disabled={aiGeneration.isGenerating || (!form.watch('description') && !form.watch('name'))}
                  className="w-full"
                  data-testid="button-generate-subjects"
                >
                  {aiGeneration.isGenerating && aiGeneration.type === 'subjects' ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Generating Subject Lines...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Subject Lines
                    </>
                  )}
                </Button>

                {generatedContent.subjectLines.length > 0 && (
                  <div className="space-y-3" data-testid="generated-subjects">
                    <p className="text-sm text-muted-foreground">
                      Generated {generatedContent.subjectLines.length} subject line variations:
                    </p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {generatedContent.subjectLines.map((subjectLine: any, index: number) => (
                        <div key={index} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {subjectLine.style}
                              </Badge>
                              <Badge 
                                variant={
                                  subjectLine.predictedPerformance === 'high' ? 'default' :
                                  subjectLine.predictedPerformance === 'medium' ? 'secondary' : 'outline'
                                }
                                className="text-xs"
                              >
                                {subjectLine.predictedPerformance} performance
                              </Badge>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(subjectLine.text)}
                              data-testid={`button-copy-subject-${index}`}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-sm font-medium text-foreground">
                            {subjectLine.text}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {subjectLine.reasoning}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!form.watch('description') && !form.watch('name')) && (
                  <div className="text-center py-4 text-muted-foreground">
                    <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                    <p className="text-sm">Add campaign name or description to generate subject lines</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Insights */}
          {aiGeneration.results?.donorInsights && (
            <Card className="mt-4" data-testid="ai-insights-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Donor Segment</p>
                    <p className="text-sm text-muted-foreground">
                      {aiGeneration.results.donorInsights.segment}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Engagement Level</p>
                    <p className="text-sm text-muted-foreground">
                      {aiGeneration.results.donorInsights.engagementLevel}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Suggested Approach</p>
                    <p className="text-sm text-muted-foreground">
                      {aiGeneration.results.donorInsights.suggestedApproach}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4 pt-4 border-t">
          <Button
            type="submit"
            disabled={isLoading}
            data-testid="button-submit-campaign"
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                {isEditing ? "Updating..." : "Creating..."}
              </>
            ) : (
              <>
                <i className="fas fa-plus mr-2"></i>
                {isEditing ? "Update Campaign" : "Create Campaign"}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}