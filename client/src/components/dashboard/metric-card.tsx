import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  changeColor: string;
  changeBg: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  change,
  icon,
  iconColor,
  iconBg,
  changeColor,
  changeBg,
  className,
  ...props
}: MetricCardProps) {
  return (
    <Card 
      className={cn(
        "transition-all duration-200 hover:shadow-lg hover:-translate-y-1",
        className
      )}
      {...props}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className={cn("text-xs px-2 py-1 rounded-full font-medium", changeBg, changeColor)}>
            {change}
          </span>
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-1">{value}</h3>
        <p className="text-sm text-muted-foreground">{title}</p>
      </CardContent>
    </Card>
  );
}
