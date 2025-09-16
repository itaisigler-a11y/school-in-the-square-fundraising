import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsCharts } from "@/components/analytics/analytics-charts";
import { ReportGenerator } from "@/components/analytics/report-generator";
import { DonorAnalytics } from "@/components/analytics/donor-analytics";
import { CampaignAnalytics } from "@/components/analytics/campaign-analytics";
import { Download, DollarSign, Users, Gift, TrendingUp } from "lucide-react";

export default function Analytics() {
  const [selectedPeriod, setSelectedPeriod] = useState("12months");
  const [selectedComparison, setSelectedComparison] = useState("previous");

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ["/api/analytics/overview", { 
      period: selectedPeriod,
      comparison: selectedComparison 
    }],
  });

  const { data: performanceMetrics } = useQuery({
    queryKey: ["/api/analytics/performance", { period: selectedPeriod }],
  });

  const getMetricChangeColor = (change: number) => {
    if (change > 0) return "text-green-600 bg-green-50";
    if (change < 0) return "text-red-600 bg-red-50";
    return "text-gray-600 bg-gray-50";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Comprehensive fundraising analytics and performance insights
          </p>
        </div>
        
        <div className="flex gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40" data-testid="select-analytics-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="12months">Last 12 Months</SelectItem>
              <SelectItem value="24months">Last 24 Months</SelectItem>
              <SelectItem value="currentyear">Current Year</SelectItem>
              <SelectItem value="lastyear">Last Year</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedComparison} onValueChange={setSelectedComparison}>
            <SelectTrigger className="w-44" data-testid="select-comparison-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="previous">Previous Period</SelectItem>
              <SelectItem value="lastyear">Same Period Last Year</SelectItem>
              <SelectItem value="none">No Comparison</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" data-testid="button-export-report">
            <Download className="w-4 h-4 mr-2" />Export Report
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))
        ) : (
          <>
            <Card data-testid="kpi-total-raised">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Total Raised</h3>
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">${analyticsData?.totalRaised?.toLocaleString() || '0'}</p>
                  {analyticsData?.totalRaisedChange && (
                    <Badge className={getMetricChangeColor(analyticsData.totalRaisedChange)}>
                      {analyticsData.totalRaisedChange > 0 ? '+' : ''}{analyticsData.totalRaisedChange}%
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="kpi-donor-count">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Active Donors</h3>
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{analyticsData?.activeDonors || '0'}</p>
                  {analyticsData?.activeDonorsChange && (
                    <Badge className={getMetricChangeColor(analyticsData.activeDonorsChange)}>
                      {analyticsData.activeDonorsChange > 0 ? '+' : ''}{analyticsData.activeDonorsChange}%
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="kpi-avg-gift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Average Gift</h3>
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Gift className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">${analyticsData?.averageGift || '0'}</p>
                  {analyticsData?.averageGiftChange && (
                    <Badge className={getMetricChangeColor(analyticsData.averageGiftChange)}>
                      {analyticsData.averageGiftChange > 0 ? '+' : ''}{analyticsData.averageGiftChange}%
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="kpi-retention-rate">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Retention Rate</h3>
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{analyticsData?.retentionRate || '0'}%</p>
                  {analyticsData?.retentionRateChange && (
                    <Badge className={getMetricChangeColor(analyticsData.retentionRateChange)}>
                      {analyticsData.retentionRateChange > 0 ? '+' : ''}{analyticsData.retentionRateChange}%
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="donors">Donor Analytics</TabsTrigger>
          <TabsTrigger value="campaigns">Campaign Performance</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <AnalyticsCharts 
            data={analyticsData} 
            period={selectedPeriod}
            comparison={selectedComparison}
          />
        </TabsContent>

        <TabsContent value="donors" className="space-y-6">
          <DonorAnalytics 
            period={selectedPeriod}
            comparison={selectedComparison}
          />
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <CampaignAnalytics 
            period={selectedPeriod}
            comparison={selectedComparison}
          />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <ReportGenerator 
            period={selectedPeriod}
            performanceData={performanceMetrics}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}