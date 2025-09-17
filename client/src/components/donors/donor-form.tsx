import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertDonorSchema, type InsertDonor, type Donor } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface DonorFormProps {
  onSuccess?: () => void;
  donor?: Donor;
  isEditing?: boolean;
}

export function DonorForm({ onSuccess, donor, isEditing = false }: DonorFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertDonor>({
    resolver: zodResolver(insertDonorSchema),
    defaultValues: {
      firstName: donor?.firstName || "",
      lastName: donor?.lastName || "",
      email: donor?.email || "",
      phone: donor?.phone || "",
      address: donor?.address || "",
      city: donor?.city || "",
      state: donor?.state || "",
      zipCode: donor?.zipCode || "",
      country: donor?.country || "USA",
      donorType: donor?.donorType || "community",
      studentName: donor?.studentName || "",
      gradeLevel: donor?.gradeLevel || "",
      alumniYear: donor?.alumniYear || undefined,
      graduationYear: donor?.graduationYear || undefined,
      engagementLevel: donor?.engagementLevel || "new",
      giftSizeTier: donor?.giftSizeTier || "grassroots",
      emailOptIn: donor?.emailOptIn ?? true,
      phoneOptIn: donor?.phoneOptIn ?? false,
      mailOptIn: donor?.mailOptIn ?? true,
      preferredContactMethod: donor?.preferredContactMethod || "email",
      notes: donor?.notes || "",
      tags: donor?.tags || [],
      customFields: donor?.customFields || {},
      isActive: donor?.isActive ?? true,
    },
  });

  const createDonorMutation = useMutation({
    mutationFn: async (data: InsertDonor) => {
      const response = await apiRequest("POST", "/api/donors", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Donor created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/donors"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      onSuccess?.();
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
        description: error.message || "Failed to create donor",
        variant: "destructive",
      });
    },
  });

  const updateDonorMutation = useMutation({
    mutationFn: async (data: InsertDonor) => {
      if (!donor?.id) throw new Error("Donor ID is required for updates");
      const response = await apiRequest("PUT", `/api/donors/${donor.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Donor updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/donors"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      onSuccess?.();
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
        description: error.message || "Failed to update donor",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertDonor) => {
    if (isEditing) {
      updateDonorMutation.mutate(data);
    } else {
      createDonorMutation.mutate(data);
    }
  };

  const isLoading = createDonorMutation.isPending || updateDonorMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name *</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-first-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name *</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-last-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} value={field.value || ""} data-testid="input-email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} data-testid="input-phone" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Address Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Address</h3>
          
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Street Address</FormLabel>
                <FormControl>
                  <Textarea {...field} value={field.value || ""} data-testid="input-address" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} data-testid="input-city" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} data-testid="input-state" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="zipCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ZIP Code</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} data-testid="input-zip" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* School-Specific Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">School Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="donorType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Donor Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-donor-type">
                        <SelectValue placeholder="Select donor type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="alumni">Alumni</SelectItem>
                      <SelectItem value="community">Community</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="board">Board</SelectItem>
                      <SelectItem value="foundation">Foundation</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="studentName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student Name</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} data-testid="input-student-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="gradeLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grade Level</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} placeholder="e.g., K, 1, 2, 3..." data-testid="input-grade-level" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="alumniYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alumni Year</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      value={field.value || ""} 
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      data-testid="input-alumni-year" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Engagement and Preferences */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Donor Classification</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="engagementLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Engagement Level</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-engagement-level">
                        <SelectValue placeholder="Select engagement level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="engaged">Engaged</SelectItem>
                      <SelectItem value="at_risk">At Risk</SelectItem>
                      <SelectItem value="lapsed">Lapsed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="giftSizeTier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gift Size Tier</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-gift-size-tier">
                        <SelectValue placeholder="Select gift size tier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="grassroots">Grassroots</SelectItem>
                      <SelectItem value="mid_level">Mid-Level</SelectItem>
                      <SelectItem value="major">Major</SelectItem>
                      <SelectItem value="principal">Principal</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="preferredContactMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred Contact Method</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger data-testid="select-contact-method">
                      <SelectValue placeholder="Select preferred contact method" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="mail">Mail</SelectItem>
                    <SelectItem value="text">Text Message</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Communication Preferences */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Communication Preferences</h3>
          
          <div className="space-y-3">
            <FormField
              control={form.control}
              name="emailOptIn"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-email-opt-in"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Email communications</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phoneOptIn"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-phone-opt-in"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Phone communications</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="mailOptIn"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-mail-opt-in"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Mail communications</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea {...field} value={field.value || ""} data-testid="input-notes" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => onSuccess?.()}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading}
            data-testid="button-save-donor"
          >
            {isLoading ? "Saving..." : isEditing ? "Update Donor" : "Create Donor"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
