import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EmailTemplateBuilder } from "@/components/communications/email-template-builder";
import { CommunicationForm } from "@/components/communications/communication-form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Communication } from "@shared/schema";
import { Plus, Eye, Edit2, Trash2, Send } from "lucide-react";

export default function Communications() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [isTemplateBuilderOpen, setIsTemplateBuilderOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editCommunication, setEditCommunication] = useState<Communication | null>(null);
  const [deleteCommunication, setDeleteCommunication] = useState<Communication | null>(null);
  const [viewCommunication, setViewCommunication] = useState<Communication | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/communications", { 
      search, 
      type: type === "all" ? undefined : type, 
      status: status === "all" ? undefined : status, 
      page, 
      limit: 25 
    }],
    staleTime: 30000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    gcTime: 60000,
  });

  // Delete communication mutation
  const deleteCommunicationMutation = useMutation({
    mutationFn: async (communicationId: string) => {
      const response = await apiRequest("DELETE", `/api/communications/${communicationId}`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Communication deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/communications"], exact: false });
      setDeleteCommunication(null);
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
        description: error.message || "Failed to delete communication",
        variant: "destructive",
      });
    },
  });

  const communications = (data as any)?.communications || [];
  const total = (data as any)?.total || 0;

  const handleEditCommunication = (communication: Communication) => {
    setEditCommunication(communication);
  };

  const handleDeleteCommunication = (communication: Communication) => {
    setDeleteCommunication(communication);
  };

  const handleViewCommunication = (communication: Communication) => {
    setViewCommunication(communication);
  };

  const confirmDeleteCommunication = () => {
    if (deleteCommunication?.id) {
      deleteCommunicationMutation.mutate(deleteCommunication.id);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'opened': return 'bg-purple-100 text-purple-800';
      case 'clicked': return 'bg-orange-100 text-orange-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'email': return 'Email';
      case 'phone': return 'Phone';
      case 'mail': return 'Mail';
      case 'text': return 'Text';
      default: return 'Unknown';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Communications</h1>
          <p className="text-sm text-muted-foreground">
            Create email templates, manage donor communications, and track engagement
          </p>
        </div>
        
        <div className="flex gap-3">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-communication">
                <Plus className="mr-2 h-4 w-4" />New Communication
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Create Communication</DialogTitle>
                <DialogDescription>
                  Create a new communication record to track donor interactions.
                </DialogDescription>
              </DialogHeader>
              <CommunicationForm 
                onSuccess={() => {
                  setIsCreateOpen(false);
                  refetch();
                }} 
              />
            </DialogContent>
          </Dialog>

          <Dialog open={isTemplateBuilderOpen} onOpenChange={setIsTemplateBuilderOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-create-template">
                <i className="fas fa-magic mr-2"></i>Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Email Template Builder</DialogTitle>
                <DialogDescription>
                  Create and customize email templates for your fundraising campaigns and donor communications.
                </DialogDescription>
              </DialogHeader>
              <EmailTemplateBuilder 
                onSuccess={() => {
                  setIsTemplateBuilderOpen(false);
                  refetch();
                }} 
              />
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" data-testid="button-send-campaign">
            <Send className="mr-2 h-4 w-4" />Send Campaign
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-envelope text-blue-600"></i>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sent</p>
                <p className="text-xl font-bold">{communications.filter((c: any) => c.status !== 'draft').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-eye text-green-600"></i>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Open Rate</p>
                <p className="text-xl font-bold">68.5%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-mouse-pointer text-purple-600"></i>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Click Rate</p>
                <p className="text-xl font-bold">24.3%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-draft2digital text-orange-600"></i>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Templates</p>
                <p className="text-xl font-bold">{communications.filter((c: any) => c.status === 'draft').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="Search communications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-communications"
              />
            </div>
            <div>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger data-testid="select-communication-type">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="mail">Mail</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger data-testid="select-communication-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="opened">Opened</SelectItem>
                  <SelectItem value="clicked">Clicked</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearch("");
                  setType("all");
                  setStatus("all");
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

      {/* Communications Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Communications ({total.toLocaleString()})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Sent Date</TableHead>
                    <TableHead>Engagement</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {communications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="text-muted-foreground">
                          <i className="fas fa-envelope text-4xl mb-4 block"></i>
                          <p>No communications yet</p>
                          <p className="text-sm mt-2">Create your first email template or send a campaign</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    communications.map((communication: any) => (
                      <TableRow key={communication.id} data-testid={`row-communication-${communication.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{communication.subject || "No Subject"}</p>
                            <p className="text-sm text-muted-foreground">
                              {communication.content?.substring(0, 60)}...
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getTypeLabel(communication.type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(communication.status)}>
                            {communication.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {communication.donorId ? "Individual" : "Segment"}
                        </TableCell>
                        <TableCell>
                          {communication.sentAt ? formatDate(communication.sentAt) : "Not sent"}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {communication.openedAt && (
                              <Badge variant="outline" className="text-xs">Opened</Badge>
                            )}
                            {communication.clickedAt && (
                              <Badge variant="outline" className="text-xs">Clicked</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewCommunication(communication)}
                              data-testid={`button-view-communication-${communication.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditCommunication(communication)}
                              data-testid={`button-edit-communication-${communication.id}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteCommunication(communication)}
                              data-testid={`button-delete-communication-${communication.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            {communication.status === 'draft' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                data-testid={`button-send-communication-${communication.id}`}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Communication Dialog */}
      <Dialog open={editCommunication !== null} onOpenChange={(open) => !open && setEditCommunication(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Edit Communication</DialogTitle>
            <DialogDescription>
              Update the communication details and tracking information.
            </DialogDescription>
          </DialogHeader>
          {editCommunication && (
            <CommunicationForm 
              communication={editCommunication}
              isEditing={true}
              onSuccess={() => {
                setEditCommunication(null);
                refetch();
              }} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Communication Dialog */}
      <Dialog open={viewCommunication !== null} onOpenChange={(open) => !open && setViewCommunication(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Communication Details</DialogTitle>
          </DialogHeader>
          {viewCommunication && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <p className="capitalize">{viewCommunication.type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge className={getStatusBadgeColor(viewCommunication.status)}>
                    {viewCommunication.status}
                  </Badge>
                </div>
              </div>
              
              {viewCommunication.subject && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Subject</p>
                  <p>{viewCommunication.subject}</p>
                </div>
              )}
              
              {viewCommunication.content && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Content</p>
                  <div className="bg-muted p-3 rounded-lg max-h-40 overflow-y-auto">
                    <p className="whitespace-pre-wrap">{viewCommunication.content}</p>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                {viewCommunication.sentAt && (
                  <div>
                    <p className="font-medium text-muted-foreground">Sent At</p>
                    <p>{formatDate(viewCommunication.sentAt.toString())}</p>
                  </div>
                )}
                {viewCommunication.openedAt && (
                  <div>
                    <p className="font-medium text-muted-foreground">Opened At</p>
                    <p>{formatDate(viewCommunication.openedAt.toString())}</p>
                  </div>
                )}
                {viewCommunication.clickedAt && (
                  <div>
                    <p className="font-medium text-muted-foreground">Clicked At</p>
                    <p>{formatDate(viewCommunication.clickedAt.toString())}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteCommunication !== null} onOpenChange={(open) => !open && setDeleteCommunication(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Communication</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this communication? This action cannot be undone.
              {deleteCommunication && (
                <div className="mt-2 p-2 bg-muted rounded">
                  <p className="font-medium">{deleteCommunication.subject || "No Subject"}</p>
                  <p className="text-sm text-muted-foreground">
                    Type: {getTypeLabel(deleteCommunication.type)} • Status: {deleteCommunication.status}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCommunication}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteCommunicationMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteCommunicationMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}