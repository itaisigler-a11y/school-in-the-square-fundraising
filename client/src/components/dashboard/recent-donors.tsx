import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLocation } from "wouter";
import { Mail, Heart, Users, UserPlus } from "lucide-react";

interface RecentDonorsProps {
  donors: Array<{
    id: string;
    amount: string;
    createdAt: string;
    donor: {
      firstName: string;
      lastName: string;
      donorType: string;
      gradeLevel?: string;
      alumniYear?: number;
    };
  }>;
}

export function RecentDonors({ donors }: RecentDonorsProps) {
  const [, setLocation] = useLocation();
  
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getDonorTypeDisplay = (donor: any) => {
    switch (donor.donorType) {
      case 'parent':
        return `Parent${donor.gradeLevel ? ` • Grade ${donor.gradeLevel}` : ''}`;
      case 'alumni':
        return `Alumni${donor.alumniYear ? ` • Class of ${donor.alumniYear}` : ''}`;
      case 'community':
        return 'Community Supporter';
      case 'staff':
        return 'Staff Member';
      case 'board':
        return 'Board Member';
      default:
        return 'Supporter';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Less than an hour ago';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  return (
    <Card data-testid="recent-donors" className="border-border hover:border-primary/50 transition-all duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Recent Supporters</CardTitle>
              <p className="text-sm text-muted-foreground">Your amazing donor community</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setLocation('/donors')}
            data-testid="button-view-all-donors"
            className="hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <Users className="w-4 h-4 mr-2" />
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {donors.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-10 h-10" />
              </div>
              <h3 className="font-medium text-foreground mb-2">No recent donations yet</h3>
              <p className="text-sm mb-6 max-w-xs mx-auto">
                Your first donations will appear here. Get started by adding donors or sending your first campaign.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  size="sm" 
                  onClick={() => setLocation('/donors')}
                  data-testid="button-add-first-donor-empty"
                  className="text-sm"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add First Donor
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setLocation('/communications')}
                  data-testid="button-send-first-email-empty"
                  className="text-sm"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </Button>
              </div>
            </div>
          ) : (
            <>
              {donors.map((donation) => (
                <div
                  key={donation.id}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-background to-muted/30 rounded-xl border border-border hover:border-primary/50 transition-all duration-200 hover:shadow-sm group cursor-pointer"
                  onClick={() => setLocation(`/donors/${donation.donor.id || donation.id}`)}
                  data-testid={`recent-donor-${donation.id}`}
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12 ring-2 ring-primary/20">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-sm font-semibold">
                        {getInitials(donation.donor.firstName, donation.donor.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {donation.donor.firstName} {donation.donor.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {getDonorTypeDisplay(donation.donor)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-primary">
                      ${Number(donation.amount).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimeAgo(donation.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
              
              {/* Action Footer for Non-Empty State */}
              <div className="mt-6 pt-4 border-t border-border">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setLocation('/communications')}
                    data-testid="button-send-thank-you"
                    className="flex-1 text-sm hover:bg-primary hover:text-primary-foreground transition-all"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Send Thank You Email
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setLocation('/donors')}
                    data-testid="button-add-more-donors"
                    className="flex-1 text-sm hover:bg-accent hover:text-accent-foreground transition-all"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add More Donors
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
