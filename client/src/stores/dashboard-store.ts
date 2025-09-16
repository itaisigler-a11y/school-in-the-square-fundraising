import { create } from 'zustand';

interface DashboardMetrics {
  totalRaised: number;
  donorRetention: number;
  averageGiftSize: number;
  campaignROI: number;
  donorCount: number;
  activeCampaigns: number;
}

interface DonationTrend {
  month: string;
  amount: number;
}

interface RecentDonor {
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
}

interface DonorSegment {
  segment: string;
  count: number;
  change: number;
}

interface DashboardState {
  metrics: DashboardMetrics | null;
  donationTrends: DonationTrend[];
  recentDonors: RecentDonor[];
  donorSegments: DonorSegment[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setMetrics: (metrics: DashboardMetrics) => void;
  setDonationTrends: (trends: DonationTrend[]) => void;
  setRecentDonors: (donors: RecentDonor[]) => void;
  setDonorSegments: (segments: DonorSegment[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetDashboard: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  metrics: null,
  donationTrends: [],
  recentDonors: [],
  donorSegments: [],
  isLoading: false,
  error: null,

  setMetrics: (metrics) => set({ metrics, error: null }),
  setDonationTrends: (donationTrends) => set({ donationTrends, error: null }),
  setRecentDonors: (recentDonors) => set({ recentDonors, error: null }),
  setDonorSegments: (donorSegments) => set({ donorSegments, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  resetDashboard: () => set({
    metrics: null,
    donationTrends: [],
    recentDonors: [],
    donorSegments: [],
    isLoading: false,
    error: null,
  }),
}));
