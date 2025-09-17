import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  icon: string | React.ReactNode;
  iconColor: string;
  iconBg: string;
  changeColor?: string;
  changeBg?: string;
  actionText?: string;
  onAction?: () => void;
  insight?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  change,
  icon,
  iconColor,
  iconBg,
  changeColor = "text-school-blue-600",
  changeBg = "bg-school-blue-50",
  actionText,
  onAction,
  insight,
  className,
  ...props
}: MetricCardProps) {
  return (
    <Card 
      className={cn(
        "transition-all duration-300 hover:shadow-school-lg hover:-translate-y-2 border-school-blue-200 hover:border-school-gold-300 group bg-gradient-to-br from-white to-school-blue-50/30",
        className
      )}
      {...props}
    >
      <CardContent className="p-6">
        {/* Header with Icon and Value */}
        <div className="flex items-start justify-between mb-6">
          <div className={cn("p-4 rounded-xl transition-all duration-300 group-hover:scale-110 shadow-school border border-school-blue-100", iconBg)}>
            {typeof icon === 'string' ? (
              <i className={cn("text-xl", icon, iconColor)}></i>
            ) : (
              <div className={iconColor}>{icon}</div>
            )}
          </div>
          <span className={cn("text-school-small px-3 py-2 rounded-full font-semibold border", changeBg, changeColor, "border-school-blue-200")}>
            {change}
          </span>
        </div>
        
        {/* Main Value - Enhanced for Financial Data */}
        <div className="mb-6">
          <h3 className="text-school-title font-bold text-school-blue-900 mb-2 tracking-tight">{value}</h3>
          <p className="text-school-body text-school-blue-700 font-semibold">{title}</p>
        </div>
        
        {/* Insight Message - Enhanced Styling */}
        {insight && (
          <div className="mb-6 p-4 bg-school-gold-50 rounded-xl border-l-4 border-l-school-gold-500 shadow-school">
            <p className="text-school-body text-school-blue-800 leading-relaxed font-medium">{insight}</p>
          </div>
        )}
        
        {/* Action Button - Enhanced Professional Styling */}
        {actionText && onAction && (
          <Button 
            variant="accent" 
            size="sm" 
            onClick={onAction}
            className="w-full group-hover:shadow-school-gold transition-all duration-200 font-semibold"
            data-testid={`action-${title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {actionText}
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
