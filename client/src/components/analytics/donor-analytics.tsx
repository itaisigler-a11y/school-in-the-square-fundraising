import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface DonorAnalyticsProps {
  period: string;
  comparison: string;
}

export function DonorAnalytics({ period, comparison }: DonorAnalyticsProps) {
  const { data: donorMetrics, isLoading } = useQuery({
    queryKey: ["/api/analytics/donors", { period, comparison }],
  });

  const { data: topDonors } = useQuery({
    queryKey: ["/api/analytics/top-donors", { period }],
  });

  const { data: cohortAnalysis } = useQuery({
    queryKey: ["/api/analytics/cohort", { period }],
  });

  // Mock data for demonstration
  const mockDonorStats = [
    { metric: "New Donors", value: 47, change: 12, icon: Users, color: "blue" },
    { metric: "Returning Donors", value: 132, change: -3, icon: Users, color: "green" },
    { metric: "Avg. Lifetime Value", value: "$2,450", change: 8, icon: DollarSign, color: "purple" },
    { metric: "Monthly Retention", value: "68%", change: 5, icon: TrendingUp, color: "orange" },
  ];

  const mockTopDonors = [
    { name: "Sarah Johnson", email: "sarah@email.com", totalGiven: 15500, donationCount: 8, type: "Alumni" },
    { name: "Michael Chen", email: "michael@email.com", totalGiven: 12200, donationCount: 12, type: "Parent" },
    { name: "Emily Rodriguez", email: "emily@email.com", totalGiven: 8900, donationCount: 6, type: "Board" },
    { name: "David Wilson", email: "david@email.com", totalGiven: 7600, donationCount: 4, type: "Staff" },
    { name: "Lisa Thompson", email: "lisa@email.com", totalGiven: 6400, donationCount: 9, type: "Community" },
  ];

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-600 bg-green-50";
    if (change < 0) return "text-red-600 bg-red-50";
    return "text-gray-600 bg-gray-50";
  };

  const getIconColor = (color: string) => {
    switch (color) {
      case "blue": return "text-blue-600 bg-blue-100";
      case "green": return "text-green-600 bg-green-100";
      case "purple": return "text-purple-600 bg-purple-100";
      case "orange": return "text-orange-600 bg-orange-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="space-y-6">
      {/* Donor Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))
        ) : (
          mockDonorStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} data-testid={`donor-stat-${index}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-muted-foreground">{stat.metric}</h3>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getIconColor(stat.color)}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <Badge className={getChangeColor(stat.change)}>
                      {stat.change > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                      {Math.abs(stat.change)}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Donors */}
        <Card>
          <CardHeader>
            <CardTitle>Top Donors ({period})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Donor</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Total Given</TableHead>
                    <TableHead className="text-right">Gifts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockTopDonors.map((donor, index) => (
                    <TableRow key={index} data-testid={`top-donor-${index}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{donor.name}</p>
                          <p className="text-sm text-muted-foreground">{donor.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{donor.type}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${donor.totalGiven.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {donor.donationCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Donor Acquisition */}
        <Card>
          <CardHeader>
            <CardTitle>Donor Acquisition Channels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { channel: "Website", count: 45, percentage: 38 },
                { channel: "Email Campaign", count: 32, percentage: 27 },
                { channel: "Events", count: 28, percentage: 24 },
                { channel: "Referrals", count: 13, percentage: 11 },
              ].map((channel, index) => (
                <div key={index} className="flex items-center justify-between" data-testid={`acquisition-${index}`}>
                  <div>
                    <p className="font-medium">{channel.channel}</p>
                    <p className="text-sm text-muted-foreground">{channel.count} new donors</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${channel.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-10">{channel.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Donor Retention Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Donor Retention Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-700">72%</p>
              <p className="text-sm text-blue-600">First Year Retention</p>
              <p className="text-xs text-muted-foreground mt-1">+5% from last period</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-3xl font-bold text-green-700">58%</p>
              <p className="text-sm text-green-600">Second Year Retention</p>
              <p className="text-xs text-muted-foreground mt-1">+2% from last period</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-3xl font-bold text-purple-700">45%</p>
              <p className="text-sm text-purple-600">Long-term Retention</p>
              <p className="text-xs text-muted-foreground mt-1">-1% from last period</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}