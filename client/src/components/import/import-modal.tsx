import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { parseCSVFile, parseExcelFile } from "@/lib/csv-parser";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface FilePreview {
  fileName: string;
  fileSize: number;
  totalRows: number;
  headers: string[];
  preview: any[];
}

interface AIAnalysisResult {
  fieldMappings: Record<string, any>;
  overallConfidence: number;
  requiredFieldsCovered: boolean;
  cleaningStrategy: any;
  insights: string[];
  warnings: string[];
}

export function ImportModal({ open, onOpenChange, onSuccess }: ImportModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'upload' | 'ai-analyzing' | 'ai-preview' | 'importing'>('upload');
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [options, setOptions] = useState({
    skipDuplicates: true,
    sendWelcomeEmail: false,
    updateExisting: false,
  });
  const [importProgress, setImportProgress] = useState(0);
  const [currentImportId, setCurrentImportId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<any>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [isAiMode, setIsAiMode] = useState(true); // Default to AI mode

  // AI-powered CSV analysis mutation - THE MOST IMPORTANT FEATURE
  const aiAnalyzeMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiRequest("POST", "/api/import/ai-analyze", formData);
      return response.json();
    },
    onSuccess: (data) => {
      setFilePreview(data);
      setAiAnalysis(data.aiAnalysis);
      setStep('ai-preview');
      
      toast({
        title: "AI Analysis Complete! 🎉",
        description: `AI detected ${Object.keys(data.aiAnalysis.fieldMappings).length} fields with ${Math.round(data.aiAnalysis.overallConfidence * 100)}% confidence`,
      });
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
        title: "AI Analysis Failed",
        description: error.message || "Failed to analyze CSV with AI. Please try manual mode.",
        variant: "destructive",
      });
      setStep('upload');
    },
  });

  // Fallback to manual preview for non-AI mode
  const previewMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiRequest("POST", "/api/import/preview", formData);
      return response.json();
    },
    onSuccess: (data) => {
      setFilePreview(data);
      setStep('ai-preview'); // Even manual mode shows preview
      
      // Basic auto-mapping as fallback - but AI mode is preferred
      const autoMapping: Record<string, string> = {};
      data.headers.forEach((header: string) => {
        const lowerHeader = header.toLowerCase().replace(/[\s\-_]/g, '');
        if (['firstname', 'fname', 'first'].some(pattern => lowerHeader.includes(pattern))) {
          autoMapping.firstName = header;
        } else if (['lastname', 'lname', 'last'].some(pattern => lowerHeader.includes(pattern))) {
          autoMapping.lastName = header;
        } else if (['email', 'emailaddress'].some(pattern => lowerHeader === pattern)) {
          autoMapping.email = header;
        } else if (['phone', 'phonenumber'].some(pattern => lowerHeader.includes(pattern))) {
          autoMapping.phone = header;
        }
      });
      
      // Convert manual mapping to AI format for consistency
      const aiMappings: Record<string, any> = {};
      Object.entries(autoMapping).forEach(([dbField, csvField]) => {
        aiMappings[csvField] = {
          dbField,
          confidence: 0.7,
          dataType: 'text',
          cleaningNeeded: [],
          examples: data.preview.slice(0, 3).map((row: any) => row[csvField]).filter(Boolean)
        };
      });
      
      setAiAnalysis({
        fieldMappings: aiMappings,
        overallConfidence: 0.7,
        requiredFieldsCovered: Object.keys(autoMapping).length > 0,
        cleaningStrategy: {},
        insights: ['Manual mapping detected basic fields'],
        warnings: ['Consider using AI mode for better mapping accuracy']
      });
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
        description: error.message || "Failed to process file",
        variant: "destructive",
      });
    },
  });

  const validateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("No file selected");
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('fieldMapping', JSON.stringify(fieldMapping));
      formData.append('options', JSON.stringify(options));
      
      const response = await apiRequest("POST", "/api/import/validate", formData);
      return response.json();
    },
    onSuccess: (data) => {
      setValidationResults(data);
      setStep('validation');
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
        description: error.message || "Failed to validate import data",
        variant: "destructive",
      });
    },
  });

  // AI-powered import mutation - THE MOST IMPORTANT FEATURE
  const aiImportMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("No file selected");
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('options', JSON.stringify(options));
      
      const response = await apiRequest("POST", "/api/import/ai-process", formData);
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentImportId(data.importId);
      setStep('importing');
      setImportProgress(10);
      
      toast({
        title: "AI Import Started! 🚀",
        description: `AI is processing ${filePreview?.totalRows} records with ${Math.round(data.aiAnalysis.overallConfidence * 100)}% confidence`,
      });
      
      // Poll for import status
      pollImportStatus(data.importId);
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
        title: "AI Import Failed",
        description: error.message || "Failed to start AI import",
        variant: "destructive",
      });
    },
  });

  // Fallback manual import for compatibility
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("No file selected");
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // Convert AI analysis back to traditional field mapping if available
      const traditionalMapping: Record<string, string> = {};
      if (aiAnalysis?.fieldMappings) {
        Object.entries(aiAnalysis.fieldMappings).forEach(([csvField, mapping]: [string, any]) => {
          if (mapping.dbField && mapping.dbField !== 'skip') {
            traditionalMapping[mapping.dbField] = csvField;
          }
        });
      }
      
      formData.append('fieldMapping', JSON.stringify(traditionalMapping));
      formData.append('options', JSON.stringify(options));
      
      const response = await apiRequest("POST", "/api/import/process", formData);
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentImportId(data.importId);
      setStep('importing');
      // Poll for import status
      pollImportStatus(data.importId);
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
        description: error.message || "Failed to start import",
        variant: "destructive",
      });
    },
  });

  const pollImportStatus = async (importId: string) => {
    const checkStatus = async () => {
      try {
        const response = await apiRequest("GET", `/api/import/${importId}/status`);
        const status = await response.json();
        
        setImportStatus(status);
        const progress = status.progress || 0;
        setImportProgress(progress);
        
        if (status.status === 'completed') {
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          toast({
            title: "Import Completed",
            description: `Successfully imported ${status.successfulRows} out of ${status.totalRows} records`,
          });
          resetModal();
          onSuccess?.();
        } else if (status.status === 'failed') {
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          toast({
            title: "Import Failed",
            description: status.errors && status.errors.length > 0 ? status.errors[0].error : "There was an error processing the import",
            variant: "destructive",
          });
          resetModal();
        } else if (status.status === 'cancelled') {
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          toast({
            title: "Import Cancelled",
            description: "The import was cancelled successfully",
          });
          resetModal();
        } else if (['pending', 'processing', 'validating', 'importing'].includes(status.status)) {
          // Continue polling
          if (!pollingInterval) {
            const interval = setInterval(checkStatus, 2000);
            setPollingInterval(interval);
          }
        }
      } catch (error) {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        toast({
          title: "Error",
          description: "Failed to check import status",
          variant: "destructive",
        });
        resetModal();
      }
    };
    
    checkStatus();
  };

  const cancelImportMutation = useMutation({
    mutationFn: async () => {
      if (!currentImportId) throw new Error("No import job to cancel");
      
      const response = await apiRequest("POST", `/api/import/${currentImportId}/cancel`, {
        reason: "Cancelled by user"
      });
      return response.json();
    },
    onSuccess: () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      toast({
        title: "Import Cancelled",
        description: "The import was cancelled successfully",
      });
      resetModal();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel import",
        variant: "destructive",
      });
    },
  });

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      setStep('ai-analyzing');
      
      // Use AI analysis by default - THE MOST IMPORTANT FEATURE
      if (isAiMode) {
        aiAnalyzeMutation.mutate(file);
      } else {
        // Fallback to manual mode only if AI is disabled
        previewMutation.mutate(file);
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: false,
  });

  const resetModal = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    setStep('upload');
    setFilePreview(null);
    setSelectedFile(null);
    setFieldMapping({});
    setValidationResults(null);
    setCurrentImportId(null);
    setImportStatus(null);
    setOptions({
      skipDuplicates: true,
      sendWelcomeEmail: true,
      updateExisting: false,
    });
    setImportProgress(0);
    onOpenChange(false);
  };

  const dbFields = [
    // Required fields
    { value: 'firstName', label: 'First Name', required: true, category: 'Basic Info' },
    { value: 'lastName', label: 'Last Name', required: true, category: 'Basic Info' },
    
    // Contact Information
    { value: 'email', label: 'Email Address', category: 'Contact' },
    { value: 'phone', label: 'Phone Number', category: 'Contact' },
    { value: 'address', label: 'Street Address', category: 'Contact' },
    { value: 'city', label: 'City', category: 'Contact' },
    { value: 'state', label: 'State/Province', category: 'Contact' },
    { value: 'zipCode', label: 'ZIP/Postal Code', category: 'Contact' },
    { value: 'country', label: 'Country', category: 'Contact' },
    
    // School-Specific Information
    { value: 'donorType', label: 'Donor Type', category: 'School Info', 
      options: ['parent', 'alumni', 'community', 'staff', 'board', 'foundation', 'business'] },
    { value: 'studentName', label: 'Student Name', category: 'School Info' },
    { value: 'gradeLevel', label: 'Grade Level', category: 'School Info' },
    { value: 'alumniYear', label: 'Alumni Year', category: 'School Info' },
    { value: 'graduationYear', label: 'Graduation Year', category: 'School Info' },
    
    // Communication Preferences  
    { value: 'emailOptIn', label: 'Email Opt-In', category: 'Preferences', type: 'boolean' },
    { value: 'phoneOptIn', label: 'Phone Opt-In', category: 'Preferences', type: 'boolean' },
    { value: 'mailOptIn', label: 'Mail Opt-In', category: 'Preferences', type: 'boolean' },
    { value: 'preferredContactMethod', label: 'Preferred Contact Method', category: 'Preferences',
      options: ['email', 'phone', 'mail'] },
    
    // Additional Information
    { value: 'notes', label: 'Notes/Comments', category: 'Additional' },
  ];

  return (
    <Dialog open={open} onOpenChange={resetModal}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Donor Data</DialogTitle>
          <DialogDescription>
            Upload CSV or Excel files to import donor data. We'll help you map fields and detect duplicates.
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Upload CSV or Excel files up to 50MB. AI will automatically map fields and clean data.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">AI Mode</span>
                <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                  🤖 ACTIVE
                </div>
              </div>
            </div>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
              data-testid="file-upload-area"
            >
              <input {...getInputProps()} />
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-cloud-upload-alt text-2xl text-muted-foreground"></i>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                {isDragActive ? 'Drop your file here' : 'Drop your file here'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">or click to browse files</p>
              <Button type="button" disabled={aiAnalyzeMutation.isPending || previewMutation.isPending}>
                {aiAnalyzeMutation.isPending ? 'AI Analyzing...' : 'Choose File'}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Supports CSV, XLSX, XLS files up to 50MB • AI will handle all field mapping automatically
              </p>
            </div>
          </div>
        )}

        {step === 'ai-analyzing' && (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <div className="animate-spin text-2xl">🤖</div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">AI is Analyzing Your File</h3>
                <p className="text-sm text-muted-foreground">
                  Our AI is intelligently mapping your CSV fields to our database schema.
                  This usually takes 5-10 seconds.
                </p>
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Analyzing headers and data structure
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                  Detecting field types and formats
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-gray-300 rounded-full mr-2"></div>
                  Preparing data cleaning strategy
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'ai-preview' && filePreview && aiAnalysis && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">AI Analysis Complete! 🎉</h3>
                <p className="text-sm text-muted-foreground">
                  {filePreview.fileName} ({(filePreview.fileSize / 1024 / 1024).toFixed(1)} MB) - {filePreview.totalRows} rows
                  • {Math.round(aiAnalysis.overallConfidence * 100)}% confidence
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">{Math.round(aiAnalysis.overallConfidence * 100)}%</div>
                <div className="text-xs text-muted-foreground">AI Confidence</div>
              </div>
            </div>

            {/* AI Insights Card */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-green-800 flex items-center gap-2">
                  <span>🤖</span> AI Field Mappings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(aiAnalysis.fieldMappings).map(([csvField, mapping]: [string, any]) => (
                  <div key={csvField} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">"{csvField}"</span>
                      <span className="text-gray-500">→</span>
                      <span className="text-green-700 font-medium">{mapping.dbField}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        {Math.round(mapping.confidence * 100)}%
                      </div>
                      {mapping.cleaningNeeded && mapping.cleaningNeeded.length > 0 && (
                        <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Will clean
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Data Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Data Preview (First 5 rows)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {filePreview.headers.map((header) => (
                          <TableHead key={header} className="min-w-[120px]">
                            <div>
                              <div className="font-medium">{header}</div>
                              {aiAnalysis.fieldMappings[header] && (
                                <div className="text-xs text-green-600 mt-1">
                                  → {aiAnalysis.fieldMappings[header].dbField}
                                </div>
                              )}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filePreview.preview.slice(0, 5).map((row, index) => (
                        <TableRow key={index}>
                          {filePreview.headers.map((header) => (
                            <TableCell key={header} className="max-w-[150px] truncate">
                              {row[header] || '-'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Import Options */}
            <Card>
              <CardHeader>
                <CardTitle>Import Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="skipDuplicates"
                      checked={options.skipDuplicates}
                      onCheckedChange={(checked) => setOptions(prev => ({ ...prev, skipDuplicates: !!checked }))}
                      data-testid="checkbox-skip-duplicates"
                    />
                    <label htmlFor="skipDuplicates" className="text-sm font-medium">Skip duplicates</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="updateExisting"
                      checked={options.updateExisting}
                      onCheckedChange={(checked) => setOptions(prev => ({ ...prev, updateExisting: !!checked }))}
                      data-testid="checkbox-update-existing"
                    />
                    <label htmlFor="updateExisting" className="text-sm font-medium">Update existing records</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sendWelcomeEmail"
                      checked={options.sendWelcomeEmail}
                      onCheckedChange={(checked) => setOptions(prev => ({ ...prev, sendWelcomeEmail: !!checked }))}
                      data-testid="checkbox-send-welcome"
                    />
                    <label htmlFor="sendWelcomeEmail" className="text-sm font-medium">Send welcome emails</label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={resetModal} data-testid="button-cancel">
                Cancel
              </Button>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setIsAiMode(false)}
                  data-testid="button-manual-mode"
                >
                  Switch to Manual Mode
                </Button>
                <Button 
                  onClick={() => aiImportMutation.mutate()}
                  disabled={aiImportMutation.isPending || !aiAnalysis.requiredFieldsCovered}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-start-ai-import"
                >
                  {aiImportMutation.isPending ? 'Starting Import...' : `🚀 Start AI Import (${filePreview.totalRows} records)`}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && filePreview && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">File Preview</h3>
              <p className="text-sm text-muted-foreground">
                {filePreview.fileName} ({(filePreview.fileSize / 1024 / 1024).toFixed(1)} MB) - {filePreview.totalRows} rows
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>First 10 rows</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {filePreview.headers.map((header) => (
                          <TableHead key={header}>{header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filePreview.preview.slice(0, 10).map((row, index) => (
                        <TableRow key={index}>
                          {filePreview.headers.map((header) => (
                            <TableCell key={header}>{row[header] || '-'}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={resetModal}>
                Cancel
              </Button>
              <Button onClick={() => setStep('mapping')} data-testid="button-continue-mapping">
                Continue to Mapping
              </Button>
            </div>
          </div>
        )}

        {step === 'mapping' && filePreview && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Field Mapping</h3>
              <p className="text-sm text-muted-foreground">
                Map your file columns to our database fields
              </p>
            </div>

            {/* Organized field mapping by category */}
            <div className="space-y-6">
              {['Basic Info', 'Contact', 'School Info', 'Preferences', 'Additional'].map(category => {
                const categoryFields = dbFields.filter(field => field.category === category);
                if (categoryFields.length === 0) return null;
                
                return (
                  <div key={category}>
                    <h4 className="font-medium text-foreground mb-3 pb-2 border-b">{category}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {categoryFields.map((dbField) => (
                        <div key={dbField.value}>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            {dbField.label} {dbField.required && <span className="text-red-500">*</span>}
                            {dbField.options && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({dbField.options.join(', ')})
                              </span>
                            )}
                          </label>
                          <Select
                            value={fieldMapping[dbField.value] || "skip"}
                            onValueChange={(value) => 
                              setFieldMapping(prev => ({ ...prev, [dbField.value]: value === "skip" ? "" : value }))
                            }
                          >
                            <SelectTrigger 
                              data-testid={`select-mapping-${dbField.value}`}
                              className={dbField.required && !fieldMapping[dbField.value] ? 'border-red-300' : ''}
                            >
                              <SelectValue placeholder="Select column..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="skip">-- Skip --</SelectItem>
                              {filePreview.headers.map((header) => (
                                <SelectItem key={header} value={header}>
                                  {header}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {dbField.type === 'boolean' && fieldMapping[dbField.value] && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Values like "true", "yes", "1" will be treated as true
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Import Options</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="skipDuplicates"
                    checked={options.skipDuplicates}
                    onCheckedChange={(checked) => 
                      setOptions(prev => ({ ...prev, skipDuplicates: checked as boolean }))
                    }
                    data-testid="checkbox-skip-duplicates"
                  />
                  <label htmlFor="skipDuplicates" className="text-sm text-foreground">
                    Skip duplicate records (match by email + name)
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sendWelcomeEmail"
                    checked={options.sendWelcomeEmail}
                    onCheckedChange={(checked) => 
                      setOptions(prev => ({ ...prev, sendWelcomeEmail: checked as boolean }))
                    }
                    data-testid="checkbox-welcome-email"
                  />
                  <label htmlFor="sendWelcomeEmail" className="text-sm text-foreground">
                    Send welcome email to new donors
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="updateExisting"
                    checked={options.updateExisting}
                    onCheckedChange={(checked) => 
                      setOptions(prev => ({ ...prev, updateExisting: checked as boolean }))
                    }
                    data-testid="checkbox-update-existing"
                  />
                  <label htmlFor="updateExisting" className="text-sm text-foreground">
                    Update existing donor records
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={resetModal}>
                Cancel
              </Button>
              <Button 
                onClick={() => validateMutation.mutate()}
                disabled={!fieldMapping.firstName || !fieldMapping.lastName || validateMutation.isPending}
                data-testid="button-validate-data"
              >
                {validateMutation.isPending ? 'Validating...' : 'Validate & Preview'}
              </Button>
            </div>
          </div>
        )}

        {step === 'validation' && validationResults && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Import Preview & Validation</h3>
              <p className="text-sm text-muted-foreground">
                Review the validation results before importing
              </p>
            </div>

            {/* Summary Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Import Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{validationResults.summary.validRows}</div>
                    <div className="text-sm text-muted-foreground">Valid Records</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{validationResults.summary.errorRows}</div>
                    <div className="text-sm text-muted-foreground">Errors</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{validationResults.summary.duplicateRows}</div>
                    <div className="text-sm text-muted-foreground">Duplicates</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{validationResults.summary.newRecords}</div>
                    <div className="text-sm text-muted-foreground">New Records</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Validation Details */}
            <Card>
              <CardHeader>
                <CardTitle>Validation Details (First 100 rows)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Issues</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationResults.results.map((result: any) => (
                        <TableRow key={result.rowIndex} data-testid={`validation-row-${result.rowIndex}`}>
                          <TableCell>{result.rowIndex}</TableCell>
                          <TableCell>
                            {result.mappedData.firstName} {result.mappedData.lastName}
                          </TableCell>
                          <TableCell>{result.mappedData.email || '-'}</TableCell>
                          <TableCell>
                            {result.errors.length > 0 && (
                              <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                                Error
                              </span>
                            )}
                            {result.duplicates.length > 0 && result.errors.length === 0 && (
                              <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                                Duplicate
                              </span>
                            )}
                            {result.errors.length === 0 && result.duplicates.length === 0 && (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                Valid
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {result.errors.map((error: string, i: number) => (
                                <div key={i} className="text-xs text-red-600">{error}</div>
                              ))}
                              {result.warnings.map((warning: string, i: number) => (
                                <div key={i} className="text-xs text-yellow-600">{warning}</div>
                              ))}
                              {result.duplicates.map((dup: any, i: number) => (
                                <div key={i} className="text-xs text-blue-600">
                                  {dup.confidence} match: {dup.matchReasons.join(', ')}
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              result.action === 'create' ? 'bg-green-100 text-green-800' :
                              result.action === 'update' ? 'bg-blue-100 text-blue-800' :
                              result.action === 'skip' ? 'bg-gray-100 text-gray-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {result.action === 'create' ? 'Create' :
                               result.action === 'update' ? 'Update' :
                               result.action === 'skip' ? 'Skip' :
                               'Review'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Field Statistics */}
            {Object.keys(validationResults.fieldStatistics).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Field Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(validationResults.fieldStatistics).map(([field, stats]: [string, any]) => (
                      <div key={field} className="space-y-2">
                        <h4 className="font-medium">{field}</h4>
                        <div className="text-sm space-y-1">
                          <div>Total: {stats.totalCount}</div>
                          <div>Valid: {stats.validCount}</div>
                          <div>Empty: {stats.emptyCount}</div>
                          <div>Unique: {stats.uniqueValues}</div>
                          {stats.commonValues.length > 0 && (
                            <div>
                              Common: {stats.commonValues.slice(0, 3).map((v: any) => v.value).join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Back to Mapping
              </Button>
              <Button variant="outline" onClick={resetModal}>
                Cancel
              </Button>
              <Button 
                onClick={() => importMutation.mutate()}
                disabled={validationResults.summary.errorRows > 0 || importMutation.isPending}
                data-testid="button-proceed-import"
              >
                {importMutation.isPending ? 'Starting Import...' : 
                 `Import ${validationResults.summary.validRows} Records`}
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="space-y-6 text-center">
            <div>
              <h3 className="text-lg font-semibold mb-2">Importing Data</h3>
              <p className="text-sm text-muted-foreground">
                {importStatus?.status === 'pending' ? 'Preparing import...' :
                 importStatus?.status === 'validating' ? 'Validating data...' :
                 importStatus?.status === 'processing' ? 'Processing records...' :
                 'Please wait while we process your file...'}
              </p>
              {importStatus?.name && (
                <p className="text-xs text-muted-foreground mt-1">
                  Job: {importStatus.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Progress value={importProgress} className="w-full" data-testid="import-progress" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{Math.round(importProgress)}% complete</span>
                {importStatus?.estimatedTimeRemaining && (
                  <span>~{Math.round(importStatus.estimatedTimeRemaining)}s remaining</span>
                )}
              </div>
              {importStatus && (
                <div className="text-xs text-muted-foreground space-y-1">
                  {importStatus.processedRows > 0 && (
                    <div>Processed: {importStatus.processedRows.toLocaleString()} / {importStatus.totalRows.toLocaleString()} rows</div>
                  )}
                  {importStatus.successfulRows > 0 && (
                    <div className="text-green-600">✓ Successful: {importStatus.successfulRows.toLocaleString()}</div>
                  )}
                  {importStatus.errorRows > 0 && (
                    <div className="text-red-600">⚠ Errors: {importStatus.errorRows.toLocaleString()}</div>
                  )}
                  {importStatus.skippedRows > 0 && (
                    <div className="text-yellow-600">→ Skipped: {importStatus.skippedRows.toLocaleString()}</div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-center items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              {currentImportId && ['pending', 'processing', 'validating', 'importing'].includes(importStatus?.status) && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => cancelImportMutation.mutate()}
                  disabled={cancelImportMutation.isPending}
                  data-testid="button-cancel-import"
                >
                  {cancelImportMutation.isPending ? 'Cancelling...' : 'Cancel Import'}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
