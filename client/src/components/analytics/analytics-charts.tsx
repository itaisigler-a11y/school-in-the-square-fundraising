import { useRef, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface TrendDataPoint {
  month: string;
  amount: number;
  donors: number;
}

interface ChartPoint {
  x: number;
  y: number;
}

interface PieSegment {
  label: string;
  value: number;
  color: string;
}

interface AnalyticsData {
  trends?: TrendDataPoint[];
}

interface AnalyticsChartsProps {
  data: AnalyticsData;
  period: string;
  comparison: string;
}

export function AnalyticsCharts({ data, period, comparison }: AnalyticsChartsProps) {
  const trendChartRef = useRef<HTMLCanvasElement>(null);
  const donorChartRef = useRef<HTMLCanvasElement>(null);
  const segmentChartRef = useRef<HTMLCanvasElement>(null);
  const [chartError, setChartError] = useState<string | null>(null);

  const drawTrendChart = () => {
    if (!trendChartRef.current) return;

    const canvas = trendChartRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Validate data and provide fallback
    let trends: TrendDataPoint[] = [];
    if (data?.trends && Array.isArray(data.trends) && data.trends.length > 0) {
      // Filter out invalid data points
      trends = data.trends.filter((item: any) => 
        item && 
        typeof item.amount === 'number' && 
        typeof item.donors === 'number' &&
        item.month
      );
    }
    
    // Use mock data if no valid data available
    if (trends.length === 0) {
      trends = [
        { month: "Jan", amount: 45000, donors: 120 },
        { month: "Feb", amount: 52000, donors: 135 },
        { month: "Mar", amount: 48000, donors: 128 },
        { month: "Apr", amount: 61000, donors: 150 },
        { month: "May", amount: 58000, donors: 145 },
        { month: "Jun", amount: 67000, donors: 162 },
        { month: "Jul", amount: 55000, donors: 140 },
        { month: "Aug", amount: 72000, donors: 175 },
        { month: "Sep", amount: 69000, donors: 168 },
        { month: "Oct", amount: 78000, donors: 185 },
        { month: "Nov", amount: 83000, donors: 195 },
        { month: "Dec", amount: 91000, donors: 210 },
      ];
    }

    // Safety check for empty trends
    if (trends.length === 0) return;

    const maxAmount = Math.max(...trends.map((t: TrendDataPoint) => t.amount));
    const maxDonors = Math.max(...trends.map((t: TrendDataPoint) => t.donors));

    // Draw grid lines
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 5; i++) {
      const y = padding + (i / 5) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw donation amount line
    ctx.strokeStyle = "hsl(142, 71%, 33%)";
    ctx.fillStyle = "hsla(142, 71%, 33%, 0.1)";
    ctx.lineWidth = 3;

    const amountPoints: ChartPoint[] = trends.map((item: TrendDataPoint, index: number) => ({
      x: padding + (index / (trends.length - 1)) * chartWidth,
      y: padding + chartHeight - (item.amount / maxAmount) * chartHeight,
    }));

    // Only draw if we have valid points
    if (amountPoints.length > 0) {
      // Draw filled area for amount
      ctx.beginPath();
      ctx.moveTo(amountPoints[0].x, height - padding);
      amountPoints.forEach((point: ChartPoint) => ctx.lineTo(point.x, point.y));
      ctx.lineTo(amountPoints[amountPoints.length - 1].x, height - padding);
      ctx.closePath();
      ctx.fill();

      // Draw amount line
      ctx.beginPath();
      ctx.moveTo(amountPoints[0].x, amountPoints[0].y);
      amountPoints.forEach((point: ChartPoint) => ctx.lineTo(point.x, point.y));
      ctx.stroke();
    }

    // Draw amount points
    ctx.fillStyle = "hsl(142, 71%, 33%)";
    amountPoints.forEach((point: ChartPoint) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw donor count line (secondary axis)
    ctx.strokeStyle = "hsl(217, 91%, 60%)";
    ctx.lineWidth = 2;

    const donorPoints: ChartPoint[] = trends.map((item: TrendDataPoint, index: number) => ({
      x: padding + (index / (trends.length - 1)) * chartWidth,
      y: padding + chartHeight - (item.donors / maxDonors) * chartHeight,
    }));

    // Only draw donor line if we have valid points
    if (donorPoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(donorPoints[0].x, donorPoints[0].y);
      donorPoints.forEach((point: ChartPoint) => ctx.lineTo(point.x, point.y));
      ctx.stroke();

      // Draw donor points
      ctx.fillStyle = "hsl(217, 91%, 60%)";
      donorPoints.forEach((point: ChartPoint) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw labels
    ctx.fillStyle = "hsl(240, 5%, 64.9%)";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";

    trends.forEach((item: TrendDataPoint, index: number) => {
      const x = padding + (index / (trends.length - 1)) * chartWidth;
      ctx.fillText(item.month, x, height - padding + 20);
    });

    // Draw y-axis labels for amount
    ctx.textAlign = "right";
    for (let i = 0; i <= 5; i++) {
      const value = (maxAmount / 5) * (5 - i);
      const y = padding + (i / 5) * chartHeight;
      ctx.fillText(`$${(value / 1000).toFixed(0)}K`, padding - 10, y + 4);
    }

    // Draw legend
    ctx.textAlign = "left";
    ctx.fillStyle = "hsl(142, 71%, 33%)";
    ctx.fillRect(width - 150, 20, 12, 12);
    ctx.fillStyle = "hsl(240, 4%, 16%)";
    ctx.fillText("Donations", width - 130, 31);

    ctx.fillStyle = "hsl(217, 91%, 60%)";
    ctx.fillRect(width - 150, 40, 12, 12);
    ctx.fillStyle = "hsl(240, 4%, 16%)";
    ctx.fillText("Donors", width - 130, 51);
  };

  const drawDonorChart = () => {
    if (!donorChartRef.current) return;

    const canvas = donorChartRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40;

    // Mock donor distribution data
    const segments: PieSegment[] = [
      { label: "New Donors", value: 25, color: "hsl(217, 91%, 60%)" },
      { label: "Active", value: 35, color: "hsl(142, 71%, 33%)" },
      { label: "Engaged", value: 20, color: "hsl(262, 83%, 58%)" },
      { label: "At Risk", value: 15, color: "hsl(45, 93%, 47%)" },
      { label: "Lapsed", value: 5, color: "hsl(0, 84%, 60%)" },
    ];

    const total = segments.reduce((sum: number, segment: PieSegment) => sum + segment.value, 0);
    let currentAngle = -Math.PI / 2;

    // Draw pie segments
    segments.forEach((segment: PieSegment) => {
      const sliceAngle = (segment.value / total) * 2 * Math.PI;
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = segment.color;
      ctx.fill();
      
      // Draw segment borders
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
      
      currentAngle += sliceAngle;
    });

    // Draw legend
    let legendY = 20;
    segments.forEach((segment: PieSegment) => {
      ctx.fillStyle = segment.color;
      ctx.fillRect(20, legendY, 12, 12);
      
      ctx.fillStyle = "hsl(240, 4%, 16%)";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${segment.label} (${segment.value}%)`, 40, legendY + 9);
      
      legendY += 20;
    });
  };

  useEffect(() => {
    try {
      setChartError(null);
      drawTrendChart();
      drawDonorChart();
    } catch (error) {
      console.error('Error rendering analytics charts:', error);
      setChartError('Failed to render charts. Please try refreshing the page.');
    }
    
    const handleResize = () => {
      try {
        drawTrendChart();
        drawDonorChart();
      } catch (error) {
        console.error('Error resizing analytics charts:', error);
        setChartError('Failed to resize charts.');
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data, period, comparison]);

  if (chartError) {
    return (
      <Alert className="col-span-full">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{chartError}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Fundraising Trends */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Fundraising Trends</CardTitle>
            <Select defaultValue="monthly">
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <canvas
              ref={trendChartRef}
              className="w-full h-full"
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Donor Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Donor Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <canvas
              ref={donorChartRef}
              className="w-full h-full"
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Year-over-Year Comparison */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Year-over-Year Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-700">+23%</p>
              <p className="text-sm text-green-600">Total Raised</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-700">+15%</p>
              <p className="text-sm text-blue-600">New Donors</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-700">+8%</p>
              <p className="text-sm text-purple-600">Average Gift</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-700">+12%</p>
              <p className="text-sm text-orange-600">Retention Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}