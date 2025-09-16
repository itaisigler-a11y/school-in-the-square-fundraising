import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Download, FileText, BarChart3, PieChart, Calendar } from "lucide-react";

interface ReportGeneratorProps {
  period: string;
  performanceData: any;
}

export function ReportGenerator({ period, performanceData }: ReportGeneratorProps) {
  const [reportType, setReportType] = useState("comprehensive");
  const [format, setFormat] = useState("pdf");
  const [selectedSections, setSelectedSections] = useState({
    overview: true,
    donors: true,
    campaigns: true,
    financials: true,
    trends: true,
    segments: false,
  });

  const reportTemplates = [
    {
      id: "board",
      name: "Board Report",
      description: "Executive summary with key metrics and trends",
      icon: BarChart3,
      sections: ["overview", "financials", "trends"]
    },
    {
      id: "comprehensive",
      name: "Comprehensive Analytics",
      description: "Full detailed report with all metrics and analysis",
      icon: FileText,
      sections: ["overview", "donors", "campaigns", "financials", "trends", "segments"]
    },
    {
      id: "donor",
      name: "Donor Analysis",
      description: "Focused on donor behavior and engagement",
      icon: PieChart,
      sections: ["donors", "segments", "trends"]
    },
    {
      id: "campaign",
      name: "Campaign Performance",
      description: "Campaign-specific metrics and ROI analysis",
      icon: BarChart3,
      sections: ["campaigns", "financials", "overview"]
    }
  ];

  const handleSectionChange = (section: string, checked: boolean) => {
    setSelectedSections(prev => ({
      ...prev,
      [section]: checked
    }));
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = reportTemplates.find(t => t.id === templateId);
    if (template) {
      setReportType(templateId);
      // Reset all sections to false first
      const newSections = Object.keys(selectedSections).reduce((acc, key) => {
        acc[key] = false;
        return acc;
      }, {} as any);
      
      // Enable sections for this template
      template.sections.forEach(section => {
        newSections[section] = true;
      });
      
      setSelectedSections(newSections);
    }
  };

  const generateReport = () => {
    // This would typically make an API call to generate the report
    console.log("Generating report:", {
      type: reportType,
      format,
      sections: selectedSections,
      period
    });
    // Simulate download
    alert(`Generating ${reportType} report in ${format.toUpperCase()} format...`);
  };

  return (
    <div className="space-y-6">
      {/* Quick Report Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Report Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {reportTemplates.map((template) => {
              const Icon = template.icon;
              return (
                <div
                  key={template.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    reportType === template.id 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => handleTemplateSelect(template.id)}
                  data-testid={`template-${template.id}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-medium">{template.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Report Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Report Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Format Selection */}
            <div className="space-y-2">
              <Label htmlFor="format-select">Export Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger data-testid="select-report-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF Document</SelectItem>
                  <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                  <SelectItem value="csv">CSV Data</SelectItem>
                  <SelectItem value="powerpoint">PowerPoint Presentation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Section Selection */}
            <div className="space-y-3">
              <Label>Report Sections</Label>
              <div className="space-y-3">
                {[
                  { id: "overview", label: "Executive Overview", description: "Key metrics and summary" },
                  { id: "donors", label: "Donor Analysis", description: "Donor behavior and trends" },
                  { id: "campaigns", label: "Campaign Performance", description: "Campaign results and ROI" },
                  { id: "financials", label: "Financial Summary", description: "Revenue and cost analysis" },
                  { id: "trends", label: "Trend Analysis", description: "Historical comparisons" },
                  { id: "segments", label: "Donor Segmentation", description: "Audience breakdown" },
                ].map((section) => (
                  <div key={section.id} className="flex items-start space-x-2">
                    <Checkbox
                      id={section.id}
                      checked={selectedSections[section.id as keyof typeof selectedSections]}
                      onCheckedChange={(checked) => handleSectionChange(section.id, checked as boolean)}
                      data-testid={`checkbox-${section.id}`}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label
                        htmlFor={section.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {section.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {section.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Generation */}
            <div className="space-y-3">
              <Button 
                onClick={generateReport}
                className="w-full"
                data-testid="button-generate-report"
              >
                <Download className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Report will include data from {period.replace(/(\d+)/, '$1 ')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  name: "Q4 2024 Board Report",
                  type: "Board Report",
                  date: "2024-12-15",
                  format: "PDF",
                  size: "2.3 MB"
                },
                {
                  name: "November Donor Analysis",
                  type: "Donor Analysis",
                  date: "2024-12-01",
                  format: "Excel",
                  size: "1.8 MB"
                },
                {
                  name: "Annual Fund Campaign Review",
                  type: "Campaign Performance",
                  date: "2024-11-28",
                  format: "PowerPoint",
                  size: "4.1 MB"
                },
                {
                  name: "YTD Comprehensive Report",
                  type: "Comprehensive Analytics",
                  date: "2024-11-15",
                  format: "PDF",
                  size: "5.2 MB"
                }
              ].map((report, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                  data-testid={`recent-report-${index}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{report.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {report.type} • {report.format} • {report.size}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(report.date).toLocaleDateString()}
                    </span>
                    <Button variant="ghost" size="sm">
                      <Download className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scheduled Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                name: "Monthly Board Summary",
                schedule: "1st of every month",
                format: "PDF",
                recipients: "board@schoolinthesquare.org",
                active: true
              },
              {
                name: "Weekly Campaign Updates",
                schedule: "Every Monday",
                format: "Excel",
                recipients: "development@schoolinthesquare.org",
                active: true
              },
              {
                name: "Quarterly Donor Report",
                schedule: "End of each quarter",
                format: "PowerPoint",
                recipients: "leadership@schoolinthesquare.org",
                active: false
              }
            ].map((schedule, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border rounded-lg"
                data-testid={`scheduled-report-${index}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">{schedule.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {schedule.schedule} • {schedule.format} • {schedule.recipients}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    schedule.active 
                      ? "bg-green-100 text-green-800" 
                      : "bg-gray-100 text-gray-800"
                  }`}>
                    {schedule.active ? "Active" : "Inactive"}
                  </span>
                  <Button variant="ghost" size="sm">
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}