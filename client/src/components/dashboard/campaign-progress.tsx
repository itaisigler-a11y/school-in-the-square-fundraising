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
    <Card data-testid="campaign-progress">
      <CardHeader>
        <CardTitle>{campaignData.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-primary mb-2">
            ${campaignData.raised.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground mb-4">
            of ${campaignData.goal.toLocaleString()} goal
          </div>
          <div className="w-full bg-muted rounded-full h-3 mb-2">
            <Progress value={progress} className="h-3" />
          </div>
          <div className="text-sm text-muted-foreground">
            {Math.round(progress)}% complete
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div className="text-center">
            <div className="text-xl font-bold text-foreground">{campaignData.donors}</div>
            <div className="text-xs text-muted-foreground">Donors</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-foreground">{campaignData.daysLeft}</div>
            <div className="text-xs text-muted-foreground">Days Left</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
