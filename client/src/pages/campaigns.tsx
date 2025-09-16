import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CampaignForm } from "@/components/campaigns/campaign-form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Campaign } from "@shared/schema";

export default function Campaigns() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [campaignType, setCampaignType] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [deleteCampaign, setDeleteCampaign] = useState<Campaign | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/campaigns", { 
      search, 
      status: status === "all" ? undefined : status, 
      campaignType: campaignType === "all" ? undefined : campaignType, 
      page, 
      limit: 25 
    }],
  });

  // Delete campaign mutation
  const deleteCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const response = await apiRequest("DELETE", `/api/campaigns/${campaignId}`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Campaign deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      setDeleteCampaign(null);
      refetch();
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
        description: error.message || "Failed to delete campaign",
        variant: "destructive",
      });
    },
  });

  const handleEditCampaign = (campaign: Campaign) => {
    setEditCampaign(campaign);
  };

  const handleDeleteCampaign = (campaign: Campaign) => {
    setDeleteCampaign(campaign);
  };

  const confirmDeleteCampaign = () => {
    if (deleteCampaign?.id) {
      deleteCampaignMutation.mutate(deleteCampaign.id);
    }
  };

  const campaigns = data?.campaigns || [];
  const total = data?.total || 0;

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-gray-100 text-gray-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCampaignTypeLabel = (type: string) => {
    switch (type) {
      case 'annual': return 'Annual Fund';
      case 'capital': return 'Capital Campaign';
      case 'special': return 'Special Project';
      case 'event': return 'Event';
      default: return 'General';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campaign Management</h1>
          <p className="text-sm text-muted-foreground">
            Create, track, and analyze fundraising campaigns
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-campaign">
              <i className="fas fa-plus mr-2"></i>Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
              <DialogDescription>
                Set up a new fundraising campaign with goals, dates, and campaign details.
              </DialogDescription>
            </DialogHeader>
            <CampaignForm 
              onSuccess={() => {
                setIsCreateOpen(false);
                refetch();
              }} 
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Campaign Dialog */}
      <Dialog open={!!editCampaign} onOpenChange={(open) => !open && setEditCampaign(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
            <DialogDescription>
              Update campaign details, goals, dates, and configuration.
            </DialogDescription>
          </DialogHeader>
          {editCampaign && (
            <CampaignForm 
              campaign={editCampaign}
              isEditing={true}
              onSuccess={() => {
                setEditCampaign(null);
                refetch();
              }} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Campaign Confirmation Dialog */}
      <AlertDialog open={!!deleteCampaign} onOpenChange={(open) => !open && setDeleteCampaign(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the campaign <strong>"{deleteCampaign?.name}"</strong>?
              <br /><br />
              <span className="text-destructive font-medium">This action cannot be undone.</span> This will permanently remove the campaign and may affect related donations, analytics, and communications.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-campaign">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteCampaign}
              disabled={deleteCampaignMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-campaign"
            >
              {deleteCampaignMutation.isPending ? "Deleting..." : "Delete Campaign"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="Search campaigns..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-campaigns"
              />
            </div>
            <div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger data-testid="select-campaign-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={campaignType} onValueChange={setCampaignType}>
                <SelectTrigger data-testid="select-campaign-type">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="annual">Annual Fund</SelectItem>
                  <SelectItem value="capital">Capital Campaign</SelectItem>
                  <SelectItem value="special">Special Project</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearch("");
                  setStatus("all");
                  setCampaignType("all");
                  setPage(1);
                }}
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Campaigns ({total.toLocaleString()})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Raised / Goal</TableHead>
                    <TableHead>Donors</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="text-muted-foreground">
                          <i className="fas fa-bullhorn text-4xl mb-4 block"></i>
                          <p>No campaigns found</p>
                          <p className="text-sm mt-2">Create your first campaign to get started</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    campaigns.map((campaign: any) => {
                      const progress = campaign.goal ? (Number(campaign.raised) / Number(campaign.goal)) * 100 : 0;
                      return (
                        <TableRow key={campaign.id} data-testid={`row-campaign-${campaign.id}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{campaign.name}</p>
                              {campaign.description && (
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {campaign.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getCampaignTypeLabel(campaign.campaignType)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadgeColor(campaign.status)}>
                              {campaign.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Progress value={progress} className="h-2" />
                              <p className="text-xs text-muted-foreground">
                                {Math.round(progress)}%
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                ${Number(campaign.raised || 0).toLocaleString()}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                of ${Number(campaign.goal).toLocaleString()}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{campaign.donorCount || 0}</TableCell>
                          <TableCell>
                            {new Date(campaign.endDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEditCampaign(campaign)}
                                data-testid={`button-edit-campaign-${campaign.id}`}
                                title="Edit campaign"
                              >
                                <i className="fas fa-edit text-blue-600"></i>
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeleteCampaign(campaign)}
                                data-testid={`button-delete-campaign-${campaign.id}`}
                                title="Delete campaign"
                              >
                                <i className="fas fa-trash text-red-600"></i>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {total > 25 && (
            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {((page - 1) * 25) + 1} to {Math.min(page * 25, total)} of {total} campaigns
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  data-testid="button-prev-page"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * 25 >= total}
                  onClick={() => setPage(page + 1)}
                  data-testid="button-next-page"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
