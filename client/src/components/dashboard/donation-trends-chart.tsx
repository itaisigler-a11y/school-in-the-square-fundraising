import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DonationTrendsChartProps {
  data: Array<{ month: string; amount: number }>;
}

export function DonationTrendsChart({ data }: DonationTrendsChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !data.length) return;

    const canvas = canvasRef.current;
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
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Find max value for scaling
    const maxAmount = Math.max(...data.map(d => d.amount));
    
    // Draw chart
    ctx.strokeStyle = "hsl(142, 71%, 33%)";
    ctx.fillStyle = "hsla(142, 71%, 33%, 0.1)";
    ctx.lineWidth = 2;

    const points: Array<{ x: number; y: number }> = [];

    data.forEach((item, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - (item.amount / maxAmount) * chartHeight;
      points.push({ x, y });
    });

    // Draw filled area
    ctx.beginPath();
    ctx.moveTo(points[0].x, height - padding);
    points.forEach(point => {
      ctx.lineTo(point.x, point.y);
    });
    ctx.lineTo(points[points.length - 1].x, height - padding);
    ctx.closePath();
    ctx.fill();

    // Draw line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(point => {
      ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();

    // Draw points
    ctx.fillStyle = "hsl(142, 71%, 33%)";
    points.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw labels
    ctx.fillStyle = "hsl(240, 5%, 64.9%)";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";

    data.forEach((item, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      ctx.fillText(item.month, x, height - 10);
    });

  }, [data]);

  return (
    <Card data-testid="donation-trends-chart">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Donation Trends</CardTitle>
          <Select defaultValue="6months">
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6months">Last 6 months</SelectItem>
              <SelectItem value="12months">Last 12 months</SelectItem>
              <SelectItem value="ytd">Year to date</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative h-80">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
