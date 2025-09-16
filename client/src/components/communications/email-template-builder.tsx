import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Sparkles, RefreshCw, Copy, CheckCircle, AlertTriangle } from "lucide-react";

const templateSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Content is required"),
  type: z.enum(['email', 'phone', 'mail', 'text']).default('email'),
  segmentId: z.string().optional(),
});

type TemplateForm = z.infer<typeof templateSchema>;

interface EmailTemplateBuilderProps {
  onSuccess?: () => void;
}

export function EmailTemplateBuilder({ onSuccess }: EmailTemplateBuilderProps) {
  const { toast } = useToast();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [aiGeneration, setAiGeneration] = useState({
    isGenerating: false,
    type: null as 'subjects' | 'content' | null,
  });
  const [generatedSubjects, setGeneratedSubjects] = useState<any[]>([]);

  const form = useForm<TemplateForm>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      subject: "",
      content: "",
      type: "email",
    },
  });

  const { data: segments } = useQuery({
    queryKey: ["/api/segments"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: TemplateForm) => {
      const response = await apiRequest("POST", "/api/communications", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Template created",
        description: "Your email template has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/communications"] });
      form.reset();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create template",
        variant: "destructive",
      });
    },
  });

  const mergeTagOptions = [
    { label: "Donor First Name", value: "{{donor.firstName}}" },
    { label: "Donor Last Name", value: "{{donor.lastName}}" },
    { label: "Donor Full Name", value: "{{donor.firstName}} {{donor.lastName}}" },
    { label: "Student Name", value: "{{donor.studentName}}" },
    { label: "Grade Level", value: "{{donor.gradeLevel}}" },
    { label: "Alumni Year", value: "{{donor.alumniYear}}" },
    { label: "Last Donation Amount", value: "{{donor.lastDonationAmount}}" },
    { label: "Total Donated", value: "{{donor.lifetimeValue}}" },
    { label: "School Name", value: "School in the Square" },
    { label: "Current Date", value: "{{date.current}}" },
    { label: "Current Year", value: "{{date.year}}" },
  ];

  const templateSuggestions = [
    {
      name: "Welcome New Donor",
      subject: "Welcome to the School in the Square family, {{donor.firstName}}!",
      content: `Dear {{donor.firstName}},

Thank you for your generous donation to School in the Square! Your support makes a real difference in our students' lives.

Your contribution helps us:
• Provide exceptional educational opportunities
• Support innovative learning programs
• Build a stronger school community

We're grateful to have you as part of our school family.

Best regards,
The School in the Square Team`
    },
    {
      name: "Thank You Follow-up",
      subject: "Thank you for your support, {{donor.firstName}}",
      content: `Dear {{donor.firstName}},

We wanted to follow up and thank you again for your recent donation of \${{donor.lastDonationAmount}} to School in the Square.

Thanks to supporters like you, we've been able to:
• Enhance our STEM programs
• Provide scholarships to deserving students
• Improve our facilities

Your total contribution of \${{donor.lifetimeValue}} over the years has made a lasting impact.

With gratitude,
The Development Team`
    },
    {
      name: "Annual Fund Appeal",
      subject: "Help us reach our {{date.year}} Annual Fund goal",
      content: `Dear {{donor.firstName}},

As we approach the end of {{date.year}}, we're excited to share the incredible progress our students have made this year.

With just a few weeks left, we're 85% of the way to our Annual Fund goal of $500,000. Every donation, no matter the size, helps us:

• Maintain small class sizes
• Fund field trips and enrichment activities  
• Support our dedicated teachers

Would you consider making a year-end gift to help us reach our goal?

Thank you for your continued support of our school community.

Best wishes,
Principal Sarah Johnson`
    }
  ];

  const insertMergeTag = (tag: string) => {
    const currentContent = form.getValues("content");
    const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
    
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = currentContent.substring(0, start) + tag + currentContent.substring(end);
      form.setValue("content", newContent);
      
      // Focus back to textarea and position cursor after inserted tag
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tag.length, start + tag.length);
      }, 0);
    } else {
      form.setValue("content", currentContent + tag);
    }
    
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const loadTemplate = (template: typeof templateSuggestions[0]) => {
    form.setValue("subject", template.subject);
    form.setValue("content", template.content);
    
    // Extract merge tags from the template
    const tags = template.content.match(/\{\{[^}]+\}\}/g) || [];
    const subjectTags = template.subject.match(/\{\{[^}]+\}\}/g) || [];
    const allTags = [...tags, ...subjectTags];
    setSelectedTags(Array.from(new Set(allTags)));
  };

  // AI generation functions
  const generateSubjectLines = async () => {
    const content = form.getValues("content");
    const type = form.getValues("type");
    
    if (!content.trim()) {
      toast({
        title: "Content Required",
        description: "Please add email content before generating subject lines.",
        variant: "destructive",
      });
      return;
    }

    try {
      setAiGeneration({ isGenerating: true, type: 'subjects' });
      const response = await apiRequest('POST', '/api/ai/subject-lines', {
        content,
        campaignType: type === 'email' ? 'general' : type,
        variations: 5
      });
      
      const result = await response.json();
      setGeneratedSubjects(result.subjectLines || []);
      
      toast({
        title: "Subject Lines Generated",
        description: `Generated ${result.subjectLines?.length || 0} subject line variations.`,
      });
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate subject lines",
        variant: "destructive",
      });
    } finally {
      setAiGeneration({ isGenerating: false, type: null });
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

  const useSubjectLine = (subject: string) => {
    form.setValue("subject", subject);
    toast({
      title: "Subject Applied",
      description: "Subject line has been applied to your template.",
    });
  };

  const onSubmit = (data: TemplateForm) => {
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* Template Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Start Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {templateSuggestions.map((template, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-4 text-left"
                onClick={() => loadTemplate(template)}
                data-testid={`button-template-${index}`}
              >
                <div>
                  <p className="font-medium">{template.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {template.subject.substring(0, 40)}...
                  </p>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Create Email Template</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-template-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="phone">Phone</SelectItem>
                              <SelectItem value="mail">Mail</SelectItem>
                              <SelectItem value="text">Text</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="segmentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Segment (Optional)</FormLabel>
                          <Select onValueChange={(value) => field.onChange(value === "all" ? "" : value)} value={field.value || "all"}>
                            <FormControl>
                              <SelectTrigger data-testid="select-target-segment">
                                <SelectValue placeholder="Select segment" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="all">All Donors</SelectItem>
                              {((segments as any) || []).map((segment: any) => (
                                <SelectItem key={segment.id} value={segment.id}>
                                  {segment.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Subject Line
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={generateSubjectLines}
                            disabled={aiGeneration.isGenerating || !form.watch('content')}
                            data-testid="button-ai-generate-subjects"
                          >
                            {aiGeneration.isGenerating && aiGeneration.type === 'subjects' ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <Sparkles className="h-3 w-3" />
                            )}
                            AI Generate
                          </Button>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter email subject..."
                            data-testid="input-template-subject"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                        {!form.watch('content') && (
                          <p className="text-xs text-muted-foreground">
                            Add email content first to generate AI subject lines
                          </p>
                        )}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message Content</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Write your message here... Use merge tags like {{donor.firstName}} to personalize."
                            className="min-h-[300px]"
                            data-testid="textarea-template-content"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3">
                    <Button 
                      type="submit" 
                      disabled={createMutation.isPending}
                      data-testid="button-save-template"
                    >
                      {createMutation.isPending ? "Saving..." : "Save Template"}
                    </Button>
                    <Button 
                      type="button"
                      variant="outline"
                      data-testid="button-preview-template"
                    >
                      Preview
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Merge Tags Panel */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Merge Tags</CardTitle>
              <p className="text-sm text-muted-foreground">
                Click to insert personalization tags
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {mergeTagOptions.map((tag, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-auto p-2"
                    onClick={() => insertMergeTag(tag.value)}
                    data-testid={`button-merge-tag-${index}`}
                  >
                    <div className="text-left">
                      <p className="font-medium text-sm">{tag.label}</p>
                      <p className="text-xs text-muted-foreground">{tag.value}</p>
                    </div>
                  </Button>
                ))}
              </div>

              {selectedTags.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">Used Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedTags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Assistant Panel */}
      {generatedSubjects.length > 0 && (
        <Card className="mt-6" data-testid="ai-subjects-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              AI-Generated Subject Lines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {generatedSubjects.map((subject: any, index: number) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 space-y-3"
                  data-testid={`ai-subject-${index}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {subject.style}
                      </Badge>
                      <Badge 
                        variant={
                          subject.predictedPerformance === 'high' ? 'default' :
                          subject.predictedPerformance === 'medium' ? 'secondary' : 'outline'
                        }
                        className="text-xs"
                      >
                        {subject.predictedPerformance} performance
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(subject.text)}
                        data-testid={`button-copy-subject-${index}`}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => useSubjectLine(subject.text)}
                        data-testid={`button-use-subject-${index}`}
                      >
                        <CheckCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground leading-relaxed">
                      {subject.text}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {subject.reasoning}
                    </p>
                  </div>

                  {subject.text.length > 50 && (
                    <div className="flex items-center gap-1 text-xs text-orange-600">
                      <AlertTriangle className="h-3 w-3" />
                      Long subject line ({subject.text.length} chars)
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Separator className="my-4" />
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Generated {generatedSubjects.length} subject line variations • 
                Click <CheckCircle className="h-3 w-3 inline mx-1" /> to use or <Copy className="h-3 w-3 inline mx-1" /> to copy
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setGeneratedSubjects([])}
                data-testid="button-clear-subjects"
              >
                Clear Results
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Generation Status */}
      {aiGeneration.isGenerating && (
        <Card className="mt-6 border-purple-200 bg-purple-50" data-testid="ai-generation-status">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-purple-600 animate-spin" />
              <div>
                <p className="text-sm font-medium text-purple-900">
                  AI is generating subject lines...
                </p>
                <p className="text-xs text-purple-700">
                  Analyzing your content to create compelling subject line variations
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}