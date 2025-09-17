import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DonorForm } from "@/components/donors/donor-form";
import { ImportModal } from "@/components/import/import-modal";
import { useAuth } from "@/lib/auth-context";
import { UserPlus, Upload, Users, X, Mail } from "lucide-react";

const QUICKSTART_DISMISSED_KEY = 'fundraising-quickstart-dismissed';

interface QuickStartProps {
  donorCount?: number;
}

export function QuickStart({ donorCount = 0 }: QuickStartProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem(QUICKSTART_DISMISSED_KEY) === 'true';
  });

  const [isDonorFormOpen, setIsDonorFormOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Show for new users with no donors
  const shouldShow = !isDismissed && donorCount === 0 && user;

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(QUICKSTART_DISMISSED_KEY, 'true');
  };

  const handleAddDonor = () => {
    setIsDonorFormOpen(true);
  };

  const handleImportData = () => {
    setIsImportModalOpen(true);
  };

  if (!shouldShow) {
    return null;
  }

  return (
    <>
      <Card className="border-school-blue-200 bg-school-blue-50" data-testid="quick-start-panel">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl text-school-blue-900">
                Welcome to Your Fundraising Platform
              </CardTitle>
              <p className="text-school-blue-600 mt-1">
                Get started by adding your first donor or importing your existing donor list
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-school-blue-500 hover:text-school-blue-700 hover:bg-school-blue-100"
              data-testid="button-dismiss-quickstart"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Add First Donor */}
            <div className="p-6 bg-white rounded-lg border border-school-blue-200 hover:border-school-blue-300 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-school-blue-100 rounded-lg flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-school-blue-600" />
                </div>
                <h3 className="font-semibold text-school-blue-900">Add a Donor</h3>
              </div>
              <p className="text-school-blue-600 text-sm mb-4">
                Start by adding your first donor to see how the system works
              </p>
              <Button
                onClick={handleAddDonor}
                className="w-full bg-school-blue-500 hover:bg-school-blue-600 text-white"
                data-testid="button-add-donor"
              >
                Add Donor
              </Button>
            </div>

            {/* Import Data */}
            <div className="p-6 bg-white rounded-lg border border-school-blue-200 hover:border-school-blue-300 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-school-blue-100 rounded-lg flex items-center justify-center">
                  <Upload className="w-5 h-5 text-school-blue-600" />
                </div>
                <h3 className="font-semibold text-school-blue-900">Import Data</h3>
              </div>
              <p className="text-school-blue-600 text-sm mb-4">
                Upload a CSV file to import multiple donors at once
              </p>
              <Button
                onClick={handleImportData}
                variant="outline"
                className="w-full border-school-blue-200 text-school-blue-600 hover:bg-school-blue-50"
                data-testid="button-import-data"
              >
                Import CSV
              </Button>
            </div>

            {/* Explore Communications */}
            <div className="p-6 bg-white rounded-lg border border-school-blue-200 hover:border-school-blue-300 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-school-blue-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-school-blue-600" />
                </div>
                <h3 className="font-semibold text-school-blue-900">Communications</h3>
              </div>
              <p className="text-school-blue-600 text-sm mb-4">
                Set up email templates and communication workflows
              </p>
              <Button
                onClick={() => setLocation('/communications')}
                variant="outline"
                className="w-full border-school-blue-200 text-school-blue-600 hover:bg-school-blue-50"
                data-testid="button-communications"
              >
                Explore
              </Button>
            </div>
          </div>
          
          {/* Help Section */}
          <div className="mt-6 p-4 bg-white rounded-lg border border-school-blue-200">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-school-gold-100 flex items-center justify-center flex-shrink-0">
                <i className="fas fa-lightbulb text-school-gold-600 text-sm"></i>
              </div>
              <div>
                <h4 className="font-medium text-school-blue-900 mb-1">Getting Started</h4>
                <p className="text-school-blue-600 text-sm">
                  New to fundraising platforms? Start by adding a single donor to familiarize yourself with the system, 
                  then import your full donor list to save time. You can always access this panel again from the Dashboard.
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
            <DialogTitle>Add New Donor</DialogTitle>
            <DialogDescription>
              Create a donor profile with contact information and school connections.
            </DialogDescription>
          </DialogHeader>
          <DonorForm 
            onSuccess={() => {
              setIsDonorFormOpen(false);
              // Refresh to update donor count
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
          // Refresh to update donor count
          window.location.reload();
        }}
      />
    </>
  );
}