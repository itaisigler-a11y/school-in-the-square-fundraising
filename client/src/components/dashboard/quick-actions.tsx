import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export function QuickActions() {
  const [, setLocation] = useLocation();

  const actions = [
    {
      title: "Add Donor",
      description: "Individual entry",
      icon: "fas fa-user-plus",
      iconColor: "text-blue-600",
      iconBg: "bg-blue-100",
      onClick: () => setLocation("/donors"),
      testId: "button-quick-add-donor"
    },
    {
      title: "Import Data",
      description: "CSV/Excel files",
      icon: "fas fa-upload",
      iconColor: "text-green-600",
      iconBg: "bg-green-100",
      onClick: () => setLocation("/import"),
      testId: "button-quick-import"
    }
  ];

  return (
    <Card data-testid="quick-actions">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {actions.map((action) => (
            <Button
              key={action.testId}
              variant="ghost"
              className="flex items-center gap-3 p-4 h-auto text-left justify-start hover:bg-accent transition-colors"
              onClick={action.onClick}
              data-testid={action.testId}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.iconBg}`}>
                <i className={`${action.icon} ${action.iconColor}`}></i>
              </div>
              <div>
                <p className="font-medium text-foreground">{action.title}</p>
                <p className="text-sm text-muted-foreground">{action.description}</p>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
