import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function CampaignProgress() {
  // This would come from API in real implementation
  const campaignData = {
    name: "Annual Fund 2024",
    raised: 87450,
    goal: 150000,
    donors: 324,
    daysLeft: 45,
  };

  const progress = (campaignData.raised / campaignData.goal) * 100;

  return (
    <Card className="border-school-blue-200 hover:shadow-school-lg transition-all duration-200" data-testid="campaign-progress">
      <CardHeader className="pb-4">
        <CardTitle className="text-school-heading text-school-blue-900 font-bold">{campaignData.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="text-school-title font-bold text-school-blue-900 mb-2">
            ${campaignData.raised.toLocaleString()}
          </div>
          <div className="text-school-body text-school-blue-600 mb-4">
            of ${campaignData.goal.toLocaleString()} goal
          </div>
          <div className="w-full bg-school-blue-100 rounded-full h-4 mb-3">
            <Progress 
              value={progress} 
              className="h-4 [&>div]:bg-gradient-to-r [&>div]:from-school-blue-500 [&>div]:to-school-gold-500" 
            />
          </div>
          <div className="text-school-body text-school-blue-700 font-medium">
            {Math.round(progress)}% complete
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-school-blue-200">
          <div className="text-center">
            <div className="text-school-heading font-bold text-school-blue-900 mb-1">{campaignData.donors}</div>
            <div className="text-school-small text-school-blue-600 font-medium">Donors</div>
          </div>
          <div className="text-center">
            <div className="text-school-heading font-bold text-school-blue-900 mb-1">{campaignData.daysLeft}</div>
            <div className="text-school-small text-school-blue-600 font-medium">Days Left</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
