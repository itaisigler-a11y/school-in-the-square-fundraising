import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportModal } from "@/components/import/import-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

// Import Job Actions Component
function ImportJobActions({ job, onRefresh }: { job: any; onRefresh: () => void }) {
  const { toast } = useToast();
  
  const cancelJobMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/import/${job.id}/cancel`, {
        reason: "Cancelled by user from import history"
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Job Cancelled",
        description: "Import job cancelled successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/import/jobs"] });
      onRefresh();
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
        description: error.message || "Failed to cancel job",
        variant: "destructive",
      });
    },
  });

  const downloadErrorReport = async () => {
    try {
      const response = await fetch(`/api/import/${job.id}/errors`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to download error report');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `import-errors-${job.name}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download Started",
        description: "Error report download has started",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download error report",
        variant: "destructive",
      });
    }
  };

  const canCancel = ['pending', 'processing', 'validating', 'importing'].includes(job.status);
  const hasErrors = (job.errorRows || 0) > 0;
  const hasWarnings = job.summary?.hasWarnings;

  return (
    <div className="flex gap-2">
      {/* View Details Button */}
      <Button 
        variant="ghost" 
        size="sm"
        title="View job details"
        data-testid={`button-view-import-${job.id}`}
      >
        <i className="fas fa-eye"></i>
      </Button>
      
      {/* Cancel Button - only for active jobs */}
      {canCancel && (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => cancelJobMutation.mutate()}
          disabled={cancelJobMutation.isPending}
          title="Cancel import job"
          data-testid={`button-cancel-import-${job.id}`}
        >
          <i className={`fas ${
            cancelJobMutation.isPending ? 'fa-spinner fa-spin' : 'fa-times'
          }`}></i>
        </Button>
      )}
      
      {/* Download Error Report */}
      {hasErrors && (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={downloadErrorReport}
          title="Download error report"
          data-testid={`button-download-errors-${job.id}`}
        >
          <i className="fas fa-download"></i>
        </Button>
      )}
      
      {/* Download Warnings Report */}
      {hasWarnings && !hasErrors && (
        <Button 
          variant="ghost" 
          size="sm"
          title="View warnings"
          data-testid={`button-view-warnings-${job.id}`}
        >
          <i className="fas fa-exclamation-triangle text-yellow-600"></i>
        </Button>
      )}
      
      {/* Retry Button - for failed jobs */}
      {job.status === 'failed' && (
        <Button 
          variant="ghost" 
          size="sm"
          title="Retry import with same settings"
          data-testid={`button-retry-import-${job.id}`}
        >
          <i className="fas fa-redo"></i>
        </Button>
      )}
    </div>
  );
}

export default function ImportPage() {
  const [isImportOpen, setIsImportOpen] = useState(false);

  const { data: imports = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/import/jobs"],
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'processing': 
      case 'validating':
      case 'importing': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Import</h1>
          <p className="text-sm text-muted-foreground">
            Import donor data from CSV or Excel files with advanced field mapping and duplicate detection
          </p>
        </div>
        
        <Button 
          onClick={() => setIsImportOpen(true)}
          data-testid="button-import-data"
        >
          <i className="fas fa-upload mr-2"></i>Import Data
        </Button>
      </div>

      {/* Import Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Import Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-foreground mb-2">Supported File Formats</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• CSV files (.csv)</li>
                <li>• Excel files (.xlsx, .xls)</li>
                <li>• Maximum file size: 50MB</li>
                <li>• Up to 10,000 rows recommended</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Required Fields</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• First Name (required)</li>
                <li>• Last Name (required)</li>
                <li>• Email (recommended)</li>
                <li>• Phone (optional)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">School-Specific Fields</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Student Name</li>
                <li>• Grade Level</li>
                <li>• Alumni Year</li>
                <li>• Donor Type (Parent, Alumni, etc.)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Data Quality</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Automatic duplicate detection</li>
                <li>• Field validation and cleaning</li>
                <li>• Preview before importing</li>
                <li>• Detailed error reporting</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import History */}
      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Total Rows</TableHead>
                    <TableHead>Successful</TableHead>
                    <TableHead>Errors</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {imports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <div className="max-w-lg mx-auto">
                          <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
                            <i className="fas fa-upload text-2xl text-primary"></i>
                          </div>
                          <h3 className="text-xl font-semibold mb-3 text-foreground">Ready to Import Your Donor Data?</h3>
                          <p className="text-muted-foreground mb-6 leading-relaxed">
                            Speed up your setup by importing existing donor information from spreadsheets. 
                            Our system will automatically map fields and detect duplicates.
                          </p>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                            <Button 
                              onClick={() => setIsImportOpen(true)}
                              className="w-full"
                              data-testid="button-start-first-import"
                            >
                              <i className="fas fa-upload mr-2"></i>
                              Import Your First File
                            </Button>
                            
                            <Button 
                              variant="outline" 
                              className="w-full"
                              onClick={() => {
                                // Create a sample CSV template
                                const csvContent = `First Name,Last Name,Email,Phone,Donor Type,Student Name,Grade Level,Alumni Year,Address,City,State,Zip
John,Smith,john.smith@email.com,(555) 123-4567,Parent,Emma Smith,3rd Grade,,123 Main St,Springfield,IL,62701
Jane,Doe,jane.doe@email.com,(555) 987-6543,Alumni,,,2015,456 Oak Ave,Chicago,IL,60601
Springfield Business,Chamber,info@springfieldchamber.com,(555) 555-0123,Business,,,,"789 Commerce Dr, Suite 100",Springfield,IL,62702
Maria,Garcia,maria.garcia@email.com,(555) 246-8135,Community,,,,"321 Elm St, Apt 2B",Springfield,IL,62703`;
                                
                                const blob = new Blob([csvContent], { type: 'text/csv' });
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.style.display = 'none';
                                a.href = url;
                                a.download = 'school_in_the_square_donor_template.csv';
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                              }}
                              data-testid="button-download-template"
                            >
                              <i className="fas fa-download mr-2"></i>
                              Download Template
                            </Button>
                          </div>

                          <div className="bg-muted/30 rounded-lg p-4 text-left">
                            <h4 className="font-medium text-foreground text-sm mb-3 flex items-center">
                              <i className="fas fa-check-circle mr-2 text-green-500"></i>
                              Import Preparation Checklist
                            </h4>
                            <div className="space-y-2 text-xs text-muted-foreground">
                              <div className="flex items-start gap-2">
                                <span className="w-4 h-4 mt-0.5 flex-shrink-0 text-center">✓</span>
                                <span>Download our template to see the correct format</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="w-4 h-4 mt-0.5 flex-shrink-0 text-center">✓</span>
                                <span>Include First Name and Last Name (required fields)</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="w-4 h-4 mt-0.5 flex-shrink-0 text-center">✓</span>
                                <span>Add Email addresses for better engagement tracking</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="w-4 h-4 mt-0.5 flex-shrink-0 text-center">✓</span>
                                <span>Specify Donor Type (Parent, Alumni, Community, etc.)</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="w-4 h-4 mt-0.5 flex-shrink-0 text-center">✓</span>
                                <span>Save as CSV or Excel file (under 50MB)</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    imports.map((importJob: any) => (
                      <TableRow key={importJob.id} data-testid={`row-import-${importJob.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{importJob.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {importJob.fileName} ({(importJob.fileSize / 1024 / 1024).toFixed(1)} MB)
                            </p>
                            {importJob.description && (
                              <p className="text-xs text-muted-foreground">{importJob.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(importJob.status)}>
                            {importJob.status}
                          </Badge>
                          {importJob.status === 'processing' && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {importJob.estimatedTimeRemaining && `~${Math.round(importJob.estimatedTimeRemaining)}s remaining`}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {importJob.totalRows > 0 ? (
                            <div className="space-y-1">
                              <div className="text-sm font-medium">{importJob.progress || 0}%</div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                  className="bg-primary h-2 rounded-full transition-all" 
                                  style={{ width: `${importJob.progress || 0}%` }}
                                ></div>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {importJob.processedRows || 0} / {importJob.totalRows}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{(importJob.totalRows || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <span className="text-green-600 font-medium">
                            {(importJob.successfulRows || 0).toLocaleString()}
                          </span>
                          {importJob.skippedRows > 0 && (
                            <div className="text-xs text-yellow-600">
                              {importJob.skippedRows} skipped
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {(importJob.errorRows || 0) > 0 ? (
                            <div>
                              <span className="text-red-600 font-medium">
                                {importJob.errorRows.toLocaleString()}
                              </span>
                              {importJob.summary?.hasErrors && (
                                <div className="text-xs text-red-600">Has errors</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(importJob.createdAt).toLocaleDateString()}
                            <div className="text-xs text-muted-foreground">
                              {new Date(importJob.createdAt).toLocaleTimeString()}
                            </div>
                          </div>
                          {importJob.completedAt && (
                            <div className="text-xs text-muted-foreground">
                              Completed: {new Date(importJob.completedAt).toLocaleTimeString()}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <ImportJobActions job={importJob} onRefresh={refetch} />
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

      {/* Import Modal */}
      <ImportModal 
        open={isImportOpen} 
        onOpenChange={setIsImportOpen}
        onSuccess={() => {
          setIsImportOpen(false);
          refetch();
        }}
      />
    </div>
  );
}
