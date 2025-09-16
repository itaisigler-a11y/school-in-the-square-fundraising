import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { EmailTemplateBuilder } from "@/components/communications/email-template-builder";

export default function Communications() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [isTemplateBuilderOpen, setIsTemplateBuilderOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/communications", { 
      search, 
      type: type === "all" ? undefined : type, 
      status: status === "all" ? undefined : status, 
      page, 
      limit: 25 
    }],
  });

  const communications = (data as any)?.communications || [];
  const total = (data as any)?.total || 0;

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
          <Dialog open={isTemplateBuilderOpen} onOpenChange={setIsTemplateBuilderOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-template">
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
            <i className="fas fa-paper-plane mr-2"></i>Send Campaign
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
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              data-testid={`button-view-communication-${communication.id}`}
                            >
                              <i className="fas fa-eye"></i>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              data-testid={`button-edit-communication-${communication.id}`}
                            >
                              <i className="fas fa-edit"></i>
                            </Button>
                            {communication.status === 'draft' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                data-testid={`button-send-communication-${communication.id}`}
                              >
                                <i className="fas fa-paper-plane"></i>
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
    </div>
  );
}