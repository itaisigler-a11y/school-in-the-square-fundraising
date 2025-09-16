import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Profile completion schema
const profileCompletionSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  jobTitle: z.string().min(1, 'Job title is required').max(100, 'Job title too long'),
});

type ProfileCompletionData = z.infer<typeof profileCompletionSchema>;

interface ProfileCompletionModalProps {
  isOpen: boolean;
  user: {
    firstName?: string;
    lastName?: string;
    jobTitle?: string;
    email?: string;
  };
}

export function ProfileCompletionModal({ isOpen, user }: ProfileCompletionModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProfileCompletionData>({
    resolver: zodResolver(profileCompletionSchema),
    defaultValues: {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      jobTitle: user.jobTitle || '',
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileCompletionData) =>
      apiRequest('PATCH', '/api/auth/user/profile', data),
    onSuccess: () => {
      // Invalidate user query to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: 'Profile completed!',
        description: 'Welcome to the fundraising platform.',
      });
    },
    onError: (error: any) => {
      console.error('Profile completion error:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to complete profile. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ProfileCompletionData) => {
    updateProfileMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} modal={true}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-profile-completion">
        <DialogHeader>
          <DialogTitle data-testid="text-profile-title">Complete Your Profile</DialogTitle>
          <DialogDescription data-testid="text-profile-description">
            Please provide your name and job title to get started with the fundraising platform.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Enter your first name"
                      data-testid="input-first-name"
                    />
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
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Enter your last name"
                      data-testid="input-last-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="jobTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="e.g., Development Officer, Principal, Teacher"
                      data-testid="input-job-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                disabled={updateProfileMutation.isPending}
                data-testid="button-complete-profile"
              >
                {updateProfileMutation.isPending ? 'Saving...' : 'Complete Profile'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}