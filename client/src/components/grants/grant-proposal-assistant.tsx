import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, RefreshCw, Copy, FileText, DollarSign, Target, CheckCircle, Download } from "lucide-react";

const grantProposalSchema = z.object({
  grantId: z.string().optional(),
  grantorName: z.string().min(1, "Grantor name is required"),
  grantType: z.enum(['foundation', 'government', 'corporate', 'individual']),
  projectDescription: z.string().min(50, "Project description must be at least 50 characters"),
  requestedAmount: z.number().min(1, "Requested amount must be greater than 0"),
});

type GrantProposalForm = z.infer<typeof grantProposalSchema>;

interface GrantProposalAssistantProps {
  onSuccess?: () => void;
  existingGrant?: any;
}

export function GrantProposalAssistant({ onSuccess, existingGrant }: GrantProposalAssistantProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOutline, setGeneratedOutline] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("form");

  const form = useForm<GrantProposalForm>({
    resolver: zodResolver(grantProposalSchema),
    defaultValues: {
      grantId: existingGrant?.id || "",
      grantorName: existingGrant?.grantorName || "",
      grantType: existingGrant?.type || "foundation",
      projectDescription: existingGrant?.description || "",
      requestedAmount: existingGrant?.requestedAmount ? Number(existingGrant.requestedAmount) : 0,
    },
  });

  const generateOutlineMutation = useMutation({
    mutationFn: async (data: GrantProposalForm) => {
      const response = await apiRequest("POST", "/api/ai/grant-outline", data);
      return response.json();
    },
    onSuccess: (result) => {
      setGeneratedOutline(result);
      setActiveTab("outline");
      toast({
        title: "Outline Generated",
        description: "AI has created a comprehensive grant proposal outline.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate grant outline",
        variant: "destructive",
      });
    },
  });

  const onGenerateOutline = (data: GrantProposalForm) => {
    setIsGenerating(true);
    generateOutlineMutation.mutate(data);
    setTimeout(() => setIsGenerating(false), 1000);
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

  const exportOutline = () => {
    if (!generatedOutline) return;
    
    const formData = form.getValues();
    const exportText = `
GRANT PROPOSAL OUTLINE
${formData.grantorName} - ${formData.grantType.toUpperCase()} GRANT
Requested Amount: $${formData.requestedAmount.toLocaleString()}

EXECUTIVE SUMMARY
${generatedOutline.outline.executiveSummary}

PROBLEM STATEMENT
${generatedOutline.outline.problemStatement}

PROJECT DESCRIPTION
${generatedOutline.outline.projectDescription}

METHODOLOGY
${generatedOutline.outline.methodology.map((step: string, index: number) => `${index + 1}. ${step}`).join('\n')}

BUDGET BREAKDOWN
${generatedOutline.outline.budget.map((item: any) => `${item.category}: $${item.amount.toLocaleString()} - ${item.justification}`).join('\n')}

EVALUATION PLAN
${generatedOutline.outline.evaluation}

SUSTAINABILITY
${generatedOutline.outline.sustainability}

RECOMMENDATIONS
${generatedOutline.recommendations.map((rec: string, index: number) => `• ${rec}`).join('\n')}
    `.trim();

    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grant-proposal-outline-${formData.grantorName.replace(/\s+/g, '-').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Exported",
      description: "Grant proposal outline exported successfully",
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
          <Sparkles className="h-8 w-8 text-purple-600" />
          AI Grant Proposal Assistant
        </h1>
        <p className="text-muted-foreground">
          Generate comprehensive grant proposal outlines powered by AI
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="form" data-testid="tab-grant-form">
            <FileText className="h-4 w-4 mr-2" />
            Grant Details
          </TabsTrigger>
          <TabsTrigger 
            value="outline" 
            disabled={!generatedOutline}
            data-testid="tab-grant-outline"
          >
            <Target className="h-4 w-4 mr-2" />
            AI-Generated Outline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="form" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Grant Proposal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onGenerateOutline)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="grantorName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Grantor Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Smith Family Foundation"
                              {...field}
                              data-testid="input-grantor-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="grantType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Grant Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-grant-type">
                                <SelectValue placeholder="Select grant type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="foundation">Foundation Grant</SelectItem>
                              <SelectItem value="government">Government Grant</SelectItem>
                              <SelectItem value="corporate">Corporate Grant</SelectItem>
                              <SelectItem value="individual">Individual Donor</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="requestedAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Requested Amount ($) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="1"
                            placeholder="50000"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            data-testid="input-requested-amount"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="projectDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Description *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your project in detail. Include goals, target audience, expected outcomes, and how it aligns with the grantor's mission..."
                            className="min-h-[150px]"
                            {...field}
                            data-testid="textarea-project-description"
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">
                          Minimum 50 characters. Be specific about your project's goals and impact.
                        </p>
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-4">
                    <Button
                      type="submit"
                      disabled={isGenerating || generateOutlineMutation.isPending}
                      className="flex-1"
                      data-testid="button-generate-outline"
                    >
                      {isGenerating || generateOutlineMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          Generating AI Outline...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate AI Proposal Outline
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Tips Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">💡 Tips for Better Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">Project Description</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Be specific about your goals</li>
                    <li>• Include target beneficiaries</li>
                    <li>• Mention expected outcomes</li>
                    <li>• Align with grantor's mission</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Grantor Research</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Review their funding priorities</li>
                    <li>• Check grant size ranges</li>
                    <li>• Note application deadlines</li>
                    <li>• Study successful proposals</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outline" className="space-y-6">
          {generatedOutline && (
            <>
              {/* Outline Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Grant Proposal Outline Generated
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportOutline}
                        data-testid="button-export-outline"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(JSON.stringify(generatedOutline, null, 2))}
                        data-testid="button-copy-full-outline"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy All
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-sm font-medium">Requested Amount</p>
                        <p className="text-lg font-bold">${form.getValues('requestedAmount').toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium">Grant Type</p>
                        <p className="text-sm">{form.getValues('grantType')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-purple-600" />
                      <div>
                        <p className="text-sm font-medium">Grantor</p>
                        <p className="text-sm">{form.getValues('grantorName')}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Executive Summary */}
              <Card data-testid="outline-executive-summary">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Executive Summary</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(generatedOutline.outline.executiveSummary)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {generatedOutline.outline.executiveSummary}
                  </p>
                </CardContent>
              </Card>

              {/* Problem Statement */}
              <Card data-testid="outline-problem-statement">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Problem Statement</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(generatedOutline.outline.problemStatement)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {generatedOutline.outline.problemStatement}
                  </p>
                </CardContent>
              </Card>

              {/* Project Description */}
              <Card data-testid="outline-project-description">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Project Description</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(generatedOutline.outline.projectDescription)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {generatedOutline.outline.projectDescription}
                  </p>
                </CardContent>
              </Card>

              {/* Methodology */}
              <Card data-testid="outline-methodology">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Methodology</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(generatedOutline.outline.methodology.join('\n'))}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2">
                    {generatedOutline.outline.methodology.map((step: string, index: number) => (
                      <li key={index} className="text-sm">
                        <span className="font-medium text-purple-600">{index + 1}.</span> {step}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              {/* Budget */}
              <Card data-testid="outline-budget">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Budget Breakdown</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(
                        generatedOutline.outline.budget
                          .map((item: any) => `${item.category}: $${item.amount.toLocaleString()} - ${item.justification}`)
                          .join('\n')
                      )}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {generatedOutline.outline.budget.map((item: any, index: number) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{item.category}</h4>
                          <Badge variant="outline">${item.amount.toLocaleString()}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.justification}</p>
                      </div>
                    ))}
                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between font-semibold">
                        <span>Total Budget</span>
                        <span>${generatedOutline.outline.budget.reduce((sum: number, item: any) => sum + item.amount, 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Evaluation & Sustainability */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card data-testid="outline-evaluation">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Evaluation Plan</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(generatedOutline.outline.evaluation)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {generatedOutline.outline.evaluation}
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="outline-sustainability">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Sustainability Plan</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(generatedOutline.outline.sustainability)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {generatedOutline.outline.sustainability}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Recommendations */}
              <Card data-testid="outline-recommendations">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>AI Recommendations</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(generatedOutline.recommendations.join('\n'))}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {generatedOutline.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Generate New Outline Button */}
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setGeneratedOutline(null);
                    setActiveTab("form");
                  }}
                  data-testid="button-generate-new-outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate New Outline
                </Button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}