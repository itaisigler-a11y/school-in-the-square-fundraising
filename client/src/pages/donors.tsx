import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DonorForm } from "@/components/donors/donor-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Donor } from "@shared/schema";

export default function Donors() {
  const [search, setSearch] = useState("");
  const [donorType, setDonorType] = useState<string>("all");
  const [engagementLevel, setEngagementLevel] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editDonor, setEditDonor] = useState<Donor | null>(null);
  const [deleteDonor, setDeleteDonor] = useState<Donor | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/donors", { 
      search, 
      donorType: donorType === "all" ? undefined : donorType, 
      engagementLevel: engagementLevel === "all" ? undefined : engagementLevel, 
      page, 
      limit: 25 
    }],
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: false,
    refetchOnWindowFocus: false,
    // Optimize for memory by limiting cache size - using gcTime for TanStack Query v5
    gcTime: 60000, // Keep in cache for 1 minute only
  });

  // Delete donor mutation
  const deleteDonorMutation = useMutation({
    mutationFn: async (donorId: string) => {
      const response = await apiRequest("DELETE", `/api/donors/${donorId}`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Donor deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/donors"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      setDeleteDonor(null);
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
        description: error.message || "Failed to delete donor",
        variant: "destructive",
      });
    },
  });

  const handleEditDonor = (donor: Donor) => {
    setEditDonor(donor);
  };

  const handleDeleteDonor = (donor: Donor) => {
    setDeleteDonor(donor);
  };

  const confirmDeleteDonor = () => {
    if (deleteDonor?.id) {
      deleteDonorMutation.mutate(deleteDonor.id);
    }
  };

  const donors = data?.donors || [];
  const total = data?.total || 0;

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const getEngagementBadgeColor = (level: string) => {
    switch (level) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'engaged': return 'bg-purple-100 text-purple-800';
      case 'at_risk': return 'bg-yellow-100 text-yellow-800';
      case 'lapsed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDonorTypeLabel = (type: string) => {
    switch (type) {
      case 'parent': return 'Parent';
      case 'alumni': return 'Alumni';
      case 'community': return 'Community';
      case 'staff': return 'Staff';
      case 'board': return 'Board';
      case 'foundation': return 'Foundation';
      case 'business': return 'Business';
      default: return 'Unknown';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Donor Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage donor profiles, track engagement, and analyze giving patterns
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-donor">
              <i className="fas fa-plus mr-2"></i>Add Donor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Donor</DialogTitle>
              <DialogDescription>
                Create a new donor profile with contact information, preferences, and school connections.
              </DialogDescription>
            </DialogHeader>
            <DonorForm 
              onSuccess={() => {
                setIsCreateOpen(false);
                refetch();
              }} 
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Donor Dialog */}
      <Dialog open={!!editDonor} onOpenChange={(open) => !open && setEditDonor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Donor</DialogTitle>
            <DialogDescription>
              Update donor profile information, preferences, and school connections.
            </DialogDescription>
          </DialogHeader>
          {editDonor && (
            <DonorForm 
              donor={editDonor}
              isEditing={true}
              onSuccess={() => {
                setEditDonor(null);
                refetch();
              }} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Donor Confirmation Dialog */}
      <AlertDialog open={!!deleteDonor} onOpenChange={(open) => !open && setDeleteDonor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Donor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteDonor?.firstName} {deleteDonor?.lastName}</strong>?
              <br /><br />
              <span className="text-destructive font-medium">This action cannot be undone.</span> This will permanently remove the donor profile and may affect related donations and communications.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteDonor}
              disabled={deleteDonorMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteDonorMutation.isPending ? "Deleting..." : "Delete Donor"}
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
                placeholder="Search donors..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                data-testid="input-search-donors"
              />
            </div>
            <div>
              <Select value={donorType} onValueChange={setDonorType}>
                <SelectTrigger data-testid="select-donor-type">
                  <SelectValue placeholder="Donor Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="alumni">Alumni</SelectItem>
                  <SelectItem value="community">Community</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="board">Board</SelectItem>
                  <SelectItem value="foundation">Foundation</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={engagementLevel} onValueChange={setEngagementLevel}>
                <SelectTrigger data-testid="select-engagement-level">
                  <SelectValue placeholder="Engagement Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="engaged">Engaged</SelectItem>
                  <SelectItem value="at_risk">At Risk</SelectItem>
                  <SelectItem value="lapsed">Lapsed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearch("");
                  setDonorType("all");
                  setEngagementLevel("all");
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

      {/* Donors Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Donors ({total.toLocaleString()})
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
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Engagement</TableHead>
                    <TableHead>Lifetime Value</TableHead>
                    <TableHead>Last Donation</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {donors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        {/* Check if this is filtered results vs truly empty */}
                        {search || donorType !== "all" || engagementLevel !== "all" ? (
                          // Filtered results - no matches
                          <div className="text-muted-foreground">
                            <i className="fas fa-search text-4xl mb-4 block"></i>
                            <h3 className="text-lg font-semibold mb-2 text-foreground">No donors match your filters</h3>
                            <p className="mb-4">Try adjusting your search criteria or clearing filters to see all donors</p>
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setSearch("");
                                setDonorType("all");
                                setEngagementLevel("all");
                                setPage(1);
                              }}
                              data-testid="button-clear-all-filters"
                            >
                              Clear All Filters
                            </Button>
                          </div>
                        ) : (
                          // True empty state - no donors at all
                          <div className="max-w-md mx-auto">
                            <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
                              <i className="fas fa-users text-2xl text-primary"></i>
                            </div>
                            <h3 className="text-xl font-semibold mb-3 text-foreground">Build Your Donor Community</h3>
                            <p className="text-muted-foreground mb-6 leading-relaxed">
                              Start growing your School in the Square fundraising efforts by adding donor profiles. 
                              Track engagement, manage relationships, and organize your community supporters.
                            </p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button className="w-full" data-testid="button-add-first-donor">
                                    <i className="fas fa-user-plus mr-2"></i>
                                    Add Your First Donor
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Add Your First Donor</DialogTitle>
                                    <DialogDescription>
                                      Create a donor profile with contact information, preferences, and school connections.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <DonorForm 
                                    onSuccess={() => {
                                      refetch();
                                    }} 
                                  />
                                </DialogContent>
                              </Dialog>

                              <Button 
                                variant="outline" 
                                className="w-full"
                                onClick={() => window.location.href = '/import'}
                                data-testid="button-import-donors"
                              >
                                <i className="fas fa-upload mr-2"></i>
                                Import from CSV
                              </Button>
                            </div>

                            <div className="bg-muted/30 rounded-lg p-4 text-left">
                              <h4 className="font-medium text-foreground text-sm mb-2 flex items-center">
                                <i className="fas fa-lightbulb mr-2 text-amber-500"></i>
                                Getting Started Tips
                              </h4>
                              <ul className="text-xs text-muted-foreground space-y-1">
                                <li>• Start with key community members and regular supporters</li>
                                <li>• Include parent contact info and student connections</li>
                                <li>• Alumni information helps with long-term engagement</li>
                                <li>• Local business contacts can become ongoing partners</li>
                              </ul>
                            </div>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    donors.map((donor: any) => (
                      <TableRow key={donor.id} data-testid={`row-donor-${donor.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{donor.firstName} {donor.lastName}</p>
                            {donor.studentName && (
                              <p className="text-sm text-muted-foreground">
                                Student: {donor.studentName}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{donor.email || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getDonorTypeLabel(donor.donorType)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getEngagementBadgeColor(donor.engagementLevel)}>
                            {donor.engagementLevel}
                          </Badge>
                        </TableCell>
                        <TableCell>${Number(donor.lifetimeValue || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          {donor.lastDonationDate 
                            ? new Date(donor.lastDonationDate).toLocaleDateString()
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditDonor(donor)}
                              data-testid={`button-edit-donor-${donor.id}`}
                              title="Edit donor"
                            >
                              <i className="fas fa-edit text-blue-600"></i>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteDonor(donor)}
                              data-testid={`button-delete-donor-${donor.id}`}
                              title="Delete donor"
                            >
                              <i className="fas fa-trash text-red-600"></i>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {total > 25 && (
            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {((page - 1) * 25) + 1} to {Math.min(page * 25, total)} of {total} donors
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
