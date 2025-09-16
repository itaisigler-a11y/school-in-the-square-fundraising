import { useQuery } from "@tanstack/react-query";
import { MetricCard } from "@/components/dashboard/metric-card";
import { CampaignProgress } from "@/components/dashboard/campaign-progress";
import { DonationTrendsChart } from "@/components/dashboard/donation-trends-chart";
import { RecentDonors } from "@/components/dashboard/recent-donors";
import { DonorSegments } from "@/components/dashboard/donor-segments";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { QuickStart } from "@/components/dashboard/quick-start";
import { Skeleton } from "@/components/ui/skeleton";
import { useUIMode } from "@/lib/ui-mode-context";

export default function Dashboard() {
  const { isSimpleMode } = useUIMode();
  
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
  });

  // Only load complex data in Advanced Mode
  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ["/api/dashboard/donation-trends"],
    enabled: !isSimpleMode, // Only fetch in Advanced Mode
  });

  const { data: recentDonors, isLoading: recentLoading } = useQuery({
    queryKey: ["/api/dashboard/recent-donors"],
  });

  const { data: segments, isLoading: segmentsLoading } = useQuery({
    queryKey: ["/api/dashboard/donor-segments"],
    enabled: !isSimpleMode, // Only fetch in Advanced Mode
  });

  return (
    <div className="p-6 space-y-6">
      {/* Quick Start Panel - For New Users */}
      <QuickStart donorCount={metrics?.donorCount || 0} />
      
      {/* Key Metrics Cards - Simplified in Simple Mode */}
      <div className={`grid gap-6 ${
        isSimpleMode 
          ? "grid-cols-1 md:grid-cols-3" 
          : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
      }`}>
        {metricsLoading ? (
          Array.from({ length: isSimpleMode ? 3 : 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))
        ) : (
          <>
            <MetricCard
              title="Total Raised This Year"
              value={`$${metrics?.totalRaised?.toLocaleString() || '0'}`}
              change={metrics?.totalRaised > 0 ? `$${metrics.totalRaised.toLocaleString()}` : 'No data'}
              icon="fas fa-dollar-sign"
              iconColor="text-green-600"
              iconBg="bg-green-100"
              changeColor="text-green-600"
              changeBg="bg-green-50"
              data-testid="metric-total-raised"
            />
            <MetricCard
              title="Total Donors"
              value={metrics?.donorCount?.toLocaleString() || '0'}
              change={`${metrics?.donorCount || 0} total`}
              icon="fas fa-users"
              iconColor="text-blue-600"
              iconBg="bg-blue-100"
              changeColor="text-blue-600"
              changeBg="bg-blue-50"
              data-testid="metric-total-donors"
            />
            <MetricCard
              title="Average Gift Size"
              value={`$${Math.round(metrics?.averageGiftSize || 0)}`}
              change={metrics?.averageGiftSize > 0 ? 'Active' : 'No gifts'}
              icon="fas fa-heart"
              iconColor="text-purple-600"
              iconBg="bg-purple-100"
              changeColor="text-purple-600"
              changeBg="bg-purple-50"
              data-testid="metric-average-gift"
            />
            {/* Advanced Mode: Show additional metrics */}
            {!isSimpleMode && (
              <MetricCard
                title="Donor Retention"
                value={`${Math.round(metrics?.donorRetention || 0)}%`}
                change={metrics?.donorRetention > 0 ? 'Active donors' : 'No history'}
                icon="fas fa-chart-line"
                iconColor="text-orange-600"
                iconBg="bg-orange-100"
                changeColor="text-orange-600"
                changeBg="bg-orange-50"
                data-testid="metric-donor-retention"
              />
            )}
          </>
        )}
      </div>

      {/* Simple Mode: Only Recent Activity */}
      {isSimpleMode ? (
        <div className="grid grid-cols-1 gap-6">
          <div>
            {recentLoading ? (
              <Skeleton className="h-96" />
            ) : (
              <RecentDonors donors={recentDonors || []} />
            )}
          </div>
        </div>
      ) : (
        /* Advanced Mode: Full dashboard with charts and analytics */
        <>
          {/* Campaign Progress and Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <CampaignProgress />
            </div>
            <div className="lg:col-span-2">
              {trendsLoading ? (
                <Skeleton className="h-80" />
              ) : (
                <DonationTrendsChart data={trends || []} />
              )}
            </div>
          </div>

          {/* Recent Activity and Donor Segments */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              {recentLoading ? (
                <Skeleton className="h-96" />
              ) : (
                <RecentDonors donors={recentDonors || []} />
              )}
            </div>
            <div>
              {segmentsLoading ? (
                <Skeleton className="h-96" />
              ) : (
                <DonorSegments segments={segments || []} />
              )}
            </div>
          </div>
        </>
      )}

      {/* Quick Actions Panel */}
      <QuickActions />
    </div>
  );
}
