import { useLocation } from 'wouter';
import { useNavigationStore } from '@/stores/navigation-store';

// Header context and dynamic content management
export function useHeaderContext() {
  const [location] = useLocation();
  const { userMaturity, activityData } = useNavigationStore();

  // Dynamic page titles based on context and user maturity
  const getPageTitle = () => {
    const baseTitle = (() => {
      switch (location) {
        case "/": return "Dashboard";
        case "/donors": return "Donors";
        case "/campaigns": return "Campaigns";
        case "/communications": return "Communications";
        case "/analytics": return "Analytics";
        case "/segments": return "Segments";
        case "/import": return "Import Data";
        case "/settings": return "Settings";
        default: return "Dashboard";
      }
    })();

    // Add context based on user maturity
    if (location === "/" && userMaturity === 'beginner') {
      return "Welcome to Fundraising";
    } else if (location === "/analytics" && userMaturity === 'active') {
      return "Analytics Dashboard";
    }

    return baseTitle;
  };

  const getPageDescription = () => {
    const baseDescription = (() => {
      switch (location) {
        case "/": 
          if (userMaturity === 'beginner') {
            return "Let's get started with your fundraising journey.";
          } else if (activityData.donorCount === 0) {
            return "Add your first donors to see insights and analytics.";
          }
          return "Welcome back! Here's your fundraising overview.";
        case "/donors": 
          if (activityData.donorCount === 0) {
            return "Start building your supporter database.";
          } else if (activityData.donorCount < 10) {
            return `You have ${activityData.donorCount} donor${activityData.donorCount === 1 ? '' : 's'}. Keep growing your community!`;
          }
          return "Manage your supporter relationships and engagement.";
        case "/campaigns": 
          if (activityData.campaignCount === 0) {
            return "Create your first fundraising campaign.";
          }
          return "Track and optimize your fundraising campaigns.";
        case "/communications":
          return "Engage with your supporters through personalized outreach.";
        case "/analytics":
          if (activityData.donorCount < 5) {
            return "Add more donors to unlock detailed analytics.";
          }
          return "Insights and trends to grow your fundraising impact.";
        case "/segments":
          return "Create targeted groups for better donor engagement.";
        case "/import":
          return "Upload and organize your supporter data.";
        default:
          return "Manage your fundraising operations.";
      }
    })();

    return baseDescription;
  };

  // Get contextual actions based on current page and user maturity
  const getPageActions = () => {
    const actions = [];

    if (location === "/" && userMaturity === 'beginner') {
      actions.push({
        label: "Get Started",
        action: "onboarding",
        primary: true
      });
    }

    if (location === "/donors" && activityData.donorCount === 0) {
      actions.push({
        label: "Add First Donor",
        action: "add_donor",
        primary: true
      });
    }

    return actions;
  };

  return {
    pageTitle: getPageTitle(),
    pageDescription: getPageDescription(),
    pageActions: getPageActions(),
    location,
    userMaturity,
    activityData,
  };
}