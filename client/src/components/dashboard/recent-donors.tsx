import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
    <Card data-testid="recent-donors">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Donors</CardTitle>
          <Button variant="link" size="sm" data-testid="button-view-all-donors">
            View all
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {donors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <i className="fas fa-users text-2xl mb-2 block"></i>
              <p>No recent donations</p>
            </div>
          ) : (
            donors.map((donation) => (
              <div
                key={donation.id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
                data-testid={`recent-donor-${donation.id}`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                      {getInitials(donation.donor.firstName, donation.donor.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">
                      {donation.donor.firstName} {donation.donor.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {getDonorTypeDisplay(donation.donor)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">
                    ${Number(donation.amount).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTimeAgo(donation.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
