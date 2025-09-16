import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-primary-foreground font-bold text-3xl">S²</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
            School in the Square
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Comprehensive fundraising management platform for NYC's premier public charter school
          </p>
          <Button 
            size="lg" 
            onClick={() => window.location.href = "/api/login"}
            className="text-lg px-8 py-6"
            data-testid="button-login"
          >
            Sign In to Continue
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-users text-green-600 text-xl"></i>
              </div>
              <CardTitle>Donor Management</CardTitle>
              <CardDescription>
                Comprehensive donor profiles with giving history, engagement scoring, and school-specific data tracking
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-chart-line text-blue-600 text-xl"></i>
              </div>
              <CardTitle>Real-time Analytics</CardTitle>
              <CardDescription>
                Live dashboard with key metrics, donation trends, and performance insights for data-driven decisions
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-bullhorn text-purple-600 text-xl"></i>
              </div>
              <CardTitle>Campaign Management</CardTitle>
              <CardDescription>
                Three-phase workflow system from pre-season planning to post-campaign analysis and ROI tracking
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-upload text-orange-600 text-xl"></i>
              </div>
              <CardTitle>Data Import</CardTitle>
              <CardDescription>
                Advanced CSV/Excel import with preview, field mapping, and intelligent duplicate detection
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-envelope text-indigo-600 text-xl"></i>
              </div>
              <CardTitle>Communication Hub</CardTitle>
              <CardDescription>
                Email templates, automated workflows, and personalized donor communications with engagement tracking
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-shield-alt text-red-600 text-xl"></i>
              </div>
              <CardTitle>Security & Compliance</CardTitle>
              <CardDescription>
                Role-based access control, data encryption, and GDPR/CCPA compliance with audit trails
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Mission Statement */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="text-center py-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Our Mission</h2>
            <p className="text-lg text-muted-foreground italic max-w-4xl mx-auto">
              "We engage, educate and empower our students to respond mindfully and creatively to life's opportunities and challenges"
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="text-center mt-16 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            © 2024 School in the Square. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
