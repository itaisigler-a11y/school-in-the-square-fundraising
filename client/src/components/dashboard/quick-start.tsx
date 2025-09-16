import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DonorForm } from "@/components/donors/donor-form";
import { ImportModal } from "@/components/import/import-modal";
import { useAuth } from "@/lib/auth-context";
import { useUIMode } from "@/lib/ui-mode-context";
import { CheckCircle, UserPlus, Upload, Users, X, Mail, Megaphone } from "lucide-react";

const QUICKSTART_DISMISSED_KEY = 'fundraising-quickstart-dismissed';
const QUICKSTART_LAST_SHOWN_KEY = 'fundraising-quickstart-last-shown';

interface QuickStartProps {
  donorCount?: number;
}

export function QuickStart({ donorCount = 0 }: QuickStartProps) {
  const { user, needsProfileCompletion } = useAuth();
  const { isSimpleMode } = useUIMode();
  const [, setLocation] = useLocation();
  
  const [isDismissed, setIsDismissed] = useState(() => {
    const dismissed = localStorage.getItem(QUICKSTART_DISMISSED_KEY);
    const lastShown = localStorage.getItem(QUICKSTART_LAST_SHOWN_KEY);
    
    // Show again if dismissed but it's been 24+ hours and user still has no donors
    if (dismissed && lastShown) {
      const lastShownTime = parseInt(lastShown);
      const now = Date.now();
      const hoursAgo = (now - lastShownTime) / (1000 * 60 * 60);
      
      // Show again if 24+ hours passed and still no donors
      if (hoursAgo >= 24 && donorCount === 0) {
        return false;
      }
    }
    
    return dismissed === 'true';
  });

  const [isDonorFormOpen, setIsDonorFormOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Don't show if user has 3+ donors (they understand the system)
  const shouldShow = !isDismissed && donorCount < 3;

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(QUICKSTART_DISMISSED_KEY, 'true');
    localStorage.setItem(QUICKSTART_LAST_SHOWN_KEY, Date.now().toString());
  };

  const handleAddDonor = () => {
    setIsDonorFormOpen(true);
  };

  const handleImportData = () => {
    setIsImportModalOpen(true);
  };

  const handleViewDonors = () => {
    setLocation('/donors');
  };

  const handleCompleteProfile = () => {
    // This would typically open a profile completion modal or navigate to profile page
    // For now, we'll just show a toast or placeholder action
    setLocation('/dashboard'); // Placeholder - would navigate to profile completion
  };

  if (!shouldShow || !user) {
    return null;
  }

  const steps = [
    {
      id: 'profile',
      title: 'Complete Your Profile',
      description: 'Set up your name and role to personalize your experience',
      completed: !needsProfileCompletion,
      action: handleCompleteProfile,
      buttonText: 'Complete Profile',
      icon: <UserPlus className="w-5 h-5" />,
      show: needsProfileCompletion
    },
    {
      id: 'first-donor',
      title: 'Add Your First Donor',
      description: 'Start building your donor database with individual profiles',
      completed: donorCount > 0,
      action: handleAddDonor,
      buttonText: 'Add Donor',
      icon: <UserPlus className="w-5 h-5" />,
      show: true
    },
    {
      id: 'import-data',
      title: 'Import Existing Data',
      description: 'Upload CSV or Excel files to quickly add multiple donors',
      completed: donorCount >= 5, // Assume if they have 5+ donors, they might have imported
      action: handleImportData,
      buttonText: 'Import Data',
      icon: <Upload className="w-5 h-5" />,
      show: true
    },
    {
      id: 'send-email',
      title: 'Send Communication',
      description: 'Email your donors and track engagement',
      completed: false,
      action: () => setLocation('/communications'),
      buttonText: 'Send Email',
      icon: <Mail className="w-5 h-5" />,
      show: donorCount > 0
    },
    {
      id: 'create-campaign',
      title: 'Create Campaign',
      description: 'Start a new fundraising campaign',
      completed: false,
      action: () => setLocation('/campaigns'),
      buttonText: 'New Campaign',
      icon: <Megaphone className="w-5 h-5" />,
      show: donorCount > 0
    },
    {
      id: 'view-donors',
      title: 'Explore Your Donor List',
      description: 'Review, search, and organize your donor information',
      completed: donorCount > 0,
      action: handleViewDonors,
      buttonText: 'View Donors',
      icon: <Users className="w-5 h-5" />,
      show: donorCount > 0
    }
  ];

  const visibleSteps = steps.filter(step => step.show);
  const completedSteps = visibleSteps.filter(step => step.completed).length;

  return (
    <>
      <Card className="border-l-4 border-l-primary bg-gradient-to-r from-background to-muted/20" data-testid="quick-start-panel">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  Welcome to School in the Square Fundraising
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Get started in your first 2 minutes • {completedSteps}/{visibleSteps.length} completed
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground"
              data-testid="button-dismiss-quickstart"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-muted/30 rounded-full h-2 mt-2">
            <div 
              className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(completedSteps / visibleSteps.length) * 100}%` }}
            />
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {visibleSteps.map((step, index) => (
              <div
                key={step.id}
                className={`p-4 rounded-lg border transition-all duration-200 ${
                  step.completed 
                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                    : 'bg-background border-border hover:border-primary/50'
                }`}
                data-testid={`step-${step.id}`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    step.completed 
                      ? 'bg-green-600 text-white' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {step.completed ? <CheckCircle className="w-4 h-4" /> : index + 1}
                  </div>
                  <div className={`${step.completed ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {step.icon}
                  </div>
                </div>
                
                <div className="mb-3">
                  <h4 className={`font-medium text-sm mb-1 ${
                    step.completed ? 'text-green-900 dark:text-green-100' : 'text-foreground'
                  }`}>
                    {step.title}
                  </h4>
                  <p className={`text-xs leading-tight ${
                    step.completed 
                      ? 'text-green-700 dark:text-green-300' 
                      : 'text-muted-foreground'
                  }`}>
                    {step.description}
                  </p>
                </div>
                
                {!step.completed && (
                  <Button
                    size="sm"
                    variant={index === 0 ? "default" : "outline"}
                    className="w-full text-xs"
                    onClick={step.action}
                    data-testid={`button-${step.id}`}
                  >
                    {step.buttonText}
                  </Button>
                )}
                
                {step.completed && (
                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                    <CheckCircle className="w-3 h-3" />
                    Completed
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Summary Message */}
          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <i className="fas fa-lightbulb text-accent text-sm"></i>
              </div>
              <div>
                <h5 className="font-medium text-foreground text-sm mb-1">Quick Tip</h5>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {donorCount === 0 
                    ? "Start by adding a single donor to see how the system works, then import your full list to save time."
                    : donorCount < 5 
                    ? "Great start! Consider importing a CSV file if you have more donors to add quickly."
                    : "You're all set! Explore the Analytics and Campaign features to maximize your fundraising potential."
                  }
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Donor Modal */}
      <Dialog open={isDonorFormOpen} onOpenChange={setIsDonorFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Your First Donor</DialogTitle>
            <DialogDescription>
              Create a donor profile with contact information and school connections.
            </DialogDescription>
          </DialogHeader>
          <DonorForm 
            onSuccess={() => {
              setIsDonorFormOpen(false);
              // Force a refresh of the dashboard metrics to update donor count
              window.location.reload();
            }} 
          />
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <ImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onSuccess={() => {
          setIsImportModalOpen(false);
          // Force a refresh of the dashboard metrics to update donor count
          window.location.reload();
        }}
      />
    </>
  );
}