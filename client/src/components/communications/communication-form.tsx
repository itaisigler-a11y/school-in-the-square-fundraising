import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { insertCommunicationSchema, type InsertCommunication, type Communication } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Loader2 } from "lucide-react";

interface CommunicationFormProps {
  onSuccess?: () => void;
  communication?: Communication;
  isEditing?: boolean;
}

export function CommunicationForm({ onSuccess, communication, isEditing = false }: CommunicationFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertCommunication>({
    resolver: zodResolver(insertCommunicationSchema),
    defaultValues: {
      donorId: communication?.donorId || undefined,
      segmentId: communication?.segmentId || undefined,
      type: communication?.type || "email",
      subject: communication?.subject || "",
      content: communication?.content || "",
      status: communication?.status || "draft",
    },
  });

  // Fetch donors for the dropdown
  const { data: donorsData } = useQuery({
    queryKey: ["/api/donors", { limit: 100 }],
  });

  // Fetch segments for the dropdown  
  const { data: segmentsData } = useQuery({
    queryKey: ["/api/segments"],
  });

  const createCommunicationMutation = useMutation({
    mutationFn: async (data: InsertCommunication) => {
      const response = await apiRequest("POST", "/api/communications", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Communication created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/communications"], exact: false });
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
        description: error.message || "Failed to create communication",
        variant: "destructive",
      });
    },
  });

  const updateCommunicationMutation = useMutation({
    mutationFn: async (data: InsertCommunication) => {
      if (!communication?.id) throw new Error("Communication ID is required for updates");
      const response = await apiRequest("PUT", `/api/communications/${communication.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Communication updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/communications"], exact: false });
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
        description: error.message || "Failed to update communication",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertCommunication) => {
    if (isEditing) {
      updateCommunicationMutation.mutate(data);
    } else {
      createCommunicationMutation.mutate(data);
    }
  };

  const isLoading = createCommunicationMutation.isPending || updateCommunicationMutation.isPending;
  const donors = (donorsData as any)?.donors || [];
  const segments = (segmentsData as any) || [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Communication Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-communication-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="mail">Mail</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-communication-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="opened">Opened</SelectItem>
                    <SelectItem value="clicked">Clicked</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="donorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Donor (Optional)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                  <FormControl>
                    <SelectTrigger data-testid="select-donor">
                      <SelectValue placeholder="Select donor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">No specific donor</SelectItem>
                    {donors.map((donor: any) => (
                      <SelectItem key={donor.id} value={donor.id}>
                        {donor.firstName} {donor.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="segmentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Segment (Optional)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                  <FormControl>
                    <SelectTrigger data-testid="select-segment">
                      <SelectValue placeholder="Select segment" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">No segment</SelectItem>
                    {segments.map((segment: any) => (
                      <SelectItem key={segment.id} value={segment.id}>
                        {segment.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Communication subject..."
                  data-testid="input-subject"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Communication content..."
                  className="min-h-[150px]"
                  data-testid="textarea-content"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-3">
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
            data-testid="button-submit"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Update" : "Create"} Communication
          </Button>
        </div>
      </form>
    </Form>
  );
}