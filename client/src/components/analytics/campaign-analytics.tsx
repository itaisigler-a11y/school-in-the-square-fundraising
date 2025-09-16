import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, TrendingUp, TrendingDown, Calendar, DollarSign } from "lucide-react";

interface CampaignAnalyticsProps {
  period: string;
  comparison: string;
}

export function CampaignAnalytics({ period, comparison }: CampaignAnalyticsProps) {
  const { data: campaignMetrics, isLoading } = useQuery({
    queryKey: ["/api/analytics/campaigns", { period, comparison }],
  });

  // Mock data for demonstration
  const mockCampaigns = [
    {
      name: "Annual Fund 2024",
      goal: 500000,
      raised: 387500,
      donors: 234,
      status: "active",
      roi: 425,
      startDate: "2024-01-01",
      endDate: "2024-12-31"
    },
    {
      name: "Spring Gala",
      goal: 150000,
      raised: 162000,
      donors: 89,
      status: "completed",
      roi: 540,
      startDate: "2024-03-15",
      endDate: "2024-03-15"
    },
    {
      name: "Capital Campaign - New Library",
      goal: 2000000,
      raised: 1245000,
      donors: 156,
      status: "active",
      roi: 312,
      startDate: "2023-09-01",
      endDate: "2025-08-31"
    },
    {
      name: "Holiday Drive",
      goal: 75000,
      raised: 68500,
      donors: 145,
      status: "completed",
      roi: 380,
      startDate: "2023-11-01",
      endDate: "2023-12-31"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "completed": return "bg-blue-100 text-blue-800";
      case "planned": return "bg-gray-100 text-gray-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-green-600";
    if (percentage >= 75) return "bg-blue-600";
    if (percentage >= 50) return "bg-yellow-600";
    return "bg-gray-400";
  };

  return (
    <div className="space-y-6">
      {/* Campaign Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))
        ) : (
          <>
            <Card data-testid="campaign-stat-total">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Active Campaigns</h3>
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">
                    {mockCampaigns.filter(c => c.status === 'active').length}
                  </p>
                  <Badge className="text-blue-600 bg-blue-50">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    2 new this month
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="campaign-stat-raised">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Total Raised</h3>
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">
                    ${mockCampaigns.reduce((sum, c) => sum + c.raised, 0).toLocaleString()}
                  </p>
                  <Badge className="text-green-600 bg-green-50">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +15% vs target
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="campaign-stat-donors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Campaign Donors</h3>
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">
                    {mockCampaigns.reduce((sum, c) => sum + c.donors, 0)}
                  </p>
                  <Badge className="text-purple-600 bg-purple-50">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +8% participation
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="campaign-stat-roi">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Avg Campaign ROI</h3>
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">
                    {Math.round(mockCampaigns.reduce((sum, c) => sum + c.roi, 0) / mockCampaigns.length)}%
                  </p>
                  <Badge className="text-orange-600 bg-orange-50">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +5% efficiency
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Campaign Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Goal</TableHead>
                  <TableHead className="text-right">Raised</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="text-right">Donors</TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockCampaigns.map((campaign, index) => {
                  const percentage = (campaign.raised / campaign.goal) * 100;
                  return (
                    <TableRow key={index} data-testid={`campaign-row-${index}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{campaign.name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(campaign.status)}>
                          {campaign.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${campaign.goal.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${campaign.raised.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <Progress 
                              value={Math.min(percentage, 100)} 
                              className="h-2"
                            />
                          </div>
                          <span className="text-sm font-medium w-12">
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {campaign.donors}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">
                          {campaign.roi}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-700">87%</p>
              <p className="text-sm text-blue-600">Goal Achievement Rate</p>
              <p className="text-xs text-muted-foreground mt-1">Average across all campaigns</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-700">$1,247</p>
              <p className="text-sm text-green-600">Avg Gift per Campaign</p>
              <p className="text-xs text-muted-foreground mt-1">+12% from last period</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-700">45 days</p>
              <p className="text-sm text-purple-600">Avg Campaign Duration</p>
              <p className="text-xs text-muted-foreground mt-1">Optimal performance window</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}