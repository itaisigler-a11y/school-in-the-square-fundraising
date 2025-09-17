import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Users, 
  RefreshCw, 
  Download, 
  Eye,
  Tag,
  Calendar,
  Filter,
  Copy,
  MoreVertical
} from "lucide-react";
import { QueryBuilder } from "@/components/segments/query-builder";
import { SegmentTemplates, type SmartSegmentTemplate } from "@/components/segments/segment-templates";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SegmentDefinition, SegmentQuery, SegmentSearch } from "@shared/schema";
import { cn } from "@/lib/utils";
import { CampaignForm } from "@/components/campaigns/campaign-form";

// Segment form for creating/editing segments
interface SegmentFormProps {
  segment?: SegmentDefinition;
  onSuccess: () => void;
  onCancel: () => void;
}

function SegmentForm({ segment, onSuccess, onCancel }: SegmentFormProps) {
  const [name, setName] = useState(segment?.name || "");
  const [description, setDescription] = useState(segment?.description || "");
  const [tags, setTags] = useState<string[]>(segment?.tags as string[] || []);
  const [tagInput, setTagInput] = useState("");
  const [query, setQuery] = useState<SegmentQuery>(segment?.filterQuery as SegmentQuery || {
    combinator: "and",
    rules: [{
      id: Math.random().toString(36).substr(2, 9),
      field: "firstName",
      operator: "contains",
      value: ""
    }]
  });
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const { toast } = useToast();

  // Preview segment query
  const previewSegment = async (previewQuery: SegmentQuery) => {
    setIsPreviewLoading(true);
    try {
      const response = await apiRequest('/api/segment-definitions/preview', {
        method: 'POST',
        body: {
          filterQuery: previewQuery,
          includeCount: true,
          includeSample: false
        }
      });
      setPreviewCount(response.count);
    } catch (error) {
      console.error("Preview error:", error);
      setPreviewCount(null);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        name,
        description,
        filterQuery: query,
        tags
      };

      if (segment) {
        return apiRequest(`/api/segment-definitions/${segment.id}`, {
          method: 'PUT',
          body: data
        });
      } else {
        return apiRequest('/api/segment-definitions', {
          method: 'POST',
          body: data
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/segment-definitions'] });
      toast({
        title: segment ? "Segment updated" : "Segment created",
        description: `${name} has been ${segment ? 'updated' : 'created'} successfully.`,
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${segment ? 'update' : 'create'} segment.`,
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a segment name.",
        variant: "destructive",
      });
      return;
    }

    if (!query.rules.length) {
      toast({
        title: "Validation Error", 
        description: "Please add at least one rule to the segment.",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate();
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label htmlFor="segment-name">Segment Name *</Label>
          <Input
            id="segment-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Major Donors 2024"
            data-testid="input-segment-name"
          />
        </div>
        
        <div>
          <Label htmlFor="segment-description">Description</Label>
          <Textarea
            id="segment-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe this segment and its intended use..."
            rows={3}
            data-testid="textarea-segment-description"
          />
        </div>

        <div>
          <Label>Tags</Label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add a tag..."
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                data-testid="input-tag"
              />
              <Button onClick={handleAddTag} size="sm" data-testid="button-add-tag">
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                    {tag} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Query Builder */}
      <div>
        <QueryBuilder
          value={query}
          onChange={setQuery}
          onPreview={previewSegment}
        />
      </div>

      {/* Preview Results */}
      {(previewCount !== null || isPreviewLoading) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Preview Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isPreviewLoading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Calculating segment size...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="font-semibold">
                  {previewCount?.toLocaleString()} donors
                </span>
                <span className="text-muted-foreground">match this criteria</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={saveMutation.isPending}
          data-testid="button-save"
        >
          {saveMutation.isPending ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              {segment ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            segment ? 'Update Segment' : 'Create Segment'
          )}
        </Button>
      </div>
    </div>
  );
}

// Main segments page
export default function Segments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<SegmentDefinition | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<SmartSegmentTemplate | null>(null);
  const [templateCategory, setTemplateCategory] = useState<string | undefined>();
  const [isCampaignCreateOpen, setIsCampaignCreateOpen] = useState(false);
  const [selectedSegmentForCampaign, setSelectedSegmentForCampaign] = useState<SegmentDefinition | null>(null);

  const { toast } = useToast();

  // Fetch segments
  const { data: segmentsData, isLoading } = useQuery({
    queryKey: ["/api/segment-definitions", { 
      search: searchQuery, 
      tags: selectedTags, 
      page, 
      limit: 25 
    }],
  });

  const segments = segmentsData?.segmentDefinitions || [];
  const totalSegments = segmentsData?.total || 0;

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (segmentId: string) => {
      return apiRequest(`/api/segment-definitions/${segmentId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/segment-definitions'] });
      toast({
        title: "Segment deleted",
        description: "The segment has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete segment.",
        variant: "destructive",
      });
    }
  });

  // Refresh mutation
  const refreshMutation = useMutation({
    mutationFn: async (segmentId: string) => {
      return apiRequest(`/api/segment-definitions/${segmentId}/refresh`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/segment-definitions'] });
      toast({
        title: "Segment refreshed",
        description: "Donor count has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to refresh segment.",
        variant: "destructive",
      });
    }
  });

  // Export segment
  const handleExportSegment = async (segment: SegmentDefinition) => {
    try {
      // This would typically download a CSV file
      const response = await apiRequest(`/api/segment-definitions/${segment.id}/donors?limit=10000`, {
        method: 'GET'
      });
      
      // Convert to CSV (simplified)
      const csvContent = "data:text/csv;charset=utf-8," 
        + "First Name,Last Name,Email,Donor Type,Lifetime Value\n"
        + response.donors.map((d: any) => 
            `${d.firstName},${d.lastName},${d.email},${d.donorType},${d.lifetimeValue}`
          ).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${segment.name.replace(/[^a-z0-9]/gi, '_')}_donors.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export successful",
        description: `${segment.name} donor list has been downloaded.`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export segment data.",
        variant: "destructive",
      });
    }
  };

  const handleTemplateSelect = (template: SmartSegmentTemplate) => {
    setSelectedTemplate(template);
    setIsCreateOpen(true);
  };

  const handleCreateCampaign = (segment: SegmentDefinition) => {
    setSelectedSegmentForCampaign(segment);
    setIsCampaignCreateOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getEngagementBadgeColor = (count: number) => {
    if (count >= 1000) return "bg-green-100 text-green-800";
    if (count >= 100) return "bg-blue-100 text-blue-800";
    if (count >= 10) return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Donor Segments</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage targeted donor segments for strategic outreach
          </p>
        </div>
        
        <div className="flex gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" data-testid="button-browse-templates">
                <Plus className="w-4 h-4 mr-2" />
                Browse Templates
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Smart Segment Templates</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <SegmentTemplates
                  onSelectTemplate={handleTemplateSelect}
                  selectedCategory={templateCategory}
                  onCategoryChange={setTemplateCategory}
                />
              </div>
            </SheetContent>
          </Sheet>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-segment">
                <Plus className="w-4 h-4 mr-2" />
                Create Segment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedTemplate ? `Create from Template: ${selectedTemplate.name}` : 'Create New Segment'}
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] pr-4">
                <SegmentForm
                  segment={selectedTemplate ? {
                    id: '',
                    name: selectedTemplate.name,
                    description: selectedTemplate.description,
                    filterQuery: selectedTemplate.query,
                    tags: [selectedTemplate.category],
                    createdBy: '',
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    estimatedCount: 0,
                    lastCalculated: null,
                    isAutoUpdated: true,
                    sqlQuery: null
                  } : undefined}
                  onSuccess={() => {
                    setIsCreateOpen(false);
                    setSelectedTemplate(null);
                  }}
                  onCancel={() => {
                    setIsCreateOpen(false);
                    setSelectedTemplate(null);
                  }}
                />
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Input
                placeholder="Search segments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-segments"
              />
            </div>
            <div>
              <Select value={selectedTags[0] || "all"} onValueChange={(value) => setSelectedTags(value === "all" ? [] : [value])}>
                <SelectTrigger data-testid="select-filter-tags">
                  <SelectValue placeholder="Filter by tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  <SelectItem value="Giving Capacity">Giving Capacity</SelectItem>
                  <SelectItem value="Re-engagement">Re-engagement</SelectItem>
                  <SelectItem value="Relationship">Relationship</SelectItem>
                  <SelectItem value="Communication">Communication</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Badge variant="outline" className="text-sm">
                {totalSegments} segments
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Segments List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Segments</CardTitle>
          <CardDescription>
            Manage your donor segments and track their performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[80px]" />
                  <Skeleton className="h-4 w-[60px]" />
                </div>
              ))}
            </div>
          ) : segments.length === 0 ? (
            <div className="max-w-4xl mx-auto py-12">
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">Organize Your Donors with Smart Segments</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed max-w-2xl mx-auto">
                  Segments help you group donors based on shared characteristics, making your fundraising campaigns 
                  more targeted and effective. Create custom criteria to find exactly the right audience for each appeal.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 max-w-md mx-auto">
                  <Button onClick={() => setIsCreateOpen(true)} className="w-full" data-testid="button-create-first-segment">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Segment
                  </Button>
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="w-full" data-testid="button-browse-segment-templates">
                        <Tag className="w-4 h-4 mr-2" />
                        Browse Templates
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right">
                      <SheetHeader>
                        <SheetTitle>Smart Segment Templates</SheetTitle>
                      </SheetHeader>
                      <div className="mt-6">
                        <SegmentTemplates
                          onSelectTemplate={handleTemplateSelect}
                          selectedCategory={templateCategory}
                          onCategoryChange={setTemplateCategory}
                        />
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-muted/30 rounded-lg p-6">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <i className="fas fa-users text-blue-600"></i>
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">Parent Groups</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Target parents by grade level, involvement, or donation history
                  </p>
                  <div className="text-xs text-muted-foreground">
                    Examples: "K-2 Parents", "Volunteer Parents", "Monthly Donors"
                  </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-6">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <i className="fas fa-graduation-cap text-purple-600"></i>
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">Alumni Networks</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Reach out to graduates by graduation year or engagement level
                  </p>
                  <div className="text-xs text-muted-foreground">
                    Examples: "Class of 2020", "Recent Alumni", "Alumni Mentors"
                  </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-6">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <i className="fas fa-building text-green-600"></i>
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">Community Partners</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Connect with local businesses and community organizations
                  </p>
                  <div className="text-xs text-muted-foreground">
                    Examples: "Local Businesses", "Board Members", "Major Donors"
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg p-6 text-center">
                <h4 className="font-semibold text-foreground mb-2 flex items-center justify-center">
                  <i className="fas fa-lightbulb mr-2 text-amber-500"></i>
                  Pro Tip
                </h4>
                <p className="text-sm text-muted-foreground">
                  Start with broad segments like "All Parents" or "Alumni", then create more specific ones 
                  as your donor database grows. You can always refine your criteria later.
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {segments.map((segment) => (
                  <TableRow key={segment.id}>
                    <TableCell className="font-medium">{segment.name}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {segment.description}
                    </TableCell>
                    <TableCell>
                      <Badge className={getEngagementBadgeColor(segment.estimatedCount || 0)}>
                        {(segment.estimatedCount || 0).toLocaleString()} donors
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(segment.tags as string[] || []).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(segment.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingSegment(segment)}
                          data-testid={`button-edit-${segment.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => refreshMutation.mutate(segment.id)}
                          disabled={refreshMutation.isPending}
                          data-testid={`button-refresh-${segment.id}`}
                        >
                          <RefreshCw className={cn("w-4 h-4", refreshMutation.isPending && "animate-spin")} />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExportSegment(segment)}
                          data-testid={`button-export-${segment.id}`}
                        >
                          <Download className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCreateCampaign(segment)}
                          data-testid={`button-create-campaign-${segment.id}`}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              data-testid={`button-delete-${segment.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Segment</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{segment.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(segment.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingSegment} onOpenChange={() => setEditingSegment(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Segment: {editingSegment?.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            {editingSegment && (
              <SegmentForm
                segment={editingSegment}
                onSuccess={() => setEditingSegment(null)}
                onCancel={() => setEditingSegment(null)}
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Create Campaign Dialog */}
      <Dialog open={isCampaignCreateOpen} onOpenChange={setIsCampaignCreateOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Campaign for Segment: {selectedSegmentForCampaign?.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            {selectedSegmentForCampaign && (
              <CampaignForm
                preselectedSegmentId={selectedSegmentForCampaign.id}
                onSuccess={() => {
                  setIsCampaignCreateOpen(false);
                  setSelectedSegmentForCampaign(null);
                  toast({
                    title: "Campaign Created", 
                    description: `Campaign targeting "${selectedSegmentForCampaign.name}" has been created successfully.`
                  });
                }}
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}