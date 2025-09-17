import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertDonorSchema, type InsertDonor, type Donor } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  DraftManager, 
  calculateFormProgress, 
  announceToScreenReader, 
  validateEmail, 
  formatPhoneNumber, 
  formatName, 
  formatZipCode 
} from "@/lib/form-utils";

import { Button } from "@/components/ui/button";
import { EnhancedInput } from "@/components/ui/enhanced-input";
import { EnhancedTextarea } from "@/components/ui/enhanced-textarea";
import { EnhancedSelect } from "@/components/ui/enhanced-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  GraduationCap, 
  Heart, 
  MessageSquare, 
  Save, 
  Check, 
  AlertCircle,
  Loader2,
  Clock,
  CheckCircle2
} from "lucide-react";

interface DonorFormProps {
  onSuccess?: () => void;
  donor?: Donor;
  isEditing?: boolean;
  className?: string;
}

// Enhanced form data with validation states
interface EnhancedFormData extends InsertDonor {
  _validation?: {
    [K in keyof InsertDonor]?: {
      isValid: boolean;
      error?: string;
      isValidating?: boolean;
    };
  };
}

// Form sections for progress tracking
const FORM_SECTIONS = {
  basic: { title: "Basic Information", fields: ["firstName", "lastName", "email", "phone"] },
  address: { title: "Address", fields: ["address", "city", "state", "zipCode", "country"] },
  school: { title: "School Information", fields: ["donorType", "studentName", "gradeLevel", "alumniYear"] },
  classification: { title: "Classification", fields: ["engagementLevel", "giftSizeTier", "preferredContactMethod"] },
  preferences: { title: "Communication", fields: ["emailOptIn", "phoneOptIn", "mailOptIn"] },
  notes: { title: "Additional Notes", fields: ["notes"] }
} as const;

// Smart donor type options with descriptions
const DONOR_TYPE_OPTIONS = [
  { value: "parent", label: "Parent", description: "Current or former parent" },
  { value: "alumni", label: "Alumni", description: "Graduate of School in the Square" },
  { value: "community", label: "Community Member", description: "Community supporter" },
  { value: "staff", label: "Staff", description: "Current or former staff member" },
  { value: "board", label: "Board Member", description: "Board member or trustee" },
  { value: "foundation", label: "Foundation", description: "Foundation or grant organization" },
  { value: "business", label: "Business", description: "Business or corporate sponsor" }
];

const ENGAGEMENT_LEVEL_OPTIONS = [
  { value: "new", label: "New", description: "First-time or recent donor" },
  { value: "active", label: "Active", description: "Regular supporter" },
  { value: "engaged", label: "Highly Engaged", description: "Very involved supporter" },
  { value: "at_risk", label: "At Risk", description: "May need re-engagement" },
  { value: "lapsed", label: "Lapsed", description: "Former donor" }
];

const GIFT_SIZE_TIER_OPTIONS = [
  { value: "grassroots", label: "Grassroots", description: "$1 - $999" },
  { value: "mid_level", label: "Mid-Level", description: "$1,000 - $9,999" },
  { value: "major", label: "Major Gift", description: "$10,000 - $99,999" },
  { value: "principal", label: "Principal Gift", description: "$100,000+" }
];

const CONTACT_METHOD_OPTIONS = [
  { value: "email", label: "Email", description: "Primary communication via email" },
  { value: "phone", label: "Phone", description: "Prefer phone calls" },
  { value: "mail", label: "Mail", description: "Physical mail preferred" },
  { value: "text", label: "Text Message", description: "SMS notifications" }
];

export function EnhancedDonorForm({ onSuccess, donor, isEditing = false, className }: DonorFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formProgress, setFormProgress] = useState(0);
  const [activeSection, setActiveSection] = useState<keyof typeof FORM_SECTIONS>('basic');
  const [validationStates, setValidationStates] = useState<Record<string, any>>({});
  const [hasDraft, setHasDraft] = useState(false);
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);

  const formId = isEditing ? `donor-edit-${donor?.id}` : 'donor-create';
  
  // Smart default values with draft loading
  const getDefaultValues = useCallback((): InsertDonor => {
    const savedDraft = DraftManager.loadDraft(formId);
    const baseDefaults = {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "USA",
      donorType: "community" as const,
      studentName: "",
      gradeLevel: "",
      alumniYear: undefined,
      graduationYear: undefined,
      engagementLevel: "new" as const,
      giftSizeTier: "grassroots" as const,
      emailOptIn: true,
      phoneOptIn: false,
      mailOptIn: true,
      preferredContactMethod: "email" as const,
      notes: "",
      tags: [],
      customFields: {},
      isActive: true,
    };
    
    if (isEditing && donor) {
      return {
        ...baseDefaults,
        ...donor,
        // Convert null values to empty strings for form compatibility
        email: donor.email || "",
        phone: donor.phone || "",
        address: donor.address || "",
        city: donor.city || "",
        state: donor.state || "",
        zipCode: donor.zipCode || "",
        country: donor.country || "USA",
        studentName: donor.studentName || "",
        gradeLevel: donor.gradeLevel || "",
        notes: donor.notes || "",
        tags: (Array.isArray(donor.tags) ? donor.tags : []) as any,
        customFields: (typeof donor.customFields === 'object' && donor.customFields !== null ? donor.customFields : {}) as any,
        alumniYear: donor.alumniYear || undefined,
        graduationYear: donor.graduationYear || undefined,
      };
    }
    
    if (savedDraft) {
      setHasDraft(true);
      return { ...baseDefaults, ...savedDraft };
    }
    
    return baseDefaults;
  }, [formId, isEditing, donor]);

  const form = useForm<InsertDonor>({
    resolver: zodResolver(insertDonorSchema),
    defaultValues: getDefaultValues(),
    mode: 'onChange', // Enable real-time validation
  });
  
  const watchedValues = form.watch();
  
  // Calculate form progress
  useEffect(() => {
    const allRequiredFields = ['firstName', 'lastName'];
    const progress = calculateFormProgress(watchedValues, allRequiredFields);
    setFormProgress(progress);
  }, [watchedValues]);
  
  // Auto-save draft functionality
  useEffect(() => {
    if (!isEditing && Object.keys(watchedValues).some(key => 
      watchedValues[key as keyof InsertDonor] !== getDefaultValues()[key as keyof InsertDonor]
    )) {
      setAutoSaveStatus('saving');
      const saveTimeout = setTimeout(() => {
        DraftManager.saveDraft(formId, watchedValues);
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus(null), 2000);
      }, 1000);
      
      return () => clearTimeout(saveTimeout);
    }
  }, [watchedValues, formId, isEditing, getDefaultValues]);
  
  // Email validation with suggestions
  const handleEmailChange = useCallback((email: string) => {
    const validation = validateEmail(email);
    if (validation.suggestion) {
      setEmailSuggestion(validation.suggestion);
    } else {
      setEmailSuggestion(null);
    }
  }, []);
  
  // Accept email suggestion
  const acceptEmailSuggestion = useCallback((suggestion: string) => {
    const currentEmail = form.getValues('email');
    if (currentEmail) {
      const [localPart] = currentEmail.split('@');
      form.setValue('email', `${localPart}@${suggestion}`, { shouldValidate: true });
      setEmailSuggestion(null);
      announceToScreenReader('Email suggestion applied');
    }
  }, [form]);

  const createDonorMutation = useMutation({
    mutationFn: async (data: InsertDonor) => {
      const response = await apiRequest("POST", "/api/donors", data);
      return response.json();
    },
    onSuccess: (data) => {
      // Clear the draft on successful creation
      DraftManager.clearDraft(formId);
      setHasDraft(false);
      
      // Show success animation
      setShowSuccessAnimation(true);
      
      toast({
        title: "🎉 Success!",
        description: `${data.firstName} ${data.lastName} has been added to your donor database`,
      });
      
      // Announce to screen readers
      announceToScreenReader(`Donor ${data.firstName} ${data.lastName} created successfully`);
      
      queryClient.invalidateQueries({ queryKey: ["/api/donors"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      
      // Delay success callback to show animation
      setTimeout(() => {
        onSuccess?.();
      }, 1500);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Authentication Required",
          description: "Please log in again to continue",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1500);
        return;
      }
      
      // Enhanced error handling with specific messages
      let errorMessage = "Failed to create donor";
      if (error.message?.includes('email')) {
        errorMessage = "Email address is already in use";
      } else if (error.message?.includes('validation')) {
        errorMessage = "Please check the required fields and try again";
      }
      
      toast({
        title: "Unable to Save Donor",
        description: errorMessage,
        variant: "destructive",
      });
      
      announceToScreenReader(`Error: ${errorMessage}`);
    },
  });

  const updateDonorMutation = useMutation({
    mutationFn: async (data: InsertDonor) => {
      if (!donor?.id) throw new Error("Donor ID is required for updates");
      const response = await apiRequest("PUT", `/api/donors/${donor.id}`, data);
      return response.json();
    },
    onSuccess: (data) => {
      setShowSuccessAnimation(true);
      
      toast({
        title: "✅ Updated Successfully",
        description: `${data.firstName} ${data.lastName}'s information has been updated`,
      });
      
      announceToScreenReader(`Donor ${data.firstName} ${data.lastName} updated successfully`);
      
      queryClient.invalidateQueries({ queryKey: ["/api/donors"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      
      setTimeout(() => {
        onSuccess?.();
      }, 1500);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Authentication Required",
          description: "Please log in again to continue",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1500);
        return;
      }
      
      let errorMessage = "Failed to update donor";
      if (error.message?.includes('email')) {
        errorMessage = "Email address conflicts with another donor";
      } else if (error.message?.includes('validation')) {
        errorMessage = "Please check the required fields and try again";
      }
      
      toast({
        title: "Unable to Update Donor",
        description: errorMessage,
        variant: "destructive",
      });
      
      announceToScreenReader(`Error: ${errorMessage}`);
    },
  });

  const onSubmit = (data: InsertDonor) => {
    // Final validation before submission
    const emailValidation = validateEmail(data.email || '');
    if (data.email && !emailValidation.isValid) {
      toast({
        title: "Invalid Email",
        description: emailValidation.error || "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    
    if (isEditing) {
      updateDonorMutation.mutate(data);
    } else {
      createDonorMutation.mutate(data);
    }
  };

  const isLoading = createDonorMutation.isPending || updateDonorMutation.isPending;
  
  // Clear draft handler
  const clearDraft = useCallback(() => {
    DraftManager.clearDraft(formId);
    setHasDraft(false);
    form.reset(isEditing && donor ? {
      ...donor,
      alumniYear: donor.alumniYear || undefined,
      graduationYear: donor.graduationYear || undefined,
      tags: donor.tags as string[] || [],
    } : getDefaultValues());
    toast({
      title: "Draft Cleared",
      description: "Form has been reset to defaults",
    });
  }, [formId, form, isEditing, donor, getDefaultValues]);
  
  // Load draft handler
  const loadDraft = useCallback(() => {
    const savedDraft = DraftManager.loadDraft(formId);
    if (savedDraft) {
      form.reset({ ...getDefaultValues(), ...savedDraft });
      setHasDraft(false);
      toast({
        title: "Draft Loaded",
        description: "Your previous work has been restored",
      });
    }
  }, [formId, form, getDefaultValues]);

  return (
    <div className={className}>
      {/* Success Animation Overlay */}
      {showSuccessAnimation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-school-blue-900 rounded-lg p-8 flex flex-col items-center space-y-4 animate-in zoom-in-95 duration-500">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-school-blue-900 dark:text-white">
              {isEditing ? 'Donor Updated!' : 'Donor Created!'}
            </h3>
            <p className="text-school-blue-600 dark:text-school-blue-300 text-center">
              {isEditing ? 'Changes have been saved successfully' : 'New donor has been added to your database'}
            </p>
          </div>
        </div>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-4xl mx-auto">
          {/* Header with Progress */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-school-blue-900 dark:text-white">
                  {isEditing ? 'Edit Donor' : 'Add New Donor'}
                </h2>
                <p className="text-school-blue-600 dark:text-school-blue-300">
                  {isEditing ? 'Update donor information' : 'Enter donor details to add them to your database'}
                </p>
              </div>
              
              {/* Auto-save status */}
              {autoSaveStatus && (
                <div className="flex items-center gap-2 text-sm">
                  {autoSaveStatus === 'saving' && (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-school-blue-500" />
                      <span className="text-school-blue-600 dark:text-school-blue-400">Saving draft...</span>
                    </>
                  )}
                  {autoSaveStatus === 'saved' && (
                    <>
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-green-600 dark:text-green-400">Draft saved</span>
                    </>
                  )}
                </div>
              )}
            </div>
            
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-school-blue-600 dark:text-school-blue-400">
                <span>Form Progress</span>
                <span>{formProgress}% complete</span>
              </div>
              <Progress value={formProgress} className="h-2" />
            </div>
            
            {/* Draft notification */}
            {hasDraft && !isEditing && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>You have unsaved changes from a previous session.</span>
                  <div className="flex gap-2 ml-4">
                    <Button type="button" size="sm" variant="outline" onClick={loadDraft}>
                      Load Draft
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={clearDraft}>
                      Discard
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Basic Information Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-school-blue-900 dark:text-white">
                <User className="w-5 h-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mobile-first single column layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <EnhancedInput
                        {...field}
                        id="firstName"
                        label="First Name"
                        required
                        autoFormat="name"
                        showValidation
                        isValid={!fieldState.error && !!field.value}
                        error={fieldState.error?.message}
                        helpText="Enter the donor's first name"
                        data-testid="input-first-name"
                        autoComplete="given-name"
                      />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <EnhancedInput
                        {...field}
                        id="lastName"
                        label="Last Name"
                        required
                        autoFormat="name"
                        showValidation
                        isValid={!fieldState.error && !!field.value}
                        error={fieldState.error?.message}
                        helpText="Enter the donor's last name"
                        data-testid="input-last-name"
                        autoComplete="family-name"
                      />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field, fieldState }) => {
                    const emailValidation = field.value ? validateEmail(field.value) : { isValid: true };
                    return (
                      <FormItem>
                        <EnhancedInput
                          {...field}
                          value={field.value || ""}
                          id="email"
                          type="email"
                          label="Email Address"
                          autoFormat="email"
                          showValidation
                          isValid={emailValidation.isValid && !fieldState.error}
                          error={fieldState.error?.message || (!emailValidation.isValid ? emailValidation.error : undefined)}
                          suggestion={emailSuggestion || undefined}
                          onSuggestionAccept={acceptEmailSuggestion}
                          helpText="Primary email for communication"
                          data-testid="input-email"
                          autoComplete="email"
                          onChange={(e) => {
                            field.onChange(e);
                            handleEmailChange(e.target.value);
                          }}
                        />
                      </FormItem>
                    );
                  }}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <EnhancedInput
                        {...field}
                        value={field.value || ""}
                        id="phone"
                        type="tel"
                        label="Phone Number"
                        autoFormat="phone"
                        showValidation
                        isValid={!fieldState.error && (field.value ? field.value.length >= 10 : true)}
                        error={fieldState.error?.message}
                        helpText="Phone number for contact"
                        data-testid="input-phone"
                        autoComplete="tel"
                      />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Address Information Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-school-blue-900 dark:text-white">
                <MapPin className="w-5 h-5" />
                Address Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <EnhancedTextarea
                      {...field}
                      value={field.value || ""}
                      id="address"
                      label="Street Address"
                      showValidation
                      isValid={!fieldState.error}
                      error={fieldState.error?.message}
                      helpText="Full mailing address"
                      maxLength={500}
                      showCharCount
                      rows={3}
                      data-testid="input-address"
                      autoComplete="street-address"
                    />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <EnhancedInput
                        {...field}
                        value={field.value || ""}
                        id="city"
                        label="City"
                        autoFormat="name"
                        showValidation
                        isValid={!fieldState.error}
                        error={fieldState.error?.message}
                        helpText="City name"
                        data-testid="input-city"
                        autoComplete="address-level2"
                      />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <EnhancedInput
                        {...field}
                        value={field.value || ""}
                        id="state"
                        label="State"
                        showValidation
                        isValid={!fieldState.error}
                        error={fieldState.error?.message}
                        helpText="State or province"
                        data-testid="input-state"
                        autoComplete="address-level1"
                      />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <EnhancedInput
                        {...field}
                        value={field.value || ""}
                        id="zipCode"
                        label="ZIP Code"
                        autoFormat="zip"
                        showValidation
                        isValid={!fieldState.error}
                        error={fieldState.error?.message}
                        helpText="Postal code"
                        data-testid="input-zip"
                        autoComplete="postal-code"
                      />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="country"
                render={({ field, fieldState }) => (
                  <FormItem className="max-w-md">
                    <EnhancedInput
                      {...field}
                      value={field.value || ""}
                      id="country"
                      label="Country"
                      showValidation
                      isValid={!fieldState.error}
                      error={fieldState.error?.message}
                      helpText="Country of residence"
                      data-testid="input-country"
                      autoComplete="country-name"
                    />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* School Information Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-school-blue-900 dark:text-white">
                <GraduationCap className="w-5 h-5" />
                School in the Square Connection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="donorType"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <EnhancedSelect
                        {...field}
                        id="donorType"
                        label="Donor Type"
                        required
                        showValidation
                        isValid={!fieldState.error && !!field.value}
                        error={fieldState.error?.message}
                        helpText="Relationship to School in the Square"
                        options={DONOR_TYPE_OPTIONS}
                        value={field.value || ""}
                        onValueChange={field.onChange}
                        data-testid="select-donor-type"
                      />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="studentName"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <EnhancedInput
                        {...field}
                        value={field.value || ""}
                        id="studentName"
                        label="Student Name"
                        autoFormat="name"
                        showValidation
                        isValid={!fieldState.error}
                        error={fieldState.error?.message}
                        helpText="Name of associated student (if applicable)"
                        data-testid="input-student-name"
                      />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="gradeLevel"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <EnhancedInput
                        {...field}
                        value={field.value || ""}
                        id="gradeLevel"
                        label="Grade Level"
                        showValidation
                        isValid={!fieldState.error}
                        error={fieldState.error?.message}
                        helpText="Current grade (e.g., K, 1, 2, 3...)"
                        placeholder="e.g., K, 1, 2, 3..."
                        data-testid="input-grade-level"
                      />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="alumniYear"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <EnhancedInput
                        {...field}
                        id="alumniYear"
                        type="number"
                        label="Alumni Year"
                        showValidation
                        isValid={!fieldState.error}
                        error={fieldState.error?.message}
                        helpText="Graduation year (if alumni)"
                        min={1990}
                        max={new Date().getFullYear() + 10}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        data-testid="input-alumni-year"
                      />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Classification Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-school-blue-900 dark:text-white">
                <Heart className="w-5 h-5" />
                Donor Classification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="engagementLevel"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <EnhancedSelect
                        {...field}
                        id="engagementLevel"
                        label="Engagement Level"
                        showValidation
                        isValid={!fieldState.error && !!field.value}
                        error={fieldState.error?.message}
                        helpText="Current relationship status"
                        options={ENGAGEMENT_LEVEL_OPTIONS}
                        value={field.value || ""}
                        onValueChange={field.onChange}
                        data-testid="select-engagement-level"
                      />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="giftSizeTier"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <EnhancedSelect
                        {...field}
                        id="giftSizeTier"
                        label="Gift Size Tier"
                        showValidation
                        isValid={!fieldState.error && !!field.value}
                        error={fieldState.error?.message}
                        helpText="Expected giving capacity"
                        options={GIFT_SIZE_TIER_OPTIONS}
                        value={field.value || ""}
                        onValueChange={field.onChange}
                        data-testid="select-gift-size-tier"
                      />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="preferredContactMethod"
                render={({ field, fieldState }) => (
                  <FormItem className="max-w-md">
                    <EnhancedSelect
                      {...field}
                      id="preferredContactMethod"
                      label="Preferred Contact Method"
                      showValidation
                      isValid={!fieldState.error && !!field.value}
                      error={fieldState.error?.message}
                      helpText="How they prefer to be contacted"
                      options={CONTACT_METHOD_OPTIONS}
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      data-testid="select-contact-method"
                    />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Communication Preferences Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-school-blue-900 dark:text-white">
                <Mail className="w-5 h-5" />
                Communication Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="emailOptIn"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border border-school-blue-200 dark:border-school-blue-700 rounded-lg hover:bg-school-blue-50 dark:hover:bg-school-blue-800 transition-colors">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-email-opt-in"
                          className="mt-1"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none flex-1">
                        <FormLabel className="text-base font-medium cursor-pointer">
                          Email Communications
                        </FormLabel>
                        <p className="text-sm text-school-blue-600 dark:text-school-blue-400">
                          Receive newsletters, donation receipts, and campaign updates via email
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phoneOptIn"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border border-school-blue-200 dark:border-school-blue-700 rounded-lg hover:bg-school-blue-50 dark:hover:bg-school-blue-800 transition-colors">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-phone-opt-in"
                          className="mt-1"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none flex-1">
                        <FormLabel className="text-base font-medium cursor-pointer">
                          Phone Communications
                        </FormLabel>
                        <p className="text-sm text-school-blue-600 dark:text-school-blue-400">
                          Allow phone calls for personal outreach and thank you calls
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="mailOptIn"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border border-school-blue-200 dark:border-school-blue-700 rounded-lg hover:bg-school-blue-50 dark:hover:bg-school-blue-800 transition-colors">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-mail-opt-in"
                          className="mt-1"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none flex-1">
                        <FormLabel className="text-base font-medium cursor-pointer">
                          Physical Mail Communications
                        </FormLabel>
                        <p className="text-sm text-school-blue-600 dark:text-school-blue-400">
                          Receive printed newsletters, invitations, and thank you notes
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-school-blue-900 dark:text-white">
                <MessageSquare className="w-5 h-5" />
                Additional Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <EnhancedTextarea
                      {...field}
                      value={field.value || ""}
                      id="notes"
                      label="Notes"
                      showValidation
                      isValid={!fieldState.error}
                      error={fieldState.error?.message}
                      helpText="Additional information, preferences, or important details about this donor"
                      maxLength={1000}
                      showCharCount
                      rows={4}
                      placeholder="Enter any additional notes about this donor..."
                      data-testid="input-notes"
                    />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Submit Section with Sticky Mobile Behavior */}
          <div className="sticky bottom-0 bg-white dark:bg-school-blue-900 border-t border-school-blue-200 dark:border-school-blue-700 p-4 -mx-4 sm:mx-0 sm:relative sm:bottom-auto sm:bg-transparent sm:dark:bg-transparent sm:border-t-0 sm:p-0">
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => onSuccess?.()}
                disabled={isLoading}
                data-testid="button-cancel"
                className="min-h-[48px] sm:min-h-[40px]"
              >
                Cancel
              </Button>
              
              {!isEditing && hasDraft && (
                <Button 
                  type="button" 
                  variant="ghost"
                  onClick={clearDraft}
                  disabled={isLoading}
                  className="min-h-[48px] sm:min-h-[40px]"
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Clear Draft
                </Button>
              )}
              
              <Button 
                type="submit" 
                disabled={isLoading || (!form.formState.isValid && form.formState.isSubmitted)}
                data-testid="button-save-donor"
                className="min-h-[48px] sm:min-h-[40px] bg-school-blue-600 hover:bg-school-blue-700 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isEditing ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {isEditing ? "Update Donor" : "Create Donor"}
                  </>
                )}
              </Button>
            </div>
            
            {/* Form validation summary */}
            {form.formState.isSubmitted && !form.formState.isValid && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Please fix the errors above before submitting
                </p>
              </div>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}