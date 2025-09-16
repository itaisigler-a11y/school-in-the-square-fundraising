import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';

export interface MetricCalculation {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
}

export function calculateMetricChange(current: number, previous: number): MetricCalculation {
  const change = current - previous;
  const changePercent = previous > 0 ? (change / previous) * 100 : 0;
  
  return {
    current,
    previous,
    change,
    changePercent: Math.round(changePercent * 10) / 10,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function calculateDonorRetentionRate(
  currentYearDonors: string[],
  previousYearDonors: string[]
): number {
  if (previousYearDonors.length === 0) return 0;
  
  const retainedDonors = currentYearDonors.filter(donor => 
    previousYearDonors.includes(donor)
  );
  
  return (retainedDonors.length / previousYearDonors.length) * 100;
}

export function calculateAverageGiftSize(donations: { amount: number }[]): number {
  if (donations.length === 0) return 0;
  
  const total = donations.reduce((sum, donation) => sum + donation.amount, 0);
  return total / donations.length;
}

export function calculateROI(totalRaised: number, totalCost: number): number {
  if (totalCost === 0) return 0;
  return ((totalRaised - totalCost) / totalCost) * 100;
}

export function segmentDonorsByEngagement(donors: any[]): Record<string, number> {
  const segments = {
    new: 0,
    active: 0,
    engaged: 0,
    at_risk: 0,
    lapsed: 0,
  };
  
  donors.forEach(donor => {
    if (segments.hasOwnProperty(donor.engagementLevel)) {
      segments[donor.engagementLevel as keyof typeof segments]++;
    }
  });
  
  return segments;
}

export function generateDateRanges(months: number) {
  const ranges = [];
  const today = new Date();
  
  for (let i = months - 1; i >= 0; i--) {
    const date = subMonths(today, i);
    ranges.push({
      label: format(date, 'MMM yyyy'),
      start: startOfMonth(date),
      end: endOfMonth(date),
    });
  }
  
  return ranges;
}

export function groupDonationsByMonth(
  donations: { date: string; amount: number }[],
  months: number
): { month: string; amount: number }[] {
  const ranges = generateDateRanges(months);
  
  return ranges.map(range => {
    const monthDonations = donations.filter(donation => {
      const donationDate = parseISO(donation.date);
      return donationDate >= range.start && donationDate <= range.end;
    });
    
    const totalAmount = monthDonations.reduce((sum, donation) => sum + donation.amount, 0);
    
    return {
      month: format(range.start, 'MMM'),
      amount: totalAmount,
    };
  });
}

export function calculateCampaignProgress(raised: number, goal: number) {
  const percentage = goal > 0 ? (raised / goal) * 100 : 0;
  const remaining = Math.max(0, goal - raised);
  
  return {
    percentage: Math.min(100, percentage),
    remaining,
    isComplete: raised >= goal,
  };
}

export function predictNextGiftAmount(donorHistory: { amount: number; date: string }[]): number {
  if (donorHistory.length === 0) return 0;
  if (donorHistory.length === 1) return donorHistory[0].amount;
  
  // Simple prediction based on last 3 gifts average with trend
  const recentGifts = donorHistory
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);
  
  const average = recentGifts.reduce((sum, gift) => sum + gift.amount, 0) / recentGifts.length;
  
  // Apply slight upward trend if donor is consistent
  const trendMultiplier = recentGifts.length >= 3 ? 1.05 : 1.0;
  
  return Math.round(average * trendMultiplier);
}

export function calculateLifetimeValue(donations: { amount: number }[]): number {
  return donations.reduce((sum, donation) => sum + donation.amount, 0);
}

export function identifyMajorGiftProspects(
  donors: any[],
  threshold: number = 1000
): any[] {
  return donors.filter(donor => {
    const lifetimeValue = Number(donor.lifetimeValue || 0);
    const averageGift = Number(donor.averageGiftSize || 0);
    
    return lifetimeValue >= threshold || averageGift >= threshold * 0.5;
  });
}

export function calculateDonorGrowthRate(
  currentPeriodCount: number,
  previousPeriodCount: number
): number {
  if (previousPeriodCount === 0) return currentPeriodCount > 0 ? 100 : 0;
  
  return ((currentPeriodCount - previousPeriodCount) / previousPeriodCount) * 100;
}
