import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DonorSegmentsProps {
  segments: Array<{
    segment: string;
    count: number;
    change: number;
  }>;
}

export function DonorSegments({ segments }: DonorSegmentsProps) {
  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case 'new': return 'bg-blue-500';
      case 'active': return 'bg-green-500';
      case 'engaged': return 'bg-purple-500';
      case 'at_risk': return 'bg-yellow-500';
      case 'lapsed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getSegmentLabel = (segment: string) => {
    switch (segment) {
      case 'new': return 'New Donors';
      case 'active': return 'Active Monthly Donors';
      case 'engaged': return 'Highly Engaged';
      case 'at_risk': return 'At-Risk Donors';
      case 'lapsed': return 'Lapsed Donors';
      default: return segment;
    }
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getChangeText = (change: number, segment: string) => {
    const prefix = change > 0 ? '+' : '';
    if (segment === 'at_risk' || segment === 'lapsed') {
      return change !== 0 ? `${prefix}${change} this month` : 'No change';
    }
    return change !== 0 ? `${prefix}${change} this month` : 'No change';
  };

  const mockSegments = [
    { segment: 'active', count: 142, change: 12 },
    { segment: 'engaged', count: 28, change: 3 },
    { segment: 'at_risk', count: 67, change: -2 },
    { segment: 'lapsed', count: 89, change: 5 },
  ];

  const displaySegments = segments.length > 0 ? segments : mockSegments;

  return (
    <Card data-testid="donor-segments">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Donor Segments</CardTitle>
          <Button variant="link" size="sm" data-testid="button-manage-segments">
            Manage segments
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displaySegments.map((item) => (
            <div
              key={item.segment}
              className="flex items-center justify-between"
              data-testid={`segment-${item.segment}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getSegmentColor(item.segment)}`}></div>
                <span className="text-foreground">{getSegmentLabel(item.segment)}</span>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">{item.count}</p>
                <p className={`text-xs ${getChangeColor(item.change)}`}>
                  {getChangeText(item.change, item.segment)}
                </p>
              </div>
            </div>
          ))}

          <div className="pt-4 border-t border-border">
            <Button 
              variant="secondary" 
              className="w-full"
              data-testid="button-create-segment"
            >
              <i className="fas fa-filter mr-2"></i>Create New Segment
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
